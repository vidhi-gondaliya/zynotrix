import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg, isOrgError } from "@/lib/org";

export async function GET(_req: NextRequest, { params }: { params: { taskId: string } }) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const task = await prisma.task.findFirst({
    where: { id: params.taskId, project: { organizationId: ctx.orgId } },
    select: { id: true },
  });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    const activities = await prisma.taskActivity.findMany({
      where: { taskId: task.id, task: { project: { organizationId: ctx.orgId } } },
      include: { user: { select: { id: true, name: true, image: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json(activities.map((activity) => {
      let meta: unknown = {};
      try { meta = JSON.parse(activity.meta); } catch { /* tolerate legacy malformed metadata */ }
      return { ...activity, meta };
    }));
  } catch {
    return NextResponse.json({ error: "Unable to load task activity right now." }, { status: 500 });
  }
}
