import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg, isOrgError } from "@/lib/org";
import { hasPermissionAsync } from "@/lib/permissions";

const DEFAULT_CONFIGS = [
  { role: "MEMBER",  action: "task_complete", points: 10, isEnabled: true },
  { role: "MEMBER",  action: "task_early",    points: 5,  isEnabled: true },
  { role: "MEMBER",  action: "attendance",    points: 2,  isEnabled: true },
  { role: "MANAGER", action: "task_complete", points: 15, isEnabled: true },
  { role: "ADMIN",   action: "task_complete", points: 20, isEnabled: true },
];

async function seedIfEmpty(orgId: string) {
  const count = await prisma.rewardConfig.count({ where: { organizationId: orgId } });
  if (count > 0) return;
  await prisma.rewardConfig.createMany({
    data: DEFAULT_CONFIGS.map((c) => ({ ...c, organizationId: orgId })),
  });
}

export async function GET() {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId, orgRole } = ctx;
  if (!await hasPermissionAsync(orgRole, orgId, "admin:access")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await seedIfEmpty(orgId);
  const configs = await prisma.rewardConfig.findMany({ where: { organizationId: orgId }, orderBy: [{ role: "asc" }, { action: "asc" }] });
  return NextResponse.json(configs);
}

export async function PUT(req: NextRequest) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId, orgRole } = ctx;
  if (!await hasPermissionAsync(orgRole, orgId, "admin:access")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const updates: { role: string; action: string; points: number; isEnabled: boolean }[] = await req.json();

  await Promise.all(
    updates.map((u) =>
      prisma.rewardConfig.upsert({
        where:  { organizationId_role_action: { organizationId: orgId, role: u.role, action: u.action } },
        update: { points: u.points, isEnabled: u.isEnabled },
        create: { organizationId: orgId, role: u.role, action: u.action, points: u.points, isEnabled: u.isEnabled },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
