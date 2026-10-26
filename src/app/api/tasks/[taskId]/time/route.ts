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
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

export async function GET(_req: NextRequest, { params }: { params: { taskId: string } }) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  if (!(await workspaceTask(params.taskId, ctx.orgId))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const logs = await (prisma as any).timeLog.findMany({
    where: { taskId: params.taskId, task: { project: { organizationId: ctx.orgId } } },
    include: { user: { select: { id: true, name: true, image: true } } },
    orderBy: { startedAt: "desc" },
  });
  const totalMinutes = logs.reduce((sum: number, log: any) => sum + (log.duration ?? 0), 0);
  return NextResponse.json({ logs, totalMinutes });
}

export async function POST(req: NextRequest, { params }: { params: { taskId: string } }) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  if (!(await workspaceTask(params.taskId, ctx.orgId))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  let raw: unknown;
  try { raw = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }
  const body = parseBody(raw);
  if (!body || typeof body.action !== "string") return NextResponse.json({ error: "Invalid request body." }, { status: 400 });

  if (body.action === "log") {
    const duration = body.durationMinutes == null || body.durationMinutes === "" ? null : Number(body.durationMinutes);
    if (duration !== null && (!Number.isFinite(duration) || duration <= 0 || duration > 1000000)) {
      return NextResponse.json({ error: "Duration must be a positive number of minutes." }, { status: 400 });
    }
    if (body.description != null && (typeof body.description !== "string" || body.description.length > 2000)) {
      return NextResponse.json({ error: "Description must be at most 2000 characters." }, { status: 400 });
    }
    const startedAt = body.startedAt == null || body.startedAt === "" ? new Date() : new Date(String(body.startedAt));
    const endedAt = body.endedAt == null || body.endedAt === "" ? null : new Date(String(body.endedAt));
    if (!Number.isFinite(startedAt.getTime()) || (endedAt && !Number.isFinite(endedAt.getTime())) || (endedAt && endedAt < startedAt)) {
      return NextResponse.json({ error: "Invalid time range." }, { status: 400 });
    }
    const log = await (prisma as any).timeLog.create({
      data: { taskId: params.taskId, userId: ctx.userId, startedAt, endedAt, duration: duration === null ? null : Math.round(duration), description: body.description ?? null },
      include: { user: { select: { id: true, name: true, image: true } } },
    });
    if (duration !== null) {
      await (prisma as any).task.update({ where: { id: params.taskId }, data: { timeSpentMin: { increment: Math.round(duration) } } });
    }
    return NextResponse.json(log, { status: 201 });
  }

  if (body.action === "stop") {
    if (typeof body.logId !== "string" || !body.logId) return NextResponse.json({ error: "logId is required." }, { status: 400 });
    const existing = await (prisma as any).timeLog.findFirst({
      where: { id: body.logId, taskId: params.taskId, task: { project: { organizationId: ctx.orgId } } },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (existing.userId !== ctx.userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (existing.endedAt) return NextResponse.json({ error: "Time log is already stopped." }, { status: 409 });
    const end = new Date();
    const duration = Math.max(0, Math.round((end.getTime() - new Date(existing.startedAt).getTime()) / 60000));
    const log = await (prisma as any).timeLog.update({ where: { id: existing.id }, data: { endedAt: end, duration }, include: { user: { select: { id: true, name: true, image: true } } } });
    if (duration) await (prisma as any).task.update({ where: { id: params.taskId }, data: { timeSpentMin: { increment: duration } } });
    return NextResponse.json(log);
  }
  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}

export async function DELETE(req: NextRequest, { params }: { params: { taskId: string } }) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  if (!(await workspaceTask(params.taskId, ctx.orgId))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  let raw: unknown;
  try { raw = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }
  const body = parseBody(raw);
  if (typeof body?.logId !== "string" || !body.logId) return NextResponse.json({ error: "logId is required." }, { status: 400 });
  const log = await (prisma as any).timeLog.findFirst({
    where: { id: body.logId, taskId: params.taskId, task: { project: { organizationId: ctx.orgId } } },
  });
  if (!log) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (log.userId !== ctx.userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await (prisma as any).timeLog.delete({ where: { id: log.id } });
  if (log.duration) await (prisma as any).task.update({ where: { id: params.taskId }, data: { timeSpentMin: { decrement: log.duration } } });
  return NextResponse.json({ ok: true });
}
