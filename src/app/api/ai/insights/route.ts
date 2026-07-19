import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg, isOrgError } from "@/lib/org";

export async function GET() {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { userId } = ctx;

  const insights = await prisma.aIInsight.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return NextResponse.json(insights);
}

export async function POST(req: NextRequest) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { userId } = ctx;

  const { content, prompt } = await req.json();

  const insight = await prisma.aIInsight.create({
    data: { userId, content, prompt },
  });

  return NextResponse.json(insight, { status: 201 });
}
