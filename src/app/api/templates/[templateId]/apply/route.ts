import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg, isOrgError } from "@/lib/org";

export async function POST(req: NextRequest, { params }: { params: { templateId: string } }) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId, userId } = ctx;

  const { projectName, color } = await req.json();
  const template = await (prisma as any).projectTemplate.findFirst({
    where: { id: params.templateId, organizationId: orgId },
  });
  if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });

  const config = JSON.parse(template.config);

  const project = await prisma.project.create({
    data: {
      name: projectName ?? template.name,
      description: template.description ?? "",
      color: color ?? template.color,
      ownerId: userId,
      organizationId: orgId,
    },
  });

  if (config.tasks?.length > 0) {
    await prisma.task.createMany({
      data: config.tasks.map((t: any, i: number) => ({
        title: t.title,
        description: t.description ?? "",
        priority: t.priority ?? "MEDIUM",
        status: "BACKLOG",
        position: i,
        tags: t.tags ?? "[]",
        storyPoints: t.storyPoints ?? null,
        projectId: project.id,
        creatorId: userId,
      })),
    });
  }

  await (prisma as any).projectTemplate.update({
    where: { id: params.templateId },
    data: { usageCount: { increment: 1 } },
  });

  return NextResponse.json({ project }, { status: 201 });
}
