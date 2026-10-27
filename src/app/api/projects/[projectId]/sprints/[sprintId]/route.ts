import { NextRequest, NextResponse } from "next/server";
import { requireOrg, isOrgError } from "@/lib/org";
import { prisma } from "@/lib/prisma";

type P = { params: { projectId: string; sprintId: string } };

export async function PATCH(req: NextRequest, { params }: P) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const sprintContext = await (prisma as any).sprint.findFirst({
    where: { id: params.sprintId, projectId: params.projectId, project: { organizationId: ctx.orgId } },
    select: { id: true, projectId: true },
  });
  if (!sprintContext) return NextResponse.json({ error: "Sprint not found" }, { status: 404 });

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
    const task = await prisma.task.findFirst({ where: { id: removeTaskId, projectId: sprintContext.projectId, project: { organizationId: ctx.orgId } }, select: { id: true } });
    if (!task) return NextResponse.json({ error: "Task not found in this project" }, { status: 404 });
    await (prisma as any).sprintTask.deleteMany({
      where: { sprintId: params.sprintId, taskId: removeTaskId },
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

  const updatedSprint = await (prisma as any).sprint.update({
    where: { id: params.sprintId },
    data: {
      ...(status && { status }),
      ...(name && { name }),
      ...(goal !== undefined && { goal }),
      ...(velocity !== undefined ? { velocity } : autoVelocity !== undefined ? { velocity: autoVelocity } : {}),
    },
  });

  return NextResponse.json(updatedSprint);
}

export async function DELETE(_req: NextRequest, { params }: P) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await (prisma as any).sprint.delete({ where: { id: params.sprintId } });
  return NextResponse.json({ ok: true });
}
