import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST — apply template to a new project
export async function POST(req: NextRequest, { params }: { params: { templateId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectName, color } = await req.json();
  const template = await (prisma as any).projectTemplate.findUnique({ where: { id: params.templateId } });
  if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });

  const config = JSON.parse(template.config);

  const project = await prisma.project.create({
    data: {
      name: projectName ?? template.name,
      description: template.description ?? "",
      color: color ?? template.color,
      ownerId: session.user.id,
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
        creatorId: session.user.id,
      })),
    });
  }

  // increment usage count
  await (prisma as any).projectTemplate.update({
    where: { id: params.templateId },
    data: { usageCount: { increment: 1 } },
  });

  return NextResponse.json({ project }, { status: 201 });
}
