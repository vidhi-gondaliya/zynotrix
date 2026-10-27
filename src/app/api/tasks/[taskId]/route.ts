import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { awardPoints } from "@/lib/rewards";
import { logActivity } from "@/lib/task-activity";
import { notifySlackForTaskEvent } from "@/lib/integrations/slack";
import { requireOrg, isOrgError } from "@/lib/org";
import { runAutomations } from "@/lib/automations";

function safeTags(value: string): unknown[] { try { const parsed: unknown = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch { return []; } }

export async function GET(_req: NextRequest, { params }: { params: { taskId: string } }) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId } = ctx;

  const task = await prisma.task.findFirst({
    where: { id: params.taskId, project: { organizationId: orgId } },
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
  return NextResponse.json({ ...task, tags: safeTags(task.tags) });
}

export async function PUT(req: NextRequest, { params }: { params: { taskId: string } }) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId, userId } = ctx;

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await req.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return NextResponse.json({ error: "Request body must be a JSON object." }, { status: 400 });
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  if (body.title !== undefined && (typeof body.title !== "string" || !body.title.trim() || body.title.length > 300)) {
    return NextResponse.json({ error: "Task title is required and must be at most 300 characters." }, { status: 400 });
  }
  if (body.description !== undefined && body.description !== null && (typeof body.description !== "string" || body.description.length > 10000)) {
    return NextResponse.json({ error: "Task description must be at most 10000 characters." }, { status: 400 });
  }
  if (body.status !== undefined && (typeof body.status !== "string" || !["BACKLOG", "TODO", "IN_PROGRESS", "REVIEW", "DONE", "ARCHIVED"].includes(body.status))) {
    return NextResponse.json({ error: "Invalid task status." }, { status: 400 });
  }
  if (body.priority !== undefined && (typeof body.priority !== "string" || !["LOW", "MEDIUM", "HIGH", "URGENT"].includes(body.priority))) {
    return NextResponse.json({ error: "Invalid task priority." }, { status: 400 });
  }
  if (body.dueDate !== undefined && body.dueDate !== null && body.dueDate !== "" && (typeof body.dueDate !== "string" || !Number.isFinite(Date.parse(body.dueDate)))) {
    return NextResponse.json({ error: "Invalid due date." }, { status: 400 });
  }
  if (body.estimatedHours !== undefined && body.estimatedHours !== null && body.estimatedHours !== "") {
    const hours = typeof body.estimatedHours === "number" ? body.estimatedHours : typeof body.estimatedHours === "string" ? Number(body.estimatedHours) : NaN;
    if (!Number.isFinite(hours) || hours < 0 || hours > 100000) {
      return NextResponse.json({ error: "Estimated hours must be a non-negative number." }, { status: 400 });
    }
    body.estimatedHours = hours;
  }
  if (body.tags !== undefined && (!Array.isArray(body.tags) || body.tags.length > 100 || body.tags.some((tag) => typeof tag !== "string" || tag.length > 100))) {
    return NextResponse.json({ error: "Tags must be an array of at most 100 strings." }, { status: 400 });
  }

  const existing = await prisma.task.findFirst({
    where: { id: params.taskId, project: { organizationId: orgId } },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (body.assigneeId !== undefined && body.assigneeId !== null && body.assigneeId !== "") {
    if (typeof body.assigneeId !== "string" || body.assigneeId.length > 128) {
      return NextResponse.json({ error: "Invalid assignee." }, { status: 400 });
    }
    const membership = await prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId: body.assigneeId } },
      select: { userId: true },
    });
    if (!membership) return NextResponse.json({ error: "Assignee must be a member of this workspace." }, { status: 400 });
  }

  const task = await prisma.task.update({
    where: { id: params.taskId },
    data: {
      title: body.title,
      description: body.description,
      status: body.status,
      priority: body.priority,
      assigneeId: body.assigneeId !== undefined ? body.assigneeId || null : undefined,
      dueDate: body.dueDate !== undefined ? (body.dueDate ? new Date(body.dueDate) : null) : undefined,
      estimatedHours: body.estimatedHours !== undefined
        ? (body.estimatedHours === null || body.estimatedHours === "" ? null : Number(body.estimatedHours))
        : undefined,
      tags: body.tags !== undefined ? JSON.stringify(body.tags) : undefined,
    },
    include: {
      assignee: { select: { id: true, name: true, email: true, image: true } },
      creator: { select: { id: true, name: true, email: true, image: true } },
      project: { select: { id: true, name: true } },
      _count: { select: { comments: true } },
    },
  });

  if (body.status && body.status !== existing.status) {
    await logActivity(params.taskId, userId, "status_changed", { from: existing.status, to: body.status });
    runAutomations(orgId, "task_status_changed", {
      taskId: params.taskId,
      task: task as Record<string, unknown>,
      fromStatus: existing.status,
      toStatus: body.status,
    }).catch(() => {});
  }
  if (body.priority && body.priority !== existing.priority) {
    await logActivity(params.taskId, userId, "priority_changed", { from: existing.priority, to: body.priority });
  }
  if (body.assigneeId !== undefined && body.assigneeId !== existing.assigneeId) {
    await logActivity(params.taskId, userId, body.assigneeId ? "assigned" : "unassigned", { to: body.assigneeId ?? null });
  }
  if (body.dueDate !== undefined && body.dueDate !== existing.dueDate?.toISOString().split("T")[0]) {
    await logActivity(params.taskId, userId, "due_date_changed", { to: body.dueDate ?? null });
  }
  if (body.title && body.title !== existing.title) {
    await logActivity(params.taskId, userId, "title_changed", { from: existing.title, to: body.title });
  }

  const projectName = task.project?.name ?? "Unknown Project";
  const assigneeName = task.assignee?.name ?? undefined;

  if (body.status === "DONE" && existing.status !== "DONE") {
    notifySlackForTaskEvent(userId, "done", task, projectName, assigneeName).catch(() => {});
  }
  if (body.priority === "URGENT" && existing.priority !== "URGENT") {
    notifySlackForTaskEvent(userId, "urgent", task, projectName, assigneeName).catch(() => {});
  }
  if (body.assigneeId && body.assigneeId !== existing.assigneeId) {
    notifySlackForTaskEvent(body.assigneeId, "assigned", task, projectName, ctx.userName ?? undefined).catch(() => {});
  }

  const justCompleted = body.status === "DONE" && existing.status !== "DONE";
  if (justCompleted) {
    const recipientId = task.assignee?.id ?? userId;
    const recipient = await prisma.user.findUnique({ where: { id: recipientId }, select: { role: true } });
    if (recipient) {
      const isEarly = task.dueDate && new Date(task.dueDate) > new Date();
      await awardPoints(recipientId, recipient.role, "task_complete", { taskId: task.id });
      if (isEarly) await awardPoints(recipientId, recipient.role, "task_early", { taskId: task.id });
    }
  }

  if (body.assigneeId && body.assigneeId !== existing.assigneeId && body.assigneeId !== userId) {
    await createNotification(body.assigneeId, "TASK_ASSIGNED", `Task assigned: ${task.title}`, undefined, { taskId: task.id });
  }

  if (body.title !== undefined || body.description !== undefined || body.tags !== undefined) {
    await prisma.searchIndex.upsert({
      where: { sourceId: params.taskId },
      update: { content: [task.title, task.description ?? "", safeTags(task.tags).join(" ")].filter(Boolean).join(" ") },
      create: {
        sourceType: "TASK",
        sourceId: task.id,
        content: [task.title, task.description ?? "", safeTags(task.tags).join(" ")].filter(Boolean).join(" "),
        projectId: task.projectId,
        authorId: userId,
        organizationId: orgId,
      },
    });
  }

  return NextResponse.json({ ...task, tags: safeTags(task.tags) });
}

export async function DELETE(_req: NextRequest, { params }: { params: { taskId: string } }) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId } = ctx;

  const existing = await prisma.task.findFirst({
    where: { id: params.taskId, project: { organizationId: orgId } },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.task.delete({ where: { id: params.taskId } });
  return NextResponse.json({ success: true });
}
