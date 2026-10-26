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
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

export async function GET(_req: NextRequest, { params }: { params: { taskId: string } }) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  if (!(await workspaceTask(params.taskId, ctx.orgId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const links = await prisma.taskLink.findMany({
    where: { taskId: params.taskId, task: { project: { organizationId: ctx.orgId } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(links);
}

export async function POST(req: NextRequest, { params }: { params: { taskId: string } }) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  if (!(await workspaceTask(params.taskId, ctx.orgId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  let raw: unknown;
  try { raw = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }
  const body = parseBody(raw);
  const type = body?.type;
  const url = body?.url;
  const externalId = body?.externalId;
  const title = body?.title;
  if (typeof type !== "string" || !type || type.length > 80 ||
      typeof url !== "string" || url.length > 2048) {
    return NextResponse.json({ error: "Valid type and URL are required." }, { status: 400 });
  }
  let parsedUrl: URL;
  try { parsedUrl = new URL(url); } catch {
    return NextResponse.json({ error: "URL is invalid." }, { status: 400 });
  }
  if (!["https:", "http:"].includes(parsedUrl.protocol)) {
    return NextResponse.json({ error: "Only HTTP(S) URLs are allowed." }, { status: 400 });
  }
  if (externalId !== undefined && externalId !== null && typeof externalId !== "string") {
    return NextResponse.json({ error: "externalId must be a string." }, { status: 400 });
  }
  if (title !== undefined && title !== null && typeof title !== "string") {
    return NextResponse.json({ error: "title must be a string." }, { status: 400 });
  }
  const key = (typeof externalId === "string" && externalId) ? externalId : url;
  const link = await prisma.taskLink.upsert({
    where: { taskId_type_externalId: { taskId: params.taskId, type, externalId: key } },
    update: { url, title: typeof title === "string" ? title.slice(0, 500) : null },
    create: { taskId: params.taskId, type, externalId: key, url, title: typeof title === "string" ? title.slice(0, 500) : null },
  });
  return NextResponse.json(link, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: { taskId: string } }) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  if (!(await workspaceTask(params.taskId, ctx.orgId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  let raw: unknown;
  try { raw = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }
  const linkId = parseBody(raw)?.linkId;
  if (typeof linkId !== "string" || !linkId) {
    return NextResponse.json({ error: "linkId is required." }, { status: 400 });
  }
  const link = await prisma.taskLink.findFirst({
    where: { id: linkId, taskId: params.taskId, task: { project: { organizationId: ctx.orgId } } },
  });
  if (!link) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.taskLink.delete({ where: { id: link.id } });
  return NextResponse.json({ ok: true });
}
