import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { addCredits, grantMonthlyQuota } from "@/lib/credits";
import type Stripe from "stripe";

export const runtime = "nodejs";

async function upsertSubscription(
  orgId: string,
  sub: Stripe.Subscription,
  planId?: string,
  billingCycle?: string
) {
  const resolvedPlanId   = planId   ?? (sub.metadata?.planId   as string | undefined)   ?? "FREE";
  const resolvedCycle    = billingCycle ?? (sub.metadata?.billingCycle as string | undefined) ?? "monthly";
  const memberCount      = await prisma.organizationMember.count({ where: { organizationId: orgId } });
  const seats            = (sub.items.data[0]?.quantity) ?? memberCount;

  await (prisma as any).subscription.upsert({
    where:  { organizationId: orgId },
    update: {
      plan:                resolvedPlanId,
      billingCycle:        resolvedCycle,
      status:              sub.status,
      seats,
      stripeCustomerId:    sub.customer as string,
      stripeSubscriptionId: sub.id,
      currentPeriodStart:  new Date((sub as any).current_period_start * 1000),
      currentPeriodEnd:    new Date((sub as any).current_period_end   * 1000),
      cancelAtPeriodEnd:   sub.cancel_at_period_end,
    },
    create: {
      organizationId:      orgId,
      plan:                resolvedPlanId,
      billingCycle:        resolvedCycle,
      status:              sub.status,
      seats,
      stripeCustomerId:    sub.customer as string,
      stripeSubscriptionId: sub.id,
      currentPeriodStart:  new Date((sub as any).current_period_start * 1000),
      currentPeriodEnd:    new Date((sub as any).current_period_end   * 1000),
      cancelAtPeriodEnd:   sub.cancel_at_period_end,
    },
  });

  // Sync plan onto Organization too
  await prisma.organization.update({
    where: { id: orgId },
    data:  { plan: resolvedPlanId },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig  = req.headers.get("stripe-signature") ?? "";
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret) {
    console.error("STRIPE_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  // Persist a claim before side effects so Stripe retries cannot grant credits
  // or quota twice. Stale claims can be reclaimed after a crashed invocation.
  const eventStore = (prisma as any).stripeWebhookEvent;
  const staleBefore = new Date(Date.now() - 5 * 60_000);
  let claim: { id: string; status: string; updatedAt: Date } | null = null;
  try {
    claim = await eventStore.create({
      data: { eventId: event.id, eventType: event.type, status: "PROCESSING" },
      select: { id: true, status: true, updatedAt: true },
    });
  } catch (error) {
    const isUniqueConflict = typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
    if (!isUniqueConflict) {
      console.error("[stripe-webhook] unable to claim event", error);
      return NextResponse.json({ error: "Unable to claim webhook event" }, { status: 500 });
    }
    const existing = await eventStore.findUnique({
      where: { eventId: event.id },
      select: { id: true, status: true, updatedAt: true },
    });
    if (!existing) return NextResponse.json({ error: "Unable to claim webhook event" }, { status: 500 });
    if (existing.status === "PROCESSED") return NextResponse.json({ received: true, duplicate: true });
    if (existing.status === "PROCESSING" && existing.updatedAt > staleBefore) {
      // Non-2xx asks Stripe to retry later rather than acknowledging in-flight work.
      return NextResponse.json({ error: "Webhook event is already processing" }, { status: 409 });
    }
    const reclaimed = await eventStore.updateMany({
      where: {
        id: existing.id,
        status: existing.status,
        updatedAt: { lte: staleBefore },
      },
      data: { status: "PROCESSING", lastError: null },
    });
    if (reclaimed.count !== 1) {
      return NextResponse.json({ error: "Webhook event is already processing" }, { status: 409 });
    }
    claim = { ...existing, status: "PROCESSING" };
  }

  if (!claim) {
    console.error("[stripe-webhook] event claim missing after claim/reclaim flow", { eventId: event.id });
    return NextResponse.json({ error: "Unable to claim webhook event" }, { status: 500 });
  }

  try {
    switch (event.type) {
      // ── Checkout completed ──────────────────────────────────────────────────
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orgId   = session.metadata?.organizationId;
        if (!orgId) break;

        if (session.mode === "subscription" && session.subscription) {
          // Subscription checkout — activate plan
          const sub = await stripe().subscriptions.retrieve(session.subscription as string);
          const planId = session.metadata?.planId ?? sub.metadata?.planId ?? "FREE";
          const cycle  = session.metadata?.billingCycle ?? "monthly";

          await upsertSubscription(orgId, sub, planId, cycle);

          const memberCount = await prisma.organizationMember.count({ where: { organizationId: orgId } });
          const seats = (sub.items.data[0]?.quantity) ?? memberCount;
          await grantMonthlyQuota(orgId, planId, seats);
        }

        if (session.mode === "payment") {
          // TopUp payment
          const packId    = session.metadata?.packId;
          const packType  = session.metadata?.packType;
          const credits   = parseInt(session.metadata?.packCredits   ?? "0", 10);
          const storageGb = parseInt(session.metadata?.packStorageGb ?? "0", 10);

          if (packType === "AI_CREDITS" && credits > 0) {
            await addCredits(orgId, credits, `TopUp: ${credits.toLocaleString()} credits (${packId})`, session.id);
          }

          // Log invoice
          const amountTotal = session.amount_total ?? 0;
          await (prisma as any).billingInvoice.upsert({
            where: { stripeCheckoutSessionId: session.id },
            update: {
              status: "paid",
              amount: amountTotal,
              currency: session.currency ?? "usd",
            },
            create: {
              organizationId: orgId,
              stripeCheckoutSessionId: session.id,
              amount: amountTotal,
              currency: session.currency ?? "usd",
              status: "paid",
              description: packType === "AI_CREDITS"
                ? `AI Credits TopUp — ${credits.toLocaleString()} credits`
                : `Storage TopUp — ${storageGb} GB`,
            },
          });

          if (storageGb > 0) {
            // Storage TopUps are advisory — tracked in DB for billing reference
            // Actual storage enforcement is in attachment upload API
            console.log(`Storage TopUp: +${storageGb}GB for org ${orgId}`);
          }
        }
        break;
      }

      // ── Subscription updated (plan change, renewal, etc.) ────────────────────
      case "customer.subscription.updated": {
        const sub   = event.data.object as Stripe.Subscription;
        const orgId = sub.metadata?.organizationId;
        if (!orgId) break;
        await upsertSubscription(orgId, sub);
        break;
      }

      // ── Subscription cancelled / ended ───────────────────────────────────────
      case "customer.subscription.deleted": {
        const sub   = event.data.object as Stripe.Subscription;
        const orgId = sub.metadata?.organizationId;
        if (!orgId) break;

        await (prisma as any).subscription.update({
          where: { organizationId: orgId },
          data:  { status: "canceled", plan: "FREE" },
        });
        await prisma.organization.update({
          where: { id: orgId },
          data:  { plan: "FREE" },
        });
        break;
      }

      // ── Invoice paid — log it ─────────────────────────────────────────────────
      case "invoice.paid": {
        const inv   = event.data.object as Stripe.Invoice;
        const orgId = ((inv as any).subscription_details?.metadata?.organizationId
          ?? (inv as any).metadata?.organizationId) as string | undefined;
        if (!orgId) break;

        // Refresh monthly credits on each successful billing cycle
        const sub = await (prisma as any).subscription.findUnique({
          where: { organizationId: orgId },
          select: { plan: true, seats: true },
        });
        if (sub) await grantMonthlyQuota(orgId, sub.plan, sub.seats ?? 1);

        await (prisma as any).billingInvoice.upsert({
          where:  { stripeInvoiceId: inv.id },
          update: { status: "paid", invoiceUrl: inv.hosted_invoice_url ?? null, invoicePdf: inv.invoice_pdf ?? null },
          create: {
            organizationId: orgId,
            stripeInvoiceId: inv.id,
            amount:    inv.amount_paid,
            currency:  inv.currency,
            status:    "paid",
            description: inv.description ?? "Subscription payment",
            invoiceUrl:  inv.hosted_invoice_url ?? null,
            invoicePdf:  inv.invoice_pdf ?? null,
            periodStart: inv.period_start ? new Date(inv.period_start * 1000) : null,
            periodEnd:   inv.period_end   ? new Date(inv.period_end   * 1000) : null,
          },
        });
        break;
      }

      // ── Invoice payment failed — mark past_due ────────────────────────────────
      case "invoice.payment_failed": {
        const inv   = event.data.object as Stripe.Invoice;
        const orgId = ((inv as any).subscription_details?.metadata?.organizationId) as string | undefined;
        if (!orgId) break;

        await (prisma as any).subscription.update({
          where: { organizationId: orgId },
          data:  { status: "past_due" },
        });
        break;
      }
    }
    await eventStore.update({
      where: { id: claim.id },
      data: { status: "PROCESSED", processedAt: new Date(), lastError: null },
    });
  } catch (err) {
    await eventStore.update({
      where: { id: claim.id },
      data: {
        status: "FAILED",
        lastError: err instanceof Error ? err.message.slice(0, 500) : "Unknown handler error",
      },
    }).catch((markError: unknown) => console.error("[stripe-webhook] failed to mark event as failed", markError));
    console.error("Stripe webhook handler error:", err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
