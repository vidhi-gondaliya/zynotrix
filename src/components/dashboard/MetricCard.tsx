"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: string;
  trend?: "up" | "down" | "neutral";
  icon: React.ReactNode;
  color?: "accent" | "secondary" | "success" | "warning" | "danger" | "info";
  index?: number;
  href?: string;
  subtitle?: string;
}

// Dark: slate-indigo accent · amber secondary · vivid semantics
const DARK_COLORS = {
  accent:    { icon: "#818CF8", glow: "rgba(129,140,248,0.40)", bg: "rgba(129,140,248,0.12)", bar: "#818CF8", border: "rgba(129,140,248,0.20)", grad: "linear-gradient(135deg,rgba(129,140,248,0.14) 0%,rgba(129,140,248,0.04) 100%)" },
  secondary: { icon: "#FBBF24", glow: "rgba(251,191,36,0.40)",  bg: "rgba(251,191,36,0.12)",  bar: "#FBBF24", border: "rgba(251,191,36,0.20)",  grad: "linear-gradient(135deg,rgba(251,191,36,0.14) 0%,rgba(251,191,36,0.04) 100%)" },
  success:   { icon: "#22C55E", glow: "rgba(34,197,94,0.40)",   bg: "rgba(34,197,94,0.12)",   bar: "#22C55E", border: "rgba(34,197,94,0.20)",   grad: "linear-gradient(135deg,rgba(34,197,94,0.14) 0%,rgba(34,197,94,0.04) 100%)" },
  warning:   { icon: "#F59E0B", glow: "rgba(245,158,11,0.40)",  bg: "rgba(245,158,11,0.12)",  bar: "#F59E0B", border: "rgba(245,158,11,0.20)",  grad: "linear-gradient(135deg,rgba(245,158,11,0.14) 0%,rgba(245,158,11,0.04) 100%)" },
  danger:    { icon: "#F43F5E", glow: "rgba(244,63,94,0.40)",   bg: "rgba(244,63,94,0.12)",   bar: "#F43F5E", border: "rgba(244,63,94,0.20)",   grad: "linear-gradient(135deg,rgba(244,63,94,0.14) 0%,rgba(244,63,94,0.04) 100%)" },
  info:      { icon: "#60A5FA", glow: "rgba(96,165,250,0.40)",  bg: "rgba(96,165,250,0.12)",  bar: "#60A5FA", border: "rgba(96,165,250,0.20)",  grad: "linear-gradient(135deg,rgba(96,165,250,0.14) 0%,rgba(96,165,250,0.04) 100%)" },
};
// Light: deeper saturation versions of the same hues
const LIGHT_COLORS = {
  accent:    { icon: "#4F52D9", glow: "rgba(79,82,217,0.18)", bg: "rgba(79,82,217,0.08)", bar: "#4F52D9", border: "rgba(79,82,217,0.14)", grad: "linear-gradient(135deg,rgba(79,82,217,0.07) 0%,rgba(79,82,217,0.02) 100%)" },
  secondary: { icon: "#D97706", glow: "rgba(217,119,6,0.18)",  bg: "rgba(217,119,6,0.08)",  bar: "#D97706", border: "rgba(217,119,6,0.14)",  grad: "linear-gradient(135deg,rgba(217,119,6,0.07) 0%,rgba(217,119,6,0.02) 100%)" },
  success:   { icon: "#16A34A", glow: "rgba(22,163,74,0.18)",  bg: "rgba(22,163,74,0.08)",  bar: "#16A34A", border: "rgba(22,163,74,0.14)",  grad: "linear-gradient(135deg,rgba(22,163,74,0.07) 0%,rgba(22,163,74,0.02) 100%)" },
  warning:   { icon: "#D97706", glow: "rgba(217,119,6,0.18)",  bg: "rgba(217,119,6,0.08)",  bar: "#D97706", border: "rgba(217,119,6,0.14)",  grad: "linear-gradient(135deg,rgba(217,119,6,0.07) 0%,rgba(217,119,6,0.02) 100%)" },
  danger:    { icon: "#DC2626", glow: "rgba(220,38,38,0.18)",  bg: "rgba(220,38,38,0.08)",  bar: "#DC2626", border: "rgba(220,38,38,0.14)",  grad: "linear-gradient(135deg,rgba(220,38,38,0.07) 0%,rgba(220,38,38,0.02) 100%)" },
  info:      { icon: "#2563EB", glow: "rgba(37,99,235,0.18)",  bg: "rgba(37,99,235,0.08)",  bar: "#2563EB", border: "rgba(37,99,235,0.14)",  grad: "linear-gradient(135deg,rgba(37,99,235,0.07) 0%,rgba(37,99,235,0.02) 100%)" },
};

function AnimatedNumber({ target }: { target: number }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (isNaN(target) || target === 0) { setVal(0); return; }
    let frame = 0;
    const total = 45;
    const tick = () => {
      frame++;
      const progress = 1 - Math.pow(1 - frame / total, 3); // ease-out cubic
      setVal(Math.round(progress * target));
      if (frame < total) requestAnimationFrame(tick);
      else setVal(target);
    };
    requestAnimationFrame(tick);
  }, [target]);
  return <>{val}</>;
}

export function MetricCard({ title, value, change, trend, icon, color = "accent", index = 0, href, subtitle }: MetricCardProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = mounted && typeof document !== "undefined" && document.documentElement.dataset.theme === "dark";
  const c = (isDark ? DARK_COLORS : LIGHT_COLORS)[color];

  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor = trend === "up" ? "var(--success)" : trend === "down" ? "var(--danger)" : "var(--text-muted)";
  const trendBg   = trend === "up" ? "var(--success-muted)" : trend === "down" ? "var(--danger-muted)" : "var(--bg-elevated)";

  const isPercent  = typeof value === "string" && value.endsWith("%");
  const numericVal = isPercent ? parseInt(value) : typeof value === "number" ? value : null;

  const inner = (
    <div className="relative overflow-hidden rounded-2xl p-5 h-full group transition-all duration-200 hover:-translate-y-1"
      style={{
        background: c.grad,
        border: `1px solid ${c.border}`,
        boxShadow: `var(--shadow-sm)`,
        cursor: href ? "pointer" : "default",
      }}>

      {/* Ambient glow blob */}
      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full blur-3xl pointer-events-none"
        style={{ background: c.bar, opacity: isDark ? 0.20 : 0.12 }} />

      {/* Gradient top border */}
      <div className="absolute top-0 left-8 right-8 h-[1.5px] rounded-b-full"
        style={{ background: `linear-gradient(90deg, transparent, ${c.bar}88, transparent)` }} />

      <div className="relative z-10">
        {/* Icon + trend */}
        <div className="flex items-start justify-between mb-4">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 duration-300"
            style={{ background: c.bg, boxShadow: `0 0 20px ${c.glow}`, color: c.icon }}>
            {icon}
          </div>
          {trend && (
            <div className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full"
              style={{ background: trendBg, color: trendColor }}>
              <TrendIcon className="w-3 h-3" />
              {change && <span>{change}</span>}
            </div>
          )}
        </div>

        {/* Value */}
        <div className="text-[2rem] font-black tabular-nums tracking-tight leading-none mb-1"
          style={{ color: "var(--text-foreground)" }}>
          {numericVal !== null
            ? <><AnimatedNumber target={numericVal} />{isPercent ? "%" : ""}</>
            : value}
        </div>

        {/* Title */}
        <div className="text-[10px] font-bold uppercase tracking-[0.12em]"
          style={{ color: "var(--text-muted)" }}>{title}</div>

        {subtitle && (
          <div className="text-[10px] mt-0.5" style={{ color: "var(--text-subtle)" }}>{subtitle}</div>
        )}

        {/* View all */}
        {href && (
          <div className="flex items-center gap-1 mt-2 text-[11px] font-bold opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-0 group-hover:translate-x-0.5"
            style={{ color: c.icon }}>
            View all <ArrowRight className="w-3 h-3" />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <motion.div className="h-full"
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
      {href ? <Link href={href} className="block h-full">{inner}</Link> : inner}
    </motion.div>
  );
}
