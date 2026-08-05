import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg, isOrgError } from "@/lib/org";

const VALID_PLANS = ["FREE", "STARTER", "GROWTH", "SCALE", "SCALE_FLAT"];

/**
 * POST /api/billing/demo-upgrade
 * Simulates a plan upgrade without Stripe — only available when
 * STRIPE_SECRET_KEY is not set (i.e., demo / dev environments).
 */
export async function POST(req: NextRequest) {
  if (process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Not available when Stripe is configured" }, { status: 403 });
  }

  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId } = ctx;

  const { planId } = await req.json();
  if (!VALID_PLANS.includes(planId)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  await prisma.organization.update({
    where: { id: orgId },
    data:  { plan: planId },
  });

  return NextResponse.json({ success: true, planId });
}
