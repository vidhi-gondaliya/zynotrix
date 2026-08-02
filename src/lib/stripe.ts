import Stripe from "stripe";

const globalForStripe = globalThis as unknown as { stripe: Stripe };

export const stripe =
  globalForStripe.stripe ??
  new Stripe(process.env.STRIPE_SECRET_KEY ?? "", { apiVersion: "2026-07-29.dahlia" });

if (process.env.NODE_ENV !== "production") globalForStripe.stripe = stripe;

// ── Plan definitions ─────────────────────────────────────────────────────────

export type PlanId = "FREE" | "STARTER" | "GROWTH" | "SCALE" | "SCALE_FLAT";

export interface PlanConfig {
  id: PlanId;
  name: string;
  monthlyPrice: number;   // USD per user/month (0 for flat / free)
  annualPrice: number;    // USD per user/month billed annually
  flatMonthly: number;    // USD flat/month (only SCALE_FLAT and FREE)
  flatAnnual: number;
  isFlat: boolean;        // true = flat rate, not per-seat
  aiCreditsMonthly: number; // per user (or total for flat/free)
  automationsMonthly: number; // -1 = unlimited
  storageGb: number;
  maxMembers: number;     // -1 = unlimited
  maxProjects: number;    // -1 = unlimited
  features: string[];
  stripePriceIdMonthly: string | null;
  stripePriceIdAnnual: string | null;
}

export const PLANS: Record<PlanId, PlanConfig> = {
  FREE: {
    id: "FREE",
    name: "Free",
    monthlyPrice: 0,
    annualPrice: 0,
    flatMonthly: 0,
    flatAnnual: 0,
    isFlat: true,
    aiCreditsMonthly: 100,
    automationsMonthly: 100,
    storageGb: 0.5,
    maxMembers: 5,
    maxProjects: 5,
    features: ["Kanban · List · Calendar", "Basic integrations", "100 AI credits/month"],
    stripePriceIdMonthly: null,
    stripePriceIdAnnual: null,
  },
  STARTER: {
    id: "STARTER",
    name: "Starter",
    monthlyPrice: 9,
    annualPrice: 7,
    flatMonthly: 0,
    flatAnnual: 0,
    isFlat: false,
    aiCreditsMonthly: 500,
    automationsMonthly: 1000,
    storageGb: 5,
    maxMembers: -1,
    maxProjects: -1,
    features: ["Unlimited members & projects", "All views + Gantt", "Custom statuses", "Slack + Google Calendar", "500 AI credits/user/month"],
    stripePriceIdMonthly: process.env.STRIPE_PRICE_STARTER_MONTHLY ?? null,
    stripePriceIdAnnual: process.env.STRIPE_PRICE_STARTER_ANNUAL ?? null,
  },
  GROWTH: {
    id: "GROWTH",
    name: "Growth",
    monthlyPrice: 16,
    annualPrice: 13,
    flatMonthly: 0,
    flatAnnual: 0,
    isFlat: false,
    aiCreditsMonthly: 2000,
    automationsMonthly: 5000,
    storageGb: 20,
    maxMembers: -1,
    maxProjects: -1,
    features: ["Everything in Starter", "Time tracking", "Client portal", "Custom fields", "Workload view", "AI standup + risk alerts", "2,000 AI credits/user/month"],
    stripePriceIdMonthly: process.env.STRIPE_PRICE_GROWTH_MONTHLY ?? null,
    stripePriceIdAnnual: process.env.STRIPE_PRICE_GROWTH_ANNUAL ?? null,
  },
  SCALE: {
    id: "SCALE",
    name: "Scale",
    monthlyPrice: 24,
    annualPrice: 19,
    flatMonthly: 0,
    flatAnnual: 0,
    isFlat: false,
    aiCreditsMonthly: 10000,
    automationsMonthly: -1,
    storageGb: 100,
    maxMembers: -1,
    maxProjects: -1,
    features: ["Everything in Growth", "White-label client portal", "SSO / SAML", "Audit logs", "99.9% SLA", "Dedicated account manager", "10,000 AI credits/user/month"],
    stripePriceIdMonthly: process.env.STRIPE_PRICE_SCALE_MONTHLY ?? null,
    stripePriceIdAnnual: process.env.STRIPE_PRICE_SCALE_ANNUAL ?? null,
  },
  SCALE_FLAT: {
    id: "SCALE_FLAT",
    name: "Scale Flat",
    monthlyPrice: 0,
    annualPrice: 0,
    flatMonthly: 179,
    flatAnnual: 149,
    isFlat: true,
    aiCreditsMonthly: 50000,
    automationsMonthly: -1,
    storageGb: 100,
    maxMembers: -1,
    maxProjects: -1,
    features: ["Unlimited users — one flat bill", "50,000 shared AI credits/month", "All Scale features", "Break-even at 8 members"],
    stripePriceIdMonthly: process.env.STRIPE_PRICE_FLAT_MONTHLY ?? null,
    stripePriceIdAnnual: process.env.STRIPE_PRICE_FLAT_ANNUAL ?? null,
  },
};

// ── AI TopUp packs ────────────────────────────────────────────────────────────

export interface TopUpPack {
  id: string;
  label: string;
  credits?: number;
  storageGb?: number;
  priceCents: number;
  type: "AI_CREDITS" | "STORAGE";
  description: string;
}

export const AI_CREDIT_PACKS: TopUpPack[] = [
  { id: "ai_1k",  label: "Starter Pack",  credits: 1_000,   priceCents: 500,   type: "AI_CREDITS", description: "1,000 AI credits — $0.005/credit" },
  { id: "ai_5k",  label: "Power Pack",    credits: 5_000,   priceCents: 2000,  type: "AI_CREDITS", description: "5,000 AI credits — save 20%" },
  { id: "ai_25k", label: "Pro Pack",      credits: 25_000,  priceCents: 7500,  type: "AI_CREDITS", description: "25,000 AI credits — save 40%" },
  { id: "ai_100k",label: "Agency Pack",   credits: 100_000, priceCents: 20000, type: "AI_CREDITS", description: "100,000 AI credits — save 60%" },
];

export const STORAGE_PACKS: TopUpPack[] = [
  { id: "st_10",   label: "+10 GB",  storageGb: 10,   priceCents: 300,  type: "STORAGE", description: "Extra 10 GB storage/month" },
  { id: "st_50",   label: "+50 GB",  storageGb: 50,   priceCents: 1000, type: "STORAGE", description: "Extra 50 GB storage/month" },
  { id: "st_200",  label: "+200 GB", storageGb: 200,  priceCents: 2500, type: "STORAGE", description: "Extra 200 GB storage/month" },
  { id: "st_1000", label: "+1 TB",   storageGb: 1000, priceCents: 7000, type: "STORAGE", description: "Extra 1 TB storage/month" },
];

export const ALL_PACKS = [...AI_CREDIT_PACKS, ...STORAGE_PACKS];

export function findPack(id: string): TopUpPack | undefined {
  return ALL_PACKS.find((p) => p.id === id);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getPlan(planId: string): PlanConfig {
  return PLANS[(planId as PlanId)] ?? PLANS.FREE;
}

/** Monthly AI credit quota for an org based on plan + seat count */
export function monthlyAiQuota(planId: string, seats: number): number {
  const plan = getPlan(planId);
  if (plan.isFlat) return plan.aiCreditsMonthly;
  return plan.aiCreditsMonthly * Math.max(1, seats);
}
