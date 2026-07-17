import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateJSON } from "@/lib/claude";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tasks = await prisma.task.findMany({
    where: { assigneeId: session.user.id, status: { not: "DONE" } },
    include: { project: { select: { name: true, deadline: true } } },
    orderBy: { createdAt: "asc" },
  });

  if (tasks.length === 0) return NextResponse.json({ tasks: [], message: "No tasks to prioritize." });

  const taskSummaries = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    priority: t.priority,
    status: t.status,
    dueDate: t.dueDate,
    project: t.project?.name ?? "Personal",
    projectDeadline: t.project?.deadline ?? null,
  }));

  const result = await generateJSON<{
    id: string; reason: string; urgencyScore: number;
  }[]>(
    [{ role: "user", content: `Re-prioritize these tasks:\n${JSON.stringify(taskSummaries, null, 2)}` }],
    `You are a task prioritization expert. Given a list of tasks, return them sorted from highest to lowest urgency.
Today is ${new Date().toISOString().split("T")[0]}.
Return a JSON array (no fences):
[{ "id": "task-id", "reason": "one sentence why this is ranked here", "urgencyScore": <1-100> }]
Consider: deadline proximity, project deadline, current priority label, status, workload balance.
URGENT tasks due soon = top. DONE or BACKLOG with no deadline = bottom.
Return ONLY the JSON array sorted by urgency descending.`,
    true
  );

  // Merge AI ranking with task data
  const ranked = result
    .map((r) => {
      const task = tasks.find((t) => t.id === r.id);
      if (!task) return null;
      return { ...task, tags: JSON.parse(task.tags), aiReason: r.reason, urgencyScore: r.urgencyScore };
    })
    .filter(Boolean);

  return NextResponse.json({ tasks: ranked });
}
