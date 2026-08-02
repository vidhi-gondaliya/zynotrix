import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/task-activity";
import { createNotification } from "@/lib/notifications";
import { runAutomations } from "@/lib/automations";

export async function GET(_req: NextRequest, { params }: { params: { taskId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const comments = await prisma.comment.findMany({
    where: { taskId: params.taskId },
    include: { author: { select: { id: true, name: true, image: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(comments);
}

export async function POST(req: NextRequest, { params }: { params: { taskId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { content } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "Content required" }, { status: 400 });

  const task = await prisma.task.findUnique({
    where: { id: params.taskId },
    select: { id: true, title: true, assigneeId: true, creatorId: true },
  });
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  const comment = await prisma.comment.create({
    data: {
      content: content.trim(),
      taskId: params.taskId,
      authorId: session.user.id,
    },
    include: { author: { select: { id: true, name: true, email: true, image: true } } },
  });

  await logActivity(params.taskId, session.user.id, "commented", { preview: content.slice(0, 80) });

  // Fire comment_added automations
  prisma.project.findFirst({
    where: { tasks: { some: { id: params.taskId } } },
    select: { organizationId: true },
  }).then((proj) => {
    if (proj?.organizationId) {
      runAutomations(proj.organizationId, "comment_added", {
        taskId: params.taskId,
        comment: { content: content.trim(), authorId: session.user.id },
      }).catch(() => {});
    }
  }).catch(() => {});

  // Notify task assignee and creator (not the commenter)
  const toNotify = new Set<string>();
  if (task.assigneeId && task.assigneeId !== session.user.id) toNotify.add(task.assigneeId);
  if (task.creatorId && task.creatorId !== session.user.id) toNotify.add(task.creatorId);
  for (const id of toNotify) {
    createNotification(id, "COMMENT_ADDED", `New comment on: ${task.title}`, content.slice(0, 120), { taskId: task.id }).catch(() => {});
  }

  return NextResponse.json(comment, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: { taskId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { commentId } = await req.json();
  if (!commentId) return NextResponse.json({ error: "commentId required" }, { status: 400 });

  const comment = await prisma.comment.findUnique({ where: { id: commentId }, select: { authorId: true } });
  if (!comment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (comment.authorId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.comment.delete({ where: { id: commentId } });
  return NextResponse.json({ success: true });
}
