import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { couponId } = await req.json();
  if (!couponId) return NextResponse.json({ error: "couponId required" }, { status: 400 });

  const coupon = await prisma.coupon.findUnique({ where: { id: couponId } });
  if (!coupon || !coupon.isActive) return NextResponse.json({ error: "Coupon not found or inactive" }, { status: 404 });
  if (coupon.expiresAt && coupon.expiresAt < new Date()) return NextResponse.json({ error: "Coupon expired" }, { status: 400 });
  if (coupon.quantity !== null && coupon.usedCount >= coupon.quantity) return NextResponse.json({ error: "Coupon out of stock" }, { status: 400 });

  const already = await prisma.couponRedemption.findUnique({
    where: { couponId_userId: { couponId, userId: session.user.id } },
  });
  if (already) return NextResponse.json({ error: "Already redeemed" }, { status: 409 });

  const userPoints = await prisma.userPoints.findUnique({ where: { userId: session.user.id } });
  const balance = userPoints?.balance ?? 0;
  if (balance < coupon.pointCost) return NextResponse.json({ error: `Need ${coupon.pointCost} pts, you have ${balance}` }, { status: 400 });

  await prisma.$transaction([
    prisma.couponRedemption.create({ data: { couponId, userId: session.user.id } }),
    prisma.coupon.update({ where: { id: couponId }, data: { usedCount: { increment: 1 } } }),
    ...(coupon.pointCost > 0
      ? [prisma.userPoints.update({ where: { userId: session.user.id }, data: { balance: { decrement: coupon.pointCost } } })]
      : []),
  ]);

  return NextResponse.json({ ok: true, message: `"${coupon.label}" redeemed!` });
}
