import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public portal endpoint — no auth required
export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  const portal = await (prisma as any).clientPortal.findUnique({
    where: { token: params.token },
    include: {
      project: {
        include: {
          tasks: {
            select: {
              id: true, title: true, status: true, priority: true,
              dueDate: true, startDate: true, storyPoints: true,
              assignee: { select: { id: true, name: true, image: true } },
            },
            orderBy: { dueDate: "asc" },
          },
        },
      },
    },
  });

  if (!portal || !portal.isActive) {
    return NextResponse.json({ error: "Portal not found or disabled" }, { status: 404 });
  }

  const { password: _pw, ...safePortal } = portal;

  // password check
  const supplied = req.nextUrl.searchParams.get("password");
  if (portal.password && supplied !== portal.password) {
    return NextResponse.json({ error: "Password required", passwordProtected: true }, { status: 401 });
  }

  const project = portal.project;
  const tasks = portal.showTasks ? project.tasks : [];
  const stats = {
    total: project.tasks.length,
    done: project.tasks.filter((t: any) => t.status === "DONE").length,
    inProgress: project.tasks.filter((t: any) => t.status === "IN_PROGRESS").length,
    overdue: project.tasks.filter(
      (t: any) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "DONE"
    ).length,
  };

  return NextResponse.json({
    portal: safePortal,
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      color: project.color,
      status: project.status,
      deadline: project.deadline,
      clientName: project.clientName,
      healthScore: portal.showHealth ? project.healthScore : null,
    },
    tasks,
    stats,
  });
}
