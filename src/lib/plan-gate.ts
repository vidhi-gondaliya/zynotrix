import { NextResponse } from "next/server";
import { prisma } from "./prisma";
import { getPlan, type PlanId } from "./stripe";

// ── Feature catalogue ─────────────────────────────────────────────────────────

export type PlanFeature =
  // STARTER+
  | "gantt" | "custom_statuses" | "basic_integrations" | "basic_reporting"
  // GROWTH+
  | "client_portal" | "time_tracking" | "custom_fields" | "workload_view"
  | "ai_insights"   | "advanced_analytics"
  // SCALE+
  | "white_label_portal" | "sso" | "audit_log" | "priority_support"
  | "unlimited_automations";

export type PlanLimit = "members" | "projects" | "automations_monthly";

// Which plans unlock each feature (first element = minimum plan required)
const FEATURE_PLANS: Record<PlanFeature, PlanId[]> = {
  // STARTER+
  gantt:                 ["STARTER", "GROWTH", "SCALE", "SCALE_FLAT"],
  custom_statuses:       ["STARTER", "GROWTH", "SCALE", "SCALE_FLAT"],
  basic_integrations:    ["STARTER", "GROWTH", "SCALE", "SCALE_FLAT"],
  basic_reporting:       ["STARTER", "GROWTH", "SCALE", "SCALE_FLAT"],
  // GROWTH+
  client_portal:         ["GROWTH", "SCALE", "SCALE_FLAT"],
  time_tracking:         ["GROWTH", "SCALE", "SCALE_FLAT"],
  custom_fields:         ["GROWTH", "SCALE", "SCALE_FLAT"],
  workload_view:         ["GROWTH", "SCALE", "SCALE_FLAT"],
  ai_insights:           ["GROWTH", "SCALE", "SCALE_FLAT"],
  advanced_analytics:    ["GROWTH", "SCALE", "SCALE_FLAT"],
  // SCALE+
  white_label_portal:    ["SCALE", "SCALE_FLAT"],
  sso:                   ["SCALE", "SCALE_FLAT"],
  audit_log:             ["SCALE", "SCALE_FLAT"],
  priority_support:      ["SCALE", "SCALE_FLAT"],
  unlimited_automations: ["SCALE", "SCALE_FLAT"],
};

// Human-readable minimum plan name for each feature (for upgrade messages)
const FEATURE_MIN_PLAN_NAME: Record<PlanFeature, string> = {
  gantt: "Starter", custom_statuses: "Starter", basic_integrations: "Starter", basic_reporting: "Starter",
  client_portal: "Growth", time_tracking: "Growth", custom_fields: "Growth", workload_view: "Growth",
  ai_insights: "Growth", advanced_analytics: "Growth",
  white_label_portal: "Scale", sso: "Scale", audit_log: "Scale",
  priority_support: "Scale", unlimited_automations: "Scale",
};

// ── Internal helpers ──────────────────────────────────────────────────────────

async function getOrgPlanId(orgId: string): Promise<PlanId> {
  const sub = await (prisma as any).subscription.findUnique({
    where: { organizationId: orgId },
    select: { plan: true },
  }).catch(() => null);
  if (sub?.plan) return sub.plan as PlanId;

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { plan: true },
  });
  return (org?.plan ?? "FREE") as PlanId;
}

// ── Server-side guards (return null = allowed, Response = blocked) ─────────────

/**
 * Returns a 402 Response if the org's plan doesn't include `feature`.
 * Returns null if allowed — call `if (block) return block;` after.
 */
export async function requireFeature(orgId: string, feature: PlanFeature): Promise<Response | null> {
  const planId  = await getOrgPlanId(orgId);
  const allowed = FEATURE_PLANS[feature];

  if (!allowed.includes(planId)) {
    const minPlan = FEATURE_MIN_PLAN_NAME[feature];
    return NextResponse.json(
      {
        error: `This feature requires the ${minPlan} plan or higher. Upgrade in Billing settings.`,
        code: "PLAN_FEATURE_REQUIRED",
        requiredPlan: allowed[0],
        currentPlan: planId,
      },
      { status: 402 }
    );
  }
  return null;
}

/**
 * Returns a 402 Response if the org has reached a plan limit.
 * Returns null if within limits.
 */
export async function requireUnderLimit(orgId: string, limit: PlanLimit): Promise<Response | null> {
  const planId = await getOrgPlanId(orgId);
  const plan   = getPlan(planId);

  switch (limit) {
    case "members": {
      if (plan.maxMembers === -1) return null;
      const count = await prisma.organizationMember.count({ where: { organizationId: orgId } });
      if (count >= plan.maxMembers) {
        return NextResponse.json(
          {
            error: `Your ${plan.name} plan allows up to ${plan.maxMembers} members. Upgrade your plan to add more.`,
            code: "PLAN_LIMIT_REACHED",
            limit: plan.maxMembers, current: count, limitType: "members",
          },
          { status: 402 }
        );
      }
      return null;
    }

    case "projects": {
      if (plan.maxProjects === -1) return null;
      const count = await prisma.project.count({
        where: { organizationId: orgId, isPersonal: false },
      });
      if (count >= plan.maxProjects) {
        return NextResponse.json(
          {
            error: `Your ${plan.name} plan allows up to ${plan.maxProjects} projects. Upgrade to create more.`,
            code: "PLAN_LIMIT_REACHED",
            limit: plan.maxProjects, current: count, limitType: "projects",
          },
          { status: 402 }
        );
      }
      return null;
    }

    case "automations_monthly": {
      if (plan.automationsMonthly === -1) return null;
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const count = await (prisma as any).automationRun.count({
        where: {
          automation: { organizationId: orgId },
          triggeredAt: { gte: startOfMonth },
        },
      });
      if (count >= plan.automationsMonthly) {
        return NextResponse.json(
          {
            error: `Your ${plan.name} plan allows ${plan.automationsMonthly.toLocaleString()} automation runs/month. Upgrade for more.`,
            code: "PLAN_LIMIT_REACHED",
            limit: plan.automationsMonthly, current: count, limitType: "automations_monthly",
          },
          { status: 402 }
        );
      }
      return null;
    }
  }
}

// ── Client-safe helper (no DB calls — pure plan config lookup) ────────────────

/** Use this in client components to check if a feature is included in a plan. */
export function isFeatureInPlan(planId: string, feature: PlanFeature): boolean {
  return FEATURE_PLANS[feature]?.includes(planId as PlanId) ?? false;
}

export { FEATURE_MIN_PLAN_NAME };
