import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { streamToResponse } from "@/lib/claude";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, clientName, status } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Project name required" }, { status: 400 });

  const context = [
    clientName ? `Client: ${clientName}` : null,
    status ? `Status: ${status}` : null,
  ].filter(Boolean).join(", ");

  const prompt = `Write a concise 2–3 sentence project description for a project named "${name}"${context ? ` (${context})` : ""}. Cover the main goal, key deliverables, and expected outcome. Plain text only, no bullet points or markdown.`;

  return streamToResponse(
    [{ role: "user", content: prompt }],
    "You are a professional project manager who writes clear, specific project descriptions. Be direct and concrete — no filler phrases like 'This project aims to'. Start with what the project delivers.",
    true
  );
}
