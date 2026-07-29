"use client";
import { useEffect, useState, useMemo } from "react";
import {
  Plus, MoreHorizontal, FileText, MessageSquare,
  Filter, CalendarDays, Users,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { motion, AnimatePresence } from "framer-motion";
import type { Project } from "@/types";
import Link from "next/link";
import { format, differenceInDays } from "date-fns";
import toast from "react-hot-toast";

const PROJECT_COLORS = [
  "#7C3AED", "#06B6D4", "#10B981", "#F59E0B",
  "#EF4444", "#EC4899", "#3B82F6", "#F97316",
];

const AVATAR_COLORS = ["#6366F1", "#EC4899", "#F59E0B", "#10B981", "#06B6D4", "#A78BFA"];

// Three Kanban columns — ON_HOLD projects surface in "On Going"
const COLUMNS = [
  { id: "PLANNING",  label: "Started",   accent: "#60A5FA", statuses: ["PLANNING"] },
  { id: "ACTIVE",    label: "On Going",  accent: "#818CF8", statuses: ["ACTIVE", "ON_HOLD"] },
  { id: "COMPLETED", label: "Completed", accent: "#22C55E", statuses: ["COMPLETED"] },
];

// ── Avatar stack ──────────────────────────────────────────────────────────────
function AvatarStack({ seed, count }: { seed: string; count: number }) {
  const shown = Math.min(Math.max(count, 2), 4);
  return (
    <div className="flex items-center">
      {Array.from({ length: shown }).map((_, i) => {
        const charCode = seed.charCodeAt(i % seed.length) % AVATAR_COLORS.length;
        return (
          <div key={i}
            className="w-[22px] h-[22px] rounded-full border-[1.5px] flex items-center justify-center text-[8px] font-bold text-white"
            style={{
              background: AVATAR_COLORS[(charCode + i) % AVATAR_COLORS.length],
              borderColor: "var(--bg-card)",
              marginLeft: i === 0 ? 0 : -6,
              zIndex: shown - i,
              position: "relative",
            }}>
            {String.fromCharCode(65 + i)}
          </div>
        );
      })}
    </div>
  );
}

// ── Kanban project card ───────────────────────────────────────────────────────
function ProjectCard({ project, index }: { project: Project; index: number }) {
  const progress = project.healthScore ?? 0;
  const taskCount = project._count?.tasks ?? 0;
  const commentCount = Math.max(0, taskCount - 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link href={`/projects/${project.id}/board`}>
        <div
          className="rounded-[16px] p-4 cursor-pointer group"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            transition: "border-color 0.2s, box-shadow 0.2s, transform 0.2s",
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.borderColor = project.color + "55";
            el.style.boxShadow = "0 8px 24px rgba(0,0,0,0.12)";
            el.style.transform = "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.borderColor = "var(--border)";
            el.style.boxShadow = "none";
            el.style.transform = "none";
          }}
        >
          {/* Tag chip + overflow button */}
          <div className="flex items-center justify-between mb-3">
            <span
              className="text-[10px] font-bold px-2.5 py-[3px] rounded-full"
              style={{ background: project.color + "20", color: project.color }}
            >
              {project.clientName || "General"}
            </span>
            <button
              onClick={(e) => e.preventDefault()}
              className="w-6 h-6 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: "var(--bg-elevated)", color: "var(--text-muted)" }}
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Title */}
          <h3 className="text-[13px] font-bold mb-1.5 leading-snug truncate"
            style={{ color: "var(--text-foreground)" }}>
            {project.name}
          </h3>

          {/* Description */}
          {project.description && (
            <p className="text-[11px] mb-3 line-clamp-2 leading-relaxed"
              style={{ color: "var(--text-muted)" }}>
              {project.description}
            </p>
          )}

          {/* Progress bar */}
          <div className="mb-3.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9.5px] font-semibold uppercase tracking-wide"
                style={{ color: "var(--text-subtle)" }}>Progress</span>
              <span className="text-[10px] font-bold" style={{ color: project.color }}>
                {Math.round(progress)}%
              </span>
            </div>
            <div className="h-[5px] rounded-full overflow-hidden"
              style={{ background: "var(--bg-elevated)" }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ delay: index * 0.05 + 0.25, duration: 0.8, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{
                  background: `linear-gradient(90deg, ${project.color}, ${project.color}99)`,
                  boxShadow: `0 0 6px ${project.color}44`,
                }}
              />
            </div>
          </div>

          {/* Bottom: avatars + file/comment counts */}
          <div className="flex items-center justify-between">
            <AvatarStack seed={project.id} count={taskCount} />
            <div className="flex items-center gap-2.5">
              <span className="flex items-center gap-1 text-[10px] font-semibold"
                style={{ color: "var(--text-muted)" }}>
                <FileText className="w-3 h-3" />
                {taskCount}
              </span>
              <span className="flex items-center gap-1 text-[10px] font-semibold"
                style={{ color: "var(--text-muted)" }}>
                <MessageSquare className="w-3 h-3" />
                {commentCount}
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// ── Sidebar donut ring ────────────────────────────────────────────────────────
function DonutRing({ pct }: { pct: number }) {
  const size = 128;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;

  return (
    <svg width={size} height={size} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="dring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#22C55E" />
        </linearGradient>
        <filter id="dring-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r}
        fill="none" strokeWidth={stroke} stroke="var(--bg-elevated)" />
      <motion.circle cx={size / 2} cy={size / 2} r={r}
        fill="none"
        strokeWidth={stroke}
        stroke="url(#dring-grad)"
        strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ * (1 - pct / 100) }}
        transition={{ duration: 1.3, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        filter="url(#dring-glow)"
      />
      <text x={size / 2} y={size / 2 - 6} textAnchor="middle" dominantBaseline="middle"
        style={{ fontSize: 24, fontWeight: 900, fill: "var(--text-foreground)", fontFamily: "inherit" }}>
        {Math.round(pct)}%
      </text>
      <text x={size / 2} y={size / 2 + 14} textAnchor="middle" dominantBaseline="middle"
        style={{ fontSize: 9.5, fontWeight: 600, fill: "var(--text-muted)", fontFamily: "inherit",
          textTransform: "uppercase", letterSpacing: "0.08em" }}>
        Complete
      </text>
    </svg>
  );
}

// ── Right sidebar panel ───────────────────────────────────────────────────────
function RightPanel({ projects }: { projects: Project[] }) {
  const total      = projects.length;
  const completed  = projects.filter((p) => p.status === "COMPLETED").length;
  const inProgress = projects.filter((p) => p.status === "ACTIVE").length;
  const waiting    = projects.filter((p) => ["PLANNING", "ON_HOLD"].includes(p.status)).length;
  const pct        = total > 0 ? Math.round((completed / total) * 100) : 0;

  const stats = [
    { label: "Total",       value: total,      color: "#6366F1" },
    { label: "Completed",   value: completed,  color: "#22C55E" },
    { label: "In Progress", value: inProgress, color: "#818CF8" },
    { label: "Waiting",     value: waiting,    color: "#FBBF24" },
  ];

  const upcoming = projects
    .filter((p) => p.deadline && p.status !== "COMPLETED")
    .map((p) => ({
      ...p,
      daysLeft: differenceInDays(new Date(p.deadline!), new Date()),
    }))
    .filter((p) => p.daysLeft >= 0)
    .sort((a, b) => a.daysLeft - b.daysLeft)[0];

  return (
    <div className="flex flex-col gap-4">

      {/* Team strip */}
      <div className="rounded-[18px] p-4"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-1.5 mb-3">
          <Users className="w-3.5 h-3.5" style={{ color: "var(--text-subtle)" }} />
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-subtle)" }}>
            Team
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {AVATAR_COLORS.slice(0, 5).map((c, i) => (
            <div key={i}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
              style={{ background: c, border: "2px solid var(--bg-card)" }}>
              {String.fromCharCode(65 + i)}
            </div>
          ))}
          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
            style={{ background: "var(--bg-elevated)", border: "2px dashed var(--border)" }}>
            <Plus className="w-3 h-3" style={{ color: "var(--text-subtle)" }} />
          </div>
        </div>
      </div>

      {/* Donut overview */}
      <div className="rounded-[18px] p-4 flex flex-col items-center"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <p className="text-[10px] font-bold uppercase tracking-widest mb-4 self-start"
          style={{ color: "var(--text-subtle)" }}>Overview</p>
        <DonutRing pct={pct} />
      </div>

      {/* Stat tiles 2×2 grid */}
      <div className="rounded-[18px] p-4"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <p className="text-[10px] font-bold uppercase tracking-widest mb-3"
          style={{ color: "var(--text-subtle)" }}>Statistics</p>
        <div className="grid grid-cols-2 gap-2">
          {stats.map((s, i) => (
            <motion.div key={s.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.07 + 0.2, duration: 0.3 }}
              className="rounded-[12px] p-3"
              style={{
                background: "var(--bg-elevated)",
                borderLeft: `3px solid ${s.color}`,
              }}>
              <p className="text-[20px] font-black leading-none mb-0.5" style={{ color: s.color }}>
                {s.value}
              </p>
              <p className="text-[9.5px] font-medium" style={{ color: "var(--text-muted)" }}>
                {s.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Upcoming deadline */}
      <div className="rounded-[18px] p-4"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-1.5 mb-3">
          <CalendarDays className="w-3.5 h-3.5" style={{ color: "var(--text-subtle)" }} />
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-subtle)" }}>
            Upcoming
          </p>
        </div>
        {upcoming ? (
          <div className="flex items-center gap-3 p-2.5 rounded-[10px]"
            style={{ background: "var(--bg-elevated)" }}>
            <div className="w-9 h-9 rounded-[10px] flex flex-col items-center justify-center text-white text-center shrink-0"
              style={{ background: `linear-gradient(135deg, ${upcoming.color}, ${upcoming.color}99)` }}>
              <span className="text-[7px] font-bold leading-none uppercase">
                {format(new Date(upcoming.deadline!), "MMM")}
              </span>
              <span className="text-[14px] font-black leading-none">
                {format(new Date(upcoming.deadline!), "d")}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-[11.5px] font-bold truncate" style={{ color: "var(--text-foreground)" }}>
                {upcoming.name}
              </p>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                {upcoming.daysLeft === 0 ? "Due today" : `${upcoming.daysLeft}d left`}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-[11px]" style={{ color: "var(--text-subtle)" }}>No upcoming deadlines</p>
        )}
      </div>

      {/* Quick note */}
      <div className="rounded-[18px] p-4"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <p className="text-[10px] font-bold uppercase tracking-widest mb-3"
          style={{ color: "var(--text-subtle)" }}>Quick Note</p>
        <textarea
          placeholder="Jot something down…"
          rows={3}
          className="w-full rounded-[10px] px-3 py-2 text-[11.5px] resize-none focus:outline-none transition-all"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-subtle)",
            color: "var(--text-foreground)",
            lineHeight: 1.6,
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(99,102,241,0.4)"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border-subtle)"; }}
        />
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ProjectsPage() {
  const [projects, setProjects]     = useState<Project[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating]     = useState(false);
  const [form, setForm] = useState({
    name: "", description: "", color: PROJECT_COLORS[0],
    clientName: "", deadline: "", status: "ACTIVE",
  });

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((d) => { setProjects(d); setLoading(false); });
  }, []);

  const columnMap = useMemo(() => {
    const map: Record<string, Project[]> = {};
    for (const col of COLUMNS) map[col.id] = [];
    for (const p of projects) {
      const col = COLUMNS.find((c) => c.statuses.includes(p.status));
      if (col) map[col.id].push(p);
    }
    return map;
  }, [projects]);

  const openCreate = (status: string) => {
    setForm((f) => ({ ...f, status }));
    setShowCreate(true);
  };

  const createProject = async (e: React.FormEvent) => {
    e.preventDefault(); setCreating(true);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const p = await res.json();
      setProjects((prev) => [p, ...prev]);
      setShowCreate(false);
      setForm({ name: "", description: "", color: PROJECT_COLORS[0], clientName: "", deadline: "", status: "ACTIVE" });
      toast.success("Project created");
    } else {
      toast.error("Failed to create project");
    }
    setCreating(false);
  };

  return (
    <div className="flex overflow-hidden" style={{ height: "calc(100vh - 64px)" }}>

      {/* ── Kanban main area ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <h1 className="text-[20px] font-black tracking-[-0.03em]"
            style={{ color: "var(--text-foreground)" }}>
            Projects
          </h1>
          <div className="flex items-center gap-2">
            <button
              className="w-9 h-9 rounded-[10px] flex items-center justify-center transition-colors"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-card-hover)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)"; }}
            >
              <Filter className="w-4 h-4" />
            </button>
            <button
              onClick={() => openCreate("ACTIVE")}
              className="flex items-center gap-2 h-9 px-4 rounded-[12px] text-[13px] font-bold text-white transition-transform"
              style={{
                background: "linear-gradient(135deg, #6366F1 0%, #818CF8 100%)",
                boxShadow: "0 4px 16px rgba(99,102,241,0.40), inset 0 1px 0 rgba(255,255,255,0.18)",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1.03)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
              Create Project
            </button>
          </div>
        </div>

        {/* Kanban columns */}
        <div className="flex-1 overflow-auto p-5">
          {loading ? (
            <div className="grid grid-cols-3 gap-5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <div className="skeleton h-8 rounded-xl" />
                  {Array.from({ length: 2 }).map((_, j) => (
                    <div key={j} className="skeleton h-[170px] rounded-[16px]" />
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-5">
              {COLUMNS.map((col) => {
                const colProjects = columnMap[col.id] ?? [];
                return (
                  <div key={col.id}>

                    {/* Column header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full shrink-0"
                          style={{ background: col.accent, boxShadow: `0 0 6px ${col.accent}88` }} />
                        <span className="text-[13px] font-bold" style={{ color: "var(--text-foreground)" }}>
                          {col.label}
                        </span>
                        <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ background: col.accent + "20", color: col.accent }}>
                          {colProjects.length}
                        </span>
                      </div>
                      <button
                        onClick={() => openCreate(col.statuses[0])}
                        className="w-6 h-6 rounded-[8px] flex items-center justify-center"
                        style={{
                          background: col.accent + "20",
                          color: col.accent,
                          transition: "background 0.15s, transform 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.background = col.accent + "35";
                          (e.currentTarget as HTMLElement).style.transform = "scale(1.1)";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.background = col.accent + "20";
                          (e.currentTarget as HTMLElement).style.transform = "scale(1)";
                        }}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Cards */}
                    <div className="space-y-3">
                      <AnimatePresence>
                        {colProjects.map((p, i) => (
                          <ProjectCard key={p.id} project={p} index={i} />
                        ))}
                      </AnimatePresence>

                      {/* Empty drop zone */}
                      {colProjects.length === 0 && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          onClick={() => openCreate(col.statuses[0])}
                          className="rounded-[14px] border-2 border-dashed p-6 flex flex-col items-center gap-2 cursor-pointer"
                          style={{
                            borderColor: "var(--border)",
                            color: "var(--text-subtle)",
                            transition: "border-color 0.15s, color 0.15s",
                          }}
                          onMouseEnter={(e) => {
                            const el = e.currentTarget as HTMLElement;
                            el.style.borderColor = col.accent + "55";
                            el.style.color = col.accent;
                          }}
                          onMouseLeave={(e) => {
                            const el = e.currentTarget as HTMLElement;
                            el.style.borderColor = "var(--border)";
                            el.style.color = "var(--text-subtle)";
                          }}
                        >
                          <Plus className="w-4 h-4" />
                          <span className="text-[11px] font-semibold">Add project</span>
                        </motion.div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Right sidebar panel ── */}
      <div
        className="w-[268px] shrink-0 overflow-y-auto p-4"
        style={{ borderLeft: "1px solid var(--border)" }}
      >
        {!loading && <RightPanel projects={projects} />}
      </div>

      {/* ── Create modal ── */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Project" size="md">
        <form onSubmit={createProject} className="p-6 space-y-4">
          <Input
            label="Project Name"
            placeholder="e.g. Website Redesign"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            autoFocus
          />
          <Textarea
            label="Description"
            placeholder="What is this project about?"
            rows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Column"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              options={[
                { value: "PLANNING", label: "Started"   },
                { value: "ACTIVE",   label: "On Going"  },
                { value: "ON_HOLD",  label: "On Hold"   },
              ]}
            />
            <Input
              label="Client / Tag"
              placeholder="Optional"
              value={form.clientName}
              onChange={(e) => setForm({ ...form, clientName: e.target.value })}
            />
          </div>
          <Input
            label="Deadline"
            type="date"
            value={form.deadline}
            onChange={(e) => setForm({ ...form, deadline: e.target.value })}
          />
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-widest mb-2"
              style={{ color: "var(--text-subtle)" }}>Color</label>
            <div className="flex gap-2 flex-wrap">
              {PROJECT_COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setForm({ ...form, color: c })}
                  className="w-8 h-8 rounded-[10px] transition-all"
                  style={{
                    background: c,
                    boxShadow: form.color === c
                      ? `0 0 0 2px var(--bg-card), 0 0 0 4px ${c}, 0 0 14px ${c}70`
                      : "none",
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
            <button type="submit" disabled={creating || !form.name.trim()}
              className="h-9 px-5 rounded-[10px] text-[13px] font-bold text-white flex items-center gap-2 disabled:opacity-60 transition-all"
              style={{
                background: "linear-gradient(135deg, #6366F1, #818CF8)",
                boxShadow: creating ? "none" : "0 4px 16px rgba(99,102,241,0.40)",
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
