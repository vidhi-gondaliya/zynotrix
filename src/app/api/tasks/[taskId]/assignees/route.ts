import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/tasks/[taskId]/assignees
export async function GET(_req: NextRequest, { params }: { params: { taskId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const assignees = await (prisma as any).taskAssignee.findMany({
    where: { taskId: params.taskId },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
    orderBy: { assignedAt: "asc" },
  });
  return NextResponse.json(assignees);
}

// POST /api/tasks/[taskId]/assignees — add assignee { userId }
export async function POST(req: NextRequest, { params }: { params: { taskId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const entry = await (prisma as any).taskAssignee.upsert({
    where: { taskId_userId: { taskId: params.taskId, userId } },
    update: {},
    create: { taskId: params.taskId, userId },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
  });
  return NextResponse.json(entry, { status: 201 });
}

// DELETE /api/tasks/[taskId]/assignees — remove assignee { userId }
export async function DELETE(req: NextRequest, { params }: { params: { taskId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId } = await req.json();
  await (prisma as any).taskAssignee.deleteMany({ where: { taskId: params.taskId, userId } });
  return NextResponse.json({ ok: true });
}
