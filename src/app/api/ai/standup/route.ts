import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateJSON } from "@/lib/claude";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const yesterday = new Date(Date.now() - 86400000);
  const tomorrow  = new Date(Date.now() + 86400000);
  const now       = new Date();

  const [doneTasks, activeTasks, dueSoon, comments] = await Promise.all([
    prisma.task.findMany({
      where: { assigneeId: session.user.id, status: "DONE", updatedAt: { gte: yesterday } },
      include: { project: { select: { name: true } } },
      orderBy: { updatedAt: "desc" }, take: 10,
    }),
    prisma.task.findMany({
      where: { assigneeId: session.user.id, status: { in: ["IN_PROGRESS", "REVIEW"] } },
      include: { project: { select: { name: true } } },
      orderBy: { updatedAt: "desc" }, take: 10,
    }),
    prisma.task.findMany({
      where: { assigneeId: session.user.id, status: { not: "DONE" }, dueDate: { gte: now, lte: tomorrow } },
      include: { project: { select: { name: true } } },
    }),
    prisma.comment.findMany({
      where: { authorId: session.user.id, createdAt: { gte: yesterday } },
      include: { task: { select: { title: true } } },
      take: 5,
    }),
  ]);

  const standup = await generateJSON<{
    yesterday: string[];
    today: string[];
    blockers: string[];
    highlight: string;
    mood: "great" | "good" | "okay" | "challenging";
    emoji: string;
  }>(
    [{
      role: "user",
      content: `Generate standup for ${session.user.name ?? "the user"}:
Done yesterday: ${JSON.stringify(doneTasks.map((t) => `${t.title} (${t.project?.name})`))}
Active now: ${JSON.stringify(activeTasks.map((t) => `${t.title} (${t.project?.name})`))}
Due soon: ${JSON.stringify(dueSoon.map((t) => `${t.title} due ${t.dueDate}`))}
Recent comments: ${JSON.stringify(comments.map((c) => `on "${c.task.title}"`))}`,
    }],
    `You are a standup assistant. Generate a friendly, concise standup report.
Return JSON (no fences):
{
  "yesterday": ["bullet point of what was accomplished"],
  "today": ["bullet point of planned work"],
  "blockers": ["any blockers, or empty array"],
  "highlight": "one positive highlight sentence",
  "mood": "great"|"good"|"okay"|"challenging",
  "emoji": "single emoji matching the mood"
}
Be specific, reference actual task names. Keep each bullet under 80 chars. Return ONLY JSON.`,
    true
  );

  return NextResponse.json({
    standup,
    stats: { done: doneTasks.length, active: activeTasks.length, dueSoon: dueSoon.length },
    generatedAt: new Date().toISOString(),
  });
}
