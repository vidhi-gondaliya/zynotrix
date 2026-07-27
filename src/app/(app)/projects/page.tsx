"use client";
import { useEffect, useState, useMemo } from "react";
import {
  Plus, FolderKanban, Clock, CheckCircle2, LayoutGrid, List,
  Search, X, ArrowUpRight, Building2, Sparkles, TrendingUp,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { EmptyState } from "@/components/ui/EmptyState";
import { motion, AnimatePresence } from "framer-motion";
import type { Project } from "@/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, isPast, differenceInDays } from "date-fns";
import toast from "react-hot-toast";

const PROJECT_COLORS = [
  "#7C3AED", "#06B6D4", "#10B981", "#F59E0B",
  "#EF4444", "#EC4899", "#3B82F6", "#F97316",
];

const STATUS_CONFIG = {
  PLANNING:  { label: "Planning",  color: "#60A5FA", bg: "rgba(96,165,250,0.15)"  },
  ACTIVE:    { label: "Active",    color: "#34D399", bg: "rgba(52,211,153,0.15)"  },
  ON_HOLD:   { label: "On Hold",   color: "#FBBF24", bg: "rgba(251,191,36,0.15)"  },
  COMPLETED: { label: "Completed", color: "#A78BFA", bg: "rgba(167,139,250,0.15)" },
  ARCHIVED:  { label: "Archived",  color: "#6B7280", bg: "rgba(107,114,128,0.10)" },
};

const FILTERS = [
  { value: "",          label: "All"       },
  { value: "ACTIVE",    label: "Active"    },
  { value: "PLANNING",  label: "Planning"  },
  { value: "ON_HOLD",   label: "On Hold"   },
  { value: "COMPLETED", label: "Completed" },
];

function healthColor(score: number) {
  if (score >= 75) return "#34D399";
  if (score >= 50) return "#FBBF24";
  return "#FF4466";
}

// ── Project card — grid view ──────────────────────────────────────────────────
function ProjectCard({ project, index }: { project: Project; index: number }) {
  const status = STATUS_CONFIG[project.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.ACTIVE;
  const taskCount = project._count?.tasks ?? 0;
  const deadline = project.deadline ? new Date(project.deadline) : null;
  const daysLeft = deadline ? differenceInDays(deadline, new Date()) : null;
  const isOverdue = deadline && isPast(deadline);
  const health = project.healthScore ?? null;
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link href={`/projects/${project.id}/board`} className="block group">
        <div
          className="relative overflow-hidden rounded-[20px] cursor-pointer"
          style={{
            background: "var(--bg-card)",
            border: `1px solid ${hovered ? project.color + "45" : "var(--border)"}`,
            boxShadow: hovered
              ? `0 16px 48px rgba(0,0,0,0.22), 0 0 0 1px ${project.color}28, inset 0 1px 0 rgba(255,255,255,0.06)`
              : "0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.04)",
            transform: hovered ? "translateY(-5px)" : "none",
            transition: "all 0.25s cubic-bezier(0.16,1,0.3,1)",
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          {/* Gradient header area */}
          <div className="relative h-[90px] overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${project.color} 0%, ${project.color}88 60%, ${project.color}44 100%)` }}>
            {/* Decorative circles */}
            <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full pointer-events-none"
              style={{ background: "rgba(255,255,255,0.12)" }} />
            <div className="absolute right-8 bottom-2 w-16 h-16 rounded-full pointer-events-none"
              style={{ background: "rgba(255,255,255,0.08)" }} />
            {/* Status chip */}
            <div className="absolute top-3 right-3">
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full text-white"
                style={{ background: "rgba(0,0,0,0.25)", backdropFilter: "blur(8px)" }}>
                {status.label}
              </span>
            </div>
            {/* Project icon */}
            <div className="absolute bottom-3 left-4 flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-[12px] flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.22)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.25)" }}>
                <FolderKanban className="w-4.5 h-4.5 text-white" strokeWidth={2} />
              </div>
            </div>
            {/* Arrow on hover */}
            <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-6 h-6 rounded-full flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.22)", backdropFilter: "blur(8px)" }}>
                <ArrowUpRight className="w-3 h-3 text-white" />
              </div>
            </div>
          </div>

          {/* Card body */}
          <div className="p-4">
            <h3 className="text-[14.5px] font-bold leading-tight mb-0.5 truncate"
              style={{ color: "var(--text-foreground)", letterSpacing: "-0.02em" }}>
              {project.name}
            </h3>

            {project.clientName ? (
              <p className="text-[11px] font-medium flex items-center gap-1 mb-3" style={{ color: "var(--text-subtle)" }}>
                <Building2 className="w-3 h-3" /> {project.clientName}
              </p>
            ) : (
              <div className="mb-3" />
            )}

            {project.description && (
              <p className="text-[11.5px] leading-relaxed mb-3 line-clamp-2" style={{ color: "var(--text-muted)" }}>
                {project.description}
              </p>
            )}

            {/* Stats row */}
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1.5 font-semibold" style={{ color: "var(--text-muted)" }}>
                <CheckCircle2 className="w-3.5 h-3.5" />
                {taskCount} task{taskCount !== 1 ? "s" : ""}
              </span>

              {deadline && (
                <span className="flex items-center gap-1.5 font-semibold"
                  style={{ color: isOverdue ? "var(--danger)" : daysLeft !== null && daysLeft <= 7 ? "var(--warning)" : "var(--text-muted)" }}>
                  <Clock className="w-3.5 h-3.5" />
                  {isOverdue
                    ? `${Math.abs(daysLeft!)}d overdue`
                    : daysLeft === 0 ? "Due today"
                    : daysLeft !== null && daysLeft <= 7 ? `${daysLeft}d left`
                    : format(deadline, "MMM d")}
                </span>
              )}

              {health !== null && (
                <span className="flex items-center gap-1 font-bold ml-auto"
                  style={{ color: healthColor(health) }}>
                  <TrendingUp className="w-3 h-3" />
                  {Math.round(health)}%
                </span>
              )}
            </div>

            {/* Health bar */}
            {health !== null && (
              <div className="mt-3 h-[3px] rounded-full overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
                <motion.div className="h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${health}%` }}
                  transition={{ delay: index * 0.04 + 0.3, duration: 0.7, ease: "easeOut" }}
                  style={{
                    background: `linear-gradient(90deg, ${healthColor(health)}, ${healthColor(health)}bb)`,
                    boxShadow: `0 0 6px ${healthColor(health)}60`,
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// ── Project row — list view ───────────────────────────────────────────────────
function ProjectRow({ project, index }: { project: Project; index: number }) {
  const status = STATUS_CONFIG[project.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.ACTIVE;
  const taskCount = project._count?.tasks ?? 0;
  const deadline = project.deadline ? new Date(project.deadline) : null;
  const daysLeft = deadline ? differenceInDays(deadline, new Date()) : null;
  const isOverdue = deadline && isPast(deadline);
  const health = project.healthScore ?? null;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link href={`/projects/${project.id}/board`} className="group">
        <div
          className="flex items-center gap-4 px-4 py-3.5 transition-colors"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-card-hover)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
        >
          <div className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ background: project.color, boxShadow: `0 0 8px ${project.color}55` }} />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold truncate" style={{ color: "var(--text-foreground)", letterSpacing: "-0.01em" }}>
              {project.name}
            </p>
            {project.clientName && (
              <p className="text-[11px]" style={{ color: "var(--text-subtle)" }}>{project.clientName}</p>
            )}
          </div>
          <span className="text-[10.5px] font-bold px-2.5 py-1 rounded-full w-[88px] text-center"
            style={{ background: status.bg, color: status.color }}>
            {status.label}
          </span>
          <span className="text-[12px] font-medium w-16 text-center" style={{ color: "var(--text-muted)" }}>
            {taskCount} tasks
          </span>
          <span className="text-[12px] font-bold w-12 text-center"
            style={{ color: health !== null ? healthColor(health) : "var(--text-subtle)" }}>
            {health !== null ? `${Math.round(health)}%` : "—"}
          </span>
          <span className="text-[12px] font-medium w-20 text-right"
            style={{ color: isOverdue ? "var(--danger)" : "var(--text-muted)" }}>
            {deadline ? format(deadline, "MMM d") : "—"}
          </span>
          <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            style={{ color: "var(--text-subtle)" }} />
        </div>
      </Link>
    </motion.div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [form, setForm] = useState({
    name: "", description: "", color: PROJECT_COLORS[0],
    clientName: "", deadline: "", status: "ACTIVE",
  });

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((d) => { setProjects(d); setLoading(false); });
  }, []);

  const filtered = useMemo(() => projects.filter((p) => {
    if (statusFilter && p.status !== statusFilter) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) &&
        !p.clientName?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [projects, search, statusFilter]);

  const createProject = async (e: React.FormEvent) => {
    e.preventDefault(); setCreating(true);
    const res = await fetch("/api/projects", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    if (res.ok) {
      const p = await res.json();
      setProjects((prev) => [p, ...prev]);
      setShowCreate(false);
      setForm({ name: "", description: "", color: PROJECT_COLORS[0], clientName: "", deadline: "", status: "ACTIVE" });
      toast.success("Project created");
    } else toast.error("Failed to create project");
    setCreating(false);
  };

  const activeCount = projects.filter((p) => p.status === "ACTIVE").length;

  return (
    <div className="p-6 space-y-6">

      {/* ── Page header with summary strip ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[22px] font-black tracking-[-0.03em]" style={{ color: "var(--text-foreground)" }}>
            Projects
          </h1>
          <p className="text-[12px] mt-0.5" style={{ color: "var(--text-subtle)" }}>
            {projects.length} total · {activeCount} active
          </p>
        </div>
        <button
          onClick={() => router.push("/projects/new")}
          className="flex items-center gap-2 h-9 px-5 rounded-[12px] text-[13px] font-bold text-white transition-all hover:scale-[1.03] active:scale-[0.98]"
          style={{
            background: "linear-gradient(135deg, #6366F1 0%, #A78BFA 100%)",
            boxShadow: "0 4px 20px rgba(99,102,241,0.40), inset 0 1px 0 rgba(255,255,255,0.20)",
          }}
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={2.5} /> New Project
        </button>
      </div>

      {/* ── Quick summary pills ── */}
      {!loading && projects.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {Object.entries(STATUS_CONFIG).filter(([k]) => projects.some(p => p.status === k)).map(([key, cfg]) => {
            const count = projects.filter(p => p.status === key).length;
            return (
              <button key={key}
                onClick={() => setStatusFilter(statusFilter === key ? "" : key)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11.5px] font-bold transition-all"
                style={{
                  background: statusFilter === key ? cfg.bg : "var(--bg-elevated)",
                  color: statusFilter === key ? cfg.color : "var(--text-muted)",
                  border: `1px solid ${statusFilter === key ? cfg.color + "40" : "var(--border)"}`,
                }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.color }} />
                {cfg.label} <span className="opacity-60">{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Filter bar ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px] max-w-[280px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "var(--text-subtle)" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects…"
            className="w-full pl-9 pr-3 h-9 rounded-[10px] text-[12.5px] font-medium outline-none transition-all"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              color: "var(--text-foreground)",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "rgba(99,102,241,0.5)";
              e.currentTarget.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.08)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2"
              style={{ color: "var(--text-subtle)" }}>
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="ml-auto flex items-center gap-1.5 p-1 rounded-[10px]"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
          {[
            { v: "grid", icon: <LayoutGrid className="w-3.5 h-3.5" /> },
            { v: "list", icon: <List className="w-3.5 h-3.5" /> }
          ].map(({ v, icon }) => (
            <button key={v} onClick={() => setView(v as "grid" | "list")}
              className="flex items-center justify-center w-7 h-7 rounded-[8px] transition-all"
              style={{
                background: view === v ? "var(--bg-card)" : "transparent",
                color: view === v ? "var(--text-foreground)" : "var(--text-subtle)",
                boxShadow: view === v ? "0 1px 4px rgba(0,0,0,0.10)" : "none",
              }}>
              {icon}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className={view === "grid" ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" : "space-y-1"}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`skeleton rounded-[20px] ${view === "grid" ? "h-[230px]" : "h-12"}`} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<FolderKanban className="w-6 h-6" />}
          title={search || statusFilter ? "No matching projects" : "No projects yet"}
          description={search || statusFilter ? "Try a different search or filter." : "Create your first project to get started."}
          action={!search && !statusFilter ? (
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 h-9 px-4 rounded-[12px] text-[13px] font-bold text-white"
              style={{ background: "linear-gradient(135deg,#6366F1,#A78BFA)", boxShadow: "0 4px 16px rgba(99,102,241,0.35)" }}>
              <Plus className="w-3.5 h-3.5" /> Create Project
            </button>
          ) : undefined}
        />
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((p, i) => <ProjectCard key={p.id} project={p} index={i} />)}
        </div>
      ) : (
        <div className="rounded-[16px] overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--bg-card)" }}>
          <div className="flex items-center gap-4 px-4 py-3"
            style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-elevated)" }}>
            <div className="w-2.5 shrink-0" />
            <p className="flex-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-subtle)" }}>Project</p>
            <p className="text-[10px] font-bold uppercase tracking-widest w-[88px] text-center" style={{ color: "var(--text-subtle)" }}>Status</p>
            <p className="text-[10px] font-bold uppercase tracking-widest w-16 text-center" style={{ color: "var(--text-subtle)" }}>Tasks</p>
            <p className="text-[10px] font-bold uppercase tracking-widest w-12 text-center" style={{ color: "var(--text-subtle)" }}>Health</p>
            <p className="text-[10px] font-bold uppercase tracking-widest w-20 text-right" style={{ color: "var(--text-subtle)" }}>Deadline</p>
            <div className="w-3.5 shrink-0" />
          </div>
          {filtered.map((p, i) => <ProjectRow key={p.id} project={p} index={i} />)}
        </div>
      )}

      {/* ── Create modal ── */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Project" size="md">
        <form onSubmit={createProject} className="p-6 space-y-4">
          <Input label="Project Name" placeholder="e.g. Website Redesign" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} required autoFocus />
          <Textarea label="Description" placeholder="What is this project about?" rows={2}
            value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
              options={[
                { value: "PLANNING", label: "Planning" },
                { value: "ACTIVE",   label: "Active"   },
                { value: "ON_HOLD",  label: "On Hold"  },
              ]} />
            <Input label="Client Name" placeholder="Optional" value={form.clientName}
              onChange={(e) => setForm({ ...form, clientName: e.target.value })} />
          </div>
          <Input label="Deadline" type="date" value={form.deadline}
            onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-widest mb-2"
              style={{ color: "var(--text-subtle)" }}>Color</label>
            <div className="flex gap-2">
              {PROJECT_COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setForm({ ...form, color: c })}
                  className="w-8 h-8 rounded-[10px] transition-all"
                  style={{
                    background: c,
                    boxShadow: form.color === c ? `0 0 0 2px var(--bg-card), 0 0 0 4px ${c}, 0 0 12px ${c}60` : "none",
                    transform: form.color === c ? "scale(1.18)" : "scale(1)",
                  }} />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowCreate(false)}
              className="h-9 px-4 rounded-[10px] text-[13px] font-semibold transition-colors"
              style={{ color: "var(--text-muted)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
              Cancel
            </button>
            <button type="submit" disabled={creating}
              className="h-9 px-5 rounded-[10px] text-[13px] font-bold text-white flex items-center gap-2 disabled:opacity-60 transition-all"
              style={{
                background: "linear-gradient(135deg, #6366F1, #A78BFA)",
                boxShadow: creating ? "none" : "0 4px 20px rgba(99,102,241,0.40)",
              }}>
              {creating
                ? <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                : <Plus className="w-3.5 h-3.5" />}
              {creating ? "Creating…" : "Create Project"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
