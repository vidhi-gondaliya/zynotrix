import { NextRequest, NextResponse } from "next/server";
import { requireOrg, isOrgError } from "@/lib/org";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/plan-gate";

// GET portal config for a project
export async function GET(_req: NextRequest, { params }: { params: { projectId: string } }) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId } = ctx;

  const featureErr = await requireFeature(orgId, "client_portal");
  if (featureErr) return featureErr;

  const portal = await (prisma as any).clientPortal.findUnique({
    where: { projectId: params.projectId },
  });
  return NextResponse.json(portal);
}

// POST — create/enable portal (GROWTH+ plan required)
export async function POST(_req: NextRequest, { params }: { params: { projectId: string } }) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId } = ctx;

  const featureErr = await requireFeature(orgId, "client_portal");
  if (featureErr) return featureErr;

  const portal = await (prisma as any).clientPortal.upsert({
    where: { projectId: params.projectId },
    update: { isActive: true },
    create: { projectId: params.projectId, isActive: true },
  });
  return NextResponse.json(portal);
}

// PATCH — update settings (GROWTH+ plan required)
export async function PATCH(req: NextRequest, { params }: { params: { projectId: string } }) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId } = ctx;

  const featureErr = await requireFeature(orgId, "client_portal");
  if (featureErr) return featureErr;

  const { isActive, showTasks, showHealth, showTimeline, password } = await req.json();
  const portal = await (prisma as any).clientPortal.update({
    where: { projectId: params.projectId },
    data: {
      ...(isActive !== undefined && { isActive }),
      ...(showTasks !== undefined && { showTasks }),
      ...(showHealth !== undefined && { showHealth }),
      ...(showTimeline !== undefined && { showTimeline }),
      ...(password !== undefined && { password: password || null }),
    },
  });
  return NextResponse.json(portal);
}

// DELETE — disable portal
export async function DELETE(_req: NextRequest, { params }: { params: { projectId: string } }) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;

  await (prisma as any).clientPortal.delete({ where: { projectId: params.projectId } });
  return NextResponse.json({ ok: true });
}
