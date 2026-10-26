import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg, isOrgError } from "@/lib/org";
import { hasPermissionAsync } from "@/lib/permissions";

const PROJECT_STATUSES = new Set(["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"]);

export async function GET(_req: NextRequest, { params }: { params: { projectId: string } }) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId } = ctx;
  const project = await prisma.project.findFirst({
    where: { id: params.projectId, organizationId: orgId },
    include: {
      owner: { select: { id: true, name: true, email: true, image: true } },
      members: { include: { user: { select: { id: true, name: true, email: true, image: true } } } },
      _count: { select: { tasks: true } },
    },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(project);
}

export async function PUT(req: NextRequest, { params }: { params: { projectId: string } }) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId, orgRole } = ctx;
  if (!(await hasPermissionAsync(orgRole, orgId, "projects:edit"))) {
    return NextResponse.json({ error: "You don't have permission to edit projects." }, { status: 403 });
  }

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

  const existing = await prisma.project.findFirst({
    where: { id: params.projectId, organizationId: orgId }, select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) {
    if (typeof body.name !== "string" || !body.name.trim() || body.name.trim().length > 120)
      return NextResponse.json({ error: "Project name must be 1–120 characters." }, { status: 400 });
    data.name = body.name.trim();
  }
  if (body.description !== undefined) {
    if (body.description !== null && (typeof body.description !== "string" || body.description.length > 5000))
      return NextResponse.json({ error: "Description must be at most 5000 characters." }, { status: 400 });
    data.description = body.description;
  }
  if (body.status !== undefined) {
    if (typeof body.status !== "string" || !PROJECT_STATUSES.has(body.status))
      return NextResponse.json({ error: "Invalid project status." }, { status: 400 });
    data.status = body.status;
  }
  if (body.color !== undefined) {
    if (typeof body.color !== "string" || !/^#[0-9a-fA-F]{6}$/.test(body.color))
      return NextResponse.json({ error: "Project color must be a six-digit hex color." }, { status: 400 });
    data.color = body.color;
  }
  if (body.deadline !== undefined) {
    if (body.deadline === null || body.deadline === "") data.deadline = null;
    else if (typeof body.deadline !== "string" || !Number.isFinite(Date.parse(body.deadline)))
      return NextResponse.json({ error: "Invalid project deadline." }, { status: 400 });
    else data.deadline = new Date(body.deadline);
  }
  if (body.budget !== undefined) {
    if (body.budget === null || body.budget === "") data.budget = null;
    else {
      const budget = typeof body.budget === "number" ? body.budget : typeof body.budget === "string" ? Number(body.budget) : NaN;
      if (!Number.isFinite(budget) || budget < 0 || budget > 1_000_000_000_000)
        return NextResponse.json({ error: "Budget must be a valid non-negative number." }, { status: 400 });
      data.budget = budget;
    }
  }
  for (const key of ["clientName", "clientEmail"] as const) {
    if (body[key] !== undefined) {
      if (body[key] !== null && (typeof body[key] !== "string" || body[key].length > 320))
        return NextResponse.json({ error: "Client fields must be strings of at most 320 characters." }, { status: 400 });
      data[key] = key === "clientEmail" && typeof body[key] === "string" ? body[key].trim().toLowerCase() : body[key];
    }
  }
  if (body.boardConfig !== undefined) {
    if (typeof body.boardConfig !== "string" || body.boardConfig.length > 20_000)
      return NextResponse.json({ error: "Board configuration is invalid or too large." }, { status: 400 });
    data.boardConfig = body.boardConfig;
  }

  try {
    const project = await prisma.project.update({
      where: { id: params.projectId, organizationId: orgId },
      data: data as any,
      include: {
        owner: { select: { id: true, name: true, email: true, image: true } },
        _count: { select: { tasks: true } },
      },
    });
    return NextResponse.json(project);
  } catch {
    return NextResponse.json({ error: "Unable to update project right now." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { projectId: string } }) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId, orgRole } = ctx;
  if (!(await hasPermissionAsync(orgRole, orgId, "projects:delete"))) {
    return NextResponse.json({ error: "You don't have permission to delete projects." }, { status: 403 });
  }
  const result = await prisma.project.updateMany({
    where: { id: params.projectId, organizationId: orgId }, data: { status: "ARCHIVED" },
  });
  if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
