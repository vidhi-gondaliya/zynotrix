import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg, isOrgError } from "@/lib/org";

type Params = { params: { dashboardId: string } };

export async function GET(_: NextRequest, { params }: Params) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId, userId } = ctx;

  const dashboard = await (prisma as any).dashboard.findFirst({
    where: { id: params.dashboardId, organizationId: orgId, userId },
  });
  if (!dashboard) return NextResponse.json({ error: "Dashboard not found." }, { status: 404 });
  return NextResponse.json(dashboard);
}

export async function PUT(req: NextRequest, { params }: Params) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId, userId } = ctx;

  const dashboard = await (prisma as any).dashboard.findFirst({
    where: { id: params.dashboardId, organizationId: orgId, userId },
  });
  if (!dashboard) return NextResponse.json({ error: "Dashboard not found." }, { status: 404 });

  const body = await req.json();
  const updated = await (prisma as any).dashboard.update({
    where: { id: params.dashboardId },
    data: {
      title:  body.title  !== undefined ? body.title  : dashboard.title,
      layout: body.layout !== undefined ? (typeof body.layout === "string" ? body.layout : JSON.stringify(body.layout)) : dashboard.layout,
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId, userId } = ctx;

  const dashboard = await (prisma as any).dashboard.findFirst({
    where: { id: params.dashboardId, organizationId: orgId, userId },
  });
  if (!dashboard) return NextResponse.json({ error: "Dashboard not found." }, { status: 404 });
  if (dashboard.isDefault) {
    return NextResponse.json({ error: "Cannot delete the default dashboard." }, { status: 400 });
  }

  await (prisma as any).dashboard.delete({ where: { id: params.dashboardId } });
  return NextResponse.json({ success: true });
}
