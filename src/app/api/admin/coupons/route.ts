import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "admin:access")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const coupons = await prisma.coupon.findMany({
    include: { _count: { select: { redemptions: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(coupons);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "admin:access")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { code, label, description, pointCost = 0, quantity, expiresAt } = await req.json();
  if (!code?.trim() || !label?.trim()) return NextResponse.json({ error: "Code and label required" }, { status: 400 });

  const existing = await prisma.coupon.findUnique({ where: { code: code.trim().toUpperCase() } });
  if (existing) return NextResponse.json({ error: "Code already exists" }, { status: 409 });

  const coupon = await prisma.coupon.create({
    data: {
      code: code.trim().toUpperCase(),
      label: label.trim(),
      description: description?.trim() || null,
      pointCost: Number(pointCost),
      quantity: quantity ? Number(quantity) : null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      createdById: session.user.id,
    },
  });

  return NextResponse.json(coupon, { status: 201 });
}
