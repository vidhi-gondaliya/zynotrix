import { NextRequest, NextResponse } from "next/server";
import { requireOrg, isOrgError } from "@/lib/org";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { projectId: string } }) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const project = await prisma.project.findFirst({ where: { id: params.projectId, organizationId: ctx.orgId }, select: { id: true } });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

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
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const project = await prisma.project.findFirst({ where: { id: params.projectId, organizationId: ctx.orgId }, select: { id: true } });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }
  const { name, goal, startDate, endDate } = body ?? {};
  if (typeof name !== "string" || !name.trim() || name.trim().length > 120 || !startDate || !endDate) return NextResponse.json({ error: "Valid name, startDate, and endDate are required" }, { status: 400 });
  const start = new Date(startDate), end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return NextResponse.json({ error: "Invalid sprint date range" }, { status: 400 });

  const sprint = await (prisma as any).sprint.create({
    data: {
      projectId: params.projectId,
      name: name.trim(),
      goal: typeof goal === "string" ? goal.trim().slice(0, 2000) || null : null,
      startDate: start,
      endDate: end,
      status: "PLANNING",
    },
  });

  return NextResponse.json(sprint, { status: 201 });
}
