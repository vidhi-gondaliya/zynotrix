import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { awardPoints } from "@/lib/rewards";
import { logActivity } from "@/lib/task-activity";
import { notifySlackForTaskEvent } from "@/lib/integrations/slack";

export async function GET(_req: NextRequest, { params }: { params: { taskId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const task = await prisma.task.findUnique({
    where: { id: params.taskId },
    include: {
      assignee: { select: { id: true, name: true, email: true, image: true } },
      creator: { select: { id: true, name: true, email: true, image: true } },
      project: true,
      comments: {
        include: { author: { select: { id: true, name: true, email: true, image: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ...task, tags: JSON.parse(task.tags) });
}

export async function PUT(req: NextRequest, { params }: { params: { taskId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const existing = await prisma.task.findUnique({ where: { id: params.taskId } });

  const task = await prisma.task.update({
    where: { id: params.taskId },
    data: {
      title: body.title,
      description: body.description,
      status: body.status,
      priority: body.priority,
      assigneeId: body.assigneeId !== undefined ? body.assigneeId || null : undefined,
      dueDate: body.dueDate !== undefined ? (body.dueDate ? new Date(body.dueDate) : null) : undefined,
      estimatedHours: body.estimatedHours !== undefined ? (body.estimatedHours ? parseFloat(body.estimatedHours) : null) : undefined,
      tags: body.tags !== undefined ? JSON.stringify(body.tags) : undefined,
    },
    include: {
      assignee: { select: { id: true, name: true, email: true, image: true } },
      creator: { select: { id: true, name: true, email: true, image: true } },
      project: { select: { id: true, name: true } },
      _count: { select: { comments: true } },
    },
  });

  // Log activity for significant changes
  if (existing) {
    if (body.status && body.status !== existing.status) {
      await logActivity(params.taskId, session.user.id, "status_changed", { from: existing.status, to: body.status });
    }
    if (body.priority && body.priority !== existing.priority) {
      await logActivity(params.taskId, session.user.id, "priority_changed", { from: existing.priority, to: body.priority });
    }
    if (body.assigneeId !== undefined && body.assigneeId !== existing.assigneeId) {
      await logActivity(params.taskId, session.user.id, body.assigneeId ? "assigned" : "unassigned", { to: body.assigneeId ?? null });
    }
    if (body.dueDate !== undefined && body.dueDate !== existing.dueDate?.toISOString().split("T")[0]) {
      await logActivity(params.taskId, session.user.id, "due_date_changed", { to: body.dueDate ?? null });
    }
    if (body.title && body.title !== existing.title) {
      await logActivity(params.taskId, session.user.id, "title_changed", { from: existing.title, to: body.title });
    }
  }

  // Fire Slack notifications for significant events (non-blocking)
  if (existing) {
    const projectName = task.project?.name ?? "Unknown Project";
    const assigneeName = task.assignee?.name ?? undefined;

    if (body.status === "DONE" && existing.status !== "DONE") {
      notifySlackForTaskEvent(session.user.id, "done", task, projectName, assigneeName).catch(() => {});
    }
    if (body.priority === "URGENT" && existing.priority !== "URGENT") {
      notifySlackForTaskEvent(session.user.id, "urgent", task, projectName, assigneeName).catch(() => {});
    }
    if (body.assigneeId && body.assigneeId !== existing.assigneeId) {
      notifySlackForTaskEvent(body.assigneeId, "assigned", task, projectName, session.user.name ?? undefined).catch(() => {});
    }
  }

  // Award points when task is marked DONE (only to the assignee, not owner role)
  const justCompleted = body.status === "DONE" && existing?.status !== "DONE";
  if (justCompleted) {
    const recipientId = task.assignee?.id ?? session.user.id;
    const recipient = await prisma.user.findUnique({ where: { id: recipientId }, select: { role: true } });
    if (recipient) {
      const isEarly = task.dueDate && new Date(task.dueDate) > new Date();
      await awardPoints(recipientId, recipient.role, "task_complete", { taskId: task.id });
      if (isEarly) await awardPoints(recipientId, recipient.role, "task_early", { taskId: task.id });
    }
  }

  if (body.assigneeId && body.assigneeId !== existing?.assigneeId && body.assigneeId !== session.user.id) {
    await createNotification(
      body.assigneeId,
      "TASK_ASSIGNED",
      `Task assigned: ${task.title}`,
      undefined,
      { taskId: task.id }
    );
  }

  // Keep search index in sync
  if (body.title !== undefined || body.description !== undefined || body.tags !== undefined) {
    await prisma.searchIndex.upsert({
      where: { sourceId: params.taskId },
      update: { content: [task.title, task.description ?? "", JSON.parse(task.tags).join(" ")].filter(Boolean).join(" ") },
      create: {
        sourceType: "TASK",
        sourceId: task.id,
        content: [task.title, task.description ?? "", JSON.parse(task.tags).join(" ")].filter(Boolean).join(" "),
        projectId: task.projectId,
        authorId: session.user.id,
      },
    });
  }

  return NextResponse.json({ ...task, tags: JSON.parse(task.tags) });
}

export async function DELETE(_req: NextRequest, { params }: { params: { taskId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.task.delete({ where: { id: params.taskId } });
  return NextResponse.json({ success: true });
}
