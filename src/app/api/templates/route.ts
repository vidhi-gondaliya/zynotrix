import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg, isOrgError } from "@/lib/org";

export async function GET(req: NextRequest) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId } = ctx;

  const { searchParams } = req.nextUrl;
  const category = searchParams.get("category");

  const templates = await (prisma as any).projectTemplate.findMany({
    where: {
      organizationId: orgId,
      ...(category && { category }),
    },
    include: { createdBy: { select: { id: true, name: true, image: true } } },
    orderBy: [{ usageCount: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(templates);
}

export async function POST(req: NextRequest) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId, userId } = ctx;

  const { name, description, category, color, emoji, isPublic, config, fromProjectId } = await req.json();

  let resolvedConfig = config;
  if (fromProjectId) {
    const project = await prisma.project.findUnique({
      where: { id: fromProjectId, organizationId: orgId },
      include: {
        tasks: {
          select: { title: true, description: true, priority: true, status: true, storyPoints: true, tags: true },
          orderBy: { position: "asc" },
        },
      },
    });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    resolvedConfig = {
      tasks: project.tasks.map((t: any) => ({
        title: t.title, description: t.description, priority: t.priority,
        status: "BACKLOG", tags: t.tags, storyPoints: t.storyPoints,
      })),
    };
  }

  if (!resolvedConfig) return NextResponse.json({ error: "config or fromProjectId required" }, { status: 400 });

  const template = await (prisma as any).projectTemplate.create({
    data: {
      name: name ?? "New Template",
      description: description ?? null,
      category: category ?? "general",
      color: color ?? "#9D6BFF",
      emoji: emoji ?? "📋",
      isPublic: isPublic ?? false,
      config: JSON.stringify(resolvedConfig),
      createdById: userId,
      organizationId: orgId,
    },
    include: { createdBy: { select: { id: true, name: true, image: true } } },
  });

  return NextResponse.json(template, { status: 201 });
}
