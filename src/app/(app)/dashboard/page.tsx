"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckSquare, AlertTriangle, Calendar, Sparkles, ArrowRight,
  Users, Activity, Eye, Wand2, Shield, RefreshCw,
  Target, Flame,
} from "lucide-react";
import { StandupWidget } from "@/components/ai/StandupWidget";
import { NLTaskCreator } from "@/components/ai/NLTaskCreator";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Avatar } from "@/components/ui/Avatar";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import type { AnalyticsData, Meeting, Task } from "@/types";
import type { RiskAlert } from "@/app/api/alerts/route";
import { format, isPast } from "date-fns";
import { useClaude } from "@/hooks/useClaude";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

// ── Animated number hook ───────────────────────────────────────────────────────
function useCountUp(target: number, duration = 1200, delay = 0): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    let rafId: number;
    let startTime: number | null = null;
    const timeout = setTimeout(() => {
      const step = (ts: number) => {
        if (!startTime) startTime = ts;
        const t = Math.min((ts - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - t, 4);
        setValue(Math.round(eased * target));
        if (t < 1) rafId = requestAnimationFrame(step);
        else setValue(target);
      };
      rafId = requestAnimationFrame(step);
    }, delay);
    return () => { clearTimeout(timeout); cancelAnimationFrame(rafId); };
  }, [target, duration, delay]);
  return value;
}

// ── Workspace health ring ──────────────────────────────────────────────────────
function HealthRing({ score }: { score: number }) {
  const size = 128;
  const radius = (size - 14) / 2;
  const circ = 2 * Math.PI * radius;
  const fill = (score / 100) * circ;
  const color = score >= 80 ? "#00F090" : score >= 60 ? "#FFC107" : "#FF4466";
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={10} />
        <motion.circle cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={10} strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - fill }}
          transition={{ duration: 1.6, delay: 0.4, ease: [0.16, 1, 0.3, 1] }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span className="text-[26px] font-black leading-none tabular-nums"
          style={{ color }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
          {score}
        </motion.span>
        <span className="text-[9px] font-bold uppercase tracking-widest mt-0.5"
          style={{ color: "var(--text-subtle)" }}>Score</span>
      </div>
    </div>
  );
}

// ── Focus metric card ──────────────────────────────────────────────────────────
function FocusMetric({
  label, value, icon: Icon, color, href, badge, index,
}: {
  label: string; value: number; icon: React.ElementType;
  color: string; href: string; badge?: string; index: number;
}) {
  const animated = useCountUp(value, 1000, 100 + index * 80);
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.06 + index * 0.05, ease: [0.16, 1, 0.3, 1] }}>
      <Link href={href}>
        <div
          className="relative rounded-[16px] p-4 cursor-pointer transition-all duration-200 group"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = color + "50";
            (e.currentTarget as HTMLElement).style.boxShadow = `0 6px 28px ${color}16`;
            (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
            (e.currentTarget as HTMLElement).style.boxShadow = "none";
            (e.currentTarget as HTMLElement).style.transform = "none";
          }}>
          {/* Top accent line */}
          <div className="absolute top-0 left-4 right-4 h-[1px] rounded-b-full"
            style={{ background: `linear-gradient(90deg, transparent, ${color}60, transparent)` }} />
          <div className="flex items-start justify-between mb-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: color + "15" }}>
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
            {badge && (
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md"
                style={{ background: color + "18", color }}>
                {badge}
              </span>
            )}
          </div>
          <p className="text-[30px] font-black leading-none tabular-nums tracking-[-0.04em]"
            style={{ color }}>
            {animated}
          </p>
          <p className="text-[11px] font-semibold mt-1.5" style={{ color: "var(--text-muted)" }}>{label}</p>
        </div>
      </Link>
    </motion.div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function computeHealth(data: AnalyticsData): number {
  if (data.totalTasks === 0) return 88;
  const completionPart = Math.min(data.completionRate, 100) * 0.5;
  const overduePct = data.overdueTasks / data.totalTasks;
  const overduePart = Math.max(0, 1 - overduePct * 3) * 35;
  const activityPart = data.activeTasks > 0 ? 15 : 4;
  return Math.min(99, Math.round(completionPart + overduePart + activityPart));
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  BACKLOG:     { label: "Backlog",     color: "#6B7280" },
  TODO:        { label: "To Do",       color: "#60A5FA" },
  IN_PROGRESS: { label: "In Progress", color: "#A78BFA" },
  REVIEW:      { label: "Review",      color: "#FBBF24" },
  DONE:        { label: "Done",        color: "#34D399" },
};

const PRIORITY_ORDER: Record<string, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
const BRIEFING_KEY = "colliq_briefing_v2";
const BRIEFING_TTL = 30 * 60 * 1000;

// ── Page ──────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [upcoming, setUpcoming] = useState<{ today: Task[]; tomorrow: Task[] }>({ today: [], tomorrow: [] });
  const { ask, text: aiStream, streaming, reset: resetAI } = useClaude();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [criticalAlerts, setCriticalAlerts] = useState<RiskAlert[]>([]);
  const [alertsDismissed, setAlertsDismissed] = useState(false);
  const [showNLCreator, setShowNLCreator] = useState(false);
  const [briefing, setBriefing] = useState("");
  const [briefingLoading, setBriefingLoading] = useState(false);
  const generatingRef = useRef(false);

  useEffect(() => {
    if (!localStorage.getItem("colliq_onboarded")) setShowOnboarding(true);
  }, []);

  useEffect(() => {
    fetch("/api/dashboard").then(r => r.json()).then(d => {
      setData(d);
      setLoading(false);
      if (Array.isArray(d.alerts)) setCriticalAlerts(d.alerts.filter((x: RiskAlert) => x.severity === "critical"));
    }).catch(() => setLoading(false));
    fetch("/api/tasks/upcoming").then(r => r.json()).then(setUpcoming).catch(() => {});
  }, []);

  const generateBriefing = useCallback(async (force = false) => {
    if (generatingRef.current || !data) return;
    if (!force) {
      try {
        const cached = localStorage.getItem(BRIEFING_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Date.now() - parsed.ts < BRIEFING_TTL && parsed.text) {
            setBriefing(parsed.text);
            return;
          }
        }
      } catch {}
    }
    generatingRef.current = true;
    setBriefingLoading(true);
    setBriefing("");
    const prompt = `You are Colliq, an AI work operating system. Write a crisp morning briefing in exactly 4 bullet points (• symbol). Each bullet ≤14 words. Cover: most urgent risk, a quick win, team insight, and one recommendation. Data: ${data.activeProjects} projects, ${data.totalTasks} tasks, ${data.completedTasks} done (${data.completionRate}%), ${data.overdueTasks} overdue. Be specific, direct, no filler.`;
    const result = await ask("/api/ai/assistant", { messages: [{ role: "user", content: prompt }] });
    if (result) {
      setBriefing(result);
      try { localStorage.setItem(BRIEFING_KEY, JSON.stringify({ text: result, ts: Date.now() })); } catch {}
    }
    setBriefingLoading(false);
    generatingRef.current = false;
  }, [data, ask]);

  useEffect(() => {
    if (data && !generatingRef.current) generateBriefing();
  }, [data, generateBriefing]);

  // Priority feed: overdue first, then by priority
  const priorityFeed = [...(upcoming.today ?? [])].sort((a, b) => {
    const aOv = !!(a.dueDate && isPast(new Date(a.dueDate)) && a.status !== "DONE");
    const bOv = !!(b.dueDate && isPast(new Date(b.dueDate)) && b.status !== "DONE");
    if (aOv !== bOv) return aOv ? -1 : 1;
    return (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2);
  });

  if (loading) {
    return (
      <div className="p-6 space-y-5 animate-pulse">
        <div className="h-8 w-44 rounded-xl" style={{ background: "var(--bg-elevated)" }} />
        <div className="h-[88px] rounded-2xl" style={{ background: "var(--bg-elevated)" }} />
        <div className="grid grid-cols-4 gap-3">
          {[0,1,2,3].map(i => <div key={i} className="h-24 rounded-2xl" style={{ background: "var(--bg-elevated)" }} />)}
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 h-72 rounded-2xl" style={{ background: "var(--bg-elevated)" }} />
          <div className="h-72 rounded-2xl" style={{ background: "var(--bg-elevated)" }} />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const firstName = session?.user?.name?.split(" ")[0] ?? "there";
  const healthScore = computeHealth(data);

  return (
    <div className="relative min-h-screen">
      <NLTaskCreator open={showNLCreator} onClose={() => setShowNLCreator(false)} />
      {showOnboarding && (
        <OnboardingWizard onComplete={() => { localStorage.setItem("colliq_onboarded", "1"); setShowOnboarding(false); }} />
      )}

      {/* ── Ambient atmosphere ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div style={{ position: "absolute", top: "-15%", left: "-8%", width: 560, height: 560,
          background: "radial-gradient(circle, rgba(124,58,237,0.07) 0%, transparent 70%)", filter: "blur(48px)" }} />
        <div style={{ position: "absolute", bottom: "0%", right: "-5%", width: 480, height: 480,
          background: "radial-gradient(circle, rgba(0,207,255,0.055) 0%, transparent 70%)", filter: "blur(48px)" }} />
        <div style={{ position: "absolute", inset: 0,
          backgroundImage: "linear-gradient(rgba(157,107,255,0.022) 1px, transparent 1px),linear-gradient(90deg, rgba(157,107,255,0.022) 1px, transparent 1px)",
          backgroundSize: "48px 48px" }} />
      </div>

      <div className="relative z-10 p-6 space-y-5">

        {/* ── Critical banner ── */}
        <AnimatePresence>
          {criticalAlerts.length > 0 && !alertsDismissed && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="rounded-2xl px-4 py-3 flex items-center justify-between gap-3"
              style={{ background: "rgba(255,68,102,0.07)", border: "1px solid rgba(255,68,102,0.18)" }}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "rgba(255,68,102,0.12)" }}>
                  <AlertTriangle className="w-3 h-3" style={{ color: "#FF4466" }} />
                </div>
                <span className="text-[13px] font-semibold min-w-0 truncate" style={{ color: "var(--text-foreground)" }}>
                  <span style={{ color: "#FF4466", fontWeight: 700 }}>{criticalAlerts.length} critical risk{criticalAlerts.length > 1 ? "s" : ""}</span>
                  {" "}— {criticalAlerts[0].title}
                </span>
              </div>
              <div className="flex gap-2 shrink-0">
                <Link href="/ai/health">
                  <button className="text-[11px] font-bold px-3 py-1.5 rounded-xl"
                    style={{ background: "rgba(255,68,102,0.1)", color: "#FF4466" }}>Review</button>
                </Link>
                <button onClick={() => setAlertsDismissed(true)} className="text-[11px] text-muted hover:text-foreground px-2">✕</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Greeting ── */}
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] mb-1"
              style={{ color: "var(--text-subtle)" }}>
              {getGreeting()} · {format(new Date(), "EEEE, MMMM d")}
            </p>
            <h1 className="text-[34px] font-black tracking-[-0.045em] leading-none"
              style={{ color: "var(--text-foreground)" }}>{firstName}</h1>
            <p className="text-[13px] mt-1.5" style={{ color: "var(--text-muted)" }}>
              {data.overdueTasks > 0 ? (
                <><span style={{ color: "#FF4466", fontWeight: 700 }}>{data.overdueTasks} task{data.overdueTasks !== 1 ? "s" : ""} overdue</span> — your team may be blocked</>
              ) : (
                <>All caught up · <span style={{ color: "var(--success)", fontWeight: 700 }}>{data.completionRate}%</span> completion rate</>
              )}
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2 shrink-0 pb-1">
            <button onClick={() => setShowNLCreator(true)}
              className="flex items-center gap-2 h-9 px-4 rounded-xl text-[13px] font-bold text-white transition-all hover:-translate-y-px"
              style={{ background: "linear-gradient(135deg, var(--accent), #A78BFA)", boxShadow: "var(--shadow-glow-btn)" }}>
              <Wand2 className="w-3.5 h-3.5" /> Create with Colliq
            </button>
            <Link href="/ai/assistant">
              <button className="flex items-center gap-2 h-9 px-4 rounded-xl text-[13px] font-bold transition-all hover:-translate-y-px"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-foreground)" }}>
                <Sparkles className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} /> Ask Colliq
              </button>
            </Link>
          </div>
        </div>

        {/* ── Colliq Briefing ── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}
          className="relative rounded-[18px] overflow-hidden"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          {/* Accent bar */}
          <div className="absolute top-0 left-0 right-0 h-[1.5px]"
            style={{ background: "linear-gradient(90deg, transparent, var(--accent) 25%, #A78BFA 65%, transparent)" }} />
          {/* Corner glow */}
          <div className="absolute -top-8 right-0 w-48 h-48 pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(157,107,255,0.07) 0%, transparent 70%)" }} />

          <div className="relative z-10 flex items-start gap-4 px-5 py-4">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
              style={{ background: "linear-gradient(135deg, var(--accent), #A78BFA)", boxShadow: "0 4px 14px rgba(157,107,255,0.3)" }}>
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[13px] font-bold" style={{ color: "var(--text-foreground)" }}>Colliq Briefing</span>
                {briefingLoading && (
                  <span className="text-[10px] font-semibold animate-pulse" style={{ color: "var(--accent)" }}>analyzing…</span>
                )}
                {!briefingLoading && (briefing || aiStream) && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: "var(--accent-muted)", color: "var(--accent)" }}>Today</span>
                )}
              </div>
              <AnimatePresence mode="wait">
                {(briefing || aiStream) ? (
                  <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="text-[13px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
                    <MarkdownRenderer content={briefing || aiStream} />
                  </motion.div>
                ) : briefingLoading ? (
                  <motion.div key="dots" className="flex items-center gap-2 py-1">
                    {[0,1,2].map(i => (
                      <motion.div key={i} className="w-1.5 h-1.5 rounded-full"
                        style={{ background: "var(--accent)" }}
                        animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 0.85, delay: i * 0.18, repeat: Infinity }} />
                    ))}
                    <span className="text-[12px]" style={{ color: "var(--text-subtle)" }}>Colliq is analyzing your workspace…</span>
                  </motion.div>
                ) : (
                  <motion.div key="empty">
                    <span className="text-[12px]" style={{ color: "var(--text-subtle)" }}>Generating your briefing…</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <button
              onClick={() => { setBriefing(""); resetAI(); generatingRef.current = false; setTimeout(() => generateBriefing(true), 80); }}
              disabled={briefingLoading || streaming}
              className="w-7 h-7 rounded-xl flex items-center justify-center transition-colors shrink-0 disabled:opacity-40 mt-0.5"
              style={{ color: "var(--text-subtle)" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
              <RefreshCw className={`w-3.5 h-3.5 ${briefingLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </motion.div>

        {/* ── Focus Metrics Strip ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <FocusMetric label="Active Tasks" value={data.activeTasks} icon={Activity}
            color="var(--accent)" href="/tasks?filter=mine" index={0} />
          <FocusMetric label="Overdue" value={data.overdueTasks} icon={AlertTriangle}
            color={data.overdueTasks > 0 ? "#FF4466" : "#00F090"} href="/tasks?filter=overdue"
            badge={data.overdueTasks > 0 ? "!" : "✓"} index={1} />
          <FocusMetric label="In Review" value={data.reviewTasks} icon={Eye}
            color="#FFC107" href="/tasks?filter=review" index={2} />
          <FocusMetric label="Total Tasks" value={data.totalTasks} icon={CheckSquare}
            color="var(--text-subtle)" href="/tasks" index={3} />
        </div>

        {/* ── Main Content Row: Priority Feed + Health ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Priority Feed — 2 cols */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}
            className="lg:col-span-2 rounded-[18px] overflow-hidden"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between px-5 py-3.5"
              style={{ borderBottom: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(255,100,50,0.09)" }}>
                  <Flame className="w-3.5 h-3.5" style={{ color: "#FF6432" }} />
                </div>
                <div>
                  <h3 className="text-[13px] font-bold" style={{ color: "var(--text-foreground)" }}>Priority Feed</h3>
                  <p className="text-[10px]" style={{ color: "var(--text-subtle)" }}>What demands your attention right now</p>
                </div>
              </div>
              <Link href="/tasks">
                <button className="flex items-center gap-1 text-[11px] font-bold" style={{ color: "var(--accent)" }}>
                  All tasks <ArrowRight className="w-3 h-3" />
                </button>
              </Link>
            </div>

            {priorityFeed.length === 0 && upcoming.tomorrow.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
                  style={{ background: "rgba(0,240,144,0.07)", border: "1px solid rgba(0,240,144,0.14)" }}>
                  <Target className="w-6 h-6" style={{ color: "#00F090" }} />
                </div>
                <p className="text-[13px] font-bold" style={{ color: "var(--text-foreground)" }}>Nothing urgent today</p>
                <p className="text-[12px] mt-1" style={{ color: "var(--text-muted)" }}>You&apos;re on top of everything.</p>
                <button onClick={() => setShowNLCreator(true)}
                  className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-bold text-white"
                  style={{ background: "var(--accent)", boxShadow: "var(--shadow-glow-btn)" }}>
                  <Wand2 className="w-3.5 h-3.5" /> Create with Colliq
                </button>
              </div>
            ) : (
              <div>
                {priorityFeed.slice(0, 8).map((task, i) => {
                  const overdue = !!(task.dueDate && isPast(new Date(task.dueDate)) && task.status !== "DONE");
                  const urgentColor = overdue && task.priority === "URGENT" ? "#FF4466"
                    : overdue ? "#FFC107"
                    : task.priority === "URGENT" ? "#FF4466"
                    : task.priority === "HIGH" ? "#FFC107"
                    : "var(--border)";
                  return (
                    <motion.div key={task.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.08 + i * 0.035 }}>
                      <Link href={`/projects/${task.projectId}/board`}>
                        <div className="flex items-center gap-3 px-5 py-3 cursor-pointer transition-colors hover:bg-card-hover"
                          style={{ borderBottom: i < priorityFeed.slice(0, 8).length - 1 ? "1px solid var(--border-subtle)" : "none" }}>
                          <div className="w-[3px] h-8 rounded-full shrink-0" style={{ background: urgentColor }} />
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: task.project?.color ?? "var(--text-subtle)" }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold truncate" style={{ color: "var(--text-foreground)" }}>{task.title}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {task.project && <span className="text-[10px]" style={{ color: "var(--text-subtle)" }}>{task.project.name}</span>}
                              {overdue && <span className="text-[10px] font-bold" style={{ color: "#FF4466" }}>· overdue</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {(task.priority === "URGENT" || task.priority === "HIGH") && (
                              <span className="text-[9px] font-black px-1.5 py-0.5 rounded"
                                style={{
                                  background: task.priority === "URGENT" ? "rgba(255,68,102,0.1)" : "rgba(255,193,7,0.1)",
                                  color: task.priority === "URGENT" ? "#FF4466" : "#FFC107",
                                }}>
                                {task.priority}
                              </span>
                            )}
                            {task.dueDate && (
                              <span className="text-[10px] font-semibold flex items-center gap-0.5"
                                style={{ color: overdue ? "#FF4466" : "var(--text-subtle)" }}>
                                <Calendar className="w-2.5 h-2.5" />
                                {format(new Date(task.dueDate), "MMM d")}
                              </span>
                            )}
                            {task.assignee && <Avatar name={task.assignee.name} image={task.assignee.image} size="xs" />}
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
                {upcoming.tomorrow.length > 0 && (
                  <div className="px-5 py-3" style={{ borderTop: "1px solid var(--border-subtle)" }}>
                    <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--text-subtle)" }}>Tomorrow</p>
                    {upcoming.tomorrow.slice(0, 3).map(task => (
                      <Link key={task.id} href={`/projects/${task.projectId}/list`}>
                        <div className="flex items-center gap-3 py-2 hover:opacity-70 transition-opacity cursor-pointer">
                          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: task.project?.color ?? "var(--text-subtle)" }} />
                          <p className="text-[12px] flex-1 truncate" style={{ color: "var(--text-muted)" }}>{task.title}</p>
                          {task.dueDate && <span className="text-[10px]" style={{ color: "var(--text-subtle)" }}>{format(new Date(task.dueDate), "h:mm a")}</span>}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>

          {/* Workspace Health — 1 col */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
            className="rounded-[18px] p-5 flex flex-col gap-4"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: "rgba(0,240,144,0.08)" }}>
                <Shield className="w-3.5 h-3.5" style={{ color: "#00F090" }} />
              </div>
              <div>
                <h3 className="text-[13px] font-bold" style={{ color: "var(--text-foreground)" }}>Workspace Health</h3>
                <p className="text-[10px]" style={{ color: "var(--text-subtle)" }}>Colliq score</p>
              </div>
            </div>

            <div className="flex justify-center">
              <HealthRing score={healthScore} />
            </div>

            <div className="space-y-2">
              {Object.entries(STATUS_CONFIG).map(([status, cfg]) => {
                const count = (data.tasksByStatus as Record<string, number>)[status] ?? 0;
                const pct = data.totalTasks > 0 ? Math.round((count / data.totalTasks) * 100) : 0;
                return (
                  <div key={status}>
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="text-[11px] font-medium flex items-center gap-1.5" style={{ color: "var(--text-subtle)" }}>
                        <span className="inline-block w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cfg.color }} />
                        {cfg.label}
                      </span>
                      <span className="text-[11px] font-bold tabular-nums" style={{ color: cfg.color }}>{count}</span>
                    </div>
                    <div className="h-[2px] rounded-full" style={{ background: "var(--bg-elevated)" }}>
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                        transition={{ delay: 0.5, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                        className="h-full rounded-full" style={{ background: cfg.color }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl p-2.5 text-center" style={{ background: "var(--bg-elevated)" }}>
                <p className="text-[13px] font-black tabular-nums" style={{ color: data.overdueTasks > 0 ? "#FF4466" : "#00F090" }}>
                  {data.totalTasks > 0 ? Math.round((data.overdueTasks / data.totalTasks) * 100) : 0}%
                </p>
                <p className="text-[9px] font-semibold uppercase tracking-wider mt-0.5" style={{ color: "var(--text-subtle)" }}>Overdue</p>
              </div>
              <div className="rounded-xl p-2.5 text-center" style={{ background: "var(--bg-elevated)" }}>
                <p className="text-[13px] font-black tabular-nums" style={{ color: "var(--accent)" }}>{data.completionRate}%</p>
                <p className="text-[9px] font-semibold uppercase tracking-wider mt-0.5" style={{ color: "var(--text-subtle)" }}>Complete</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* ── Charts + Team Pulse ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Activity chart — 2 cols */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}
            className="lg:col-span-2 rounded-[18px] p-5"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-[13px] font-bold" style={{ color: "var(--text-foreground)" }}>Activity Trend</h3>
                <p className="text-[10px] mt-0.5" style={{ color: "var(--text-subtle)" }}>Tasks completed vs created — last 14 days</p>
              </div>
              <div className="flex gap-4 text-[10px] font-semibold" style={{ color: "var(--text-subtle)" }}>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: "var(--accent)" }} />Completed
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: "#FBBF24" }} />Created
                </span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={data.taskTrend}>
                <defs>
                  <linearGradient id="gAcc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#818CF8" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#818CF8" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gEng" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FBBF24" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#FBBF24" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: "var(--text-subtle)", fontWeight: 600 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 9, fill: "var(--text-subtle)" }} tickLine={false} axisLine={false} width={20} />
                <Tooltip content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="px-3 py-2 rounded-xl text-xs" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-float)" }}>
                      <p className="font-semibold mb-1" style={{ color: "var(--text-subtle)" }}>{label}</p>
                      {payload.map((p, i) => <p key={i} className="font-bold" style={{ color: p.color as string }}>{p.name}: {p.value}</p>)}
                    </div>
                  );
                }} />
                <Area type="monotone" dataKey="completed" name="Completed" stroke="var(--accent)" fill="url(#gAcc)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="created" name="Created" stroke="#FBBF24" fill="url(#gEng)" strokeWidth={2} dot={false} strokeDasharray="5 3" />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Team Pulse — 1 col */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.27 }}
            className="rounded-[18px] p-5"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: "var(--accent-muted)" }}>
                <Users className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
              </div>
              <div>
                <h3 className="text-[13px] font-bold" style={{ color: "var(--text-foreground)" }}>Team Pulse</h3>
                <p className="text-[10px]" style={{ color: "var(--text-subtle)" }}>Tasks per member</p>
              </div>
            </div>
            <div className="space-y-3">
              {(data.teamActivity ?? []).slice(0, 6).map((m: { name: string; tasks: number }, i: number) => {
                const maxT = Math.max(...(data.teamActivity ?? [{ tasks: 1 }]).map((x: { tasks: number }) => x.tasks), 1);
                const pct = Math.round((m.tasks / maxT) * 100);
                return (
                  <div key={m.name}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Avatar name={m.name} size="xs" />
                        <span className="text-[12px] font-medium" style={{ color: "var(--text-foreground)" }}>
                          {m.name?.split(" ")[0] ?? "—"}
                        </span>
                        {i === 0 && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded"
                            style={{ background: "var(--accent-muted)", color: "var(--accent)" }}>TOP</span>
                        )}
                      </div>
                      <span className="text-[11px] font-bold tabular-nums" style={{ color: "var(--text-muted)" }}>{m.tasks}</span>
                    </div>
                    <div className="h-[3px] rounded-full" style={{ background: "var(--bg-elevated)" }}>
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                        transition={{ delay: 0.3 + i * 0.07, duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
                        className="h-full rounded-full"
                        style={{ background: i === 0 ? "var(--accent)" : "var(--border-strong)" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* ── Bottom Row: Meetings + Standup ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Upcoming Meetings */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.31 }}
            className="rounded-[18px] p-5"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[13px] font-bold" style={{ color: "var(--text-foreground)" }}>Upcoming Meetings</h3>
              <Link href="/meetings" className="flex items-center gap-1 text-[11px] font-bold" style={{ color: "var(--accent)" }}>
                All <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {data.upcomingMeetings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Calendar className="w-8 h-8 mb-2" style={{ color: "var(--text-subtle)", opacity: 0.4 }} />
                <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>No meetings scheduled</p>
                <Link href="/meetings">
                  <button className="mt-3 text-[11px] font-bold px-3 py-1.5 rounded-xl"
                    style={{ background: "var(--accent-muted)", color: "var(--accent)" }}>
                    Schedule meeting
                  </button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {data.upcomingMeetings.slice(0, 4).map((m: Meeting) => (
                  <Link key={m.id} href="/meetings">
                    <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-elevated transition-colors cursor-pointer">
                      <div className="w-9 h-9 rounded-xl flex flex-col items-center justify-center shrink-0"
                        style={{ background: "var(--accent-muted)" }}>
                        <span className="text-[7px] font-bold uppercase leading-none" style={{ color: "var(--accent)", letterSpacing: "0.06em" }}>
                          {format(new Date(m.startTime), "MMM")}
                        </span>
                        <span className="text-[15px] font-black leading-tight" style={{ color: "var(--accent)" }}>
                          {format(new Date(m.startTime), "d")}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-semibold truncate" style={{ color: "var(--text-foreground)" }}>{m.title}</p>
                        <p className="text-[10px]" style={{ color: "var(--text-subtle)" }}>
                          {format(new Date(m.startTime), "h:mm a")}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </motion.div>

          {/* Standup widget — 2 cols */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
            className="lg:col-span-2">
            <StandupWidget />
          </motion.div>
        </div>

      </div>
    </div>
  );
}
