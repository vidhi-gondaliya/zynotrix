import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateJSON } from "@/lib/claude";

interface AITask {
  title: string;
  description: string;
  priority: "URGENT" | "HIGH" | "MEDIUM" | "LOW";
  status: string;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, description, boardColumns } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Project name required" }, { status: 400 });

  const firstColId: string = boardColumns?.[0]?.id ?? "BACKLOG";
  const colList: string = boardColumns?.map((c: { id: string; label: string }) => `${c.id} (${c.label})`).join(", ") ?? "BACKLOG";

  const prompt = `Project: "${name}". Description: "${description ?? "No description provided"}".

Generate 6–8 realistic starter tasks for this project. Distribute tasks across these board columns: ${colList}.

Return ONLY a JSON array (no markdown fences):
[
  {
    "title": "<concise task title, max 60 chars>",
    "description": "<one sentence about what needs to be done>",
    "priority": "<URGENT|HIGH|MEDIUM|LOW>",
    "status": "<use one of the column IDs listed above>"
  }
]

Rules:
- Make tasks specific to this project, not generic
- Use varied priorities (mostly MEDIUM and HIGH, 1-2 URGENT max)
- Spread across multiple columns — put planning tasks in early columns, deliverables in progress columns
- Default to "${firstColId}" for tasks that haven't started yet`;

  try {
    const tasks = await generateJSON<AITask[]>(
      [{ role: "user", content: prompt }],
      "You are an experienced project manager who creates actionable, specific task lists. Generate realistic tasks that a real team would actually work on for this project type.",
      true
    );

    // Sanitise and cap at 10
    const valid = ["URGENT", "HIGH", "MEDIUM", "LOW"];
    const sanitised = tasks.slice(0, 10).map((t) => ({
      title: String(t.title ?? "").slice(0, 120),
      description: String(t.description ?? ""),
      priority: valid.includes(t.priority) ? t.priority : "MEDIUM",
      status: String(t.status ?? firstColId),
    }));

    return NextResponse.json(sanitised);
  } catch {
    return NextResponse.json({ error: "Failed to generate tasks" }, { status: 500 });
  }
}
