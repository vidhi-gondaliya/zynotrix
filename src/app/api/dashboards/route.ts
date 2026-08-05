import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg, isOrgError } from "@/lib/org";

const DEFAULT_LAYOUT = JSON.stringify([
  { id: "w1", type: "task_completion",  title: "Task Completion (7 days)", w: 2, h: 1 },
  { id: "w2", type: "project_health",   title: "Project Health",           w: 1, h: 1 },
  { id: "w3", type: "team_workload",    title: "Team Workload",             w: 1, h: 1 },
  { id: "w4", type: "overdue_tasks",    title: "Overdue Tasks",             w: 1, h: 1 },
  { id: "w5", type: "goals_progress",   title: "Goals Progress",            w: 1, h: 1 },
  { id: "w6", type: "recent_activity",  title: "Recent Activity",           w: 2, h: 1 },
]);

export async function GET() {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId, userId } = ctx;

  let dashboards = await (prisma as any).dashboard.findMany({
    where: { organizationId: orgId, userId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });

  // Auto-create default dashboard on first visit
  if (dashboards.length === 0) {
    const def = await (prisma as any).dashboard.create({
      data: {
        organizationId: orgId,
        userId,
        title:     "My Dashboard",
        isDefault: true,
        layout:    DEFAULT_LAYOUT,
      },
    });
    dashboards = [def];
  }

  return NextResponse.json(dashboards);
}

export async function POST(req: NextRequest) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId, userId } = ctx;

  const body = await req.json();
  if (!body.title?.trim()) {
    return NextResponse.json({ error: "Dashboard title is required." }, { status: 400 });
  }

  const dashboard = await (prisma as any).dashboard.create({
    data: {
      organizationId: orgId,
      userId,
      title:  body.title.trim(),
      layout: body.layout ?? DEFAULT_LAYOUT,
    },
  });
  return NextResponse.json(dashboard, { status: 201 });
}
