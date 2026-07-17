import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: { documentId: string } };

// GET /api/documents/[documentId]/share — list shares
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const shares = await (prisma as any).documentShare.findMany({
    where: { documentId: params.documentId },
    include: { user: { select: { id: true, name: true, image: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(shares);
}

// POST /api/documents/[documentId]/share — add share { userId, role }
export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only the document author can share
  const doc = await prisma.document.findUnique({ where: { id: params.documentId }, select: { authorId: true } });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (doc.authorId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId, role = "VIEWER" } = await req.json();
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
  if (userId === session.user.id) return NextResponse.json({ error: "Cannot share with yourself" }, { status: 400 });

  const share = await (prisma as any).documentShare.upsert({
    where: { documentId_userId: { documentId: params.documentId, userId } },
    update: { role },
    create: { documentId: params.documentId, userId, role },
    include: { user: { select: { id: true, name: true, image: true, email: true } } },
  });

  return NextResponse.json(share, { status: 201 });
}

// DELETE /api/documents/[documentId]/share — remove share { userId }
export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const doc = await prisma.document.findUnique({ where: { id: params.documentId }, select: { authorId: true } });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (doc.authorId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId } = await req.json();
  await (prisma as any).documentShare.deleteMany({
    where: { documentId: params.documentId, userId },
  });

  return NextResponse.json({ success: true });
}
