"use client";

import { Lock, Zap } from "lucide-react";
import Link from "next/link";
import { usePlan } from "@/hooks/usePlan";
import { FEATURE_MIN_PLAN_NAME, type PlanFeature } from "@/lib/plan-gate";

interface PlanGateProps {
  /** The feature to check */
  feature: PlanFeature;
  /** Content to render when allowed */
  children: React.ReactNode;
  /** Custom content to render when blocked (instead of default upgrade card) */
  fallback?: React.ReactNode;
  /** Wrap children in a relative container and show a translucent overlay instead of replacing */
  overlay?: boolean;
}

export function PlanGate({ feature, children, fallback, overlay = false }: PlanGateProps) {
  const { can, loading } = usePlan();

  // Optimistic — show content while loading to avoid flash
  if (loading || can(feature)) return <>{children}</>;

  if (fallback) return <>{fallback}</>;

  if (overlay) {
    return (
      <div style={{ position: "relative" }}>
        <div style={{ pointerEvents: "none", opacity: 0.3, userSelect: "none" }}>{children}</div>
        <UpgradeOverlay feature={feature} />
      </div>
    );
  }

  return <UpgradeCard feature={feature} />;
}

// ── Upgrade card (replaces content) ──────────────────────────────────────────

function UpgradeCard({ feature }: { feature: PlanFeature }) {
  const planName = FEATURE_MIN_PLAN_NAME[feature] ?? "higher";

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "48px 24px", textAlign: "center", gap: 14,
      background: "var(--bg-card, #fff)",
      border: "1.5px dashed var(--border, #e5e7eb)", borderRadius: 14,
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: "50%",
        background: "var(--accent-bg, #fdf0ed)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Lock size={20} style={{ color: "var(--accent, #E05C42)" }} />
      </div>

      <div>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
          {planName} plan required
        </div>
        <div style={{ fontSize: 13, color: "var(--text-muted, #6B7FA3)", maxWidth: 300, lineHeight: 1.5 }}>
          This feature is available on the <strong>{planName}</strong> plan and above.
          Upgrade to unlock it for your team.
        </div>
      </div>

      <Link href="/billing" style={{
        display: "inline-flex", alignItems: "center", gap: 7,
        background: "var(--accent, #E05C42)", color: "#fff",
        padding: "9px 20px", borderRadius: 8,
        fontSize: 13, fontWeight: 700, textDecoration: "none",
      }}>
        <Zap size={13} />
        Upgrade to {planName}
      </Link>

      <div style={{ fontSize: 11, color: "var(--text-muted, #6B7FA3)" }}>
        View all plans on the{" "}
        <Link href="/billing" style={{ color: "var(--accent, #E05C42)" }}>
          Billing page
        </Link>
      </div>
    </div>
  );
}

// ── Overlay variant (blurs and overlays existing content) ─────────────────────

function UpgradeOverlay({ feature }: { feature: PlanFeature }) {
  const planName = FEATURE_MIN_PLAN_NAME[feature] ?? "higher";

  return (
    <div style={{
      position: "absolute", inset: 0, display: "flex",
      alignItems: "center", justifyContent: "center",
      background: "rgba(255,255,255,0.85)",
      backdropFilter: "blur(4px)",
      borderRadius: "inherit", zIndex: 10,
      flexDirection: "column", gap: 10, padding: 24, textAlign: "center",
    }}>
      <Lock size={18} style={{ color: "var(--accent, #E05C42)" }} />
      <div style={{ fontSize: 14, fontWeight: 700 }}>Requires {planName}</div>
      <Link href="/billing" style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        background: "var(--accent, #E05C42)", color: "#fff",
        padding: "7px 16px", borderRadius: 8,
        fontSize: 12, fontWeight: 700, textDecoration: "none",
      }}>
        <Zap size={11} /> Upgrade
      </Link>
    </div>
  );
}

// ── Inline badge (show beside a disabled button) ──────────────────────────────

export function PlanBadge({ feature }: { feature: PlanFeature }) {
  const { can, loading } = usePlan();
  if (loading || can(feature)) return null;

  const planName = FEATURE_MIN_PLAN_NAME[feature] ?? "higher";
  return (
    <Link href="/billing" title={`Requires ${planName} plan`} style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
      background: "var(--accent-bg, #fdf0ed)", color: "var(--accent, #E05C42)",
      textDecoration: "none", whiteSpace: "nowrap",
    }}>
      <Lock size={9} /> {planName}+
    </Link>
  );
}
