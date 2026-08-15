"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { isPast, format, differenceInDays } from "date-fns";
import type { AnalyticsData, Task } from "@/types";
import { useClaude } from "@/hooks/useClaude";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { NLTaskCreator } from "@/components/ai/NLTaskCreator";
import {
  AreaChart, Area, PieChart, Pie, Cell,
  CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from "recharts";

/* ── Constants ─────────────────────────────────────────────────────────────── */

const PRIORITY_ORDER: Record<string, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
const BRIEFING_KEY  = "colliq_briefing_v3";
const BRIEFING_TTL  = 30 * 60 * 1000;

// color = bar/dot stroke; bg = tinted badge bg; txt = WCAG AA-safe dark text on bg
const PRI: Record<string, { label: string; color: string; bg: string; txt: string }> = {
  URGENT: { label: "URGENT", color: "#EF4444", bg: "rgba(239,68,68,0.14)",  txt: "#B91C1C" },
  HIGH:   { label: "HIGH",   color: "#F59E0B", bg: "rgba(245,158,11,0.14)", txt: "#92400E" },
  MEDIUM: { label: "MED",    color: "#60A5FA", bg: "rgba(96,165,250,0.14)", txt: "#1E40AF" },
  LOW:    { label: "LOW",    color: "#94A3B8", bg: "rgba(148,163,184,0.14)",txt: "#374151" },
};
// Returns inline style for an accessible priority/overdue badge
function priBadgeStyle(pri: typeof PRI[string], isOverdue = false) {
  if (isOverdue) return { background: "#EF4444", color: "#fff" };
  return { background: pri.bg, color: pri.txt };
}

const STATUS_COLORS: Record<string, string> = {
  DONE:        "#22C55E",
  IN_PROGRESS: "#818CF8",
  REVIEW:      "#FBBF24",
  TODO:        "#60A5FA",
  BACKLOG:     "#6B7280",
};
const STATUS_LABELS: Record<string, string> = {
  DONE: "Done", IN_PROGRESS: "In Progress", REVIEW: "Review", TODO: "To Do", BACKLOG: "Backlog",
};

/* ── Types ─────────────────────────────────────────────────────────────────── */

interface Project {
  id: string;
  name: string;
  color: string;
  description?: string;
  deadline?: string | null;
  _count?: { tasks: number };
}

type TaskWithProject = Task & { project?: { id: string; name: string; color: string } };

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  CHART COMPONENTS                                                           */
/* ═══════════════════════════════════════════════════════════════════════════ */

/* ── Shared chart tooltip ─────────────────────────────────────────────────── */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "var(--bg-card)",
      border: "1px solid var(--border-strong)",
      borderRadius: 10,
      padding: "8px 12px",
      boxShadow: "0 8px 32px rgba(0,0,0,0.22)",
      fontSize: 11,
      minWidth: 100,
    }}>
      {label && (
        <p style={{ color: "var(--text-subtle)", marginBottom: 5, fontWeight: 700, fontSize: 10, letterSpacing: "0.06em" }}>
          {label}
        </p>
      )}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "1.5px 0" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: p.color ?? p.fill, display: "inline-block", flexShrink: 0 }} />
          <span style={{ color: "var(--text-muted)" }}>{p.name}:</span>
          <span style={{ color: "var(--text-foreground)", fontWeight: 700, marginLeft: "auto", paddingLeft: 8, fontVariantNumeric: "tabular-nums" }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ── KPI tile ─────────────────────────────────────────────────────────────── */
function KpiTile({ label, value, sub, accent, trend }: {
  label: string; value: string | number; sub: string; accent?: string; trend?: number;
}) {
  const hasTrend = trend !== undefined && trend !== 0;
  const up = (trend ?? 0) > 0;
  const accentColor = accent ?? "var(--accent)";
  return (
    <div style={{
      background: "var(--bg-card)",
      border: "1px solid var(--border)",
      borderRadius: 18,
      padding: "20px 22px 18px",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Top accent stripe */}
      <div style={{
        position: "absolute", top: 0, left: 22, right: 22, height: 2.5,
        background: accentColor, borderRadius: "0 0 4px 4px", opacity: 0.75,
      }} />
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
        <p style={{ color: "var(--text-subtle)", fontSize: 9.5, fontWeight: 800, letterSpacing: "0.13em", textTransform: "uppercase" }}>
          {label}
        </p>
        {hasTrend && (
          <span style={{
            fontSize: 9.5, fontWeight: 800, letterSpacing: "0.04em",
            padding: "2.5px 7px", borderRadius: 100, flexShrink: 0,
            background: up ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.10)",
            color: up ? "#16A34A" : "#DC2626",
          }}>
            {up ? "↑" : "↓"}{Math.abs(trend!)}%
          </span>
        )}
      </div>
      <p style={{ color: accentColor, fontSize: 34, fontWeight: 900, lineHeight: 1, letterSpacing: "-0.04em", marginBottom: 6, fontVariantNumeric: "tabular-nums" }}>
        {value}
      </p>
      <p style={{ color: "var(--text-muted)", fontSize: 11.5 }}>{sub}</p>
    </div>
  );
}

/* ── Hero Strip ───────────────────────────────────────────────────────────── */
function HeroStrip({
  greeting, firstName, urgentCount, tasksByStatus,
}: {
  greeting: string; firstName: string; urgentCount: number;
  tasksByStatus: Record<string, number>;
}) {
  const chips = [
    { label: "Active",     key: "IN_PROGRESS", color: "#6366F1", glow: "rgba(99,102,241,0.45)" },
    { label: "Pending",    key: "TODO",         color: "#FBBF24", glow: "rgba(251,191,36,0.40)" },
    { label: "In Review",  key: "REVIEW",       color: "#60A5FA", glow: "rgba(96,165,250,0.40)" },
    { label: "Completed",  key: "DONE",         color: "#22C55E", glow: "rgba(34,197,94,0.38)" },
  ] as const;

  return (
    <div style={{
      position: "relative", overflow: "hidden",
      background: "linear-gradient(135deg, #0C0D26 0%, #12144A 45%, #0A0C22 100%)",
      borderRadius: 24,
      padding: "32px 36px",
      marginBottom: 20,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 24,
      minHeight: 130,
    }}>
      {/* Dot-grid texture */}
      <div aria-hidden style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: "radial-gradient(rgba(255,255,255,0.065) 1px, transparent 1px)",
        backgroundSize: "22px 22px",
      }} />
      {/* Ambient orb */}
      <div aria-hidden style={{
        position: "absolute", top: -60, right: "30%",
        width: 260, height: 260, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(99,102,241,0.22) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Left: greeting */}
      <div style={{ position: "relative", flexShrink: 0 }}>
        <p style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.38)", marginBottom: 5 }}>
          {format(new Date(), "EEEE, MMMM d")}
        </p>
        <h1 style={{
          fontSize: 26, fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.1,
          background: "linear-gradient(120deg, #ffffff 10%, #a5b4fc 90%)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
        }}>
          Good {greeting}, {firstName}
        </h1>
        {urgentCount > 0 && (
          <p style={{ fontSize: 11, fontWeight: 700, color: "#FCA5A5", marginTop: 7, display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ fontSize: 13 }}>⚡</span>
            {urgentCount} urgent {urgentCount === 1 ? "task" : "tasks"} need{urgentCount === 1 ? "s" : ""} attention
          </p>
        )}
      </div>

      {/* Right: stat chips */}
      <div style={{ position: "relative", display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
        {chips.map(({ label, key, color, glow }) => {
          const count = tasksByStatus[key] ?? 0;
          return (
            <div key={key} style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              padding: "12px 18px",
              borderRadius: 16,
              background: "rgba(255,255,255,0.05)",
              border: `1px solid rgba(255,255,255,0.09)`,
              backdropFilter: "blur(8px)",
              minWidth: 78,
            }}>
              <span style={{
                fontSize: 24, fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1,
                color, textShadow: `0 0 18px ${glow}`,
                fontVariantNumeric: "tabular-nums",
              }}>
                {count}
              </span>
              <span style={{
                fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase",
                color: "rgba(255,255,255,0.38)", marginTop: 5,
              }}>
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── 14-Day Velocity Area Chart ───────────────────────────────────────────── */
function VelocityChart({ data, prediction }: { data: { date: string; completed: number; created: number }[]; prediction?: React.ReactNode }) {
  if (!data.length) return (
    <p style={{ color: "var(--text-subtle)", fontSize: 12, textAlign: "center", padding: "40px 0" }}>No trend data yet</p>
  );
  const formatted = data.map(d => {
    const dt = new Date(d.date);
    return { ...d, day: isNaN(dt.getTime()) ? d.date : format(dt, "MMM d") };
  });
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <p style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: "0.13em", textTransform: "uppercase", color: "var(--text-subtle)" }}>
            14-Day Velocity
          </p>
          {prediction}
        </div>
        <div style={{ display: "flex", gap: 14, flexShrink: 0 }}>
          {[{ label: "Created", color: "#6366F1" }, { label: "Completed", color: "#22C55E" }].map(l => (
            <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 16, height: 2, background: l.color, borderRadius: 1, display: "inline-block" }} />
              <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={150}>
        <AreaChart data={formatted} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
          <defs>
            <linearGradient id="gCreated" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#6366F1" stopOpacity={0.22} />
              <stop offset="100%" stopColor="#6366F1" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gCompleted" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#22C55E" stopOpacity={0.22} />
              <stop offset="100%" stopColor="#22C55E" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="2 4" stroke="var(--border-subtle)" />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 9, fill: "var(--text-subtle)" }}
            tickLine={false}
            axisLine={false}
            interval={1}
          />
          <YAxis
            tick={{ fontSize: 9, fill: "var(--text-subtle)" }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip content={<ChartTip />} cursor={{ stroke: "var(--border-strong)", strokeWidth: 1, strokeDasharray: "3 3" }} />
          <Area
            type="monotone" dataKey="created" name="Created"
            stroke="#6366F1" strokeWidth={2} fill="url(#gCreated)" dot={false}
          />
          <Area
            type="monotone" dataKey="completed" name="Completed"
            stroke="#22C55E" strokeWidth={2} fill="url(#gCompleted)" dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Status Donut ─────────────────────────────────────────────────────────── */
function StatusDonut({ data }: { data: Record<string, number> }) {
  const entries = (["DONE", "IN_PROGRESS", "REVIEW", "TODO", "BACKLOG"] as const)
    .map(k => ({ name: k, label: STATUS_LABELS[k], value: data[k] ?? 0, color: STATUS_COLORS[k] }))
    .filter(e => e.value > 0);
  const total = entries.reduce((s, e) => s + e.value, 0);
  if (total === 0) return (
    <p style={{ color: "var(--text-subtle)", fontSize: 12, textAlign: "center", padding: "40px 0" }}>No tasks yet</p>
  );

  return (
    <div>
      <p style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: "0.13em", textTransform: "uppercase", color: "var(--text-subtle)", marginBottom: 14 }}>
        Status Mix
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div style={{ position: "relative", flexShrink: 0 }}>
          <PieChart width={110} height={110}>
            <Pie
              data={entries} cx={51} cy={51}
              innerRadius={34} outerRadius={52}
              paddingAngle={2} dataKey="value"
              startAngle={90} endAngle={-270}
            >
              {entries.map((e, i) => <Cell key={i} fill={e.color} />)}
            </Pie>
            <Tooltip content={<ChartTip />} />
          </PieChart>
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            pointerEvents: "none",
          }}>
            <span style={{ fontSize: 20, fontWeight: 900, color: "var(--text-foreground)", letterSpacing: "-0.03em", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
              {total}
            </span>
            <span style={{ fontSize: 8, fontWeight: 700, color: "var(--text-subtle)", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 2 }}>
              tasks
            </span>
          </div>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
          {entries.map((e, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ width: 6, height: 6, borderRadius: 2, background: e.color, flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: "var(--text-muted)", flex: 1, whiteSpace: "nowrap" }}>{e.label}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-foreground)", fontVariantNumeric: "tabular-nums" }}>{e.value}</span>
              <span style={{ fontSize: 9.5, color: "var(--text-subtle)", width: 28, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                {Math.round((e.value / total) * 100)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Priority Distribution ────────────────────────────────────────────────── */
function PriorityBars({ data }: { data: Record<string, number> }) {
  const entries = [
    { label: "Urgent", value: data.URGENT ?? 0, color: "#EF4444" },
    { label: "High",   value: data.HIGH   ?? 0, color: "#F59E0B" },
    { label: "Medium", value: data.MEDIUM  ?? 0, color: "#60A5FA" },
    { label: "Low",    value: data.LOW    ?? 0, color: "#94A3B8" },
  ];
  const max   = Math.max(...entries.map(e => e.value), 1);
  const total = entries.reduce((s, e) => s + e.value, 0);

  return (
    <div>
      <p style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: "0.13em", textTransform: "uppercase", color: "var(--text-subtle)", marginBottom: 14 }}>
        Priority Split · {total} tasks
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
        {entries.map((e, i) => (
          <div key={i}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
              <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>{e.label}</span>
              <div style={{ display: "flex", gap: 6, alignItems: "baseline" }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: e.value > 0 ? e.color : "var(--text-subtle)", fontVariantNumeric: "tabular-nums" }}>{e.value}</span>
                {total > 0 && (
                  <span style={{ fontSize: 9.5, color: "var(--text-subtle)", fontVariantNumeric: "tabular-nums" }}>
                    {Math.round((e.value / total) * 100)}%
                  </span>
                )}
              </div>
            </div>
            <div style={{ height: 5, background: "var(--bg-elevated)", borderRadius: 3, overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${(e.value / max) * 100}%`,
                background: e.color,
                borderRadius: 3,
                transition: "width 0.9s cubic-bezier(0.4,0,0.2,1)",
                opacity: e.value === 0 ? 0.15 : 1,
              }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Team Activity Chart ──────────────────────────────────────────────────── */
function TeamBars({ data }: { data: { name: string; tasks: number }[] }) {
  const sorted = [...data].sort((a, b) => b.tasks - a.tasks).slice(0, 7);
  if (!sorted.length) return (
    <p style={{ color: "var(--text-subtle)", fontSize: 12, textAlign: "center", padding: "40px 0" }}>No team data</p>
  );

  return (
    <div>
      <p style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: "0.13em", textTransform: "uppercase", color: "var(--text-subtle)", marginBottom: 14 }}>
        Team Activity
      </p>
      <ResponsiveContainer width="100%" height={Math.max(sorted.length * 32, 80)}>
        <BarChart layout="vertical" data={sorted} margin={{ top: 0, right: 24, bottom: 0, left: 4 }}>
          <XAxis type="number" tick={{ fontSize: 9, fill: "var(--text-subtle)" }} tickLine={false} axisLine={false} allowDecimals={false} />
          <YAxis
            type="category" dataKey="name"
            tick={{ fontSize: 11, fill: "var(--text-muted)", fontWeight: 600 }}
            tickLine={false} axisLine={false}
            width={64}
          />
          <Tooltip content={<ChartTip />} cursor={{ fill: "rgba(99,102,241,0.05)" }} />
          <Bar dataKey="tasks" name="Tasks" fill="#6366F1" radius={[0, 4, 4, 0]} maxBarSize={10} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Project Health Roadmap ───────────────────────────────────────────────── */
function ProjectRoadmap({
  health,
  projects,
}: {
  health: { name: string; score: number; color: string }[];
  projects: Project[];
}) {
  const rows = health
    .map(h => {
      const proj = projects.find(p => p.name === h.name);
      return { ...h, tasks: proj?._count?.tasks ?? 0, deadline: proj?.deadline ?? null };
    })
    .filter(r => r.tasks > 0 || r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  if (!rows.length) return null;

  return (
    <section>
      <Label text="Project roadmap" className="mb-3" />
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 20, overflow: "hidden" }}>
        {rows.map((r, i) => {
          const hc = r.score >= 80 ? "#22C55E" : r.score >= 55 ? "#F59E0B" : r.score > 0 ? "#EF4444" : "#6B7280";
          const dlMs = r.deadline ? new Date(r.deadline).getTime() : NaN;
          const daysLeft = !isNaN(dlMs) ? Math.ceil((dlMs - Date.now()) / 86400000) : null;
          return (
            <div key={i} style={{ padding: "13px 18px", borderTop: i === 0 ? "none" : "1px solid var(--border-subtle)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 7 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: r.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-foreground)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {r.name}
                </span>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                  {daysLeft !== null && (
                    <span style={{
                      fontSize: 9.5, fontWeight: 800, letterSpacing: "0.04em",
                      padding: "3px 7px", borderRadius: 6,
                      // Solid badges for guaranteed contrast in both themes
                      ...(daysLeft <= 0
                        ? { background: "#EF4444", color: "#fff" }
                        : daysLeft <= 7
                          ? { background: "rgba(245,158,11,0.15)", color: "#92400E" }
                          : { background: "var(--bg-elevated)", color: "var(--text-muted)", border: "1px solid var(--border)" }
                      ),
                    }}>
                      {daysLeft <= 0 ? "OVERDUE" : `${daysLeft}d left`}
                    </span>
                  )}
                  <span style={{ fontSize: 9.5, color: "var(--text-muted)" }}>{r.tasks} tasks</span>
                  <span style={{ fontSize: 11.5, fontWeight: 800, color: hc, minWidth: 24, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                    {r.score > 0 ? Math.round(r.score) : "—"}
                  </span>
                </div>
              </div>
              <div style={{ height: 4, background: "var(--bg-elevated)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  width: `${Math.min(100, r.score)}%`,
                  background: hc,
                  borderRadius: 2,
                  transition: "width 1.1s cubic-bezier(0.4,0,0.2,1)",
                }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  LAYOUT ATOMS                                                               */
/* ═══════════════════════════════════════════════════════════════════════════ */

/* ── Signal Bar ───────────────────────────────────────────────────────────── */
function SignalBar({ projects }: { projects: Project[] }) {
  if (!projects.length) return null;
  const total = projects.reduce((s, p) => s + Math.max(p._count?.tasks ?? 1, 1), 0);
  return (
    <div className="mb-1.5">
      <div className="flex items-stretch h-[3px] gap-[3px] overflow-hidden rounded-full">
        {projects.map((p) => {
          const weight = Math.max(p._count?.tasks ?? 1, 1) / total;
          return (
            <Link key={p.id} href={`/projects/${p.id}/board`} title={p.name}
              className="h-full rounded-full transition-all duration-300 hover:opacity-70"
              style={{ flex: `${weight} 0 0`, minWidth: 12, background: p.color }}
            />
          );
        })}
      </div>
      <div className="flex items-center gap-4 mt-2 flex-wrap">
        {projects.slice(0, 6).map(p => (
          <Link key={p.id} href={`/projects/${p.id}/board`}
            className="flex items-center gap-1.5 hover:opacity-60 transition-opacity">
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

/* ── Section header ───────────────────────────────────────────────────────── */
function Label({ text, count, danger, className }: { text: string; count?: number; danger?: boolean; className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <span className="text-[9.5px] font-black uppercase tracking-[0.14em]"
        style={{ color: danger ? "#EF4444" : "var(--text-subtle)" }}>
        {text}
      </span>
      {count !== undefined && count > 0 && (
        <span className="text-[9px] font-black px-[5px] py-px rounded-sm tabular-nums"
          style={{ background: danger ? "rgba(239,68,68,0.10)" : "var(--bg-elevated)", color: danger ? "#EF4444" : "var(--text-muted)" }}>
          {count}
        </span>
      )}
    </div>
  );
}

/* ── Divider ──────────────────────────────────────────────────────────────── */
function Divider() {
  return <div style={{ height: "0.5px", background: "var(--border-subtle)" }} />;
}

/* ── Action row ───────────────────────────────────────────────────────────── */
function ActionRow({ task, index }: { task: TaskWithProject; index: number }) {
  const isOverdue = !!(task.dueDate && isPast(new Date(task.dueDate)) && task.status !== "DONE");
  const pri       = PRI[task.priority] ?? PRI.MEDIUM;
  const railColor = isOverdue ? "#EF4444" : pri.color;
  const daysLate  = isOverdue && task.dueDate ? differenceInDays(new Date(), new Date(task.dueDate)) : 0;

  return (
    <div
      className="flex items-center gap-4 px-4 py-3.5 cursor-pointer transition-colors"
      style={{ borderTop: index === 0 ? "none" : "1px solid var(--border-subtle)" }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-card-hover)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ""; }}
    >
      <div className="w-[2.5px] self-stretch rounded-full shrink-0" style={{ background: railColor }} />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold leading-snug truncate" style={{ color: "var(--text-foreground)" }}>
          {task.title}
        </p>
        {task.project && (
          <p className="text-[10px] mt-0.5 truncate" style={{ color: "var(--text-subtle)" }}>
            {task.project.name}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-[8.5px] font-black px-1.5 py-0.5 rounded"
          style={{ background: `${railColor}12`, color: railColor, letterSpacing: "0.06em" }}>
          {pri.label}
        </span>
        {isOverdue && daysLate > 0 && (
          <span className="text-[8.5px] font-black px-1.5 py-0.5 rounded"
            style={{ background: "rgba(239,68,68,0.08)", color: "#EF4444", letterSpacing: "0.06em" }}>
            {daysLate}D LATE
          </span>
        )}
        {task.dueDate && !isOverdue && (() => { const dt = new Date(task.dueDate!); return isNaN(dt.getTime()) ? null : (
          <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
            {format(dt, "MMM d")}
          </span>
        ); })()}
      </div>
    </div>
  );
}

/* ── Relative time ────────────────────────────────────────────────────────── */
function relTime(dateStr: string): string {
  const ts = new Date(dateStr).getTime();
  const diff  = isNaN(ts) ? 0 : Date.now() - ts;
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/* ── Status verb ──────────────────────────────────────────────────────────── */
function statusVerb(s: string): string {
  if (s === "DONE")        return "completed";
  if (s === "REVIEW")      return "sent to review";
  if (s === "IN_PROGRESS") return "started";
  if (s === "BACKLOG")     return "moved to backlog";
  return "updated";
}

/* ── Activity row ─────────────────────────────────────────────────────────── */
function ActivityRow({ task, index }: { task: TaskWithProject; index: number }) {
  const actor = task.assignee?.name ?? "Someone";
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 transition-colors cursor-pointer"
      style={{ borderTop: index === 0 ? "none" : "1px solid var(--border-subtle)" }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-card-hover)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ""; }}
    >
      <div
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ background: (task.project as { color?: string } | undefined)?.color ?? "var(--accent)" }}
      />
      <p className="flex-1 text-[12.5px] truncate" style={{ color: "var(--text-foreground)" }}>
        <span className="font-semibold" style={{ color: "var(--text-subtle)" }}>{actor.split(" ")[0]}</span>
        {" "}
        <span style={{ color: "var(--text-muted)" }}>{statusVerb(task.status)}</span>
        {" "}
        <span>{task.title}</span>
      </p>
      <span className="text-[10px] shrink-0 tabular-nums" style={{ color: "var(--text-subtle)" }}>
        {relTime(task.updatedAt)}
      </span>
    </div>
  );
}

/* ── Risk row ─────────────────────────────────────────────────────────────── */
function RiskRow({ alert, index }: { alert: { severity: string; title: string; detail: string }; index: number }) {
  const isCritical = alert.severity === "critical";
  return (
    <div
      className="flex items-start gap-3 px-4 py-3"
      style={{ borderTop: index === 0 ? "none" : "1px solid var(--border-subtle)" }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5"
        style={{ background: isCritical ? "#EF4444" : "#F59E0B" }} />
      <div className="flex-1 min-w-0">
        <p className="text-[12.5px] font-semibold leading-snug" style={{ color: "var(--text-foreground)" }}>
          {alert.title}
        </p>
        <p className="text-[11px] mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>
          {alert.detail}
        </p>
      </div>
    </div>
  );
}

/* ── Quick action ─────────────────────────────────────────────────────────── */
function Action({ href, label, glyph, onClick }: { href?: string; label: string; glyph: string; onClick?: () => void }) {
  const inner = (
    <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl cursor-pointer"
      style={{ border: "1px solid var(--border)", background: "var(--bg-card)" }}
      onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.background = "var(--bg-card-hover)"; el.style.borderColor = "var(--border-strong)"; }}
      onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.background = "var(--bg-card)"; el.style.borderColor = "var(--border)"; }}
    >
      <span className="text-[15px] shrink-0 leading-none" style={{ color: "var(--accent)" }}>{glyph}</span>
      <span className="text-[12.5px] font-medium" style={{ color: "var(--text-foreground)" }}>{label}</span>
    </div>
  );
  if (onClick) return <div onClick={onClick}>{inner}</div>;
  return <Link href={href ?? "#"}>{inner}</Link>;
}

/* ── AI Brief ─────────────────────────────────────────────────────────────── */
function AiBrief({ text, loading }: { text: string; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-2.5">
        {[80, 95, 72, 88].map((w, i) => (
          <div key={i} className="h-[13px] rounded animate-pulse" style={{ width: `${w}%`, background: "var(--bg-elevated)" }} />
        ))}
      </div>
    );
  }
  if (!text) return <p className="text-[12.5px]" style={{ color: "var(--text-subtle)" }}>Generating your brief…</p>;

  const lines = text.split("\n").map(l => l.replace(/^[•·\-]\s*/, "").replace(/\*\*/g, "").trim()).filter(Boolean);
  return (
    <div className="space-y-2.5">
      {lines.map((line, i) => (
        <div key={i} className="flex items-start gap-2.5">
          <span className="mt-[5px] w-[4px] h-[4px] rounded-full shrink-0" style={{ background: "var(--accent)", opacity: 0.6 }} />
          <p className="text-[12.5px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>{line}</p>
        </div>
      ))}
    </div>
  );
}

/* ── Next action hero ─────────────────────────────────────────────────────── */
function NextActionCard({ task, urgentCount }: { task: TaskWithProject; urgentCount: number }) {
  const isOv      = !!(task.dueDate && isPast(new Date(task.dueDate)) && task.status !== "DONE");
  const pri       = PRI[task.priority] ?? PRI.MEDIUM;
  const railColor = isOv ? "#EF4444" : pri.color;
  const daysLate  = isOv && task.dueDate ? differenceInDays(new Date(), new Date(task.dueDate)) : 0;
  const overdueLabel = daysLate === 0 ? "due today" : `${daysLate}d overdue`;

  return (
    <section>
      <Label text="Your next action" className="mb-3" />
      <div className="rounded-2xl p-5" style={{
        border: `1px solid ${railColor}30`,
        background: "var(--bg-card)",
        boxShadow: `inset 3px 0 0 ${railColor}`,
      }}>
        <p className="text-[16px] font-black leading-tight tracking-[-0.02em] mb-1.5"
          style={{ color: "var(--text-foreground)" }}>
          {task.title}
        </p>
        {task.project && (
          <p className="text-[11px] mb-3" style={{ color: "var(--text-muted)" }}>
            {task.project.name}
            {isOv && (
              <span className="ml-2 font-bold" style={{ color: "#EF4444" }}>· {overdueLabel}</span>
            )}
          </p>
        )}
        <p className="text-[12px] leading-relaxed mb-4" style={{ color: "var(--text-subtle)" }}>
          {isOv
            ? "This task is overdue and may be blocking your sprint. Complete or reassign it to unblock your team."
            : urgentCount > 0
            ? "Highest priority item on your board. Your team is watching."
            : "Top item in your current sprint. Completing it keeps your project on track."}
        </p>
        <div className="flex items-center gap-2">
          {task.project && (
            <a href={`/projects/${task.project.id}/board`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold text-white transition-opacity hover:opacity-80"
              style={{ background: railColor }}>
              Open task →
            </a>
          )}
          <span className="px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase"
            style={{ background: `${railColor}12`, color: railColor, letterSpacing: "0.08em" }}>
            {pri.label}
          </span>
        </div>
      </div>
    </section>
  );
}

/* ── Your Day Panel ─────────────────────────────────────────────────────── */
function YourDayPanel({ tasks }: { tasks: TaskWithProject[] }) {
  const active = tasks.filter(t => t.status !== "DONE" && t.status !== "ARCHIVED");
  if (!active.length) return null;
  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 20, padding: "18px 22px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <p style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: "0.13em", textTransform: "uppercase", color: "var(--text-subtle)" }}>Your Day</p>
          <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
            {active.length} task{active.length !== 1 ? "s" : ""} on your plate
          </p>
        </div>
        <Link href="/tasks" style={{ fontSize: 9.5, fontWeight: 700, color: "var(--accent)", textDecoration: "none" }}>View all →</Link>
      </div>
      <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }} className="no-scrollbar">
        {active.slice(0, 7).map(task => {
          const pri = PRI[task.priority] ?? PRI.MEDIUM;
          const isOv = !!(task.dueDate && isPast(new Date(task.dueDate)));
          const color = isOv ? "#EF4444" : pri.color;
          return (
            <Link key={task.id} href={task.project ? `/projects/${task.project.id}/board` : "/tasks"}
              style={{
                display: "flex", flexDirection: "column", gap: 8,
                minWidth: 168, maxWidth: 200, flexShrink: 0,
                padding: "13px 14px", borderRadius: 16,
                background: "var(--bg-elevated)",
                border: `1.5px solid ${isOv ? "rgba(239,68,68,0.22)" : "var(--border)"}`,
                textDecoration: "none",
                transition: "transform 0.15s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{
                  fontSize: 8.5, fontWeight: 800, letterSpacing: "0.07em", textTransform: "uppercase",
                  padding: "2.5px 7px", borderRadius: 100,
                  ...priBadgeStyle(pri, isOv),
                }}>
                  {isOv ? "OVERDUE" : pri.label}
                </span>
                {task.priority === "URGENT" && <span style={{ fontSize: 12 }}>🔥</span>}
              </div>
              <p style={{ fontSize: 12.5, fontWeight: 700, lineHeight: 1.35, color: "var(--text-foreground)" }}>
                {task.title.length > 42 ? task.title.slice(0, 40) + "…" : task.title}
              </p>
              {task.project && (
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: task.project.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 10, color: "var(--text-subtle)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {task.project.name}
                  </span>
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/* ── Wins Wall ───────────────────────────────────────────────────────────── */
function WinsWall({ tasks }: { tasks: TaskWithProject[] }) {
  if (!tasks.length) return null;
  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid rgba(34,197,94,0.22)", borderRadius: 18, padding: "14px 20px" }}>
      <p style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: "0.13em", textTransform: "uppercase", color: "#22C55E", marginBottom: 10 }}>
        🏆 Completed today · {tasks.length}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {tasks.slice(0, 10).map(task => (
          <div key={task.id} style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "4px 10px 4px 7px", borderRadius: 100,
            background: "rgba(34,197,94,0.09)", border: "1px solid rgba(34,197,94,0.18)",
          }}>
            <span style={{ fontSize: 10, color: "#22C55E", fontWeight: 900 }}>✓</span>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--text-foreground)" }}>
              {task.title.length > 32 ? task.title.slice(0, 30) + "…" : task.title}
            </span>
            {(task.assignee as { name?: string } | undefined)?.name && (
              <span style={{ fontSize: 9.5, color: "var(--text-subtle)" }}>
                · {((task.assignee as { name?: string }).name ?? "").split(" ")[0]}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Standup Block ───────────────────────────────────────────────────────── */
function StandupBlock({ text, loading, onGenerate }: { text: string; loading: boolean; onGenerate: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };
  return (
    <section>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <Label text="Daily Standup · AI" />
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {text && !loading && (
            <button onClick={copy}
              style={{ fontSize: 9.5, fontWeight: 700, color: copied ? "#22C55E" : "var(--text-subtle)", background: "none", border: "none", cursor: "pointer", transition: "color 0.2s" }}>
              {copied ? "✓ Copied" : "Copy"}
            </button>
          )}
          <button onClick={onGenerate} disabled={loading}
            style={{
              fontSize: 10, fontWeight: 800, letterSpacing: "0.04em",
              padding: "4px 10px", borderRadius: 8,
              background: "var(--accent-muted)", color: "var(--accent)",
              border: "1px solid var(--accent-glow)",
              cursor: loading ? "wait" : "pointer", opacity: loading ? 0.6 : 1,
            }}>
            {loading ? "Generating…" : text ? "↺ Regenerate" : "✨ Generate"}
          </button>
        </div>
      </div>
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 20, padding: "16px 20px" }}>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[80, 65, 48].map((w, i) => (
              <div key={i} className="animate-pulse"
                style={{ height: 11, borderRadius: 4, background: "var(--bg-elevated)", width: `${w}%` }} />
            ))}
          </div>
        ) : text ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {text.split("\n").filter(l => l.trim()).map((line, i) => {
              const clean = line.replace(/\*\*/g, "").trim();
              const match = clean.match(/^(Yesterday|Today|Blockers):\s*(.*)/i);
              if (match) return (
                <div key={i} style={{ marginTop: i > 0 ? 10 : 0 }}>
                  <p style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-subtle)", marginBottom: 3 }}>
                    {match[1]}
                  </p>
                  <p style={{ fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.55 }}>{match[2]}</p>
                </div>
              );
              return (
                <p key={i} style={{ fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.55 }}>
                  {clean.replace(/^[•·\-]\s*/, "")}
                </p>
              );
            })}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "14px 0" }}>
            <div style={{ fontSize: 28, lineHeight: 1 }}>🎙️</div>
            <p style={{ fontSize: 12, color: "var(--text-subtle)", textAlign: "center", maxWidth: 240 }}>
              AI reads your tasks and writes your standup in seconds
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

/* ── Burndown Chart ──────────────────────────────────────────────────────── */
function BurndownChart({ data }: { data: { day: string; remaining: number; ideal: number }[] }) {
  if (!data.length) return (
    <p style={{ color: "var(--text-subtle)", fontSize: 12, textAlign: "center", padding: "40px 0" }}>No data yet</p>
  );
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 14 }}>
        <p style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: "0.13em", textTransform: "uppercase", color: "var(--text-subtle)" }}>
          Task Burndown
        </p>
        <div style={{ display: "flex", gap: 14 }}>
          {[{ label: "Remaining", color: "#F59E0B" }, { label: "Ideal", color: "#6B7280" }].map(l => (
            <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 16, height: 2, background: l.color, borderRadius: 1, display: "inline-block", opacity: l.label === "Ideal" ? 0.45 : 1 }} />
              <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={150}>
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
          <defs>
            <linearGradient id="gRemaining" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#F59E0B" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="2 4" stroke="var(--border-subtle)" />
          <XAxis dataKey="day" tick={{ fontSize: 9, fill: "var(--text-subtle)" }} tickLine={false} axisLine={false} interval={1} />
          <YAxis tick={{ fontSize: 9, fill: "var(--text-subtle)" }} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip content={<ChartTip />} cursor={{ stroke: "var(--border-strong)", strokeWidth: 1, strokeDasharray: "3 3" }} />
          <Area type="monotone" dataKey="remaining" name="Remaining" stroke="#F59E0B" strokeWidth={2} fill="url(#gRemaining)" dot={false} />
          <Area type="monotone" dataKey="ideal" name="Ideal" stroke="#6B7280" strokeWidth={1.5} strokeDasharray="4 3" fill="none" dot={false} opacity={0.5} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Team Pulse ──────────────────────────────────────────────────────────── */
function TeamPulse({ data }: { data: { name: string; tasks: number }[] }) {
  if (!data.length) return null;
  const sorted   = [...data].sort((a, b) => b.tasks - a.tasks);
  const maxTasks = Math.max(...sorted.map(d => d.tasks), 1);
  const AVATAR_COLORS = ["#6366F1","#818CF8","#60A5FA","#34D399","#FBBF24","#F87171","#A78BFA","#F472B6"];

  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 20, padding: "20px 24px" }}>
      <p style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: "0.13em", textTransform: "uppercase", color: "var(--text-subtle)", marginBottom: 16 }}>
        Team Pulse · {sorted.length} members
      </p>
      <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }} className="no-scrollbar">
        {sorted.map((member, i) => {
          const pct   = Math.round((member.tasks / maxTasks) * 100);
          const inits = member.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
          const color = AVATAR_COLORS[i % AVATAR_COLORS.length];
          const load  = member.tasks >= 10 ? "high" : member.tasks >= 5 ? "medium" : "low";
          // bar stroke color + accessible badge: dark text on light tint (WCAG AA ≥ 4.5:1)
          const lc    = load === "high" ? "#EF4444" : load === "medium" ? "#F59E0B" : "#22C55E";
          const badgeBg   = load === "high" ? "rgba(239,68,68,0.14)"  : load === "medium" ? "rgba(245,158,11,0.14)" : "rgba(34,197,94,0.14)";
          const badgeTxt  = load === "high" ? "#B91C1C"               : load === "medium" ? "#92400E"               : "#166534";
          return (
            <div key={member.name} style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
              minWidth: 80, padding: "12px 10px", borderRadius: 16,
              background: "var(--bg-elevated)", flexShrink: 0,
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: `${color}20`, border: `2px solid ${color}44`,
                fontSize: 12, fontWeight: 900, color,
              }}>
                {inits}
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-foreground)", whiteSpace: "nowrap" }}>
                  {member.name.split(" ")[0]}
                </p>
                <p style={{ fontSize: 20, fontWeight: 900, color: "var(--text-foreground)", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.03em", lineHeight: 1.2 }}>
                  {member.tasks}
                </p>
                <p style={{ fontSize: 8.5, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>tasks</p>
              </div>
              <div style={{
                height: 3, width: "100%", background: "var(--bg-card)", borderRadius: 2, overflow: "hidden",
              }}>
                <div style={{ height: "100%", width: `${pct}%`, background: lc, borderRadius: 2, transition: "width 0.8s" }} />
              </div>
              <span style={{
                fontSize: 9, fontWeight: 800, letterSpacing: "0.07em", textTransform: "uppercase",
                padding: "3px 7px", borderRadius: 100, background: badgeBg, color: badgeTxt,
              }}>
                {load}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Project Health Matrix ───────────────────────────────────────────────── */
function HealthMatrix({ health, projects }: {
  health: { name: string; score: number; color: string }[];
  projects: Project[];
}) {
  const rows = health
    .map(h => {
      const proj = projects.find(p => p.name === h.name);
      const tasks = proj?._count?.tasks ?? 0;
      const pct   = Math.min(100, Math.max(0, h.score));
      const hc    = pct >= 80 ? "#22C55E" : pct >= 55 ? "#F59E0B" : pct > 0 ? "#EF4444" : "#6B7280";
      return { ...h, tasks, pct, hc, projId: proj?.id };
    })
    .filter(r => r.tasks > 0 || r.score > 0)
    .sort((a, b) => b.pct - a.pct);

  if (!rows.length) return null;

  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 20, padding: "20px 24px" }}>
      <p style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: "0.13em", textTransform: "uppercase", color: "var(--text-subtle)", marginBottom: 14 }}>
        Project Health Matrix
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {rows.slice(0, 6).map((r, i) => (
          <div key={i}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: r.color, flexShrink: 0, boxShadow: `0 0 5px ${r.color}` }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-foreground)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {r.name}
              </span>
              <span style={{ fontSize: 10, color: "var(--text-subtle)", flexShrink: 0 }}>{r.tasks} tasks</span>
              <span style={{
                fontSize: 11, fontWeight: 900, color: r.hc, minWidth: 32, textAlign: "right",
                fontVariantNumeric: "tabular-nums",
              }}>
                {r.pct > 0 ? `${Math.round(r.pct)}` : "—"}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ flex: 1, height: 5, background: "var(--bg-elevated)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{
                  height: "100%", width: `${r.pct}%`, background: r.hc,
                  borderRadius: 3, transition: "width 1s cubic-bezier(0.4,0,0.2,1)",
                }} />
              </div>
              <span style={{
                fontSize: 8, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase",
                color: r.hc, minWidth: 32, textAlign: "right",
              }}>
                {r.pct >= 80 ? "good" : r.pct >= 55 ? "risk" : r.pct > 0 ? "critical" : "—"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Quick Wins Panel ────────────────────────────────────────────────────── */
function QuickWinsPanel({ tasks }: { tasks: TaskWithProject[] }) {
  if (!tasks.length) return null;
  return (
    <section>
      <Label text="Quick Wins" count={tasks.length} className="mb-3" />
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 18, overflow: "hidden" }}>
        {tasks.slice(0, 5).map((task, i) => {
          const pri = PRI[task.priority] ?? PRI.MEDIUM;
          return (
            <div key={task.id} style={{
              display: "flex", alignItems: "center", gap: 9,
              padding: "10px 14px",
              borderTop: i === 0 ? "none" : "1px solid var(--border-subtle)",
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: pri.color, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 11.5, fontWeight: 600, color: "var(--text-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {task.title}
                </p>
                {task.project && (
                  <p style={{ fontSize: 9.5, color: "var(--text-subtle)", marginTop: 1 }}>{task.project.name}</p>
                )}
              </div>
              <span style={{
                fontSize: 8.5, fontWeight: 800, padding: "2px 6px", borderRadius: 4,
                letterSpacing: "0.06em", flexShrink: 0,
                ...priBadgeStyle(pri),
              }}>
                {pri.label}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ── Velocity Prediction ─────────────────────────────────────────────────── */
function VelocityPrediction({ data, totalTasks }: { data: { completed: number; created: number }[]; totalTasks: number }) {
  if (data.length < 7) return null;
  const recent      = data.slice(-7);
  const avgCompleted = recent.reduce((s, r) => s + r.completed, 0) / 7;
  const avgCreated   = recent.reduce((s, r) => s + r.created, 0) / 7;
  const netPerDay    = avgCompleted - avgCreated;
  if (netPerDay <= 0) return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 100, background: "rgba(239,68,68,0.1)", color: "#EF4444" }}>
      Adding tasks faster than closing
    </span>
  );
  const daysToEmpty = Math.ceil(totalTasks / netPerDay);
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 100, background: "rgba(34,197,94,0.1)", color: "#22C55E" }}>
      At pace: ~{daysToEmpty}d to clear backlog
    </span>
  );
}

/* ── Risk Detector ───────────────────────────────────────────────────────── */
function RiskDetector({ projects, tasks }: {
  projects: Project[];
  tasks: TaskWithProject[];
}) {
  const risks: { level: "critical" | "warn"; title: string; detail: string }[] = [];

  // Projects with no activity (0 tasks moved to done recently)
  const stalePjs = projects.filter(p => (p._count?.tasks ?? 0) === 0);
  if (stalePjs.length > 0) {
    risks.push({ level: "warn", title: `${stalePjs.length} project${stalePjs.length > 1 ? "s" : ""} with no tasks`, detail: stalePjs.map(p => p.name).slice(0, 2).join(", ") });
  }

  // Overdue high-priority tasks
  const overdueHigh = tasks.filter(t =>
    t.dueDate && isPast(new Date(t.dueDate)) && (t.priority === "URGENT" || t.priority === "HIGH") && t.status !== "DONE"
  );
  if (overdueHigh.length > 0) {
    risks.push({ level: "critical", title: `${overdueHigh.length} overdue high-priority task${overdueHigh.length > 1 ? "s" : ""}`, detail: overdueHigh.map(t => t.title).slice(0, 2).join(" · ") });
  }

  if (!risks.length) return null;

  return (
    <section>
      <Label text="Risk Detector" count={risks.length} danger className="mb-3" />
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 18, overflow: "hidden" }}>
        {risks.map((r, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "flex-start", gap: 10, padding: "11px 14px",
            borderTop: i === 0 ? "none" : "1px solid var(--border-subtle)",
            background: r.level === "critical" ? "rgba(239,68,68,0.03)" : undefined,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0, marginTop: 4,
              background: r.level === "critical" ? "#EF4444" : "#F59E0B",
              boxShadow: `0 0 6px ${r.level === "critical" ? "#EF444460" : "#F59E0B60"}`,
            }} />
            <div>
              <p style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-foreground)", lineHeight: 1.3 }}>{r.title}</p>
              <p style={{ fontSize: 10.5, color: "var(--text-muted)", marginTop: 2 }}>{r.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  PAGE                                                                       */
/* ═══════════════════════════════════════════════════════════════════════════ */

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
  const [standupText,    setStandupText]    = useState("");
  const [standupLoading, setStandupLoading] = useState(false);

  const generating        = useRef(false);
  const standupGenerating = useRef(false);

  useEffect(() => {
    if (!localStorage.getItem("colliq_onboarded")) setShowOnboarding(true);
  }, []);

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
        const cached = localStorage.getItem(BRIEFING_KEY);
        if (cached) {
          const { text, ts } = JSON.parse(cached);
          if (Date.now() - ts < BRIEFING_TTL && text) { setBriefText(text); return; }
        }
      } catch {}
    }
    generating.current = true;
    setBriefLoading(true);
    setBriefText("");
    const d = analyticsData;
    const prompt = `You are Colliq. Write exactly 4 crisp bullets (• symbol, ≤14 words each). Cover: top risk, quick win, team insight, one recommendation. Data: ${d.activeProjects} projects, ${d.totalTasks} tasks, ${d.completedTasks} done (${d.completionRate}%), ${d.overdueTasks} overdue. Be specific, no filler.`;
    const result = await ask("/api/ai/assistant", { messages: [{ role: "user", content: prompt }] });
    const text   = result && !result.includes("[Error:") ? result : "AI brief temporarily unavailable.";
    setBriefText(text);
    try { localStorage.setItem(BRIEFING_KEY, JSON.stringify({ text, ts: Date.now() })); } catch {}
    setBriefLoading(false);
    generating.current = false;
  }, [analyticsData, ask]);

  useEffect(() => {
    if (analyticsData && !generating.current) generateBrief();
  }, [analyticsData, generateBrief]);

  const generateStandup = useCallback(async () => {
    if (standupGenerating.current || !analyticsData) return;
    standupGenerating.current = true;
    setStandupLoading(true);
    setStandupText("");
    const d      = analyticsData;
    const myWork = upcomingToday.filter(t => t.status !== "DONE").slice(0, 5);
    const doneTasks = upcomingToday.filter(t => t.status === "DONE").slice(0, 3);
    const prompt = `Write a professional daily standup update. Use exactly this format with these three labels:
Yesterday: [1-2 sentences about completed work]
Today: [1-2 sentences about planned work]
Blockers: [blockers or "None"]

Context: ${doneTasks.length > 0 ? "Completed: " + doneTasks.map(t => t.title).join(", ") + "." : ""} ${myWork.length > 0 ? "Working on: " + myWork.map(t => `${t.title} (${t.priority})`).join(", ") + "." : ""} ${d.overdueTasks > 0 ? `${d.overdueTasks} tasks overdue.` : ""} Keep it concise and professional, under 60 words total.`;
    const result = await ask("/api/ai/assistant", { messages: [{ role: "user", content: prompt }] });
    const text   = result && !result.includes("[Error:") ? result : "Failed to generate standup. Please try again.";
    setStandupText(text);
    setStandupLoading(false);
    standupGenerating.current = false;
  }, [analyticsData, upcomingToday, ask]);

  /* Trend deltas — split 14-day taskTrend into two 7-day halves */
  const trendDeltas = (() => {
    const trend = analyticsData?.taskTrend ?? [];
    if (trend.length < 2) return { projects: 0, tasks: 0, rate: 0, overdue: 0 };
    const half = Math.floor(trend.length / 2);
    const prev = trend.slice(0, half);
    const curr = trend.slice(half);
    const safeRate = (a: number, b: number) => b > 0 ? Math.round(((a - b) / b) * 100) : 0;
    const sumCompleted = (arr: typeof trend) => arr.reduce((s, r) => s + r.completed, 0);
    const sumCreated   = (arr: typeof trend) => arr.reduce((s, r) => s + r.created, 0);
    const cCurr = sumCompleted(curr), cPrev = sumCompleted(prev);
    const tCurr = sumCreated(curr),   tPrev = sumCreated(prev);
    const rateCurr = tCurr > 0 ? Math.round((cCurr / tCurr) * 100) : 0;
    const ratePrev = tPrev > 0 ? Math.round((cPrev / tPrev) * 100) : 0;
    const clamp = (v: number) => Math.max(-99, Math.min(99, v));
    return {
      projects: clamp(safeRate(analyticsData?.activeProjects ?? 0, analyticsData?.totalProjects ?? 1)),
      tasks:    tPrev > 0 ? clamp(safeRate(tCurr, tPrev)) : 0,
      rate:     clamp(rateCurr - ratePrev),
      overdue:  0,
    };
  })();

  /* Wins today — recentTasks that are DONE */
  const winsToday: TaskWithProject[] = analyticsData
    ? ((analyticsData.recentTasks ?? []) as TaskWithProject[]).filter(t => t.status === "DONE").slice(0, 10)
    : [];

  /* Burndown data from taskTrend */
  const burndownData = (() => {
    const trend = analyticsData?.taskTrend ?? [];
    if (!trend.length) return [];
    const totalCompleted = trend.reduce((s, r) => s + r.completed, 0);
    const idealPerDay    = totalCompleted / Math.max(trend.length - 1, 1);
    let running = totalCompleted;
    return trend.map((row, i) => {
      running = Math.max(0, running - row.completed);
      const dt = new Date(row.date);
      return {
        day:       isNaN(dt.getTime()) ? row.date : format(dt, "MMM d"),
        remaining: running,
        ideal:     Math.max(0, Math.round(totalCompleted - idealPerDay * i)),
      };
    });
  })();

  /* Derived */
  const actionFeed: TaskWithProject[] = upcomingToday
    .filter(t => t.status !== "DONE" && t.status !== "ARCHIVED")
    .sort((a, b) => {
      const aOv = !!(a.dueDate && isPast(new Date(a.dueDate)));
      const bOv = !!(b.dueDate && isPast(new Date(b.dueDate)));
      if (aOv !== bOv) return aOv ? -1 : 1;
      return (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2);
    })
    .slice(0, 7);

  const quickWins: TaskWithProject[] = actionFeed
    .filter(t => t.priority === "URGENT" || t.priority === "HIGH")
    .slice(0, 5);

  const urgentCount = actionFeed.filter(t =>
    t.priority === "URGENT" || (t.dueDate && isPast(new Date(t.dueDate)))
  ).length;

  const hour      = new Date().getHours();
  const greeting  = hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : "Evening";
  const firstName = (session?.user?.name ?? "").split(" ")[0] || "there";

  /* Skeleton */
  if (loading) {
    return (
      <div className="max-w-[1200px] mx-auto px-8 pt-8 pb-16 space-y-6 animate-pulse">
        <div className="h-[3px] rounded-full" style={{ background: "var(--bg-elevated)" }} />
        <div className="h-8 w-48 rounded-lg" style={{ background: "var(--bg-elevated)" }} />
        <div className="grid grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <div key={i} className="h-24 rounded-2xl" style={{ background: "var(--bg-elevated)" }} />)}
        </div>
        <div className="grid grid-cols-[1fr_320px] gap-4">
          <div className="h-44 rounded-2xl" style={{ background: "var(--bg-elevated)" }} />
          <div className="h-44 rounded-2xl" style={{ background: "var(--bg-elevated)" }} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-36 rounded-2xl" style={{ background: "var(--bg-elevated)" }} />
          <div className="h-36 rounded-2xl" style={{ background: "var(--bg-elevated)" }} />
        </div>
        <div className="grid grid-cols-[1fr_300px] gap-10">
          <div className="space-y-4">
            {[1,2,3,4].map(i => <div key={i} className="h-16 rounded-xl" style={{ background: "var(--bg-elevated)" }} />)}
          </div>
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-10 rounded-xl" style={{ background: "var(--bg-elevated)" }} />)}
          </div>
        </div>
      </div>
    );
  }

  if (!analyticsData) return null;
  const d = analyticsData;

  const hasTeamData     = (d.teamActivity ?? []).length > 0;
  const hasPriorityData = Object.values(d.tasksByPriority ?? {}).some(v => v > 0);
  const hasHealthData   = (d.projectHealth ?? []).length > 0;

  /* Merged risks: computed alerts + API alerts */
  const allRisks: { level: "critical" | "warn"; title: string; detail: string }[] = [];

  // Computed: overdue high-priority tasks
  const overdueHigh = upcomingToday.filter(t =>
    t.dueDate && isPast(new Date(t.dueDate)) &&
    (t.priority === "URGENT" || t.priority === "HIGH") && t.status !== "DONE"
  );
  if (overdueHigh.length > 0) {
    allRisks.push({ level: "critical", title: `${overdueHigh.length} overdue high-priority task${overdueHigh.length > 1 ? "s" : ""}`, detail: overdueHigh.map(t => t.title).slice(0, 2).join(" · ") });
  }

  // API alerts
  if (d.alerts && d.alerts.length > 0) {
    d.alerts.slice(0, 4).forEach((a: { severity: string; title: string; detail: string }) => {
      allRisks.push({ level: a.severity === "critical" ? "critical" : "warn", title: a.title, detail: a.detail });
    });
  }

  // Computed: stale projects
  const stalePjs = projects.filter(p => (p._count?.tasks ?? 0) === 0);
  if (stalePjs.length > 0) {
    allRisks.push({ level: "warn", title: `${stalePjs.length} project${stalePjs.length > 1 ? "s" : ""} with no tasks`, detail: stalePjs.map(p => p.name).slice(0, 2).join(", ") });
  }

  return (
    <>
      <NLTaskCreator open={showNLCreator} onClose={() => setShowNLCreator(false)} />
      {showOnboarding && (
        <OnboardingWizard
          onComplete={() => { localStorage.setItem("colliq_onboarded", "1"); setShowOnboarding(false); }}
        />
      )}

      <div className="max-w-[1200px] mx-auto px-8 pt-8 pb-20">

        {/* ════ SIGNAL BAR ════ */}
        <SignalBar projects={projects} />

        {/* ════ HERO STRIP ════ */}
        <div className="mt-6">
          <HeroStrip
            greeting={greeting}
            firstName={firstName}
            urgentCount={urgentCount}
            tasksByStatus={d.tasksByStatus ?? {}}
          />
        </div>

        {/* ════ KPI TILES ════ */}
        <div className="grid grid-cols-4 gap-3 mb-5">
          <KpiTile label="Active Projects" value={d.activeProjects}       sub={`${d.totalProjects} total`}           accent="#6366F1" trend={trendDeltas.projects} />
          <KpiTile label="Total Tasks"     value={d.totalTasks}           sub={`${d.activeTasks} in progress`}       accent="#60A5FA" trend={trendDeltas.tasks} />
          <KpiTile label="Completion Rate" value={`${d.completionRate}%`} sub={`${d.completedTasks} done`}           accent="#22C55E" trend={trendDeltas.rate} />
          <KpiTile label="Overdue"         value={d.overdueTasks}         sub={d.overdueTasks === 0 ? "all on track" : urgentCount > 0 ? `${urgentCount} urgent` : "needs attention"} accent={d.overdueTasks > 0 ? "#EF4444" : "#22C55E"} />
        </div>

        {/* ════ CHARTS — Row 1: Velocity + Status Donut ════ */}
        <div className="grid grid-cols-[1fr_280px] gap-4 mb-4">
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 20, padding: "20px 24px" }}>
            <VelocityChart data={d.taskTrend ?? []} prediction={<VelocityPrediction data={d.taskTrend ?? []} totalTasks={d.totalTasks} />} />
          </div>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 20, padding: "20px 20px" }}>
            <StatusDonut data={d.tasksByStatus ?? {}} />
          </div>
        </div>

        {/* ════ CHARTS — Row 2: Burndown + Priority ════ */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 20, padding: "20px 24px" }}>
            <BurndownChart data={burndownData} />
          </div>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 20, padding: "20px 24px" }}>
            {hasPriorityData
              ? <PriorityBars data={d.tasksByPriority ?? {}} />
              : <StatusDonut data={d.tasksByStatus ?? {}} />}
          </div>
        </div>

        {/* ════ TEAM PULSE — full width ════ */}
        {hasTeamData && (
          <div className="mb-5">
            <TeamPulse data={d.teamActivity ?? []} />
          </div>
        )}

        {/* ════ TODAY'S FOCUS — horizontal scrollable cards ════ */}
        {upcomingToday.filter(t => t.status !== "DONE" && t.status !== "ARCHIVED").length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <Label text="Today's Focus" count={upcomingToday.filter(t => t.status !== "DONE" && t.status !== "ARCHIVED").length} />
              <Link href="/tasks" className="text-[9.5px] font-semibold hover:opacity-60 transition-opacity" style={{ color: "var(--accent)" }}>View all →</Link>
            </div>
            <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 6 }} className="no-scrollbar">
              {upcomingToday.filter(t => t.status !== "DONE" && t.status !== "ARCHIVED").slice(0, 8).map(task => {
                const pri  = PRI[task.priority] ?? PRI.MEDIUM;
                const isOv = !!(task.dueDate && isPast(new Date(task.dueDate)));
                return (
                  <Link key={task.id} href={task.project ? `/projects/${task.project.id}/board` : "/tasks"}
                    style={{
                      display: "flex", flexDirection: "column", gap: 8,
                      minWidth: 176, maxWidth: 200, flexShrink: 0,
                      padding: "14px 15px", borderRadius: 18,
                      background: "var(--bg-card)",
                      border: `1px solid ${isOv ? "rgba(239,68,68,0.25)" : "var(--border)"}`,
                      textDecoration: "none",
                      transition: "transform 0.14s",
                      boxShadow: isOv ? "0 0 0 1px rgba(239,68,68,0.12) inset" : undefined,
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: "0.07em", textTransform: "uppercase", padding: "2.5px 7px", borderRadius: 100, ...priBadgeStyle(pri, isOv) }}>
                        {isOv ? "OVERDUE" : pri.label}
                      </span>
                      {task.priority === "URGENT" && <span style={{ fontSize: 12 }}>🔥</span>}
                    </div>
                    <p style={{ fontSize: 12.5, fontWeight: 700, lineHeight: 1.35, color: "var(--text-foreground)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {task.title}
                    </p>
                    {task.project && (
                      <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: "auto" }}>
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: task.project.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 9.5, color: "var(--text-subtle)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.project.name}</span>
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* ════ BODY — two column ════ */}
        <div className="grid grid-cols-[1fr_296px] gap-8 items-start">

          {/* ── LEFT ── */}
          <div className="space-y-7">

            {/* YOUR NEXT ACTION */}
            {actionFeed.length > 0 && (
              <NextActionCard task={actionFeed[0]} urgentCount={urgentCount} />
            )}

            {/* AI BRIEF */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <Label text="AI Brief" />
                <button onClick={() => generateBrief(true)} className="text-[9.5px] font-semibold hover:opacity-60 transition-opacity" style={{ color: "var(--text-subtle)" }}>
                  Refresh
                </button>
              </div>
              <div className="rounded-2xl px-5 py-4" style={{ border: "1px solid var(--border)", background: "var(--bg-card)" }}>
                <AiBrief text={briefText} loading={briefLoading} />
              </div>
            </section>

            {/* REQUIRES ACTION */}
            {actionFeed.length > 1 && (
              <section>
                <Label text="Requires Action" count={actionFeed.length - 1} danger={urgentCount > 1} className="mb-3" />
                <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--bg-card)" }}>
                  {actionFeed.slice(1).map((task, i) => <ActionRow key={task.id} task={task} index={i} />)}
                </div>
              </section>
            )}

            {/* RECENT ACTIVITY */}
            {d.recentTasks && d.recentTasks.length > 0 && (
              <section>
                <Label text="Recent Activity" count={d.recentTasks.length} className="mb-3" />
                <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--bg-card)" }}>
                  {(d.recentTasks as TaskWithProject[]).slice(0, 6).map((task, i) => (
                    <ActivityRow key={task.id} task={task} index={i} />
                  ))}
                </div>
              </section>
            )}

            {/* RISKS */}
            {allRisks.length > 0 && (
              <section>
                <Label text="Risks" count={allRisks.length} danger={allRisks.some(r => r.level === "critical")} className="mb-3" />
                <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--bg-card)" }}>
                  {allRisks.slice(0, 4).map((r, i) => (
                    <div key={i} style={{
                      display: "flex", alignItems: "flex-start", gap: 10, padding: "11px 16px",
                      borderTop: i === 0 ? "none" : "1px solid var(--border-subtle)",
                      background: r.level === "critical" ? "rgba(239,68,68,0.025)" : undefined,
                    }}>
                      <span style={{
                        width: 6, height: 6, borderRadius: "50%", flexShrink: 0, marginTop: 5,
                        background: r.level === "critical" ? "#EF4444" : "#F59E0B",
                        boxShadow: `0 0 6px ${r.level === "critical" ? "#EF444450" : "#F59E0B50"}`,
                      }} />
                      <div className="flex-1 min-w-0">
                        <p style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-foreground)", lineHeight: 1.35 }}>{r.title}</p>
                        <p style={{ fontSize: 10.5, color: "var(--text-muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.detail}</p>
                      </div>
                      <span style={{
                        fontSize: 8, fontWeight: 900, letterSpacing: "0.1em", textTransform: "uppercase",
                        padding: "2px 7px", borderRadius: 100, flexShrink: 0,
                        background: r.level === "critical" ? "rgba(239,68,68,0.1)" : "rgba(245,158,11,0.1)",
                        color: r.level === "critical" ? "#B91C1C" : "#92400E",
                      }}>
                        {r.level}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* PROJECT ROADMAP */}
            {hasHealthData && (
              <ProjectRoadmap health={d.projectHealth ?? []} projects={projects} />
            )}

            {/* STANDUP GENERATOR */}
            <StandupBlock text={standupText} loading={standupLoading} onGenerate={generateStandup} />

          </div>

          {/* ── RIGHT ── */}
          <div className="space-y-5">

            {/* WINS TODAY */}
            {winsToday.length > 0 && (
              <div style={{ background: "var(--bg-card)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 18, padding: "14px 16px" }}>
                <p style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: "0.13em", textTransform: "uppercase", color: "#16A34A", marginBottom: 10 }}>
                  ✓ Wins Today · {winsToday.length}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {winsToday.slice(0, 5).map(task => (
                    <div key={task.id} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#22C55E", flexShrink: 0 }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {task.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PROJECTS */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <Label text="Projects" />
                <Link href="/projects" className="text-[9.5px] font-semibold hover:opacity-60 transition-opacity" style={{ color: "var(--accent)" }}>All →</Link>
              </div>
              <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 18, padding: "6px 8px", overflow: "hidden" }}>
                {projects.length === 0 ? (
                  <p className="text-[12.5px] px-2 py-3" style={{ color: "var(--text-subtle)" }}>No projects yet.</p>
                ) : projects.slice(0, 7).map((p) => (
                  <Link key={p.id} href={`/projects/${p.id}/board`}>
                    <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl cursor-pointer"
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ""; }}>
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color, boxShadow: `0 0 6px ${p.color}80` }} />
                      <span className="flex-1 text-[12.5px] font-medium truncate" style={{ color: "var(--text-foreground)" }}>{p.name}</span>
                      <span className="text-[10px] tabular-nums shrink-0 font-semibold" style={{ color: "var(--text-subtle)" }}>{p._count?.tasks ?? 0}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            {/* QUICK WINS */}
            {quickWins.length > 0 && <QuickWinsPanel tasks={quickWins} />}

            <Divider />

            {/* QUICK ACTIONS */}
            <section>
              <Label text="Quick Actions" className="mb-3" />
              <div className="space-y-2">
                <Action glyph="✦" label="New task with AI"    onClick={() => setShowNLCreator(true)} />
                <Action glyph="⬡" label="Browse all projects" href="/projects" />
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
