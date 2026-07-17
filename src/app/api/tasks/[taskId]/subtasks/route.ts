import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { taskId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const subtasks = await prisma.task.findMany({
    where: { parentTaskId: params.taskId },
    include: { assignee: { select: { id: true, name: true, image: true } } },
    orderBy: { position: "asc" },
  });

  return NextResponse.json(subtasks.map((t) => ({ ...t, tags: JSON.parse(t.tags) })));
}

export async function POST(req: NextRequest, { params }: { params: { taskId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, assigneeId } = await req.json();
  if (!title?.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 });

  // Find parent to inherit projectId
  const parent = await prisma.task.findUnique({ where: { id: params.taskId }, select: { projectId: true } });
  if (!parent) return NextResponse.json({ error: "Parent task not found" }, { status: 404 });

  const maxPos = await prisma.task.aggregate({
    where: { parentTaskId: params.taskId },
    _max: { position: true },
  });

  const subtask = await prisma.task.create({
    data: {
      title: title.trim(),
      projectId: parent.projectId,
      parentTaskId: params.taskId,
      status: "TODO",
      priority: "MEDIUM",
      position: (maxPos._max.position ?? -1) + 1,
      creatorId: session.user.id,
      assigneeId: assigneeId || null,
      tags: "[]",
    },
    include: { assignee: { select: { id: true, name: true, image: true } } },
  });

  return NextResponse.json({ ...subtask, tags: [] }, { status: 201 });
}

export async function PATCH(req: NextRequest, { params }: { params: { taskId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { subtaskId, status, title } = await req.json();
  if (!subtaskId) return NextResponse.json({ error: "subtaskId required" }, { status: 400 });

  const updated = await prisma.task.update({
    where: { id: subtaskId, parentTaskId: params.taskId },
    data: {
      ...(status !== undefined ? { status } : {}),
      ...(title !== undefined ? { title } : {}),
    },
    include: { assignee: { select: { id: true, name: true, image: true } } },
  });

  return NextResponse.json({ ...updated, tags: JSON.parse(updated.tags) });
}

export async function DELETE(req: NextRequest, { params }: { params: { taskId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { subtaskId } = await req.json();
  await prisma.task.delete({ where: { id: subtaskId, parentTaskId: params.taskId } });
  return NextResponse.json({ success: true });
}
