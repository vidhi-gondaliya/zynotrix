import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { documentId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const doc = await prisma.document.findUnique({
    where: { id: params.documentId },
    include: {
      author:  { select: { id: true, name: true, image: true } },
      project: { select: { id: true, name: true, color: true } },
    },
  });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(doc);
}

export async function PUT(req: NextRequest, { params }: { params: { documentId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { title, content, projectId, taskId, isPersonal } = body;

  const doc = await (prisma as any).document.update({
    where: { id: params.documentId },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(content !== undefined ? { content } : {}),
      ...(projectId !== undefined ? { projectId: projectId || null } : {}),
      ...(taskId !== undefined ? { taskId: taskId || null } : {}),
      ...(isPersonal !== undefined ? { isPersonal } : {}),
    },
    include: {
      author:  { select: { id: true, name: true, image: true } },
      project: { select: { id: true, name: true, color: true } },
      shares:  { include: { user: { select: { id: true, name: true, image: true, email: true } } } },
    },
  });

  // Update search index
  await prisma.searchIndex.upsert({
    where: { sourceId: doc.id },
    update: { content: `${doc.title} ${doc.content}` },
    create: {
      sourceType: "DOCUMENT",
      sourceId:   doc.id,
      content:    `${doc.title} ${doc.content}`,
      projectId:  doc.projectId,
      authorId:   doc.authorId,
    },
  });

  return NextResponse.json(doc);
}

export async function DELETE(_req: NextRequest, { params }: { params: { documentId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.searchIndex.deleteMany({ where: { sourceId: params.documentId } });
  await prisma.document.delete({ where: { id: params.documentId } });

  return NextResponse.json({ ok: true });
}
