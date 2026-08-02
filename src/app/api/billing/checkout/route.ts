import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe, PLANS, getPlan } from "@/lib/stripe";
import { requireOrg, isOrgError } from "@/lib/org";

/**
 * POST /api/billing/checkout
 * Body: { planId, billingCycle }
 * Returns: { url } — Stripe Checkout session URL
 */
export async function POST(req: NextRequest) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId, userId } = ctx;

  const { planId, billingCycle = "monthly" } = await req.json();
  const plan = getPlan(planId);

  if (plan.id === "FREE") {
    return NextResponse.json({ error: "Cannot checkout for the free plan" }, { status: 400 });
  }

  const priceId =
    billingCycle === "annual"
      ? plan.stripePriceIdAnnual
      : plan.stripePriceIdMonthly;

  if (!priceId) {
    return NextResponse.json(
      { error: `Stripe price not configured for ${plan.name} ${billingCycle}. Set STRIPE_PRICE_${planId}_${billingCycle.toUpperCase()} in env.` },
      { status: 400 }
    );
  }

  // Get or create Stripe customer
  const sub = await (prisma as any).subscription.findUnique({
    where: { organizationId: orgId },
    select: { stripeCustomerId: true },
  });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });

  let customerId = sub?.stripeCustomerId as string | undefined;
  if (!customerId) {
    const customer = await stripe().customers.create({
      email: user?.email ?? undefined,
      name:  user?.name  ?? undefined,
      metadata: { organizationId: orgId, userId },
    });
    customerId = customer.id;
  }

  // Seat count = current member count
  const memberCount = await prisma.organizationMember.count({ where: { organizationId: orgId } });
  const quantity = plan.isFlat ? 1 : Math.max(1, memberCount);

  const appUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const session = await stripe().checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity }],
    metadata: { organizationId: orgId, planId, billingCycle },
    subscription_data: { metadata: { organizationId: orgId, planId, billingCycle } },
    success_url: `${appUrl}/billing?success=1`,
    cancel_url:  `${appUrl}/billing?canceled=1`,
    allow_promotion_codes: true,
    billing_address_collection: "auto",
  });

  return NextResponse.json({ url: session.url });
}
