import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const entityType = searchParams.get("entityType");
  const entityId   = searchParams.get("entityId");
  const limit      = Math.min(Number(searchParams.get("limit") ?? 50), 200);
  const offset     = Number(searchParams.get("offset") ?? 0);

  const logs = await (prisma as any).auditLog.findMany({
    where: {
      userId: session.user.id,
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
