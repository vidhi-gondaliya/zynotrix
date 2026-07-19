import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg, isOrgError } from "@/lib/org";

export type AlertSeverity = "critical" | "warning" | "info";
export type AlertType = "overdue_spike" | "low_completion" | "stalled_project" | "member_overload" | "health_drop" | "no_activity" | "deadline_risk";

export interface RiskAlert {
  id: string; severity: AlertSeverity; type: AlertType; title: string; detail: string;
  projectId?: string; projectName?: string; projectColor?: string;
  userId?: string; userName?: string; metric?: number; action?: string;
}

export async function GET() {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId } = ctx;

  const now = new Date();
  const weekAgo = new Date(Date.now() - 7 * 86400000);

  const [projects, tasks, members] = await Promise.all([
    prisma.project.findMany({
      where: { organizationId: orgId, status: { not: "ARCHIVED" }, isPersonal: false },
      include: { tasks: { include: { assignee: { select: { id: true, name: true } } } } },
    }),
    prisma.task.findMany({
      where: { project: { organizationId: orgId, isPersonal: false } },
      include: { assignee: { select: { id: true, name: true } }, project: { select: { id: true, name: true, color: true } } },
    }),
    prisma.organizationMember.findMany({
      where: { organizationId: orgId },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
  ]);

  const users = members.map((m) => m.user);
  const alerts: RiskAlert[] = [];
  let idSeq = 0;

  for (const project of projects) {
    const ptasks = project.tasks;
    const total = ptasks.length;
    if (total === 0) continue;

    const done     = ptasks.filter((t) => t.status === "DONE").length;
    const overdue  = ptasks.filter((t) => t.dueDate && new Date(t.dueDate) < now && t.status !== "DONE");
    const active   = ptasks.filter((t) => t.status === "IN_PROGRESS" || t.status === "TODO");
    const recentActivity = ptasks.filter((t) => new Date(t.updatedAt) >= weekAgo).length;
    const completionRate = Math.round((done / total) * 100);
    const overdueRate    = Math.round((overdue.length / total) * 100);

    if (overdueRate >= 30) alerts.push({ id: `a${++idSeq}`, severity: overdueRate >= 50 ? "critical" : "warning", type: "overdue_spike", title: `${overdueRate}% tasks overdue in "${project.name}"`, detail: `${overdue.length} of ${total} tasks past due date.`, projectId: project.id, projectName: project.name, projectColor: project.color, metric: overdueRate, action: "Reassign or extend due dates." });
    if (total >= 5 && completionRate < 20 && project.status === "ACTIVE") alerts.push({ id: `a${++idSeq}`, severity: "warning", type: "low_completion", title: `Low completion in "${project.name}"`, detail: `Only ${completionRate}% done (${done}/${total}).`, projectId: project.id, projectName: project.name, projectColor: project.color, metric: completionRate, action: "Review scope or increase capacity." });
    if (project.status === "ACTIVE" && active.length > 0 && recentActivity === 0) alerts.push({ id: `a${++idSeq}`, severity: "warning", type: "stalled_project", title: `"${project.name}" stalled — no activity this week`, detail: `${active.length} active tasks, 0 updates in 7 days.`, projectId: project.id, projectName: project.name, projectColor: project.color, metric: active.length, action: "Check in with team and unblock tasks." });

    if (project.deadline) {
      const daysLeft = Math.ceil((new Date(project.deadline).getTime() - now.getTime()) / 86400000);
      if (daysLeft > 0 && daysLeft <= 7 && completionRate < 60) alerts.push({ id: `a${++idSeq}`, severity: daysLeft <= 3 ? "critical" : "warning", type: "deadline_risk", title: `Deadline in ${daysLeft}d — "${project.name}" ${completionRate}% done`, detail: `Deadline: ${new Date(project.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}.`, projectId: project.id, projectName: project.name, projectColor: project.color, metric: daysLeft, action: "Prioritize remaining tasks or negotiate deadline." });
    }

    if (project.healthScore !== null && project.healthScore < 40) alerts.push({ id: `a${++idSeq}`, severity: project.healthScore < 25 ? "critical" : "warning", type: "health_drop", title: `Health critical for "${project.name}"`, detail: `AI health score: ${Math.round(project.healthScore)}/100.`, projectId: project.id, projectName: project.name, projectColor: project.color, metric: Math.round(project.healthScore), action: "Run AI health analysis." });
  }

  for (const user of users) {
    const userTasks = tasks.filter((t) => t.assigneeId === user.id);
    const active   = userTasks.filter((t) => t.status === "IN_PROGRESS" || t.status === "TODO");
    const overdueU = userTasks.filter((t) => t.dueDate && new Date(t.dueDate) < now && t.status !== "DONE");

    if (active.length > 10) alerts.push({ id: `a${++idSeq}`, severity: active.length > 15 ? "critical" : "warning", type: "member_overload", title: `${user.name ?? user.email} has ${active.length} active tasks`, detail: `Above recommended limit of 10 concurrent tasks.`, userId: user.id, userName: user.name ?? user.email ?? "", metric: active.length, action: "Reassign tasks or adjust priorities." });
    if (overdueU.length > 3) alerts.push({ id: `a${++idSeq}`, severity: "warning", type: "overdue_spike", title: `${user.name ?? user.email} has ${overdueU.length} overdue tasks`, detail: `Personal overdue task pile is growing.`, userId: user.id, userName: user.name ?? user.email ?? "", metric: overdueU.length, action: "Review and reschedule stale tasks." });
  }

  alerts.sort((a, b) => ({ critical: 0, warning: 1, info: 2 }[a.severity] - { critical: 0, warning: 1, info: 2 }[b.severity]));
  return NextResponse.json(alerts);
}
