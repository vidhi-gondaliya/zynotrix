"use client";
import { useEffect, useState } from "react";
import { Users, AlertTriangle, TrendingUp, TrendingDown, Minus, Calendar, BarChart2, Sparkles, Loader2, ArrowRight, X } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { format, isPast, addDays, startOfWeek, endOfWeek } from "date-fns";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  AreaChart, Area, ReferenceLine,
} from "recharts";

interface User { id: string; name: string | null; email: string; image: string | null; role: string; }
interface Task {
  id: string; title: string; status: string; priority: string;
  dueDate: string | null; projectId: string; createdAt: string; updatedAt: string;
  project?: { name: string; color: string };
  assigneeId?: string;
}
interface UserWorkload {
  user: User; tasks: Task[]; totalTasks: number; activeTasks: number;
  overdueTasks: number; doneTasks: number; capacity: number;
  velocity: number; velocityTrend: "up" | "down" | "stable";
  nextWeekDue: number;
}

const PRIORITY_COLOR: Record<string, string> = { URGENT: "#FF4466", HIGH: "#FFC107", MEDIUM: "#60A5FA", LOW: "#6B7280" };
const STATUS_COLOR:   Record<string, string> = { BACKLOG: "#6B7280", TODO: "#60A5FA", IN_PROGRESS: "#9D6BFF", REVIEW: "#FFC107", DONE: "#00F090" };

function CapacityBar({ value }: { value: number }) {
  const pct   = Math.min(value, 100);
  const color = value >= 90 ? "#FF4466" : value >= 70 ? "#FFC107" : "#00F090";
  return (
    <div className="relative h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
      <motion.div className="absolute inset-y-0 left-0 rounded-full"
        initial={{ width: 0 }} animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        style={{ background: color, boxShadow: `0 0 8px ${color}60` }} />
    </div>
  );
}

function TrendBadge({ trend, velocity }: { trend: "up" | "down" | "stable"; velocity: number }) {
  const cfg = {
    up:     { icon: <TrendingUp className="w-3 h-3" />,   color: "#00F090", label: `↑ ${velocity}/wk` },
    down:   { icon: <TrendingDown className="w-3 h-3" />, color: "#FF4466", label: `↓ ${velocity}/wk` },
    stable: { icon: <Minus className="w-3 h-3" />,         color: "#60A5FA", label: `→ ${velocity}/wk` },
  }[trend];
  return (
    <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ background: `${cfg.color}18`, color: cfg.color }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

// Build a 4-week task-due histogram buckets from task list
function buildForecast(tasks: Task[]) {
  const now = new Date();
  const buckets = [
    { label: "This week",  start: now,              end: addDays(now, 7)  },
    { label: "Next week",  start: addDays(now, 7),  end: addDays(now, 14) },
    { label: "Week 3",     start: addDays(now, 14), end: addDays(now, 21) },
    { label: "Week 4+",    start: addDays(now, 21), end: addDays(now, 42) },
  ];
  return buckets.map((b) => ({
    label: b.label,
    due:   tasks.filter((t) => {
      if (!t.dueDate || t.status === "DONE") return false;
      const d = new Date(t.dueDate);
      return d >= b.start && d < b.end;
    }).length,
    done: tasks.filter((t) => {
      if (!t.dueDate || t.status !== "DONE") return false;
      const d = new Date(t.dueDate);
      return d >= b.start && d < b.end;
    }).length,
  }));
}

// Build velocity data: tasks completed per day over last 14 days
function buildVelocityChart(tasks: Task[]) {
  return Array.from({ length: 14 }, (_, i) => {
    const d       = new Date(Date.now() - (13 - i) * 86400000);
    const dateStr = d.toISOString().split("T")[0];
    const dayStart = new Date(dateStr + "T00:00:00Z");
    const dayEnd   = new Date(dateStr + "T23:59:59Z");
    return {
      date:      d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      completed: tasks.filter((t) => t.status === "DONE" && new Date(t.updatedAt) >= dayStart && new Date(t.updatedAt) <= dayEnd).length,
      created:   tasks.filter((t) => new Date(t.createdAt) >= dayStart && new Date(t.createdAt) <= dayEnd).length,
    };
  });
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-3 py-2 text-xs shadow-float"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <p className="font-bold text-foreground mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

interface RebalanceRec { taskId: string; taskTitle: string; fromUserName: string | null; toUserId: string; toUserName: string; reason: string; }

export default function WorkloadPage() {
  const [workloads, setWorkloads]     = useState<UserWorkload[]>([]);
  const [allTasks, setAllTasks]       = useState<Task[]>([]);
  const [loading, setLoading]         = useState(true);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [activeTab, setActiveTab]     = useState<"team" | "forecast" | "velocity">("team");
  const [rebalancing, setRebalancing] = useState(false);
  const [rebalanceResult, setRebalanceResult] = useState<{ recommendations: RebalanceRec[]; summary: string; healthScore: number } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/users").then((r) => r.json()),
      fetch("/api/tasks").then((r) => r.json()),
    ]).then(([users, tasks]: [User[], Task[]]) => {
      setAllTasks(tasks);
      const now = new Date();
      const weekAgo      = new Date(Date.now() - 7 * 86400000);
      const twoWeeksAgo  = new Date(Date.now() - 14 * 86400000);

      const data: UserWorkload[] = users.map((user) => {
        const userTasks = (tasks as Task[]).filter((t) => t.assigneeId === user.id);
        const active    = userTasks.filter((t) => t.status === "IN_PROGRESS" || t.status === "TODO");
        const overdue   = userTasks.filter((t) => t.dueDate && isPast(new Date(t.dueDate)) && t.status !== "DONE");
        const done      = userTasks.filter((t) => t.status === "DONE");

        // Velocity: done tasks in last 7 days
        const recentDone    = done.filter((t) => new Date(t.updatedAt) >= weekAgo).length;
        const prevWeekDone  = done.filter((t) => new Date(t.updatedAt) >= twoWeeksAgo && new Date(t.updatedAt) < weekAgo).length;
        const velocityTrend: "up" | "down" | "stable" =
          recentDone > prevWeekDone + 1 ? "up" :
          recentDone < prevWeekDone - 1 ? "down" : "stable";

        // Next week due
        const nextWeekDue = userTasks.filter((t) => {
          if (!t.dueDate || t.status === "DONE") return false;
          const d = new Date(t.dueDate);
          return d >= now && d < addDays(now, 7);
        }).length;

        const capacity = Math.min(Math.round((active.length / 10) * 100), 100);
        return {
          user, tasks: userTasks, totalTasks: userTasks.length,
          activeTasks: active.length, overdueTasks: overdue.length, doneTasks: done.length,
          capacity, velocity: recentDone, velocityTrend, nextWeekDue,
        };
      }).filter((w) => w.totalTasks > 0).sort((a, b) => b.activeTasks - a.activeTasks);

      setWorkloads(data);
      setLoading(false);
    });
  }, []);

  const overloaded  = workloads.filter((w) => w.capacity >= 80 || w.overdueTasks > 0);
  const teamTotal   = workloads.reduce((s, w) => s + w.activeTasks, 0);
  const avgCapacity = workloads.length > 0 ? Math.round(workloads.reduce((s, w) => s + w.capacity, 0) / workloads.length) : 0;
  const forecast    = buildForecast(allTasks);
  const velocity    = buildVelocityChart(allTasks);
  const avgVelocity = Math.round(velocity.slice(-7).reduce((s, d) => s + d.completed, 0) / 7);

  async function runRebalance() {
    setRebalancing(true);
    try {
      const res = await fetch("/api/ai/rebalance", { method: "POST" });
      const data = await res.json();
      setRebalanceResult(data);
    } catch { toast.error("Rebalance failed"); }
    finally { setRebalancing(false); }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #60A5FA, #9D6BFF)", boxShadow: "0 0 20px rgba(96,165,250,0.40)" }}>
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black" style={{
              background: "linear-gradient(135deg, var(--text-foreground) 0%, #8B5CF6 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              letterSpacing: "-0.03em",
            }}>Team Workload</h1>
            <p className="text-[11px]" style={{ color: "var(--text-subtle)" }}>{workloads.length} members · {teamTotal} active tasks</p>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 p-1 rounded-xl"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
          {([
            { key: "team",     label: "Team",     icon: <Users className="w-3.5 h-3.5" /> },
            { key: "forecast", label: "Forecast",  icon: <Calendar className="w-3.5 h-3.5" /> },
            { key: "velocity", label: "Velocity",  icon: <BarChart2 className="w-3.5 h-3.5" /> },
          ] as const).map(({ key, label, icon }) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                ${activeTab === key ? "text-foreground" : "text-muted hover:text-foreground"}`}
              style={activeTab === key ? { background: "var(--bg-card)", boxShadow: "var(--shadow-xs)" } : {}}>
              {icon} {label}
            </button>
          ))}
        </div>
        <button onClick={runRebalance} disabled={rebalancing}
          className="flex items-center gap-2 h-9 px-4 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
          style={{ background: "linear-gradient(135deg,#9D6BFF,#00CFFF)", boxShadow: "0 4px 14px rgba(157,107,255,0.35)" }}>
          {rebalancing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          AI Rebalance
        </button>
      </div>

      {/* AI Rebalance result */}
      <AnimatePresence>
        {rebalanceResult && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="rounded-2xl p-5 space-y-4"
            style={{ background: "var(--bg-card)", border: "1px solid var(--accent)", boxShadow: "0 0 0 3px var(--accent-muted)" }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" style={{ color: "var(--accent)" }} />
                <span className="text-sm font-black text-foreground">AI Workload Recommendations</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: rebalanceResult.healthScore >= 70 ? "rgba(0,240,144,0.12)" : "rgba(255,193,7,0.12)", color: rebalanceResult.healthScore >= 70 ? "#00F090" : "#FFC107" }}>
                  Team Health: {rebalanceResult.healthScore}/100
                </span>
              </div>
              <button onClick={() => setRebalanceResult(null)} style={{ color: "var(--text-muted)" }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-muted">{rebalanceResult.summary}</p>
            {rebalanceResult.recommendations.length === 0 ? (
              <p className="text-xs text-success font-semibold">✓ Team workload is well balanced — no reassignments needed</p>
            ) : (
              <div className="space-y-2">
                {rebalanceResult.recommendations.map((rec, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                    style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{rec.taskTitle}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted">{rec.fromUserName ?? "Unassigned"}</span>
                        <ArrowRight className="w-3 h-3 text-subtle" />
                        <span className="text-[10px] font-bold" style={{ color: "var(--accent)" }}>{rec.toUserName}</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-muted max-w-[160px] text-right">{rec.reason}</p>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Alert */}
      {overloaded.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-4 flex items-start gap-3"
          style={{ background: "rgba(255,68,102,0.08)", border: "1px solid rgba(255,68,102,0.25)" }}>
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#FF4466" }} />
          <div>
            <p className="text-sm font-bold" style={{ color: "#FF4466" }}>
              {overloaded.length} team member{overloaded.length > 1 ? "s" : ""} may be overloaded
            </p>
            <p className="text-xs text-muted mt-0.5">
              {overloaded.map((w) => w.user.name?.split(" ")[0]).join(", ")} — consider redistributing.
            </p>
          </div>
        </motion.div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Active",  value: teamTotal,          gradient: "linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)", shadow: "rgba(139,92,246,0.35)" },
          { label: "Overloaded",    value: overloaded.length,  gradient: "linear-gradient(135deg, #F43F5E 0%, #BE123C 100%)", shadow: "rgba(244,63,94,0.35)" },
          { label: "Team Members",  value: workloads.length,   gradient: "linear-gradient(135deg, #06B6D4 0%, #0284C7 100%)", shadow: "rgba(6,182,212,0.35)" },
          { label: "Avg Capacity",  value: `${avgCapacity}%`,  gradient: overloaded.length > 0 ? "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)" : "linear-gradient(135deg, #22C55E 0%, #15803D 100%)", shadow: overloaded.length > 0 ? "rgba(245,158,11,0.35)" : "rgba(34,197,94,0.35)" },
        ].map((s) => (
          <div key={s.label} className="relative rounded-[16px] p-4 overflow-hidden"
            style={{ background: s.gradient, boxShadow: `0 4px 20px ${s.shadow}` }}>
            <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full" style={{ background: "rgba(255,255,255,0.10)" }} />
            <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }} />
            <p className="text-[26px] font-black text-white relative z-10">{s.value}</p>
            <p className="text-[11px] font-semibold text-white/80 mt-0.5 relative z-10">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── TEAM TAB ── */}
      {activeTab === "team" && (
        <div className="space-y-3">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <div key={i} className="rounded-2xl p-5 skeleton h-24" />)
          ) : workloads.map((w, i) => {
            const isOver     = w.capacity >= 80 || w.overdueTasks > 0;
            const isExpanded = expandedUser === w.user.id;
            return (
              <motion.div key={w.user.id}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                className="rounded-2xl overflow-hidden"
                style={{ background: "var(--bg-card)", border: `1px solid ${isOver ? "rgba(255,68,102,0.20)" : "var(--border)"}` }}>
                <div className="p-5 cursor-pointer" onClick={() => setExpandedUser(isExpanded ? null : w.user.id)}>
                  <div className="flex items-center gap-4">
                    <Avatar name={w.user.name} image={w.user.image} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <p className="text-sm font-bold text-foreground">{w.user.name ?? w.user.email}</p>
                        {isOver && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{ background: "rgba(255,68,102,0.12)", color: "#FF4466" }}>
                            Overloaded
                          </span>
                        )}
                        <TrendBadge trend={w.velocityTrend} velocity={w.velocity} />
                      </div>
                      <CapacityBar value={w.capacity} />
                      <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                        <span className="text-[11px] text-subtle font-semibold">{w.capacity}% capacity</span>
                        <span className="text-[11px]" style={{ color: "#9D6BFF" }}>{w.activeTasks} active</span>
                        {w.overdueTasks > 0 && <span className="text-[11px]" style={{ color: "#FF4466" }}>{w.overdueTasks} overdue</span>}
                        <span className="text-[11px]" style={{ color: "#00F090" }}>{w.doneTasks} done</span>
                        {w.nextWeekDue > 0 && <span className="text-[11px]" style={{ color: "#FFC107" }}>{w.nextWeekDue} due this week</span>}
                      </div>
                    </div>
                    <div className="hidden sm:flex items-center gap-3 shrink-0">
                      <div className="text-center">
                        <p className="text-lg font-black leading-none text-muted">{w.totalTasks}</p>
                        <p className="text-[9px] text-subtle mt-0.5">Total</p>
                      </div>
                    </div>
                  </div>
                </div>

                {isExpanded && w.tasks.length > 0 && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                    style={{ borderTop: "1px solid var(--border)" }}>
                    {w.tasks.slice(0, 8).map((task, ti) => {
                      const overdue = task.dueDate && isPast(new Date(task.dueDate)) && task.status !== "DONE";
                      return (
                        <div key={task.id} className="flex items-center gap-3 px-5 py-2.5"
                          style={ti < w.tasks.length - 1 ? { borderBottom: "1px solid var(--border)" } : {}}>
                          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: STATUS_COLOR[task.status] ?? "#6B7280" }} />
                          <span className={`flex-1 text-xs font-medium truncate ${task.status === "DONE" ? "line-through text-muted" : "text-foreground"}`}>{task.title}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] font-bold" style={{ color: PRIORITY_COLOR[task.priority] }}>{task.priority}</span>
                            {task.dueDate && (
                              <span className={`text-[10px] font-semibold ${overdue ? "text-danger" : "text-subtle"}`}>
                                {format(new Date(task.dueDate), "MMM d")}
                              </span>
                            )}
                            {task.project && (
                              <span className="flex items-center gap-1 text-[10px] text-subtle">
                                <div className="w-1.5 h-1.5 rounded-sm" style={{ background: task.project.color }} />
                                {task.project.name}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {w.tasks.length > 8 && (
                      <div className="px-5 py-2.5 text-[11px] text-subtle">+{w.tasks.length - 8} more tasks</div>
                    )}
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── FORECAST TAB ── */}
      {activeTab === "forecast" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="space-y-4">
          <div className="rounded-2xl p-5"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-xs)" }}>
            <div className="mb-4">
              <h3 className="text-sm font-bold text-foreground">Due Date Horizon</h3>
              <p className="text-xs text-muted mt-0.5">Upcoming task deadlines by week — plan capacity proactively</p>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={forecast} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--text-subtle)", fontWeight: 600 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 9, fill: "var(--text-subtle)" }} tickLine={false} axisLine={false} width={20} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="due"  name="Tasks Due"  fill="#9D6BFF" radius={[4,4,0,0]} maxBarSize={28} />
                <Bar dataKey="done" name="Tasks Done" fill="#00F090" radius={[4,4,0,0]} maxBarSize={28} opacity={0.7} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-6 mt-3">
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-muted">
                <span className="w-2 h-2 rounded-sm" style={{ background: "#9D6BFF" }} /> Tasks Due
              </span>
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-muted">
                <span className="w-2 h-2 rounded-sm" style={{ background: "#00F090" }} /> Already Done
              </span>
            </div>
          </div>

          {/* Per-member next-week forecast */}
          <div className="rounded-2xl overflow-hidden"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <div className="px-5 py-3" style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-elevated)" }}>
              <h3 className="text-sm font-bold text-foreground">Next 7 Days — Per Member</h3>
            </div>
            {workloads.filter((w) => w.nextWeekDue > 0 || w.activeTasks > 0).map((w, i, arr) => (
              <div key={w.user.id} className="flex items-center gap-4 px-5 py-3"
                style={i < arr.length - 1 ? { borderBottom: "1px solid var(--border)" } : {}}>
                <Avatar name={w.user.name} image={w.user.image} size="sm" />
                <span className="text-sm font-semibold text-foreground flex-1">{w.user.name ?? w.user.email}</span>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-center">
                    <p className="text-sm font-black" style={{ color: "#FFC107" }}>{w.nextWeekDue}</p>
                    <p className="text-[9px] text-subtle">due</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-black" style={{ color: "#9D6BFF" }}>{w.activeTasks}</p>
                    <p className="text-[9px] text-subtle">active</p>
                  </div>
                  <div className="w-24">
                    <CapacityBar value={w.capacity} />
                    <p className="text-[10px] text-subtle mt-1">{w.capacity}%</p>
                  </div>
                </div>
              </div>
            ))}
            {workloads.filter((w) => w.nextWeekDue > 0 || w.activeTasks > 0).length === 0 && (
              <div className="px-5 py-8 text-center text-sm text-muted">No tasks due in the next 7 days</div>
            )}
          </div>
        </motion.div>
      )}

      {/* ── VELOCITY TAB ── */}
      {activeTab === "velocity" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="rounded-2xl p-5"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-xs)" }}>
            <div className="mb-4">
              <h3 className="text-sm font-bold text-foreground">Team Velocity — Last 14 Days</h3>
              <p className="text-xs text-muted mt-0.5">Tasks completed vs created · avg {avgVelocity}/day</p>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={velocity}>
                <defs>
                  <linearGradient id="gDone" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#00F090" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#00F090" stopOpacity={0}    />
                  </linearGradient>
                  <linearGradient id="gCreate" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#9D6BFF" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#9D6BFF" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: "var(--text-subtle)", fontWeight: 600 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 9, fill: "var(--text-subtle)" }} tickLine={false} axisLine={false} width={18} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={avgVelocity} stroke="#FFC107" strokeDasharray="4 3"
                  label={{ value: `avg ${avgVelocity}`, position: "right", fontSize: 9, fill: "#FFC107" }} />
                <Area type="monotone" dataKey="completed" name="Completed" stroke="#00F090" fill="url(#gDone)"   strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="created"   name="Created"   stroke="#9D6BFF" fill="url(#gCreate)" strokeWidth={2} dot={false} strokeDasharray="4 2" />
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-6 mt-3">
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-muted">
                <span className="w-2 h-2 rounded-full" style={{ background: "#00F090" }} /> Completed
              </span>
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-muted">
                <span className="w-2 h-2 rounded-full" style={{ background: "#9D6BFF" }} /> Created
              </span>
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-muted">
                <span className="w-2 h-2 rounded-full" style={{ background: "#FFC107" }} /> Daily avg
              </span>
            </div>
          </div>

          {/* Per-member velocity */}
          <div className="rounded-2xl overflow-hidden"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <div className="px-5 py-3" style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-elevated)" }}>
              <h3 className="text-sm font-bold text-foreground">Member Velocity</h3>
            </div>
            {workloads.map((w, i, arr) => (
              <div key={w.user.id} className="flex items-center gap-4 px-5 py-3"
                style={i < arr.length - 1 ? { borderBottom: "1px solid var(--border)" } : {}}>
                <Avatar name={w.user.name} image={w.user.image} size="sm" />
                <span className="text-sm font-semibold text-foreground flex-1">{w.user.name ?? w.user.email}</span>
                <TrendBadge trend={w.velocityTrend} velocity={w.velocity} />
                <div className="text-center ml-2">
                  <p className="text-sm font-black text-foreground">{w.doneTasks}</p>
                  <p className="text-[9px] text-subtle">total done</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
