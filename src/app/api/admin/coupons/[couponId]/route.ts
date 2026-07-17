import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";

export async function PUT(req: NextRequest, { params }: { params: { couponId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "admin:access")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { label, description, pointCost, quantity, expiresAt, isActive } = await req.json();

  const coupon = await prisma.coupon.update({
    where: { id: params.couponId },
    data: {
      label:       label?.trim(),
      description: description?.trim() || null,
      pointCost:   pointCost !== undefined ? Number(pointCost) : undefined,
      quantity:    quantity !== undefined ? (quantity ? Number(quantity) : null) : undefined,
      expiresAt:   expiresAt !== undefined ? (expiresAt ? new Date(expiresAt) : null) : undefined,
      isActive:    isActive !== undefined ? Boolean(isActive) : undefined,
    },
  });

  return NextResponse.json(coupon);
}

export async function DELETE(_req: NextRequest, { params }: { params: { couponId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "admin:access")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.coupon.delete({ where: { id: params.couponId } });
  return NextResponse.json({ ok: true });
}
