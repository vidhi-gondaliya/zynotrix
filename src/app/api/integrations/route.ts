import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg, isOrgError } from "@/lib/org";

export async function GET() {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId } = ctx;

  const integrations = await (prisma as any).integration.findMany({
    where: { organizationId: orgId },
    orderBy: { type: "asc" },
  });

  return NextResponse.json(integrations.map((i: any) => ({ ...i, config: JSON.parse(i.config) })));
}

export async function POST(req: NextRequest) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId, userId } = ctx;

  const { type, config, isActive } = await req.json();
  if (!type) return NextResponse.json({ error: "type required" }, { status: 400 });

  const integration = await (prisma as any).integration.upsert({
    where:  { organizationId_type: { organizationId: orgId, type } },
    update: { config: JSON.stringify(config ?? {}), isActive: isActive ?? true, updatedAt: new Date() },
    create: { userId, organizationId: orgId, type, config: JSON.stringify(config ?? {}), isActive: isActive ?? true },
  });

  return NextResponse.json({ ...integration, config: JSON.parse(integration.config) });
}

export async function DELETE(req: NextRequest) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId } = ctx;

  const { type } = await req.json();
  await (prisma as any).integration.delete({
    where: { organizationId_type: { organizationId: orgId, type } },
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
