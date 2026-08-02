import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg, isOrgError } from "@/lib/org";
import { hasPermission } from "@/lib/permissions";

// PATCH — toggle active / rename (any member can toggle their own automations)
export async function PATCH(req: NextRequest, { params }: { params: { automationId: string } }) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;

  const body = await req.json();
  const automation = await (prisma as any).automation.update({
    where: { id: params.automationId },
    data: {
      ...(typeof body.isActive === "boolean" ? { isActive: body.isActive } : {}),
      ...(body.name ? { name: body.name } : {}),
    },
  });
  return NextResponse.json(automation);
}

// DELETE — requires settings:access (admin+)
export async function DELETE(_req: NextRequest, { params }: { params: { automationId: string } }) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgRole } = ctx;

  if (!hasPermission(orgRole, "settings:access")) {
    return NextResponse.json({ error: "Only Admins and Owners can delete automations." }, { status: 403 });
  }

  await (prisma as any).automation.delete({ where: { id: params.automationId } });
  return NextResponse.json({ ok: true });
}
