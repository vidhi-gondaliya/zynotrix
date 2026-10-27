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
  const comments = await (prisma as any).subtaskComment.findMany({
    where: { taskId: params.taskId, task: { project: { organizationId: ctx.orgId } } },
    include: { author: { select: { id: true, name: true, image: true } } },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(comments);
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
  const content = parseBody(raw)?.content;
  if (typeof content !== "string" || !content.trim() || content.trim().length > 10000) {
    return NextResponse.json({ error: "Comment must be between 1 and 10000 characters." }, { status: 400 });
  }
  const comment = await (prisma as any).subtaskComment.create({
    data: { taskId: params.taskId, authorId: ctx.userId, content: content.trim() },
    include: { author: { select: { id: true, name: true, image: true } } },
  });
  return NextResponse.json(comment, { status: 201 });
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
  const commentId = parseBody(raw)?.commentId;
  if (typeof commentId !== "string" || !commentId) {
    return NextResponse.json({ error: "commentId is required." }, { status: 400 });
  }
  const comment = await (prisma as any).subtaskComment.findFirst({
    where: { id: commentId, taskId: params.taskId, task: { project: { organizationId: ctx.orgId } } },
  });
  if (!comment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (comment.authorId !== ctx.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await (prisma as any).subtaskComment.delete({ where: { id: comment.id } });
  return NextResponse.json({ ok: true });
}
