import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg, isOrgError } from "@/lib/org";
import { hasPermissionAsync } from "@/lib/permissions";

const VALID_PLANS = ["FREE", "STARTER", "GROWTH", "SCALE", "SCALE_FLAT"];

/**
 * POST /api/billing/demo-upgrade
 * Development-only plan simulation. Never enable in production, even if the
 * Stripe secret is accidentally missing from the deployment environment.
 */
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production" || process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  if (!(await hasPermissionAsync(ctx.orgRole, ctx.orgId, "settings:access"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { planId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const planId = typeof body.planId === "string" ? body.planId : "";
  if (!VALID_PLANS.includes(planId)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  await prisma.organization.update({
    where: { id: ctx.orgId },
    data: { plan: planId },
  });

  return NextResponse.json({ success: true, planId });
}
