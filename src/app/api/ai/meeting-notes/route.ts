import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateJSON } from "@/lib/claude";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { transcript, meetingId, projectId, autoCreateTasks } = await req.json();
  if (!transcript?.trim()) return NextResponse.json({ error: "Transcript required" }, { status: 400 });

  const notes = await generateJSON<{
    title: string;
    summary: string;
    keyDecisions: string[];
    actionItems: { task: string; owner: string | null; dueDate: string | null; priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT" }[];
    followUps: string[];
    sentiment: "positive" | "neutral" | "negative";
    durationEstimate: string;
  }>(
    [{ role: "user", content: `Meeting transcript:\n\n${transcript}` }],
    `You are a meeting notes expert. Analyze the transcript and extract structured notes.
Return JSON (no fences):
{
  "title": "short meeting title inferred from content",
  "summary": "2-3 sentence executive summary",
  "keyDecisions": ["decisions made"],
  "actionItems": [{ "task": "what to do", "owner": "person name or null", "dueDate": "YYYY-MM-DD or null", "priority": "LOW|MEDIUM|HIGH|URGENT" }],
  "followUps": ["questions or topics for next meeting"],
  "sentiment": "positive|neutral|negative",
  "durationEstimate": "estimated meeting length e.g. '45 min'"
}
Today is ${new Date().toISOString().split("T")[0]}.
Be concise but comprehensive. Return ONLY JSON.`,
    false
  );

  let createdTasks: { id: string; title: string }[] = [];

  if (autoCreateTasks && notes.actionItems.length > 0 && projectId) {
    createdTasks = await Promise.all(
      notes.actionItems.map(async (item) => {
        const task = await prisma.task.create({
          data: {
            title: item.task,
            priority: item.priority,
            status: "TODO",
            dueDate: item.dueDate ? new Date(item.dueDate) : null,
            tags: JSON.stringify(["meeting-action"]),
            projectId,
            assigneeId: session.user.id,
            creatorId: session.user.id,
          },
        });
        return { id: task.id, title: task.title };
      })
    );
  }

  // Optionally update the meeting with notes
  if (meetingId) {
    try {
      await prisma.meeting.update({
        where: { id: meetingId },
        data: { notes: `## ${notes.title}\n\n${notes.summary}\n\n### Key Decisions\n${notes.keyDecisions.map((d) => `- ${d}`).join("\n")}\n\n### Action Items\n${notes.actionItems.map((a) => `- [ ] ${a.task}${a.owner ? ` (@${a.owner})` : ""}`).join("\n")}` },
      });
    } catch {}
  }

  return NextResponse.json({ notes, createdTasks });
}
