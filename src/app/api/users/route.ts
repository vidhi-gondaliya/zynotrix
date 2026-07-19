import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg, isOrgError } from "@/lib/org";

export async function GET() {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId } = ctx;

  const members = await prisma.organizationMember.findMany({
    where: { organizationId: orgId },
    include: { user: { select: { id: true, name: true, email: true, image: true, role: true } } },
    orderBy: { joinedAt: "asc" },
  });

  return NextResponse.json(members.map((m) => ({ ...m.user, orgRole: m.role })));
}

export async function PUT(req: NextRequest) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId, orgRole } = ctx;

  if (!["ADMIN"].includes(orgRole)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId, role } = await req.json();
  if (!["ADMIN", "MANAGER", "MEMBER"].includes(role)) return NextResponse.json({ error: "Invalid role" }, { status: 400 });

  const updated = await prisma.organizationMember.update({
    where: { organizationId_userId: { organizationId: orgId, userId } },
    data:  { role },
    include: { user: { select: { id: true, name: true, email: true, image: true, role: true } } },
  });

  return NextResponse.json({ ...updated.user, orgRole: updated.role });
}
