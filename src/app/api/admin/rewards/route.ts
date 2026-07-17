import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { seedRewardDefaults } from "@/lib/rewards";
import { hasPermission } from "@/lib/permissions";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "admin:access")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await seedRewardDefaults();

  const configs = await prisma.rewardConfig.findMany({ orderBy: [{ role: "asc" }, { action: "asc" }] });
  return NextResponse.json(configs);
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "admin:access")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Accepts array: [{ role, action, points, isEnabled }]
  const updates: { role: string; action: string; points: number; isEnabled: boolean }[] = await req.json();

  await Promise.all(
    updates.map((u) =>
      prisma.rewardConfig.upsert({
        where: { role_action: { role: u.role, action: u.action } },
        update: { points: u.points, isEnabled: u.isEnabled },
        create: { role: u.role, action: u.action, points: u.points, isEnabled: u.isEnabled },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
