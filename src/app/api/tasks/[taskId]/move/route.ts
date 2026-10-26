import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg, isOrgError } from "@/lib/org";

const TASK_STATUSES = ["BACKLOG", "TODO", "IN_PROGRESS", "REVIEW", "DONE", "ARCHIVED"] as const;

function safeTags(value: string): unknown[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function PUT(req: NextRequest, { params }: { params: { taskId: string } }) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId } = ctx;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Request body must be a JSON object." }, { status: 400 });
  }

  const { status, position } = body as { status?: unknown; position?: unknown };
  if (typeof status !== "string" || !(TASK_STATUSES as readonly string[]).includes(status)) {
    return NextResponse.json({ error: "Invalid task status." }, { status: 400 });
  }
  if (typeof position !== "number" || !Number.isSafeInteger(position) || position < 0 || position > 1000000) {
    return NextResponse.json({ error: "Position must be a non-negative integer." }, { status: 400 });
  }

  // Resolve the task through its owning project to enforce workspace isolation.
  const task = await prisma.task.findFirst({
    where: { id: params.taskId, project: { organizationId: orgId } },
  });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const oldStatus = task.status;
  const oldPosition = task.position;

  await prisma.$transaction(async (tx) => {
    if (oldStatus !== status) {
      await tx.task.updateMany({
        where: { projectId: task.projectId, status: oldStatus, position: { gt: oldPosition } },
        data: { position: { decrement: 1 } },
      });
      await tx.task.updateMany({
        where: { projectId: task.projectId, status, position: { gte: position }, id: { not: task.id } },
        data: { position: { increment: 1 } },
      });
    } else if (oldPosition < position) {
      await tx.task.updateMany({
        where: { projectId: task.projectId, status, position: { gt: oldPosition, lte: position }, id: { not: task.id } },
        data: { position: { decrement: 1 } },
      });
    } else if (oldPosition > position) {
      await tx.task.updateMany({
        where: { projectId: task.projectId, status, position: { gte: position, lt: oldPosition }, id: { not: task.id } },
        data: { position: { increment: 1 } },
      });
    }

    await tx.task.update({ where: { id: task.id }, data: { status, position } });

    const columns = oldStatus !== status ? [oldStatus, status] : [status];
    for (const column of columns) {
      const rows = await tx.task.findMany({
        where: { projectId: task.projectId, status: column },
        orderBy: [{ position: "asc" }, { updatedAt: "asc" }],
        select: { id: true },
      });
      for (let i = 0; i < rows.length; i++) {
        await tx.task.update({ where: { id: rows[i].id }, data: { position: i + 1 } });
      }
    }
  });

  const updated = await prisma.task.findFirst({
    where: { id: task.id, project: { organizationId: orgId } },
    include: {
      assignee: { select: { id: true, name: true, email: true, image: true } },
      creator: { select: { id: true, name: true, email: true, image: true } },
      project: { select: { id: true, name: true } },
      _count: { select: { comments: true } },
    },
  });
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ...updated, tags: safeTags(updated.tags) });
}
