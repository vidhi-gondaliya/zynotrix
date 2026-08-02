"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CreditCard, Zap, HardDrive, CheckCircle, AlertTriangle,
  ExternalLink, Download, Sparkles, Users, FolderOpen,
  TrendingUp, Crown, ArrowRight, RefreshCw, type LucideIcon,
} from "lucide-react";
import { PLANS, AI_CREDIT_PACKS, STORAGE_PACKS, type PlanConfig, type TopUpPack } from "@/lib/stripe";

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── Helpers ───────────────────────────────────────────────────────────────────

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

const PLAN_COLORS: Record<string, string> = {
  FREE:       "var(--text-muted, #6B7FA3)",
  STARTER:    "#3B82F6",
  GROWTH:     "#8B5CF6",
  SCALE:      "#E05C42",
  SCALE_FLAT: "#D97706",
};

// ── Meter bar ─────────────────────────────────────────────────────────────────

function Meter({ label, used, limit, unit = "", icon: Icon }: {
  label: string; used: number; limit: number; unit?: string;
  icon: LucideIcon;
}) {
  const isUnlimited = limit === -1;
  const p = isUnlimited ? 0 : pct(used, limit);
  const over = p >= 90;

  return (
    <div style={{
      background: "var(--bg-card, #fff)", border: "1px solid var(--border, #e5e7eb)",
      borderRadius: 12, padding: "16px 18px",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Icon size={14} style={{ color: over ? "#ef4444" : "var(--text-muted, #6B7FA3)" }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted, #6B7FA3)", textTransform: "uppercase", letterSpacing: ".06em" }}>{label}</span>
        </div>
        <span style={{ fontSize: 12, color: "var(--text-muted, #6B7FA3)" }}>
          {used.toLocaleString()}{unit} / {isUnlimited ? "∞" : `${limit.toLocaleString()}${unit}`}
        </span>
      </div>
      {!isUnlimited && (
        <div style={{ height: 6, background: "var(--bg, #f3f4f6)", borderRadius: 99, overflow: "hidden" }}>
          <div style={{
            height: "100%", width: `${p}%`, borderRadius: 99,
            background: p >= 100 ? "#ef4444" : p >= 75 ? "#f59e0b" : "#3B82F6",
            transition: "width .4s ease",
          }} />
        </div>
      )}
      {isUnlimited && (
        <div style={{ fontSize: 11, color: "#16a34a", fontWeight: 600 }}>Unlimited on your plan</div>
      )}
    </div>
  );
}

// ── Plan card ─────────────────────────────────────────────────────────────────

function PlanCard({ plan, current, onSelect, loading }: {
  plan: PlanConfig; current: boolean;
  onSelect: (planId: string, cycle: "monthly" | "annual") => void;
  loading: boolean;
}) {
  const [cycle, setCycle] = useState<"monthly" | "annual">("annual");
  const price = plan.isFlat
    ? (cycle === "annual" ? plan.flatAnnual : plan.flatMonthly)
    : (cycle === "annual" ? plan.annualPrice : plan.monthlyPrice);
  const accent = PLAN_COLORS[plan.id] ?? "#3B82F6";

  return (
    <div style={{
      background: "var(--bg-card, #fff)",
      border: `1.5px solid ${current ? accent : "var(--border, #e5e7eb)"}`,
      borderRadius: 14, padding: "22px 18px", position: "relative",
      boxShadow: current ? `0 0 0 3px ${accent}22` : undefined,
      display: "flex", flexDirection: "column", gap: 0,
    }}>
      {current && (
        <div style={{
          position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)",
          background: accent, color: "#fff", fontSize: 10, fontWeight: 700,
          letterSpacing: ".08em", textTransform: "uppercase", padding: "3px 12px", borderRadius: 20,
          whiteSpace: "nowrap",
        }}>Current Plan</div>
      )}
      {plan.id === "GROWTH" && !current && (
        <div style={{
          position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)",
          background: "#8B5CF6", color: "#fff", fontSize: 10, fontWeight: 700,
          letterSpacing: ".08em", textTransform: "uppercase", padding: "3px 12px", borderRadius: 20,
        }}>Best Value</div>
      )}

      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: accent, marginBottom: 6 }}>
        {plan.name}
      </div>

      <div style={{ display: "flex", alignItems: "flex-end", gap: 4, marginBottom: 4 }}>
        <span style={{ fontSize: 32, fontWeight: 800, color: "var(--text, #111)", lineHeight: 1 }}>
          ${price}
        </span>
        <span style={{ fontSize: 12, color: "var(--text-muted, #6B7FA3)", paddingBottom: 4 }}>
          {plan.isFlat ? "/mo flat" : "/user/mo"}
        </span>
      </div>

      {plan.id !== "FREE" && (
        <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
          {(["monthly", "annual"] as const).map((c) => (
            <button key={c} onClick={() => setCycle(c)} style={{
              fontSize: 10, fontWeight: 600, padding: "3px 9px", borderRadius: 20,
              border: `1px solid ${cycle === c ? accent : "var(--border, #e5e7eb)"}`,
              background: cycle === c ? `${accent}15` : "transparent",
              color: cycle === c ? accent : "var(--text-muted, #6B7FA3)",
              cursor: "pointer", textTransform: "capitalize",
            }}>{c}</button>
          ))}
        </div>
      )}

      <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 6, marginBottom: 18, flex: 1 }}>
        {plan.features.map((f) => (
          <li key={f} style={{ fontSize: 12, color: "var(--text-muted, #6B7FA3)", display: "flex", gap: 6, alignItems: "flex-start" }}>
            <CheckCircle size={12} style={{ color: "#16a34a", flexShrink: 0, marginTop: 1 }} />
            {f}
          </li>
        ))}
      </ul>

      {plan.id === "FREE" ? (
        <div style={{ fontSize: 12, textAlign: "center", color: "var(--text-muted, #6B7FA3)", padding: "8px 0" }}>
          {current ? "You are on the free plan" : "Downgrade by cancelling"}
        </div>
      ) : (
        <button
          disabled={current || loading}
          onClick={() => onSelect(plan.id, cycle)}
          style={{
            width: "100%", padding: "9px 0", borderRadius: 8, border: "none",
            background: current ? "var(--border, #e5e7eb)" : accent,
            color: current ? "var(--text-muted, #6B7FA3)" : "#fff",
            fontWeight: 700, fontSize: 13, cursor: current ? "default" : "pointer",
            opacity: loading ? 0.7 : 1,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}
        >
          {loading ? <RefreshCw size={13} className="spin" /> : null}
          {current ? "Active" : "Upgrade"}
          {!current && <ArrowRight size={13} />}
        </button>
      )}
    </div>
  );
}

// ── TopUp card ────────────────────────────────────────────────────────────────

function TopUpCard({ pack, onBuy, loading }: { pack: TopUpPack; onBuy: (id: string) => void; loading: boolean }) {
  const isAi = pack.type === "AI_CREDITS";
  const accent = isAi ? "#8B5CF6" : "#3B82F6";

  return (
    <div onClick={() => !loading && onBuy(pack.id)} style={{
      background: "var(--bg-card, #fff)", border: "1px solid var(--border, #e5e7eb)",
      borderRadius: 10, padding: "14px 16px", cursor: loading ? "wait" : "pointer",
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
      transition: "border-color .15s",
    }}
    onMouseEnter={(e) => (e.currentTarget.style.borderColor = accent)}
    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border, #e5e7eb)")}
    >
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text, #111)", marginBottom: 2 }}>{pack.label}</div>
        <div style={{ fontSize: 11, color: "var(--text-muted, #6B7FA3)" }}>{pack.description}</div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: accent }}>{fmt(pack.priceCents)}</div>
        <div style={{ fontSize: 10, color: "var(--text-muted, #6B7FA3)" }}>one-time</div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function BillingPage() {
  return (
    <Suspense fallback={<div style={{ padding: 60, textAlign: "center", color: "var(--text-muted, #6B7FA3)" }}><RefreshCw size={24} /></div>}>
      <BillingContent />
    </Suspense>
  );
}

function BillingContent() {
  const router        = useRouter();
  const searchParams  = useSearchParams();
  const [data, setData]       = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast]     = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/usage");
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    if (searchParams.get("success") === "1") showToast("Plan activated! Credits have been granted.", true);
    if (searchParams.get("canceled") === "1") showToast("Checkout cancelled.", false);
    if (searchParams.get("topup") === "success") showToast("TopUp purchased! Credits added to your balance.", true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpgrade = async (planId: string, cycle: "monthly" | "annual") => {
    setActionLoading(`plan_${planId}`);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, billingCycle: cycle }),
      });
      const json = await res.json();
      if (json.url) router.push(json.url);
      else showToast(json.error ?? "Could not start checkout", false);
    } finally {
      setActionLoading(null);
    }
  };

  const handlePortal = async () => {
    setActionLoading("portal");
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const json = await res.json();
      if (json.url) window.open(json.url, "_blank");
      else showToast(json.error ?? "Could not open portal", false);
    } finally {
      setActionLoading(null);
    }
  };

  const handleTopUp = async (packId: string) => {
    setActionLoading(`topup_${packId}`);
    try {
      const res = await fetch("/api/billing/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      });
      const json = await res.json();
      if (json.url) router.push(json.url);
      else showToast(json.error ?? "Could not start checkout", false);
    } finally {
      setActionLoading(null);
    }
  };

  const sub    = data?.subscription;
  const usage  = data?.usage;
  const plan   = data?.plan;
  const accent = PLAN_COLORS[sub?.plan ?? "FREE"] ?? "#3B82F6";

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1100, margin: "0 auto" }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 9999,
          background: toast.ok ? "#16a34a" : "#ef4444",
          color: "#fff", padding: "12px 20px", borderRadius: 10,
          fontSize: 13, fontWeight: 600, boxShadow: "0 4px 20px rgba(0,0,0,.2)",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          {toast.ok ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <CreditCard size={20} style={{ color: accent }} />
          <h1 style={{ fontSize: 22, fontWeight: 800 }}>Billing & Credits</h1>
        </div>
        <p style={{ fontSize: 13, color: "var(--text-muted, #6B7FA3)" }}>
          Manage your subscription, AI credits, and invoices.
        </p>
      </div>

      {loading ? (
        <div style={{ padding: 60, textAlign: "center", color: "var(--text-muted, #6B7FA3)" }}>
          <RefreshCw size={24} className="spin" />
        </div>
      ) : (
        <>
          {/* Current plan banner */}
          <div style={{
            background: `linear-gradient(135deg, ${accent}18 0%, ${accent}08 100%)`,
            border: `1.5px solid ${accent}33`,
            borderRadius: 14, padding: "20px 24px", marginBottom: 28,
            display: "flex", flexWrap: "wrap", gap: 20, alignItems: "center", justifyContent: "space-between",
          }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <Crown size={16} style={{ color: accent }} />
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: accent }}>
                  {plan?.name ?? "Free"} Plan
                </span>
                {sub?.status && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                    background: sub.status === "active" ? "#dcfce7" : "#fee2e2",
                    color: sub.status === "active" ? "#16a34a" : "#ef4444",
                  }}>{sub.status.toUpperCase()}</span>
                )}
              </div>
              {sub?.currentPeriodEnd && (
                <div style={{ fontSize: 12, color: "var(--text-muted, #6B7FA3)" }}>
                  {sub.cancelAtPeriodEnd ? "Cancels" : "Renews"} on {new Date(sub.currentPeriodEnd).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                </div>
              )}
              <div style={{ fontSize: 12, color: "var(--text-muted, #6B7FA3)", marginTop: 2 }}>
                {sub?.seats ?? 1} seat{(sub?.seats ?? 1) !== 1 ? "s" : ""} · {sub?.billingCycle ?? "–"} billing
              </div>
            </div>
            {sub?.stripeSubscriptionId && (
              <button
                onClick={handlePortal}
                disabled={actionLoading === "portal"}
                style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "9px 18px",
                  background: accent, color: "#fff", border: "none", borderRadius: 8,
                  fontSize: 13, fontWeight: 700, cursor: "pointer",
                }}
              >
                {actionLoading === "portal" ? <RefreshCw size={13} className="spin" /> : <ExternalLink size={13} />}
                Manage Subscription
              </button>
            )}
          </div>

          {/* Usage meters */}
          {usage && (
            <section style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Usage This Month</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                <Meter label="AI Credits" used={usage.aiCredits.used} limit={usage.aiCredits.quota} icon={Sparkles} />
                <Meter label="Members" used={usage.members.used} limit={usage.members.limit} icon={Users} />
                <Meter label="Projects" used={usage.projects.used} limit={usage.projects.limit} icon={FolderOpen} />
                <div style={{
                  background: "var(--bg-card, #fff)", border: "1px solid var(--border, #e5e7eb)",
                  borderRadius: 12, padding: "16px 18px",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <Zap size={14} style={{ color: "var(--text-muted, #6B7FA3)" }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted, #6B7FA3)", textTransform: "uppercase", letterSpacing: ".06em" }}>Credit Balance</span>
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: "#8B5CF6", fontVariantNumeric: "tabular-nums" }}>
                    {usage.aiCredits.balance.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted, #6B7FA3)", marginTop: 2 }}>
                    credits remaining (incl. TopUps)
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Plan selector */}
          <section style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Choose a Plan</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
              {Object.values(PLANS).map((p) => (
                <PlanCard
                  key={p.id}
                  plan={p}
                  current={(sub?.plan ?? "FREE") === p.id}
                  onSelect={handleUpgrade}
                  loading={actionLoading === `plan_${p.id}`}
                />
              ))}
            </div>
          </section>

          {/* TopUp packs */}
          <section style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>TopUp Packs</h2>
            <p style={{ fontSize: 12, color: "var(--text-muted, #6B7FA3)", marginBottom: 16 }}>
              One-time purchases that stack on top of your plan. Credits never expire within 12 months.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#8B5CF6", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                  <Sparkles size={13} /> AI Credits
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {AI_CREDIT_PACKS.map((pack) => (
                    <TopUpCard key={pack.id} pack={pack} onBuy={handleTopUp} loading={actionLoading === `topup_${pack.id}`} />
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#3B82F6", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                  <HardDrive size={13} /> Storage
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {STORAGE_PACKS.map((pack) => (
                    <TopUpCard key={pack.id} pack={pack} onBuy={handleTopUp} loading={actionLoading === `topup_${pack.id}`} />
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Invoice history */}
          {data?.invoices && data.invoices.length > 0 && (
            <section>
              <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Invoice History</h2>
              <div style={{
                border: "1px solid var(--border, #e5e7eb)", borderRadius: 12, overflow: "hidden",
              }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "var(--bg-alt, #f9fafb)" }}>
                      {["Date", "Description", "Amount", "Status", ""].map((h) => (
                        <th key={h} style={{ padding: "10px 16px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--text-muted, #6B7FA3)", textAlign: "left" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.invoices.map((inv) => (
                      <tr key={inv.id} style={{ borderTop: "1px solid var(--border, #e5e7eb)" }}>
                        <td style={{ padding: "12px 16px", fontSize: 13 }}>{new Date(inv.createdAt).toLocaleDateString()}</td>
                        <td style={{ padding: "12px 16px", fontSize: 13 }}>{inv.description}</td>
                        <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{fmt(inv.amount)}</td>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{
                            fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                            background: inv.status === "paid" ? "#dcfce7" : "#fef3c7",
                            color: inv.status === "paid" ? "#16a34a" : "#d97706",
                          }}>{inv.status}</span>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          {inv.invoiceUrl && (
                            <a href={inv.invoiceUrl} target="_blank" rel="noreferrer" style={{ color: "#3B82F6", display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
                              <ExternalLink size={12} /> View
                            </a>
                          )}
                          {inv.invoicePdf && (
                            <a href={inv.invoicePdf} target="_blank" rel="noreferrer" style={{ color: "#6B7FA3", display: "flex", alignItems: "center", gap: 4, fontSize: 12, marginTop: 2 }}>
                              <Download size={12} /> PDF
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Credit explainer */}
          <div style={{
            marginTop: 32, padding: "18px 22px",
            background: "var(--bg-card, #fff)", border: "1px solid var(--border, #e5e7eb)", borderRadius: 12,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <TrendingUp size={14} style={{ color: "#8B5CF6" }} />
              <span style={{ fontSize: 12, fontWeight: 700 }}>How AI Credits Work</span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
              {[
                { cost: "1 credit", label: "Tag suggest, status hint, smart filter" },
                { cost: "5 credits", label: "Task summary, description draft" },
                { cost: "20 credits", label: "AI brief, standup, risk analysis, meeting notes" },
              ].map((r) => (
                <div key={r.cost} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#8B5CF6", minWidth: 68 }}>{r.cost}</span>
                  <span style={{ fontSize: 12, color: "var(--text-muted, #6B7FA3)" }}>{r.label}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <style>{`.spin { animation: spin .7s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
