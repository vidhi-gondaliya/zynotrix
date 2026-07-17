import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const baseInclude = {
  author:  { select: { id: true, name: true, image: true } },
  project: { select: { id: true, name: true, color: true } },
};

const fullInclude = {
  ...baseInclude,
  shares: { include: { user: { select: { id: true, name: true, image: true, email: true } } } },
};

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");

  let where: Record<string, unknown>;
  if (projectId) {
    where = { projectId };
  } else {
    // graceful fallback if documentShare model not yet in generated client
    let sharedDocIds: string[] = [];
    try {
      const sharedItems = await (prisma as any).documentShare.findMany({
        where: { userId: session.user.id },
        select: { documentId: true },
      });
      sharedDocIds = sharedItems.map((s: { documentId: string }) => s.documentId);
    } catch {}
    where = { OR: [{ authorId: session.user.id }, ...(sharedDocIds.length > 0 ? [{ id: { in: sharedDocIds } }] : [])] };
  }

  // try with shares include first, fall back to base include
  try {
    const docs = await (prisma as any).document.findMany({ where, include: fullInclude, orderBy: { updatedAt: "desc" } });
    return NextResponse.json(docs);
  } catch {
    const docs = await prisma.document.findMany({ where, include: baseInclude, orderBy: { updatedAt: "desc" } });
    return NextResponse.json(docs);
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, content = "", projectId, taskId, isPersonal = false } = await req.json();
  if (!title?.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 });

  let doc: any;
  try {
    // try with new fields (only works after prisma generate)
    doc = await (prisma as any).document.create({
      data: { title: title.trim(), content, projectId: projectId || null, taskId: taskId || null, isPersonal, authorId: session.user.id },
      include: fullInclude,
    });
  } catch {
    // fallback: create without new fields (before prisma generate)
    doc = await prisma.document.create({
      data: { title: title.trim(), content, projectId: projectId || null, authorId: session.user.id },
      include: baseInclude,
    });
  }

  try {
    await prisma.searchIndex.upsert({
      where:  { sourceId: doc.id },
      update: { content: `${doc.title} ${doc.content}` },
      create: { sourceType: "DOCUMENT", sourceId: doc.id, content: `${doc.title} ${doc.content}`, projectId: doc.projectId, authorId: session.user.id },
    });
  } catch {}

  return NextResponse.json(doc, { status: 201 });
}
