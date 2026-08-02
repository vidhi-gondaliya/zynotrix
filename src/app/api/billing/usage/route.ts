import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg, isOrgError } from "@/lib/org";
import { getPlan, monthlyAiQuota } from "@/lib/stripe";

/** GET /api/billing/usage — current usage meters for the org */
export async function GET() {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId } = ctx;

  const [sub, creditBal, memberCount, projectCount, invoices] = await Promise.all([
    (prisma as any).subscription.findUnique({ where: { organizationId: orgId } }),
    (prisma as any).aiCreditBalance.findUnique({ where: { organizationId: orgId } }),
    prisma.organizationMember.count({ where: { organizationId: orgId } }),
    prisma.project.count({ where: { organizationId: orgId } }),
    (prisma as any).billingInvoice.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const planId = sub?.plan ?? "FREE";
  const plan   = getPlan(planId);
  const seats  = sub?.seats ?? memberCount;
  const monthlyQuota = monthlyAiQuota(planId, seats);

  return NextResponse.json({
    plan,
    subscription: sub ?? null,
    usage: {
      aiCredits:     { used: creditBal?.usedThisMonth ?? 0, quota: monthlyQuota, balance: creditBal?.balance ?? 0 },
      members:       { used: memberCount,  limit: plan.maxMembers  },
      projects:      { used: projectCount, limit: plan.maxProjects },
      storageGb:     { limit: plan.storageGb },
      automations:   { limit: plan.automationsMonthly },
    },
    invoices,
  });
}
