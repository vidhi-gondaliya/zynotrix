import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg, isOrgError } from "@/lib/org";
import { hasPermissionAsync, ROLES } from "@/lib/permissions";
import bcrypt from "bcryptjs";

export async function GET() {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  if (!(await hasPermissionAsync(ctx.orgRole, ctx.orgId, "users:manage"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const members = await prisma.organizationMember.findMany({
    where: { organizationId: ctx.orgId },
    include: { user: { select: { id: true, name: true, email: true, image: true, role: true, createdAt: true } } },
    orderBy: { joinedAt: "asc" },
  });

  return NextResponse.json(members.map((m) => ({ ...m.user, orgRole: m.role })));
}

export async function POST(req: NextRequest) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId, orgRole } = ctx;

  if (!(await hasPermissionAsync(orgRole, orgId, "users:manage"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { name?: unknown; email?: unknown; password?: unknown; role?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const role = typeof body.role === "string" ? body.role : "MEMBER";

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password) {
    return NextResponse.json({ error: "A valid email and password are required" }, { status: 400 });
  }
  if (password.length < 12 || password.length > 128) {
    return NextResponse.json({ error: "Password must be between 12 and 128 characters" }, { status: 400 });
  }
  if (!(ROLES as readonly string[]).includes(role)) {
    return NextResponse.json({ error: "Invalid workspace role" }, { status: 400 });
  }

  // ADMINs may manage ordinary members but cannot grant OWNER/ADMIN access.
  // Only an OWNER may assign OWNER or ADMIN.
  if ((role === "OWNER" || role === "ADMIN") && orgRole !== "OWNER") {
    return NextResponse.json({ error: "Only the workspace owner can assign this role" }, { status: 403 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const alreadyMember = await prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId: existing.id } },
    });
    if (alreadyMember) return NextResponse.json({ error: "User already in this workspace" }, { status: 409 });

    const member = await prisma.organizationMember.create({
      data: { organizationId: orgId, userId: existing.id, role },
    });
    return NextResponse.json({ id: existing.id, name: existing.name, email: existing.email, image: existing.image, orgRole: member.role }, { status: 201 });
  }

  const hash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      name: name || null,
      email,
      passwordHash: hash,
      organizationMembers: { create: { organizationId: orgId, role } },
    },
    select: { id: true, name: true, email: true, image: true, createdAt: true },
  });

  return NextResponse.json({ ...user, orgRole: role }, { status: 201 });
}
