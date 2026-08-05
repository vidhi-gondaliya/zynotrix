import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg, isOrgError } from "@/lib/org";

type Params = { params: { goalId: string } };

export async function GET(_: NextRequest, { params }: Params) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId } = ctx;

  const goal = await (prisma as any).goal.findFirst({
    where: { id: params.goalId, organizationId: orgId },
    include: {
      owner: { select: { id: true, name: true, email: true, image: true } },
      keyResults: { orderBy: { createdAt: "asc" } },
      childGoals: {
        include: {
          owner: { select: { id: true, name: true, image: true } },
          keyResults: true,
        },
      },
    },
  });

  if (!goal) return NextResponse.json({ error: "Goal not found." }, { status: 404 });
  return NextResponse.json(goal);
}

export async function PUT(req: NextRequest, { params }: Params) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId } = ctx;

  const goal = await (prisma as any).goal.findFirst({
    where: { id: params.goalId, organizationId: orgId },
  });
  if (!goal) return NextResponse.json({ error: "Goal not found." }, { status: 404 });

  const body = await req.json();
  const updated = await (prisma as any).goal.update({
    where: { id: params.goalId },
    data: {
      title:       body.title       ?? goal.title,
      description: body.description ?? goal.description,
      type:        body.type        ?? goal.type,
      status:      body.status      ?? goal.status,
      dueDate:     body.dueDate !== undefined
        ? (body.dueDate ? new Date(body.dueDate) : null)
        : goal.dueDate,
    },
    include: {
      owner: { select: { id: true, name: true, email: true, image: true } },
      keyResults: true,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId } = ctx;

  const goal = await (prisma as any).goal.findFirst({
    where: { id: params.goalId, organizationId: orgId },
  });
  if (!goal) return NextResponse.json({ error: "Goal not found." }, { status: 404 });

  await (prisma as any).goal.delete({ where: { id: params.goalId } });
  return NextResponse.json({ success: true });
}
