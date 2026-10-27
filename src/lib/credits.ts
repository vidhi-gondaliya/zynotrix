import { prisma } from "./prisma";
import { monthlyAiQuota } from "./stripe";
import { isDemoOrg } from "./demo";

// Sentinel balance shown/used for demo orgs — consumeCredits never decrements it.
const UNLIMITED_DEMO_BALANCE = 999_999;

// ── Credit costs by AI action type ────────────────────────────────────────────
export const CREDIT_COSTS = {
  simple:  1,   // tag suggest, status hint, smart filter
  medium:  5,   // task summary, description draft, search
  complex: 20,  // AI brief, standup, risk analysis, meeting notes, automation parse
} as const;

export type CreditTier = keyof typeof CREDIT_COSTS;

// ── Internal helpers ──────────────────────────────────────────────────────────

async function getOrCreateBalance(orgId: string) {
  let balance = await (prisma as any).aiCreditBalance.findUnique({
    where: { organizationId: orgId },
  });
  if (!balance) {
    const sub = await (prisma as any).subscription.findUnique({
      where: { organizationId: orgId },
      select: { plan: true, seats: true },
    });
    const org = sub ? null : await prisma.organization.findUnique({ where: { id: orgId }, select: { plan: true } });
    const quota = monthlyAiQuota(sub?.plan ?? org?.plan ?? "FREE", sub?.seats ?? 1);
    balance = await (prisma as any).aiCreditBalance.create({
      data: { organizationId: orgId, balance: quota, usedThisMonth: 0, lastResetAt: new Date() },
    });
  }
  return balance;
}

/** Reset credits if the calendar month has rolled over */
async function maybeCycleReset(orgId: string, balance: { lastResetAt: Date; id: string }) {
  const now = new Date();
  const last = new Date(balance.lastResetAt);
  if (now.getFullYear() === last.getFullYear() && now.getMonth() === last.getMonth()) return;

  // New month — grant fresh quota
  const sub = await (prisma as any).subscription.findUnique({
    where: { organizationId: orgId },
    select: { plan: true, seats: true },
  });
  const org = sub ? null : await prisma.organization.findUnique({ where: { id: orgId }, select: { plan: true } });
  const quota = monthlyAiQuota(sub?.plan ?? org?.plan ?? "FREE", sub?.seats ?? 1);

  await (prisma as any).aiCreditBalance.update({
    where: { organizationId: orgId },
    data: { balance: quota, usedThisMonth: 0, lastResetAt: now },
  });

  await (prisma as any).aiCreditTransaction.create({
    data: {
      organizationId: orgId,
      type: "MONTHLY_GRANT",
      amount: quota,
      description: `Monthly credit grant — ${now.toLocaleString("default", { month: "long" })} ${now.getFullYear()}`,
    },
  });
}

// ── Public API ─────────────────────────────────────────────────────────────────

/** Returns current balance without deducting. */
export async function getCredits(orgId: string): Promise<{ balance: number; usedThisMonth: number }> {
  if (isDemoOrg(orgId)) return { balance: UNLIMITED_DEMO_BALANCE, usedThisMonth: 0 };
  const bal = await getOrCreateBalance(orgId);
  await maybeCycleReset(orgId, bal);
  const fresh = await (prisma as any).aiCreditBalance.findUnique({ where: { organizationId: orgId } });
  return { balance: fresh.balance, usedThisMonth: fresh.usedThisMonth };
}

/**
 * Attempt to consume `amount` credits.
 * Returns `true` if successful, `false` if insufficient balance (caller should block the AI action).
 */
export async function consumeCredits(orgId: string, amount: number): Promise<boolean> {
  if (isDemoOrg(orgId)) return true;
  const bal = await getOrCreateBalance(orgId);
  await maybeCycleReset(orgId, bal);
  const current = await (prisma as any).aiCreditBalance.findUnique({ where: { organizationId: orgId } });

  if (current.balance < amount) return false;

  await (prisma as any).aiCreditBalance.update({
    where: { organizationId: orgId },
    data: {
      balance:       { decrement: amount },
      usedThisMonth: { increment: amount },
    },
  });

  await (prisma as any).aiCreditTransaction.create({
    data: {
      organizationId: orgId,
      type: "USAGE",
      amount: -amount,
      description: `AI usage (${amount} credit${amount !== 1 ? "s" : ""})`,
    },
  });

  return true;
}

/**
 * Add credits from a TopUp purchase.
 * With sourceId, the ledger insert and balance update are atomic and a unique
 * source key prevents a payment from being credited more than once.
 */
export async function addCredits(
  orgId: string,
  amount: number,
  description: string,
  sourceId?: string
): Promise<void> {
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new Error("Credit top-up amount must be a positive safe integer");
  }

  await getOrCreateBalance(orgId);

  try {
    await prisma.$transaction(async (tx) => {
      await (tx as any).aiCreditTransaction.create({
        data: { organizationId: orgId, type: "TOPUP", amount, description, sourceId: sourceId ?? null },
      });
      await (tx as any).aiCreditBalance.update({
        where: { organizationId: orgId },
        data: { balance: { increment: amount } },
      });
    });
  } catch (error) {
    // The unique database constraint is the concurrency-safe duplicate guard.
    if (sourceId && typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      const existing = await (prisma as any).aiCreditTransaction.findUnique({
        where: { sourceId },
        select: { organizationId: true, type: true, amount: true },
      });
      if (existing?.organizationId === orgId && existing.type === "TOPUP" && existing.amount === amount) {
        return;
      }
    }
    throw error;
  }
}

/** Grant the plan's monthly quota on subscription creation or plan change. */
export async function grantMonthlyQuota(orgId: string, planId: string, seats: number): Promise<void> {
  const quota = monthlyAiQuota(planId, seats);
  const now = new Date();

  const existing = await (prisma as any).aiCreditBalance.findUnique({ where: { organizationId: orgId } });

  if (existing) {
    await (prisma as any).aiCreditBalance.update({
      where: { organizationId: orgId },
      data:  { balance: quota, usedThisMonth: 0, lastResetAt: now },
    });
  } else {
    await (prisma as any).aiCreditBalance.create({
      data:  { organizationId: orgId, balance: quota, usedThisMonth: 0, lastResetAt: now },
    });
  }

  await (prisma as any).aiCreditTransaction.create({
    data: {
      organizationId: orgId,
      type: "MONTHLY_GRANT",
      amount: quota,
      description: `Plan grant on ${planId} — ${quota} credits`,
    },
  });
}
