"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, LayoutDashboard, Loader2, TrendingUp, CheckCircle2, AlertTriangle,
  Clock, Target, X, Activity, Users, Sparkles, GripVertical, Settings2,
  Maximize2, Minimize2, Trash2, ChevronRight, BarChart2, PieChart as PieIcon,
  AreaChart, List, Zap, RefreshCw,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  AreaChart as ReAreaChart, Area, PieChart, Pie, Cell,
} from "recharts";
import {
  DndContext, DragEndEvent, PointerSensor, useSensor, useSensors,
  closestCenter, DragOverlay, DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext, arrayMove, rectSortingStrategy, useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Avatar } from "@/components/ui/Avatar";
import { format, subDays, startOfDay } from "date-fns";
import toast from "react-hot-toast";

// ── Types ──────────────────────────────────────────────────────────────────
type WidgetSize = "half" | "wide";
type WidgetType =
  | "overview_stats" | "task_activity" | "project_health" | "team_workload"
  | "overdue_tasks"  | "goals_progress" | "velocity_chart" | "priority_breakdown"
  | "task_status_funnel" | "recent_activity";

interface WidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
  size: WidgetSize;
  config: Record<string, unknown>;
}

interface DashboardRecord { id: string; title: string; isDefault: boolean; layout: string; }
interface DashMeta { total: number; done: number; inProgress: number; overdueTasks: number; projects: number; }
interface TaskTrend { date: string; done: number; created: number; }
interface ProjectHealth { id: string; name: string; color: string; progress: number; health: string; total: number; done: number; }
interface TeamMember { id: string; name: string | null; image: string | null; email: string; taskCount: number; doneCount: number; }
interface GoalSummary { id: string; title: string; type: string; status: string; pct: number; }
interface OverdueTask { id: string; title: string; priority: string; dueDate: string; projectName: string; projectColor: string; }

// ── Constants ──────────────────────────────────────────────────────────────
const PRIORITY_COLOR: Record<string, string> = { URGENT: "#FF4466", HIGH: "#FFC107", MEDIUM: "#60A5FA", LOW: "#6B7280" };
const HEALTH_COLOR = { ON_TRACK: "#16A34A", AT_RISK: "#D97706", OFF_TRACK: "#DC2626" } as const;
const PIE_COLORS   = ["#16A34A", "#7C3AED", "#60A5FA", "#D97706", "#F97316"];

const CATALOG: {
  type: WidgetType; label: string; desc: string; icon: React.ElementType;
  defaultSize: WidgetSize; defaultConfig: Record<string, unknown>;
}[] = [
  { type: "overview_stats",      label: "Overview Stats",       icon: LayoutDashboard, defaultSize: "wide", defaultConfig: {},                                 desc: "Total, completed, in-progress & overdue task counts" },
  { type: "task_activity",       label: "Task Activity",        icon: Activity,        defaultSize: "wide", defaultConfig: { timeRange: "7", chartType: "bar" }, desc: "Tasks created vs completed over time" },
  { type: "project_health",      label: "Project Health",       icon: CheckCircle2,    defaultSize: "half", defaultConfig: {},                                 desc: "Project status breakdown as a pie chart" },
  { type: "team_workload",       label: "Team Workload",        icon: Users,           defaultSize: "half", defaultConfig: {},                                 desc: "Who has how many tasks and completion rate" },
  { type: "overdue_tasks",       label: "Overdue Tasks",        icon: AlertTriangle,   defaultSize: "half", defaultConfig: { limit: 10 },                     desc: "Tasks that are past their due date" },
  { type: "goals_progress",      label: "Goals Progress",       icon: Target,          defaultSize: "half", defaultConfig: { goalType: "ALL" },               desc: "OKR / goal completion percentages" },
  { type: "velocity_chart",      label: "Velocity Chart",       icon: TrendingUp,      defaultSize: "wide", defaultConfig: { weeks: 8 },                      desc: "Tasks completed per week over time" },
  { type: "priority_breakdown",  label: "Priority Breakdown",   icon: BarChart2,       defaultSize: "half", defaultConfig: { chartType: "bar" },              desc: "Task distribution by priority" },
  { type: "task_status_funnel",  label: "Task Status Funnel",   icon: PieIcon,         defaultSize: "half", defaultConfig: { chartType: "pie" },              desc: "Tasks split by status" },
  { type: "recent_activity",     label: "Recent Activity",      icon: Clock,           defaultSize: "wide", defaultConfig: { limit: 10 },                     desc: "Latest task updates across all projects" },
];

// ── Shared chart tooltip ───────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; color: string; value: number }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-3 py-2.5 text-xs shadow-xl"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      {label && <div className="font-700 mb-1" style={{ color: "var(--text-foreground)", fontWeight: 700 }}>{label}</div>}
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span style={{ color: "var(--text-muted)" }}>{p.name}:</span>
          <span className="font-700 tabular-nums" style={{ fontWeight: 700, color: "var(--text-foreground)" }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
};

// ── Widget content renderers ───────────────────────────────────────────────
type DataBundle = {
  meta: DashMeta | null;
  trends: TaskTrend[];
  projects: ProjectHealth[];
  members: TeamMember[];
  goals: GoalSummary[];
  overdue: OverdueTask[];
  allTasks: { status: string; priority: string; updatedAt: string }[];
};

function renderWidget(w: WidgetConfig, data: DataBundle) {
  const { meta, trends, projects, members, goals, overdue, allTasks } = data;
  const cfg = w.config ?? {};
  const limit = Number(cfg.limit ?? 10);
  const timeRange = Number(cfg.timeRange ?? 7);
  const chartType = (cfg.chartType as string) ?? "bar";

  switch (w.type) {
    case "overview_stats": {
      if (!meta) return <Loader2 className="w-4 h-4 animate-spin mx-auto mt-8" style={{ color: "var(--accent)" }} />;
      const items = [
        { label: "Total Tasks",  val: meta.total,        color: "var(--accent)" },
        { label: "Completed",    val: meta.done,         color: "#16A34A" },
        { label: "In Progress",  val: meta.inProgress,   color: "#60A5FA" },
        { label: "Overdue",      val: meta.overdueTasks, color: "#DC2626" },
      ];
      return (
        <div className="grid grid-cols-4 gap-3">
          {items.map((s) => (
            <div key={s.label} className="text-center p-3 rounded-xl" style={{ background: "var(--bg-elevated)" }}>
              <div className="text-2xl font-900 tabular-nums" style={{ color: s.color, fontWeight: 900 }}>{s.val}</div>
              <div className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>{s.label}</div>
            </div>
          ))}
        </div>
      );
    }

    case "task_activity": {
      const sliced = trends.slice(-timeRange);
      const C = chartType === "area" ? ReAreaChart : BarChart;
      return (
        <ResponsiveContainer width="100%" height={180}>
          {chartType === "area" ? (
            <ReAreaChart data={sliced}>
              <defs>
                <linearGradient id="gDone" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#16A34A" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#16A34A" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gCreated" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} width={20} />
              <Tooltip content={<ChartTooltip />} />
              <Area dataKey="done"    name="Completed" stroke="#16A34A" fill="url(#gDone)"    strokeWidth={2} dot={false} />
              <Area dataKey="created" name="Created"   stroke="var(--accent)" fill="url(#gCreated)" strokeWidth={2} dot={false} />
            </ReAreaChart>
          ) : (
            <BarChart data={sliced} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} width={20} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="done"    name="Completed" fill="#16A34A"        radius={[4,4,0,0]} maxBarSize={22} />
              <Bar dataKey="created" name="Created"   fill="var(--accent)"  radius={[4,4,0,0]} maxBarSize={22} opacity={0.65} />
            </BarChart>
          )}
        </ResponsiveContainer>
      );
    }

    case "project_health": {
      const pieData = [
        { name: "On Track",  value: projects.filter((p) => p.health === "ON_TRACK").length  },
        { name: "At Risk",   value: projects.filter((p) => p.health === "AT_RISK").length   },
        { name: "Off Track", value: projects.filter((p) => p.health === "OFF_TRACK").length },
      ].filter((d) => d.value > 0);
      if (projects.length === 0) return <p className="text-xs text-center pt-8" style={{ color: "var(--text-muted)" }}>No projects</p>;
      return (
        <div className="flex flex-col gap-2.5">
          <PieChart width={150} height={130} style={{ margin: "0 auto" }}>
            <Pie data={pieData} cx={75} cy={60} innerRadius={38} outerRadius={58} paddingAngle={3} dataKey="value">
              {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
          <div className="flex flex-col gap-1.5 mt-1">
            {projects.slice(0, 4).map((p) => (
              <div key={p.id} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: HEALTH_COLOR[p.health as keyof typeof HEALTH_COLOR] ?? "#6B7280" }} />
                <span className="flex-1 text-xs truncate" style={{ color: "var(--text-foreground)" }}>{p.name}</span>
                <span className="text-xs font-700 tabular-nums" style={{ color: "var(--text-muted)", fontWeight: 700 }}>{p.progress}%</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    case "team_workload": {
      if (members.length === 0) return <p className="text-xs text-center pt-8" style={{ color: "var(--text-muted)" }}>No members</p>;
      return (
        <div className="flex flex-col gap-3">
          {members.slice(0, 5).map((m) => {
            const color = m.taskCount > 10 ? "#DC2626" : m.taskCount > 5 ? "#D97706" : "#16A34A";
            return (
              <div key={m.id} className="flex items-center gap-2.5">
                <Avatar name={m.name} image={m.image} size="xs" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs truncate" style={{ color: "var(--text-foreground)" }}>
                      {m.name ?? m.email.split("@")[0]}
                    </span>
                    <span className="text-[10px] tabular-nums" style={{ color: "var(--text-muted)" }}>
                      {m.doneCount}/{m.taskCount}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
                    <motion.div className="h-full rounded-full" animate={{ width: `${Math.min((m.taskCount / 12) * 100, 100)}%` }}
                      transition={{ duration: 0.6 }} style={{ background: color }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    case "overdue_tasks": {
      if (overdue.length === 0)
        return (
          <div className="flex flex-col items-center justify-center py-6 gap-2">
            <CheckCircle2 className="w-8 h-8" style={{ color: "#16A34A" }} />
            <p className="text-xs font-700" style={{ color: "#16A34A", fontWeight: 700 }}>All caught up!</p>
          </div>
        );
      return (
        <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
          {overdue.slice(0, limit).map((t) => (
            <div key={t.id} className="flex items-start gap-2.5 p-2 rounded-lg" style={{ background: "var(--bg-elevated)" }}>
              <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: PRIORITY_COLOR[t.priority] ?? "#6B7280" }} />
              <div className="flex-1 min-w-0">
                <p className="text-xs truncate" style={{ color: "var(--text-foreground)" }}>{t.title}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: t.projectColor }} />
                  <span className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>{t.projectName}</span>
                  <span className="text-[10px] text-red-400 ml-auto">{format(new Date(t.dueDate), "MMM d")}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    case "goals_progress": {
      const goalType = ((w.config ?? {}).goalType as string) ?? "ALL";
      const filtered = goalType === "ALL" ? goals : goals.filter((g) => g.type === goalType);
      const TYPE_COLOR: Record<string, string> = { COMPANY: "#7C3AED", TEAM: "#2563EB", PERSONAL: "#059669" };
      if (filtered.length === 0) return <p className="text-xs text-center pt-8" style={{ color: "var(--text-muted)" }}>No goals</p>;
      return (
        <div className="flex flex-col gap-3">
          {filtered.slice(0, 6).map((g) => {
            const color = TYPE_COLOR[g.type] ?? "#7C3AED";
            return (
              <div key={g.id}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs truncate flex-1 mr-2" style={{ color: "var(--text-foreground)" }}>{g.title}</span>
                  <span className="text-[10px] font-800 tabular-nums" style={{ color, fontWeight: 800 }}>{g.pct}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
                  <motion.div className="h-full rounded-full" animate={{ width: `${g.pct}%` }}
                    transition={{ duration: 0.7 }} style={{ background: g.pct >= 100 ? "#16A34A" : color }} />
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    case "velocity_chart": {
      const weeks = Number((w.config ?? {}).weeks ?? 8);
      const now = new Date();
      const weekData: { week: string; done: number }[] = [];
      for (let i = weeks - 1; i >= 0; i--) {
        const start = startOfDay(subDays(now, i * 7 + 6));
        const end   = startOfDay(subDays(now, i * 7));
        const done  = allTasks.filter((t) => {
          if (t.status !== "DONE") return false;
          const u = new Date(t.updatedAt);
          return u >= start && u <= end;
        }).length;
        weekData.push({ week: `W-${i}`, done });
      }
      return (
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={weekData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="week" tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} width={20} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="done" name="Tasks Done" fill="var(--accent)" radius={[4,4,0,0]} maxBarSize={28}
              style={{ filter: "drop-shadow(0 0 4px var(--accent))" }} />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    case "priority_breakdown": {
      const prioData = [
        { name: "Urgent", value: allTasks.filter((t) => t.priority === "URGENT").length,  fill: "#FF4466" },
        { name: "High",   value: allTasks.filter((t) => t.priority === "HIGH").length,    fill: "#FFC107" },
        { name: "Medium", value: allTasks.filter((t) => t.priority === "MEDIUM").length,  fill: "#60A5FA" },
        { name: "Low",    value: allTasks.filter((t) => t.priority === "LOW").length,     fill: "#6B7280" },
      ].filter((d) => d.value > 0);
      if (chartType === "pie") {
        return (
          <PieChart width={180} height={160} style={{ margin: "0 auto" }}>
            <Pie data={prioData} cx={90} cy={72} innerRadius={40} outerRadius={60} paddingAngle={3} dataKey="value">
              {prioData.map((d, i) => <Cell key={i} fill={d.fill} />)}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        );
      }
      return (
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={prioData} layout="vertical" barSize={16}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
            <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} width={44} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="value" name="Tasks" radius={[0,4,4,0]}>
              {prioData.map((d, i) => <Cell key={i} fill={d.fill} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      );
    }

    case "task_status_funnel": {
      const statuses = [
        { name: "Backlog",     value: allTasks.filter((t) => t.status === "BACKLOG").length,     fill: "#6B7280" },
        { name: "Todo",        value: allTasks.filter((t) => t.status === "TODO").length,        fill: "#60A5FA" },
        { name: "In Progress", value: allTasks.filter((t) => t.status === "IN_PROGRESS").length, fill: "#7C3AED" },
        { name: "Done",        value: allTasks.filter((t) => t.status === "DONE").length,        fill: "#16A34A" },
      ].filter((d) => d.value > 0);
      if (chartType === "pie") {
        return (
          <PieChart width={180} height={160} style={{ margin: "0 auto" }}>
            <Pie data={statuses} cx={90} cy={72} innerRadius={40} outerRadius={60} paddingAngle={3} dataKey="value">
              {statuses.map((d, i) => <Cell key={i} fill={d.fill} />)}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        );
      }
      return (
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={statuses} barSize={20}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 9, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} width={20} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="value" name="Tasks" radius={[4,4,0,0]}>
              {statuses.map((d, i) => <Cell key={i} fill={d.fill} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      );
    }

    case "recent_activity": {
      const recent = allTasks
        .filter((t) => t.status === "DONE")
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, limit);
      if (recent.length === 0) return <p className="text-xs text-center pt-8" style={{ color: "var(--text-muted)" }}>No recent activity</p>;
      return (
        <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
          {(recent as (typeof recent[0] & { title?: string; projectName?: string })[]).map((t, i) => (
            <div key={i} className="flex items-center gap-2.5 p-2 rounded-lg" style={{ background: "var(--bg-elevated)" }}>
              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#16A34A" }} />
              <span className="flex-1 text-xs truncate" style={{ color: "var(--text-foreground)" }}>
                {"title" in t ? (t.title as string) : "Task completed"}
              </span>
              <span className="text-[10px] flex-shrink-0" style={{ color: "var(--text-muted)" }}>
                {format(new Date(t.updatedAt), "MMM d")}
              </span>
            </div>
          ))}
        </div>
      );
    }

    default:
      return <p className="text-xs text-center pt-8" style={{ color: "var(--text-muted)" }}>Unknown widget</p>;
  }
}

// ── Per-widget settings panel ─────────────────────────────────────────────
function WidgetSettings({ w, onSave, onClose }: {
  w: WidgetConfig;
  onSave: (updated: Partial<WidgetConfig> & { config?: Record<string, unknown> }) => void;
  onClose: () => void;
}) {
  const [title, setTitle]       = useState(w.title);
  const [size,  setSize]        = useState<WidgetSize>(w.size);
  const [cfg,   setCfg]         = useState<Record<string, unknown>>(w.config ?? {});

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95, y: -8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -8 }}
      className="absolute top-12 right-2 z-50 w-64 rounded-2xl p-4 shadow-2xl"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-800" style={{ color: "var(--text-foreground)", fontWeight: 800 }}>Widget Settings</span>
        <button onClick={onClose}><X className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} /></button>
      </div>

      {/* Title */}
      <label className="block text-[10px] mb-1" style={{ color: "var(--text-muted)" }}>Title</label>
      <input value={title} onChange={(e) => setTitle(e.target.value)}
        className="w-full text-xs rounded-lg px-2.5 py-1.5 mb-3 outline-none"
        style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-foreground)" }} />

      {/* Size */}
      <label className="block text-[10px] mb-1" style={{ color: "var(--text-muted)" }}>Size</label>
      <div className="flex gap-2 mb-3">
        {(["half", "wide"] as WidgetSize[]).map((s) => (
          <button key={s} onClick={() => setSize(s)}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs transition-all"
            style={{
              background: size === s ? "var(--accent)" : "var(--bg-elevated)",
              color: size === s ? "#fff" : "var(--text-muted)",
            }}>
            {s === "wide" ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
            {s === "wide" ? "Full width" : "Half width"}
          </button>
        ))}
      </div>

      {/* Type-specific config */}
      {(w.type === "task_activity") && (
        <>
          <label className="block text-[10px] mb-1" style={{ color: "var(--text-muted)" }}>Chart type</label>
          <div className="flex gap-2 mb-3">
            {["bar", "area"].map((ct) => (
              <button key={ct} onClick={() => setCfg((c) => ({ ...c, chartType: ct }))}
                className="flex-1 py-1.5 rounded-lg text-xs capitalize transition-all"
                style={{
                  background: cfg.chartType === ct ? "var(--accent)" : "var(--bg-elevated)",
                  color: cfg.chartType === ct ? "#fff" : "var(--text-muted)",
                }}>{ct}</button>
            ))}
          </div>
          <label className="block text-[10px] mb-1" style={{ color: "var(--text-muted)" }}>Time range (days)</label>
          <div className="flex gap-2 mb-3">
            {["7", "14", "30"].map((tr) => (
              <button key={tr} onClick={() => setCfg((c) => ({ ...c, timeRange: tr }))}
                className="flex-1 py-1.5 rounded-lg text-xs transition-all"
                style={{
                  background: String(cfg.timeRange) === tr ? "var(--accent)" : "var(--bg-elevated)",
                  color: String(cfg.timeRange) === tr ? "#fff" : "var(--text-muted)",
                }}>{tr}d</button>
            ))}
          </div>
        </>
      )}
      {(w.type === "priority_breakdown" || w.type === "task_status_funnel") && (
        <>
          <label className="block text-[10px] mb-1" style={{ color: "var(--text-muted)" }}>Chart type</label>
          <div className="flex gap-2 mb-3">
            {["bar", "pie"].map((ct) => (
              <button key={ct} onClick={() => setCfg((c) => ({ ...c, chartType: ct }))}
                className="flex-1 py-1.5 rounded-lg text-xs capitalize transition-all"
                style={{
                  background: cfg.chartType === ct ? "var(--accent)" : "var(--bg-elevated)",
                  color: cfg.chartType === ct ? "#fff" : "var(--text-muted)",
                }}>{ct}</button>
            ))}
          </div>
        </>
      )}
      {w.type === "velocity_chart" && (
        <>
          <label className="block text-[10px] mb-1" style={{ color: "var(--text-muted)" }}>Weeks to show</label>
          <div className="flex gap-2 mb-3">
            {["4", "8", "12"].map((wks) => (
              <button key={wks} onClick={() => setCfg((c) => ({ ...c, weeks: wks }))}
                className="flex-1 py-1.5 rounded-lg text-xs transition-all"
                style={{
                  background: String(cfg.weeks) === wks ? "var(--accent)" : "var(--bg-elevated)",
                  color: String(cfg.weeks) === wks ? "#fff" : "var(--text-muted)",
                }}>{wks}w</button>
            ))}
          </div>
        </>
      )}
      {w.type === "goals_progress" && (
        <>
          <label className="block text-[10px] mb-1" style={{ color: "var(--text-muted)" }}>Goal type</label>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {["ALL", "COMPANY", "TEAM", "PERSONAL"].map((gt) => (
              <button key={gt} onClick={() => setCfg((c) => ({ ...c, goalType: gt }))}
                className="px-2.5 py-1 rounded-lg text-[10px] capitalize transition-all"
                style={{
                  background: cfg.goalType === gt ? "var(--accent)" : "var(--bg-elevated)",
                  color: cfg.goalType === gt ? "#fff" : "var(--text-muted)",
                }}>{gt.toLowerCase()}</button>
            ))}
          </div>
        </>
      )}
      {(w.type === "overdue_tasks" || w.type === "recent_activity") && (
        <>
          <label className="block text-[10px] mb-1" style={{ color: "var(--text-muted)" }}>Max items</label>
          <div className="flex gap-2 mb-3">
            {["5", "10", "20"].map((lim) => (
              <button key={lim} onClick={() => setCfg((c) => ({ ...c, limit: lim }))}
                className="flex-1 py-1.5 rounded-lg text-xs transition-all"
                style={{
                  background: String(cfg.limit) === lim ? "var(--accent)" : "var(--bg-elevated)",
                  color: String(cfg.limit) === lim ? "#fff" : "var(--text-muted)",
                }}>{lim}</button>
            ))}
          </div>
        </>
      )}

      <button onClick={() => { onSave({ title, size, config: cfg }); onClose(); }}
        className="w-full py-2 rounded-xl text-xs font-700 transition-opacity hover:opacity-90"
        style={{ background: "var(--accent)", color: "#fff", fontWeight: 700 }}>
        Apply
      </button>
    </motion.div>
  );
}

// ── Sortable widget wrapper ────────────────────────────────────────────────
function SortableWidget({
  w, data, onDelete, onUpdate, isDragging,
}: {
  w: WidgetConfig;
  data: DataBundle;
  onDelete: (id: string) => void;
  onUpdate: (id: string, partial: Partial<WidgetConfig>) => void;
  isDragging: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isSorting } = useSortable({ id: w.id });
  const [showSettings, setShowSettings] = useState(false);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
    gridColumn: w.size === "wide" ? "span 2" : "span 1",
  };

  const catalogEntry = CATALOG.find((c) => c.type === w.type);
  const Icon = catalogEntry?.icon ?? LayoutDashboard;

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <div className="rounded-2xl flex flex-col overflow-visible"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>

        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 shrink-0"
          style={{ borderBottom: "1px solid var(--border)" }}>
          {/* Drag handle */}
          <button {...attributes} {...listeners}
            className="cursor-grab active:cursor-grabbing p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity touch-none"
            style={{ color: "var(--text-muted)" }}>
            <GripVertical className="w-3.5 h-3.5" />
          </button>
          <Icon className="w-4 h-4 flex-shrink-0" style={{ color: "var(--accent)" }} />
          <span className="text-sm font-800 flex-1 truncate" style={{ color: "var(--text-foreground)", fontWeight: 800 }}>
            {w.title}
          </span>

          {/* Controls — visible on hover */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Toggle size */}
            <button onClick={() => onUpdate(w.id, { size: w.size === "wide" ? "half" : "wide" })}
              className="p-1.5 rounded-lg transition-colors hover:bg-elevated"
              style={{ color: "var(--text-muted)" }} title={w.size === "wide" ? "Make half-width" : "Make full-width"}>
              {w.size === "wide" ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
            </button>
            {/* Settings */}
            <button onClick={() => setShowSettings((p) => !p)}
              className="p-1.5 rounded-lg transition-colors hover:bg-elevated"
              style={{ color: showSettings ? "var(--accent)" : "var(--text-muted)" }}>
              <Settings2 className="w-3 h-3" />
            </button>
            {/* Delete */}
            <button onClick={() => onDelete(w.id)}
              className="p-1.5 rounded-lg transition-colors hover:bg-elevated"
              style={{ color: "var(--text-muted)" }}>
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 flex-1">
          {renderWidget(w, data)}
        </div>
      </div>

      {/* Settings popover */}
      <AnimatePresence>
        {showSettings && (
          <WidgetSettings w={w}
            onSave={(partial) => onUpdate(w.id, partial)}
            onClose={() => setShowSettings(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Widget catalog panel ───────────────────────────────────────────────────
function CatalogPanel({
  onAdd, onClose, onAICreate,
}: {
  onAdd: (entry: typeof CATALOG[0]) => void;
  onClose: () => void;
  onAICreate: () => void;
}) {
  return (
    <motion.div initial={{ x: "100%", opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: "100%", opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed top-0 right-0 h-full w-80 flex flex-col z-50 shadow-2xl"
      style={{ background: "var(--bg-card)", borderLeft: "1px solid var(--border)" }}>

      <div className="flex items-center justify-between p-4 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
        <div>
          <h3 className="text-sm font-800" style={{ color: "var(--text-foreground)", fontWeight: 800 }}>Add Widget</h3>
          <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>Click to add to your dashboard</p>
        </div>
        <button onClick={onClose}><X className="w-4 h-4" style={{ color: "var(--text-muted)" }} /></button>
      </div>

      {/* AI creator button */}
      <div className="p-4 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
        <button onClick={onAICreate}
          className="w-full flex items-center gap-3 p-3.5 rounded-xl text-sm font-700 transition-all hover:opacity-90"
          style={{ background: "linear-gradient(135deg, var(--accent), #7C3AED)", color: "#fff", fontWeight: 700,
            boxShadow: "0 4px 16px var(--accent-glow)" }}>
          <Sparkles className="w-4 h-4 flex-shrink-0" />
          <div className="text-left">
            <div>Create with AI ✨</div>
            <div className="text-[10px] opacity-80 font-400 mt-0.5">Describe what you want in plain English</div>
          </div>
        </button>
      </div>

      {/* Widget list */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        {CATALOG.map((entry) => {
          const Icon = entry.icon;
          return (
            <button key={entry.type} onClick={() => { onAdd(entry); onClose(); }}
              className="flex items-start gap-3 p-3 rounded-xl text-left w-full transition-all hover:scale-[1.01]"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                <Icon className="w-4 h-4" style={{ color: "var(--accent)" }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-700" style={{ color: "var(--text-foreground)", fontWeight: 700 }}>{entry.label}</div>
                <div className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>{entry.desc}</div>
              </div>
              <span className="text-[9px] px-1.5 py-0.5 rounded-md mt-0.5 flex-shrink-0"
                style={{ background: "var(--border)", color: "var(--text-muted)" }}>
                {entry.defaultSize}
              </span>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}

// ── AI Creator modal ────────────────────────────────────────────────────────
function AICreatorModal({
  onClose, onAdd,
}: {
  onClose: () => void;
  onAdd: (widget: WidgetConfig) => void;
}) {
  const [prompt, setPrompt]     = useState("");
  const [loading, setLoading]   = useState(false);
  const [preview, setPreview]   = useState<WidgetConfig | null>(null);
  const [error, setError]       = useState("");
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { textRef.current?.focus(); }, []);

  const generate = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError("");
    setPreview(null);
    try {
      const res = await fetch("/api/ai/create-widget", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError((body as { error?: string }).error ?? "Failed to generate widget.");
        return;
      }
      const widget = await res.json() as WidgetConfig;
      setPreview(widget);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  };

  const EXAMPLES = [
    "Show me tasks completed by the team this week as a bar chart",
    "I want to see how overloaded each team member is",
    "Display goal progress for company OKRs",
    "Velocity chart for the last 8 weeks",
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-lg rounded-2xl flex flex-col shadow-2xl"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)", maxHeight: "90vh", overflow: "hidden" }}>

        {/* Header */}
        <div className="flex items-center justify-between p-5" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, var(--accent), #7C3AED)" }}>
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-800" style={{ color: "var(--text-foreground)", fontWeight: 800 }}>
                Create Widget with AI
              </h2>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                Describe what you want to see — AI picks the right chart
              </p>
            </div>
          </div>
          <button onClick={onClose}><X className="w-4 h-4" style={{ color: "var(--text-muted)" }} /></button>
        </div>

        <div className="p-5 overflow-y-auto flex flex-col gap-4">
          {/* Prompt */}
          <div>
            <label className="text-[10px] font-700 mb-1.5 block" style={{ color: "var(--text-muted)", fontWeight: 700 }}>
              WHAT DO YOU WANT TO SEE?
            </label>
            <textarea ref={textRef} value={prompt} onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && e.metaKey) generate(); }}
              placeholder="e.g. Show me how many tasks each team member has completed this week as a bar chart…"
              rows={3} className="w-full text-sm rounded-xl px-3.5 py-2.5 outline-none resize-none"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-foreground)" }} />
          </div>

          {/* Example prompts */}
          <div>
            <p className="text-[10px] mb-2" style={{ color: "var(--text-muted)" }}>Try an example:</p>
            <div className="flex flex-col gap-1.5">
              {EXAMPLES.map((ex) => (
                <button key={ex} onClick={() => setPrompt(ex)}
                  className="text-left text-xs px-3 py-2 rounded-lg transition-all"
                  style={{ background: "var(--bg-elevated)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                  <ChevronRight className="w-3 h-3 inline mr-1 opacity-60" />{ex}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="text-xs px-3 py-2 rounded-lg" style={{ background: "#DC262618", color: "#DC2626" }}>
              {error}
            </div>
          )}

          {/* Preview */}
          {preview && (
            <div className="rounded-xl p-3.5" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
              <p className="text-[10px] font-700 mb-2" style={{ color: "var(--text-muted)", fontWeight: 700 }}>PREVIEW</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-700" style={{ color: "var(--text-foreground)", fontWeight: 700 }}>{preview.title}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {preview.type.replace(/_/g, " ")} · {preview.size === "wide" ? "Full width" : "Half width"}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => {
                    const entry = CATALOG.find((c) => c.type === preview.type);
                    const Icon = entry?.icon;
                    if (Icon) { /* just validate type exists */ }
                    setPreview(null);
                    setPrompt("");
                  }}
                    className="text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5"
                    style={{ background: "var(--border)", color: "var(--text-muted)" }}>
                    <RefreshCw className="w-3 h-3" /> Retry
                  </button>
                  <button onClick={() => { onAdd(preview); onClose(); toast.success("Widget added!"); }}
                    className="text-xs px-3 py-1.5 rounded-lg font-700 flex items-center gap-1.5"
                    style={{ background: "var(--accent)", color: "#fff", fontWeight: 700 }}>
                    <Plus className="w-3 h-3" /> Add Widget
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 shrink-0 flex items-center gap-3" style={{ borderTop: "1px solid var(--border)" }}>
          <button onClick={onClose} className="flex-1 py-2 rounded-xl text-sm"
            style={{ background: "var(--bg-elevated)", color: "var(--text-muted)" }}>
            Cancel
          </button>
          <button onClick={generate} disabled={!prompt.trim() || loading}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-700 transition-opacity"
            style={{
              background: "linear-gradient(135deg, var(--accent), #7C3AED)", color: "#fff", fontWeight: 700,
              opacity: !prompt.trim() || loading ? 0.6 : 1,
            }}>
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</> : <><Sparkles className="w-4 h-4" /> Generate Widget</>}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function DashboardsPage() {
  // Dashboard list & active board
  const [boards, setBoards]           = useState<DashboardRecord[]>([]);
  const [activeId, setActiveId]       = useState<string | null>(null);
  const [layout, setLayout]           = useState<WidgetConfig[]>([]);
  const [loading, setLoading]         = useState(true);
  const [creating, setCreating]       = useState(false);
  const [newTitle, setNewTitle]       = useState("");
  const [showCatalog, setShowCatalog] = useState(false);
  const [showAI, setShowAI]           = useState(false);
  const [dragActive, setDragActive]   = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Widget data
  const [meta,     setMeta]     = useState<DashMeta | null>(null);
  const [trends,   setTrends]   = useState<TaskTrend[]>([]);
  const [projects, setProjects] = useState<ProjectHealth[]>([]);
  const [members,  setMembers]  = useState<TeamMember[]>([]);
  const [goals,    setGoals]    = useState<GoalSummary[]>([]);
  const [overdue,  setOverdue]  = useState<OverdueTask[]>([]);
  const [allTasks, setAllTasks] = useState<{ status: string; priority: string; updatedAt: string; title?: string }[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // DnD sensors
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  // Load dashboards on mount
  useEffect(() => {
    fetch("/api/dashboards").then((r) => r.json()).then((data: DashboardRecord[]) => {
      setBoards(data);
      const def = data.find((d) => d.isDefault) ?? data[0];
      if (def) {
        setActiveId(def.id);
        setLayout(JSON.parse(def.layout) as WidgetConfig[]);
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  // Load widget data once
  const loadWidgetData = useCallback(async () => {
    setDataLoading(true);
    try {
      const [dashRes, portRes, goalsRes] = await Promise.all([
        fetch("/api/dashboard"), fetch("/api/portfolio"), fetch("/api/goals"),
      ]);
      const [dash, port, goalsData] = await Promise.all([dashRes.json(), portRes.json(), goalsRes.json()]);

      const tasks: { status: string; priority: string; dueDate?: string; updatedAt: string; createdAt: string; assigneeId?: string; title?: string }[] =
        (dash.projects ?? []).flatMap((p: { tasks?: unknown[] }) => p.tasks ?? []);
      const now = new Date();

      setAllTasks(tasks.map((t) => ({ ...t })));
      setMeta({
        total:        tasks.length,
        done:         tasks.filter((t) => t.status === "DONE").length,
        inProgress:   tasks.filter((t) => t.status === "IN_PROGRESS").length,
        overdueTasks: tasks.filter((t) => t.dueDate && new Date(t.dueDate) < now && t.status !== "DONE").length,
        projects:     dash.projects?.length ?? 0,
      });

      // 30-day trend array
      const dayMap: Record<string, { done: number; created: number }> = {};
      for (let i = 29; i >= 0; i--) {
        const d = startOfDay(subDays(now, i));
        dayMap[format(d, "MMM d")] = { done: 0, created: 0 };
      }
      tasks.forEach((t) => {
        const upd = format(startOfDay(new Date(t.updatedAt)), "MMM d");
        const crt = format(startOfDay(new Date(t.createdAt)), "MMM d");
        if (dayMap[upd] && t.status === "DONE") dayMap[upd].done++;
        if (dayMap[crt]) dayMap[crt].created++;
      });
      setTrends(Object.entries(dayMap).map(([date, v]) => ({ date, ...v })));

      setProjects((port.projects ?? []).map((p: { id: string; name: string; color: string; progress: number; health: string; total: number; done: number }) => ({
        id: p.id, name: p.name, color: p.color, progress: p.progress, health: p.health, total: p.total, done: p.done,
      })));

      // Members from task assignments
      const memberMap: Record<string, TeamMember> = {};
      tasks.forEach((t) => {
        if (!t.assigneeId) return;
        if (!memberMap[t.assigneeId]) memberMap[t.assigneeId] = { id: t.assigneeId, name: null, image: null, email: "", taskCount: 0, doneCount: 0 };
        memberMap[t.assigneeId].taskCount++;
        if (t.status === "DONE") memberMap[t.assigneeId].doneCount++;
      });
      (dash.members ?? []).forEach((m: { user: { id: string; name: string | null; email: string; image: string | null } }) => {
        if (memberMap[m.user.id]) {
          memberMap[m.user.id].name  = m.user.name;
          memberMap[m.user.id].email = m.user.email;
        }
      });
      setMembers(Object.values(memberMap).sort((a, b) => b.taskCount - a.taskCount));

      const od: OverdueTask[] = [];
      (dash.projects ?? []).forEach((proj: { name: string; color: string; tasks?: { id: string; title: string; dueDate?: string; status: string; priority?: string }[] }) => {
        (proj.tasks ?? []).filter((t) => t.dueDate && new Date(t.dueDate) < now && t.status !== "DONE").forEach((t) => {
          od.push({ id: t.id, title: t.title ?? "Untitled", priority: t.priority ?? "MEDIUM",
            dueDate: t.dueDate!, projectName: proj.name, projectColor: proj.color });
        });
      });
      setOverdue(od.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()));

      setGoals((goalsData as { id: string; title: string; type: string; status: string; keyResults?: { targetValue: number; currentValue: number }[] }[]).map((g) => {
        const krs = g.keyResults ?? [];
        const pct = krs.length > 0
          ? Math.round(krs.reduce((s, k) => s + (k.targetValue > 0 ? Math.min(k.currentValue / k.targetValue, 1) : 0), 0) / krs.length * 100)
          : 0;
        return { id: g.id, title: g.title, type: g.type, status: g.status, pct };
      }));
    } catch (e) { console.error(e); }
    finally { setDataLoading(false); }
  }, []);

  useEffect(() => { loadWidgetData(); }, [loadWidgetData]);

  // Debounced save layout to DB
  const saveLayout = useCallback((dashId: string, widgets: WidgetConfig[]) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await fetch(`/api/dashboards/${dashId}`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ layout: JSON.stringify(widgets) }),
        });
      } catch { /* silent */ }
    }, 1200);
  }, []);

  const updateLayout = useCallback((widgets: WidgetConfig[]) => {
    setLayout(widgets);
    if (activeId) saveLayout(activeId, widgets);
  }, [activeId, saveLayout]);

  // DnD handlers
  const handleDragStart = useCallback((e: DragStartEvent) => {
    setDragActive(String(e.active.id));
  }, []);

  const handleDragEnd = useCallback((e: DragEndEvent) => {
    setDragActive(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setLayout((prev) => {
      const oldIdx = prev.findIndex((w) => w.id === active.id);
      const newIdx = prev.findIndex((w) => w.id === over.id);
      const reordered = arrayMove(prev, oldIdx, newIdx);
      if (activeId) saveLayout(activeId, reordered);
      return reordered;
    });
  }, [activeId, saveLayout]);

  // Widget operations
  const addWidget = useCallback((entry: typeof CATALOG[0]) => {
    const w: WidgetConfig = {
      id: `w_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: entry.type,
      title: entry.label,
      size: entry.defaultSize,
      config: { ...entry.defaultConfig },
    };
    updateLayout([...layout, w]);
    toast.success(`"${entry.label}" added`);
  }, [layout, updateLayout]);

  const addAIWidget = useCallback((w: WidgetConfig) => {
    updateLayout([...layout, w]);
  }, [layout, updateLayout]);

  const deleteWidget = useCallback((id: string) => {
    updateLayout(layout.filter((w) => w.id !== id));
  }, [layout, updateLayout]);

  const updateWidget = useCallback((id: string, partial: Partial<WidgetConfig>) => {
    updateLayout(layout.map((w) => w.id === id ? { ...w, ...partial } : w));
  }, [layout, updateLayout]);

  // Switch active dashboard
  const switchBoard = useCallback((b: DashboardRecord) => {
    setActiveId(b.id);
    setLayout(JSON.parse(b.layout) as WidgetConfig[]);
  }, []);

  // Create new dashboard
  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    const res = await fetch("/api/dashboards", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle.trim() }),
    });
    if (!res.ok) { toast.error("Failed to create dashboard"); return; }
    const board = await res.json() as DashboardRecord;
    setBoards((prev) => [...prev, board]);
    switchBoard(board);
    setCreating(false);
    setNewTitle("");
    toast.success("Dashboard created!");
  };

  const data: DataBundle = { meta, trends, projects, members, goals, overdue, allTasks };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-40">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--accent)" }} />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto relative">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight" style={{ color: "var(--text-foreground)", fontWeight: 900 }}>
            Dashboards
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Drag widgets to reorder · click ⚙ to configure · ✨ to create with AI
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={() => setCreating(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-700 hover:opacity-90 transition-opacity"
            style={{ background: "var(--bg-elevated)", color: "var(--text-muted)", border: "1px solid var(--border)", fontWeight: 700 }}>
            <Plus className="w-4 h-4" /> New
          </button>
          <button onClick={() => setShowCatalog(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-700 hover:opacity-90 transition-opacity"
            style={{ background: "var(--accent)", color: "#fff", fontWeight: 700, boxShadow: "0 4px 14px var(--accent-glow)" }}>
            <Plus className="w-4 h-4" /> Add Widget
          </button>
        </div>
      </div>

      {/* Dashboard tabs */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
        {boards.map((b) => (
          <button key={b.id} onClick={() => switchBoard(b)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-700 whitespace-nowrap transition-all flex-shrink-0"
            style={{
              fontWeight: 700,
              background: activeId === b.id ? "var(--accent)" : "var(--bg-elevated)",
              color:      activeId === b.id ? "#fff" : "var(--text-muted)",
            }}>
            <LayoutDashboard className="w-3.5 h-3.5" />
            {b.title}
            {b.isDefault && <span className="text-[9px] opacity-70">default</span>}
          </button>
        ))}

        <AnimatePresence>
          {creating && (
            <motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: "auto" }} exit={{ opacity: 0, width: 0 }}
              className="flex items-center gap-2 px-3 py-2 rounded-xl flex-shrink-0"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
              <input autoFocus value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") { setCreating(false); setNewTitle(""); } }}
                placeholder="Dashboard name…" className="text-xs bg-transparent outline-none w-32"
                style={{ color: "var(--text-foreground)" }} />
              <button onClick={handleCreate} className="text-xs font-700 px-2 py-0.5 rounded-lg"
                style={{ background: "var(--accent)", color: "#fff", fontWeight: 700 }}>Save</button>
              <button onClick={() => { setCreating(false); setNewTitle(""); }}>
                <X className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Widget grid with DnD */}
      {dataLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--accent)" }} />
        </div>
      ) : layout.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <div className="text-5xl">📊</div>
          <p className="font-700 text-sm" style={{ color: "var(--text-foreground)", fontWeight: 700 }}>No widgets yet</p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Add widgets from the catalog or create one with AI</p>
          <div className="flex items-center gap-3 mt-2">
            <button onClick={() => setShowCatalog(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-700"
              style={{ background: "var(--bg-elevated)", color: "var(--text-foreground)", border: "1px solid var(--border)", fontWeight: 700 }}>
              <Plus className="w-4 h-4" /> Browse Catalog
            </button>
            <button onClick={() => { setShowCatalog(false); setShowAI(true); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-700"
              style={{ background: "linear-gradient(135deg, var(--accent), #7C3AED)", color: "#fff", fontWeight: 700 }}>
              <Sparkles className="w-4 h-4" /> Create with AI
            </button>
          </div>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter}
          onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <SortableContext items={layout.map((w) => w.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 gap-4">
              {layout.map((w) => (
                <SortableWidget key={w.id} w={w} data={data}
                  onDelete={deleteWidget}
                  onUpdate={updateWidget}
                  isDragging={dragActive === w.id} />
              ))}
            </div>
          </SortableContext>
          <DragOverlay>
            {dragActive && (() => {
              const w = layout.find((x) => x.id === dragActive);
              if (!w) return null;
              return (
                <div className="rounded-2xl opacity-90 shadow-2xl"
                  style={{ background: "var(--bg-card)", border: "2px solid var(--accent)",
                    width: w.size === "wide" ? "100%" : "50%", transform: "rotate(1.5deg)" }}>
                  <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid var(--border)" }}>
                    <GripVertical className="w-4 h-4" style={{ color: "var(--accent)" }} />
                    <span className="text-sm font-800" style={{ color: "var(--text-foreground)", fontWeight: 800 }}>{w.title}</span>
                  </div>
                  <div className="h-24" />
                </div>
              );
            })()}
          </DragOverlay>
        </DndContext>
      )}

      {/* Catalog slide-in */}
      <AnimatePresence>
        {showCatalog && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.3)", backdropFilter: "blur(2px)" }}
              onClick={() => setShowCatalog(false)} />
            <CatalogPanel
              onAdd={addWidget}
              onClose={() => setShowCatalog(false)}
              onAICreate={() => { setShowCatalog(false); setShowAI(true); }} />
          </>
        )}
      </AnimatePresence>

      {/* AI creator modal */}
      <AnimatePresence>
        {showAI && (
          <AICreatorModal
            onClose={() => setShowAI(false)}
            onAdd={addAIWidget} />
        )}
      </AnimatePresence>
    </div>
  );
}
