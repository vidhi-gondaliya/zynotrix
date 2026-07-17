import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { streamToResponse, SYSTEM_PROMPTS } from "@/lib/claude";
import type { SourceType } from "@/types";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { query, scope, projectId } = await req.json();

  const candidates = await prisma.searchIndex.findMany({
    where: {
      content: { contains: query.split(" ")[0] },
      ...(scope && scope !== "ALL" ? { sourceType: scope as SourceType } : {}),
      ...(projectId ? { projectId } : {}),
    },
    take: 40,
    orderBy: { createdAt: "desc" },
  });

  if (candidates.length === 0) {
    return streamToResponse(
      [{ role: "user", content: `Query: "${query}"\n\nNo results found in the database. Provide a helpful response.` }],
      SYSTEM_PROMPTS.search,
      true
    );
  }

  const excerpts = candidates
    .map((c, i) => `[${i + 1}] [${c.sourceType}] ${c.content.substring(0, 200)}`)
    .join("\n\n");

  return streamToResponse(
    [{ role: "user", content: `Query: "${query}"\n\nContent excerpts:\n${excerpts}` }],
    SYSTEM_PROMPTS.search,
    true
  );
}
