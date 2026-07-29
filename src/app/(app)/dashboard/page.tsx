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

const PRI: Record<string, { label: string; color: string }> = {
  URGENT: { label: "URGENT", color: "#EF4444" },
  HIGH:   { label: "HIGH",   color: "#F59E0B" },
  MEDIUM: { label: "MED",    color: "#60A5FA" },
  LOW:    { label: "LOW",    color: "#94A3B8" },
};

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
function KpiTile({ label, value, sub, accent }: { label: string; value: string | number; sub: string; accent?: string }) {
  return (
    <div style={{
      background: "var(--bg-card)",
      border: "1px solid var(--border)",
      borderRadius: 18,
      padding: "18px 20px",
    }}>
      <p style={{ color: "var(--text-subtle)", fontSize: 9.5, fontWeight: 800, letterSpacing: "0.13em", textTransform: "uppercase", marginBottom: 8 }}>
        {label}
      </p>
      <p style={{ color: accent ?? "var(--text-foreground)", fontSize: 30, fontWeight: 900, lineHeight: 1, letterSpacing: "-0.03em", marginBottom: 5, fontVariantNumeric: "tabular-nums" }}>
        {value}
      </p>
      <p style={{ color: "var(--text-muted)", fontSize: 11 }}>{sub}</p>
    </div>
  );
}

/* ── 14-Day Velocity Area Chart ───────────────────────────────────────────── */
function VelocityChart({ data }: { data: { date: string; completed: number; created: number }[] }) {
  if (!data.length) return (
    <p style={{ color: "var(--text-subtle)", fontSize: 12, textAlign: "center", padding: "40px 0" }}>No trend data yet</p>
  );
  const formatted = data.map(d => {
    const dt = new Date(d.date);
    return { ...d, day: isNaN(dt.getTime()) ? d.date : format(dt, "MMM d") };
  });
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 14 }}>
        <p style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: "0.13em", textTransform: "uppercase", color: "var(--text-subtle)" }}>
          14-Day Velocity
        </p>
        <div style={{ display: "flex", gap: 14 }}>
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
                      fontSize: 9.5, fontWeight: 700,
                      color: daysLeft <= 3 ? "#EF4444" : daysLeft <= 7 ? "#F59E0B" : "var(--text-subtle)",
                      background: daysLeft <= 3 ? "rgba(239,68,68,0.08)" : "var(--bg-elevated)",
                      padding: "2px 6px", borderRadius: 5,
                    }}>
                      {daysLeft <= 0 ? "OVERDUE" : `${daysLeft}d left`}
                    </span>
                  )}
                  <span style={{ fontSize: 9.5, color: "var(--text-subtle)" }}>{r.tasks} tasks</span>
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

  const generating = useRef(false);

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

        {/* ════ PAGE HEADER ════ */}
        <div className="flex items-end justify-between mt-6 mb-6">
          <div>
            <p className="text-[11px] font-semibold mb-0.5" style={{ color: "var(--text-subtle)" }}>
              {format(new Date(), "EEEE, MMMM d")}
            </p>
            <h1 className="text-[22px] font-black" style={{ color: "var(--text-foreground)", letterSpacing: "-0.025em" }}>
              Good {greeting}, {firstName}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {urgentCount > 0 && (
              <span className="text-[10px] font-black px-2.5 py-1.5 rounded-full"
                style={{ background: "rgba(239,68,68,0.10)", color: "#EF4444", letterSpacing: "0.06em" }}>
                ⚡ {urgentCount} URGENT
              </span>
            )}
            <span className="text-[10.5px] tabular-nums" style={{ color: "var(--text-subtle)" }}>
              {d.completedTasks}/{d.totalTasks} done · {d.completionRate}%
            </span>
          </div>
        </div>

        {/* ════ KPI TILES ════ */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <KpiTile
            label="Active Projects"
            value={d.activeProjects}
            sub={`${d.totalProjects} total`}
            accent="var(--accent)"
          />
          <KpiTile
            label="Total Tasks"
            value={d.totalTasks}
            sub={`${d.activeTasks} in progress`}
          />
          <KpiTile
            label="Completion Rate"
            value={`${d.completionRate}%`}
            sub={`${d.completedTasks} tasks done`}
            accent="#22C55E"
          />
          <KpiTile
            label="Overdue"
            value={d.overdueTasks}
            sub={d.overdueTasks === 0 ? "all on track" : `${urgentCount > 0 ? urgentCount + " high priority" : "needs attention"}`}
            accent={d.overdueTasks > 0 ? "#EF4444" : "#22C55E"}
          />
        </div>

        {/* ════ VELOCITY + STATUS DONUT ════ */}
        <div className="grid grid-cols-[1fr_300px] gap-4 mb-4">
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 20, padding: "20px 24px" }}>
            <VelocityChart data={d.taskTrend ?? []} />
          </div>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 20, padding: "20px 20px" }}>
            <StatusDonut data={d.tasksByStatus ?? {}} />
          </div>
        </div>

        {/* ════ PRIORITY + TEAM ACTIVITY ════ */}
        {(hasPriorityData || hasTeamData) && (
          <div
            className="mb-8"
            style={{ display: "grid", gridTemplateColumns: hasPriorityData && hasTeamData ? "1fr 1fr" : "1fr", gap: 16 }}
          >
            {hasPriorityData && (
              <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 20, padding: "20px 24px" }}>
                <PriorityBars data={d.tasksByPriority ?? {}} />
              </div>
            )}
            {hasTeamData && (
              <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 20, padding: "20px 24px" }}>
                <TeamBars data={d.teamActivity ?? []} />
              </div>
            )}
          </div>
        )}
        {!(hasPriorityData || hasTeamData) && <div className="mb-8" />}

        {/* ════ BODY — two column ════ */}
        <div className="grid grid-cols-[1fr_300px] gap-10 items-start">

          {/* ── LEFT ── */}
          <div className="space-y-9">

            {/* YOUR NEXT ACTION */}
            {actionFeed.length > 0 && (
              <NextActionCard task={actionFeed[0]} urgentCount={urgentCount} />
            )}

            {/* REQUIRES ACTION */}
            {actionFeed.length > 1 && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <Label text="Requires action" count={actionFeed.length - 1} danger={urgentCount > 1} />
                </div>
                <div className="rounded-2xl overflow-hidden"
                  style={{ border: "1px solid var(--border)", background: "var(--bg-card)" }}>
                  {actionFeed.slice(1).map((task, i) => <ActionRow key={task.id} task={task} index={i} />)}
                </div>
              </section>
            )}

            {/* PROJECT ROADMAP */}
            {hasHealthData && (
              <ProjectRoadmap health={d.projectHealth ?? []} projects={projects} />
            )}

            {/* AI BRIEF */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <Label text="AI Brief" />
                <button
                  onClick={() => generateBrief(true)}
                  className="text-[9.5px] font-semibold hover:opacity-60 transition-opacity"
                  style={{ color: "var(--text-subtle)" }}
                >
                  Refresh
                </button>
              </div>
              <div className="rounded-2xl px-5 py-4"
                style={{ border: "1px solid var(--border)", background: "var(--bg-card)" }}>
                <AiBrief text={briefText} loading={briefLoading} />
              </div>
            </section>

            {/* RISK WATCH */}
            {d.alerts && d.alerts.length > 0 && (
              <section>
                <Label
                  text="Risk watch"
                  count={d.alerts.length}
                  danger={!!(d.criticalAlertCount && d.criticalAlertCount > 0)}
                  className="mb-3"
                />
                <div className="rounded-2xl overflow-hidden"
                  style={{ border: "1px solid var(--border)", background: "var(--bg-card)" }}>
                  {d.alerts.slice(0, 4).map((alert, i) => (
                    <RiskRow key={alert.id} alert={alert} index={i} />
                  ))}
                </div>
              </section>
            )}

            {/* CHANGED WHILE AWAY */}
            {d.recentTasks && d.recentTasks.length > 0 && (
              <section>
                <Label text="Changed while you were away" count={d.recentTasks.length} className="mb-3" />
                <div className="rounded-2xl overflow-hidden"
                  style={{ border: "1px solid var(--border)", background: "var(--bg-card)" }}>
                  {(d.recentTasks as TaskWithProject[]).slice(0, 6).map((task, i) => (
                    <ActivityRow key={task.id} task={task} index={i} />
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* ── RIGHT ── */}
          <div className="space-y-7">

            {/* PROJECTS */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <Label text="Projects" />
                <Link href="/projects"
                  className="text-[9.5px] font-semibold hover:opacity-60 transition-opacity"
                  style={{ color: "var(--accent)" }}>
                  All →
                </Link>
              </div>
              <div className="space-y-px">
                {projects.length === 0 ? (
                  <p className="text-[12.5px]" style={{ color: "var(--text-subtle)" }}>No projects yet.</p>
                ) : projects.slice(0, 7).map((p) => (
                  <Link key={p.id} href={`/projects/${p.id}/board`}>
                    <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg -mx-2 cursor-pointer"
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ""; }}
                    >
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color, boxShadow: `0 0 6px ${p.color}88` }} />
                      <span className="flex-1 text-[12.5px] font-medium truncate" style={{ color: "var(--text-foreground)" }}>
                        {p.name}
                      </span>
                      <span className="text-[10px] tabular-nums shrink-0" style={{ color: "var(--text-subtle)" }}>
                        {p._count?.tasks ?? 0}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            <Divider />

            {/* QUICK ACTIONS */}
            <section>
              <Label text="Quick actions" className="mb-3" />
              <div className="space-y-2">
                <Action glyph="✦" label="New task with AI"     onClick={() => setShowNLCreator(true)} />
                <Action glyph="⬡" label="Browse all projects"  href="/projects" />
                <Action glyph="◉" label="Clock in / out"       href="/attendance" />
                <Action glyph="⚡" label="AI assistant"         href="/ai/assistant" />
                <Action glyph="📊" label="Team workload"        href="/workload" />
              </div>
            </section>

          </div>
        </div>
      </div>
    </>
  );
}
