"use client";
import { useEffect, useState } from "react";
import {
  CheckSquare, AlertTriangle,
  Calendar, Sparkles, ArrowRight, Users, Zap, Clock,
  Activity, Eye, Wand2,
} from "lucide-react";
import { StandupWidget } from "@/components/ai/StandupWidget";
import { NLTaskCreator } from "@/components/ai/NLTaskCreator";

import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import { motion, AnimatePresence } from "framer-motion";
import type { AnalyticsData, Meeting, Task } from "@/types";
import type { RiskAlert } from "@/app/api/alerts/route";
import { format, isPast, formatDistanceToNow } from "date-fns";
import { useClaude } from "@/hooks/useClaude";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

const STATUS_CONFIG = {
  BACKLOG:     { label: "Backlog",     color: "#6B7280" },
  TODO:        { label: "To Do",       color: "#60A5FA" },
  IN_PROGRESS: { label: "In Progress", color: "#A78BFA" },
  REVIEW:      { label: "Review",      color: "#FBBF24" },
  DONE:        { label: "Done",        color: "#34D399" },
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; color: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="panel px-4 py-3 text-xs shadow-float">
      <p className="text-muted mb-2 font-semibold">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-semibold" style={{ color: p.color }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

interface SavedInsight { id: string; content: string; createdAt: string; }

export default function DashboardPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [upcoming, setUpcoming] = useState<{ today: Task[]; tomorrow: Task[] }>({ today: [], tomorrow: [] });
  const { ask, text: aiInsight, streaming } = useClaude();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [insightHistory, setInsightHistory] = useState<SavedInsight[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [criticalAlerts, setCriticalAlerts] = useState<RiskAlert[]>([]);
  const [alertsDismissed, setAlertsDismissed] = useState(false);
  const [showNLCreator, setShowNLCreator] = useState(false);

  useEffect(() => {
    const done = localStorage.getItem("zynotrix_onboarded");
    if (!done) setShowOnboarding(true);
  }, []);

  useEffect(() => {
    // Single call replacing /api/analytics + /api/alerts
    fetch("/api/dashboard").then((r) => r.json()).then((d) => {
      setData(d);
      setLoading(false);
      if (Array.isArray(d.alerts)) {
        setCriticalAlerts(d.alerts.filter((x: RiskAlert) => x.severity === "critical"));
      }
    }).catch(() => setLoading(false));
    fetch("/api/tasks/upcoming").then((r) => r.json()).then(setUpcoming).catch(() => {});
    fetch("/api/ai/insights").then((r) => r.json()).then(setInsightHistory).catch(() => {});
  }, []);

  const generateInsight = async () => {
    if (!data) return;
    const prompt = `Workspace summary: ${data.activeProjects} active projects, ${data.totalTasks} tasks, ${data.completedTasks} done (${data.completionRate}%), ${data.overdueTasks} overdue. Give me 3 specific insights and priorities for this week. Use bullet points. Be direct and actionable.`;
    const result = await ask("/api/ai/assistant", {
      messages: [{ role: "user", content: prompt }],
    });
    if (result) {
      // Save to history
      try {
        const res = await fetch("/api/ai/insights", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: result, prompt }),
        });
        if (res.ok) {
          const saved: SavedInsight = await res.json();
          setInsightHistory((prev) => [saved, ...prev.slice(0, 9)]);
        }
      } catch {}
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-16 w-64 skeleton rounded-2xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 skeleton rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-64 skeleton rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const firstName = session?.user?.name?.split(" ")[0] ?? "there";

  return (
    <div className="p-6 space-y-6">
      <NLTaskCreator open={showNLCreator} onClose={() => setShowNLCreator(false)} />

      {/* Onboarding wizard — shows once per browser */}
      {showOnboarding && (
        <OnboardingWizard onComplete={() => { localStorage.setItem("zynotrix_onboarded", "1"); setShowOnboarding(false); }} />
      )}

      {/* ── Critical Risk Banner ── */}
      <AnimatePresence>
        {criticalAlerts.length > 0 && !alertsDismissed && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="rounded-2xl p-4 flex items-start justify-between gap-3"
            style={{ background: "rgba(255,68,102,0.08)", border: "1px solid rgba(255,68,102,0.25)" }}>
            <div className="flex items-start gap-3 min-w-0">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#FF4466" }} />
              <div className="min-w-0">
                <p className="text-sm font-bold" style={{ color: "#FF4466" }}>
                  {criticalAlerts.length} critical risk{criticalAlerts.length > 1 ? "s" : ""} detected
                </p>
                <p className="text-xs text-muted mt-0.5 truncate">
                  {criticalAlerts[0].title}
                  {criticalAlerts.length > 1 && ` · +${criticalAlerts.length - 1} more`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link href="/ai/health">
                <button className="text-xs font-bold px-3 py-1.5 rounded-xl transition-colors"
                  style={{ background: "rgba(255,68,102,0.15)", color: "#FF4466" }}>
                  View Alerts
                </button>
              </Link>
              <button onClick={() => setAlertsDismissed(true)}
                className="text-xs text-muted hover:text-foreground transition-colors px-2 py-1.5">
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Greeting hero ── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[20px] p-6"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-xs)" }}>

        {/* Ambient gradient */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 80% 50%, var(--accent-glow) 0%, transparent 60%)" }} />
        <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-[20px]"
          style={{ background: "linear-gradient(90deg, transparent 0%, var(--accent) 40%, var(--energy) 70%, transparent 100%)" }} />

        <div className="relative z-10 flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] mb-1.5" style={{ color: "var(--text-subtle)" }}>
              {getGreeting()}
            </p>
            <h1 className="text-[28px] font-black tracking-[-0.035em] leading-none" style={{ color: "var(--text-foreground)" }}>
              {firstName}
            </h1>
            <p className="text-[13px] mt-2" style={{ color: "var(--text-muted)" }}>
              {data.overdueTasks > 0
                ? <><span style={{ color: "var(--warning)", fontWeight: 700 }}>{data.overdueTasks} overdue</span> — address these first to unblock your team</>
                : <>All caught up · <span style={{ color: "var(--success)", fontWeight: 700 }}>{data.completionRate}%</span> completion rate this sprint</>
              }
            </p>
          </div>

          <div className="hidden md:flex items-center gap-2 shrink-0">
            <button onClick={() => setShowNLCreator(true)}
              className="flex items-center gap-2 h-9 px-4 rounded-[10px] text-[13px] font-bold text-white transition-all hover:scale-[1.02]"
              style={{ background: "linear-gradient(135deg, var(--accent), #A78BFA)", boxShadow: "var(--shadow-glow-btn)" }}>
              <Wand2 className="w-3.5 h-3.5" /> AI Create Task
            </button>
            <Link href="/ai/assistant">
              <button className="flex items-center gap-2 h-9 px-4 rounded-[10px] text-[13px] font-bold transition-all hover:scale-[1.02]"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-foreground)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--accent-glow)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}>
                <Sparkles className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} /> Ask AI
              </button>
            </Link>
            <Link href="/projects">
              <button className="flex items-center gap-2 h-9 px-4 rounded-[10px] text-[13px] font-bold text-white transition-all hover:scale-[1.02]"
                style={{ background: "var(--accent)", boxShadow: "var(--shadow-glow-btn)" }}>
                <Zap className="w-3.5 h-3.5" /> New Project
              </button>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* ── Metric cards — reordered: Active Tasks → Overdue → Total → Completion ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
        <MetricCard title="Active Tasks"       value={data.activeTasks}   icon={<Activity className="w-4.5 h-4.5" />}       color="accent"                                                       index={0} href="/tasks?filter=mine" />
        <MetricCard title="Overdue"            value={data.overdueTasks}  icon={<AlertTriangle className="w-4.5 h-4.5" />}  color={data.overdueTasks > 0 ? "danger" : "success"} trend={data.overdueTasks > 0 ? "down" : "neutral"} index={1} href="/tasks?filter=overdue" />
        <MetricCard title="Under Review"       value={data.reviewTasks}   icon={<Eye className="w-4.5 h-4.5" />}            color="warning"   trend={data.reviewTasks > 0 ? "up" : "neutral"}           index={2} href="/tasks?filter=review" />
        <MetricCard title="Total Tasks"        value={data.totalTasks}    icon={<CheckSquare className="w-4.5 h-4.5" />}    color="secondary"                                                    index={3} href="/tasks" />
      </div>

      {/* ── Upcoming tasks ── */}
      {(upcoming.today.length > 0 || upcoming.tomorrow.length > 0) && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="rounded-2xl p-5"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-xs)" }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: "var(--energy-muted)" }}>
                <Clock className="w-3.5 h-3.5" style={{ color: "var(--energy)" }} />
              </div>
              <h3 className="text-sm font-bold text-foreground">Upcoming Tasks</h3>
            </div>
            <Link href="/tasks">
              <button className="text-[10px] font-bold hover:underline underline-offset-2 flex items-center gap-1" style={{ color: "var(--accent)" }}>
                View all <ArrowRight className="w-3 h-3" />
              </button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Today */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full"
                  style={{ background: "var(--accent-muted)", color: "var(--accent)" }}>Today</span>
                <span className="text-[10px] text-muted">{upcoming.today.length} task{upcoming.today.length !== 1 ? "s" : ""}</span>
              </div>
              {upcoming.today.length === 0 ? (
                <p className="text-xs text-subtle px-1">No tasks due today 🎉</p>
              ) : (
                <div className="space-y-2">
                  {upcoming.today.slice(0, 5).map((t) => (
                    <Link key={t.id} href={`/projects/${t.projectId}/list`}>
                      <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-card-hover transition-colors group cursor-pointer">
                        <div className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ background: t.project?.color ?? "var(--accent)" }} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-semibold text-foreground truncate ${t.status === "DONE" ? "line-through opacity-50" : ""}`}>{t.title}</p>
                          {t.project && <p className="text-[10px] text-subtle truncate">{t.project.name}</p>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {t.dueDate && (
                            <span className={`text-[10px] font-semibold ${isPast(new Date(t.dueDate)) ? "text-danger" : "text-muted"}`}>
                              {format(new Date(t.dueDate), "h:mm a")}
                            </span>
                          )}
                          {t.assignee && <Avatar name={t.assignee.name} image={t.assignee.image} size="xs" />}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Tomorrow */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full"
                  style={{ background: "var(--bg-elevated)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>Tomorrow</span>
                <span className="text-[10px] text-muted">{upcoming.tomorrow.length} task{upcoming.tomorrow.length !== 1 ? "s" : ""}</span>
              </div>
              {upcoming.tomorrow.length === 0 ? (
                <p className="text-xs text-subtle px-1">Nothing due tomorrow</p>
              ) : (
                <div className="space-y-2">
                  {upcoming.tomorrow.slice(0, 5).map((t) => (
                    <Link key={t.id} href={`/projects/${t.projectId}/list`}>
                      <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-card-hover transition-colors cursor-pointer">
                        <div className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ background: t.project?.color ?? "var(--text-subtle)" }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{t.title}</p>
                          {t.project && <p className="text-[10px] text-subtle truncate">{t.project.name}</p>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {t.dueDate && (
                            <span className="text-[10px] font-semibold text-muted">
                              {format(new Date(t.dueDate), "h:mm a")}
                            </span>
                          )}
                          {t.assignee && <Avatar name={t.assignee.name} image={t.assignee.image} size="xs" />}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Task trend */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="lg:col-span-2 rounded-2xl p-5"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-xs)" }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-bold text-foreground">Task Activity</h3>
              <p className="text-xs text-muted mt-0.5">Last 14 days</p>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-semibold text-muted">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: "var(--accent)" }} />Completed
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: "var(--energy)" }} />Created
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={data.taskTrend}>
              <defs>
                <linearGradient id="gCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#818CF8" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#818CF8" stopOpacity={0}    />
                </linearGradient>
                <linearGradient id="gCreated" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#FBBF24" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#FBBF24" stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: "var(--text-subtle)", fontWeight: 600 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 9, fill: "var(--text-subtle)" }} tickLine={false} axisLine={false} width={18} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="completed" name="Completed" stroke="var(--accent)" fill="url(#gCompleted)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="created"   name="Created"   stroke="var(--energy)" fill="url(#gCreated)"   strokeWidth={2} dot={false} strokeDasharray="5 3" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Team activity */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="rounded-2xl p-5"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-xs)" }}>
          <div className="flex items-center gap-2 mb-5">
            <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: "var(--accent-muted)" }}>
              <Users className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Team Activity</h3>
              <p className="text-xs text-muted">Tasks assigned</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data.teamActivity} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 9, fill: "var(--text-subtle)" }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "var(--text-muted)", fontWeight: 600 }} tickLine={false} axisLine={false} width={44} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="tasks" name="Tasks" fill="var(--accent)" radius={[0, 6, 6, 0]} maxBarSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* ── Recent Tasks ── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}
        className="rounded-2xl overflow-hidden"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-xs)" }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: "var(--accent-muted)" }}>
              <Activity className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
            </div>
            <h3 className="text-sm font-bold text-foreground">Recent Tasks</h3>
          </div>
          <Link href="/tasks">
            <button className="text-[10px] font-bold hover:underline underline-offset-2 flex items-center gap-1" style={{ color: "var(--accent)" }}>
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </Link>
        </div>
        <div>
          {(data.recentTasks ?? []).map((task: Task, i: number) => {
            const overdue = task.dueDate && isPast(new Date(task.dueDate)) && task.status !== "DONE";
            const STATUS_DOT: Record<string, string> = { BACKLOG: "#6B7280", TODO: "#60A5FA", IN_PROGRESS: "#A78BFA", REVIEW: "#FBBF24", DONE: "#34D399" };
            const PRIORITY_V: Record<string, "default"|"info"|"warning"|"danger"> = { LOW: "default", MEDIUM: "info", HIGH: "warning", URGENT: "danger" };
            return (
              <Link key={task.id} href={`/projects/${task.projectId}/board`}>
                <div className="flex items-center gap-4 px-5 py-3 hover:bg-card-hover transition-colors cursor-pointer"
                  style={i < (data.recentTasks?.length ?? 0) - 1 ? { borderBottom: "1px solid var(--border)" } : {}}>
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: STATUS_DOT[task.status] ?? "#6B7280" }} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${task.status === "DONE" ? "line-through text-muted" : "text-foreground"}`}>{task.title}</p>
                    {task.project && (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="w-2 h-2 rounded-sm" style={{ background: task.project.color }} />
                        <span className="text-[11px] text-subtle">{task.project.name}</span>
                      </div>
                    )}
                  </div>
                  <div className="hidden sm:flex items-center gap-3 shrink-0">
                    <Badge variant={PRIORITY_V[task.priority] ?? "default"} size="sm">{task.priority}</Badge>
                    {task.dueDate && (
                      <span className={`text-[10px] font-semibold flex items-center gap-1 ${overdue ? "text-danger" : "text-subtle"}`}>
                        <Calendar className="w-3 h-3" />{format(new Date(task.dueDate), "MMM d")}
                      </span>
                    )}
                    <span className="text-[10px] text-subtle">{formatDistanceToNow(new Date(task.updatedAt), { addSuffix: true })}</span>
                    {task.assignee ? <Avatar name={task.assignee.name} image={task.assignee.image} size="xs" /> : null}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </motion.div>

      {/* ── Bottom row: status+meetings left, AI right ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Left col: Status + Meetings stacked */}
        <div className="lg:col-span-1 flex flex-col gap-4">

          {/* Status breakdown */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="rounded-[16px] p-5"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-xs)" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[13px] font-bold" style={{ color: "var(--text-foreground)", letterSpacing: "-0.01em" }}>
                Tasks by Status
              </h3>
              <span className="text-[11px] font-semibold tabular-nums" style={{ color: "var(--text-subtle)" }}>
                {data.totalTasks} total
              </span>
            </div>
            <div className="space-y-2.5">
              {Object.entries(STATUS_CONFIG).map(([status, cfg]) => {
                const count = (data.tasksByStatus as Record<string, number>)[status] ?? 0;
                const pct = data.totalTasks > 0 ? Math.round((count / data.totalTasks) * 100) : 0;
                return (
                  <div key={status}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="flex items-center gap-1.5 text-[12px] font-medium" style={{ color: "var(--text-muted)" }}>
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cfg.color }} />
                        {cfg.label}
                      </span>
                      <span className="text-[12px] font-bold tabular-nums" style={{ color: cfg.color }}>{count}</span>
                    </div>
                    <div className="h-[3px] rounded-full overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                        transition={{ delay: 0.4, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                        className="h-full rounded-full" style={{ background: cfg.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Upcoming meetings */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
            className="rounded-[16px] p-5 flex-1"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-xs)" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[13px] font-bold" style={{ color: "var(--text-foreground)", letterSpacing: "-0.01em" }}>Meetings</h3>
              <Link href="/meetings" className="flex items-center gap-1 text-[11px] font-bold transition-colors"
                style={{ color: "var(--accent)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.textDecoration = "underline"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.textDecoration = "none"; }}>
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {data.upcomingMeetings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-4 text-center">
                <Calendar className="w-6 h-6 mb-2" style={{ color: "var(--text-subtle)" }} />
                <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>No upcoming meetings</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {data.upcomingMeetings.slice(0, 3).map((m: Meeting) => (
                  <Link key={m.id} href="/meetings"
                    className="flex items-center gap-3 p-2.5 rounded-[10px] group transition-colors"
                    style={{ border: "1px solid transparent" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-card-hover)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.borderColor = "transparent"; }}>
                    <div className="w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0 text-[11px] font-black"
                      style={{ background: "var(--accent-muted)", color: "var(--accent)" }}>
                      {format(new Date(m.startTime), "d")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-semibold truncate" style={{ color: "var(--text-foreground)" }}>{m.title}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: "var(--text-subtle)" }}>{format(new Date(m.startTime), "MMM d · h:mm a")}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* Right col: AI insights — full height */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="lg:col-span-2 rounded-[16px] p-5 flex flex-col relative overflow-hidden"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-xs)", minHeight: "280px" }}>

          {/* Premium top border */}
          <div className="absolute top-0 left-0 right-0 h-[1.5px]"
            style={{ background: "linear-gradient(90deg, transparent 0%, var(--accent) 30%, #A78BFA 60%, transparent 100%)" }} />
          {/* Ambient glow */}
          <div className="absolute -top-16 right-0 w-80 h-80 pointer-events-none"
            style={{ background: "radial-gradient(circle, var(--accent-glow) 0%, transparent 60%)" }} />

          <div className="relative z-10 flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-[10px] flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, var(--accent), #A78BFA)", boxShadow: "var(--shadow-glow)" }}>
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <h3 className="text-[13px] font-bold" style={{ color: "var(--text-foreground)", letterSpacing: "-0.01em" }}>AI Insights</h3>
                <p className="text-[10px]" style={{ color: "var(--text-subtle)" }}>Powered by Claude</p>
              </div>
              {insightHistory.length > 0 && (
                <button onClick={() => setShowHistory((v) => !v)}
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors ml-1"
                  style={{ background: showHistory ? "var(--accent-muted)" : "var(--bg-elevated)", color: showHistory ? "var(--accent)" : "var(--text-subtle)", border: "1px solid var(--border)" }}>
                  History ({insightHistory.length})
                </button>
              )}
            </div>
            <button onClick={generateInsight} disabled={streaming}
              className="flex items-center gap-1.5 h-8 px-3.5 rounded-[8px] text-[12px] font-bold text-white disabled:opacity-60 transition-all hover:scale-[1.02]"
              style={{ background: "var(--accent)", boxShadow: "var(--shadow-glow-btn)" }}>
              {streaming
                ? <><span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Thinking…</>
                : <><Sparkles className="w-3 h-3" /> Generate</>
              }
            </button>
          </div>

          <div className="relative z-10 flex-1 overflow-y-auto min-h-[160px]">
            <AnimatePresence mode="wait">
              {showHistory ? (
                <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                  {insightHistory.map((insight) => (
                    <div key={insight.id} className="rounded-[10px] p-3"
                      style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                      <p className="text-[10px] font-semibold mb-2" style={{ color: "var(--text-subtle)" }}>
                        {formatDistanceToNow(new Date(insight.createdAt), { addSuffix: true })}
                      </p>
                      <MarkdownRenderer content={insight.content} />
                    </div>
                  ))}
                </motion.div>
              ) : aiInsight ? (
                <motion.div key="current" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <MarkdownRenderer content={aiInsight} />
                  {streaming && (
                    <div className="flex items-center gap-2 mt-3">
                      <div className="flex gap-1">
                        {[0, 1, 2].map((i) => (
                          <motion.div key={i} className="w-1.5 h-1.5 rounded-full"
                            style={{ background: "var(--accent)" }}
                            animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 0.9, delay: i * 0.2, repeat: Infinity }} />
                        ))}
                      </div>
                      <span className="text-[10px] font-semibold" style={{ color: "var(--accent)" }}>Generating…</span>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="h-full flex flex-col items-center justify-center text-center py-8">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
                    style={{ background: "var(--accent-muted)", border: "1px solid var(--accent-glow)" }}>
                    <Sparkles className="w-5 h-5" style={{ color: "var(--accent)" }} />
                  </div>
                  <p className="text-[13px] font-semibold mb-1" style={{ color: "var(--text-foreground)" }}>Ready to analyze your workspace</p>
                  <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>
                    Click <strong style={{ color: "var(--text-foreground)" }}>Generate</strong> for AI-powered priorities and insights.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* ── AI Standup widget ── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
        <StandupWidget />
      </motion.div>
    </div>
  );
}
