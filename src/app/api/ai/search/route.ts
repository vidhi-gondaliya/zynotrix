import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { streamToResponse, SYSTEM_PROMPTS, checkAndConsumeCredits } from "@/lib/claude";
import { requireOrg, isOrgError } from "@/lib/org";
import type { SourceType } from "@/types";

export async function POST(req: NextRequest) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId } = ctx;

  const { query, scope, projectId } = await req.json();

  const creditBlock = await checkAndConsumeCredits(orgId, "medium");
  if (creditBlock) return creditBlock;

  const candidates = await prisma.searchIndex.findMany({
    where: {
      organizationId: orgId,
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
