import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { seedRewardDefaults } from "@/lib/rewards";
import { requireOrg, isOrgError } from "@/lib/org";

export async function GET() {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { userId, orgId } = ctx;

  await seedRewardDefaults(orgId);

  const [userPoints, transactions, userBadges, redemptions, leaderboardRaw] = await Promise.all([
    prisma.userPoints.findUnique({ where: { userId } }),

    prisma.pointTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),

    prisma.userBadge.findMany({
      where: { userId },
      include: { badge: true },
      orderBy: { earnedAt: "desc" },
    }),

    prisma.couponRedemption.findMany({
      where: { userId },
      include: { coupon: { select: { label: true, code: true } } },
      orderBy: { redeemedAt: "desc" },
    }),

    // Leaderboard: org members only
    prisma.userPoints.findMany({
      where: { user: { organizationMembers: { some: { organizationId: orgId } } } },
      include: { user: { select: { id: true, name: true, image: true, role: true } } },
      orderBy: { lifetime: "desc" },
      take: 50,
    }),
  ]);

  // Group leaderboard by role
  const byRole: Record<string, { userId: string; name: string; image: string | null; role: string; lifetime: number; balance: number }[]> = {};
  for (const up of leaderboardRaw) {
    const r = up.user.role;
    if (!["MEMBER", "MANAGER", "ADMIN"].includes(r)) continue;
    if (!byRole[r]) byRole[r] = [];
    byRole[r].push({ userId: up.userId, name: up.user.name ?? "Unknown", image: up.user.image, role: r, lifetime: up.lifetime, balance: up.balance });
  }

  // Available coupons for this org (not yet redeemed by this user, still in stock)
  const redeemedIds = new Set(redemptions.map((r) => r.couponId));
  const availableCoupons = (await prisma.coupon.findMany({
    where: {
      organizationId: orgId,
      isActive: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: { createdAt: "desc" },
  })).filter((c) => {
    if (redeemedIds.has(c.id)) return false;
    if (c.quantity !== null && c.usedCount >= c.quantity) return false;
    return true;
  });

  return NextResponse.json({
    balance: userPoints?.balance ?? 0,
    lifetime: userPoints?.lifetime ?? 0,
    transactions: transactions.map((t) => ({
      ...t,
      metadata: JSON.parse(t.metadata),
    })),
    badges: userBadges.map((ub) => ({ ...ub.badge, earnedAt: ub.earnedAt })),
    availableCoupons,
    redemptions,
    leaderboard: byRole,
  });
}
