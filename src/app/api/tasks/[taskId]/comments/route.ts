import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg, isOrgError } from "@/lib/org";
import { logActivity } from "@/lib/task-activity";
import { createNotification } from "@/lib/notifications";
import { runAutomations } from "@/lib/automations";

async function workspaceTask(taskId: string, orgId: string) {
  return prisma.task.findFirst({
    where: { id: taskId, project: { organizationId: orgId } },
    select: { id: true, title: true, assigneeId: true, creatorId: true, projectId: true },
  });
}

export async function GET(_req: NextRequest, { params }: { params: { taskId: string } }) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  if (!(await workspaceTask(params.taskId, ctx.orgId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const comments = await prisma.comment.findMany({
    where: { taskId: params.taskId, task: { project: { organizationId: ctx.orgId } } },
    include: { author: { select: { id: true, name: true, image: true } } },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(comments);
}

export async function POST(req: NextRequest, { params }: { params: { taskId: string } }) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const task = await workspaceTask(params.taskId, ctx.orgId);
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body) ||
      typeof (body as Record<string, unknown>).content !== "string") {
    return NextResponse.json({ error: "Comment content is required." }, { status: 400 });
  }
  const content = ((body as { content: string }).content).trim();
  if (!content || content.length > 10000) {
    return NextResponse.json({ error: "Comment must be between 1 and 10000 characters." }, { status: 400 });
  }

  const comment = await prisma.comment.create({
    data: { content, taskId: task.id, authorId: ctx.userId },
    include: { author: { select: { id: true, name: true, email: true, image: true } } },
  });
  await logActivity(task.id, ctx.userId, "commented", { preview: content.slice(0, 80) });
  runAutomations(ctx.orgId, "comment_added", {
    taskId: task.id, comment: { content, authorId: ctx.userId },
  }).catch(() => {});

  const recipients = new Set<string>();
  if (task.assigneeId && task.assigneeId !== ctx.userId) recipients.add(task.assigneeId);
  if (task.creatorId && task.creatorId !== ctx.userId) recipients.add(task.creatorId);
  for (const userId of recipients) {
    createNotification(userId, "COMMENT_ADDED", `New comment on: ${task.title}`,
      content.slice(0, 120), { taskId: task.id }).catch(() => {});
  }
  return NextResponse.json(comment, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: { taskId: string } }) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  if (!(await workspaceTask(params.taskId, ctx.orgId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }
  const commentId = body && typeof body === "object" && !Array.isArray(body)
    ? (body as Record<string, unknown>).commentId : null;
  if (typeof commentId !== "string" || !commentId) {
    return NextResponse.json({ error: "commentId is required." }, { status: 400 });
  }
  const comment = await prisma.comment.findFirst({
    where: { id: commentId, taskId: params.taskId, task: { project: { organizationId: ctx.orgId } } },
    select: { id: true, authorId: true },
  });
  if (!comment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (comment.authorId !== ctx.userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await prisma.comment.delete({ where: { id: comment.id } });
  return NextResponse.json({ success: true });
}
