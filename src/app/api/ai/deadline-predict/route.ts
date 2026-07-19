import { NextRequest, NextResponse } from "next/server";
import { generateJSON } from "@/lib/claude";
import { prisma } from "@/lib/prisma";
import { requireOrg, isOrgError } from "@/lib/org";

export async function POST(req: NextRequest) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId } = ctx;

  const { projectId } = await req.json();

  const project = await prisma.project.findUnique({
    where: { id: projectId, organizationId: orgId },
    include: {
      tasks: {
        select: {
          id: true, title: true, status: true, priority: true,
          dueDate: true, assigneeId: true, createdAt: true, updatedAt: true,
        },
      },
    },
  });

  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const now = new Date();
  const totalTasks  = project.tasks.length;
  const doneTasks   = project.tasks.filter((t) => t.status === "DONE").length;
  const activeTasks = project.tasks.filter((t) => t.status === "IN_PROGRESS").length;
  const overdue     = project.tasks.filter((t) => t.dueDate && new Date(t.dueDate) < now && t.status !== "DONE").length;

  const twoWeeksAgo = new Date(Date.now() - 14 * 86400000);
  const recentDone  = project.tasks.filter((t) => t.status === "DONE" && t.updatedAt >= twoWeeksAgo).length;
  const weeklyVelocity = recentDone / 2;

  const result = await generateJSON<{
    predictedDate: string | null;
    confidence: "high" | "medium" | "low";
    onTrack: boolean;
    daysEarlyOrLate: number;
    risks: string[];
    recommendation: string;
    velocityNeeded: number;
  }>(
    [{
      role: "user",
      content: `Project: ${project.name}
Deadline: ${project.deadline ?? "none set"}
Total tasks: ${totalTasks}, Done: ${doneTasks}, Active: ${activeTasks}, Overdue: ${overdue}
Weekly velocity (tasks/week): ${weeklyVelocity.toFixed(1)}
Remaining tasks: ${totalTasks - doneTasks}
Today: ${now.toISOString().split("T")[0]}`
    }],
    `You are a project deadline prediction expert. Given project metrics, predict whether the project will meet its deadline.
Return JSON (no fences):
{
  "predictedDate": "YYYY-MM-DD predicted completion date based on current velocity, or null if insufficient data",
  "confidence": "high|medium|low",
  "onTrack": true|false,
  "daysEarlyOrLate": number (negative = late, positive = early, 0 = on time),
  "risks": ["risk factors"],
  "recommendation": "one clear action to take",
  "velocityNeeded": number tasks per week needed to hit deadline
}
Return ONLY JSON.`,
    true
  );

  return NextResponse.json({ ...result, project: { name: project.name, deadline: project.deadline }, stats: { totalTasks, doneTasks, activeTasks, overdue, weeklyVelocity } });
}
