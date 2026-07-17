import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: { roleId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { label, color, description, permissions } = await req.json();

  const role = await prisma.role.update({
    where: { id: params.roleId },
    data: {
      ...(label       !== undefined ? { label }       : {}),
      ...(color       !== undefined ? { color }       : {}),
      ...(description !== undefined ? { description } : {}),
      ...(permissions !== undefined ? { permissions: JSON.stringify(permissions) } : {}),
    },
  });

  return NextResponse.json({ ...role, permissions: JSON.parse(role.permissions) });
}

export async function DELETE(_req: NextRequest, { params }: { params: { roleId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = await prisma.role.findUnique({ where: { id: params.roleId } });
  if (!role) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (role.isSystem) return NextResponse.json({ error: "Cannot delete system roles" }, { status: 403 });

  // Move users with this role to MEMBER
  await prisma.user.updateMany({ where: { role: role.name }, data: { role: "MEMBER" } });
  await prisma.role.delete({ where: { id: params.roleId } });

  return NextResponse.json({ ok: true });
}
