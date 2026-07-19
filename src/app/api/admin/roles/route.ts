import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg, isOrgError } from "@/lib/org";
import { DEFAULT_ROLE_PERMISSIONS } from "@/lib/permissions";

const SYSTEM_ROLES = [
  { name: "ADMIN",   label: "Admin",   color: "#60A5FA", description: "Manage users and all resources",   permissions: ["*"] },
  { name: "MANAGER", label: "Manager", color: "#34D399", description: "Manage projects and assign tasks", permissions: DEFAULT_ROLE_PERMISSIONS["MANAGER"] ?? [] },
  { name: "MEMBER",  label: "Member",  color: "#6B7280", description: "Create and edit own tasks",        permissions: DEFAULT_ROLE_PERMISSIONS["MEMBER"] ?? [] },
];

async function seedRolesIfEmpty(orgId: string) {
  const count = await prisma.role.count({ where: { organizationId: orgId } });
  if (count > 0) return;
  for (const r of SYSTEM_ROLES) {
    await prisma.role.create({
      data: { organizationId: orgId, name: r.name, label: r.label, color: r.color, description: r.description, permissions: JSON.stringify(r.permissions), isSystem: true },
    });
  }
}

export async function GET() {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId } = ctx;

  await seedRolesIfEmpty(orgId);
  const roles = await prisma.role.findMany({ where: { organizationId: orgId }, orderBy: { createdAt: "asc" } });
  return NextResponse.json(roles.map((r) => ({ ...r, permissions: JSON.parse(r.permissions) as string[] })));
}

export async function POST(req: NextRequest) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId } = ctx;

  const { name, label, color = "#6B7280", description = "", permissions = [] } = await req.json();
  if (!name?.trim() || !label?.trim()) return NextResponse.json({ error: "Name and label required" }, { status: 400 });

  const slug = name.toUpperCase().replace(/\s+/g, "_").replace(/[^A-Z0-9_]/g, "");
  if (!slug) return NextResponse.json({ error: "Invalid role name" }, { status: 400 });

  const existing = await prisma.role.findUnique({ where: { organizationId_name: { organizationId: orgId, name: slug } } });
  if (existing) return NextResponse.json({ error: "Role name already exists" }, { status: 409 });

  const role = await prisma.role.create({
    data: { organizationId: orgId, name: slug, label: label.trim(), color, description, permissions: JSON.stringify(permissions), isSystem: false },
  });

  return NextResponse.json({ ...role, permissions: JSON.parse(role.permissions) }, { status: 201 });
}
