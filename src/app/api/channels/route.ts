import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const channels = await (prisma as any).channel.findMany({
    where: {
      members: { some: { userId: session.user.id } },
    },
    include: {
      _count: { select: { messages: true, members: true } },
      members: { include: { user: { select: { id: true, name: true, image: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(channels);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, description, isPrivate = false, memberIds = [] } = await req.json();

  const channel = await (prisma as any).channel.create({
    data: {
      name,
      description,
      isPrivate,
      members: {
        create: [
          { userId: session.user.id },
          ...memberIds.filter((id: string) => id !== session.user.id).map((id: string) => ({ userId: id })),
        ],
      },
    },
    include: {
      _count: { select: { messages: true, members: true } },
      members: { include: { user: { select: { id: true, name: true, image: true } } } },
    },
  });

  return NextResponse.json(channel, { status: 201 });
}
