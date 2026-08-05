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
  });
  if (!goal) return NextResponse.json({ error: "Goal not found." }, { status: 404 });

  const krs = await (prisma as any).keyResult.findMany({
    where: { goalId: params.goalId },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(krs);
}

export async function POST(req: NextRequest, { params }: Params) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId } = ctx;

  const goal = await (prisma as any).goal.findFirst({
    where: { id: params.goalId, organizationId: orgId },
  });
  if (!goal) return NextResponse.json({ error: "Goal not found." }, { status: 404 });

  const body = await req.json();
  if (!body.title?.trim()) {
    return NextResponse.json({ error: "Key result title is required." }, { status: 400 });
  }

  const kr = await (prisma as any).keyResult.create({
    data: {
      goalId:       params.goalId,
      title:        body.title.trim(),
      unit:         body.unit ?? null,
      targetValue:  body.targetValue  !== undefined ? parseFloat(body.targetValue)  : 100,
      currentValue: body.currentValue !== undefined ? parseFloat(body.currentValue) : 0,
      dueDate:      body.dueDate ? new Date(body.dueDate) : null,
    },
  });
  return NextResponse.json(kr, { status: 201 });
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
  if (!body.id) return NextResponse.json({ error: "Key result id required." }, { status: 400 });

  const updated = await (prisma as any).keyResult.update({
    where: { id: body.id },
    data: {
      title:        body.title        !== undefined ? body.title        : undefined,
      unit:         body.unit         !== undefined ? body.unit         : undefined,
      targetValue:  body.targetValue  !== undefined ? parseFloat(body.targetValue)  : undefined,
      currentValue: body.currentValue !== undefined ? parseFloat(body.currentValue) : undefined,
      dueDate:      body.dueDate      !== undefined
        ? (body.dueDate ? new Date(body.dueDate) : null)
        : undefined,
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId } = ctx;

  const goal = await (prisma as any).goal.findFirst({
    where: { id: params.goalId, organizationId: orgId },
  });
  if (!goal) return NextResponse.json({ error: "Goal not found." }, { status: 404 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Key result id required." }, { status: 400 });

  await (prisma as any).keyResult.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
