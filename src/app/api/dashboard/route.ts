import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg, isOrgError } from "@/lib/org";
import type { RiskAlert } from "@/app/api/alerts/route";

export async function GET() {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId, userId } = ctx;

  const now = new Date();
  const weekAgo = new Date(Date.now() - 7 * 86400000);
  const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000);

  const [projects, tasks, members, meetings, recentTasks, insightCount, trendRows] = await Promise.all([
    prisma.project.findMany({
      where: { organizationId: orgId, status: { not: "ARCHIVED" } },
      include: {
        tasks: { select: { id: true, status: true, priority: true, dueDate: true, assigneeId: true, updatedAt: true, createdAt: true } },
      },
    }),
    prisma.task.findMany({
      where: { project: { organizationId: orgId, isPersonal: false } },
      select: { id: true, status: true, dueDate: true, priority: true, assigneeId: true, updatedAt: true, createdAt: true, projectId: true },
    }),
    prisma.organizationMember.findMany({
      where: { organizationId: orgId },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    prisma.meeting.findMany({
      where: { organizationId: orgId, startTime: { gte: now }, status: { not: "CANCELLED" } },
      include: { organizer: { select: { id: true, name: true } } },
      orderBy: { startTime: "asc" },
      take: 5,
    }),
    prisma.task.findMany({
      where: { project: { organizationId: orgId } },
      orderBy: { updatedAt: "desc" },
      take: 6,
      include: {
        assignee: { select: { id: true, name: true, image: true, email: true, role: true, createdAt: true } },
        project:  { select: { id: true, name: true, color: true } },
        _count:   { select: { comments: true } },
      },
    }),
    prisma.aIInsight.count({ where: { userId } }),
    prisma.task.findMany({
      where: { createdAt: { gte: fourteenDaysAgo }, project: { organizationId: orgId } },
      select: { status: true, createdAt: true, updatedAt: true },
    }),
  ]);

  const users = members.map((m) => m.user);

  const completedTasks = tasks.filter((t) => t.status === "DONE");
  const overdueTasks   = tasks.filter((t) => t.dueDate && new Date(t.dueDate) < now && t.status !== "DONE");
  const activeTasks    = tasks.filter((t) => t.status === "IN_PROGRESS" || t.status === "TODO");

  const taskTrend = Array.from({ length: 14 }, (_, i) => {
    const date    = new Date(Date.now() - (13 - i) * 86400000);
    const dateStr = date.toISOString().split("T")[0];
    const s = new Date(dateStr + "T00:00:00.000Z");
    const e = new Date(dateStr + "T23:59:59.999Z");
    return {
      date:      date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      completed: trendRows.filter((t) => t.status === "DONE" && t.updatedAt >= s && t.updatedAt <= e).length,
      created:   trendRows.filter((t) => t.createdAt >= s && t.createdAt <= e).length,
    };
  });

  const teamActivity = users.map((u) => ({
    name:  u.name?.split(" ")[0] ?? "User",
    tasks: tasks.filter((t) => t.assigneeId === u.id).length,
  })).filter((u) => u.tasks > 0).sort((a, b) => b.tasks - a.tasks).slice(0, 8);

  const tasksByStatus = {
    BACKLOG: tasks.filter((t) => t.status === "BACKLOG").length,
    TODO: tasks.filter((t) => t.status === "TODO").length,
    IN_PROGRESS: tasks.filter((t) => t.status === "IN_PROGRESS").length,
    REVIEW: tasks.filter((t) => t.status === "REVIEW").length,
    DONE: tasks.filter((t) => t.status === "DONE").length,
  };

  const tasksByPriority = {
    LOW: tasks.filter((t) => t.priority === "LOW").length,
    MEDIUM: tasks.filter((t) => t.priority === "MEDIUM").length,
    HIGH: tasks.filter((t) => t.priority === "HIGH").length,
    URGENT: tasks.filter((t) => t.priority === "URGENT").length,
  };

  // Alerts (org-scoped)
  const alerts: RiskAlert[] = [];
  let idSeq = 0;

  for (const project of projects.filter((p) => !p.isPersonal)) {
    const ptasks = project.tasks;
    const total  = ptasks.length;
    if (total === 0) continue;

    const done    = ptasks.filter((t) => t.status === "DONE").length;
    const overdue = ptasks.filter((t) => t.dueDate && new Date(t.dueDate) < now && t.status !== "DONE");
    const active  = ptasks.filter((t) => t.status === "IN_PROGRESS" || t.status === "TODO");
    const recentActivity = ptasks.filter((t) => new Date(t.updatedAt) >= weekAgo).length;
    const completionRate = Math.round((done / total) * 100);
    const overdueRate    = Math.round((overdue.length / total) * 100);

    if (overdueRate >= 30) alerts.push({ id: `a${++idSeq}`, severity: overdueRate >= 50 ? "critical" : "warning", type: "overdue_spike", title: `${overdueRate}% tasks overdue in "${project.name}"`, detail: `${overdue.length} of ${total} past due.`, projectId: project.id, projectName: project.name, projectColor: project.color, metric: overdueRate, action: "Extend due dates or reassign." });
    if (total >= 5 && completionRate < 20 && project.status === "ACTIVE") alerts.push({ id: `a${++idSeq}`, severity: "warning", type: "low_completion", title: `Low completion in "${project.name}"`, detail: `${completionRate}% done (${done}/${total}).`, projectId: project.id, projectName: project.name, projectColor: project.color, metric: completionRate, action: "Review scope or increase capacity." });
    if (project.status === "ACTIVE" && active.length > 0 && recentActivity === 0) alerts.push({ id: `a${++idSeq}`, severity: "warning", type: "stalled_project", title: `"${project.name}" stalled`, detail: `${active.length} active tasks, 0 updates in 7 days.`, projectId: project.id, projectName: project.name, projectColor: project.color, metric: active.length, action: "Unblock stalled tasks." });

    if (project.deadline) {
      const daysLeft = Math.ceil((new Date(project.deadline).getTime() - now.getTime()) / 86400000);
      if (daysLeft > 0 && daysLeft <= 7 && completionRate < 60) alerts.push({ id: `a${++idSeq}`, severity: daysLeft <= 3 ? "critical" : "warning", type: "deadline_risk", title: `Deadline in ${daysLeft}d — "${project.name}" ${completionRate}% done`, detail: `Deadline: ${new Date(project.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}.`, projectId: project.id, projectName: project.name, projectColor: project.color, metric: daysLeft, action: "Prioritize remaining tasks." });
    }
    if (project.healthScore !== null && project.healthScore < 40) alerts.push({ id: `a${++idSeq}`, severity: project.healthScore < 25 ? "critical" : "warning", type: "health_drop", title: `Health critical: "${project.name}"`, detail: `Score: ${Math.round(project.healthScore)}/100.`, projectId: project.id, projectName: project.name, projectColor: project.color, metric: Math.round(project.healthScore), action: "Run AI health analysis." });
  }

  for (const user of users) {
    const ut = tasks.filter((t) => t.assigneeId === user.id);
    const active   = ut.filter((t) => t.status === "IN_PROGRESS" || t.status === "TODO");
    const overdueU = ut.filter((t) => t.dueDate && new Date(t.dueDate) < now && t.status !== "DONE");
    if (active.length > 10) alerts.push({ id: `a${++idSeq}`, severity: active.length > 15 ? "critical" : "warning", type: "member_overload", title: `${user.name ?? user.email} has ${active.length} active tasks`, detail: "Above recommended limit.", userId: user.id, userName: user.name ?? user.email ?? undefined, metric: active.length, action: "Reassign tasks." });
    if (overdueU.length > 3) alerts.push({ id: `a${++idSeq}`, severity: "warning", type: "overdue_spike", title: `${user.name ?? user.email} has ${overdueU.length} overdue tasks`, detail: "Personal overdue pile growing.", userId: user.id, userName: user.name ?? user.email ?? undefined, metric: overdueU.length, action: "Review stale tasks." });
  }

  alerts.sort((a, b) => ({ critical: 0, warning: 1, info: 2 }[a.severity] - { critical: 0, warning: 1, info: 2 }[b.severity]));

  return NextResponse.json({
    totalProjects: projects.length,
    activeProjects: projects.filter((p) => p.status === "ACTIVE").length,
    activeTasks: activeTasks.length, totalTasks: tasks.length, completedTasks: completedTasks.length,
    overdueTasks: overdueTasks.length, reviewTasks: tasksByStatus.REVIEW,
    completionRate: tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0,
    tasksByStatus, tasksByPriority, taskTrend, teamActivity,
    projectHealth: projects.map((p) => ({ name: p.name, score: p.healthScore ?? 0, color: p.color })),
    upcomingMeetings: meetings,
    recentTasks: recentTasks.map((t) => ({ ...t, tags: JSON.parse(t.tags) })),
    insightCount, alerts,
    criticalAlertCount: alerts.filter((a) => a.severity === "critical").length,
  });
}
