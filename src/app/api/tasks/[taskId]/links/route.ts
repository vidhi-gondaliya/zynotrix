import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET task links (GitHub PRs, etc.)
export async function GET(_req: NextRequest, { params }: { params: { taskId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const links = await (prisma as any).taskLink.findMany({
    where: { taskId: params.taskId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(links);
}

// POST — manually add a task link
export async function POST(req: NextRequest, { params }: { params: { taskId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { type, externalId, url, title } = await req.json();
  if (!type || !url) return NextResponse.json({ error: "type and url required" }, { status: 400 });

  const link = await (prisma as any).taskLink.upsert({
    where: { taskId_type_externalId: { taskId: params.taskId, type, externalId: externalId ?? url } },
    update: { url, title, updatedAt: new Date() },
    create: { taskId: params.taskId, type, externalId: externalId ?? url, url, title },
  });
  return NextResponse.json(link, { status: 201 });
}

// DELETE — remove a link
export async function DELETE(req: NextRequest, { params: _ }: { params: { taskId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { linkId } = await req.json();
  await (prisma as any).taskLink.delete({ where: { id: linkId } });
  return NextResponse.json({ ok: true });
}
