import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg, isOrgError } from "@/lib/org";
import { hasPermission } from "@/lib/permissions";

export async function GET() {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId } = ctx;

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      id: true, name: true, slug: true, logo: true, plan: true, createdAt: true,
      members: {
        select: {
          role: true, joinedAt: true,
          user: { select: { id: true, name: true, email: true, image: true } },
        },
        orderBy: { joinedAt: "asc" },
      },
    },
  });

  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(org);
}

export async function PATCH(req: NextRequest) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId, orgRole } = ctx;

  if (!hasPermission(orgRole, "admin:access")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { name, logo } = body as { name?: string; logo?: string };

  const data: Record<string, string> = {};
  if (name?.trim()) data.name = name.trim();
  if (logo !== undefined) data.logo = logo;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const org = await prisma.organization.update({ where: { id: orgId }, data });
  return NextResponse.json({ id: org.id, name: org.name, slug: org.slug, logo: org.logo });
}

// DELETE member from org
export async function DELETE(req: NextRequest) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId, orgRole, userId } = ctx;

  if (!hasPermission(orgRole, "admin:access")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { memberId } = await req.json();
  if (!memberId || memberId === userId) {
    return NextResponse.json({ error: "Cannot remove yourself" }, { status: 400 });
  }

  await prisma.organizationMember.delete({
    where: { organizationId_userId: { organizationId: orgId, userId: memberId } },
  });

  return NextResponse.json({ success: true });
}
