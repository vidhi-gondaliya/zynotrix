import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET all dependencies for a task
export async function GET(_req: NextRequest, { params }: { params: { taskId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [blocking, blockedBy] = await Promise.all([
    (prisma as any).taskDependency.findMany({
      where: { taskId: params.taskId },
      include: { dependsOn: { select: { id: true, title: true, status: true, priority: true } } },
    }),
    (prisma as any).taskDependency.findMany({
      where: { dependsOnId: params.taskId },
      include: { task: { select: { id: true, title: true, status: true, priority: true } } },
    }),
  ]);

  return NextResponse.json({
    blockedBy: blocking.map((d: any) => ({ ...d.dependsOn, dependencyId: d.id })),
    blocking: blockedBy.map((d: any) => ({ ...d.task, dependencyId: d.id })),
  });
}

// POST — add dependency { dependsOnId }
export async function POST(req: NextRequest, { params }: { params: { taskId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { dependsOnId } = await req.json();
  if (!dependsOnId) return NextResponse.json({ error: "dependsOnId required" }, { status: 400 });
  if (dependsOnId === params.taskId) return NextResponse.json({ error: "Task cannot depend on itself" }, { status: 400 });

  const dep = await (prisma as any).taskDependency.upsert({
    where: { taskId_dependsOnId: { taskId: params.taskId, dependsOnId } },
    update: {},
    create: { taskId: params.taskId, dependsOnId },
    include: { dependsOn: { select: { id: true, title: true, status: true, priority: true } } },
  });

  return NextResponse.json(dep, { status: 201 });
}

// DELETE — remove dependency { dependencyId }
export async function DELETE(req: NextRequest, { params: _ }: { params: { taskId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { dependencyId } = await req.json();
  await (prisma as any).taskDependency.delete({ where: { id: dependencyId } });
  return NextResponse.json({ ok: true });
}
