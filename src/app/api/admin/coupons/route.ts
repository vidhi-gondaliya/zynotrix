import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg, isOrgError } from "@/lib/org";

export async function GET() {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId, orgRole } = ctx;

  if (!["ADMIN", "MANAGER"].includes(orgRole)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const coupons = await prisma.coupon.findMany({
    where: { organizationId: orgId },
    include: { _count: { select: { redemptions: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(coupons);
}

export async function POST(req: NextRequest) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId, orgRole, userId } = ctx;

  if (!["ADMIN", "MANAGER"].includes(orgRole)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { code, label, description, pointCost = 0, quantity, expiresAt } = await req.json();
  if (!code?.trim() || !label?.trim()) return NextResponse.json({ error: "Code and label required" }, { status: 400 });

  const normalizedCode = code.trim().toUpperCase();
  const existing = await prisma.coupon.findUnique({ where: { organizationId_code: { organizationId: orgId, code: normalizedCode } } });
  if (existing) return NextResponse.json({ error: "Code already exists" }, { status: 409 });

  const coupon = await prisma.coupon.create({
    data: {
      code: normalizedCode,
      label: label.trim(),
      description: description?.trim() || null,
      pointCost: Number(pointCost),
      quantity: quantity ? Number(quantity) : null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      createdById: userId,
      organizationId: orgId,
    },
  });

  return NextResponse.json(coupon, { status: 201 });
}
