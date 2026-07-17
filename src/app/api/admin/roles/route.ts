import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DEFAULT_ROLE_PERMISSIONS } from "@/lib/permissions";

interface SystemRole { name: string; label: string; color: string; description: string; isSystem: boolean; }
const SYSTEM_ROLES: SystemRole[] = [
  { name: "OWNER",   label: "Owner",   color: "#A78BFA", description: "Full access to everything",        isSystem: true },
  { name: "ADMIN",   label: "Admin",   color: "#60A5FA", description: "Manage users and all resources",   isSystem: true },
  { name: "MANAGER", label: "Manager", color: "#34D399", description: "Manage projects and assign tasks", isSystem: true },
  { name: "MEMBER",  label: "Member",  color: "#6B7280", description: "Create and edit own tasks",        isSystem: true },
];

async function seedRolesIfEmpty() {
  const count = await prisma.role.count();
  if (count > 0) return;
  for (const r of SYSTEM_ROLES) {
    await prisma.role.upsert({
      where: { name: r.name },
      update: {},
      create: {
        name:        r.name,
        label:       r.label,
        color:       r.color,
        description: r.description,
        isSystem:    r.isSystem,
        permissions: JSON.stringify(DEFAULT_ROLE_PERMISSIONS[r.name] ?? []),
      },
    });
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await seedRolesIfEmpty();

  const roles = await prisma.role.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json(roles.map((r) => ({
    ...r,
    permissions: JSON.parse(r.permissions) as string[],
  })));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, label, color = "#6B7280", description = "", permissions = [] } = await req.json();
  if (!name?.trim() || !label?.trim()) return NextResponse.json({ error: "Name and label required" }, { status: 400 });

  const slug = name.toUpperCase().replace(/\s+/g, "_").replace(/[^A-Z0-9_]/g, "");
  if (!slug) return NextResponse.json({ error: "Invalid role name" }, { status: 400 });

  const existing = await prisma.role.findUnique({ where: { name: slug } });
  if (existing) return NextResponse.json({ error: "Role name already exists" }, { status: 409 });

  const role = await prisma.role.create({
    data: { name: slug, label: label.trim(), color, description, permissions: JSON.stringify(permissions), isSystem: false },
  });

  return NextResponse.json({ ...role, permissions: JSON.parse(role.permissions) }, { status: 201 });
}
