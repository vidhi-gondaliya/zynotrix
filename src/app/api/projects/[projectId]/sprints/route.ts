import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { projectId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sprints = await (prisma as any).sprint.findMany({
    where: { projectId: params.projectId },
    include: {
      tasks: {
        include: {
          task: {
            select: {
              id: true, title: true, status: true, priority: true,
              storyPoints: true, assigneeId: true,
              assignee: { select: { id: true, name: true, image: true } },
            },
          },
        },
      },
    },
    orderBy: { startDate: "asc" },
  });

  return NextResponse.json(sprints);
}

export async function POST(req: NextRequest, { params }: { params: { projectId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, goal, startDate, endDate } = await req.json();
  if (!name || !startDate || !endDate) return NextResponse.json({ error: "name, startDate, endDate required" }, { status: 400 });

  const sprint = await (prisma as any).sprint.create({
    data: {
      projectId: params.projectId,
      name,
      goal: goal ?? null,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      status: "PLANNING",
    },
  });

  return NextResponse.json(sprint, { status: 201 });
}
