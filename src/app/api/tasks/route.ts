import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg, isOrgError } from "@/lib/org";

const USER_SELECT = { id: true, name: true, email: true, image: true, role: true, createdAt: true };

function parseTags(value: string): unknown[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // Legacy or manually-edited rows should not take down the whole task list.
    return [];
  }
}

export async function GET(req: NextRequest) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId } = ctx;

  const { searchParams } = new URL(req.url);
  const filter = searchParams.get("filter");
  const status = searchParams.get("status");
  const priority = searchParams.get("priority");
  const projectId = searchParams.get("projectId");
  const assigneeId = searchParams.get("assigneeId");

  // Bound query input sizes before passing them into database filters.
  if ([filter, status, priority].some((v) => v && v.length > 40) ||
      [projectId, assigneeId].some((v) => v && v.length > 128)) {
    return NextResponse.json({ error: "Invalid task query parameters." }, { status: 400 });
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowStart = new Date(todayStart.getTime() + 86_400_000);
  const dayAfterTomorrow = new Date(todayStart.getTime() + 2 * 86_400_000);

  // Tenant scope is always applied through the owning project.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { project: { organizationId: orgId } };

  if (priority) where.priority = priority;
  if (projectId) where.projectId = projectId;
  if (assigneeId) where.assigneeId = assigneeId;

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
      where.assigneeId = ctx.userId;
      break;
    case null:
    case "":
      break;
    default:
      return NextResponse.json({ error: "Unsupported task filter." }, { status: 400 });
  }

  try {
    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignee: { select: USER_SELECT },
        creator: { select: USER_SELECT },
        project: { select: { id: true, name: true, color: true } },
        _count: { select: { comments: true } },
      },
      orderBy: [{ dueDate: "asc" }, { priority: "desc" }, { updatedAt: "desc" }],
    });

    return NextResponse.json(tasks.map((task) => ({ ...task, tags: parseTags(task.tags) })));
  } catch {
    return NextResponse.json({ error: "Unable to load tasks right now." }, { status: 500 });
  }
}
