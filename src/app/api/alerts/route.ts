import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type AlertSeverity = "critical" | "warning" | "info";
export type AlertType =
  | "overdue_spike"
  | "low_completion"
  | "stalled_project"
  | "member_overload"
  | "health_drop"
  | "no_activity"
  | "deadline_risk";

export interface RiskAlert {
  id: string;
  severity: AlertSeverity;
  type: AlertType;
  title: string;
  detail: string;
  projectId?: string;
  projectName?: string;
  projectColor?: string;
  userId?: string;
  userName?: string;
  metric?: number;
  action?: string;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const weekAgo = new Date(Date.now() - 7 * 86400000);
  const twoWeeksAgo = new Date(Date.now() - 14 * 86400000);

  const [projects, tasks, users] = await Promise.all([
    prisma.project.findMany({
      where: { status: { not: "ARCHIVED" }, isPersonal: false },
      include: {
        tasks: {
          include: { assignee: { select: { id: true, name: true } } },
        },
      },
    }),
    prisma.task.findMany({
      include: { assignee: { select: { id: true, name: true } }, project: { select: { id: true, name: true, color: true } } },
      where: { project: { isPersonal: false } },
    }),
    prisma.user.findMany({ select: { id: true, name: true, email: true } }),
  ]);

  const alerts: RiskAlert[] = [];
  let idSeq = 0;

  // ── Per-project checks ──────────────────────────────────────────────────────
  for (const project of projects) {
    const ptasks = project.tasks;
    const total = ptasks.length;
    if (total === 0) continue;

    const done     = ptasks.filter((t) => t.status === "DONE").length;
    const overdue  = ptasks.filter((t) => t.dueDate && new Date(t.dueDate) < now && t.status !== "DONE");
    const active   = ptasks.filter((t) => t.status === "IN_PROGRESS" || t.status === "TODO");
    const recentActivity = ptasks.filter((t) => new Date(t.updatedAt) >= weekAgo).length;
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;
    const overdueRate    = total > 0 ? Math.round((overdue.length / total) * 100) : 0;

    // Overdue spike: >30% tasks overdue
    if (overdueRate >= 30) {
      alerts.push({
        id: `a${++idSeq}`,
        severity: overdueRate >= 50 ? "critical" : "warning",
        type: "overdue_spike",
        title: `${overdueRate}% tasks overdue in "${project.name}"`,
        detail: `${overdue.length} of ${total} tasks are past their due date.`,
        projectId: project.id, projectName: project.name, projectColor: project.color,
        metric: overdueRate,
        action: "Reassign or extend due dates for overdue tasks.",
      });
    }

    // Low completion: active project <20% done with >5 tasks
    if (total >= 5 && completionRate < 20 && project.status === "ACTIVE") {
      alerts.push({
        id: `a${++idSeq}`,
        severity: "warning",
        type: "low_completion",
        title: `Low completion rate in "${project.name}"`,
        detail: `Only ${completionRate}% tasks completed (${done}/${total}).`,
        projectId: project.id, projectName: project.name, projectColor: project.color,
        metric: completionRate,
        action: "Review task scope or increase team capacity.",
      });
    }

    // Stalled project: active but 0 updates in past 7 days
    if (project.status === "ACTIVE" && active.length > 0 && recentActivity === 0) {
      alerts.push({
        id: `a${++idSeq}`,
        severity: "warning",
        type: "stalled_project",
        title: `"${project.name}" has no activity this week`,
        detail: `${active.length} active tasks but no updates in the last 7 days.`,
        projectId: project.id, projectName: project.name, projectColor: project.color,
        metric: active.length,
        action: "Check in with the team and unblock stalled tasks.",
      });
    }

    // Deadline risk: deadline in <7 days with completion <60%
    if (project.deadline) {
      const daysLeft = Math.ceil((new Date(project.deadline).getTime() - now.getTime()) / 86400000);
      if (daysLeft > 0 && daysLeft <= 7 && completionRate < 60) {
        alerts.push({
          id: `a${++idSeq}`,
          severity: daysLeft <= 3 ? "critical" : "warning",
          type: "deadline_risk",
          title: `Deadline in ${daysLeft}d — "${project.name}" only ${completionRate}% done`,
          detail: `Project deadline is ${new Date(project.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}.`,
          projectId: project.id, projectName: project.name, projectColor: project.color,
          metric: daysLeft,
          action: "Prioritize remaining tasks or negotiate the deadline.",
        });
      }
    }

    // Health drop: cached score below threshold
    if (project.healthScore !== null && project.healthScore < 40) {
      alerts.push({
        id: `a${++idSeq}`,
        severity: project.healthScore < 25 ? "critical" : "warning",
        type: "health_drop",
        title: `Health score critical for "${project.name}"`,
        detail: `AI health score: ${Math.round(project.healthScore)}/100.`,
        projectId: project.id, projectName: project.name, projectColor: project.color,
        metric: Math.round(project.healthScore),
        action: "Run AI health analysis and address top risks.",
      });
    }
  }

  // ── Per-member checks ───────────────────────────────────────────────────────
  for (const user of users) {
    const userTasks = tasks.filter((t) => t.assigneeId === user.id);
    const active    = userTasks.filter((t) => t.status === "IN_PROGRESS" || t.status === "TODO");
    const overdueU  = userTasks.filter((t) => t.dueDate && new Date(t.dueDate) < now && t.status !== "DONE");

    // Member overload: >10 active tasks
    if (active.length > 10) {
      alerts.push({
        id: `a${++idSeq}`,
        severity: active.length > 15 ? "critical" : "warning",
        type: "member_overload",
        title: `${user.name ?? user.email} has ${active.length} active tasks`,
        detail: `This is above the recommended limit of 10 concurrent tasks.`,
        userId: user.id, userName: user.name ?? user.email,
        metric: active.length,
        action: "Reassign some tasks or adjust priorities.",
      });
    }

    // Member overdue pile: >3 overdue tasks
    if (overdueU.length > 3) {
      alerts.push({
        id: `a${++idSeq}`,
        severity: "warning",
        type: "overdue_spike",
        title: `${user.name ?? user.email} has ${overdueU.length} overdue tasks`,
        detail: `Personal overdue task pile is growing.`,
        userId: user.id, userName: user.name ?? user.email,
        metric: overdueU.length,
        action: "Review and reschedule or close stale tasks.",
      });
    }
  }

  // Sort: critical first, then by severity
  alerts.sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 };
    return order[a.severity] - order[b.severity];
  });

  return NextResponse.json(alerts);
}
