import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const USER_SELECT = { id: true, name: true, email: true, image: true, role: true, createdAt: true };

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const convs = await prisma.conversation.findMany({
    where: {
      OR: [{ user1Id: session.user.id }, { user2Id: session.user.id }],
    },
    include: {
      user1: { select: USER_SELECT },
      user2: { select: USER_SELECT },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { content: true, createdAt: true, senderId: true, isRead: true },
      },
    },
    orderBy: { lastMessageAt: "desc" },
  });

  return NextResponse.json(convs);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { targetUserId } = await req.json();
  if (!targetUserId || targetUserId === session.user.id) {
    return NextResponse.json({ error: "Invalid target user" }, { status: 400 });
  }

  const [u1, u2] = [session.user.id, targetUserId].sort();

  const conv = await prisma.conversation.upsert({
    where: { user1Id_user2Id: { user1Id: u1, user2Id: u2 } },
    update: {},
    create: { user1Id: u1, user2Id: u2 },
    include: { user1: { select: USER_SELECT }, user2: { select: USER_SELECT } },
  });

  return NextResponse.json(conv);
}
