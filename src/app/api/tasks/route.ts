import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const USER_SELECT = { id: true, name: true, email: true, image: true, role: true, createdAt: true };

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const filter    = searchParams.get("filter");    // overdue | today | tomorrow | upcoming | mine
  const status    = searchParams.get("status");
  const priority  = searchParams.get("priority");
  const projectId = searchParams.get("projectId");
  const assigneeId = searchParams.get("assigneeId");

  const now = new Date();
  const todayStart      = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowStart   = new Date(todayStart.getTime() + 86_400_000);
  const dayAfterTomorrow = new Date(todayStart.getTime() + 2 * 86_400_000);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (priority)  where.priority  = priority;
  if (projectId) where.projectId = projectId;
  if (assigneeId) where.assigneeId = assigneeId;

  // Status: explicit param takes priority over filter's implied status
  if (status) {
    where.status = status;
  } else if (filter === "overdue" || filter === "upcoming") {
    where.status = { not: "DONE" };
  }

  switch (filter) {
    case "overdue":
      where.dueDate = { lt: now };
      break;
    case "today":
      where.dueDate = { gte: todayStart, lt: tomorrowStart };
      break;
    case "tomorrow":
      where.dueDate = { gte: tomorrowStart, lt: dayAfterTomorrow };
      break;
    case "upcoming":
      where.dueDate = { gte: todayStart, lt: dayAfterTomorrow };
      break;
    case "mine":
      where.assigneeId = session.user.id;
      break;
  }

  const tasks = await prisma.task.findMany({
    where,
    include: {
      assignee: { select: USER_SELECT },
      creator:  { select: USER_SELECT },
      project:  { select: { id: true, name: true, color: true } },
      _count:   { select: { comments: true } },
    },
    orderBy: [{ dueDate: "asc" }, { priority: "desc" }, { updatedAt: "desc" }],
  });

  return NextResponse.json(
    tasks.map((t) => ({ ...t, tags: JSON.parse(t.tags) }))
  );
}
