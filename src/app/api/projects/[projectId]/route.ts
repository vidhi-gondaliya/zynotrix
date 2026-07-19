import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg, isOrgError } from "@/lib/org";

export async function GET(_req: NextRequest, { params }: { params: { projectId: string } }) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId } = ctx;

  const project = await prisma.project.findUnique({
    where: { id: params.projectId, organizationId: orgId },
    include: {
      owner:   { select: { id: true, name: true, email: true, image: true } },
      members: { include: { user: { select: { id: true, name: true, email: true, image: true } } } },
      _count:  { select: { tasks: true } },
    },
  });

  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(project);
}

export async function PUT(req: NextRequest, { params }: { params: { projectId: string } }) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId } = ctx;

  const body = await req.json();
  const project = await prisma.project.update({
    where:  { id: params.projectId, organizationId: orgId },
    data: {
      name:        body.name,
      description: body.description,
      status:      body.status,
      color:       body.color,
      deadline:    body.deadline ? new Date(body.deadline) : undefined,
      budget:      body.budget !== undefined ? parseFloat(body.budget) : undefined,
      clientName:  body.clientName,
      clientEmail: body.clientEmail,
      ...(body.boardConfig !== undefined && { boardConfig: body.boardConfig }),
    },
    include: {
      owner:  { select: { id: true, name: true, email: true, image: true } },
      _count: { select: { tasks: true } },
    },
  });

  return NextResponse.json(project);
}

export async function DELETE(_req: NextRequest, { params }: { params: { projectId: string } }) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId } = ctx;

  await prisma.project.update({
    where: { id: params.projectId, organizationId: orgId },
    data:  { status: "ARCHIVED" },
  });

  return NextResponse.json({ success: true });
}
