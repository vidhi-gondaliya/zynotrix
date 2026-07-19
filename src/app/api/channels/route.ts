import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg, isOrgError } from "@/lib/org";

export async function GET() {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId, userId } = ctx;

  const channels = await (prisma as any).channel.findMany({
    where: {
      organizationId: orgId,
      members: { some: { userId } },
    },
    include: {
      _count:  { select: { messages: true, members: true } },
      members: { include: { user: { select: { id: true, name: true, image: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(channels);
}

export async function POST(req: NextRequest) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId, userId } = ctx;

  const { name, description, isPrivate = false, memberIds = [] } = await req.json();

  const channel = await (prisma as any).channel.create({
    data: {
      name,
      description,
      isPrivate,
      organizationId: orgId,
      members: {
        create: [
          { userId },
          ...memberIds.filter((id: string) => id !== userId).map((id: string) => ({ userId: id })),
        ],
      },
    },
    include: {
      _count:  { select: { messages: true, members: true } },
      members: { include: { user: { select: { id: true, name: true, image: true } } } },
    },
  });

  return NextResponse.json(channel, { status: 201 });
}
