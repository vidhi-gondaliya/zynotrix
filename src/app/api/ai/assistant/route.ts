import { NextRequest, NextResponse } from "next/server";
import { streamToResponse, SYSTEM_PROMPTS } from "@/lib/claude";
import { prisma } from "@/lib/prisma";
import { requireOrg, isOrgError } from "@/lib/org";

export async function POST(req: NextRequest) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId } = ctx;

  const { messages, projectId, context: pageContext } = await req.json();

  let contextBlock = "";
  if (projectId) {
    // Verify the project belongs to this org before exposing data to AI
    const project = await prisma.project.findUnique({
      where: { id: projectId, organizationId: orgId },
      include: {
        tasks: {
          include: { assignee: { select: { name: true } } },
          orderBy: { updatedAt: "desc" },
          take: 20,
        },
        _count: { select: { tasks: true } },
      },
    });

    if (project) {
      const taskSummary = project.tasks
        .map((t) => `- [${t.status}] ${t.title} (${t.priority}, assignee: ${t.assignee?.name ?? "unassigned"})`)
        .join("\n");
      contextBlock = `\n\n## Current Project Context\nProject: ${project.name}\nStatus: ${project.status}\nTotal Tasks: ${project._count.tasks}\n\nRecent Tasks:\n${taskSummary}`;
    }
  }

  const extraContext = pageContext ? `\n\n## Page Context\n${pageContext}` : "";
  return streamToResponse(messages, SYSTEM_PROMPTS.assistant + contextBlock + extraContext);
}
