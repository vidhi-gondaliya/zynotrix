"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FolderKanban, CheckCircle2, AlertTriangle, TrendingDown, Calendar, Loader2, Search, Users, TrendingUp } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { format, isPast } from "date-fns";

interface Member { id: string; name: string | null; image: string | null; email: string; }
interface Project {
  id: string; name: string; description: string | null; color: string; status: string;
  deadline: string | null; budget: number | null; budgetSpent: number;
  total: number; done: number; inProgress: number; todo: number; overdue: number;
  progress: number; health: "ON_TRACK" | "AT_RISK" | "OFF_TRACK";
  members: Member[];
  owner: Member;
}
interface Summary { total: number; onTrack: number; atRisk: number; offTrack: number; }

const HEALTH = {
  ON_TRACK:  { label: "On Track",  color: "#16A34A", Icon: CheckCircle2  },
  AT_RISK:   { label: "At Risk",   color: "#D97706", Icon: AlertTriangle  },
  OFF_TRACK: { label: "Off Track", color: "#DC2626", Icon: TrendingDown   },
};

function HealthDot({ h }: { h: keyof typeof HEALTH }) {
  return (
    <span className="w-2 h-2 rounded-full inline-block" style={{ background: HEALTH[h].color,
      boxShadow: `0 0 6px ${HEALTH[h].color}80` }} />
  );
}

function ProjectCard({ p }: { p: Project }) {
  const h = HEALTH[p.health];
  const overdue = p.deadline && isPast(new Date(p.deadline)) && p.status !== "COMPLETED";
  const budgetPct = p.budget && p.budget > 0 ? Math.min(Math.round((p.budgetSpent / p.budget) * 100), 100) : null;

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden group"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>
      {/* Color bar */}
      <div style={{ height: 4, background: p.color }} />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center font-900 text-sm text-white flex-shrink-0"
              style={{ background: p.color, fontWeight: 900 }}>
              {p.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h3 className="font-800 text-sm truncate" style={{ color: "var(--text-foreground)", fontWeight: 800 }}>
                {p.name}
              </h3>
              {p.description && (
                <p className="text-xs truncate mt-0.5" style={{ color: "var(--text-muted)" }}>{p.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-700 flex-shrink-0"
            style={{ color: h.color, fontWeight: 700 }}>
            <HealthDot h={p.health} />
            {h.label}
          </div>
        </div>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span style={{ color: "var(--text-muted)" }}>Progress</span>
            <span className="font-800 tabular-nums" style={{ color: "var(--text-foreground)", fontWeight: 800 }}>
              {p.progress}%
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
            <motion.div className="h-full rounded-full" animate={{ width: `${p.progress}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              style={{
                background: p.progress >= 80 ? "#16A34A" : p.progress >= 40 ? p.color : "#D97706",
                boxShadow: `0 0 8px ${p.color}60`,
              }} />
          </div>
        </div>

        {/* Task stats chips */}
        <div className="flex gap-1.5 mb-4 flex-wrap">
          {[
            { label: "Done",         val: p.done,       color: "#16A34A", bg: "#16A34A18" },
            { label: "In Progress",  val: p.inProgress, color: "#7C3AED", bg: "#7C3AED18" },
            { label: "Todo",         val: p.todo,       color: "#60A5FA", bg: "#60A5FA18" },
            ...(p.overdue > 0 ? [{ label: "Overdue", val: p.overdue, color: "#DC2626", bg: "#DC262618" }] : []),
          ].map((s) => (
            <span key={s.label} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-700"
              style={{ background: s.bg, color: s.color, fontWeight: 700 }}>
              {s.val} {s.label}
            </span>
          ))}
        </div>

        {/* Budget bar */}
        {budgetPct !== null && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs mb-1">
              <span style={{ color: "var(--text-muted)" }}>Budget</span>
              <span className="tabular-nums font-700"
                style={{ color: budgetPct >= 90 ? "#DC2626" : "var(--text-muted)", fontWeight: 700 }}>
                ${p.budgetSpent.toLocaleString()} / ${p.budget!.toLocaleString()}
              </span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
              <div className="h-full rounded-full transition-all" style={{
                width: `${budgetPct}%`,
                background: budgetPct >= 90 ? "#DC2626" : budgetPct >= 70 ? "#D97706" : "#16A34A",
              }} />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between">
          {/* Team avatars */}
          <div className="flex -space-x-1.5">
            {p.members.slice(0, 4).map((m) => (
              <div key={m.id} className="ring-2 rounded-full" style={{ borderColor: "var(--bg-card)" }}>
                <Avatar name={m.name} image={m.image} size="xs" />
              </div>
            ))}
            {p.members.length > 4 && (
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-700 ring-2"
                style={{ background: "var(--bg-elevated)", color: "var(--text-muted)", borderColor: "var(--bg-card)", fontWeight: 700 }}>
                +{p.members.length - 4}
              </div>
            )}
            {p.members.length === 0 && (
              <span className="text-xs" style={{ color: "var(--text-subtle)" }}>No members</span>
            )}
          </div>

          {/* Deadline */}
          {p.deadline && (
            <div className="flex items-center gap-1 text-xs"
              style={{ color: overdue ? "#DC2626" : "var(--text-muted)" }}>
              <Calendar className="w-3 h-3" />
              {overdue ? "Overdue · " : ""}{format(new Date(p.deadline), "MMM d")}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function PortfolioPage() {
  const [data, setData]       = useState<{ projects: Project[]; summary: Summary } | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [healthFilter, setHealthFilter] = useState<"ALL" | "ON_TRACK" | "AT_RISK" | "OFF_TRACK">("ALL");

  useEffect(() => {
    fetch("/api/portfolio").then((r) => r.json()).then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  const projects = data?.projects ?? [];
  const summary  = data?.summary  ?? { total: 0, onTrack: 0, atRisk: 0, offTrack: 0 };

  const filtered = projects.filter((p) => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    const matchHealth = healthFilter === "ALL" || p.health === healthFilter;
    return matchSearch && matchHealth;
  });

  // Aggregate stats across all projects
  const totalTasks = projects.reduce((a, p) => a + p.total, 0);
  const doneTasks  = projects.reduce((a, p) => a + p.done,  0);
  const avgProgress = projects.length > 0
    ? Math.round(projects.reduce((a, p) => a + p.progress, 0) / projects.length)
    : 0;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black tracking-tight" style={{ color: "var(--text-foreground)", fontWeight: 900 }}>
          Portfolio
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          Health and progress across all active projects
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Projects", val: summary.total,    icon: FolderKanban, color: "var(--accent)" },
          { label: "On Track",       val: summary.onTrack,  icon: TrendingUp,   color: "#16A34A" },
          { label: "At Risk",        val: summary.atRisk,   icon: AlertTriangle,color: "#D97706" },
          { label: "Off Track",      val: summary.offTrack, icon: TrendingDown, color: "#DC2626" },
        ].map(({ label, val, icon: Icon, color }) => (
          <div key={label} className="rounded-xl p-4 flex items-center gap-3"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${color}18` }}>
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
            <div>
              <div className="text-2xl font-900 tabular-nums leading-none" style={{ color, fontWeight: 900 }}>{val}</div>
              <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Overall progress bar */}
      {projects.length > 0 && (
        <div className="rounded-xl p-4 mb-6 flex items-center gap-6"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs mb-2">
              <span style={{ color: "var(--text-muted)" }}>Portfolio-wide completion</span>
              <span className="font-800 tabular-nums" style={{ color: "var(--text-foreground)", fontWeight: 800 }}>
                {doneTasks} / {totalTasks} tasks · {avgProgress}% avg
              </span>
            </div>
            <div className="h-3 rounded-full overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
              <motion.div className="h-full rounded-full" animate={{ width: `${avgProgress}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                style={{ background: "linear-gradient(90deg, var(--accent), #16A34A)", boxShadow: "0 0 12px var(--accent-glow)" }} />
            </div>
          </div>
          <div className="flex gap-4 text-center shrink-0">
            <div>
              <div className="text-lg font-900 tabular-nums" style={{ color: "#16A34A", fontWeight: 900 }}>{doneTasks}</div>
              <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>Done</div>
            </div>
            <div>
              <div className="text-lg font-900 tabular-nums" style={{ color: "var(--accent)", fontWeight: 900 }}>
                {projects.reduce((a, p) => a + p.inProgress, 0)}
              </div>
              <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>Active</div>
            </div>
            <div>
              <div className="text-lg font-900 tabular-nums" style={{ color: "#DC2626", fontWeight: 900 }}>
                {projects.reduce((a, p) => a + p.overdue, 0)}
              </div>
              <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>Overdue</div>
            </div>
          </div>
        </div>
      )}

      {/* Search + filter */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects…" className="w-full pl-8 pr-3 py-2 text-xs rounded-xl outline-none"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-foreground)" }} />
        </div>
        <div className="flex gap-1.5">
          {(["ALL", "ON_TRACK", "AT_RISK", "OFF_TRACK"] as const).map((h) => (
            <button key={h} onClick={() => setHealthFilter(h)}
              className="px-3 py-1.5 rounded-lg text-xs font-700 transition-all"
              style={{
                fontWeight: 700,
                background: healthFilter === h ? (h === "ALL" ? "var(--accent)" : HEALTH[h]?.color ?? "var(--accent)") : "var(--bg-elevated)",
                color: healthFilter === h ? "#fff" : "var(--text-muted)",
              }}>
              {h === "ALL" ? "All" : HEALTH[h].label}
            </button>
          ))}
        </div>
      </div>

      {/* Projects grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--accent)" }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 flex flex-col items-center gap-3">
          <div className="text-4xl">📁</div>
          <p className="font-700 text-sm" style={{ color: "var(--text-foreground)", fontWeight: 700 }}>
            {search || healthFilter !== "ALL" ? "No matching projects" : "No projects yet"}
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {search || healthFilter !== "ALL" ? "Try adjusting your filters" : "Create your first project to see portfolio analytics"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((p) => <ProjectCard key={p.id} p={p} />)}
        </div>
      )}
    </div>
  );
}
