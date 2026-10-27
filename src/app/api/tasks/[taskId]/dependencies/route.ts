import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg, isOrgError } from "@/lib/org";

async function workspaceTask(taskId: string, orgId: string) {
  return prisma.task.findFirst({
    where: { id: taskId, project: { organizationId: orgId } },
    select: { id: true },
  });
}

export async function GET(_req: NextRequest, { params }: { params: { taskId: string } }) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  if (!(await workspaceTask(params.taskId, ctx.orgId))) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [blockedBy, blocking] = await Promise.all([
    (prisma as any).taskDependency.findMany({
      where: { taskId: params.taskId, task: { project: { organizationId: ctx.orgId } }, dependsOn: { project: { organizationId: ctx.orgId } } },
      include: { dependsOn: { select: { id: true, title: true, status: true, priority: true } } },
    }),
    (prisma as any).taskDependency.findMany({
      where: { dependsOnId: params.taskId, task: { project: { organizationId: ctx.orgId } }, dependsOn: { project: { organizationId: ctx.orgId } } },
      include: { task: { select: { id: true, title: true, status: true, priority: true } } },
    }),
  ]);
  return NextResponse.json({
    blockedBy: blockedBy.map((item: any) => ({ ...item.dependsOn, dependencyId: item.id })),
    blocking: blocking.map((item: any) => ({ ...item.task, dependencyId: item.id })),
  });
}

export async function POST(req: NextRequest, { params }: { params: { taskId: string } }) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  if (!(await workspaceTask(params.taskId, ctx.orgId))) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }
  const dependsOnId = body && typeof body === "object" && !Array.isArray(body)
    ? (body as Record<string, unknown>).dependsOnId : null;
  if (typeof dependsOnId !== "string" || !dependsOnId) return NextResponse.json({ error: "dependsOnId is required." }, { status: 400 });
  if (dependsOnId === params.taskId) return NextResponse.json({ error: "Task cannot depend on itself." }, { status: 400 });
  if (!(await workspaceTask(dependsOnId, ctx.orgId))) return NextResponse.json({ error: "Dependency task not found in this workspace." }, { status: 404 });

  const dep = await (prisma as any).taskDependency.upsert({
    where: { taskId_dependsOnId: { taskId: params.taskId, dependsOnId } },
    update: {},
    create: { taskId: params.taskId, dependsOnId },
    include: { dependsOn: { select: { id: true, title: true, status: true, priority: true } } },
  });
  return NextResponse.json(dep, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: { taskId: string } }) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  if (!(await workspaceTask(params.taskId, ctx.orgId))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }
  const dependencyId = body && typeof body === "object" && !Array.isArray(body)
    ? (body as Record<string, unknown>).dependencyId : null;
  if (typeof dependencyId !== "string" || !dependencyId) return NextResponse.json({ error: "dependencyId is required." }, { status: 400 });
  const existing = await (prisma as any).taskDependency.findFirst({
    where: { id: dependencyId, taskId: params.taskId, task: { project: { organizationId: ctx.orgId } }, dependsOn: { project: { organizationId: ctx.orgId } } },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await (prisma as any).taskDependency.delete({ where: { id: existing.id } });
  return NextResponse.json({ ok: true });
}
