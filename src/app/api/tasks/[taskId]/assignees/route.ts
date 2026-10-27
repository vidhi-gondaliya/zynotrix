import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg, isOrgError } from "@/lib/org";

async function workspaceTask(taskId: string, orgId: string) {
  return prisma.task.findFirst({
    where: { id: taskId, project: { organizationId: orgId } },
    select: { id: true },
  });
}

function parseBody(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

export async function GET(_req: NextRequest, { params }: { params: { taskId: string } }) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  if (!(await workspaceTask(params.taskId, ctx.orgId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const assignees = await (prisma as any).taskAssignee.findMany({
    where: { taskId: params.taskId, task: { project: { organizationId: ctx.orgId } } },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
    orderBy: { assignedAt: "asc" },
  });
  return NextResponse.json(assignees);
}

export async function POST(req: NextRequest, { params }: { params: { taskId: string } }) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  if (!(await workspaceTask(params.taskId, ctx.orgId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  let raw: unknown;
  try { raw = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }
  const userId = parseBody(raw)?.userId;
  if (typeof userId !== "string" || !userId) {
    return NextResponse.json({ error: "userId is required." }, { status: 400 });
  }
  const member = await prisma.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId: ctx.orgId, userId } },
    select: { userId: true },
  });
  if (!member) return NextResponse.json({ error: "Assignee must belong to this workspace." }, { status: 400 });

  const entry = await (prisma as any).taskAssignee.upsert({
    where: { taskId_userId: { taskId: params.taskId, userId } },
    update: {},
    create: { taskId: params.taskId, userId },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
  });
  return NextResponse.json(entry, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: { taskId: string } }) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  if (!(await workspaceTask(params.taskId, ctx.orgId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  let raw: unknown;
  try { raw = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }
  const userId = parseBody(raw)?.userId;
  if (typeof userId !== "string" || !userId) {
    return NextResponse.json({ error: "userId is required." }, { status: 400 });
  }
  await (prisma as any).taskAssignee.deleteMany({
    where: { taskId: params.taskId, userId, task: { project: { organizationId: ctx.orgId } } },
  });
  return NextResponse.json({ ok: true });
}
