import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [projects, tasks, users, meetings, recentTasks] = await Promise.all([
    prisma.project.findMany({ where: { status: { not: "ARCHIVED" } } }),
    prisma.task.findMany({
      include: { assignee: { select: { id: true, name: true } } },
    }),
    prisma.user.findMany({ select: { id: true, name: true } }),
    prisma.meeting.findMany({
      where: { startTime: { gte: new Date() }, status: { not: "CANCELLED" } },
      include: { organizer: { select: { id: true, name: true } } },
      orderBy: { startTime: "asc" },
      take: 5,
    }),
    prisma.task.findMany({
      orderBy: { updatedAt: "desc" },
      take: 6,
      include: {
        assignee: { select: { id: true, name: true, image: true, email: true, role: true, createdAt: true } },
        project:  { select: { id: true, name: true, color: true } },
        _count:   { select: { comments: true } },
      },
    }),
  ]);

  const now = new Date();
  const completedTasks = tasks.filter((t) => t.status === "DONE");
  const overdueTasks   = tasks.filter((t) => t.dueDate && new Date(t.dueDate) < now && t.status !== "DONE");
  const activeTasks    = tasks.filter((t) => t.status === "IN_PROGRESS" || t.status === "TODO");

  const taskTrend = Array.from({ length: 14 }, (_, i) => {
    const date    = new Date(Date.now() - (13 - i) * 86400000);
    const dateStr = date.toISOString().split("T")[0];
    const dayStart = new Date(dateStr + "T00:00:00.000Z");
    const dayEnd   = new Date(dateStr + "T23:59:59.999Z");
    return {
      date:      date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      completed: tasks.filter((t) => t.status === "DONE" && t.updatedAt >= dayStart && t.updatedAt <= dayEnd).length,
      created:   tasks.filter((t) => t.createdAt >= dayStart && t.createdAt <= dayEnd).length,
    };
  });

  const teamActivity = users.map((u) => ({
    name:  u.name?.split(" ")[0] ?? "User",
    tasks: tasks.filter((t) => t.assigneeId === u.id).length,
  })).filter((u) => u.tasks > 0).sort((a, b) => b.tasks - a.tasks).slice(0, 8);

  const projectHealth = projects.map((p) => ({
    name: p.name, score: p.healthScore ?? 0, color: p.color,
  }));

  const tasksByStatus = {
    BACKLOG:     tasks.filter((t) => t.status === "BACKLOG").length,
    TODO:        tasks.filter((t) => t.status === "TODO").length,
    IN_PROGRESS: tasks.filter((t) => t.status === "IN_PROGRESS").length,
    REVIEW:      tasks.filter((t) => t.status === "REVIEW").length,
    DONE:        tasks.filter((t) => t.status === "DONE").length,
  };

  const tasksByPriority = {
    LOW:    tasks.filter((t) => t.priority === "LOW").length,
    MEDIUM: tasks.filter((t) => t.priority === "MEDIUM").length,
    HIGH:   tasks.filter((t) => t.priority === "HIGH").length,
    URGENT: tasks.filter((t) => t.priority === "URGENT").length,
  };

  return NextResponse.json({
    totalProjects:  projects.length,
    activeProjects: projects.filter((p) => p.status === "ACTIVE").length,
    activeTasks:    activeTasks.length,
    totalTasks:     tasks.length,
    completedTasks: completedTasks.length,
    overdueTasks:   overdueTasks.length,
    completionRate: tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0,
    reviewTasks: tasksByStatus.REVIEW,
    tasksByStatus,
    tasksByPriority,
    taskTrend,
    teamActivity,
    projectHealth,
    upcomingMeetings: meetings,
    recentTasks: recentTasks.map((t) => ({ ...t, tags: JSON.parse(t.tags) })),
  });
}
