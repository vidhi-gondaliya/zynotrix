import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg, isOrgError } from "@/lib/org";

export async function GET() {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId } = ctx;

  const goals = await (prisma as any).goal.findMany({
    where: { organizationId: orgId, status: { not: "ARCHIVED" } },
    include: {
      owner: { select: { id: true, name: true, email: true, image: true } },
      keyResults: true,
      _count: { select: { keyResults: true, childGoals: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(goals);
}

export async function POST(req: NextRequest) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId, userId } = ctx;

  const body = await req.json();
  if (!body.title?.trim()) {
    return NextResponse.json({ error: "Goal title is required." }, { status: 400 });
  }

  const goal = await (prisma as any).goal.create({
    data: {
      organizationId: orgId,
      ownerId:        userId,
      title:          body.title.trim(),
      description:    body.description ?? null,
      type:           body.type ?? "COMPANY",
      status:         body.status ?? "ON_TRACK",
      dueDate:        body.dueDate ? new Date(body.dueDate) : null,
      parentGoalId:   body.parentGoalId ?? null,
    },
    include: {
      owner: { select: { id: true, name: true, email: true, image: true } },
      keyResults: true,
      _count: { select: { keyResults: true, childGoals: true } },
    },
  });

  return NextResponse.json(goal, { status: 201 });
}
