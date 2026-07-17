import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/tasks/[taskId]/subtask-comments
export async function GET(_req: NextRequest, { params }: { params: { taskId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const comments = await (prisma as any).subtaskComment.findMany({
    where: { taskId: params.taskId },
    include: { author: { select: { id: true, name: true, image: true } } },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(comments);
}

// POST /api/tasks/[taskId]/subtask-comments
export async function POST(req: NextRequest, { params }: { params: { taskId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { content } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "Content required" }, { status: 400 });

  const comment = await (prisma as any).subtaskComment.create({
    data: { taskId: params.taskId, authorId: session.user.id, content: content.trim() },
    include: { author: { select: { id: true, name: true, image: true } } },
  });
  return NextResponse.json(comment, { status: 201 });
}

// DELETE /api/tasks/[taskId]/subtask-comments
export async function DELETE(req: NextRequest, { params }: { params: { taskId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { commentId } = await req.json();
  const comment = await (prisma as any).subtaskComment.findUnique({ where: { id: commentId } });
  if (!comment || comment.authorId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await (prisma as any).subtaskComment.delete({ where: { id: commentId } });
  return NextResponse.json({ ok: true });
}
