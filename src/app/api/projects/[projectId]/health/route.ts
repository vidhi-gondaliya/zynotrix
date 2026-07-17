import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateJSON, SYSTEM_PROMPTS } from "@/lib/claude";
import type { HealthAnalysis } from "@/types";

export async function GET(_req: NextRequest, { params }: { params: { projectId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const project = await prisma.project.findUnique({
    where: { id: params.projectId },
    include: { tasks: true },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const total = project.tasks.length;
  const done = project.tasks.filter((t) => t.status === "DONE").length;
  const overdue = project.tasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "DONE").length;
  const urgent = project.tasks.filter((t) => t.priority === "URGENT" && t.status !== "DONE").length;
  const inProgress = project.tasks.filter((t) => t.status === "IN_PROGRESS").length;
  const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;
  const onTimeRate = total > 0 ? Math.max(0, Math.round(((total - overdue) / total) * 100)) : 100;

  const deadlineDaysLeft = project.deadline
    ? Math.ceil((new Date(project.deadline).getTime() - Date.now()) / 86400000)
    : null;

  const metricsText = `
Project: ${project.name}
Status: ${project.status}
Total Tasks: ${total}
Completed: ${done} (${completionRate}%)
In Progress: ${inProgress}
Overdue: ${overdue}
Urgent/Blockers: ${urgent}
On-time Rate: ${onTimeRate}%
Deadline Days Left: ${deadlineDaysLeft ?? "No deadline set"}
Budget: ${project.budget ? `$${project.budget}` : "Not set"}
`;

  const analysis = await generateJSON<HealthAnalysis>(
    [{ role: "user", content: metricsText }],
    SYSTEM_PROMPTS.healthScore,
    true
  );

  await prisma.project.update({
    where: { id: params.projectId },
    data: {
      healthScore: analysis.score,
      healthData: JSON.stringify(analysis),
    },
  });

  return NextResponse.json(analysis);
}
