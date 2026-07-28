"use client";
import { useEffect, useState, useCallback, useRef } from "react";
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
  id: string;
  name: string;
  color: string;
  description?: string;
  _count?: { tasks: number };
}

type TaskWithProject = Task & { project?: { id: string; name: string; color: string } };

/* ── The Signal Bar — Colliq's signature identity element ─────────────────── */
/* All projects shown as a proportional colored strip. At a glance: portfolio   */
/* health. Width encodes task volume. Color encodes project identity.           */
function SignalBar({ projects }: { projects: Project[] }) {
  if (!projects.length) return null;
  const total = projects.reduce((s, p) => s + Math.max(p._count?.tasks ?? 1, 1), 0);
  return (
    <div className="mb-1.5">
      <div className="flex items-stretch h-[3px] gap-[3px] overflow-hidden rounded-full">
        {projects.map((p) => {
          const weight = (Math.max(p._count?.tasks ?? 1, 1) / total);
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

/* ── Section header ────────────────────────────────────────────────────────── */
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

/* ── Divider ───────────────────────────────────────────────────────────────── */
function Divider() {
  return <div style={{ height: "0.5px", background: "var(--border-subtle)" }} />;
}

/* ── Action row — one urgent/overdue task ──────────────────────────────────── */
function ActionRow({ task, index }: { task: TaskWithProject; index: number }) {
  const isOverdue = !!(task.dueDate && isPast(new Date(task.dueDate)) && task.status !== "DONE");
  const pri = PRI[task.priority] ?? PRI.MEDIUM;
  const railColor = isOverdue ? "#EF4444" : pri.color;
  const daysLate = isOverdue && task.dueDate
    ? differenceInDays(new Date(), new Date(task.dueDate))
    : 0;

  return (
    <div
      className="flex items-center gap-4 px-4 py-3.5 cursor-pointer transition-colors"
      style={{ borderTop: index === 0 ? "none" : "1px solid var(--border-subtle)" }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-card-hover)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ""; }}
    >
      {/* Priority rail */}
      <div className="w-[2.5px] self-stretch rounded-full shrink-0" style={{ background: railColor }} />

      {/* Content */}
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

      {/* Chips */}
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
        {task.dueDate && !isOverdue && (
          <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
            {format(new Date(task.dueDate), "MMM d")}
          </span>
        )}
      </div>
    </div>
  );
}

/* ── Relative time helper ──────────────────────────────────────────────────── */
function relTime(dateStr: string): string {
  const diff  = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/* ── Status verb ───────────────────────────────────────────────────────────── */
function statusVerb(s: string): string {
  if (s === "DONE")        return "completed";
  if (s === "REVIEW")      return "submitted for review";
  if (s === "IN_PROGRESS") return "started";
  if (s === "BACKLOG")     return "added to backlog";
  return "updated";
}

/* ── Activity row — "Changed while you were away" ─────────────────────────── */
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
        <span className="font-semibold" style={{ color: "var(--text-subtle)" }}>
          {actor.split(" ")[0]}
        </span>
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

/* ── Risk row — "Risk watch" ───────────────────────────────────────────────── */
function RiskRow({ alert, index }: { alert: { severity: string; title: string; detail: string; projectColor?: string }; index: number }) {
  const isCritical = alert.severity === "critical";
  return (
    <div
      className="flex items-start gap-3 px-4 py-3"
      style={{ borderTop: index === 0 ? "none" : "1px solid var(--border-subtle)" }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5"
        style={{ background: isCritical ? "#EF4444" : "#F59E0B" }}
      />
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

/* ── Stat line — right panel ───────────────────────────────────────────────── */
function StatLine({ label, value, accent, first }: { label: string; value: number; accent?: string; first?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2.5 px-4"
      style={{ borderTop: first ? "none" : "1px solid var(--border-subtle)" }}>
      <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>{label}</span>
      <span className="text-[13px] font-bold tabular-nums" style={{ color: accent ?? "var(--text-foreground)" }}>
        {value}
      </span>
    </div>
  );
}

/* ── Quick action ──────────────────────────────────────────────────────────── */
function Action({ href, label, glyph, onClick }: { href?: string; label: string; glyph: string; onClick?: () => void }) {
  const inner = (
    <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl cursor-pointer"
      style={{ border: "1px solid var(--border)", background: "var(--bg-card)" }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-card-hover)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--border-strong)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-card)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
    >
      <span className="text-[15px] shrink-0 leading-none" style={{ color: "var(--accent)" }}>{glyph}</span>
      <span className="text-[12.5px] font-medium" style={{ color: "var(--text-foreground)" }}>{label}</span>
    </div>
  );
  if (onClick) return <div onClick={onClick}>{inner}</div>;
  return <Link href={href ?? "#"}>{inner}</Link>;
}

/* ── AI Brief renderer ─────────────────────────────────────────────────────── */
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

/* ── Next action hero card ─────────────────────────────────────────────────── */
function NextActionCard({ task, urgentCount }: { task: TaskWithProject; urgentCount: number }) {
  const isOv = !!(task.dueDate && isPast(new Date(task.dueDate)) && task.status !== "DONE");
  const pri  = PRI[task.priority] ?? PRI.MEDIUM;
  const railColor = isOv ? "#EF4444" : pri.color;
  const daysLate  = isOv && task.dueDate ? differenceInDays(new Date(), new Date(task.dueDate)) : 0;
  const overdueLabel = daysLate === 0 ? "due today" : `${daysLate}d overdue`;

  return (
    <section>
      <Label text="Your next action" className="mb-3" />
      <div
        className="rounded-2xl p-5"
        style={{
          border: `1px solid ${railColor}30`,
          background: "var(--bg-card)",
          boxShadow: `inset 3px 0 0 ${railColor}`,
        }}
      >
        <div className="flex-1 min-w-0">
          <p className="text-[16px] font-black leading-tight tracking-[-0.02em] mb-1.5"
            style={{ color: "var(--text-foreground)" }}>
            {task.title}
          </p>
          {task.project && (
            <p className="text-[11px] mb-3" style={{ color: "var(--text-muted)" }}>
              {task.project.name}
              {isOv && (
                <span className="ml-2 font-bold" style={{ color: "#EF4444" }}>
                  · {overdueLabel}
                </span>
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
              <a
                href={`/projects/${task.project.id}/board`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold text-white transition-opacity hover:opacity-80"
                style={{ background: railColor }}
              >
                Open task →
              </a>
            )}
            <span
              className="px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase"
              style={{ background: `${railColor}12`, color: railColor, letterSpacing: "0.08em" }}
            >
              {pri.label}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ══ PAGE ════════════════════════════════════════════════════════════════════ */

export default function DashboardPage() {
  useSession(); // keep session provider active for auth
  const { ask }           = useClaude();

  const [analyticsData,    setAnalyticsData]    = useState<AnalyticsData | null>(null);
  const [upcomingToday,    setUpcomingToday]    = useState<TaskWithProject[]>([]);
  const [projects,         setProjects]         = useState<Project[]>([]);
  const [briefText,        setBriefText]        = useState("");
  const [briefLoading,     setBriefLoading]     = useState(false);
  const [loading,          setLoading]          = useState(true);
  const [showOnboarding,   setShowOnboarding]   = useState(false);
  const [showNLCreator,    setShowNLCreator]     = useState(false);

  const generating = useRef(false);

  useEffect(() => {
    if (!localStorage.getItem("colliq_onboarded")) setShowOnboarding(true);
  }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/dashboard").then(r => r.json()),
      fetch("/api/tasks/upcoming").then(r => r.json()).catch(() => ({ today: [], tomorrow: [] })),
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
    const text = result && !result.includes("[Error:") ? result : "AI brief temporarily unavailable.";
    setBriefText(text);
    try { localStorage.setItem(BRIEFING_KEY, JSON.stringify({ text, ts: Date.now() })); } catch {}
    setBriefLoading(false);
    generating.current = false;
  }, [analyticsData, ask]);

  useEffect(() => {
    if (analyticsData && !generating.current) generateBrief();
  }, [analyticsData, generateBrief]);

  /* Derived data */
  const actionFeed: TaskWithProject[] = upcomingToday
    .filter(t => t.status !== "DONE" && t.status !== "ARCHIVED")
    .sort((a, b) => {
      const aOv = !!(a.dueDate && isPast(new Date(a.dueDate)));
      const bOv = !!(b.dueDate && isPast(new Date(b.dueDate)));
      if (aOv !== bOv) return aOv ? -1 : 1;
      return (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2);
    })
    .slice(0, 7);

  const urgentCount  = actionFeed.filter(t =>
    t.priority === "URGENT" || (t.dueDate && isPast(new Date(t.dueDate)))
  ).length;


  /* ── Skeleton ── */
  if (loading) {
    return (
      <div className="max-w-[1160px] mx-auto px-8 pt-8 pb-16 space-y-7 animate-pulse">
        <div className="h-[3px] rounded-full" style={{ background: "var(--bg-elevated)" }} />
        <div className="h-7 w-52 rounded-lg" style={{ background: "var(--bg-elevated)" }} />
        <div className="grid grid-cols-[1fr_300px] gap-8">
          <div className="space-y-4">
            {[1,2,3,4].map(i => <div key={i} className="h-14 rounded-xl" style={{ background: "var(--bg-elevated)" }} />)}
          </div>
          <div className="space-y-3">
            {[1,2,3,4,5].map(i => <div key={i} className="h-10 rounded-xl" style={{ background: "var(--bg-elevated)" }} />)}
          </div>
        </div>
      </div>
    );
  }

  if (!analyticsData) return null;
  const d = analyticsData;

  return (
    <>
      <NLTaskCreator open={showNLCreator} onClose={() => setShowNLCreator(false)} />
      {showOnboarding && (
        <OnboardingWizard
          onComplete={() => { localStorage.setItem("colliq_onboarded", "1"); setShowOnboarding(false); }}
        />
      )}

      <div className="max-w-[1160px] mx-auto px-8 pt-8 pb-16">

        {/* ════ SIGNAL BAR ════ */}
        <SignalBar projects={projects} />

        {/* ════ DATE + STATUS STRIP ════ */}
        <div className="flex items-center justify-between mt-6 mb-8">
          <p className="text-[12px] font-semibold" style={{ color: "var(--text-muted)" }}>
            {format(new Date(), "EEE, MMM d")}
            {urgentCount > 0 && (
              <span className="ml-3 text-[10px] font-black px-2 py-0.5 rounded-full"
                style={{ background: "rgba(239,68,68,0.10)", color: "#EF4444", letterSpacing: "0.06em" }}>
                {urgentCount} URGENT
              </span>
            )}
          </p>
          <p className="text-[10.5px] tabular-nums" style={{ color: "var(--text-subtle)" }}>
            {d.completedTasks}/{d.totalTasks} done · {d.completionRate}%
          </p>
        </div>

        {/* ════ BODY — two column ════ */}
        <div className="grid grid-cols-[1fr_300px] gap-10 items-start">

          {/* ── LEFT ── */}
          <div className="space-y-9">

            {/* YOUR NEXT ACTION — hero card */}
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

            {/* CHANGED WHILE YOU WERE AWAY */}
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

            {/* RISK WATCH */}
            {d.alerts && d.alerts.length > 0 && (
              <section>
                <Label
                  text="Risk watch"
                  count={d.alerts.length}
                  danger={d.criticalAlertCount ? d.criticalAlertCount > 0 : false}
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

            {/* WORKSPACE */}
            <section>
              <Label text="Workspace" className="mb-3" />
              <div className="rounded-2xl overflow-hidden"
                style={{ border: "1px solid var(--border)", background: "var(--bg-card)" }}>
                <StatLine label="Total tasks"  value={d.totalTasks}    first />
                <StatLine label="Completed"    value={d.completedTasks} accent="#22C55E" />
                <StatLine label="In progress"  value={d.activeTasks}   accent="var(--accent)" />
                <StatLine label="Overdue"      value={d.overdueTasks}  accent={d.overdueTasks > 0 ? "#EF4444" : undefined} />
              </div>
            </section>

            <Divider />

            {/* QUICK ACTIONS */}
            <section>
              <Label text="Quick actions" className="mb-3" />
              <div className="space-y-2">
                <Action glyph="✦" label="New task with AI" onClick={() => setShowNLCreator(true)} />
                <Action glyph="⬡" label="Browse all projects" href="/projects" />
                <Action glyph="◉" label="Clock in / out"      href="/attendance" />
                <Action glyph="⚡" label="AI assistant"        href="/ai/assistant" />
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
