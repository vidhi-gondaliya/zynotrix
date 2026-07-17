import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { streamToResponse, SYSTEM_PROMPTS } from "@/lib/claude";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { messages, projectId, context: pageContext } = await req.json();

  let contextBlock = "";
  if (projectId) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
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
