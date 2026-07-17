import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: { channelId: string } };

// POST — add member { userId }
export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Must be a member of the channel to add others
  const isMember = await prisma.channelMember.findUnique({
    where: { channelId_userId: { channelId: params.channelId, userId: session.user.id } },
  });
  if (!isMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const member = await prisma.channelMember.upsert({
    where: { channelId_userId: { channelId: params.channelId, userId } },
    update: {},
    create: { channelId: params.channelId, userId },
  });

  return NextResponse.json(member, { status: 201 });
}

// DELETE — remove member { userId }
export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  // Can remove yourself, or a member removes another (channel admin logic simplified)
  await prisma.channelMember.delete({
    where: { channelId_userId: { channelId: params.channelId, userId } },
  });

  return NextResponse.json({ success: true });
}
