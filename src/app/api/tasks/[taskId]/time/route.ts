import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET time logs for a task
export async function GET(_req: NextRequest, { params }: { params: { taskId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const logs = await (prisma as any).timeLog.findMany({
    where: { taskId: params.taskId },
    include: { user: { select: { id: true, name: true, image: true } } },
    orderBy: { startedAt: "desc" },
  });

  const totalMinutes = logs.reduce((sum: number, l: any) => sum + (l.duration ?? 0), 0);
  return NextResponse.json({ logs, totalMinutes });
}

// POST — start / stop / log time
export async function POST(req: NextRequest, { params }: { params: { taskId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { action, description, startedAt, endedAt, durationMinutes } = body;

  if (action === "log") {
    // manual entry
    const duration = durationMinutes ? Math.round(durationMinutes) : null;
    const log = await (prisma as any).timeLog.create({
      data: {
        taskId: params.taskId,
        userId: session.user.id,
        startedAt: startedAt ? new Date(startedAt) : new Date(),
        endedAt: endedAt ? new Date(endedAt) : null,
        duration,
        description: description ?? null,
      },
      include: { user: { select: { id: true, name: true, image: true } } },
    });

    if (duration) {
      await (prisma as any).task.update({
        where: { id: params.taskId },
        data: { timeSpentMin: { increment: duration } },
      });
    }
    return NextResponse.json(log, { status: 201 });
  }

  if (action === "stop") {
    const { logId } = body;
    const existing = await (prisma as any).timeLog.findUnique({ where: { id: logId } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const end = new Date();
    const duration = Math.round((end.getTime() - new Date(existing.startedAt).getTime()) / 60000);
    const log = await (prisma as any).timeLog.update({
      where: { id: logId },
      data: { endedAt: end, duration },
      include: { user: { select: { id: true, name: true, image: true } } },
    });
    await (prisma as any).task.update({
      where: { id: params.taskId },
      data: { timeSpentMin: { increment: duration } },
    });
    return NextResponse.json(log);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

// DELETE — remove a time log
export async function DELETE(req: NextRequest, { params }: { params: { taskId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { logId } = await req.json();
  const log = await (prisma as any).timeLog.findUnique({ where: { id: logId } });
  if (!log) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await (prisma as any).timeLog.delete({ where: { id: logId } });
  if (log.duration) {
    await (prisma as any).task.update({
      where: { id: params.taskId },
      data: { timeSpentMin: { decrement: log.duration } },
    });
  }
  return NextResponse.json({ ok: true });
}
