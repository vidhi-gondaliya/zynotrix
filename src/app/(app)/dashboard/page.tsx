"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { isPast, format } from "date-fns";
import type { AnalyticsData, Task } from "@/types";
import { useClaude } from "@/hooks/useClaude";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { NLTaskCreator } from "@/components/ai/NLTaskCreator";

/* ── Constants ──────────────────────────────────────────────────────────── */
const PRIORITY_ORDER: Record<string, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
const BRIEFING_KEY = "colliq_briefing_v3";
const BRIEFING_TTL = 30 * 60 * 1000;
const PRI: Record<string, { label: string; color: string }> = {
  URGENT: { label: "URGENT", color: "#EF4444" },
  HIGH:   { label: "HIGH",   color: "#F59E0B" },
  MEDIUM: { label: "MED",    color: "#60A5FA" },
  LOW:    { label: "LOW",    color: "#94A3B8" },
};

const RITUAL = {
  morning:   { greeting: "Good morning",   nameWeight: 900, prefixWeight: 300, ambient: "radial-gradient(ellipse 80% 55% at 88% -5%, rgba(255,165,80,0.09) 0%, transparent 58%)" },
  afternoon: { greeting: "Good afternoon", nameWeight: 900, prefixWeight: 400, ambient: "radial-gradient(ellipse 80% 55% at 88% -5%, rgba(99,102,241,0.07) 0%, transparent 58%)" },
  evening:   { greeting: "Good evening",   nameWeight: 900, prefixWeight: 300, ambient: "radial-gradient(ellipse 80% 55% at 12% 92%, rgba(255,100,40,0.09) 0%, transparent 58%)" },
  night:     { greeting: "Working late",   nameWeight: 900, prefixWeight: 300, ambient: "radial-gradient(ellipse 100% 100% at 50% 50%, rgba(99,102,241,0.07) 0%, transparent 70%)" },
};

/* ── Types ──────────────────────────────────────────────────────────────── */
interface Project {
  id: string; name: string; color: string;
  description?: string; deadline?: string | null;
  _count?: { tasks: number };
}
type TaskWithProject = Task & { project?: { id: string; name: string; color: string } };

/* ════════════════════════════════════════════════════════════════════════ */
/*  VISUALIZATION SYSTEM                                                     */
/* ════════════════════════════════════════════════════════════════════════ */

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

function VelocityWave({ data }: { data: { date: string; completed: number; created: number }[] }) {
  const [hov, setHov] = useState<number | null>(null);
  if (!data.length) return (
    <div style={{ padding: "48px 0", textAlign: "center" }}>
      <p style={{ color: "var(--text-subtle)", fontSize: 12, marginBottom: 8 }}>No trend data yet</p>
      <p style={{ color: "var(--text-subtle)", fontSize: 10 }}>Complete tasks to see velocity</p>
    </div>
  );

  const W = 540, H = 150, PX = 12, PY = 16;
  const maxV = Math.max(...data.map(d => Math.max(d.created, d.completed)), 1);
  const pt = (i: number, v: number): [number, number] => [
    PX + (i / (data.length - 1)) * (W - 2 * PX),
    H - PY - (v / maxV) * (H - 2 * PY),
  ];
  const crPts = data.map((d, i) => pt(i, d.created));
  const coPts = data.map((d, i) => pt(i, d.completed));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
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
          {[0.25, 0.5, 0.75].map((t, i) => (
            <line key={i} x1={PX} x2={W - PX} y1={PY + t * (H - 2 * PY)} y2={PY + t * (H - 2 * PY)}
              stroke="var(--border-subtle)" strokeWidth="0.5" strokeDasharray="2 6" />
          ))}
          {data.map((d, i) => {
            if (i % 3 !== 0) return null;
            const dt = new Date(d.date);
            return <text key={i} x={crPts[i][0]} y={H - 1} textAnchor="middle" fill="var(--text-subtle)" fontSize={7.5} fontWeight={500}>{isNaN(dt.getTime()) ? "" : format(dt, "M/d")}</text>;
          })}
          <motion.path d={areaLine(crPts, H - PY)} fill="url(#vw-c)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.5 }} />
          <motion.path d={areaLine(coPts, H - PY)} fill="url(#vw-d)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.8 }} />
          <motion.path d={smoothLine(crPts)} fill="none" stroke="#6366F1" strokeWidth={2} filter="url(#glow-i)"
            initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.4, ease: [0.4, 0, 0.2, 1] }} />
          <motion.path d={smoothLine(coPts)} fill="none" stroke="#22C55E" strokeWidth={2} filter="url(#glow-g)"
            initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.4, ease: [0.4, 0, 0.2, 1], delay: 0.2 }} />
          {data.map((_, i) => {
            const segW = (W - 2 * PX) / (data.length - 1);
            return (
              <rect key={i} x={crPts[i][0] - segW / 2} y={PY} width={segW} height={H - 2 * PY}
                fill="transparent" style={{ cursor: "crosshair" }}
                onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)} />
            );
          })}
          {hov !== null && (
            <>
              <line x1={crPts[hov][0]} x2={crPts[hov][0]} y1={PY} y2={H - PY} stroke="var(--border-strong)" strokeWidth={1} strokeDasharray="3 3" />
              <circle cx={crPts[hov][0]} cy={crPts[hov][1]} r={4.5} fill="#6366F1" stroke="var(--bg-card)" strokeWidth={2} />
              <circle cx={coPts[hov][0]} cy={coPts[hov][1]} r={4.5} fill="#22C55E" stroke="var(--bg-card)" strokeWidth={2} />
            </>
          )}
        </svg>
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
      <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-subtle)", marginBottom: 14 }}>Mission Rings</p>
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
                    <motion.circle cx={cx} cy={cy} r={ring.r} fill="none" stroke={ring.color} strokeWidth={ring.sw} strokeLinecap="round"
                      strokeDasharray={circ}
                      initial={{ strokeDashoffset: circ }}
                      animate={{ strokeDashoffset: circ * (1 - pct) }}
                      transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1], delay: i * 0.16 }}
                      style={{ transform: "rotate(-90deg)", transformOrigin: `${cx}px ${cy}px`, filter: `drop-shadow(0 0 5px ${ring.color}88)` }}
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

const SKYLINE_COLORS = ["#6366F1","#22C55E","#F59E0B","#60A5FA","#EF4444","#A855F7","#14B8A6","#F97316"];

function ActivitySkyline({ data }: { data: { name: string; tasks: number }[] }) {
  const sorted = [...data].sort((a, b) => b.tasks - a.tasks).slice(0, 8);
  const max = Math.max(...sorted.map(d => d.tasks), 1);
  if (!sorted.length) return (
    <div style={{ padding: "40px 0", textAlign: "center" }}>
      <p style={{ color: "var(--text-subtle)", fontSize: 12, marginBottom: 6 }}>No team data yet</p>
      <p style={{ color: "var(--text-subtle)", fontSize: 10 }}>Invite teammates to see their activity</p>
    </div>
  );
  return (
    <div>
      <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-subtle)", marginBottom: 14 }}>Activity Skyline</p>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 108 }}>
        {sorted.map((m, i) => {
          const hPx = Math.max((m.tasks / max) * 108, 8);
          const col = SKYLINE_COLORS[i % SKYLINE_COLORS.length];
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
                  borderRadius: "3px 3px 0 0", cursor: "pointer",
                  position: "relative", overflow: "hidden",
                }}
              >
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
              <motion.div initial={{ scaleY: 0, opacity: 0 }} animate={{ scaleY: 1, opacity: 1 }}
                transition={{ delay: i * 0.04, duration: 0.35, ease: "easeOut" }}
                style={{ height: 22, borderRadius: 3, marginBottom: 3, cursor: "pointer",
                  background: `rgba(34,197,94,${Math.max(0.07, d.completed / maxV * 0.88)})`,
                  border: `1px solid rgba(34,197,94,${Math.max(0.04, d.completed / maxV * 0.45)})`,
                  transform: `scaleY(${isH ? 1.1 : 1})`, transformOrigin: "bottom",
                  transition: "transform 0.14s ease",
                  boxShadow: isH ? "0 0 6px rgba(34,197,94,0.3)" : "none",
                }} />
              <motion.div initial={{ scaleY: 0, opacity: 0 }} animate={{ scaleY: 1, opacity: 1 }}
                transition={{ delay: i * 0.04 + 0.08, duration: 0.35, ease: "easeOut" }}
                style={{ height: 22, borderRadius: 3, cursor: "pointer",
                  background: `rgba(99,102,241,${Math.max(0.07, d.created / maxV * 0.88)})`,
                  border: `1px solid rgba(99,102,241,${Math.max(0.04, d.created / maxV * 0.45)})`,
                  transform: `scaleY(${isH ? 1.1 : 1})`, transformOrigin: "top",
                  transition: "transform 0.14s ease",
                  boxShadow: isH ? "0 0 6px rgba(99,102,241,0.3)" : "none",
                }} />
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

function LiquidRail({ name, score, color, tasks, daysLeft }: {
  name: string; score: number; color: string; tasks: number; daysLeft: number | null;
}) {
  const hc = score >= 80 ? "#22C55E" : score >= 55 ? "#F59E0B" : score > 0 ? "#EF4444" : "#6B7280";
  return (
    <motion.div style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 0" }} whileHover={{ x: 3 }} transition={{ duration: 0.18 }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, boxShadow: `0 0 6px ${color}66`, flexShrink: 0 }} />
      <span style={{ width: 140, fontSize: 12.5, fontWeight: 600, color: "var(--text-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flexShrink: 0 }}>{name}</span>
      <div style={{ flex: 1, height: 5, background: "var(--bg-elevated)", borderRadius: 3, overflow: "hidden", position: "relative" }}>
        <motion.div
          initial={{ width: 0 }} animate={{ width: `${Math.min(100, Math.max(0, score))}%` }}
          transition={{ duration: 1.1, ease: [0.4, 0, 0.2, 1] }}
          style={{ height: "100%", borderRadius: 3, background: `linear-gradient(90deg,${hc}66,${hc})`, boxShadow: `0 0 8px ${hc}55` }}
        />
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

function PriorityBars({ data }: { data: Record<string, number> }) {
  const entries = [
    { l: "Urgent", v: data.URGENT ?? 0, c: "#EF4444" },
    { l: "High",   v: data.HIGH   ?? 0, c: "#F59E0B" },
    { l: "Medium", v: data.MEDIUM ?? 0, c: "#60A5FA" },
    { l: "Low",    v: data.LOW    ?? 0, c: "#94A3B8" },
  ];
  const max = Math.max(...entries.map(e => e.v), 1);
  const tot = entries.reduce((s, e) => s + e.v, 0);
  return (
    <div>
      <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-subtle)", marginBottom: 14 }}>Priority Split</p>
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

/* ════════════════════════════════════════════════════════════════════════ */
/*  NEW EDITORIAL COMPONENTS                                                */
/* ════════════════════════════════════════════════════════════════════════ */

function LiveTicker({ tasks }: { tasks: TaskWithProject[] }) {
  if (!tasks.length) return null;
  const items = tasks.slice(0, 8).map(t => {
    const actor = (t as TaskWithProject).assignee?.name?.split(" ")[0] ?? "Someone";
    const verb = t.status === "DONE" ? "completed" : t.status === "REVIEW" ? "sent to review" : t.status === "IN_PROGRESS" ? "started" : "updated";
    return `${actor} ${verb} "${t.title.slice(0, 36)}${t.title.length > 36 ? "…" : ""}"`;
  });
  const tickerText = [...items, ...items].join("   ·   ");

  return (
    <div style={{ borderBottom: "1px solid var(--border-subtle)", overflow: "hidden", background: "var(--bg-base)" }}>
      <style>{`
        @keyframes colliq-ticker { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .colliq-ticker-track { display: inline-block; white-space: nowrap; animation: colliq-ticker 48s linear infinite; padding-left: 24px; }
        .colliq-ticker-track:hover { animation-play-state: paused; }
      `}</style>
      <div style={{ display: "flex", alignItems: "center", height: 34 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 20px", borderRight: "1px solid var(--border-subtle)", flexShrink: 0, height: "100%" }}>
          <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 2, repeat: Infinity }}
            style={{ width: 6, height: 6, borderRadius: "50%", background: "#22C55E", display: "block" }} />
          <span style={{ fontSize: 9.5, fontWeight: 900, letterSpacing: "0.16em", color: "var(--text-subtle)", textTransform: "uppercase" }}>LIVE</span>
        </div>
        <div style={{ flex: 1, overflow: "hidden" }}>
          <div className="colliq-ticker-track">
            <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}>{tickerText}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SceneHeader({
  label, icon, href, linkText, count,
}: {
  label: string; icon?: string; href?: string; linkText?: string; count?: number;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {icon && <span style={{ fontSize: 14, color: "var(--accent)" }}>{icon}</span>}
        <span style={{ fontSize: 10.5, fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-subtle)" }}>
          {label}
        </span>
        {count !== undefined && count > 0 && (
          <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 100, background: "var(--bg-elevated)", color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
            {count}
          </span>
        )}
      </div>
      {href && linkText && (
        <Link href={href} style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", textDecoration: "none" }}>{linkText}</Link>
      )}
    </div>
  );
}

function HeroSprintRing({ rate, done, total }: { rate: number; done: number; total: number }) {
  const r = 84, cx = 100, cy = 100, circ = 2 * Math.PI * r;
  return (
    <div style={{ textAlign: "center", flexShrink: 0 }}>
      <svg width={200} height={200} style={{ overflow: "visible", display: "block" }}>
        <defs>
          <linearGradient id="hero-ring-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#22C55E" />
          </linearGradient>
        </defs>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--bg-elevated)" strokeWidth={13} />
        <motion.circle
          cx={cx} cy={cy} r={r} fill="none"
          stroke="url(#hero-ring-g)" strokeWidth={13} strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ * (1 - rate / 100) }}
          transition={{ duration: 1.8, ease: [0.4, 0, 0.2, 1], delay: 0.5 }}
          style={{ transform: "rotate(-90deg)", transformOrigin: `${cx}px ${cy}px`, filter: "drop-shadow(0 0 12px rgba(99,102,241,0.55))" }}
        />
        <text x={cx} y={cy - 12} textAnchor="middle" fill="var(--text-foreground)" fontSize={44} fontWeight={900} style={{ letterSpacing: "-0.04em", fontVariantNumeric: "tabular-nums" }}>{rate}</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fill="var(--text-subtle)" fontSize={11} fontWeight={700} style={{ textTransform: "uppercase", letterSpacing: "0.1em" }}>% complete</text>
        <text x={cx} y={cy + 26} textAnchor="middle" fill="var(--text-subtle)" fontSize={10} fontWeight={400}>{done} of {total} tasks</text>
      </svg>
      <p style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-subtle)", marginTop: 6 }}>Sprint Progress</p>
    </div>
  );
}

function EditorialTaskRow({ task, index }: { task: TaskWithProject; index: number }) {
  const isOv = !!(task.dueDate && isPast(new Date(task.dueDate)) && task.status !== "DONE");
  const pri  = PRI[task.priority] ?? PRI.MEDIUM;
  const col  = isOv ? "#EF4444" : pri.color;
  const href = task.project ? `/projects/${task.project.id}/board` : "#";

  return (
    <motion.a
      href={href}
      style={{ display: "flex", alignItems: "center", gap: 16, padding: "17px 0",
        borderTop: index === 0 ? "none" : "1px solid var(--border-subtle)",
        textDecoration: "none", cursor: "pointer" }}
      whileHover={{ x: 5 }}
      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
    >
      <div style={{ width: 9, height: 9, borderRadius: "50%", background: col, flexShrink: 0, boxShadow: `0 0 10px ${col}66` }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text-foreground)", lineHeight: 1.35, letterSpacing: "-0.01em", marginBottom: 2 }}>{task.title}</p>
        <p style={{ fontSize: 11, color: "var(--text-subtle)", fontWeight: 500 }}>
          {task.project?.name}{task.assignee?.name ? ` · ${task.assignee.name.split(" ")[0]}` : ""}
        </p>
      </div>
      <span style={{ fontSize: 9.5, fontWeight: 800, padding: "4px 10px", borderRadius: 100,
        background: `${col}12`, color: col, letterSpacing: "0.08em", flexShrink: 0 }}>
        {pri.label}
      </span>
      {task.dueDate && (
        <span style={{ fontSize: 11, color: isOv ? "#EF4444" : "var(--text-subtle)", fontWeight: 600, flexShrink: 0 }}>
          {isOv ? "Overdue" : format(new Date(task.dueDate), "MMM d")}
        </span>
      )}
    </motion.a>
  );
}

function FeaturedProjectCard({ project, health }: { project: Project; health?: { score: number } }) {
  const hScore = health?.score ?? 0;
  const hColor = hScore >= 80 ? "#22C55E" : hScore >= 55 ? "#F59E0B" : hScore > 0 ? "#EF4444" : "var(--text-subtle)";
  const tasks  = project._count?.tasks ?? 0;
  return (
    <motion.a href={`/projects/${project.id}/board`} style={{ display: "flex", flexDirection: "column", textDecoration: "none",
      borderRadius: 20, padding: "32px 32px 28px", background: "var(--bg-card)", border: "1px solid var(--border)",
      boxShadow: "0 2px 8px rgba(0,0,0,0.06)", position: "relative", overflow: "hidden" }}
      whileHover={{ y: -4, boxShadow: "0 16px 48px rgba(0,0,0,0.13)" }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
    >
      <div aria-hidden style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: project.color }} />
      <p style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-subtle)", marginBottom: 14 }}>FEATURED</p>
      <h3 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--text-foreground)", lineHeight: 1.1, marginBottom: 10 }}>{project.name}</h3>
      {project.description && (
        <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6, marginBottom: 24, maxWidth: 340, flex: 1 }}>
          {project.description.slice(0, 100)}{project.description.length > 100 ? "…" : ""}
        </p>
      )}
      {hScore > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-subtle)" }}>Health score</span>
            <span style={{ fontSize: 10, fontWeight: 800, color: hColor }}>{Math.round(hScore)}%</span>
          </div>
          <div style={{ height: 4, background: "var(--bg-elevated)", borderRadius: 2, overflow: "hidden" }}>
            <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, hScore)}%` }}
              transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1], delay: 0.4 }}
              style={{ height: "100%", background: `linear-gradient(90deg, ${hColor}66, ${hColor})`, borderRadius: 2 }} />
          </div>
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto" }}>
        <span style={{ fontSize: 11.5, color: "var(--text-subtle)", fontWeight: 500 }}>{tasks} tasks</span>
        {project.deadline && <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)" }}>Due {format(new Date(project.deadline), "MMM d")}</span>}
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)" }}>Open →</span>
      </div>
    </motion.a>
  );
}

function SmallProjectCard({ project, health }: { project: Project; health?: { score: number } }) {
  const hScore = health?.score ?? 0;
  const hColor = hScore >= 80 ? "#22C55E" : hScore >= 55 ? "#F59E0B" : hScore > 0 ? "#EF4444" : "var(--text-muted)";
  const tasks  = project._count?.tasks ?? 0;
  return (
    <motion.a href={`/projects/${project.id}/board`} style={{ display: "block", flex: 1, textDecoration: "none",
      borderRadius: 16, padding: "20px 24px", background: "var(--bg-card)", border: "1px solid var(--border)",
      boxShadow: "0 1px 4px rgba(0,0,0,0.04)", position: "relative", overflow: "hidden" }}
      whileHover={{ y: -3, boxShadow: "0 10px 28px rgba(0,0,0,0.10)" }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
    >
      <div aria-hidden style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: project.color }} />
      <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", marginBottom: 12 }}>
        <h3 style={{ fontSize: 14.5, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text-foreground)", lineHeight: 1.2 }}>{project.name}</h3>
        <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-subtle)", flexShrink: 0, marginLeft: 8 }}>{tasks}t</span>
      </div>
      {hScore > 0 && (
        <div>
          <div style={{ height: 3, background: "var(--bg-elevated)", borderRadius: 2, overflow: "hidden", marginBottom: 6 }}>
            <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, hScore)}%` }}
              transition={{ duration: 1.1, ease: [0.4, 0, 0.2, 1], delay: 0.5 }}
              style={{ height: "100%", background: hColor, borderRadius: 2 }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: hColor }}>{Math.round(hScore)}%</span>
            {project.deadline && <span style={{ fontSize: 10, color: "var(--text-subtle)" }}>Due {format(new Date(project.deadline), "MMM d")}</span>}
          </div>
        </div>
      )}
    </motion.a>
  );
}

function StatTile({ label, value, positive, danger }: { label: string; value: string | number; positive?: boolean; danger?: boolean }) {
  const color = danger ? "#EF4444" : positive ? "#22C55E" : "var(--text-foreground)";
  return (
    <div style={{ padding: "16px 20px", borderRadius: 14, background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <p style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-subtle)", marginBottom: 7 }}>{label}</p>
      <p style={{ fontSize: 20, fontWeight: 800, color, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>{value}</p>
    </div>
  );
}

function AiInsightBrief({ text, loading, onRefresh }: { text: string; loading: boolean; onRefresh: () => void }) {
  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {[85, 70, 90, 60].map((w, i) => (
        <div key={i} style={{ height: 14, borderRadius: 4, width: `${w}%`, background: "var(--bg-elevated)", animation: "pulse 1.8s ease-in-out infinite" }} />
      ))}
    </div>
  );
  if (!text) return <p style={{ fontSize: 14, color: "var(--text-subtle)" }}>Generating briefing…</p>;

  const lines = text.split("\n").map(l => l.replace(/^[•·\-]\s*/, "").replace(/\*\*/g, "").trim()).filter(Boolean);
  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 18, marginBottom: 28 }}>
        {lines.map((line, i) => (
          <motion.div key={i} style={{ display: "flex", alignItems: "start", gap: 14 }}
            initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.09 }}>
            <span style={{ marginTop: 9, width: 5, height: 5, borderRadius: "50%", background: "var(--accent)", opacity: 0.55, flexShrink: 0, display: "block" }} />
            <p style={{ fontSize: 15, lineHeight: 1.65, color: "var(--text-secondary)", fontWeight: 400 }}>{line}</p>
          </motion.div>
        ))}
      </div>
      <button onClick={onRefresh}
        style={{ fontSize: 11, fontWeight: 700, color: "var(--text-subtle)", background: "none", border: "1px solid var(--border)", borderRadius: 100, padding: "6px 16px", cursor: "pointer" }}>
        Refresh
      </button>
    </div>
  );
}

function SmallInsightCard({ title, detail, severity }: { title: string; detail: string; severity: string }) {
  const color = severity === "critical" ? "#EF4444" : "#F59E0B";
  return (
    <div style={{ padding: "16px 18px", borderRadius: 14, background: "var(--bg-card)", border: "1px solid var(--border)", borderLeft: `3px solid ${color}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
        <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-foreground)" }}>{title}</p>
      </div>
      <p style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5 }}>{detail}</p>
    </div>
  );
}

function relTime(s: string): string {
  const h = Math.floor((Date.now() - new Date(s).getTime()) / 3600000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function ActivityRow({ task, index }: { task: TaskWithProject; index: number }) {
  const actor = task.assignee?.name ?? "Someone";
  const verb  = task.status === "DONE" ? "completed" : task.status === "REVIEW" ? "sent to review" : task.status === "IN_PROGRESS" ? "started" : "updated";
  return (
    <motion.div style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0",
      borderTop: index === 0 ? "none" : "1px solid var(--border-subtle)", cursor: "pointer" }}
      whileHover={{ x: 3 }} transition={{ duration: 0.13 }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: (task.project as { color?: string } | undefined)?.color ?? "var(--accent)", flexShrink: 0 }} />
      <p style={{ flex: 1, fontSize: 12.5, color: "var(--text-foreground)" }}>
        <span style={{ fontWeight: 600, color: "var(--text-subtle)" }}>{actor.split(" ")[0]}</span>
        {" "}<span style={{ color: "var(--text-muted)" }}>{verb}</span>
        {" "}<span>{task.title.slice(0, 48)}{task.title.length > 48 ? "…" : ""}</span>
      </p>
      <span style={{ fontSize: 10, color: "var(--text-subtle)", flexShrink: 0 }}>{relTime(task.updatedAt)}</span>
    </motion.div>
  );
}

function Action({ href, label, glyph, onClick }: { href?: string; label: string; glyph: string; onClick?: () => void }) {
  const inner = (
    <motion.div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 12,
      border: "1px solid var(--border)", background: "var(--bg-card)", cursor: "pointer" }}
      whileHover={{ backgroundColor: "var(--bg-card-hover)", borderColor: "var(--border-strong)", x: 2 }}
      transition={{ duration: 0.15 }}>
      <span style={{ fontSize: 14, color: "var(--accent)", flexShrink: 0, lineHeight: 1 }}>{glyph}</span>
      <span style={{ fontSize: 12.5, fontWeight: 500, color: "var(--text-foreground)" }}>{label}</span>
    </motion.div>
  );
  if (onClick) return <div onClick={onClick}>{inner}</div>;
  return <Link href={href ?? "#"} style={{ textDecoration: "none" }}>{inner}</Link>;
}

/* ════════════════════════════════════════════════════════════════════════ */
/*  PAGE                                                                    */
/* ════════════════════════════════════════════════════════════════════════ */
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
  const focusRef   = useRef<HTMLDivElement>(null);

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
    }).slice(0, 6);

  const hour      = new Date().getHours();
  const ritualKey = hour >= 5 && hour < 11 ? "morning" : hour >= 11 && hour < 17 ? "afternoon" : hour >= 17 && hour < 23 ? "evening" : "night";
  const ritual    = RITUAL[ritualKey];
  const firstName = (session?.user?.name ?? "").split(" ")[0] || "there";

  const d = analyticsData;

  const contextSentence = !d ? ""
    : d.overdueTasks > 0
    ? `${d.overdueTasks} task${d.overdueTasks > 1 ? "s" : ""} overdue — sprint at ${d.completionRate}% completion.`
    : actionFeed.length > 0
    ? `${actionFeed.length} item${actionFeed.length > 1 ? "s" : ""} need attention today. Sprint at ${d.completionRate}%.`
    : `Everything looks healthy. Sprint at ${d.completionRate}% — a great day to make progress.`;

  const hasTeam    = (d?.teamActivity ?? []).length > 0;
  const hasHealth  = (d?.projectHealth ?? []).length > 0;
  const hasTrend   = (d?.taskTrend ?? []).length > 0;
  const hasAlerts  = (d?.alerts ?? []).length > 0;

  const cardSt: React.CSSProperties = {
    background: "var(--bg-card)", border: "1px solid var(--border)",
    borderRadius: 20, padding: "24px 28px",
  };

  if (loading) return (
    <div style={{ maxWidth: 1240, margin: "0 auto", padding: "48px 48px 80px", display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 64, alignItems: "center", minHeight: 260, padding: "0 0 64px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ height: 12, width: 140, borderRadius: 6, background: "var(--bg-elevated)", animation: "pulse 1.8s ease-in-out infinite" }} />
          <div style={{ height: 56, width: "70%", borderRadius: 8, background: "var(--bg-elevated)", animation: "pulse 1.8s ease-in-out infinite" }} />
          <div style={{ height: 56, width: "50%", borderRadius: 8, background: "var(--bg-elevated)", animation: "pulse 1.8s ease-in-out infinite" }} />
          <div style={{ height: 20, width: "80%", borderRadius: 4, background: "var(--bg-elevated)", animation: "pulse 1.8s ease-in-out infinite", marginTop: 8 }} />
        </div>
        <div style={{ width: 200, height: 200, borderRadius: "50%", background: "var(--bg-elevated)", animation: "pulse 1.8s ease-in-out infinite" }} />
      </div>
      {[1,2,3].map(i => <div key={i} style={{ height: 160, borderRadius: 20, background: "var(--bg-elevated)", animation: "pulse 1.8s ease-in-out infinite" }} />)}
    </div>
  );

  if (!d) return null;

  return (
    <>
      <NLTaskCreator open={showNLCreator} onClose={() => setShowNLCreator(false)} />
      {showOnboarding && <OnboardingWizard onComplete={() => { localStorage.setItem("colliq_onboarded", "1"); setShowOnboarding(false); }} />}

      {/* Ritual ambient overlay */}
      <div aria-hidden style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        background: ritual.ambient,
        transition: "background 4s ease-in-out",
      }} />

      <div style={{ position: "relative", zIndex: 1 }}>

        {/* Live Ticker */}
        {(d.recentTasks ?? []).length > 0 && (
          <LiveTicker tasks={d.recentTasks as TaskWithProject[]} />
        )}

        <div style={{ maxWidth: 1240, margin: "0 auto", padding: "0 48px 96px" }}>

          {/* ══ SCENE 1: HERO ══════════════════════════════════════════ */}
          <section style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "0 72px", alignItems: "center", padding: "72px 0 80px", minHeight: "38vh" }}>
            {/* Left: Typography */}
            <div>
              <motion.p
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}
                style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--text-subtle)", marginBottom: 20 }}>
                {format(new Date(), "EEEE, MMMM d")}
              </motion.p>

              <motion.h1
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                style={{ letterSpacing: "-0.03em", lineHeight: 1.05, color: "var(--text-foreground)", marginBottom: 28 }}>
                <span style={{
                  display: "block",
                  fontSize: "clamp(38px, 4vw, 60px)",
                  fontWeight: ritual.prefixWeight,
                }}>
                  {ritual.greeting},
                </span>
                <span style={{
                  display: "block",
                  fontSize: "clamp(38px, 4vw, 60px)",
                  fontWeight: ritual.nameWeight,
                }}>
                  {firstName}.
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.28, duration: 0.4 }}
                style={{ fontSize: 17, fontWeight: 400, lineHeight: 1.6, color: "var(--text-muted)", maxWidth: 460, marginBottom: 36 }}>
                {contextSentence}
              </motion.p>

              <motion.button
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
                onClick={() => focusRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                style={{ fontSize: 13.5, fontWeight: 700, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", padding: 0, letterSpacing: "-0.01em" }}>
                See today's focus →
              </motion.button>
            </div>

            {/* Right: Large sprint ring */}
            <motion.div
              initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}>
              <HeroSprintRing rate={d.completionRate} done={d.completedTasks} total={d.totalTasks} />
            </motion.div>
          </section>

          {/* Scene divider */}
          <div style={{ height: "0.5px", background: "var(--border-subtle)", marginBottom: 72 }} />

          {/* ══ SCENE 2: TODAY'S FOCUS ══════════════════════════════════ */}
          <section ref={focusRef} style={{ marginBottom: 80 }}>
            <SceneHeader label="Today's Focus" count={actionFeed.length} />

            <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: "0 80px", alignItems: "start" }}>
              {/* Massive number */}
              <div>
                <motion.p
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
                  style={{
                    fontSize: "clamp(88px, 12vw, 136px)", fontWeight: 900, letterSpacing: "-0.05em",
                    lineHeight: 0.88, color: "var(--text-foreground)", fontVariantNumeric: "tabular-nums",
                    marginBottom: 16,
                  }}>
                  {actionFeed.length === 0 ? (
                    <span style={{ fontSize: "clamp(64px, 9vw, 100px)", color: "#22C55E" }}>✓</span>
                  ) : (
                    <CountUp to={actionFeed.length} duration={1.0} />
                  )}
                </motion.p>
                <p style={{ fontSize: 16, fontWeight: 300, color: "var(--text-muted)", lineHeight: 1.4, marginBottom: 28 }}>
                  {actionFeed.length === 0 ? "All clear today" : `task${actionFeed.length > 1 ? "s" : ""} need attention`}
                </p>
                <div style={{ height: "0.5px", background: "var(--border-subtle)", marginBottom: 24 }} />
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-subtle)", marginBottom: 6 }}>Completion</p>
                <p style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.03em", color: "var(--text-foreground)", fontVariantNumeric: "tabular-nums" }}>
                  <CountUp to={d.completionRate} suffix="%" duration={1.2} />
                </p>
                <p style={{ fontSize: 11, color: "var(--text-subtle)", marginTop: 4 }}>{d.completedTasks} of {d.totalTasks} tasks done</p>
              </div>

              {/* Editorial task list */}
              <div>
                {actionFeed.length === 0 ? (
                  <div style={{ padding: "48px 0" }}>
                    <p style={{ fontSize: 15, color: "var(--text-subtle)", fontWeight: 400 }}>No urgent tasks today — you're in a great position.</p>
                    <Link href="/tasks" style={{ fontSize: 12, color: "var(--accent)", fontWeight: 600, textDecoration: "none", marginTop: 12, display: "block" }}>Browse all tasks →</Link>
                  </div>
                ) : (
                  actionFeed.map((task, i) => <EditorialTaskRow key={task.id} task={task} index={i} />)
                )}
              </div>
            </div>
          </section>

          {/* Scene divider */}
          <div style={{ height: "0.5px", background: "var(--border-subtle)", marginBottom: 72 }} />

          {/* ══ SCENE 3: SPRINT HEALTH ══════════════════════════════════ */}
          <section style={{ marginBottom: 80 }}>
            <SceneHeader label="Sprint Health" />

            <div style={{ display: "grid", gridTemplateColumns: hasTrend ? "1fr auto auto" : "1fr auto", gap: 20, alignItems: "start" }}>
              {/* Velocity Wave */}
              <motion.div style={cardSt} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <VelocityWave data={d.taskTrend ?? []} />
              </motion.div>

              {/* Mission Rings */}
              <motion.div style={{ ...cardSt, flexShrink: 0 }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
                <MissionRing data={d.tasksByStatus ?? {}} total={d.totalTasks} />
              </motion.div>

              {/* Stat tiles */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12, flexShrink: 0, width: 148 }}>
                <StatTile label="Total Tasks" value={d.totalTasks} />
                <StatTile label="Active" value={d.activeTasks} />
                <StatTile label="Overdue" value={d.overdueTasks} danger={d.overdueTasks > 0} />
                {hasAlerts && <StatTile label="Risks" value={d.alerts!.length} danger />}
              </div>
            </div>
          </section>

          {/* Priority bars (if data) */}
          {Object.values(d.tasksByPriority ?? {}).some(v => v > 0) && (
            <motion.div style={{ ...cardSt, marginBottom: 80 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
              <PriorityBars data={d.tasksByPriority ?? {}} />
            </motion.div>
          )}

          {/* Scene divider */}
          <div style={{ height: "0.5px", background: "var(--border-subtle)", marginBottom: 72 }} />

          {/* ══ SCENE 4: PROJECTS ═══════════════════════════════════════ */}
          {projects.length > 0 && (
            <section style={{ marginBottom: 80 }}>
              <SceneHeader label="Projects" href="/projects" linkText="All projects →" count={projects.length} />

              {projects.length === 1 ? (
                <FeaturedProjectCard
                  project={projects[0]}
                  health={d.projectHealth?.find(h => h.name === projects[0].name)}
                />
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "stretch" }}>
                  <FeaturedProjectCard
                    project={projects[0]}
                    health={d.projectHealth?.find(h => h.name === projects[0].name)}
                  />
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {projects.slice(1, 3).map(p => (
                      <SmallProjectCard key={p.id} project={p} health={d.projectHealth?.find(h => h.name === p.name)} />
                    ))}
                  </div>
                </div>
              )}

              {/* Project Roadmap — LiquidRail rows */}
              {hasHealth && (
                <motion.div style={{ ...cardSt, marginTop: 16 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                  <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-subtle)", marginBottom: 4 }}>Roadmap</p>
                  <p style={{ fontSize: 9.5, color: "var(--text-subtle)", opacity: 0.65, marginBottom: 12 }}>Health · task count · days remaining</p>
                  {d.projectHealth!.map((p, i) => {
                    const proj  = projects.find(pr => pr.name === p.name);
                    const dMs   = proj?.deadline ? new Date(proj.deadline).getTime() : NaN;
                    const dL    = !isNaN(dMs) ? Math.ceil((dMs - Date.now()) / 86400000) : null;
                    return (
                      <div key={i} style={{ borderTop: i === 0 ? "none" : "1px solid var(--border-subtle)" }}>
                        <LiquidRail name={p.name} score={p.score} color={p.color} tasks={proj?._count?.tasks ?? 0} daysLeft={dL} />
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </section>
          )}

          {projects.length === 0 && (
            <section style={{ marginBottom: 80 }}>
              <SceneHeader label="Projects" href="/projects/new" linkText="New project →" />
              <div style={{ padding: "64px 0", textAlign: "center" }}>
                <p style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--text-foreground)", marginBottom: 10 }}>Your first project is one keystroke away.</p>
                <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 24 }}>Press <kbd style={{ padding: "2px 8px", borderRadius: 6, background: "var(--bg-elevated)", border: "1px solid var(--border)", fontSize: 12, fontFamily: "monospace" }}>⌘K</kbd> and type "new project" to begin.</p>
              </div>
            </section>
          )}

          {/* Scene divider */}
          <div style={{ height: "0.5px", background: "var(--border-subtle)", marginBottom: 72 }} />

          {/* ══ SCENE 5: AI INSIGHTS ════════════════════════════════════ */}
          <section style={{ marginBottom: 80 }}>
            <SceneHeader label="Colliq Intelligence" icon="◈" />

            <div style={{ display: "grid", gridTemplateColumns: hasAlerts ? "1fr 300px" : "1fr", gap: 32, alignItems: "start" }}>
              {/* Primary insight — editorial large text */}
              <div style={cardSt}>
                <AiInsightBrief text={briefText} loading={briefLoading} onRefresh={() => generateBrief(true)} />
              </div>

              {/* Secondary: alert cards */}
              {hasAlerts && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {d.alerts!.slice(0, 4).map((alert, i) => (
                    <SmallInsightCard key={i} title={alert.title} detail={alert.detail} severity={alert.severity} />
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Scene divider */}
          {(hasTeam || (d.recentTasks ?? []).length > 0) && (
            <div style={{ height: "0.5px", background: "var(--border-subtle)", marginBottom: 72 }} />
          )}

          {/* ══ SCENE 6: TEAM ACTIVITY ══════════════════════════════════ */}
          {(hasTeam || (d.recentTasks ?? []).length > 0) && (
            <section style={{ marginBottom: 80 }}>
              <SceneHeader label="Team" count={d.teamActivity?.length} />

              <div style={{ display: "grid", gridTemplateColumns: hasTrend ? "1fr 1fr" : "1fr", gap: 20, marginBottom: 20 }}>
                {hasTeam && (
                  <motion.div style={cardSt} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <ActivitySkyline data={d.teamActivity ?? []} />
                  </motion.div>
                )}
                {hasTrend && (
                  <motion.div style={cardSt} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
                    <ContributionHeatmap data={d.taskTrend ?? []} />
                  </motion.div>
                )}
              </div>

              {/* Recent activity feed */}
              {(d.recentTasks ?? []).length > 0 && (
                <motion.div style={cardSt} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
                  <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-subtle)", marginBottom: 12 }}>Recently changed</p>
                  {(d.recentTasks as TaskWithProject[]).slice(0, 6).map((t, i) => (
                    <ActivityRow key={t.id} task={t} index={i} />
                  ))}
                </motion.div>
              )}
            </section>
          )}

          {/* ══ QUICK ACTIONS ══════════════════════════════════════════ */}
          <div style={{ height: "0.5px", background: "var(--border-subtle)", marginBottom: 48 }} />
          <section>
            <SceneHeader label="Quick Actions" />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
              <Action glyph="✦" label="New task with AI"  onClick={() => setShowNLCreator(true)} />
              <Action glyph="⬡" label="All projects"      href="/projects" />
              <Action glyph="◉" label="Clock in / out"    href="/attendance" />
              <Action glyph="⚡" label="AI assistant"      href="/ai/assistant" />
              <Action glyph="📊" label="Team workload"     href="/workload" />
            </div>
          </section>

        </div>
      </div>
    </>
  );
}
