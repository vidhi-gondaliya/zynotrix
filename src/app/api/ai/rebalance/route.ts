import { NextResponse } from "next/server";
import { generateJSON } from "@/lib/claude";
import { prisma } from "@/lib/prisma";
import { requireOrg, isOrgError } from "@/lib/org";

export async function POST() {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId } = ctx;

  const [members, tasks] = await Promise.all([
    prisma.organizationMember.findMany({
      where: { organizationId: orgId },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    prisma.task.findMany({
      where: { status: { not: "DONE" }, project: { organizationId: orgId, isPersonal: false } },
      select: { id: true, title: true, priority: true, status: true, dueDate: true, assigneeId: true },
    }),
  ]);

  const users = members.map((m) => m.user);

  const workloads = users.map((u) => ({
    userId: u.id,
    name: u.name ?? u.email,
    taskCount: tasks.filter((t) => t.assigneeId === u.id).length,
    urgentCount: tasks.filter((t) => t.assigneeId === u.id && (t.priority === "URGENT" || t.priority === "HIGH")).length,
    overdue: tasks.filter((t) => t.assigneeId === u.id && t.dueDate && new Date(t.dueDate) < new Date()).length,
  }));

  const unassigned = tasks.filter((t) => !t.assigneeId);
  const overloaded = workloads.filter((w) => w.taskCount > 10 || w.urgentCount > 5);

  const result = await generateJSON<{
    recommendations: {
      taskId: string;
      taskTitle: string;
      fromUserId: string | null;
      fromUserName: string | null;
      toUserId: string;
      toUserName: string;
      reason: string;
    }[];
    summary: string;
    healthScore: number;
  }>(
    [{
      role: "user",
      content: `Team workload:\n${JSON.stringify(workloads, null, 2)}\n\nOverloaded: ${JSON.stringify(overloaded.map((w) => w.name))}\nUnassigned tasks: ${unassigned.length}\nTasks needing reassignment from overloaded members: ${JSON.stringify(tasks.filter((t) => overloaded.some((o) => o.userId === t.assigneeId)).map((t) => ({ id: t.id, title: t.title, priority: t.priority, currentAssignee: workloads.find((w) => w.userId === t.assigneeId)?.name })))}`
    }],
    `You are a workload balancing expert. Analyze the team workload and suggest task reassignments to balance the team.
Return JSON (no fences):
{
  "recommendations": [
    {
      "taskId": "task id",
      "taskTitle": "task title",
      "fromUserId": "current assignee id or null",
      "fromUserName": "current assignee name or null",
      "toUserId": "target assignee id",
      "toUserName": "target assignee name",
      "reason": "why this reassignment helps"
    }
  ],
  "summary": "2-sentence overview of team health and recommendations",
  "healthScore": <0-100 team workload health score>
}
Only recommend reassignments that genuinely balance workload. Don't move tasks unnecessarily.
Return ONLY JSON.`,
    true
  );

  return NextResponse.json(result);
}
