import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg, isOrgError } from "@/lib/org";

export async function PUT(req: NextRequest, { params }: { params: { couponId: string } }) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId, orgRole } = ctx;

  if (!["ADMIN", "MANAGER"].includes(orgRole)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const existing = await prisma.coupon.findFirst({ where: { id: params.couponId, organizationId: orgId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

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
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId, orgRole } = ctx;

  if (!["ADMIN"].includes(orgRole)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const existing = await prisma.coupon.findFirst({ where: { id: params.couponId, organizationId: orgId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.coupon.delete({ where: { id: params.couponId } });
  return NextResponse.json({ ok: true });
}
