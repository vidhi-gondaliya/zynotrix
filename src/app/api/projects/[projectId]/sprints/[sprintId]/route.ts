import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type P = { params: { projectId: string; sprintId: string } };

export async function PATCH(req: NextRequest, { params }: P) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { addTaskId, removeTaskId, status, name, goal, velocity } = body;

  if (addTaskId) {
    await (prisma as any).sprintTask.upsert({
      where: { sprintId_taskId: { sprintId: params.sprintId, taskId: addTaskId } },
      update: {},
      create: { sprintId: params.sprintId, taskId: addTaskId },
    });
    return NextResponse.json({ ok: true });
  }

  if (removeTaskId) {
    await (prisma as any).sprintTask.delete({
      where: { sprintId_taskId: { sprintId: params.sprintId, taskId: removeTaskId } },
    });
    return NextResponse.json({ ok: true });
  }

  // Auto-calculate velocity when a sprint is completed
  let autoVelocity: number | undefined;
  if (status === "COMPLETED") {
    const sprintTasks = await (prisma as any).sprintTask.findMany({
      where: { sprintId: params.sprintId },
      include: { task: { select: { status: true, storyPoints: true } } },
    });
    autoVelocity = sprintTasks
      .filter((st: any) => st.task?.status === "DONE")
      .reduce((sum: number, st: any) => sum + (st.task?.storyPoints ?? 0), 0);
  }

  const sprint = await (prisma as any).sprint.update({
    where: { id: params.sprintId },
    data: {
      ...(status && { status }),
      ...(name && { name }),
      ...(goal !== undefined && { goal }),
      ...(velocity !== undefined ? { velocity } : autoVelocity !== undefined ? { velocity: autoVelocity } : {}),
    },
  });

  return NextResponse.json(sprint);
}

export async function DELETE(_req: NextRequest, { params }: P) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await (prisma as any).sprint.delete({ where: { id: params.sprintId } });
  return NextResponse.json({ ok: true });
}
