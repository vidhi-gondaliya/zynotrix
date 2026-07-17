import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateJSON } from "@/lib/claude";

// GET — list automations
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const automations = await (prisma as any).automation.findMany({
    where: { createdById: session.user.id },
    include: {
      runs: { orderBy: { triggeredAt: "desc" }, take: 1 },
      _count: { select: { runs: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(automations);
}

// POST — create automation from natural language rule
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { rule, customStatuses } = await req.json();
  if (!rule?.trim()) return NextResponse.json({ error: "Rule required" }, { status: 400 });

  // Build status context string — use custom project statuses if provided, else defaults
  const statusList = (customStatuses as { id: string; label: string }[] | null)?.length
    ? (customStatuses as { id: string; label: string }[])
        .map((s) => `${s.id} (displayed as "${s.label}")`)
        .join(", ")
    : "BACKLOG, TODO, IN_PROGRESS, REVIEW, DONE, ARCHIVED";

  // Ask AI to parse the natural language rule into structured trigger + action
  const parsed = await generateJSON<{
    name: string;
    description: string;
    trigger: { type: string; conditions: Record<string, unknown> };
    action: { type: string; params: Record<string, unknown> };
    isValid: boolean;
    validationMessage: string;
  }>(
    [{ role: "user", content: `Parse this automation rule: "${rule}"` }],
    `You are an automation rule parser for a project management tool called ZYNOTRIX.
Given a natural language rule, parse it into a structured automation.

Available triggers: task_status_changed, task_created, task_due_soon, task_overdue, project_health_low, member_overloaded, comment_added, daily_schedule, weekly_schedule
Available actions: change_task_status, assign_task, send_notification, create_task, move_to_project, add_tag, set_priority, send_standup

Available task statuses for this workspace: ${statusList}
When the user references a status by label (e.g. "Content Creation", "Done"), map it to the correct status id.

A rule is INVALID only if:
- It references something completely outside the available triggers/actions
- It is too vague to produce any meaningful trigger or action
- It is not related to project management at all

If the rule is ambiguous but workable, make a reasonable interpretation and mark it valid.

Return JSON (no fences):
{
  "name": "short automation name",
  "description": "what this automation does",
  "trigger": { "type": "trigger_type", "conditions": { "key": "value" } },
  "action": { "type": "action_type", "params": { "key": "value" } },
  "isValid": true|false,
  "validationMessage": "if invalid, explain specifically what is wrong and how to fix the rule; if valid, empty string"
}
Return ONLY JSON.`,
    true
  );

  if (!parsed.isValid) {
    return NextResponse.json({ error: parsed.validationMessage || "Could not parse rule" }, { status: 400 });
  }

  const automation = await (prisma as any).automation.create({
    data: {
      name: parsed.name,
      description: parsed.description,
      rule,
      trigger: JSON.stringify(parsed.trigger),
      action: JSON.stringify(parsed.action),
      createdById: session.user.id,
    },
  });

  return NextResponse.json(automation, { status: 201 });
}
