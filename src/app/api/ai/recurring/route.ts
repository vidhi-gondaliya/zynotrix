import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateJSON } from "@/lib/claude";

// POST — create a recurring task (natural language pattern + base task)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { taskId, pattern, projectId, title } = await req.json();

  let rule: string;
  if (pattern) {
    // parse natural language pattern
    const parsed = await generateJSON<{ frequency: string; interval: number; daysOfWeek?: number[]; dayOfMonth?: number; description: string }>(
      [{ role: "user", content: `Recurrence pattern: "${pattern}"` }],
      `Parse this recurrence pattern into a schedule rule. Return JSON:
{
  "frequency": "DAILY"|"WEEKLY"|"MONTHLY"|"YEARLY",
  "interval": 1,
  "daysOfWeek": [0,1,2,3,4,5,6] or null (for WEEKLY, 0=Sun),
  "dayOfMonth": 1-31 or null (for MONTHLY),
  "description": "human-readable summary"
}
Return ONLY JSON.`,
      true
    );
    rule = JSON.stringify(parsed);
  } else {
    return NextResponse.json({ error: "pattern required" }, { status: 400 });
  }

  let targetTaskId = taskId;
  if (!targetTaskId) {
    if (!title || !projectId) return NextResponse.json({ error: "title and projectId required when no taskId" }, { status: 400 });
    const task = await (prisma as any).task.create({
      data: { title, status: "BACKLOG", priority: "MEDIUM", recurrenceRule: rule, projectId, creatorId: session.user.id },
    });
    targetTaskId = task.id;
  } else {
    await (prisma as any).task.update({ where: { id: targetTaskId }, data: { recurrenceRule: rule } });
  }

  return NextResponse.json({ taskId: targetTaskId, rule: JSON.parse(rule) }, { status: 201 });
}

// GET — list all recurring tasks for the user
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tasks = await (prisma as any).task.findMany({
    where: { creatorId: session.user.id, NOT: { recurrenceRule: null } },
    select: { id: true, title: true, status: true, priority: true, recurrenceRule: true, dueDate: true },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(tasks.map((t: any) => ({
    ...t,
    recurrenceRule: t.recurrenceRule ? JSON.parse(t.recurrenceRule) : null,
  })));
}
