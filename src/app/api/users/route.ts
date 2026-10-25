import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg, isOrgError } from "@/lib/org";
import { hasPermissionAsync } from "@/lib/permissions";

export async function GET() {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;

  if (!(await hasPermissionAsync(ctx.orgRole, ctx.orgId, "users:manage"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const members = await prisma.organizationMember.findMany({
    where: { organizationId: ctx.orgId },
    include: { user: { select: { id: true, name: true, email: true, image: true, role: true } } },
    orderBy: { joinedAt: "asc" },
  });

  return NextResponse.json(members.map((m) => ({ ...m.user, orgRole: m.role })));
}

export async function PUT(req: NextRequest) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId, orgRole, userId: actorId } = ctx;

  if (!(await hasPermissionAsync(orgRole, orgId, "users:manage"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { userId?: unknown; role?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const targetId = typeof body.userId === "string" ? body.userId : "";
  const role = typeof body.role === "string" ? body.role : "";
  if (!targetId || !["ADMIN", "MANAGER", "MEMBER"].includes(role)) {
    return NextResponse.json({ error: "Invalid user or role" }, { status: 400 });
  }

  // Only the workspace OWNER may grant or change ADMIN privileges.
  if (role === "ADMIN" && orgRole !== "OWNER") {
    return NextResponse.json({ error: "Only the workspace owner can assign ADMIN" }, { status: 403 });
  }

  const target = await prisma.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId: orgId, userId: targetId } },
    select: { userId: true, role: true },
  });
  if (!target) return NextResponse.json({ error: "Workspace member not found" }, { status: 404 });
  if (target.role === "OWNER") {
    return NextResponse.json({ error: "The workspace owner role cannot be changed here" }, { status: 403 });
  }
  if (target.role === "ADMIN" && orgRole !== "OWNER") {
    return NextResponse.json({ error: "Only the workspace owner can change an ADMIN role" }, { status: 403 });
  }

  const updated = await prisma.organizationMember.update({
    where: { organizationId_userId: { organizationId: orgId, userId: targetId } },
    data: { role },
    include: { user: { select: { id: true, name: true, email: true, image: true, role: true } } },
  });

  return NextResponse.json({ ...updated.user, orgRole: updated.role });
}
