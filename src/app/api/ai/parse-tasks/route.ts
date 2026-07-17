import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateJSON } from "@/lib/claude";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { text, projectId } = await req.json();
  if (!text?.trim()) return NextResponse.json({ error: "Text required" }, { status: 400 });

  const tasks = await generateJSON<{
    title: string; description: string; priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    status: "BACKLOG" | "TODO" | "IN_PROGRESS"; dueDate: string | null;
    tags: string[]; estimatedHours: number | null;
  }[]>(
    [{ role: "user", content: `Parse this into tasks:\n\n${text}` }],
    `You are a task parser. Given plain-English input, extract ALL tasks, sub-tasks, and action items mentioned.
Return a JSON array (no markdown fences). Each task:
{
  "title": "short action-oriented title",
  "description": "more detail if mentioned, else empty string",
  "priority": "LOW"|"MEDIUM"|"HIGH"|"URGENT",
  "status": "BACKLOG"|"TODO"|"IN_PROGRESS",
  "dueDate": "YYYY-MM-DD or null",
  "tags": ["array", "of", "tags"],
  "estimatedHours": number or null
}
Today is ${new Date().toISOString().split("T")[0]}.
Infer priority from words like "urgent", "ASAP", "critical" → URGENT; "important" → HIGH; default → MEDIUM.
Infer dueDate from relative expressions like "by Friday", "next week", "tomorrow", etc.
Return ONLY the JSON array.`,
    true
  );

  // Create tasks in DB
  const { prisma } = await import("@/lib/prisma");

  // Resolve projectId — Task.projectId is required; fall back to user's first project
  let resolvedProjectId: string = projectId;
  if (!resolvedProjectId) {
    const fallback = await prisma.project.findFirst({
      where: { OR: [{ ownerId: session.user.id }, { members: { some: { userId: session.user.id } } }] },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });
    if (!fallback) return NextResponse.json({ error: "No project found. Create a project first." }, { status: 400 });
    resolvedProjectId = fallback.id;
  }

  const created = await Promise.all(
    tasks.map((t) =>
      prisma.task.create({
        data: {
          title: t.title,
          description: t.description || "",
          priority: t.priority,
          status: t.status,
          dueDate: t.dueDate ? new Date(t.dueDate) : null,
          tags: JSON.stringify(t.tags || []),
          projectId: resolvedProjectId,
          assigneeId: session.user.id,
          creatorId: session.user.id,
        },
        include: { project: { select: { id: true, name: true, color: true } } },
      })
    )
  );

  return NextResponse.json({ tasks: created, parsed: tasks });
}
