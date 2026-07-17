import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateJSON } from "@/lib/claude";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, description } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Project name required" }, { status: 400 });

  const prompt = `Project name: "${name}". Description: "${description ?? ""}".

Pick the single best Kanban board template from this list:
- simple: Clean 3-stage flow (Backlog → To Do → In Progress). Best for general projects.
- development: Engineering workflow with Planning and Testing phases. Best for software/tech projects.
- marketing: Content pipeline with Content Creation, Design, Approval stages. Best for marketing/content.
- agile: Scrum-based with Product Backlog and Sprint Backlog. Best for agile teams.
- design: UI/UX workflow with Design and Revisions stages. Best for design projects.

Return ONLY this JSON (no markdown fences):
{"templateId":"<one of: simple|development|marketing|agile|design>","reason":"<one short sentence, max 10 words, why this fits>"}`;

  try {
    const result = await generateJSON<{ templateId: string; reason: string }>(
      [{ role: "user", content: prompt }],
      "You are a project workflow expert. Pick the most appropriate Kanban board template based on the project context. Return only the JSON object requested.",
      true
    );
    // Validate templateId is one of the known values
    const valid = ["simple", "development", "marketing", "agile", "design"];
    if (!valid.includes(result.templateId)) result.templateId = "simple";
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ templateId: "simple", reason: "General-purpose workflow for any project" });
  }
}
