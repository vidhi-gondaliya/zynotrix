import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dmSubscribers } from "@/lib/dm-sse";

export async function GET(req: NextRequest, { params }: { params: { conversationId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor");
  const limit  = 50;

  const messages = await prisma.directMessage.findMany({
    where: { conversationId: params.conversationId },
    include: { sender: { select: { id: true, name: true, image: true, email: true, role: true, createdAt: true } } },
    orderBy: { createdAt: "asc" },
    take: limit,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  // Mark messages as read
  await prisma.directMessage.updateMany({
    where: {
      conversationId: params.conversationId,
      senderId: { not: session.user.id },
      isRead: false,
    },
    data: { isRead: true },
  });

  return NextResponse.json(messages);
}

export async function POST(req: NextRequest, { params }: { params: { conversationId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { content } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "Content required" }, { status: 400 });

  const [message] = await prisma.$transaction([
    prisma.directMessage.create({
      data: { conversationId: params.conversationId, senderId: session.user.id, content: content.trim() },
      include: { sender: { select: { id: true, name: true, image: true, email: true, role: true, createdAt: true } } },
    }),
    prisma.conversation.update({
      where: { id: params.conversationId },
      data: { lastMessage: content.trim(), lastMessageAt: new Date() },
    }),
  ]);

  // Broadcast to SSE subscribers
  const subs = dmSubscribers.get(params.conversationId);
  if (subs) {
    const payload = `data: ${JSON.stringify(message)}\n\n`;
    subs.forEach((ctrl) => { try { ctrl.enqueue(payload); } catch { subs.delete(ctrl); } });
  }

  return NextResponse.json(message, { status: 201 });
}
