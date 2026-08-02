import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg, isOrgError } from "@/lib/org";
import { PLANS } from "@/lib/stripe";

/** GET — return current subscription + plan details */
export async function GET() {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId } = ctx;

  const sub = await (prisma as any).subscription.findUnique({
    where: { organizationId: orgId },
  });

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { plan: true },
  });

  const planId = sub?.plan ?? org?.plan ?? "FREE";
  const plan = PLANS[planId as keyof typeof PLANS] ?? PLANS.FREE;

  return NextResponse.json({ subscription: sub ?? null, plan });
}
