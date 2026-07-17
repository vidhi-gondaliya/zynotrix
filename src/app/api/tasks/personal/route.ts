import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getOrCreatePersonalProject(userId: string) {
  let project = await prisma.project.findFirst({
    where: { ownerId: userId, isPersonal: true },
  });
  if (!project) {
    project = await prisma.project.create({
      data: {
        name: "Personal",
        description: "Your personal tasks",
        color: "#7C3AED",
        isPersonal: true,
        ownerId: userId,
      },
    });
  }
  return project;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const project = await getOrCreatePersonalProject(session.user.id);

  const tasks = await prisma.task.findMany({
    where: { projectId: project.id },
    include: { assignee: { select: { id: true, name: true, image: true } } },
    orderBy: [{ status: "asc" }, { position: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ tasks, projectId: project.id });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { title, priority = "MEDIUM", dueDate, status = "TODO" } = body;
  if (!title?.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 });

  const project = await getOrCreatePersonalProject(session.user.id);

  const maxPos = await prisma.task.aggregate({
    where: { projectId: project.id },
    _max: { position: true },
  });

  const task = await prisma.task.create({
    data: {
      title: title.trim(),
      priority,
      status,
      dueDate: dueDate ? new Date(dueDate) : null,
      position: (maxPos._max.position ?? 0) + 1,
      projectId: project.id,
      assigneeId: session.user.id,
      creatorId: session.user.id,
    },
    include: { assignee: { select: { id: true, name: true, image: true } } },
  });

  return NextResponse.json(task, { status: 201 });
}
