import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg, isOrgError } from "@/lib/org";

export async function GET() {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId } = ctx;

  const projects = await prisma.project.findMany({
    where: { organizationId: orgId, isPersonal: false, status: { not: "ARCHIVED" } },
    include: {
      owner:   { select: { id: true, name: true, image: true, email: true } },
      members: { include: { user: { select: { id: true, name: true, image: true, email: true } } } },
      tasks:   { select: { id: true, status: true, priority: true, dueDate: true } },
      sprints: { where: { status: "ACTIVE" }, take: 1, orderBy: { startDate: "desc" } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const now = new Date();

  const enriched = projects.map((p) => {
    const total      = p.tasks.length;
    const done       = p.tasks.filter((t) => t.status === "DONE").length;
    const inProgress = p.tasks.filter((t) => t.status === "IN_PROGRESS").length;
    const todo       = p.tasks.filter((t) => ["BACKLOG", "TODO"].includes(t.status)).length;
    const overdue    = p.tasks.filter(
      (t) => t.dueDate && new Date(t.dueDate) < now && t.status !== "DONE"
    ).length;
    const progress   = total > 0 ? Math.round((done / total) * 100) : 0;

    // Health: GOOD if no overdue + progress on track, AT_RISK if some overdue, OFF_TRACK if deadline passed or many overdue
    let health: "ON_TRACK" | "AT_RISK" | "OFF_TRACK" = "ON_TRACK";
    if (p.deadline && new Date(p.deadline) < now && p.status !== "COMPLETED") {
      health = "OFF_TRACK";
    } else if (overdue > 0 || (p.deadline && new Date(p.deadline) < new Date(now.getTime() + 7 * 86400000) && progress < 80)) {
      health = "AT_RISK";
    }

    const { tasks: _t, members: _m, ...rest } = p;
    return {
      ...rest,
      total, done, inProgress, todo, overdue, progress, health,
      members: p.members.map((m) => m.user),
    };
  });

  const summary = {
    total:    enriched.length,
    onTrack:  enriched.filter((p) => p.health === "ON_TRACK").length,
    atRisk:   enriched.filter((p) => p.health === "AT_RISK").length,
    offTrack: enriched.filter((p) => p.health === "OFF_TRACK").length,
  };

  return NextResponse.json({ projects: enriched, summary });
}
