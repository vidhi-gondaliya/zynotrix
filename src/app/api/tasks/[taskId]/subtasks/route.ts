import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg, isOrgError } from "@/lib/org";

function safeTags(value: string): unknown[] {
  try { const parsed: unknown = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; }
  catch { return []; }
}
async function workspaceTask(taskId: string, orgId: string) {
  return prisma.task.findFirst({
    where: { id: taskId, project: { organizationId: orgId } },
    select: { id: true, projectId: true },
  });
}
function parseBody(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

export async function GET(_req: NextRequest, { params }: { params: { taskId: string } }) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  if (!(await workspaceTask(params.taskId, ctx.orgId))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const subtasks = await prisma.task.findMany({
    where: { parentTaskId: params.taskId, project: { organizationId: ctx.orgId } },
    include: { assignee: { select: { id: true, name: true, image: true } } },
    orderBy: { position: "asc" },
  });
  return NextResponse.json(subtasks.map((task) => ({ ...task, tags: safeTags(task.tags) })));
}

export async function POST(req: NextRequest, { params }: { params: { taskId: string } }) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const parent = await workspaceTask(params.taskId, ctx.orgId);
  if (!parent) return NextResponse.json({ error: "Not found" }, { status: 404 });
  let raw: unknown;
  try { raw = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }
  const body = parseBody(raw);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  if (!title || title.length > 300) return NextResponse.json({ error: "Title must be 1–300 characters." }, { status: 400 });
  let assigneeId: string | null = null;
  if (body?.assigneeId != null && body.assigneeId !== "") {
    if (typeof body.assigneeId !== "string") return NextResponse.json({ error: "Invalid assignee." }, { status: 400 });
    const member = await prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: ctx.orgId, userId: body.assigneeId } },
      select: { userId: true },
    });
    if (!member) return NextResponse.json({ error: "Assignee must be a member of this workspace." }, { status: 400 });
    assigneeId = body.assigneeId;
  }
  const maxPos = await prisma.task.aggregate({ where: { parentTaskId: parent.id }, _max: { position: true } });
  const subtask = await prisma.task.create({
    data: {
      title, projectId: parent.projectId, parentTaskId: parent.id, status: "TODO", priority: "MEDIUM",
      position: (maxPos._max.position ?? 0) + 1, creatorId: ctx.userId, assigneeId, tags: "[]",
    },
    include: { assignee: { select: { id: true, name: true, image: true } } },
  });
  return NextResponse.json({ ...subtask, tags: [] }, { status: 201 });
}

export async function PATCH(req: NextRequest, { params }: { params: { taskId: string } }) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  if (!(await workspaceTask(params.taskId, ctx.orgId))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  let raw: unknown;
  try { raw = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }
  const body = parseBody(raw);
  if (typeof body?.subtaskId !== "string" || !body.subtaskId) return NextResponse.json({ error: "subtaskId is required." }, { status: 400 });
  const subtask = await prisma.task.findFirst({
    where: { id: body.subtaskId, parentTaskId: params.taskId, project: { organizationId: ctx.orgId } },
    select: { id: true },
  });
  if (!subtask) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const data: Record<string, unknown> = {};
  if (body.status !== undefined) {
    if (typeof body.status !== "string" || !["BACKLOG", "TODO", "IN_PROGRESS", "REVIEW", "DONE", "ARCHIVED"].includes(body.status)) {
      return NextResponse.json({ error: "Invalid task status." }, { status: 400 });
    }
    data.status = body.status;
  }
  if (body.title !== undefined) {
    if (typeof body.title !== "string" || !body.title.trim() || body.title.trim().length > 300) {
      return NextResponse.json({ error: "Title must be 1–300 characters." }, { status: 400 });
    }
    data.title = body.title.trim();
  }
  const updated = await prisma.task.update({
    where: { id: subtask.id }, data: data as never,
    include: { assignee: { select: { id: true, name: true, image: true } } },
  });
  return NextResponse.json({ ...updated, tags: safeTags(updated.tags) });
}

export async function DELETE(req: NextRequest, { params }: { params: { taskId: string } }) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  if (!(await workspaceTask(params.taskId, ctx.orgId))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  let raw: unknown;
  try { raw = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }
  const body = parseBody(raw);
  if (typeof body?.subtaskId !== "string" || !body.subtaskId) return NextResponse.json({ error: "subtaskId is required." }, { status: 400 });
  const subtask = await prisma.task.findFirst({
    where: { id: body.subtaskId, parentTaskId: params.taskId, project: { organizationId: ctx.orgId } },
    select: { id: true },
  });
  if (!subtask) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.task.delete({ where: { id: subtask.id } });
  return NextResponse.json({ success: true });
}
