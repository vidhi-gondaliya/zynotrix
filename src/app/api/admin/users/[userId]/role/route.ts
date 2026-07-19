import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg, isOrgError } from "@/lib/org";

export async function PUT(req: NextRequest, { params }: { params: { userId: string } }) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId, orgRole } = ctx;

  if (!["ADMIN"].includes(orgRole)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { role } = await req.json();
  if (!role) return NextResponse.json({ error: "Role required" }, { status: 400 });

  // Verify role exists in this org
  const roleRecord = await prisma.role.findFirst({ where: { organizationId: orgId, name: role } });
  if (!roleRecord) return NextResponse.json({ error: "Unknown role" }, { status: 400 });

  // Update the org membership role
  const member = await prisma.organizationMember.update({
    where: { organizationId_userId: { organizationId: orgId, userId: params.userId } },
    data: { role },
    include: { user: { select: { id: true, name: true, email: true, image: true, role: true, createdAt: true } } },
  });

  return NextResponse.json({ ...member.user, orgRole: member.role });
}
