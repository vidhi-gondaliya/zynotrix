import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg, isOrgError } from "@/lib/org";
import { createNotification } from "@/lib/notifications";
import { logActivity } from "@/lib/task-activity";
import { runAutomations } from "@/lib/automations";

const TASK_STATUSES = ["BACKLOG", "TODO", "IN_PROGRESS", "REVIEW", "DONE", "ARCHIVED"] as const;
const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

function safeTags(value: string): unknown[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function getWorkspaceProject(projectId: string, orgId: string) {
  return prisma.project.findFirst({
    where: { id: projectId, organizationId: orgId, isPersonal: false },
    select: { id: true, name: true, organizationId: true },
  });
}

export async function GET(req: NextRequest, { params }: { params: { projectId: string } }) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;

  const project = await getWorkspaceProject(params.projectId, ctx.orgId);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  if (status && !(TASK_STATUSES as readonly string[]).includes(status)) {
    return NextResponse.json({ error: "Invalid task status." }, { status: 400 });
  }

  try {
    const tasks = await prisma.task.findMany({
      where: { projectId: project.id, ...(status ? { status: status as never } : {}) },
      include: {
        assignee: { select: { id: true, name: true, email: true, image: true } },
        creator: { select: { id: true, name: true, email: true, image: true } },
        _count: { select: { comments: true } },
      },
      orderBy: [{ status: "asc" }, { position: "asc" }],
    });
    return NextResponse.json(tasks.map((task) => ({ ...task, tags: safeTags(task.tags) })));
  } catch {
    return NextResponse.json({ error: "Unable to load project tasks right now." }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { projectId: string } }) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;

  const project = await getWorkspaceProject(params.projectId, ctx.orgId);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Request body must be a JSON object." }, { status: 400 });
  }
  const input = body as Record<string, unknown>;
  const title = typeof input.title === "string" ? input.title.trim() : "";
  if (!title || title.length > 300) {
    return NextResponse.json({ error: "Task title is required and must be at most 300 characters." }, { status: 400 });
  }
  const description = input.description == null ? null : input.description;
  if (description !== null && (typeof description !== "string" || description.length > 10000)) {
    return NextResponse.json({ error: "Task description must be at most 10000 characters." }, { status: 400 });
  }
  const status = input.status == null ? "BACKLOG" : input.status;
  const priority = input.priority == null ? "MEDIUM" : input.priority;
  if (typeof status !== "string" || !(TASK_STATUSES as readonly string[]).includes(status)) {
    return NextResponse.json({ error: "Invalid task status." }, { status: 400 });
  }
  if (typeof priority !== "string" || !(TASK_PRIORITIES as readonly string[]).includes(priority)) {
    return NextResponse.json({ error: "Invalid task priority." }, { status: 400 });
  }
  if (input.tags !== undefined && (!Array.isArray(input.tags) || input.tags.length > 100 || input.tags.some((tag) => typeof tag !== "string" || tag.length > 100))) {
    return NextResponse.json({ error: "Tags must be an array of at most 100 strings." }, { status: 400 });
  }
  if (input.assigneeId != null && input.assigneeId !== "") {
    if (typeof input.assigneeId !== "string" || input.assigneeId.length > 128) {
      return NextResponse.json({ error: "Invalid assignee." }, { status: 400 });
    }
    const member = await prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: ctx.orgId, userId: input.assigneeId } },
      select: { userId: true },
    });
    if (!member) return NextResponse.json({ error: "Assignee must be a member of this workspace." }, { status: 400 });
  }
  let dueDate: Date | null = null;
  if (input.dueDate != null && input.dueDate !== "") {
    if (typeof input.dueDate !== "string" || !Number.isFinite(Date.parse(input.dueDate))) {
      return NextResponse.json({ error: "Invalid due date." }, { status: 400 });
    }
    dueDate = new Date(input.dueDate);
  }
  let estimatedHours: number | null = null;
  if (input.estimatedHours != null && input.estimatedHours !== "") {
    const parsed = typeof input.estimatedHours === "number" ? input.estimatedHours : typeof input.estimatedHours === "string" ? Number(input.estimatedHours) : NaN;
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100000) {
      return NextResponse.json({ error: "Estimated hours must be a non-negative number." }, { status: 400 });
    }
    estimatedHours = parsed;
  }

  try {
    const task = await prisma.$transaction(async (tx) => {
      const maxPos = await tx.task.aggregate({
        where: { projectId: project.id, status },
        _max: { position: true },
      });
      return tx.task.create({
        data: {
          projectId: project.id,
          title,
          description,
          status: status as never,
          priority: priority as never,
          position: (maxPos._max.position ?? 0) + 1,
          assigneeId: typeof input.assigneeId === "string" && input.assigneeId ? input.assigneeId : null,
          creatorId: ctx.userId,
          dueDate,
          estimatedHours,
          tags: JSON.stringify(input.tags ?? []),
        },
        include: {
          assignee: { select: { id: true, name: true, email: true, image: true } },
          creator: { select: { id: true, name: true, email: true, image: true } },
          _count: { select: { comments: true } },
        },
      });
    });

    await logActivity(task.id, ctx.userId, "created", { title });
    if (task.assigneeId && task.assigneeId !== ctx.userId) {
      await logActivity(task.id, ctx.userId, "assigned", { to: task.assigneeId });
      await createNotification(
        task.assigneeId,
        "TASK_ASSIGNED",
        `New task assigned: ${task.title}`,
        "You have been assigned to this task.",
        { taskId: task.id, projectId: project.id }
      );
    }

    await prisma.searchIndex.upsert({
      where: { sourceId: task.id },
      update: {
        content: [title, typeof description === "string" ? description : "", (Array.isArray(input.tags) ? input.tags : []).join(" ")].filter(Boolean).join(" "),
        organizationId: ctx.orgId,
      },
      create: {
        sourceType: "TASK",
        sourceId: task.id,
        content: [title, typeof description === "string" ? description : "", (Array.isArray(input.tags) ? input.tags : []).join(" ")].filter(Boolean).join(" "),
        projectId: project.id,
        authorId: ctx.userId,
        organizationId: ctx.orgId,
      },
    });

    runAutomations(ctx.orgId, "task_created", {
      taskId: task.id,
      task: task as Record<string, unknown>,
      projectId: project.id,
    }).catch(() => {});

    return NextResponse.json({ ...task, tags: safeTags(task.tags) }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unable to create task right now." }, { status: 500 });
  }
}
