"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { isPast, format, differenceInDays } from "date-fns";
import type { AnalyticsData, Task } from "@/types";
import { useClaude } from "@/hooks/useClaude";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { NLTaskCreator } from "@/components/ai/NLTaskCreator";

/* ── Constants ─────────────────────────────────────────────────────────────── */
const PRIORITY_ORDER: Record<string, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
const BRIEFING_KEY = "colliq_briefing_v3";
const BRIEFING_TTL = 30 * 60 * 1000;
const PRI: Record<string, { label: string; color: string }> = {
  URGENT: { label: "URGENT", color: "#EF4444" },
  HIGH:   { label: "HIGH",   color: "#F59E0B" },
  MEDIUM: { label: "MED",    color: "#60A5FA" },
  LOW:    { label: "LOW",    color: "#94A3B8" },
};

/* ── Types ─────────────────────────────────────────────────────────────────── */
interface Project {
  id: string; name: string; color: string;
  description?: string; deadline?: string | null;
  _count?: { tasks: number };
}
type TaskWithProject = Task & { project?: { id: string; name: string; color: string } };

/* ════════════════════════════════════════════════════════════════════════════ */
/*  COLLIQ VISUALIZATION SYSTEM                                                 */
/* ════════════════════════════════════════════════════════════════════════════ */

/* ── CountUp ─────────────────────────────────────────────────────────────── */
function CountUp({ to, suffix = "", duration = 1.3 }: { to: number; suffix?: string; duration?: number }) {
  const [val, setVal] = useState(0);
  const raf = useRef<number>(0);
  useEffect(() => {
    const t0 = Date.now();
    const tick = () => {
      const p = Math.min((Date.now() - t0) / (duration * 1000), 1);
      const e = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(e * to));
      if (p < 1) raf.current = requestAnimationFrame(tick);
      else setVal(to);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [to, duration]);
  return <>{val}{suffix}</>;
}

/* ── Path helpers ────────────────────────────────────────────────────────── */
function smoothLine(pts: [number, number][]): string {
  if (!pts.length) return "";
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const cpx = ((pts[i][0] + pts[i - 1][0]) / 2).toFixed(1);
    d += ` C ${cpx} ${pts[i - 1][1].toFixed(1)},${cpx} ${pts[i][1].toFixed(1)},${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)}`;
  }
  return d;
}
function areaLine(pts: [number, number][], base: number): string {
  if (!pts.length) return "";
  const last = pts[pts.length - 1];
  return `${smoothLine(pts)} L ${last[0].toFixed(1)} ${base} L ${pts[0][0].toFixed(1)} ${base} Z`;
}

/* ── VelocityWave ───────────────────────────────────────────────────────── */
function VelocityWave({ data }: { data: { date: string; completed: number; created: number }[] }) {
  const [hov, setHov] = useState<number | null>(null);
  if (!data.length) return <p style={{ color: "var(--text-subtle)", fontSize: 12, textAlign: "center", padding: "48px 0" }}>No trend data yet</p>;

  const W = 540, H = 150, PX = 12, PY = 16;
  const maxV = Math.max(...data.map(d => Math.max(d.created, d.completed)), 1);
  const pt = (i: number, v: number): [number, number] => [
    PX + (i / (data.length - 1)) * (W - 2 * PX),
    H - PY - (v / maxV) * (H - 2 * PY),
  ];
  const crPts  = data.map((d, i) => pt(i, d.created));
  const coPts  = data.map((d, i) => pt(i, d.completed));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-subtle)" }}>Velocity Wave</p>
          <p style={{ fontSize: 9.5, color: "var(--text-subtle)", opacity: 0.65, marginTop: 2 }}>14-day task momentum</p>
        </div>
        <div style={{ display: "flex", gap: 14 }}>
          {[{ l: "Created", c: "#6366F1" }, { l: "Done", c: "#22C55E" }].map(x => (
            <div key={x.l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 18, height: 2, background: x.c, borderRadius: 1, display: "block", boxShadow: `0 0 5px ${x.c}` }} />
              <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>{x.l}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ position: "relative" }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 150, overflow: "visible", display: "block" }}>
          <defs>
            <linearGradient id="vw-c" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366F1" stopOpacity="0.26" />
              <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="vw-d" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22C55E" stopOpacity="0.26" />
              <stop offset="100%" stopColor="#22C55E" stopOpacity="0" />
            </linearGradient>
            <filter id="glow-i"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            <filter id="glow-g"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          </defs>

          {/* Grid */}
          {[0.25, 0.5, 0.75].map((t, i) => (
            <line key={i} x1={PX} x2={W - PX} y1={PY + t * (H - 2 * PY)} y2={PY + t * (H - 2 * PY)}
              stroke="var(--border-subtle)" strokeWidth="0.5" strokeDasharray="2 6" />
          ))}

          {/* X labels */}
          {data.map((d, i) => {
            if (i % 3 !== 0) return null;
            const dt = new Date(d.date);
            return <text key={i} x={crPts[i][0]} y={H - 1} textAnchor="middle" fill="var(--text-subtle)" fontSize={7.5} fontWeight={500}>{isNaN(dt.getTime()) ? "" : format(dt, "M/d")}</text>;
          })}

          {/* Area fills */}
          <motion.path d={areaLine(crPts, H - PY)} fill="url(#vw-c)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.5 }} />
          <motion.path d={areaLine(coPts, H - PY)} fill="url(#vw-d)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.8 }} />

          {/* Glowing lines */}
          <motion.path d={smoothLine(crPts)} fill="none" stroke="#6366F1" strokeWidth={2} filter="url(#glow-i)"
            initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.4, ease: [0.4, 0, 0.2, 1] }} />
          <motion.path d={smoothLine(coPts)} fill="none" stroke="#22C55E" strokeWidth={2} filter="url(#glow-g)"
            initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.4, ease: [0.4, 0, 0.2, 1], delay: 0.2 }} />

          {/* Hover zones */}
          {data.map((_, i) => {
            const segW = (W - 2 * PX) / (data.length - 1);
            return (
              <rect key={i} x={crPts[i][0] - segW / 2} y={PY} width={segW} height={H - 2 * PY}
                fill="transparent" style={{ cursor: "crosshair" }}
                onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)} />
            );
          })}

          {/* Hover markers */}
          {hov !== null && (
            <>
              <line x1={crPts[hov][0]} x2={crPts[hov][0]} y1={PY} y2={H - PY}
                stroke="var(--border-strong)" strokeWidth={1} strokeDasharray="3 3" />
              <circle cx={crPts[hov][0]} cy={crPts[hov][1]} r={4.5} fill="#6366F1" stroke="var(--bg-card)" strokeWidth={2} />
              <circle cx={coPts[hov][0]}  cy={coPts[hov][1]}  r={4.5} fill="#22C55E" stroke="var(--bg-card)" strokeWidth={2} />
            </>
          )}
        </svg>

        {/* Hover tooltip */}
        <AnimatePresence>
          {hov !== null && (() => {
            const d = data[hov];
            const dt = new Date(d.date);
            const xPct = (crPts[hov][0] / W) * 100;
            return (
              <motion.div key={hov}
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                style={{
                  position: "absolute", top: 0, left: `${xPct}%`,
                  transform: `translateX(${xPct > 72 ? "-100%" : "-50%"})`,
                  background: "var(--bg-card)", border: "1px solid var(--border-strong)",
                  borderRadius: 10, padding: "8px 11px", fontSize: 11,
                  boxShadow: "0 8px 28px rgba(0,0,0,0.22)", pointerEvents: "none", zIndex: 20, minWidth: 108,
                }}>
                <p style={{ fontSize: 9.5, fontWeight: 700, color: "var(--text-subtle)", marginBottom: 6, letterSpacing: "0.06em" }}>
                  {isNaN(dt.getTime()) ? d.date : format(dt, "MMM d")}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {[{ label: "Created", val: d.created, c: "#6366F1" }, { label: "Done", val: d.completed, c: "#22C55E" }].map(x => (
                    <div key={x.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: x.c, flexShrink: 0 }} />
                      <span style={{ color: "var(--text-muted)", flex: 1 }}>{x.label}</span>
                      <span style={{ fontWeight: 700, color: x.c }}>{x.val}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })()}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ── MissionRing — animated concentric arcs ──────────────────────────────── */
function MissionRing({ data, total }: { data: Record<string, number>; total: number }) {
  const rings = [
    { key: "DONE",        color: "#22C55E", label: "Done",        r: 62, sw: 9 },
    { key: "IN_PROGRESS", color: "#818CF8", label: "In Progress", r: 48, sw: 8 },
    { key: "REVIEW",      color: "#FBBF24", label: "Review",      r: 35, sw: 7 },
    { key: "TODO",        color: "#60A5FA", label: "To Do",       r: 22, sw: 6 },
  ];
  const cx = 76, cy = 76;

  return (
    <div>
      <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-subtle)", marginBottom: 14 }}>
        Mission Rings
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ flexShrink: 0 }}>
          <svg width={152} height={152} style={{ overflow: "visible" }}>
            {rings.map((ring, i) => {
              const circ = 2 * Math.PI * ring.r;
              const pct  = total > 0 ? (data[ring.key] ?? 0) / total : 0;
              return (
                <g key={ring.key}>
                  <circle cx={cx} cy={cy} r={ring.r} fill="none" stroke="var(--bg-elevated)" strokeWidth={ring.sw} />
                  {pct > 0 && (
                    <motion.circle
                      cx={cx} cy={cy} r={ring.r}
                      fill="none" stroke={ring.color} strokeWidth={ring.sw} strokeLinecap="round"
                      strokeDasharray={circ}
                      initial={{ strokeDashoffset: circ }}
                      animate={{ strokeDashoffset: circ * (1 - pct) }}
                      transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1], delay: i * 0.16 }}
                      style={{
                        transform: "rotate(-90deg)", transformOrigin: `${cx}px ${cy}px`,
                        filter: `drop-shadow(0 0 5px ${ring.color}88)`,
                      }}
                    />
                  )}
                </g>
              );
            })}
            <text x={cx} y={cy - 7} textAnchor="middle" fill="var(--text-foreground)" fontSize={20} fontWeight={900} style={{ letterSpacing: "-0.03em" }}>{total}</text>
            <text x={cx} y={cy + 7}  textAnchor="middle" fill="var(--text-subtle)"    fontSize={8}  fontWeight={700} style={{ textTransform: "uppercase", letterSpacing: "0.1em" }}>tasks</text>
          </svg>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 9 }}>
          {rings.map(ring => {
            const count = data[ring.key] ?? 0;
            const pct   = total > 0 ? Math.round((count / total) * 100) : 0;
            return (
              <motion.div key={ring.key} style={{ display: "flex", alignItems: "center", gap: 8 }} whileHover={{ x: 3 }} transition={{ duration: 0.15 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: ring.color, boxShadow: `0 0 7px ${ring.color}77`, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: "var(--text-muted)", flex: 1 }}>{ring.label}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-foreground)", fontVariantNumeric: "tabular-nums" }}>{count}</span>
                <span style={{ fontSize: 9.5, color: "var(--text-subtle)", width: 26, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{pct}%</span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── ActivitySkyline ────────────────────────────────────────────────────── */
const SKYLINE_COLORS = ["#6366F1","#22C55E","#F59E0B","#60A5FA","#EF4444","#A855F7","#14B8A6","#F97316"];

function ActivitySkyline({ data }: { data: { name: string; tasks: number }[] }) {
  const sorted = [...data].sort((a, b) => b.tasks - a.tasks).slice(0, 8);
  const max = Math.max(...sorted.map(d => d.tasks), 1);
  if (!sorted.length) return <p style={{ color: "var(--text-subtle)", fontSize: 12, textAlign: "center", padding: "40px 0" }}>No team data</p>;

  return (
    <div>
      <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-subtle)", marginBottom: 14 }}>
        Activity Skyline
      </p>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 108 }}>
        {sorted.map((m, i) => {
          const hPx  = Math.max((m.tasks / max) * 108, 8);
          const col  = SKYLINE_COLORS[i % SKYLINE_COLORS.length];
          return (
            <motion.div key={m.name} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end" }}>
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: hPx, opacity: 1 }}
                transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1], delay: i * 0.07 }}
                whileHover={{ scaleY: 1.06, filter: "brightness(1.12)", originY: 1 }}
                title={`${m.name}: ${m.tasks} tasks`}
                style={{
                  width: "100%",
                  background: `linear-gradient(180deg, ${col} 0%, ${col}44 100%)`,
                  borderRadius: "3px 3px 0 0",
                  cursor: "pointer",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {/* Building windows */}
                <div style={{ position: "absolute", inset: "3px 2px 0", display: "flex", flexDirection: "column", gap: 2.5, overflow: "hidden" }}>
                  {Array.from({ length: Math.min(7, Math.ceil(hPx / 14)) }).map((_, j) => (
                    <div key={j} style={{ flexShrink: 0, height: 4, display: "flex", gap: 2 }}>
                      <div style={{ flex: 1, background: "rgba(255,255,255,0.18)", borderRadius: 1 }} />
                      <div style={{ flex: 1, background: "rgba(255,255,255,0.10)", borderRadius: 1 }} />
                    </div>
                  ))}
                </div>
              </motion.div>
              <span style={{ fontSize: 8, color: "var(--text-subtle)", fontWeight: 600, marginTop: 4, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "center" }}>
                {m.name.split(" ")[0]}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* ── SprintPulse ─────────────────────────────────────────────────────────── */
function SprintPulse({ rate, done, total }: { rate: number; done: number; total: number }) {
  const r = 42, cx = 54, cy = 54;
  const circ = 2 * Math.PI * r;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-subtle)", marginBottom: 14 }}>
        Sprint Pulse
      </p>
      <div style={{ position: "relative" }}>
        <svg width={108} height={108} style={{ overflow: "visible" }}>
          <defs>
            <linearGradient id="sp-g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#6366F1" />
              <stop offset="100%" stopColor="#22C55E" />
            </linearGradient>
          </defs>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--bg-elevated)" strokeWidth={10} />
          <motion.circle
            cx={cx} cy={cy} r={r} fill="none"
            stroke="url(#sp-g)" strokeWidth={10} strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: circ * (1 - rate / 100) }}
            transition={{ duration: 1.5, ease: [0.4, 0, 0.2, 1] }}
            style={{ transform: "rotate(-90deg)", transformOrigin: `${cx}px ${cy}px`, filter: "drop-shadow(0 0 6px rgba(99,102,241,0.55))" }}
          />
          <text x={cx} y={cy - 5} textAnchor="middle" fill="var(--text-foreground)" fontSize={17} fontWeight={900} style={{ letterSpacing: "-0.03em" }}>{rate}%</text>
          <text x={cx} y={cy + 8}  textAnchor="middle" fill="var(--text-subtle)"    fontSize={7.5} fontWeight={700} style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}>done</text>
          <text x={cx} y={cy + 20} textAnchor="middle" fill="var(--text-subtle)"    fontSize={9}   fontWeight={500}>{done}/{total}</text>
        </svg>
      </div>
    </div>
  );
}

/* ── ContributionHeatmap ─────────────────────────────────────────────────── */
function ContributionHeatmap({ data }: { data: { date: string; completed: number; created: number }[] }) {
  const [hov, setHov] = useState<number | null>(null);
  const maxV = Math.max(...data.map(d => Math.max(d.completed, d.created)), 1);
  return (
    <div>
      <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-subtle)", marginBottom: 14 }}>
        Activity Heatmap · 14 days
      </p>
      <div style={{ display: "flex", gap: 4 }}>
        {data.map((d, i) => {
          const dt  = new Date(d.date);
          const dS  = isNaN(dt.getTime()) ? "" : format(dt, "M/d");
          const isH = hov === i;
          return (
            <div key={i} style={{ flex: 1 }} onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)}>
              {/* Done row */}
              <motion.div
                initial={{ scaleY: 0, opacity: 0 }} animate={{ scaleY: 1, opacity: 1 }}
                transition={{ delay: i * 0.04, duration: 0.35, ease: "easeOut" }}
                style={{
                  height: 22, borderRadius: 3, marginBottom: 3, cursor: "pointer",
                  background: `rgba(34,197,94,${Math.max(0.07, d.completed / maxV * 0.88)})`,
                  border: `1px solid rgba(34,197,94,${Math.max(0.04, d.completed / maxV * 0.45)})`,
                  transform: `scaleY(${isH ? 1.1 : 1})`, transformOrigin: "bottom",
                  transition: "transform 0.14s ease",
                  boxShadow: isH ? `0 0 6px rgba(34,197,94,0.3)` : "none",
                }}
              />
              {/* Created row */}
              <motion.div
                initial={{ scaleY: 0, opacity: 0 }} animate={{ scaleY: 1, opacity: 1 }}
                transition={{ delay: i * 0.04 + 0.08, duration: 0.35, ease: "easeOut" }}
                style={{
                  height: 22, borderRadius: 3, cursor: "pointer",
                  background: `rgba(99,102,241,${Math.max(0.07, d.created / maxV * 0.88)})`,
                  border: `1px solid rgba(99,102,241,${Math.max(0.04, d.created / maxV * 0.45)})`,
                  transform: `scaleY(${isH ? 1.1 : 1})`, transformOrigin: "top",
                  transition: "transform 0.14s ease",
                  boxShadow: isH ? `0 0 6px rgba(99,102,241,0.3)` : "none",
                }}
              />
              {i % 3 === 0 && <p style={{ fontSize: 6.5, color: "var(--text-subtle)", textAlign: "center", marginTop: 3 }}>{dS}</p>}
            </div>
          );
        })}
      </div>
      <AnimatePresence>
        {hov !== null && (() => {
          const d = data[hov];
          const dt = new Date(d.date);
          return (
            <motion.div key={hov} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ display: "flex", gap: 14, alignItems: "center", marginTop: 8, padding: "7px 12px", background: "var(--bg-elevated)", borderRadius: 10, fontSize: 11 }}>
              <span style={{ fontWeight: 700, color: "var(--text-foreground)" }}>{isNaN(dt.getTime()) ? d.date : format(dt, "MMM d")}</span>
              <span style={{ color: "#22C55E" }}>✓ {d.completed}</span>
              <span style={{ color: "#6366F1" }}>+ {d.created}</span>
            </motion.div>
          );
        })()}
      </AnimatePresence>
      <div style={{ display: "flex", gap: 14, marginTop: hov !== null ? 6 : 10 }}>
        {[{ c: "rgba(34,197,94,0.75)", l: "Completed" }, { c: "rgba(99,102,241,0.75)", l: "Created" }].map(x => (
          <div key={x.l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: x.c }} />
            <span style={{ fontSize: 9.5, color: "var(--text-subtle)" }}>{x.l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── LiquidRail (Project Roadmap row) ────────────────────────────────────── */
function LiquidRail({ name, score, color, tasks, daysLeft }: {
  name: string; score: number; color: string; tasks: number; daysLeft: number | null;
}) {
  const hc = score >= 80 ? "#22C55E" : score >= 55 ? "#F59E0B" : score > 0 ? "#EF4444" : "#6B7280";
  return (
    <motion.div style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 0" }} whileHover={{ x: 3 }} transition={{ duration: 0.18 }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, boxShadow: `0 0 6px ${color}66`, flexShrink: 0 }} />
      <span style={{ width: 140, fontSize: 12.5, fontWeight: 600, color: "var(--text-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flexShrink: 0 }}>
        {name}
      </span>
      <div style={{ flex: 1, height: 5, background: "var(--bg-elevated)", borderRadius: 3, overflow: "hidden", position: "relative" }}>
        <motion.div
          initial={{ width: 0 }} animate={{ width: `${Math.min(100, Math.max(0, score))}%` }}
          transition={{ duration: 1.1, ease: [0.4, 0, 0.2, 1] }}
          style={{ height: "100%", borderRadius: 3, background: `linear-gradient(90deg,${hc}66,${hc})`, boxShadow: `0 0 8px ${hc}55` }}
        />
        {[25, 50, 75].map(m => (
          <div key={m} style={{ position: "absolute", top: 0, bottom: 0, left: `${m}%`, width: 1, background: "var(--border)", opacity: score > m ? 0 : 0.45 }} />
        ))}
      </div>
      <span style={{ fontSize: 11.5, fontWeight: 800, color: hc, width: 26, textAlign: "right", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
        {score > 0 ? Math.round(score) : "—"}
      </span>
      <span style={{ fontSize: 9.5, color: "var(--text-subtle)", width: 36, textAlign: "right", flexShrink: 0 }}>{tasks}t</span>
      {daysLeft !== null && (
        <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 5, flexShrink: 0,
          color: daysLeft <= 3 ? "#EF4444" : daysLeft <= 7 ? "#F59E0B" : "var(--text-subtle)",
          background: daysLeft <= 3 ? "rgba(239,68,68,0.08)" : "var(--bg-elevated)" }}>
          {daysLeft <= 0 ? "DUE" : `${daysLeft}d`}
        </span>
      )}
    </motion.div>
  );
}

/* ── PriorityBars ────────────────────────────────────────────────────────── */
function PriorityBars({ data }: { data: Record<string, number> }) {
  const entries = [
    { l: "Urgent", v: data.URGENT ?? 0, c: "#EF4444" },
    { l: "High",   v: data.HIGH   ?? 0, c: "#F59E0B" },
    { l: "Medium", v: data.MEDIUM  ?? 0, c: "#60A5FA" },
    { l: "Low",    v: data.LOW    ?? 0, c: "#94A3B8" },
  ];
  const max = Math.max(...entries.map(e => e.v), 1);
  const tot = entries.reduce((s, e) => s + e.v, 0);
  return (
    <div>
      <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-subtle)", marginBottom: 14 }}>
        Priority Split
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
        {entries.map((e, i) => (
          <div key={i}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>{e.l}</span>
              <div style={{ display: "flex", gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: e.v > 0 ? e.c : "var(--text-subtle)", fontVariantNumeric: "tabular-nums" }}>{e.v}</span>
                {tot > 0 && <span style={{ fontSize: 9.5, color: "var(--text-subtle)", alignSelf: "flex-end", marginBottom: 1 }}>{Math.round((e.v / tot) * 100)}%</span>}
              </div>
            </div>
            <div style={{ height: 5, background: "var(--bg-elevated)", borderRadius: 3, overflow: "hidden" }}>
              <motion.div
                initial={{ width: 0 }} animate={{ width: `${(e.v / max) * 100}%` }}
                transition={{ duration: 0.9, ease: [0.4, 0, 0.2, 1], delay: i * 0.1 }}
                style={{ height: "100%", background: e.c, borderRadius: 3, opacity: e.v === 0 ? 0.12 : 1, boxShadow: e.v > 0 ? `0 0 8px ${e.c}44` : "none" }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════ */
/*  LAYOUT ATOMS                                                               */
/* ════════════════════════════════════════════════════════════════════════════ */

function SignalBar({ projects }: { projects: Project[] }) {
  if (!projects.length) return null;
  const total = projects.reduce((s, p) => s + Math.max(p._count?.tasks ?? 1, 1), 0);
  return (
    <div>
      <div className="flex items-stretch h-[3px] gap-[3px] overflow-hidden rounded-full">
        {projects.map((p) => (
          <Link key={p.id} href={`/projects/${p.id}/board`} title={p.name}
            className="h-full rounded-full transition-all duration-300 hover:opacity-70"
            style={{ flex: `${Math.max(p._count?.tasks ?? 1, 1) / total} 0 0`, minWidth: 10, background: p.color }}
          />
        ))}
      </div>
      <div className="flex items-center gap-4 mt-2 flex-wrap">
        {projects.slice(0, 6).map(p => (
          <Link key={p.id} href={`/projects/${p.id}/board`} className="flex items-center gap-1.5 hover:opacity-60 transition-opacity">
            <span className="w-[5px] h-[5px] rounded-full shrink-0" style={{ background: p.color }} />
            <span className="text-[10px] font-semibold" style={{ color: "var(--text-subtle)" }}>
              {p.name.length > 20 ? p.name.slice(0, 18) + "…" : p.name}
            </span>
          </Link>
        ))}
        {projects.length > 6 && (
          <Link href="/projects" className="text-[10px] hover:opacity-60 transition-opacity" style={{ color: "var(--text-subtle)" }}>
            +{projects.length - 6} more
          </Link>
        )}
      </div>
    </div>
  );
}

function Label({ text, count, danger, className }: { text: string; count?: number; danger?: boolean; className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <span className="text-[9.5px] font-black uppercase tracking-[0.14em]" style={{ color: danger ? "#EF4444" : "var(--text-subtle)" }}>{text}</span>
      {count !== undefined && count > 0 && (
        <span className="text-[9px] font-black px-[5px] py-px rounded-sm tabular-nums"
          style={{ background: danger ? "rgba(239,68,68,0.10)" : "var(--bg-elevated)", color: danger ? "#EF4444" : "var(--text-muted)" }}>
          {count}
        </span>
      )}
    </div>
  );
}

function Divider() { return <div style={{ height: "0.5px", background: "var(--border-subtle)" }} />; }

function ActionRow({ task, index }: { task: TaskWithProject; index: number }) {
  const isOv  = !!(task.dueDate && isPast(new Date(task.dueDate)) && task.status !== "DONE");
  const pri   = PRI[task.priority] ?? PRI.MEDIUM;
  const col   = isOv ? "#EF4444" : pri.color;
  const late  = isOv && task.dueDate ? differenceInDays(new Date(), new Date(task.dueDate)) : 0;
  return (
    <motion.div
      className="flex items-center gap-4 px-4 py-3.5 cursor-pointer"
      style={{ borderTop: index === 0 ? "none" : "1px solid var(--border-subtle)" }}
      whileHover={{ backgroundColor: "var(--bg-card-hover)" }}
      transition={{ duration: 0.12 }}
    >
      <div className="w-[2.5px] self-stretch rounded-full shrink-0" style={{ background: col }} />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold leading-snug truncate" style={{ color: "var(--text-foreground)" }}>{task.title}</p>
        {task.project && <p className="text-[10px] mt-0.5 truncate" style={{ color: "var(--text-subtle)" }}>{task.project.name}</p>}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-[8.5px] font-black px-1.5 py-0.5 rounded" style={{ background: `${col}12`, color: col, letterSpacing: "0.06em" }}>{pri.label}</span>
        {isOv && late > 0 && <span className="text-[8.5px] font-black px-1.5 py-0.5 rounded" style={{ background: "rgba(239,68,68,0.08)", color: "#EF4444" }}>{late}D</span>}
        {task.dueDate && !isOv && <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>{format(new Date(task.dueDate), "MMM d")}</span>}
      </div>
    </motion.div>
  );
}

function relTime(s: string): string {
  const h = Math.floor((Date.now() - new Date(s).getTime()) / 3600000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
function statusVerb(s: string): string {
  return s === "DONE" ? "completed" : s === "REVIEW" ? "sent to review" : s === "IN_PROGRESS" ? "started" : s === "BACKLOG" ? "moved to backlog" : "updated";
}

function ActivityRow({ task, index }: { task: TaskWithProject; index: number }) {
  const actor = task.assignee?.name ?? "Someone";
  return (
    <motion.div className="flex items-center gap-3 px-4 py-3 cursor-pointer"
      style={{ borderTop: index === 0 ? "none" : "1px solid var(--border-subtle)" }}
      whileHover={{ backgroundColor: "var(--bg-card-hover)" }} transition={{ duration: 0.12 }}>
      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: (task.project as { color?: string } | undefined)?.color ?? "var(--accent)" }} />
      <p className="flex-1 text-[12.5px] truncate" style={{ color: "var(--text-foreground)" }}>
        <span className="font-semibold" style={{ color: "var(--text-subtle)" }}>{actor.split(" ")[0]}</span>
        {" "}<span style={{ color: "var(--text-muted)" }}>{statusVerb(task.status)}</span>
        {" "}<span>{task.title}</span>
      </p>
      <span className="text-[10px] shrink-0 tabular-nums" style={{ color: "var(--text-subtle)" }}>{relTime(task.updatedAt)}</span>
    </motion.div>
  );
}

function RiskRow({ alert, index }: { alert: { severity: string; title: string; detail: string }; index: number }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3" style={{ borderTop: index === 0 ? "none" : "1px solid var(--border-subtle)" }}>
      <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5" style={{ background: alert.severity === "critical" ? "#EF4444" : "#F59E0B" }} />
      <div className="flex-1 min-w-0">
        <p className="text-[12.5px] font-semibold" style={{ color: "var(--text-foreground)" }}>{alert.title}</p>
        <p className="text-[11px] mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>{alert.detail}</p>
      </div>
    </div>
  );
}

function Action({ href, label, glyph, onClick }: { href?: string; label: string; glyph: string; onClick?: () => void }) {
  const inner = (
    <motion.div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl cursor-pointer"
      style={{ border: "1px solid var(--border)", background: "var(--bg-card)" }}
      whileHover={{ backgroundColor: "var(--bg-card-hover)", borderColor: "var(--border-strong)", x: 2 }}
      transition={{ duration: 0.15 }}>
      <span className="text-[15px] shrink-0 leading-none" style={{ color: "var(--accent)" }}>{glyph}</span>
      <span className="text-[12.5px] font-medium" style={{ color: "var(--text-foreground)" }}>{label}</span>
    </motion.div>
  );
  if (onClick) return <div onClick={onClick}>{inner}</div>;
  return <Link href={href ?? "#"}>{inner}</Link>;
}

function AiBrief({ text, loading }: { text: string; loading: boolean }) {
  if (loading) return (
    <div className="space-y-2.5">
      {[80, 95, 72, 88].map((w, i) => (
        <div key={i} className="h-[13px] rounded animate-pulse" style={{ width: `${w}%`, background: "var(--bg-elevated)" }} />
      ))}
    </div>
  );
  if (!text) return <p className="text-[12.5px]" style={{ color: "var(--text-subtle)" }}>Generating your brief…</p>;
  const lines = text.split("\n").map(l => l.replace(/^[•·\-]\s*/, "").replace(/\*\*/g, "").trim()).filter(Boolean);
  return (
    <div className="space-y-2.5">
      {lines.map((line, i) => (
        <motion.div key={i} className="flex items-start gap-2.5" initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}>
          <span className="mt-[5px] w-[4px] h-[4px] rounded-full shrink-0" style={{ background: "var(--accent)", opacity: 0.6 }} />
          <p className="text-[12.5px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>{line}</p>
        </motion.div>
      ))}
    </div>
  );
}

function NextActionCard({ task, urgentCount }: { task: TaskWithProject; urgentCount: number }) {
  const isOv     = !!(task.dueDate && isPast(new Date(task.dueDate)) && task.status !== "DONE");
  const pri      = PRI[task.priority] ?? PRI.MEDIUM;
  const col      = isOv ? "#EF4444" : pri.color;
  const daysLate = isOv && task.dueDate ? differenceInDays(new Date(), new Date(task.dueDate)) : 0;
  const oLabel   = daysLate === 0 ? "due today" : `${daysLate}d overdue`;
  return (
    <motion.div className="rounded-2xl p-5"
      style={{ border: `1px solid ${col}30`, background: "var(--bg-card)", boxShadow: `inset 3px 0 0 ${col}` }}
      whileHover={{ y: -2, boxShadow: `inset 3px 0 0 ${col}, 0 8px 24px rgba(0,0,0,0.12)` }}
      transition={{ duration: 0.2 }}>
      <p className="text-[15.5px] font-black leading-tight tracking-[-0.02em] mb-1.5" style={{ color: "var(--text-foreground)" }}>{task.title}</p>
      {task.project && (
        <p className="text-[11px] mb-3" style={{ color: "var(--text-muted)" }}>
          {task.project.name}
          {isOv && <span className="ml-2 font-bold" style={{ color: "#EF4444" }}>· {oLabel}</span>}
        </p>
      )}
      <p className="text-[12px] leading-relaxed mb-4" style={{ color: "var(--text-subtle)" }}>
        {isOv ? "Overdue — blocking sprint. Complete or reassign to unblock team."
          : urgentCount > 0 ? "Highest priority on your board. Team is watching."
          : "Top item this sprint. Completing it keeps momentum."}
      </p>
      <div className="flex items-center gap-2">
        {task.project && (
          <a href={`/projects/${task.project.id}/board`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold text-white hover:opacity-80 transition-opacity"
            style={{ background: col }}>
            Open task →
          </a>
        )}
        <span className="px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase"
          style={{ background: `${col}12`, color: col, letterSpacing: "0.08em" }}>{pri.label}</span>
      </div>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════ */
/*  HERO PANEL                                                                  */
/* ════════════════════════════════════════════════════════════════════════════ */
function HeroPanel({ greeting, firstName, urgentCount, d, projects }: {
  greeting: string; firstName: string; urgentCount: number; d: AnalyticsData; projects: Project[];
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      style={{ position: "relative", borderRadius: 24, overflow: "hidden", border: "1px solid var(--border)", background: "var(--bg-card)", marginBottom: 16 }}>

      {/* Dot grid background */}
      <div aria-hidden style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: "radial-gradient(circle, var(--border-subtle) 1px, transparent 1px)",
        backgroundSize: "22px 22px",
        opacity: 0.6,
      }} />

      {/* Ambient orbs */}
      <div aria-hidden style={{ position: "absolute", top: -120, right: -100, width: 440, height: 440, background: "radial-gradient(circle, rgba(99,102,241,0.09) 0%, transparent 65%)", pointerEvents: "none" }} />
      <div aria-hidden style={{ position: "absolute", bottom: -80, left: -80,  width: 320, height: 320, background: "radial-gradient(circle, rgba(34,197,94,0.06) 0%, transparent 65%)",   pointerEvents: "none" }} />
      {urgentCount > 0 && (
        <div aria-hidden style={{ position: "absolute", top: -60, left: "35%", width: 240, height: 240, background: "radial-gradient(circle, rgba(239,68,68,0.05) 0%, transparent 65%)", pointerEvents: "none" }} />
      )}

      <div style={{ position: "relative", zIndex: 1, padding: "26px 30px 0" }}>
        <SignalBar projects={projects} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 22, marginBottom: 14 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-subtle)" }}>{format(new Date(), "EEEE, MMMM d")}</p>
          {urgentCount > 0 && (
            <motion.span animate={{ opacity: [1, 0.55, 1] }} transition={{ duration: 2.2, repeat: Infinity }}
              style={{ fontSize: 9.5, fontWeight: 800, padding: "3px 11px", borderRadius: 20, background: "rgba(239,68,68,0.10)", color: "#EF4444", letterSpacing: "0.06em" }}>
              ⚡ {urgentCount} URGENT
            </motion.span>
          )}
        </div>

        <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.4 }}
          style={{ fontSize: 34, fontWeight: 900, letterSpacing: "-0.03em", color: "var(--text-foreground)", lineHeight: 1.1, marginBottom: 6 }}>
          Good {greeting}, {firstName}
        </motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}
          style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 0 }}>
          {urgentCount > 0
            ? `${urgentCount} task${urgentCount > 1 ? "s" : ""} need your attention — your team is counting on you.`
            : d.overdueTasks > 0
            ? `${d.overdueTasks} overdue task${d.overdueTasks > 1 ? "s" : ""}. Let's close them out today.`
            : "Everything looks healthy. A great day to make progress."}
        </motion.p>
      </div>

      {/* KPI Strip */}
      <div style={{
        position: "relative", zIndex: 1,
        display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
        borderTop: "1px solid var(--border-subtle)", marginTop: 24,
      }}>
        {[
          { label: "Active Projects", value: d.activeProjects,  suffix: "",  sub: `${d.totalProjects} total`,    accent: "var(--accent)" },
          { label: "Total Tasks",     value: d.totalTasks,      suffix: "",  sub: `${d.activeTasks} active`,     accent: "var(--text-foreground)" },
          { label: "Completion",      value: d.completionRate,  suffix: "%", sub: `${d.completedTasks} done`,    accent: "#22C55E" },
          { label: "Overdue",         value: d.overdueTasks,    suffix: "",  sub: urgentCount > 0 ? `${urgentCount} urgent` : "on track", accent: d.overdueTasks > 0 ? "#EF4444" : "#22C55E" },
        ].map((kpi, i) => (
          <motion.div key={kpi.label}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.07, duration: 0.4 }}
            style={{ padding: "20px 24px", borderRight: i < 3 ? "1px solid var(--border-subtle)" : "none" }}>
            <p style={{ fontSize: 9.5, fontWeight: 700, color: "var(--text-subtle)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 7 }}>{kpi.label}</p>
            <p style={{ fontSize: 28, fontWeight: 900, color: kpi.accent, letterSpacing: "-0.03em", lineHeight: 1, marginBottom: 4, fontVariantNumeric: "tabular-nums" }}>
              <CountUp to={kpi.value} suffix={kpi.suffix} />
            </p>
            <p style={{ fontSize: 10.5, color: "var(--text-subtle)" }}>{kpi.sub}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════ */
/*  PAGE                                                                        */
/* ════════════════════════════════════════════════════════════════════════════ */
export default function DashboardPage() {
  const { data: session } = useSession();
  const { ask }           = useClaude();

  const [analyticsData,  setAnalyticsData]  = useState<AnalyticsData | null>(null);
  const [upcomingToday,  setUpcomingToday]  = useState<TaskWithProject[]>([]);
  const [projects,       setProjects]       = useState<Project[]>([]);
  const [briefText,      setBriefText]      = useState("");
  const [briefLoading,   setBriefLoading]   = useState(false);
  const [loading,        setLoading]        = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showNLCreator,  setShowNLCreator]  = useState(false);
  const generating = useRef(false);

  useEffect(() => { if (!localStorage.getItem("colliq_onboarded")) setShowOnboarding(true); }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/dashboard").then(r => r.json()),
      fetch("/api/tasks/upcoming").then(r => r.json()).catch(() => ({ today: [] })),
      fetch("/api/projects").then(r => r.json()).catch(() => []),
    ]).then(([d, u, p]) => {
      setAnalyticsData(d);
      setUpcomingToday((u.today ?? []) as TaskWithProject[]);
      setProjects(Array.isArray(p) ? p : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const generateBrief = useCallback(async (force = false) => {
    if (generating.current || !analyticsData) return;
    if (!force) {
      try {
        const c = localStorage.getItem(BRIEFING_KEY);
        if (c) { const { text, ts } = JSON.parse(c); if (Date.now() - ts < BRIEFING_TTL && text) { setBriefText(text); return; } }
      } catch {}
    }
    generating.current = true; setBriefLoading(true); setBriefText("");
    const d = analyticsData;
    const prompt = `You are Colliq. Write exactly 4 crisp bullets (• symbol, ≤14 words each). Cover: top risk, quick win, team insight, one recommendation. Data: ${d.activeProjects} projects, ${d.totalTasks} tasks, ${d.completedTasks} done (${d.completionRate}%), ${d.overdueTasks} overdue. Be specific, no filler.`;
    const result = await ask("/api/ai/assistant", { messages: [{ role: "user", content: prompt }] });
    const text   = result && !result.includes("[Error:") ? result : "AI brief temporarily unavailable.";
    setBriefText(text);
    try { localStorage.setItem(BRIEFING_KEY, JSON.stringify({ text, ts: Date.now() })); } catch {}
    setBriefLoading(false); generating.current = false;
  }, [analyticsData, ask]);

  useEffect(() => { if (analyticsData && !generating.current) generateBrief(); }, [analyticsData, generateBrief]);

  const actionFeed: TaskWithProject[] = upcomingToday
    .filter(t => t.status !== "DONE" && t.status !== "ARCHIVED")
    .sort((a, b) => {
      const aO = !!(a.dueDate && isPast(new Date(a.dueDate)));
      const bO = !!(b.dueDate && isPast(new Date(b.dueDate)));
      if (aO !== bO) return aO ? -1 : 1;
      return (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2);
    }).slice(0, 7);

  const urgentCount  = actionFeed.filter(t => t.priority === "URGENT" || (t.dueDate && isPast(new Date(t.dueDate)))).length;
  const hour         = new Date().getHours();
  const greeting     = hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : "Evening";
  const firstName    = (session?.user?.name ?? "").split(" ")[0] || "there";

  const cardStyle = { background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 20, padding: "20px 24px" };

  if (loading) return (
    <div className="max-w-[1200px] mx-auto px-8 pt-8 pb-16 space-y-4 animate-pulse">
      <div className="h-[200px] rounded-3xl" style={{ background: "var(--bg-elevated)" }} />
      <div className="grid grid-cols-[320px_1fr] gap-4">
        <div className="h-40 rounded-2xl" style={{ background: "var(--bg-elevated)" }} />
        <div className="h-40 rounded-2xl" style={{ background: "var(--bg-elevated)" }} />
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[1,2,3].map(i => <div key={i} className="h-44 rounded-2xl" style={{ background: "var(--bg-elevated)" }} />)}
      </div>
    </div>
  );
  if (!analyticsData) return null;
  const d = analyticsData;
  const hasTeam     = (d.teamActivity ?? []).length > 0;
  const hasHealth   = (d.projectHealth ?? []).length > 0;
  const hasPriority = Object.values(d.tasksByPriority ?? {}).some(v => v > 0);

  return (
    <>
      <NLTaskCreator open={showNLCreator} onClose={() => setShowNLCreator(false)} />
      {showOnboarding && <OnboardingWizard onComplete={() => { localStorage.setItem("colliq_onboarded", "1"); setShowOnboarding(false); }} />}

      <div className="max-w-[1200px] mx-auto px-8 pt-8 pb-24">

        {/* ══ HERO PANEL ══ */}
        <HeroPanel greeting={greeting} firstName={firstName} urgentCount={urgentCount} d={d} projects={projects} />

        {/* ══ NEXT ACTION + VELOCITY WAVE ══ */}
        <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 16, marginBottom: 16 }}>
          {/* Next action */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {actionFeed.length > 0 ? (
              <>
                <p style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-subtle)" }}>Your next action</p>
                <NextActionCard task={actionFeed[0]} urgentCount={urgentCount} />
              </>
            ) : (
              <div style={{ ...cardStyle, display: "flex", alignItems: "center", justifyContent: "center", flex: 1 }}>
                <p style={{ color: "var(--text-subtle)", fontSize: 12 }}>No urgent tasks today</p>
              </div>
            )}
          </div>

          {/* Velocity Wave */}
          <motion.div style={cardStyle} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.4 }}>
            <VelocityWave data={d.taskTrend ?? []} />
          </motion.div>
        </div>

        {/* ══ MISSION RINGS + ACTIVITY SKYLINE + SPRINT PULSE ══ */}
        <div style={{ display: "grid", gridTemplateColumns: hasTeam ? "1fr 1fr auto" : "1fr auto", gap: 16, marginBottom: 16 }}>
          <motion.div style={cardStyle} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.4 }}>
            <MissionRing data={d.tasksByStatus ?? {}} total={d.totalTasks} />
          </motion.div>
          {hasTeam && (
            <motion.div style={cardStyle} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.4 }}>
              <ActivitySkyline data={d.teamActivity ?? []} />
            </motion.div>
          )}
          <motion.div style={{ ...cardStyle, minWidth: 140 }} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.4 }}>
            <SprintPulse rate={d.completionRate} done={d.completedTasks} total={d.totalTasks} />
          </motion.div>
        </div>

        {/* ══ HEATMAP + PRIORITY BARS ══ */}
        {((d.taskTrend ?? []).length > 0 || hasPriority) && (
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16, marginBottom: 16 }}>
            {(d.taskTrend ?? []).length > 0 && (
              <motion.div style={cardStyle} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.4 }}>
                <ContributionHeatmap data={d.taskTrend ?? []} />
              </motion.div>
            )}
            {hasPriority && (
              <motion.div style={cardStyle} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.4 }}>
                <PriorityBars data={d.tasksByPriority ?? {}} />
              </motion.div>
            )}
          </div>
        )}

        {/* ══ PROJECT ROADMAP — LIQUID RAILS ══ */}
        {hasHealth && (
          <motion.div style={{ ...cardStyle, marginBottom: 16 }} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.4 }}>
            <Label text="Project Roadmap" className="mb-1" />
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <p style={{ fontSize: 9.5, color: "var(--text-subtle)" }}>Health score · days remaining · task count</p>
            </div>
            {(d.projectHealth ?? []).map((p, i) => {
              const proj = projects.find(pr => pr.name === p.name);
              const dMs  = proj?.deadline ? new Date(proj.deadline).getTime() : NaN;
              const dL   = !isNaN(dMs) ? Math.ceil((dMs - Date.now()) / 86400000) : null;
              return (
                <div key={i} style={{ borderTop: i === 0 ? "none" : "1px solid var(--border-subtle)" }}>
                  <LiquidRail name={p.name} score={p.score} color={p.color} tasks={proj?._count?.tasks ?? 0} daysLeft={dL} />
                </div>
              );
            })}
          </motion.div>
        )}

        {/* ══ BOTTOM BODY ══ */}
        <div className="grid grid-cols-[1fr_280px] gap-10 items-start">

          {/* Left */}
          <div className="space-y-9">
            {actionFeed.length > 1 && (
              <section>
                <Label text="Requires action" count={actionFeed.length - 1} danger={urgentCount > 1} className="mb-3" />
                <motion.div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--bg-card)" }}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                  {actionFeed.slice(1).map((t, i) => <ActionRow key={t.id} task={t} index={i} />)}
                </motion.div>
              </section>
            )}

            <section>
              <div className="flex items-center justify-between mb-3">
                <Label text="AI Brief" />
                <button onClick={() => generateBrief(true)} className="text-[9.5px] font-semibold hover:opacity-60 transition-opacity" style={{ color: "var(--text-subtle)" }}>Refresh</button>
              </div>
              <div className="rounded-2xl px-5 py-4" style={{ border: "1px solid var(--border)", background: "var(--bg-card)" }}>
                <AiBrief text={briefText} loading={briefLoading} />
              </div>
            </section>

            {d.alerts && d.alerts.length > 0 && (
              <section>
                <Label text="Risk watch" count={d.alerts.length} danger={!!(d.criticalAlertCount && d.criticalAlertCount > 0)} className="mb-3" />
                <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--bg-card)" }}>
                  {d.alerts.slice(0, 4).map((a, i) => <RiskRow key={a.id} alert={a} index={i} />)}
                </div>
              </section>
            )}

            {d.recentTasks && d.recentTasks.length > 0 && (
              <section>
                <Label text="Changed while you were away" count={d.recentTasks.length} className="mb-3" />
                <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--bg-card)" }}>
                  {(d.recentTasks as TaskWithProject[]).slice(0, 6).map((t, i) => <ActivityRow key={t.id} task={t} index={i} />)}
                </div>
              </section>
            )}
          </div>

          {/* Right */}
          <div className="space-y-7">
            <section>
              <div className="flex items-center justify-between mb-3">
                <Label text="Projects" />
                <Link href="/projects" className="text-[9.5px] font-semibold hover:opacity-60 transition-opacity" style={{ color: "var(--accent)" }}>All →</Link>
              </div>
              <div className="space-y-px">
                {projects.length === 0
                  ? <p className="text-[12.5px]" style={{ color: "var(--text-subtle)" }}>No projects yet.</p>
                  : projects.slice(0, 7).map((p) => (
                    <Link key={p.id} href={`/projects/${p.id}/board`}>
                      <motion.div className="flex items-center gap-2.5 px-2 py-2 rounded-lg -mx-2 cursor-pointer"
                        whileHover={{ backgroundColor: "var(--bg-elevated)", x: 2 }} transition={{ duration: 0.13 }}>
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color, boxShadow: `0 0 6px ${p.color}88` }} />
                        <span className="flex-1 text-[12.5px] font-medium truncate" style={{ color: "var(--text-foreground)" }}>{p.name}</span>
                        <span className="text-[10px] tabular-nums shrink-0" style={{ color: "var(--text-subtle)" }}>{p._count?.tasks ?? 0}</span>
                      </motion.div>
                    </Link>
                  ))}
              </div>
            </section>

            <Divider />

            <section>
              <Label text="Quick actions" className="mb-3" />
              <div className="space-y-2">
                <Action glyph="✦" label="New task with AI"    onClick={() => setShowNLCreator(true)} />
                <Action glyph="⬡" label="All projects"        href="/projects" />
                <Action glyph="◉" label="Clock in / out"      href="/attendance" />
                <Action glyph="⚡" label="AI assistant"        href="/ai/assistant" />
                <Action glyph="📊" label="Team workload"       href="/workload" />
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
