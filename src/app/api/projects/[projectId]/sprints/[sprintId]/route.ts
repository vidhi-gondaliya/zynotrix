import { NextRequest, NextResponse } from "next/server";
import { requireOrg, isOrgError } from "@/lib/org";
import { prisma } from "@/lib/prisma";

type P = { params: { projectId: string; sprintId: string } };
const SPRINT_STATUSES = ["PLANNING", "ACTIVE", "COMPLETED", "CANCELLED"];

export async function PATCH(req: NextRequest, { params }: P) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const sprint = await (prisma as any).sprint.findFirst({
    where: { id: params.sprintId, projectId: params.projectId, project: { organizationId: ctx.orgId } },
    select: { id: true, projectId: true },
  });
  if (!sprint) return NextResponse.json({ error: "Sprint not found" }, { status: 404 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  const { addTaskId, removeTaskId, status, name, goal, velocity } = body;

  if (addTaskId !== undefined && removeTaskId !== undefined) return NextResponse.json({ error: "Choose one task operation at a time" }, { status: 400 });
  if (addTaskId !== undefined) {
    if (typeof addTaskId !== "string" || !addTaskId) return NextResponse.json({ error: "Invalid addTaskId" }, { status: 400 });
    const task = await prisma.task.findFirst({ where: { id: addTaskId, projectId: sprint.projectId, project: { organizationId: ctx.orgId } }, select: { id: true } });
    if (!task) return NextResponse.json({ error: "Task not found in this project" }, { status: 404 });
    await (prisma as any).sprintTask.upsert({ where: { sprintId_taskId: { sprintId: sprint.id, taskId: addTaskId } }, update: {}, create: { sprintId: sprint.id, taskId: addTaskId } });
    return NextResponse.json({ ok: true });
  }
  if (removeTaskId !== undefined) {
    if (typeof removeTaskId !== "string" || !removeTaskId) return NextResponse.json({ error: "Invalid removeTaskId" }, { status: 400 });
    const task = await prisma.task.findFirst({ where: { id: removeTaskId, projectId: sprint.projectId, project: { organizationId: ctx.orgId } }, select: { id: true } });
    if (!task) return NextResponse.json({ error: "Task not found in this project" }, { status: 404 });
    await (prisma as any).sprintTask.deleteMany({ where: { sprintId: sprint.id, taskId: removeTaskId } });
    return NextResponse.json({ ok: true });
  }

  if (status !== undefined && (typeof status !== "string" || !SPRINT_STATUSES.includes(status))) return NextResponse.json({ error: "Invalid sprint status" }, { status: 400 });
  if (name !== undefined && (typeof name !== "string" || !name.trim() || name.trim().length > 120)) return NextResponse.json({ error: "Invalid sprint name" }, { status: 400 });
  if (goal !== undefined && goal !== null && typeof goal !== "string") return NextResponse.json({ error: "Invalid sprint goal" }, { status: 400 });
  if (velocity !== undefined && (!Number.isInteger(velocity) || velocity < 0 || velocity > 100000)) return NextResponse.json({ error: "Invalid velocity" }, { status: 400 });

  let autoVelocity: number | undefined;
  if (status === "COMPLETED" && velocity === undefined) {
    const sprintTasks = await (prisma as any).sprintTask.findMany({ where: { sprintId: sprint.id }, include: { task: { select: { status: true, storyPoints: true } } } });
    autoVelocity = sprintTasks.filter((st: any) => st.task?.status === "DONE").reduce((sum: number, st: any) => sum + (st.task?.storyPoints ?? 0), 0);
  }
  const updated = await (prisma as any).sprint.update({
    where: { id: sprint.id },
    data: {
      ...(status !== undefined && { status }),
      ...(name !== undefined && { name: name.trim() }),
      ...(goal !== undefined && { goal: typeof goal === "string" ? goal.trim().slice(0, 2000) || null : null }),
      ...(velocity !== undefined ? { velocity } : autoVelocity !== undefined ? { velocity: autoVelocity } : {}),
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: P) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const result = await (prisma as any).sprint.deleteMany({
    where: { id: params.sprintId, projectId: params.projectId, project: { organizationId: ctx.orgId } },
  });
  if (!result.count) return NextResponse.json({ error: "Sprint not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
