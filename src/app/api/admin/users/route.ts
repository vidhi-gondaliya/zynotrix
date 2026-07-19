import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg, isOrgError } from "@/lib/org";
import bcrypt from "bcryptjs";

export async function GET() {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId } = ctx;

  // Only return members of this organization
  const members = await prisma.organizationMember.findMany({
    where: { organizationId: orgId },
    include: { user: { select: { id: true, name: true, email: true, image: true, role: true, createdAt: true } } },
    orderBy: { joinedAt: "asc" },
  });

  return NextResponse.json(members.map((m) => ({ ...m.user, orgRole: m.role })));
}

export async function POST(req: NextRequest) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId } = ctx;

  const { name, email, password, role = "MEMBER" } = await req.json();
  if (!email?.trim() || !password) return NextResponse.json({ error: "Email and password required" }, { status: 400 });

  const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (existing) {
    // If user exists but not in this org, add them
    const alreadyMember = await prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId: existing.id } },
    });
    if (alreadyMember) return NextResponse.json({ error: "User already in this workspace" }, { status: 409 });
    await prisma.organizationMember.create({ data: { organizationId: orgId, userId: existing.id, role } });
    return NextResponse.json({ ...existing, orgRole: role }, { status: 201 });
  }

  const hash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      name: name?.trim() || null,
      email: email.trim().toLowerCase(),
      passwordHash: hash,
      role,
      organizationMembers: { create: { organizationId: orgId, role } },
    },
    select: { id: true, name: true, email: true, image: true, role: true, createdAt: true },
  });

  return NextResponse.json({ ...user, orgRole: role }, { status: 201 });
}
