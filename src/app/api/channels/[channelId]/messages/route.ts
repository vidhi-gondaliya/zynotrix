import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { broadcastToChannel } from "@/lib/sse";

export async function GET(req: NextRequest, { params }: { params: { channelId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor");
  const limit = 50;

  const messages = await prisma.message.findMany({
    where: { channelId: params.channelId },
    include: { author: { select: { id: true, name: true, email: true, image: true } } },
    orderBy: { createdAt: "asc" },
    take: limit,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  return NextResponse.json(messages);
}

export async function POST(req: NextRequest, { params }: { params: { channelId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { content, type } = await req.json();

  const message = await prisma.message.create({
    data: {
      channelId: params.channelId,
      authorId: session.user.id,
      content,
      type: type ?? "TEXT",
    },
    include: { author: { select: { id: true, name: true, email: true, image: true } } },
  });

  // Index for AI search
  await prisma.searchIndex.create({
    data: {
      sourceType: "MESSAGE",
      sourceId: message.id,
      content: message.content,
      authorId: session.user.id,
    },
  });

  broadcastToChannel(params.channelId, { type: "message", payload: message });

  return NextResponse.json(message, { status: 201 });
}
