"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CreditCard, Zap, HardDrive, CheckCircle, AlertTriangle,
  ExternalLink, Download, Sparkles, Users, FolderOpen,
  Crown, ArrowRight, RefreshCw, Receipt, TrendingUp,
  ChevronRight, Star, Infinity, Shield, type LucideIcon,
} from "lucide-react";
import { PLANS, AI_CREDIT_PACKS, STORAGE_PACKS, type PlanConfig, type TopUpPack } from "@/lib/stripe";

/* ── Types ─────────────────────────────────────────────────────────────── */

interface UsageData {
  plan: PlanConfig;
  subscription: {
    plan: string; status: string; billingCycle: string; seats: number;
    currentPeriodEnd?: string; cancelAtPeriodEnd?: boolean;
    stripeSubscriptionId?: string;
  } | null;
  usage: {
    aiCredits:   { used: number; quota: number; balance: number };
    members:     { used: number; limit: number };
    projects:    { used: number; limit: number };
    storageGb:   { limit: number };
    automations: { limit: number };
  };
  invoices: {
    id: string; amount: number; currency: string; status: string;
    description: string; invoiceUrl?: string; invoicePdf?: string;
    createdAt: string;
  }[];
}

type Tab = "overview" | "plans" | "topups" | "invoices";

/* ── Helpers ────────────────────────────────────────────────────────────── */

function pct(used: number, total: number) {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((used / total) * 100));
}

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function limitLabel(n: number) {
  return n === -1 ? "∞" : n.toLocaleString();
}

const PLAN_GRADIENT: Record<string, string> = {
  FREE:       "linear-gradient(135deg,#3B4A6B 0%,#2D3748 100%)",
  STARTER:    "linear-gradient(135deg,#2563EB 0%,#3B82F6 100%)",
  GROWTH:     "linear-gradient(135deg,#7C3AED 0%,#8B5CF6 100%)",
  SCALE:      "linear-gradient(135deg,#C2410C 0%,#EA580C 100%)",
  SCALE_FLAT: "linear-gradient(135deg,#B45309 0%,#D97706 100%)",
};

const PLAN_ACCENT: Record<string, string> = {
  FREE: "#6B7FA3", STARTER: "#3B82F6", GROWTH: "#8B5CF6", SCALE: "#EA580C", SCALE_FLAT: "#D97706",
};

/* ── Spinner ──────────────────────────────────────────────────────────── */
function Spin({ size = 20 }: { size?: number }) {
  return <RefreshCw size={size} style={{ animation: "spin .7s linear infinite" }} />;
}

/* ── Toast ───────────────────────────────────────────────────────────── */
function Toast({ msg, ok, onClose }: { msg: string; ok: boolean; onClose: () => void }) {
  return (
    <div style={{
      position: "fixed", top: 24, right: 24, zIndex: 9999,
      background: ok ? "linear-gradient(135deg,#15803d,#16a34a)" : "linear-gradient(135deg,#dc2626,#ef4444)",
      color: "#fff", padding: "14px 20px", borderRadius: 14,
      fontSize: 13, fontWeight: 600,
      boxShadow: ok ? "0 8px 30px rgba(22,163,74,.35)" : "0 8px 30px rgba(239,68,68,.35)",
      display: "flex", alignItems: "center", gap: 10,
      animation: "slideIn .2s ease",
    }}>
      {ok ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
      {msg}
      <button onClick={onClose} style={{ marginLeft: 8, background: "none", border: "none", color: "rgba(255,255,255,.6)", cursor: "pointer", fontSize: 16, lineHeight: 1 }}>×</button>
    </div>
  );
}

/* ── Stat tile ───────────────────────────────────────────────────────── */
function StatTile({ label, value, sub, icon: Icon, color, pctVal }: {
  label: string; value: string; sub?: string; icon: LucideIcon; color: string; pctVal?: number;
}) {
  return (
    <div style={{
      background: "#fff", border: "1px solid #E5E7EB", borderRadius: 16,
      padding: "20px 22px", display: "flex", flexDirection: "column", gap: 12,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "#9CA3AF" }}>{label}</span>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={15} style={{ color }} />
        </div>
      </div>
      <div>
        <div style={{ fontSize: 26, fontWeight: 800, color: "#111827", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{value}</div>
        {sub && <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>{sub}</div>}
      </div>
      {pctVal !== undefined && (
        <div>
          <div style={{ height: 5, background: "#F3F4F6", borderRadius: 99, overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 99, transition: "width .5s ease",
              width: `${pctVal}%`,
              background: pctVal >= 90 ? "#ef4444" : pctVal >= 70 ? "#f59e0b" : color,
            }} />
          </div>
          <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4, display: "flex", justifyContent: "space-between" }}>
            <span>{pctVal}% used</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Plan card ───────────────────────────────────────────────────────── */
function PlanCard({ plan, currentPlanId, onSelect, loading }: {
  plan: PlanConfig; currentPlanId: string;
  onSelect: (planId: string, cycle: "monthly" | "annual") => void;
  loading: boolean;
}) {
  const [cycle, setCycle] = useState<"monthly" | "annual">("annual");
  const isCurrent = currentPlanId === plan.id;
  const accent = PLAN_ACCENT[plan.id] ?? "#6366F1";
  const price = plan.isFlat
    ? (cycle === "annual" ? plan.flatAnnual : plan.flatMonthly)
    : (cycle === "annual" ? plan.annualPrice : plan.monthlyPrice);

  const isPopular = plan.id === "GROWTH";
  const isBest = plan.id === "SCALE_FLAT";

  return (
    <div style={{
      position: "relative",
      background: isCurrent ? `${accent}08` : "#fff",
      border: `2px solid ${isCurrent ? accent : isPopular ? `${accent}55` : "#E5E7EB"}`,
      borderRadius: 20,
      padding: "28px 22px 22px",
      display: "flex", flexDirection: "column",
      boxShadow: isCurrent ? `0 0 0 4px ${accent}18, 0 8px 32px ${accent}12` : isPopular ? `0 8px 40px ${accent}18` : "none",
      transition: "transform .2s ease, box-shadow .2s ease",
    }}
    onMouseEnter={(e) => { if (!isCurrent) { (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)"; (e.currentTarget as HTMLElement).style.boxShadow = `0 12px 40px ${accent}18`; } }}
    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "none"; (e.currentTarget as HTMLElement).style.boxShadow = isCurrent ? `0 0 0 4px ${accent}18, 0 8px 32px ${accent}12` : isPopular ? `0 8px 40px ${accent}18` : "none"; }}
    >
      {/* Badge */}
      {(isCurrent || isPopular || isBest) && (
        <div style={{
          position: "absolute", top: -13, left: "50%", transform: "translateX(-50%)",
          background: isCurrent ? accent : isPopular ? "#8B5CF6" : "#D97706",
          color: "#fff", fontSize: 9, fontWeight: 800, letterSpacing: ".1em",
          textTransform: "uppercase", padding: "4px 14px", borderRadius: 99,
          whiteSpace: "nowrap", boxShadow: `0 4px 12px ${accent}50`,
        }}>
          {isCurrent ? "✓ Your Plan" : isPopular ? "⭐ Best Value" : "∞ Unlimited Users"}
        </div>
      )}

      {/* Plan name */}
      <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".12em", color: accent, marginBottom: 10 }}>
        {plan.name}
      </div>

      {/* Price */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 3, marginBottom: 6 }}>
        <span style={{ fontSize: 38, fontWeight: 900, color: "#111827", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
          ${price}
        </span>
        <span style={{ fontSize: 12, color: "#9CA3AF", paddingBottom: 5 }}>
          {plan.id === "FREE" ? "forever free" : plan.isFlat ? "/mo flat" : "/user/mo"}
        </span>
      </div>

      {/* Billing toggle */}
      {plan.id !== "FREE" && (
        <div style={{ display: "flex", background: "#F3F4F6", borderRadius: 99, padding: 3, marginBottom: 18, width: "fit-content" }}>
          {(["monthly", "annual"] as const).map((c) => (
            <button key={c} onClick={() => setCycle(c)} style={{
              fontSize: 10, fontWeight: 700, padding: "4px 12px", borderRadius: 99,
              border: "none", cursor: "pointer", textTransform: "capitalize",
              background: cycle === c ? "#fff" : "transparent",
              color: cycle === c ? accent : "#9CA3AF",
              boxShadow: cycle === c ? "0 1px 4px rgba(0,0,0,.1)" : "none",
              transition: "all .15s",
            }}>
              {c}{c === "annual" && <span style={{ color: "#16a34a", marginLeft: 3 }}>−20%</span>}
            </button>
          ))}
        </div>
      )}

      {/* Features */}
      <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 8, marginBottom: 22, flex: 1 }}>
        {plan.features.map((f) => (
          <li key={f} style={{ fontSize: 12.5, color: "#4B5563", display: "flex", gap: 8, alignItems: "flex-start" }}>
            <CheckCircle size={13} style={{ color: accent, flexShrink: 0, marginTop: 1 }} />
            {f}
          </li>
        ))}
      </ul>

      {/* CTA */}
      {plan.id === "FREE" ? (
        <div style={{
          textAlign: "center", fontSize: 12, color: "#9CA3AF",
          padding: "10px 0", borderTop: "1px solid #F3F4F6",
        }}>
          {isCurrent ? "Your current plan — always free" : "Downgrade by cancelling paid plan"}
        </div>
      ) : (
        <button
          disabled={isCurrent || loading}
          onClick={() => onSelect(plan.id, cycle)}
          style={{
            width: "100%", padding: "11px 0", borderRadius: 12, border: "none",
            background: isCurrent ? "#F3F4F6" : PLAN_GRADIENT[plan.id],
            color: isCurrent ? "#9CA3AF" : "#fff",
            fontWeight: 800, fontSize: 13, cursor: isCurrent ? "default" : "pointer",
            opacity: loading ? 0.7 : 1,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            boxShadow: isCurrent ? "none" : `0 4px 20px ${accent}40`,
            transition: "opacity .15s",
          }}
        >
          {loading ? <Spin size={13} /> : isCurrent ? "Active Plan" : <>Upgrade to {plan.name} <ArrowRight size={13} /></>}
        </button>
      )}
    </div>
  );
}

/* ── TopUp card ──────────────────────────────────────────────────────── */
function TopUpCard({ pack, onBuy, loading }: { pack: TopUpPack; onBuy: (id: string) => void; loading: boolean }) {
  const isAi = pack.type === "AI_CREDITS";
  const accent = isAi ? "#8B5CF6" : "#3B82F6";

  return (
    <div
      onClick={() => !loading && onBuy(pack.id)}
      style={{
        background: "#fff", border: "1px solid #E5E7EB", borderRadius: 14,
        padding: "16px 18px", cursor: loading ? "wait" : "pointer",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14,
        transition: "border-color .15s, transform .15s, box-shadow .15s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = accent;
        (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
        (e.currentTarget as HTMLElement).style.boxShadow = `0 6px 24px ${accent}18`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "#E5E7EB";
        (e.currentTarget as HTMLElement).style.transform = "none";
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: `${accent}12`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {isAi ? <Sparkles size={16} style={{ color: accent }} /> : <HardDrive size={16} style={{ color: accent }} />}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{pack.label}</div>
          <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 1 }}>{pack.description}</div>
        </div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: accent }}>{fmt(pack.priceCents)}</div>
        <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 600 }}>ONE-TIME</div>
      </div>
    </div>
  );
}

/* ── Tab button ──────────────────────────────────────────────────────── */
function TabBtn({ id, active, icon: Icon, label, badge, onClick }: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  id: Tab; active: boolean; icon: any; label: string; badge?: number; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 7,
        padding: "9px 16px", borderRadius: 10, border: "none", cursor: "pointer",
        background: active ? "#6366F118" : "transparent",
        color: active ? "#6366F1" : "#6B7280",
        fontWeight: active ? 700 : 500, fontSize: 13,
        transition: "all .15s", position: "relative",
      }}
    >
      <Icon size={14} />
      {label}
      {badge !== undefined && badge > 0 && (
        <span style={{
          minWidth: 18, height: 18, borderRadius: 99, background: "#6366F1",
          color: "#fff", fontSize: 10, fontWeight: 800,
          display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px",
        }}>{badge}</span>
      )}
      {active && (
        <div style={{
          position: "absolute", bottom: -10, left: "50%", transform: "translateX(-50%)",
          width: "60%", height: 2, background: "#6366F1", borderRadius: 99,
        }} />
      )}
    </button>
  );
}

/* ═════════════════════════════════════════════════════════════════════ */

export default function BillingPage() {
  return (
    <Suspense fallback={<div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}><Spin size={28} /></div>}>
      <BillingContent />
    </Suspense>
  );
}

type DemoCheckoutState = {
  planId: string; planName: string; price: number; cycle: "monthly" | "annual";
  step: "confirm" | "payment" | "processing" | "done";
} | null;

function BillingContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab]           = useState<Tab>("overview");
  const [data, setData]         = useState<UsageData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [toast, setToast]       = useState<{ msg: string; ok: boolean } | null>(null);
  const [stripeEnabled, setStripeEnabled] = useState(true);
  const [demoCheckout, setDemoCheckout]   = useState<DemoCheckoutState>(null);

  const showToast = useCallback((msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4500);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [usageRes, cfgRes] = await Promise.all([
        fetch("/api/billing/usage"),
        fetch("/api/billing/config"),
      ]);
      if (usageRes.ok) setData(await usageRes.json());
      if (cfgRes.ok) { const cfg = await cfgRes.json(); setStripeEnabled(cfg.stripeEnabled); }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    if (searchParams.get("success") === "1")    showToast("🎉 Plan activated! Credits have been granted.", true);
    if (searchParams.get("canceled") === "1")   showToast("Checkout cancelled.", false);
    if (searchParams.get("topup") === "success") showToast("TopUp purchased! Credits added to your balance.", true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpgrade = async (planId: string, cycle: "monthly" | "annual") => {
    if (!stripeEnabled) {
      const plan = PLANS[planId as keyof typeof PLANS];
      if (!plan) return;
      const price = plan.isFlat
        ? (cycle === "annual" ? plan.flatAnnual! : plan.flatMonthly!)
        : (cycle === "annual" ? plan.annualPrice! : plan.monthlyPrice!);
      setDemoCheckout({ planId, planName: plan.name, price, cycle, step: "confirm" });
      return;
    }
    setActionId(`plan_${planId}`);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, billingCycle: cycle }),
      });
      const json = await res.json();
      if (json.url) router.push(json.url);
      else showToast(json.error ?? "Could not start checkout", false);
    } finally { setActionId(null); }
  };

  const handlePortal = async () => {
    setActionId("portal");
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const json = await res.json();
      if (json.url) window.open(json.url, "_blank");
      else showToast(json.error ?? "Could not open portal", false);
    } finally { setActionId(null); }
  };

  const handleTopUp = async (packId: string) => {
    setActionId(`topup_${packId}`);
    try {
      const res = await fetch("/api/billing/topup", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      });
      const json = await res.json();
      if (json.url) router.push(json.url);
      else showToast(json.error ?? "Could not start checkout", false);
    } finally { setActionId(null); }
  };

  const sub     = data?.subscription ?? null;
  const usage   = data?.usage ?? null;
  const plan    = data?.plan ?? null;
  const planId  = sub?.plan ?? "FREE";
  const accent  = PLAN_ACCENT[planId] ?? "#6366F1";
  const gradient = PLAN_GRADIENT[planId] ?? PLAN_GRADIENT.FREE;
  const invoiceCount = data?.invoices?.length ?? 0;

  /* ── Tabs content ─────────────────────────────────────────────────── */

  const OverviewTab = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Current plan hero */}
      <div style={{
        borderRadius: 20, padding: "28px 32px",
        background: gradient,
        color: "#fff", position: "relative", overflow: "hidden",
      }}>
        <div aria-hidden style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "radial-gradient(ellipse 70% 100% at 90% -10%, rgba(255,255,255,.15) 0, transparent 60%)",
        }} />
        <div style={{ position: "relative", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 20 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <Crown size={18} />
              <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase", opacity: .8 }}>
                {plan?.name ?? "Free"} Plan
              </span>
              {sub?.status && (
                <span style={{
                  fontSize: 9, fontWeight: 800, padding: "3px 9px", borderRadius: 99,
                  background: sub.status === "active" ? "rgba(255,255,255,.25)" : "rgba(255,0,0,.4)",
                  letterSpacing: ".08em", textTransform: "uppercase",
                }}>
                  {sub.status}
                </span>
              )}
            </div>
            <div style={{ fontSize: 13, opacity: .75 }}>
              {sub?.seats ?? 1} seat{(sub?.seats ?? 1) !== 1 ? "s" : ""} · {sub?.billingCycle ?? "free"} billing
              {sub?.currentPeriodEnd && (
                <> · {sub.cancelAtPeriodEnd ? "Cancels" : "Renews"} {new Date(sub.currentPeriodEnd).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</>
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {sub?.stripeSubscriptionId && (
              <button
                onClick={handlePortal}
                disabled={actionId === "portal"}
                style={{
                  display: "flex", alignItems: "center", gap: 7,
                  padding: "10px 20px", background: "rgba(255,255,255,.2)", backdropFilter: "blur(6px)",
                  border: "1px solid rgba(255,255,255,.3)", borderRadius: 12,
                  color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer",
                  transition: "background .15s",
                }}
              >
                {actionId === "portal" ? <Spin size={13} /> : <ExternalLink size={13} />}
                Manage Subscription
              </button>
            )}
            {planId === "FREE" && (
              <button
                onClick={() => setTab("plans")}
                style={{
                  display: "flex", alignItems: "center", gap: 7,
                  padding: "10px 20px", background: "rgba(255,255,255,.95)",
                  border: "none", borderRadius: 12,
                  color: accent, fontWeight: 800, fontSize: 13, cursor: "pointer",
                }}
              >
                <Star size={13} /> Upgrade Plan
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Usage tiles */}
      {usage && (
        <>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: "#111827", marginBottom: -8 }}>Usage This Month</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
            <StatTile
              label="AI Credits Used" icon={Sparkles} color="#8B5CF6"
              value={usage.aiCredits.used.toLocaleString()}
              sub={`of ${usage.aiCredits.quota === -1 ? "∞" : usage.aiCredits.quota.toLocaleString()} quota`}
              pctVal={usage.aiCredits.quota > 0 ? pct(usage.aiCredits.used, usage.aiCredits.quota) : 0}
            />
            <StatTile
              label="Credit Balance" icon={Zap} color="#6366F1"
              value={usage.aiCredits.balance.toLocaleString()}
              sub="credits remaining (incl. top-ups)"
            />
            <StatTile
              label="Team Members" icon={Users} color="#3B82F6"
              value={usage.members.used.toLocaleString()}
              sub={usage.members.limit === -1 ? "Unlimited on your plan" : `of ${usage.members.limit} seats`}
              pctVal={usage.members.limit > 0 ? pct(usage.members.used, usage.members.limit) : undefined}
            />
            <StatTile
              label="Projects" icon={FolderOpen} color="#10B981"
              value={usage.projects.used.toLocaleString()}
              sub={usage.projects.limit === -1 ? "Unlimited on your plan" : `of ${usage.projects.limit} limit`}
              pctVal={usage.projects.limit > 0 ? pct(usage.projects.used, usage.projects.limit) : undefined}
            />
          </div>
        </>
      )}

      {/* Credit explainer */}
      <div style={{
        background: "#fff", border: "1px solid #E5E7EB", borderRadius: 16, padding: "22px 26px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: "#8B5CF618", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <TrendingUp size={14} style={{ color: "#8B5CF6" }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>How AI Credits Work</span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 0 }}>
          {[
            { cost: "1 credit", label: "Tag suggest · Status hint · Smart filter", icon: Zap, color: "#6366F1" },
            { cost: "5 credits", label: "Task summary · Description draft · Search", icon: Sparkles, color: "#8B5CF6" },
            { cost: "20 credits", label: "AI brief · Standup · Risk analysis · Meeting notes", icon: Crown, color: "#EA580C" },
          ].map((r, i) => (
            <div key={r.cost} style={{
              flex: "1 1 200px", display: "flex", gap: 12, alignItems: "flex-start",
              padding: "12px 16px",
              borderLeft: i > 0 ? "1px solid #F3F4F6" : "none",
            }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: `${r.color}12`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <r.icon size={14} style={{ color: r.color }} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: r.color }}>{r.cost}</div>
                <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>{r.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick links */}
      <div style={{ display: "flex", gap: 12 }}>
        {([
          { label: "Upgrade Plan", desc: "Unlock more features", tab: "plans" as Tab, icon: Crown, color: "#6366F1" },
          { label: "Buy Credits", desc: "Top up AI credits", tab: "topups" as Tab, icon: Sparkles, color: "#8B5CF6" },
          { label: "View Invoices", desc: `${invoiceCount} invoice${invoiceCount !== 1 ? "s" : ""} available`, tab: "invoices" as Tab, icon: Receipt, color: "#3B82F6" },
        ]).map(({ label, desc, tab: t, icon: Icon, color }) => (
          <button key={label} onClick={() => setTab(t)} style={{
            flex: 1, display: "flex", alignItems: "center", gap: 12,
            padding: "16px 18px", background: "#fff",
            border: "1px solid #E5E7EB", borderRadius: 14,
            cursor: "pointer", textAlign: "left",
            transition: "border-color .15s, transform .15s",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = color; (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#E5E7EB"; (e.currentTarget as HTMLElement).style.transform = "none"; }}
          >
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}12`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon size={16} style={{ color }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{label}</div>
              <div style={{ fontSize: 11, color: "#9CA3AF" }}>{desc}</div>
            </div>
            <ChevronRight size={14} style={{ color: "#D1D5DB" }} />
          </button>
        ))}
      </div>
    </div>
  );

  const PlansTab = () => (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "#111827", marginBottom: 4 }}>Choose a Plan</h2>
        <p style={{ fontSize: 13, color: "#6B7280" }}>All plans include a 14-day free trial. No credit card required for Free.</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 16 }}>
        {Object.values(PLANS).map((p) => (
          <PlanCard
            key={p.id} plan={p} currentPlanId={planId}
            onSelect={handleUpgrade} loading={actionId === `plan_${p.id}`}
          />
        ))}
      </div>

      {/* Feature comparison teaser */}
      <div style={{ marginTop: 32, background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 16, padding: "20px 24px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 14 }}>What's included</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
          {[
            { feature: "Kanban · List · Calendar", plans: ["FREE","STARTER","GROWTH","SCALE","SCALE_FLAT"] },
            { feature: "Gantt Chart", plans: ["STARTER","GROWTH","SCALE","SCALE_FLAT"] },
            { feature: "Custom Statuses", plans: ["STARTER","GROWTH","SCALE","SCALE_FLAT"] },
            { feature: "Time Tracking", plans: ["GROWTH","SCALE","SCALE_FLAT"] },
            { feature: "Client Portal", plans: ["GROWTH","SCALE","SCALE_FLAT"] },
            { feature: "Workload View", plans: ["GROWTH","SCALE","SCALE_FLAT"] },
            { feature: "AI Standup & Reports", plans: ["GROWTH","SCALE","SCALE_FLAT"] },
            { feature: "White-label Portal", plans: ["SCALE","SCALE_FLAT"] },
            { feature: "SSO / SAML", plans: ["SCALE","SCALE_FLAT"] },
            { feature: "Audit Logs", plans: ["SCALE","SCALE_FLAT"] },
            { feature: "Unlimited Automations", plans: ["SCALE","SCALE_FLAT"] },
            { feature: "99.9% SLA", plans: ["SCALE","SCALE_FLAT"] },
          ].map(({ feature, plans }) => {
            const included = plans.includes(planId);
            return (
              <div key={feature} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <CheckCircle size={13} style={{ color: included ? "#16a34a" : "#D1D5DB", flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: included ? "#374151" : "#9CA3AF" }}>{feature}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const TopUpsTab = () => (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "#111827", marginBottom: 4 }}>TopUp Packs</h2>
        <p style={{ fontSize: 13, color: "#6B7280" }}>One-time purchases that stack on top of your plan allocation. Credits are valid for 12 months.</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>
        {/* AI Credits */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: "#8B5CF612", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Sparkles size={14} style={{ color: "#8B5CF6" }} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#111827" }}>AI Credits</div>
              <div style={{ fontSize: 11, color: "#9CA3AF" }}>Current balance: {(usage?.aiCredits.balance ?? 0).toLocaleString()} credits</div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {AI_CREDIT_PACKS.map((pack) => (
              <TopUpCard key={pack.id} pack={pack} onBuy={handleTopUp} loading={actionId === `topup_${pack.id}`} />
            ))}
          </div>
        </div>
        {/* Storage */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: "#3B82F612", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <HardDrive size={14} style={{ color: "#3B82F6" }} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#111827" }}>Extra Storage</div>
              <div style={{ fontSize: 11, color: "#9CA3AF" }}>Included: {limitLabel(plan?.storageGb ?? 0.5)} GB on your plan</div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {STORAGE_PACKS.map((pack) => (
              <TopUpCard key={pack.id} pack={pack} onBuy={handleTopUp} loading={actionId === `topup_${pack.id}`} />
            ))}
          </div>
        </div>
      </div>

      {/* Security badge */}
      <div style={{ marginTop: 28, display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 12 }}>
        <Shield size={15} style={{ color: "#16a34a", flexShrink: 0 }} />
        <span style={{ fontSize: 12, color: "#15803d" }}>All purchases are processed securely by Stripe. Your card details are never stored on our servers.</span>
      </div>
    </div>
  );

  const InvoicesTab = () => (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "#111827", marginBottom: 4 }}>Invoice History</h2>
        <p style={{ fontSize: 13, color: "#6B7280" }}>All invoices are generated by Stripe and available to download as PDF.</p>
      </div>
      {(!data?.invoices || data.invoices.length === 0) ? (
        <div style={{
          background: "#fff", border: "1px solid #E5E7EB", borderRadius: 16,
          padding: "60px 40px", textAlign: "center",
        }}>
          <Receipt size={36} style={{ color: "#D1D5DB", margin: "0 auto 14px" }} />
          <div style={{ fontSize: 14, fontWeight: 700, color: "#9CA3AF" }}>No invoices yet</div>
          <div style={{ fontSize: 12, color: "#D1D5DB", marginTop: 6 }}>Your invoices will appear here once you subscribe to a paid plan.</div>
          <button onClick={() => setTab("plans")} style={{
            marginTop: 18, padding: "10px 22px", background: "#6366F1", color: "#fff",
            border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer",
          }}>View Plans</button>
        </div>
      ) : (
        <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 16, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
                {["Date", "Description", "Amount", "Status", ""].map((h) => (
                  <th key={h} style={{ padding: "12px 20px", fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".1em", color: "#9CA3AF", textAlign: "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.invoices.map((inv, i) => (
                <tr key={inv.id} style={{ borderTop: i > 0 ? "1px solid #F3F4F6" : "none" }}>
                  <td style={{ padding: "14px 20px", fontSize: 13, color: "#374151", whiteSpace: "nowrap" }}>
                    {new Date(inv.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td style={{ padding: "14px 20px", fontSize: 13, color: "#374151", maxWidth: 280 }}>{inv.description}</td>
                  <td style={{ padding: "14px 20px", fontSize: 13, fontWeight: 700, color: "#111827", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                    {fmt(inv.amount)}
                  </td>
                  <td style={{ padding: "14px 20px" }}>
                    <span style={{
                      fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 99,
                      textTransform: "uppercase", letterSpacing: ".06em",
                      background: inv.status === "paid" ? "#DCFCE7" : "#FEF3C7",
                      color: inv.status === "paid" ? "#15803d" : "#B45309",
                    }}>{inv.status}</span>
                  </td>
                  <td style={{ padding: "14px 20px" }}>
                    <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                      {inv.invoiceUrl && (
                        <a href={inv.invoiceUrl} target="_blank" rel="noreferrer" style={{
                          display: "flex", alignItems: "center", gap: 5, fontSize: 12,
                          color: "#6366F1", fontWeight: 600, textDecoration: "none",
                          padding: "4px 10px", background: "#6366F110", borderRadius: 7,
                        }}>
                          <ExternalLink size={11} /> View
                        </a>
                      )}
                      {inv.invoicePdf && (
                        <a href={inv.invoicePdf} target="_blank" rel="noreferrer" style={{
                          display: "flex", alignItems: "center", gap: 5, fontSize: 12,
                          color: "#6B7280", fontWeight: 600, textDecoration: "none",
                          padding: "4px 10px", background: "#F3F4F6", borderRadius: 7,
                        }}>
                          <Download size={11} /> PDF
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  /* ── Demo checkout modal ─────────────────────────────────────────────── */
  const DemoCheckoutModal = () => {
    if (!demoCheckout) return null;
    const { planName, price, cycle, step, planId } = demoCheckout;
    const advance = async () => {
      if (step === "confirm") { setDemoCheckout((d) => d && { ...d, step: "payment" }); return; }
      if (step === "payment") {
        setDemoCheckout((d) => d && { ...d, step: "processing" });
        await new Promise((r) => setTimeout(r, 2000));
        await fetch("/api/billing/demo-upgrade", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planId }),
        });
        setDemoCheckout((d) => d && { ...d, step: "done" });
        load();
        return;
      }
      if (step === "done") { setDemoCheckout(null); setTab("overview"); }
    };

    const STEPS = ["confirm", "payment", "processing", "done"];
    const stepIdx = STEPS.indexOf(step);

    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 9000, background: "rgba(5,5,20,0.72)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
        onClick={(e) => { if (e.target === e.currentTarget && step !== "processing") setDemoCheckout(null); }}>
        <div style={{ width: "100%", maxWidth: 440, background: "#fff", borderRadius: 24, overflow: "hidden", boxShadow: "0 32px 120px rgba(0,0,0,0.4)" }}>
          {/* Header bar */}
          <div style={{ background: "linear-gradient(135deg,#7C3AED,#6366F1)", padding: "22px 24px", position: "relative" }}>
            {/* step dots */}
            <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
              {["Plan", "Payment", "Processing", "Done"].map((label, i) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: i <= stepIdx ? "#fff" : "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: i <= stepIdx ? "#7C3AED" : "rgba(255,255,255,0.5)", transition: "all .3s" }}>
                    {i < stepIdx ? "✓" : i + 1}
                  </div>
                  {i < 3 && <div style={{ flex: 1, height: 1, width: 18, background: i < stepIdx ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.2)", transition: "background .3s" }} />}
                </div>
              ))}
            </div>
            <p style={{ fontSize: 18, fontWeight: 800, color: "#fff", margin: 0 }}>
              {step === "confirm" && `Upgrade to ${planName}`}
              {step === "payment" && "Payment Details"}
              {step === "processing" && "Processing…"}
              {step === "done" && "🎉 Plan Activated!"}
            </p>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 4 }}>
              {step === "confirm" && `${planName} plan · billed ${cycle}`}
              {step === "payment" && "Secure demo checkout"}
              {step === "processing" && "Setting up your account…"}
              {step === "done" && "Your plan has been upgraded successfully"}
            </p>
            {step !== "processing" && (
              <button onClick={() => setDemoCheckout(null)} style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", padding: "4px 8px", fontSize: 16, lineHeight: 1 }}>×</button>
            )}
          </div>

          {/* Body */}
          <div style={{ padding: "24px" }}>
            {step === "confirm" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ background: "#F9FAFB", borderRadius: 14, padding: "16px 18px", border: "1px solid #E5E7EB" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>{planName} Plan</span>
                    <span style={{ fontSize: 20, fontWeight: 900, color: "#111827" }}>${price}<span style={{ fontSize: 12, fontWeight: 500, color: "#9CA3AF" }}>/mo</span></span>
                  </div>
                  <div style={{ fontSize: 11, color: "#6B7280", background: "#FEF3C7", borderRadius: 8, padding: "8px 12px", border: "1px solid #FDE68A" }}>
                    🧪 <strong>Demo Mode</strong> — No real payment will be charged. This simulates the checkout experience.
                  </div>
                </div>
                <button onClick={advance} style={{ width: "100%", padding: "14px", borderRadius: 14, background: "linear-gradient(135deg,#7C3AED,#6366F1)", border: "none", color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer", boxShadow: "0 6px 24px rgba(124,58,237,0.35)" }}>
                  Continue to Payment →
                </button>
              </div>
            )}

            {step === "payment" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {[
                  { label: "Card number", value: "4242  4242  4242  4242" },
                  { label: "Expiry", value: "12 / 28" },
                  { label: "CVC", value: "•••" },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".06em" }}>{label}</p>
                    <div style={{ padding: "11px 14px", borderRadius: 12, border: "1px solid #E5E7EB", background: "#F9FAFB", fontSize: 14, fontWeight: 600, color: "#374151", fontFamily: "monospace", letterSpacing: ".05em" }}>{value}</div>
                  </div>
                ))}
                <p style={{ fontSize: 11, color: "#9CA3AF", textAlign: "center" }}>🔒 Secure & encrypted · Demo data only</p>
                <button onClick={advance} style={{ width: "100%", padding: "14px", borderRadius: 14, background: "linear-gradient(135deg,#7C3AED,#6366F1)", border: "none", color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer", marginTop: 4 }}>
                  Pay ${price} & Activate →
                </button>
              </div>
            )}

            {step === "processing" && (
              <div style={{ textAlign: "center", padding: "24px 0" }}>
                <div style={{ fontSize: 40, marginBottom: 14 }}>⚙️</div>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 8 }}>Setting up your {planName} plan…</p>
                <p style={{ fontSize: 12, color: "#9CA3AF" }}>Granting features and credits</p>
                <div style={{ width: 160, height: 4, background: "#F3F4F6", borderRadius: 99, margin: "20px auto 0", overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 99, background: "linear-gradient(90deg,#7C3AED,#6366F1)", animation: "demoProgress 1.8s ease-in-out forwards" }} />
                </div>
              </div>
            )}

            {step === "done" && (
              <div style={{ textAlign: "center", padding: "16px 0" }}>
                <div style={{ fontSize: 52, marginBottom: 12 }}>🎉</div>
                <p style={{ fontSize: 16, fontWeight: 800, color: "#111827", marginBottom: 8 }}>Welcome to {planName}!</p>
                <p style={{ fontSize: 13, color: "#6B7280", marginBottom: 24 }}>Your plan is now active. Enjoy all the new features.</p>
                <button onClick={advance} style={{ padding: "12px 32px", borderRadius: 14, background: "linear-gradient(135deg,#7C3AED,#6366F1)", border: "none", color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>
                  Go to Overview
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  /* ── Render ─────────────────────────────────────────────────────────── */
  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB" }}>
      {toast && <Toast msg={toast.msg} ok={toast.ok} onClose={() => setToast(null)} />}
      <DemoCheckoutModal />

      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "32px 32px 60px" }}>

        {/* Page header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <CreditCard size={20} style={{ color: "#6366F1" }} />
            <h1 style={{ fontSize: 24, fontWeight: 900, color: "#111827", letterSpacing: "-0.02em" }}>Billing & Subscription</h1>
            {!stripeEnabled && (
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", padding: "3px 10px", borderRadius: 99, background: "#FEF3C7", color: "#92400E", border: "1px solid #FDE68A" }}>
                🧪 Demo Mode
              </span>
            )}
          </div>
          <p style={{ fontSize: 13, color: "#9CA3AF" }}>Manage your plan, credits, top-ups, and invoices.</p>
        </div>

        {/* Tabs */}
        <div style={{
          display: "flex", gap: 4, marginBottom: 28,
          padding: "6px 8px", background: "#fff",
          border: "1px solid #E5E7EB", borderRadius: 14,
          width: "fit-content",
          position: "relative",
        }}>
          <TabBtn id="overview" active={tab === "overview"} icon={LayoutDashboard_} label="Overview" onClick={() => setTab("overview")} />
          <TabBtn id="plans"    active={tab === "plans"}    icon={Star}              label="Plans"    onClick={() => setTab("plans")} />
          <TabBtn id="topups"   active={tab === "topups"}   icon={Zap}               label="TopUps"   onClick={() => setTab("topups")} />
          <TabBtn id="invoices" active={tab === "invoices"} icon={Receipt}           label="Invoices" badge={invoiceCount} onClick={() => setTab("invoices")} />
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300, gap: 12, color: "#9CA3AF" }}>
            <Spin size={22} /> Loading billing data…
          </div>
        ) : (
          <>
            {tab === "overview" && <OverviewTab />}
            {tab === "plans"    && <PlansTab />}
            {tab === "topups"   && <TopUpsTab />}
            {tab === "invoices" && <InvoicesTab />}
          </>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideIn { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:none; } }
        @keyframes demoProgress { from { width:0; } to { width:100%; } }
      `}</style>
    </div>
  );
}

// Inline icon alias to avoid import collision
function LayoutDashboard_({ size, style }: { size?: number; style?: React.CSSProperties }) {
  return <svg width={size ?? 14} height={size ?? 14} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>;
}
