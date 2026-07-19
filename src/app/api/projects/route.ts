import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg, isOrgError } from "@/lib/org";

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
  const { orgId, userId } = ctx;

  const body = await req.json();
  const project = await prisma.project.create({
    data: {
      name:           body.name,
      description:    body.description,
      status:         body.status ?? "ACTIVE",
      color:          body.color ?? "#7C3AED",
      deadline:       body.deadline ? new Date(body.deadline) : null,
      budget:         body.budget ? parseFloat(body.budget) : null,
      clientName:     body.clientName,
      clientEmail:    body.clientEmail,
      ownerId:        userId,
      organizationId: orgId,
      ...(body.boardConfig ? { boardConfig: body.boardConfig } : {}),
    },
    include: {
      owner: { select: { id: true, name: true, email: true, image: true } },
      _count: { select: { tasks: true } },
    },
  });

  return NextResponse.json(project, { status: 201 });
}
