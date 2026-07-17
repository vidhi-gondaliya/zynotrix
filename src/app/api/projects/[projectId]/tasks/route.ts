import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { logActivity } from "@/lib/task-activity";

export async function GET(req: NextRequest, { params }: { params: { projectId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const tasks = await prisma.task.findMany({
    where: {
      projectId: params.projectId,
      ...(status ? { status: status as never } : {}),
    },
    include: {
      assignee: { select: { id: true, name: true, email: true, image: true } },
      creator: { select: { id: true, name: true, email: true, image: true } },
      _count: { select: { comments: true } },
    },
    orderBy: [{ status: "asc" }, { position: "asc" }],
  });

  return NextResponse.json(
    tasks.map((t) => ({ ...t, tags: JSON.parse(t.tags) }))
  );
}

export async function POST(req: NextRequest, { params }: { params: { projectId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const maxPos = await prisma.task.aggregate({
    where: { projectId: params.projectId, status: body.status ?? "BACKLOG" },
    _max: { position: true },
  });

  const task = await prisma.task.create({
    data: {
      projectId: params.projectId,
      title: body.title,
      description: body.description,
      status: body.status ?? "BACKLOG",
      priority: body.priority ?? "MEDIUM",
      position: (maxPos._max.position ?? -1) + 1,
      assigneeId: body.assigneeId || null,
      creatorId: session.user.id,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      estimatedHours: body.estimatedHours ? parseFloat(body.estimatedHours) : null,
      tags: JSON.stringify(body.tags ?? []),
    },
    include: {
      assignee: { select: { id: true, name: true, email: true, image: true } },
      creator: { select: { id: true, name: true, email: true, image: true } },
      _count: { select: { comments: true } },
    },
  });

  await logActivity(task.id, session.user.id, "created", { title: body.title });
  if (body.assigneeId && body.assigneeId !== session.user.id) {
    await logActivity(task.id, session.user.id, "assigned", { to: body.assigneeId });
    await createNotification(
      body.assigneeId,
      "TASK_ASSIGNED",
      `New task assigned: ${body.title}`,
      `You have been assigned to this task.`,
      { taskId: task.id, projectId: params.projectId }
    );
  }

  // Index for AI search
  await prisma.searchIndex.create({
    data: {
      sourceType: "TASK",
      sourceId: task.id,
      content: [body.title, body.description ?? "", (body.tags ?? []).join(" ")].filter(Boolean).join(" "),
      projectId: params.projectId,
      authorId: session.user.id,
    },
  });

  return NextResponse.json({ ...task, tags: JSON.parse(task.tags) }, { status: 201 });
}
