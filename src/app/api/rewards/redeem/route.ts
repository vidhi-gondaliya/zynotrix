import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg, isOrgError } from "@/lib/org";

export async function POST(req: NextRequest) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId, userId } = ctx;

  const { couponId } = await req.json();
  if (!couponId) return NextResponse.json({ error: "couponId required" }, { status: 400 });

  // Coupon must belong to this org
  const coupon = await prisma.coupon.findFirst({ where: { id: couponId, organizationId: orgId } });
  if (!coupon || !coupon.isActive) return NextResponse.json({ error: "Coupon not found or inactive" }, { status: 404 });
  if (coupon.expiresAt && coupon.expiresAt < new Date()) return NextResponse.json({ error: "Coupon expired" }, { status: 400 });
  if (coupon.quantity !== null && coupon.usedCount >= coupon.quantity) return NextResponse.json({ error: "Coupon out of stock" }, { status: 400 });

  const already = await prisma.couponRedemption.findUnique({
    where: { couponId_userId: { couponId, userId } },
  });
  if (already) return NextResponse.json({ error: "Already redeemed" }, { status: 409 });

  const userPoints = await prisma.userPoints.findUnique({ where: { userId } });
  const balance = userPoints?.balance ?? 0;
  if (balance < coupon.pointCost) return NextResponse.json({ error: `Need ${coupon.pointCost} pts, you have ${balance}` }, { status: 400 });

  await prisma.$transaction([
    prisma.couponRedemption.create({ data: { couponId, userId } }),
    prisma.coupon.update({ where: { id: couponId }, data: { usedCount: { increment: 1 } } }),
    ...(coupon.pointCost > 0
      ? [prisma.userPoints.update({ where: { userId }, data: { balance: { decrement: coupon.pointCost } } })]
      : []),
  ]);

  return NextResponse.json({ ok: true, message: `"${coupon.label}" redeemed!` });
}
