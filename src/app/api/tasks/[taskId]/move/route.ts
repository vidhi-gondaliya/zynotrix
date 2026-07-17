import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { TaskStatus } from "@/types";

export async function PUT(req: NextRequest, { params }: { params: { taskId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { status, position } = await req.json() as { status: TaskStatus; position: number };

  const task = await prisma.task.findUnique({ where: { id: params.taskId } });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const oldStatus = task.status;
  const oldPosition = task.position;

  await prisma.$transaction(async (tx) => {
    if (oldStatus !== status) {
      // Moving to different column
      // Shift source column positions down
      await tx.task.updateMany({
        where: { projectId: task.projectId, status: oldStatus, position: { gt: oldPosition } },
        data: { position: { decrement: 1 } },
      });
      // Shift target column positions up
      await tx.task.updateMany({
        where: { projectId: task.projectId, status, position: { gte: position }, id: { not: params.taskId } },
        data: { position: { increment: 1 } },
      });
    } else {
      // Same column reorder
      if (oldPosition < position) {
        await tx.task.updateMany({
          where: { projectId: task.projectId, status, position: { gt: oldPosition, lte: position }, id: { not: params.taskId } },
          data: { position: { decrement: 1 } },
        });
      } else {
        await tx.task.updateMany({
          where: { projectId: task.projectId, status, position: { gte: position, lt: oldPosition }, id: { not: params.taskId } },
          data: { position: { increment: 1 } },
        });
      }
    }

    await tx.task.update({
      where: { id: params.taskId },
      data: { status, position },
    });
  });

  const updated = await prisma.task.findUnique({
    where: { id: params.taskId },
    include: {
      assignee: { select: { id: true, name: true, email: true, image: true } },
      creator: { select: { id: true, name: true, email: true, image: true } },
      _count: { select: { comments: true } },
    },
  });

  return NextResponse.json({ ...updated, tags: JSON.parse(updated!.tags) });
}
