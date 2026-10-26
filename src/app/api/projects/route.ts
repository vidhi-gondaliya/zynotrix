import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg, isOrgError } from "@/lib/org";
import { hasPermission } from "@/lib/permissions";
import { requireUnderLimit } from "@/lib/plan-gate";

const PROJECT_STATUSES = new Set(["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"]);

export async function GET() {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId } = ctx;

  const projects = await prisma.project.findMany({
    where: { organizationId: orgId, status: { not: "ARCHIVED" }, isPersonal: false },
    include: {
      owner: { select: { id: true, name: true, email: true, image: true } },
      _count: { select: { tasks: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId, userId, orgRole } = ctx;

  if (!hasPermission(orgRole, "projects:create")) {
    return NextResponse.json({ error: "You don't have permission to create projects." }, { status: 403 });
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

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 120) {
    return NextResponse.json({ error: "Project name is required and must be at most 120 characters." }, { status: 400 });
  }

  const description = body.description == null ? null : typeof body.description === "string" ? body.description.trim() : undefined;
  const clientName = body.clientName == null ? null : typeof body.clientName === "string" ? body.clientName.trim() : undefined;
  const clientEmail = body.clientEmail == null ? null : typeof body.clientEmail === "string" ? body.clientEmail.trim().toLowerCase() : undefined;
  if (description === undefined || clientName === undefined || clientEmail === undefined) {
    return NextResponse.json({ error: "Description and client fields must be strings." }, { status: 400 });
  }
  if (description && description.length > 5000) {
    return NextResponse.json({ error: "Description must be at most 5000 characters." }, { status: 400 });
  }
  if (clientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) {
    return NextResponse.json({ error: "Client email is invalid." }, { status: 400 });
  }

  const status = body.status == null ? "ACTIVE" : body.status;
  if (typeof status !== "string" || !PROJECT_STATUSES.has(status) || status === "ARCHIVED") {
    return NextResponse.json({ error: "Project status is invalid." }, { status: 400 });
  }

  const color = body.color == null ? "#7C3AED" : body.color;
  if (typeof color !== "string" || !/^#[0-9a-fA-F]{6}$/.test(color)) {
    return NextResponse.json({ error: "Project color must be a six-digit hex color." }, { status: 400 });
  }

  let deadline: Date | null = null;
  if (body.deadline != null && body.deadline !== "") {
    if (typeof body.deadline !== "string" || !Number.isFinite(Date.parse(body.deadline))) {
      return NextResponse.json({ error: "Project deadline is invalid." }, { status: 400 });
    }
    deadline = new Date(body.deadline);
  }

  let budget: number | null = null;
  if (body.budget != null && body.budget !== "") {
    const parsedBudget = typeof body.budget === "number" ? body.budget : typeof body.budget === "string" ? Number(body.budget) : NaN;
    if (!Number.isFinite(parsedBudget) || parsedBudget < 0 || parsedBudget > 1_000_000_000_000) {
      return NextResponse.json({ error: "Project budget must be a valid non-negative number." }, { status: 400 });
    }
    budget = parsedBudget;
  }

  if (body.boardConfig != null && (typeof body.boardConfig !== "string" || body.boardConfig.length > 20_000)) {
    return NextResponse.json({ error: "Board configuration is invalid or too large." }, { status: 400 });
  }

  const limitErr = await requireUnderLimit(orgId, "projects");
  if (limitErr) return limitErr;

  try {
    const project = await prisma.project.create({
      data: {
        name,
        description,
        status,
        color,
        deadline,
        budget,
        clientName,
        clientEmail,
        ownerId: userId,
        organizationId: orgId,
        ...(typeof body.boardConfig === "string" ? { boardConfig: body.boardConfig } : {}),
      },
      include: {
        owner: { select: { id: true, name: true, email: true, image: true } },
        _count: { select: { tasks: true } },
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unable to create project right now." }, { status: 500 });
  }
}
