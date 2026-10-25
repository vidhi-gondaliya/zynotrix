import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.organizationMember.findFirst({ where: { userId: session.user.id } });
  if (existing) return NextResponse.json({ error: "Already in a workspace" }, { status: 400 });

  let body: { name?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 100) {
    return NextResponse.json({ error: "Workspace name must be between 1 and 100 characters" }, { status: 400 });
  }

  const baseSlug = toSlug(name) || `workspace-${session.user.id.slice(0, 8).toLowerCase()}`;
  let slug = baseSlug;
  let i = 1;
  while (await prisma.organization.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${i++}`;
  }

  // Create the workspace and its baseline data atomically. A failure during
  // setup rolls back the workspace rather than leaving a partially configured org.
  const org = await prisma.$transaction(async (tx) => {
    const created = await tx.organization.create({
      data: {
        name,
        slug,
        members: { create: { userId: session.user!.id, role: "OWNER" } },
      },
    });

    await tx.role.createMany({
      data: [
        { organizationId: created.id, name: "ADMIN", label: "Admin", color: "#F43F5E", permissions: JSON.stringify(["*"]), isSystem: true },
        { organizationId: created.id, name: "MANAGER", label: "Manager", color: "#F59E0B", permissions: JSON.stringify(["projects.create", "tasks.create", "tasks.assign", "members.view"]), isSystem: true },
        { organizationId: created.id, name: "MEMBER", label: "Member", color: "#6B7280", permissions: JSON.stringify(["tasks.create", "tasks.view", "members.view"]), isSystem: true },
      ],
    });

    await tx.rewardConfig.createMany({
      data: [
        { organizationId: created.id, role: "MEMBER", action: "task_complete", points: 10, isEnabled: true },
        { organizationId: created.id, role: "MEMBER", action: "task_early", points: 5, isEnabled: true },
        { organizationId: created.id, role: "MEMBER", action: "attendance", points: 2, isEnabled: true },
        { organizationId: created.id, role: "MANAGER", action: "task_complete", points: 15, isEnabled: true },
        { organizationId: created.id, role: "ADMIN", action: "task_complete", points: 20, isEnabled: true },
      ],
    });

    await tx.channel.create({
      data: {
        name: "general",
        description: "General discussion for the whole workspace",
        isGeneral: true,
        organizationId: created.id,
        members: { create: { userId: session.user!.id } },
      },
    });

    return created;
  });

  return NextResponse.json({ id: org.id, slug: org.slug, name: org.name }, { status: 201 });
}
