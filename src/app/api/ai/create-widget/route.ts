import { NextRequest, NextResponse } from "next/server";
import { requireOrg, isOrgError } from "@/lib/org";
import { checkAndConsumeCredits, claude } from "@/lib/claude";

const SYSTEM = `You are a dashboard widget configuration generator for Colliq, a project management SaaS.

When given a plain-English description of what the user wants to see, return ONLY a single valid JSON object — no markdown, no explanation, no code fences. Just raw JSON.

Available widget types and their configs:

| type | title hint | size default | config keys |
|------|-----------|-------------|-------------|
| overview_stats | "Overview / KPIs" | wide | {} |
| task_activity | task trends over time | wide | { timeRange: "7"|"14"|"30", chartType: "bar"|"area" } |
| project_health | project status breakdown | half | {} |
| team_workload | who is overloaded | half | {} |
| overdue_tasks | tasks past due | half | { limit: 5|10|20 } |
| goals_progress | OKR progress | half | { goalType: "ALL"|"COMPANY"|"TEAM"|"PERSONAL" } |
| velocity_chart | tasks completed per week | wide | { weeks: 4|8|12 } |
| priority_breakdown | tasks by priority | half | { chartType: "pie"|"bar" } |
| task_status_funnel | tasks by status | half | { chartType: "bar"|"pie" } |
| recent_activity | latest task events | wide | { limit: 5|10|20 } |

Rules:
- Pick the best type for the user's intent
- Keep title concise (< 40 chars) and specific to what was asked
- Choose size: "wide" spans full row (good for charts/lists), "half" = one column (good for stats/small charts)
- config must be valid JSON with only the keys shown above
- id must be a unique string: "ai_" + 8 random alphanumeric chars

Example output:
{"id":"ai_x7k2m9pq","type":"task_activity","title":"Tasks Completed This Week","size":"wide","config":{"timeRange":"7","chartType":"bar"}}`;

export async function POST(req: NextRequest) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId } = ctx;

  const creditBlock = await checkAndConsumeCredits(orgId, "simple");
  if (creditBlock) return creditBlock;

  const { prompt } = await req.json();
  if (!prompt?.trim()) {
    return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
  }

  const msg = await claude.messages.create({
    model:      "claude-haiku-4-5-20251001",
    max_tokens: 400,
    system:     SYSTEM,
    messages:   [{ role: "user", content: prompt.trim() }],
  });

  const text = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";

  // Strip any accidental markdown fences
  const clean = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  let widget: Record<string, unknown>;
  try {
    widget = JSON.parse(clean);
  } catch {
    return NextResponse.json({ error: "AI returned invalid JSON. Try rephrasing your request." }, { status: 422 });
  }

  // Ensure required fields exist with safe fallbacks
  const VALID_TYPES = [
    "overview_stats","task_activity","project_health","team_workload",
    "overdue_tasks","goals_progress","velocity_chart","priority_breakdown",
    "task_status_funnel","recent_activity",
  ];
  if (!VALID_TYPES.includes(widget.type as string)) {
    widget.type = "task_activity";
  }
  if (!widget.id)     widget.id   = `ai_${Math.random().toString(36).slice(2, 10)}`;
  if (!widget.title)  widget.title = "Custom Widget";
  if (!widget.size || !["half","wide"].includes(widget.size as string)) widget.size = "wide";
  if (!widget.config || typeof widget.config !== "object") widget.config = {};

  return NextResponse.json(widget);
}
