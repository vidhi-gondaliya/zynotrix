import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg, isOrgError } from "@/lib/org";

export async function GET(req: NextRequest) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId } = ctx;

  const { searchParams } = req.nextUrl;
  const entityType = searchParams.get("entityType");
  const entityId   = searchParams.get("entityId");
  const limit      = Math.min(Number(searchParams.get("limit") ?? 50), 200);
  const offset     = Number(searchParams.get("offset") ?? 0);

  const logs = await (prisma as any).auditLog.findMany({
    where: {
      organizationId: orgId,
      ...(entityType && { entityType }),
      ...(entityId   && { entityId }),
    },
    include: { user: { select: { id: true, name: true, image: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });

  return NextResponse.json(logs);
}
