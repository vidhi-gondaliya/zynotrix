"use client";
import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, LayoutDashboard, Loader2, TrendingUp, CheckCircle2, AlertTriangle,
  Clock, Target, X, Activity, Users, ChevronRight,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  AreaChart, Area, PieChart, Pie, Cell, Legend,
} from "recharts";
import { Avatar } from "@/components/ui/Avatar";
import { format, isPast, subDays, startOfDay } from "date-fns";
import toast from "react-hot-toast";

// ── Types ──────────────────────────────────────────────────────────────────
interface DashboardRecord { id: string; title: string; isDefault: boolean; layout: string; }
interface DashMeta { total: number; done: number; inProgress: number; overdueTasks: number; projects: number; }
interface TaskTrend { date: string; done: number; created: number; }
interface ProjectHealth { id: string; name: string; color: string; progress: number; health: string; total: number; done: number; }
interface TeamMember { id: string; name: string | null; image: string | null; email: string; taskCount: number; doneCount: number; }
interface GoalSummary { id: string; title: string; type: string; status: string; pct: number; }
interface OverdueTask { id: string; title: string; priority: string; dueDate: string; projectName: string; projectColor: string; }

const PRIORITY_COLOR: Record<string, string> = { URGENT: "#FF4466", HIGH: "#FFC107", MEDIUM: "#60A5FA", LOW: "#6B7280" };
const HEALTH_COLOR = { ON_TRACK: "#16A34A", AT_RISK: "#D97706", OFF_TRACK: "#DC2626" } as const;
const PIE_COLORS   = ["#16A34A", "#7C3AED", "#60A5FA", "#D97706"];

// ── Tooltip style ──────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-3 py-2.5 text-xs shadow-xl"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      {label && <div className="font-700 mb-1" style={{ color: "var(--text-foreground)", fontWeight: 700 }}>{label}</div>}
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span style={{ color: "var(--text-muted)" }}>{p.name}:</span>
          <span className="font-700 tabular-nums" style={{ fontWeight: 700, color: "var(--text-foreground)" }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
};

// ── Widget shells ─────────────────────────────────────────────────────────
function Widget({ title, icon: Icon, children, className = "" }: {
  title: string; icon: React.ElementType; children: React.ReactNode; className?: string;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl flex flex-col overflow-hidden ${className}`}
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>
      <div className="flex items-center gap-2 px-5 py-4 shrink-0"
        style={{ borderBottom: "1px solid var(--border)" }}>
        <Icon className="w-4 h-4" style={{ color: "var(--accent)" }} />
        <span className="text-sm font-800" style={{ color: "var(--text-foreground)", fontWeight: 800 }}>{title}</span>
      </div>
      <div className="flex-1 p-4 min-h-0">{children}</div>
    </motion.div>
  );
}

// ── Widget implementations ─────────────────────────────────────────────────
function TaskCompletionWidget({ trends }: { trends: TaskTrend[] }) {
  return (
    <Widget title="Task Activity — Last 7 Days" icon={Activity} className="col-span-2">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={trends} barGap={4}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} width={24} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="done"    name="Completed" fill="#16A34A" radius={[4,4,0,0]} maxBarSize={24} />
          <Bar dataKey="created" name="Created"   fill="var(--accent)" radius={[4,4,0,0]} maxBarSize={24} opacity={0.6} />
        </BarChart>
      </ResponsiveContainer>
    </Widget>
  );
}

function ProjectHealthWidget({ projects }: { projects: ProjectHealth[] }) {
  const pieData = [
    { name: "On Track", value: projects.filter((p) => p.health === "ON_TRACK").length },
    { name: "At Risk",  value: projects.filter((p) => p.health === "AT_RISK").length },
    { name: "Off Track",value: projects.filter((p) => p.health === "OFF_TRACK").length },
  ].filter((d) => d.value > 0);

  return (
    <Widget title="Project Health" icon={CheckCircle2}>
      {projects.length === 0 ? (
        <div className="flex items-center justify-center h-full py-8 text-xs" style={{ color: "var(--text-muted)" }}>
          No projects yet
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          <div className="flex justify-center">
            <PieChart width={160} height={140}>
              <Pie data={pieData} cx={80} cy={65} innerRadius={42} outerRadius={62}
                paddingAngle={3} dataKey="value">
                {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </div>
          <div className="flex flex-col gap-1.5">
            {projects.slice(0, 4).map((p) => (
              <div key={p.id} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: HEALTH_COLOR[p.health as keyof typeof HEALTH_COLOR] ?? "#6B7280" }} />
                <span className="flex-1 text-xs truncate" style={{ color: "var(--text-foreground)" }}>{p.name}</span>
                <span className="text-xs font-700 tabular-nums" style={{ color: "var(--text-muted)", fontWeight: 700 }}>
                  {p.progress}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Widget>
  );
}

function TeamWorkloadWidget({ members }: { members: TeamMember[] }) {
  return (
    <Widget title="Team Workload" icon={Users}>
      {members.length === 0 ? (
        <div className="flex items-center justify-center h-full py-8 text-xs" style={{ color: "var(--text-muted)" }}>
          No team members
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {members.slice(0, 5).map((m) => {
            const pct = m.taskCount > 0 ? Math.round((m.doneCount / m.taskCount) * 100) : 0;
            const color = m.taskCount > 10 ? "#DC2626" : m.taskCount > 5 ? "#D97706" : "#16A34A";
            return (
              <div key={m.id} className="flex items-center gap-2.5">
                <Avatar name={m.name} image={m.image} size="xs" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs truncate font-600" style={{ color: "var(--text-foreground)", fontWeight: 600 }}>
                      {m.name ?? m.email.split("@")[0]}
                    </span>
                    <span className="text-[10px] tabular-nums" style={{ color: "var(--text-muted)" }}>
                      {m.doneCount}/{m.taskCount}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
                    <motion.div className="h-full rounded-full"
                      animate={{ width: `${Math.min((m.taskCount / 12) * 100, 100)}%` }}
                      transition={{ duration: 0.6 }}
                      style={{ background: color, boxShadow: `0 0 6px ${color}60` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Widget>
  );
}

function OverdueTasksWidget({ tasks }: { tasks: OverdueTask[] }) {
  return (
    <Widget title="Overdue Tasks" icon={AlertTriangle}>
      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 gap-2">
          <CheckCircle2 className="w-8 h-8" style={{ color: "#16A34A" }} />
          <p className="text-xs font-700" style={{ color: "#16A34A", fontWeight: 700 }}>All caught up!</p>
          <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>No overdue tasks</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2 max-h-52 overflow-y-auto">
          {tasks.map((t) => (
            <div key={t.id} className="flex items-start gap-2.5 p-2 rounded-lg"
              style={{ background: "var(--bg-elevated)" }}>
              <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                style={{ background: PRIORITY_COLOR[t.priority] ?? "#6B7280" }} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-600 truncate" style={{ color: "var(--text-foreground)", fontWeight: 600 }}>{t.title}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: t.projectColor }} />
                  <span className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>{t.projectName}</span>
                  <span className="text-[10px] text-red-400 ml-auto flex-shrink-0">
                    {format(new Date(t.dueDate), "MMM d")}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Widget>
  );
}

function GoalsProgressWidget({ goals }: { goals: GoalSummary[] }) {
  const TYPE_COLOR: Record<string, string> = { COMPANY: "#7C3AED", TEAM: "#2563EB", PERSONAL: "#059669" };
  return (
    <Widget title="Goals Progress" icon={Target}>
      {goals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 gap-2">
          <Target className="w-8 h-8" style={{ color: "var(--text-muted)" }} />
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>No goals yet</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {goals.slice(0, 5).map((g) => {
            const color = TYPE_COLOR[g.type] ?? "#7C3AED";
            return (
              <div key={g.id}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs truncate font-600 flex-1 mr-2"
                    style={{ color: "var(--text-foreground)", fontWeight: 600 }}>{g.title}</span>
                  <span className="text-[10px] font-800 tabular-nums flex-shrink-0"
                    style={{ color, fontWeight: 800 }}>{g.pct}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
                  <motion.div className="h-full rounded-full" animate={{ width: `${g.pct}%` }}
                    transition={{ duration: 0.7 }}
                    style={{ background: g.pct >= 100 ? "#16A34A" : color, boxShadow: `0 0 6px ${color}50` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Widget>
  );
}

function StatsWidget({ meta }: { meta: DashMeta }) {
  const items = [
    { label: "Total Tasks",   val: meta.total,      color: "var(--accent)" },
    { label: "Completed",     val: meta.done,       color: "#16A34A" },
    { label: "In Progress",   val: meta.inProgress, color: "#60A5FA" },
    { label: "Overdue",       val: meta.overdueTasks, color: "#DC2626" },
  ];
  return (
    <Widget title="Overview" icon={LayoutDashboard} className="col-span-2">
      <div className="grid grid-cols-4 gap-3">
        {items.map((s) => (
          <div key={s.label} className="text-center p-3 rounded-xl" style={{ background: "var(--bg-elevated)" }}>
            <div className="text-2xl font-900 tabular-nums" style={{ color: s.color, fontWeight: 900 }}>{s.val}</div>
            <div className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>{s.label}</div>
          </div>
        ))}
      </div>
    </Widget>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function DashboardsPage() {
  const [boards, setBoards]     = useState<DashboardRecord[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading]   = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  // Widget data
  const [meta,     setMeta]     = useState<DashMeta | null>(null);
  const [trends,   setTrends]   = useState<TaskTrend[]>([]);
  const [projects, setProjects] = useState<ProjectHealth[]>([]);
  const [members,  setMembers]  = useState<TeamMember[]>([]);
  const [goals,    setGoals]    = useState<GoalSummary[]>([]);
  const [overdue,  setOverdue]  = useState<OverdueTask[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboards").then((r) => r.json()).then((data) => {
      setBoards(data);
      if (data.length > 0) setActiveId(data.find((d: DashboardRecord) => d.isDefault)?.id ?? data[0].id);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const loadWidgetData = useCallback(async () => {
    setDataLoading(true);
    try {
      const [dashRes, portRes, goalsRes] = await Promise.all([
        fetch("/api/dashboard"),
        fetch("/api/portfolio"),
        fetch("/api/goals"),
      ]);
      const [dash, port, goalsData] = await Promise.all([dashRes.json(), portRes.json(), goalsRes.json()]);

      // Meta stats
      const allTasks: any[] = dash.projects?.flatMap((p: any) => p.tasks) ?? [];
      const now = new Date();
      setMeta({
        total:       allTasks.length,
        done:        allTasks.filter((t: any) => t.status === "DONE").length,
        inProgress:  allTasks.filter((t: any) => t.status === "IN_PROGRESS").length,
        overdueTasks: allTasks.filter((t: any) => t.dueDate && new Date(t.dueDate) < now && t.status !== "DONE").length,
        projects:    dash.projects?.length ?? 0,
      });

      // 7-day trend
      const dayMap: Record<string, { done: number; created: number }> = {};
      for (let i = 6; i >= 0; i--) {
        const d = startOfDay(subDays(now, i));
        dayMap[format(d, "MMM d")] = { done: 0, created: 0 };
      }
      allTasks.forEach((t: any) => {
        const upd = format(startOfDay(new Date(t.updatedAt)), "MMM d");
        const crt = format(startOfDay(new Date(t.createdAt)), "MMM d");
        if (dayMap[upd] && t.status === "DONE") dayMap[upd].done++;
        if (dayMap[crt]) dayMap[crt].created++;
      });
      setTrends(Object.entries(dayMap).map(([date, v]) => ({ date, ...v })));

      // Project health
      setProjects((port.projects ?? []).map((p: any) => ({
        id: p.id, name: p.name, color: p.color,
        progress: p.progress, health: p.health,
        total: p.total, done: p.done,
      })));

      // Team workload — from existing workload data if available, else build from tasks
      const memberMap: Record<string, TeamMember> = {};
      (dash.projects ?? []).forEach((proj: any) => {
        (proj.tasks ?? []).forEach((t: any) => {
          if (!t.assigneeId) return;
          if (!memberMap[t.assigneeId]) {
            memberMap[t.assigneeId] = { id: t.assigneeId, name: null, image: null, email: "", taskCount: 0, doneCount: 0 };
          }
          memberMap[t.assigneeId].taskCount++;
          if (t.status === "DONE") memberMap[t.assigneeId].doneCount++;
        });
      });
      // Enrich names from org members
      (dash.members ?? []).forEach((m: any) => {
        if (memberMap[m.user.id]) {
          memberMap[m.user.id].name  = m.user.name;
          memberMap[m.user.id].email = m.user.email;
        }
      });
      setMembers(Object.values(memberMap).sort((a, b) => b.taskCount - a.taskCount));

      // Overdue tasks
      const od: OverdueTask[] = [];
      (dash.projects ?? []).forEach((proj: any) => {
        (proj.tasks ?? []).filter((t: any) => t.dueDate && new Date(t.dueDate) < now && t.status !== "DONE").forEach((t: any) => {
          od.push({ id: t.id, title: t.title ?? "Untitled", priority: t.priority ?? "MEDIUM",
            dueDate: t.dueDate, projectName: proj.name, projectColor: proj.color });
        });
      });
      setOverdue(od.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()));

      // Goals
      setGoals((goalsData as any[]).map((g: any) => {
        const krs = g.keyResults ?? [];
        const pct = krs.length > 0
          ? Math.round(krs.reduce((s: number, k: any) => s + (k.targetValue > 0 ? Math.min(k.currentValue / k.targetValue, 1) : 0), 0) / krs.length * 100)
          : 0;
        return { id: g.id, title: g.title, type: g.type, status: g.status, pct };
      }));
    } catch (e) {
      console.error(e);
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => { if (activeId) loadWidgetData(); }, [activeId, loadWidgetData]);

  const handleCreateDashboard = async () => {
    if (!newTitle.trim()) return;
    const res = await fetch("/api/dashboards", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle.trim() }),
    });
    if (!res.ok) { toast.error("Failed to create dashboard"); return; }
    const board = await res.json();
    setBoards((prev) => [...prev, board]);
    setActiveId(board.id);
    setCreating(false);
    setNewTitle("");
    toast.success("Dashboard created!");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-40">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--accent)" }} />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight" style={{ color: "var(--text-foreground)", fontWeight: 900 }}>
            Dashboards
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Custom views with real-time insights across all your work
          </p>
        </div>
        <button onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-700 hover:opacity-90 transition-opacity"
          style={{ background: "var(--accent)", color: "#fff", fontWeight: 700, boxShadow: "0 4px 14px var(--accent-glow)" }}>
          <Plus className="w-4 h-4" /> New Dashboard
        </button>
      </div>

      {/* Dashboard tabs */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
        {boards.map((b) => (
          <button key={b.id} onClick={() => setActiveId(b.id)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-700 whitespace-nowrap transition-all flex-shrink-0"
            style={{
              fontWeight: 700,
              background: activeId === b.id ? "var(--accent)" : "var(--bg-elevated)",
              color:      activeId === b.id ? "#fff" : "var(--text-muted)",
            }}>
            <LayoutDashboard className="w-3.5 h-3.5" />
            {b.title}
            {b.isDefault && (
              <span className="text-[9px] opacity-70">default</span>
            )}
          </button>
        ))}

        {/* New dashboard inline input */}
        <AnimatePresence>
          {creating && (
            <motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              className="flex items-center gap-2 px-3 py-2 rounded-xl flex-shrink-0"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
              <input autoFocus value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleCreateDashboard(); if (e.key === "Escape") { setCreating(false); setNewTitle(""); } }}
                placeholder="Dashboard name…"
                className="text-xs bg-transparent outline-none w-32"
                style={{ color: "var(--text-foreground)" }} />
              <button onClick={handleCreateDashboard} className="text-xs font-700 px-2 py-0.5 rounded-lg"
                style={{ background: "var(--accent)", color: "#fff", fontWeight: 700 }}>Save</button>
              <button onClick={() => { setCreating(false); setNewTitle(""); }}>
                <X className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Widget grid */}
      {dataLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--accent)" }} />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {/* Row 1: Overview stats (full width) */}
          {meta && <StatsWidget meta={meta} />}

          {/* Row 2: Task activity (full width) */}
          <TaskCompletionWidget trends={trends} />

          {/* Row 3: 3 side-by-side */}
          <ProjectHealthWidget  projects={projects} />
          <TeamWorkloadWidget   members={members} />

          {/* Row 4: Overdue + Goals */}
          <OverdueTasksWidget   tasks={overdue} />
          <GoalsProgressWidget  goals={goals} />
        </div>
      )}
    </div>
  );
}
