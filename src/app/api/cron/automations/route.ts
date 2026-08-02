import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runAutomations } from "@/lib/automations";

// Vercel Cron calls this daily at 08:00 UTC — no user session available.
// Secured by CRON_SECRET env var set in Vercel dashboard.
export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization");
  if (process.env.CRON_SECRET && secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const dayOfWeek = now.getUTCDay(); // 0 = Sunday, 1 = Monday

  // Load all orgs that have active automations
  const orgs = await (prisma as any).automation.findMany({
    where: { isActive: true },
    select: { organizationId: true },
    distinct: ["organizationId"],
  });

  const orgIds: string[] = orgs.map((o: { organizationId: string }) => o.organizationId);

  const results: Record<string, unknown> = {};

  for (const orgId of orgIds) {
    const orgResults: string[] = [];

    // ── daily_schedule ──────────────────────────────────────────────
    await runAutomations(orgId, "daily_schedule", {});
    orgResults.push("daily_schedule");

    // ── weekly_schedule — Mondays only ──────────────────────────────
    if (dayOfWeek === 1) {
      await runAutomations(orgId, "weekly_schedule", {});
      orgResults.push("weekly_schedule");
    }

    // ── task_overdue ─────────────────────────────────────────────────
    const overdueTasks = await prisma.task.findMany({
      where: {
        project: { organizationId: orgId },
        dueDate: { lt: now },
        status: { notIn: ["DONE", "ARCHIVED"] },
      },
      select: { id: true, projectId: true, priority: true, status: true },
    });

    for (const task of overdueTasks) {
      await runAutomations(orgId, "task_overdue", {
        taskId: task.id,
        task: task as Record<string, unknown>,
        projectId: task.projectId,
      });
    }
    if (overdueTasks.length) orgResults.push(`task_overdue (${overdueTasks.length})`);

    // ── task_due_soon — tasks due within 24 hours ────────────────────
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const dueSoonTasks = await prisma.task.findMany({
      where: {
        project: { organizationId: orgId },
        dueDate: { gte: now, lte: in24h },
        status: { notIn: ["DONE", "ARCHIVED"] },
      },
      select: { id: true, projectId: true, priority: true, status: true },
    });

    for (const task of dueSoonTasks) {
      await runAutomations(orgId, "task_due_soon", {
        taskId: task.id,
        task: task as Record<string, unknown>,
        projectId: task.projectId,
      });
    }
    if (dueSoonTasks.length) orgResults.push(`task_due_soon (${dueSoonTasks.length})`);

    // ── project_health_low ───────────────────────────────────────────
    const projects = await prisma.project.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        _count: {
          select: {
            tasks: true,
          },
        },
      },
    });

    for (const project of projects) {
      const total = project._count.tasks;
      if (total === 0) continue;

      const done = await prisma.task.count({
        where: { projectId: project.id, status: "DONE" },
      });
      const overdue = await prisma.task.count({
        where: { projectId: project.id, dueDate: { lt: now }, status: { notIn: ["DONE", "ARCHIVED"] } },
      });

      // Simple health score: penalise overdue tasks
      const healthScore = Math.max(0, Math.round(((done / total) * 100) - (overdue / total) * 50));

      await runAutomations(orgId, "project_health_low", {
        projectId: project.id,
        projectHealthScore: healthScore,
      });
    }
    orgResults.push("project_health_low (checked)");

    // ── member_overloaded ────────────────────────────────────────────
    const memberTaskCounts = await prisma.task.groupBy({
      by: ["assigneeId"],
      where: {
        project: { organizationId: orgId },
        status: { notIn: ["DONE", "ARCHIVED"] },
        assigneeId: { not: null },
      },
      _count: { assigneeId: true },
    });

    for (const row of memberTaskCounts) {
      if (!row.assigneeId) continue;
      await runAutomations(orgId, "member_overloaded", {
        memberId: row.assigneeId,
        memberTaskCount: row._count.assigneeId,
      });
    }
    if (memberTaskCounts.length) orgResults.push("member_overloaded (checked)");

    results[orgId] = orgResults;
  }

  return NextResponse.json({ ok: true, ran: new Date().toISOString(), results });
}
