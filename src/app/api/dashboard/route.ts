import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { RiskAlert } from "@/app/api/alerts/route";

// Single endpoint replacing /api/analytics + /api/alerts on the dashboard
// All data comes from one set of DB queries instead of two overlapping sets
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const weekAgo = new Date(Date.now() - 7 * 86400000);
  const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000);

  // ── Single load of shared data ──────────────────────────────────────────────
  const [projects, tasks, users, meetings, recentTasks, insightCount, trendRows] = await Promise.all([
    prisma.project.findMany({
      where: { status: { not: "ARCHIVED" } },
      include: {
        tasks: {
          select: {
            id: true, status: true, priority: true, dueDate: true,
            assigneeId: true, updatedAt: true, createdAt: true,
          },
        },
      },
    }),

    // Flat task list for member-level checks (lightweight select)
    prisma.task.findMany({
      where: { project: { isPersonal: false } },
      select: {
        id: true, status: true, dueDate: true, priority: true,
        assigneeId: true, updatedAt: true, createdAt: true,
        projectId: true,
      },
    }),

    prisma.user.findMany({ select: { id: true, name: true, email: true } }),

    prisma.meeting.findMany({
      where: { startTime: { gte: now }, status: { not: "CANCELLED" } },
      include: { organizer: { select: { id: true, name: true } } },
      orderBy: { startTime: "asc" },
      take: 5,
    }),

    // Recent tasks with full joins — limited to 6
    prisma.task.findMany({
      orderBy: { updatedAt: "desc" },
      take: 6,
      include: {
        assignee: { select: { id: true, name: true, image: true, email: true, role: true, createdAt: true } },
        project:  { select: { id: true, name: true, color: true } },
        _count:   { select: { comments: true } },
      },
    }),

    // AI insight count (just for badge — cheap)
    prisma.aIInsight.count({ where: { userId: session.user.id } }),

    // Task trend: DB-side date filter instead of loading all tasks and filtering in JS
    prisma.task.findMany({
      where: { createdAt: { gte: fourteenDaysAgo } },
      select: { status: true, createdAt: true, updatedAt: true },
    }),
  ]);

  // ── Analytics ───────────────────────────────────────────────────────────────
  const nonPersonalTasks = tasks;
  const allTasks = [...nonPersonalTasks]; // use same array

  const completedTasks = allTasks.filter((t) => t.status === "DONE");
  const overdueTasks   = allTasks.filter((t) => t.dueDate && new Date(t.dueDate) < now && t.status !== "DONE");
  const activeTasks    = allTasks.filter((t) => t.status === "IN_PROGRESS" || t.status === "TODO");

  // Task trend using pre-filtered trendRows (only last 14 days)
  const taskTrend = Array.from({ length: 14 }, (_, i) => {
    const date     = new Date(Date.now() - (13 - i) * 86400000);
    const dateStr  = date.toISOString().split("T")[0];
    const dayStart = new Date(dateStr + "T00:00:00.000Z");
    const dayEnd   = new Date(dateStr + "T23:59:59.999Z");
    return {
      date:      date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      completed: trendRows.filter((t) => t.status === "DONE" && t.updatedAt >= dayStart && t.updatedAt <= dayEnd).length,
      created:   trendRows.filter((t) => t.createdAt >= dayStart && t.createdAt <= dayEnd).length,
    };
  });

  const teamActivity = users.map((u) => ({
    name:  u.name?.split(" ")[0] ?? "User",
    tasks: allTasks.filter((t) => t.assigneeId === u.id).length,
  })).filter((u) => u.tasks > 0).sort((a, b) => b.tasks - a.tasks).slice(0, 8);

  const projectHealth = projects.map((p) => ({ name: p.name, score: p.healthScore ?? 0, color: p.color }));

  const tasksByStatus = {
    BACKLOG:     allTasks.filter((t) => t.status === "BACKLOG").length,
    TODO:        allTasks.filter((t) => t.status === "TODO").length,
    IN_PROGRESS: allTasks.filter((t) => t.status === "IN_PROGRESS").length,
    REVIEW:      allTasks.filter((t) => t.status === "REVIEW").length,
    DONE:        allTasks.filter((t) => t.status === "DONE").length,
  };

  const tasksByPriority = {
    LOW:    allTasks.filter((t) => t.priority === "LOW").length,
    MEDIUM: allTasks.filter((t) => t.priority === "MEDIUM").length,
    HIGH:   allTasks.filter((t) => t.priority === "HIGH").length,
    URGENT: allTasks.filter((t) => t.priority === "URGENT").length,
  };

  // ── Risk alerts (reusing project.tasks already loaded above) ────────────────
  const alerts: RiskAlert[] = [];
  let idSeq = 0;

  const nonPersonalProjects = projects.filter((p) => !p.isPersonal);

  for (const project of nonPersonalProjects) {
    const ptasks = project.tasks;
    const total = ptasks.length;
    if (total === 0) continue;

    const done    = ptasks.filter((t) => t.status === "DONE").length;
    const overdue = ptasks.filter((t) => t.dueDate && new Date(t.dueDate) < now && t.status !== "DONE");
    const active  = ptasks.filter((t) => t.status === "IN_PROGRESS" || t.status === "TODO");
    const recentActivity  = ptasks.filter((t) => new Date(t.updatedAt) >= weekAgo).length;
    const completionRate  = Math.round((done / total) * 100);
    const overdueRate     = Math.round((overdue.length / total) * 100);

    if (overdueRate >= 30) alerts.push({ id: `a${++idSeq}`, severity: overdueRate >= 50 ? "critical" : "warning", type: "overdue_spike", title: `${overdueRate}% tasks overdue in "${project.name}"`, detail: `${overdue.length} of ${total} tasks are past their due date.`, projectId: project.id, projectName: project.name, projectColor: project.color, metric: overdueRate, action: "Reassign or extend due dates for overdue tasks." });
    if (total >= 5 && completionRate < 20 && project.status === "ACTIVE") alerts.push({ id: `a${++idSeq}`, severity: "warning", type: "low_completion", title: `Low completion rate in "${project.name}"`, detail: `Only ${completionRate}% tasks completed (${done}/${total}).`, projectId: project.id, projectName: project.name, projectColor: project.color, metric: completionRate, action: "Review task scope or increase team capacity." });
    if (project.status === "ACTIVE" && active.length > 0 && recentActivity === 0) alerts.push({ id: `a${++idSeq}`, severity: "warning", type: "stalled_project", title: `"${project.name}" has no activity this week`, detail: `${active.length} active tasks but no updates in the last 7 days.`, projectId: project.id, projectName: project.name, projectColor: project.color, metric: active.length, action: "Check in with the team and unblock stalled tasks." });

    if (project.deadline) {
      const daysLeft = Math.ceil((new Date(project.deadline).getTime() - now.getTime()) / 86400000);
      if (daysLeft > 0 && daysLeft <= 7 && completionRate < 60) alerts.push({ id: `a${++idSeq}`, severity: daysLeft <= 3 ? "critical" : "warning", type: "deadline_risk", title: `Deadline in ${daysLeft}d — "${project.name}" only ${completionRate}% done`, detail: `Project deadline is ${new Date(project.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}.`, projectId: project.id, projectName: project.name, projectColor: project.color, metric: daysLeft, action: "Prioritize remaining tasks or negotiate the deadline." });
    }

    if (project.healthScore !== null && project.healthScore < 40) alerts.push({ id: `a${++idSeq}`, severity: project.healthScore < 25 ? "critical" : "warning", type: "health_drop", title: `Health score critical for "${project.name}"`, detail: `AI health score: ${Math.round(project.healthScore)}/100.`, projectId: project.id, projectName: project.name, projectColor: project.color, metric: Math.round(project.healthScore), action: "Run AI health analysis and address top risks." });
  }

  for (const user of users) {
    const userTasks = allTasks.filter((t) => t.assigneeId === user.id);
    const active   = userTasks.filter((t) => t.status === "IN_PROGRESS" || t.status === "TODO");
    const overdueU = userTasks.filter((t) => t.dueDate && new Date(t.dueDate) < now && t.status !== "DONE");

    if (active.length > 10) alerts.push({ id: `a${++idSeq}`, severity: active.length > 15 ? "critical" : "warning", type: "member_overload", title: `${user.name ?? user.email} has ${active.length} active tasks`, detail: `This is above the recommended limit of 10 concurrent tasks.`, userId: user.id, userName: user.name ?? user.email ?? undefined, metric: active.length, action: "Reassign some tasks or adjust priorities." });
    if (overdueU.length > 3) alerts.push({ id: `a${++idSeq}`, severity: "warning", type: "overdue_spike", title: `${user.name ?? user.email} has ${overdueU.length} overdue tasks`, detail: `Personal overdue task pile is growing.`, userId: user.id, userName: user.name ?? user.email ?? undefined, metric: overdueU.length, action: "Review and reschedule or close stale tasks." });
  }

  alerts.sort((a, b) => ({ critical: 0, warning: 1, info: 2 }[a.severity] - { critical: 0, warning: 1, info: 2 }[b.severity]));

  return NextResponse.json({
    // Analytics
    totalProjects:  projects.length,
    activeProjects: projects.filter((p) => p.status === "ACTIVE").length,
    activeTasks:    activeTasks.length,
    totalTasks:     allTasks.length,
    completedTasks: completedTasks.length,
    overdueTasks:   overdueTasks.length,
    reviewTasks:    tasksByStatus.REVIEW,
    completionRate: allTasks.length > 0 ? Math.round((completedTasks.length / allTasks.length) * 100) : 0,
    tasksByStatus,
    tasksByPriority,
    taskTrend,
    teamActivity,
    projectHealth,
    upcomingMeetings: meetings,
    recentTasks: recentTasks.map((t) => ({ ...t, tags: JSON.parse(t.tags) })),
    insightCount,
    // Alerts
    alerts,
    criticalAlertCount: alerts.filter((a) => a.severity === "critical").length,
  });
}
