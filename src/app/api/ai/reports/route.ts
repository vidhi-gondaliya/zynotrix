import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { streamToResponse, SYSTEM_PROMPTS } from "@/lib/claude";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const {
    reportType = "weekly",
    startDate, endDate,
    projectIds = [], memberIds = [],
    statuses = [], priorities = [],
    sections = ["task_summary", "team_activity", "completion_rate"],
  } = await req.json();

  const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 86400000);
  const end   = endDate   ? new Date(endDate)   : new Date();

  // Build task filter
  const taskWhere: Record<string, unknown> = {
    updatedAt: { gte: start, lte: end },
    ...(projectIds.length > 0 ? { projectId: { in: projectIds } } : {}),
    ...(memberIds.length > 0  ? { assigneeId: { in: memberIds } } : {}),
    ...(statuses.length > 0   ? { status: { in: statuses } }     : {}),
    ...(priorities.length > 0 ? { priority: { in: priorities } } : {}),
  };

  const [tasks, meetings, projects] = await Promise.all([
    prisma.task.findMany({
      where: taskWhere,
      include: {
        assignee: { select: { name: true } },
        project:  { select: { name: true, clientName: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 150,
    }),
    prisma.meeting.findMany({
      where: {
        startTime: { gte: start, lte: end },
        ...(projectIds.length > 0 ? { projectId: { in: projectIds } } : {}),
      },
      orderBy: { startTime: "asc" },
      take: 30,
    }),
    projectIds.length > 0
      ? prisma.project.findMany({ where: { id: { in: projectIds } }, select: { name: true, clientName: true } })
      : Promise.resolve([]),
  ]);

  // Compute stats
  const byStatus  = tasks.reduce<Record<string, number>>((a, t) => { a[t.status] = (a[t.status] ?? 0) + 1; return a; }, {});
  const byPri     = tasks.reduce<Record<string, number>>((a, t) => { a[t.priority] = (a[t.priority] ?? 0) + 1; return a; }, {});
  const byMember  = tasks.reduce<Record<string, number>>((a, t) => { const n = t.assignee?.name ?? "Unassigned"; a[n] = (a[n] ?? 0) + 1; return a; }, {});
  const overdue   = tasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "DONE");
  const completed = tasks.filter((t) => t.status === "DONE");
  const compRate  = tasks.length > 0 ? Math.round((completed.length / tasks.length) * 100) : 0;

  const sectionMap: Record<string, string> = {
    task_summary: `
## Task Summary
- Total tasks: ${tasks.length}
- Status breakdown: ${Object.entries(byStatus).map(([s, c]) => `${s}: ${c}`).join(", ") || "none"}
- Completed tasks: ${completed.map((t) => `"${t.title}" (${t.project?.name ?? "—"}, ${t.assignee?.name ?? "unassigned"})`).join("; ") || "none"}`,

    overdue: `
## Overdue Tasks (${overdue.length})
${overdue.map((t) => `- "${t.title}" — due ${t.dueDate ? new Date(t.dueDate).toDateString() : "unknown"} — assigned to ${t.assignee?.name ?? "nobody"}`).join("\n") || "None overdue"}`,

    team_activity: `
## Team Activity
${Object.entries(byMember).map(([name, count]) => `- ${name}: ${count} task${count !== 1 ? "s" : ""}`).join("\n") || "No team data"}`,

    priorities: `
## Priority Breakdown
${Object.entries(byPri).map(([p, c]) => `- ${p}: ${c}`).join("\n") || "none"}`,

    completion_rate: `
## Completion Rate
- ${compRate}% of tasks completed in the period`,

    time_tracking: `
## Meetings During Period (${meetings.length})
${meetings.map((m) => `- "${m.title}" on ${new Date(m.startTime).toDateString()}`).join("\n") || "No meetings"}`,
  };

  const dataContext = `
## Report: ${reportType.toUpperCase()}
## Period: ${start.toDateString()} → ${end.toDateString()}
${projects.length > 0 ? `## Projects: ${projects.map((p) => p.clientName ? `${p.name} (client: ${p.clientName})` : p.name).join(", ")}` : ""}

${sections.map((s: string) => sectionMap[s] ?? "").join("\n")}
`;

  const typeInstructions: Record<string, string> = {
    daily:   "Generate a concise daily standup report: what was done, what's in progress, and any blockers.",
    weekly:  "Generate a comprehensive weekly team report: metrics, highlights, risks, and next-week priorities.",
    client:  "Generate a professional client-facing report. Focus on outcomes and business value. Use formal tone, avoid internal jargon.",
    sprint:  "Generate a sprint retrospective: velocity, what went well, what to improve, and concrete action items.",
    team:    "Generate a team performance report: individual contributions, workload balance, and productivity trends.",
    custom:  "Generate a detailed report covering all the data below. Format with clear sections and actionable insights.",
  };

  const instruction = typeInstructions[reportType] ?? typeInstructions.weekly;

  return streamToResponse(
    [{ role: "user", content: `${instruction}\n\n${dataContext}` }],
    SYSTEM_PROMPTS.report
  );
}
