import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { taskId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const activities = await (prisma as any).taskActivity.findMany({
      where: { taskId: params.taskId },
      include: { user: { select: { id: true, name: true, image: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json(
      activities.map((a: { id: string; taskId: string; action: string; meta: string; createdAt: string; user: { id: string; name: string; image?: string } }) => ({
        ...a,
        meta: (() => { try { return JSON.parse(a.meta); } catch { return {}; } })(),
      }))
    );
  } catch {
    return NextResponse.json([]);
  }
}
