import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg, isOrgError } from "@/lib/org";

async function workspaceTask(taskId: string, orgId: string) {
  return prisma.task.findFirst({
    where: { id: taskId, project: { organizationId: orgId } },
    select: { id: true, projectId: true },
  });
}

export async function GET(_req: NextRequest, { params }: { params: { taskId: string } }) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  if (!(await workspaceTask(params.taskId, ctx.orgId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const values = await prisma.customFieldValue.findMany({
    where: { taskId: params.taskId, task: { project: { organizationId: ctx.orgId } }, field: { project: { organizationId: ctx.orgId } } },
    include: { field: true },
  });
  return NextResponse.json(values);
}

export async function PUT(req: NextRequest, { params }: { params: { taskId: string } }) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const task = await workspaceTask(params.taskId, ctx.orgId);
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let raw: unknown;
  try { raw = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return NextResponse.json({ error: "Request body must be an object." }, { status: 400 });
  }
  const body = raw as Record<string, unknown>;
  if (typeof body.fieldId !== "string" || !body.fieldId) {
    return NextResponse.json({ error: "fieldId is required." }, { status: 400 });
  }
  if (body.value === undefined || body.value === null || ["object", "function", "symbol"].includes(typeof body.value)) {
    return NextResponse.json({ error: "value must be a scalar." }, { status: 400 });
  }
  const field = await prisma.customField.findFirst({
    where: { id: body.fieldId, projectId: task.projectId, project: { organizationId: ctx.orgId } },
    select: { id: true },
  });
  if (!field) return NextResponse.json({ error: "Custom field not found in this project." }, { status: 404 });

  const value = String(body.value);
  if (value.length > 10000) return NextResponse.json({ error: "Value is too long." }, { status: 400 });
  const saved = await prisma.customFieldValue.upsert({
    where: { fieldId_taskId: { fieldId: field.id, taskId: task.id } },
    update: { value },
    create: { fieldId: field.id, taskId: task.id, value },
    include: { field: true },
  });
  return NextResponse.json(saved);
}
