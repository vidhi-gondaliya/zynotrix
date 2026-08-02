import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe, findPack } from "@/lib/stripe";
import { requireOrg, isOrgError } from "@/lib/org";

/**
 * POST /api/billing/topup
 * Body: { packId }
 * Creates a Stripe Checkout session for a one-time TopUp purchase.
 */
export async function POST(req: NextRequest) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId, userId } = ctx;

  const { packId } = await req.json();
  const pack = findPack(packId);
  if (!pack) return NextResponse.json({ error: "Invalid pack" }, { status: 400 });

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

    // Persist customer ID even if they have no subscription yet
    await (prisma as any).subscription.upsert({
      where:  { organizationId: orgId },
      update: { stripeCustomerId: customerId },
      create: { organizationId: orgId, plan: "FREE", stripeCustomerId: customerId },
    });
  }

  const appUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const session = await stripe().checkout.sessions.create({
    customer: customerId,
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: pack.priceCents,
          product_data: {
            name: pack.label,
            description: pack.description,
          },
        },
      },
    ],
    metadata: {
      organizationId: orgId,
      packId,
      packType: pack.type,
      packCredits:   pack.credits   ? String(pack.credits)   : "",
      packStorageGb: pack.storageGb ? String(pack.storageGb) : "",
    },
    success_url: `${appUrl}/billing?topup=success`,
    cancel_url:  `${appUrl}/billing`,
  });

  return NextResponse.json({ url: session.url });
}
