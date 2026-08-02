import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { requireOrg, isOrgError } from "@/lib/org";

/**
 * POST /api/billing/portal
 * Opens the Stripe Customer Portal for managing subscription, payment method, invoices.
 */
export async function POST() {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId } = ctx;

  const sub = await (prisma as any).subscription.findUnique({
    where: { organizationId: orgId },
    select: { stripeCustomerId: true },
  });

  if (!sub?.stripeCustomerId) {
    return NextResponse.json({ error: "No billing account found. Subscribe to a plan first." }, { status: 400 });
  }

  const appUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const session = await stripe().billingPortal.sessions.create({
    customer:   sub.stripeCustomerId,
    return_url: `${appUrl}/billing`,
  });

  return NextResponse.json({ url: session.url });
}
