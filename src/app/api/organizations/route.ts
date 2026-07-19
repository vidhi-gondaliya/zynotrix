import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Prevent creating a second org if user already has one
  const existing = await prisma.organizationMember.findFirst({ where: { userId: session.user.id } });
  if (existing) return NextResponse.json({ error: "Already in a workspace" }, { status: 400 });

  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Workspace name required" }, { status: 400 });

  const baseSlug = toSlug(name.trim());
  // Ensure slug is unique
  let slug = baseSlug;
  let i = 1;
  while (await prisma.organization.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${i++}`;
  }

  const org = await prisma.organization.create({
    data: {
      name: name.trim(),
      slug,
      members: {
        create: { userId: session.user.id, role: "ADMIN" },
      },
    },
  });

  // Seed default roles for the new org
  await prisma.role.createMany({
    data: [
      { organizationId: org.id, name: "ADMIN",   label: "Admin",   color: "#F43F5E", permissions: JSON.stringify(["*"]), isSystem: true },
      { organizationId: org.id, name: "MANAGER", label: "Manager", color: "#F59E0B", permissions: JSON.stringify(["projects.create","tasks.create","tasks.assign","members.view"]), isSystem: true },
      { organizationId: org.id, name: "MEMBER",  label: "Member",  color: "#6B7280", permissions: JSON.stringify(["tasks.create","tasks.view","members.view"]), isSystem: true },
    ],
  });

  // Seed default reward configs
  await prisma.rewardConfig.createMany({
    data: [
      { organizationId: org.id, role: "MEMBER",  action: "task_complete", points: 10, isEnabled: true },
      { organizationId: org.id, role: "MEMBER",  action: "task_early",    points: 5,  isEnabled: true },
      { organizationId: org.id, role: "MEMBER",  action: "attendance",    points: 2,  isEnabled: true },
      { organizationId: org.id, role: "MANAGER", action: "task_complete", points: 15, isEnabled: true },
      { organizationId: org.id, role: "ADMIN",   action: "task_complete", points: 20, isEnabled: true },
    ],
  });

  // Create default #general channel
  await prisma.channel.create({
    data: {
      name: "general",
      description: "General discussion for the whole workspace",
      isGeneral: true,
      organizationId: org.id,
      members: { create: { userId: session.user.id } },
    },
  });

  return NextResponse.json({ id: org.id, slug: org.slug, name: org.name }, { status: 201 });
}
