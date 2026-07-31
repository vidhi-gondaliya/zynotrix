"use client";
import { useEffect, useState, useMemo } from "react";
import { Plus, Search, X, ChevronRight, CalendarDays, Layers } from "lucide-react";
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

const STATUS_META: Record<string, { label: string; dot: string }> = {
  PLANNING:  { label: "Planning",  dot: "#60A5FA" },
  ACTIVE:    { label: "Active",    dot: "#4ADE80" },
  ON_HOLD:   { label: "On Hold",   dot: "#FBBF24" },
  COMPLETED: { label: "Completed", dot: "#22C55E" },
};

const TABS = [
  { id: "ALL",       label: "All" },
  { id: "ACTIVE",    label: "Active" },
  { id: "PLANNING",  label: "Planning" },
  { id: "ON_HOLD",   label: "On Hold" },
  { id: "COMPLETED", label: "Completed" },
];

/* ── Mini progress arc ─────────────────────────────────────────────────────── */
function MiniArc({ pct, color, index }: { pct: number; color: string; index: number }) {
  const sz = 44, sw = 4.5, r = (sz - sw) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={sz} height={sz} style={{ overflow: "visible", flexShrink: 0 }}>
      <circle cx={sz / 2} cy={sz / 2} r={r} fill="none" strokeWidth={sw} stroke="var(--bg-elevated)" />
      <motion.circle
        cx={sz / 2} cy={sz / 2} r={r} fill="none"
        strokeWidth={sw} stroke={color} strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ * (1 - Math.max(0, Math.min(100, pct)) / 100) }}
        transition={{ duration: 1.1, ease: [0.4, 0, 0.2, 1], delay: index * 0.05 + 0.2 }}
        transform={`rotate(-90 ${sz / 2} ${sz / 2})`}
        style={{ filter: `drop-shadow(0 0 3px ${color}88)` }}
      />
      <text x={sz / 2} y={sz / 2 + 1} textAnchor="middle" dominantBaseline="middle"
        style={{ fontSize: 10, fontWeight: 900, fill: "var(--text-foreground)", fontFamily: "inherit" }}>
        {Math.round(pct)}
      </text>
    </svg>
  );
}

/* ── Project cover card ────────────────────────────────────────────────────── */
function ProjectCard({ project, index }: { project: Project; index: number }) {
  const sm     = STATUS_META[project.status] ?? { label: project.status, dot: "#94A3B8" };
  const tasks  = project._count?.tasks ?? 0;
  const health = project.healthScore ?? 0;

  const safeDeadline = project.deadline ? new Date(project.deadline) : null;
  const deadlineValid = safeDeadline && !isNaN(safeDeadline.getTime());
  const daysLeft = deadlineValid ? differenceInDays(safeDeadline, new Date()) : null;
  const isOverdue = daysLeft !== null && daysLeft < 0 && project.status !== "COMPLETED";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ delay: index * 0.045, duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link href={`/projects/${project.id}/board`} style={{ textDecoration: "none", display: "block" }}>
        <div
          style={{
            borderRadius: 20, overflow: "hidden",
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
            transition: "box-shadow 0.22s ease, transform 0.22s ease, border-color 0.22s ease",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.boxShadow = `0 14px 44px rgba(0,0,0,0.14)`;
            el.style.transform = "translateY(-4px)";
            el.style.borderColor = project.color + "55";
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.boxShadow = "0 1px 6px rgba(0,0,0,0.05)";
            el.style.transform = "none";
            el.style.borderColor = "var(--border)";
          }}
        >
          {/* ── Cover ───────────────────────────────────────────────── */}
          <div style={{
            height: 134,
            background: `linear-gradient(140deg, ${project.color} 0%, ${project.color}bb 100%)`,
            position: "relative", padding: "14px 16px",
            display: "flex", flexDirection: "column", justifyContent: "space-between",
          }}>
            {/* Dot-grid pattern */}
            <div aria-hidden style={{
              position: "absolute", inset: 0, pointerEvents: "none",
              backgroundImage: "radial-gradient(rgba(255,255,255,0.13) 1px, transparent 1px)",
              backgroundSize: "18px 18px",
            }} />
            {/* Top row: status + arrow */}
            <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{
                display: "flex", alignItems: "center", gap: 5,
                fontSize: 9.5, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase",
                padding: "4px 10px", borderRadius: 100,
                background: "rgba(255,255,255,0.18)", color: "rgba(255,255,255,0.92)",
              }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: sm.dot, display: "block", flexShrink: 0 }} />
                {sm.label}
              </span>
              <ChevronRight style={{ width: 16, height: 16, color: "rgba(255,255,255,0.5)" }} />
            </div>
            {/* Project name */}
            <div style={{ position: "relative" }}>
              {project.clientName && (
                <p style={{ fontSize: 9.5, fontWeight: 600, color: "rgba(255,255,255,0.6)", letterSpacing: "0.06em", marginBottom: 3 }}>
                  {project.clientName}
                </p>
              )}
              <h3 style={{
                fontSize: 17, fontWeight: 900, color: "#ffffff",
                lineHeight: 1.2, letterSpacing: "-0.02em",
                textShadow: "0 1px 8px rgba(0,0,0,0.2)",
              }}>
                {project.name}
              </h3>
            </div>
          </div>

          {/* ── Body ────────────────────────────────────────────────── */}
          <div style={{ padding: "15px 16px 16px" }}>
            {/* Description */}
            {project.description ? (
              <p style={{
                fontSize: 12, color: "var(--text-muted)", lineHeight: 1.55, marginBottom: 14,
                display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
              }}>
                {project.description}
              </p>
            ) : (
              <div style={{ height: 8 }} />
            )}

            {/* Health + deadline row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              {/* Arc + labels */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <MiniArc pct={health} color={project.color} index={index} />
                <div>
                  <p style={{ fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-subtle)", marginBottom: 2 }}>Health</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Layers style={{ width: 10, height: 10, color: "var(--text-subtle)" }} />
                    <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)" }}>{tasks} task{tasks !== 1 ? "s" : ""}</p>
                  </div>
                </div>
              </div>

              {/* Deadline badge */}
              {deadlineValid ? (
                <div style={{
                  padding: "5px 10px", borderRadius: 10, textAlign: "right",
                  background: isOverdue ? "rgba(239,68,68,0.08)" : daysLeft! <= 7 ? "rgba(245,158,11,0.08)" : "var(--bg-elevated)",
                }}>
                  <p style={{
                    fontSize: 9.5, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase",
                    color: isOverdue ? "#EF4444" : daysLeft! <= 7 ? "#F59E0B" : "var(--text-subtle)",
                  }}>
                    {isOverdue ? "Overdue" : daysLeft === 0 ? "Due today" : `${daysLeft}d left`}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: 3, marginTop: 2, justifyContent: "flex-end" }}>
                    <CalendarDays style={{ width: 9, height: 9, color: "var(--text-subtle)" }} />
                    <p style={{ fontSize: 10, fontWeight: 500, color: "var(--text-muted)" }}>
                      {format(safeDeadline!, "MMM d")}
                    </p>
                  </div>
                </div>
              ) : (
                <p style={{ fontSize: 10, color: "var(--text-subtle)", padding: "5px 10px", background: "var(--bg-elevated)", borderRadius: 10 }}>No deadline</p>
              )}
            </div>

            {/* Footer divider + open link */}
            <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 12, display: "flex", justifyContent: "flex-end" }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: project.color }}>
                Open board →
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

/* ── Stat chip ─────────────────────────────────────────────────────────────── */
function StatChip({ label, value, color, sub }: { label: string; value: number; color: string; sub?: string }) {
  return (
    <div style={{
      flex: 1, minWidth: 0, padding: "14px 18px", borderRadius: 16,
      background: "var(--bg-card)", border: "1px solid var(--border)",
    }}>
      <p style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.04em", color, fontVariantNumeric: "tabular-nums", lineHeight: 1, marginBottom: 4 }}>
        {value}
      </p>
      <p style={{ fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-subtle)" }}>
        {label}
      </p>
      {sub && <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{sub}</p>}
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────────────────────── */
export default function ProjectsPage() {
  const [projects,    setProjects]    = useState<Project[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [showCreate,  setShowCreate]  = useState(false);
  const [creating,    setCreating]    = useState(false);
  const [activeTab,   setActiveTab]   = useState("ALL");
  const [search,      setSearch]      = useState("");
  const [form, setForm] = useState({
    name: "", description: "", color: PROJECT_COLORS[0],
    clientName: "", deadline: "", status: "ACTIVE",
  });

  useEffect(() => {
    fetch("/api/projects")
      .then(r => r.json())
      .then(d => { setProjects(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const stats = useMemo(() => ({
    total:     projects.length,
    active:    projects.filter(p => p.status === "ACTIVE").length,
    completed: projects.filter(p => p.status === "COMPLETED").length,
    overdue:   projects.filter(p => {
      if (!p.deadline || p.status === "COMPLETED") return false;
      const dt = new Date(p.deadline);
      return !isNaN(dt.getTime()) && differenceInDays(dt, new Date()) < 0;
    }).length,
  }), [projects]);

  const filtered = useMemo(() => {
    let list = projects;
    if (activeTab !== "ALL") list = list.filter(p => p.status === activeTab);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.clientName ?? "").toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [projects, activeTab, search]);

  const tabCount = (id: string) =>
    id === "ALL" ? projects.length : projects.filter(p => p.status === id).length;

  const createProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const p = await res.json();
      setProjects(prev => [p, ...prev]);
      setShowCreate(false);
      setForm({ name: "", description: "", color: PROJECT_COLORS[0], clientName: "", deadline: "", status: "ACTIVE" });
      toast.success("Project created");
    } else {
      toast.error("Failed to create project");
    }
    setCreating(false);
  };

  return (
    <div style={{ height: "calc(100vh - 64px)", display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* ── Page header ──────────────────────────────────────────────── */}
      <div style={{
        flexShrink: 0,
        background: "var(--bg-base)",
        borderBottom: "1px solid var(--border-subtle)",
        padding: "0 32px",
      }}>
        {/* Title row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 0 14px" }}>
          <h1 style={{ fontSize: 21, fontWeight: 900, letterSpacing: "-0.03em", color: "var(--text-foreground)" }}>
            Projects
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Search */}
            <div style={{ position: "relative" }}>
              <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 13, height: 13, color: "var(--text-subtle)", pointerEvents: "none" }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search…"
                style={{
                  paddingLeft: 30, paddingRight: search ? 28 : 12, height: 34,
                  borderRadius: 11, fontSize: 12.5, fontWeight: 500, width: 180,
                  background: "var(--bg-elevated)", border: "1px solid var(--border)",
                  color: "var(--text-foreground)", outline: "none",
                  transition: "border-color 0.15s, width 0.18s ease",
                }}
                onFocus={e => { e.currentTarget.style.borderColor = "rgba(99,102,241,0.45)"; e.currentTarget.style.width = "220px"; }}
                onBlur={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.width = "180px"; }}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 0, color: "var(--text-subtle)", display: "flex" }}>
                  <X style={{ width: 11, height: 11 }} />
                </button>
              )}
            </div>
            {/* New project */}
            <button
              onClick={() => setShowCreate(true)}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                height: 34, padding: "0 15px", borderRadius: 11,
                fontSize: 13, fontWeight: 700, color: "#fff", border: "none", cursor: "pointer",
                background: "linear-gradient(135deg, #6366F1 0%, #818CF8 100%)",
                boxShadow: "0 4px 14px rgba(99,102,241,0.38)",
                transition: "transform 0.15s, box-shadow 0.15s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1.04)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 20px rgba(99,102,241,0.5)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 14px rgba(99,102,241,0.38)"; }}
            >
              <Plus style={{ width: 14, height: 14, strokeWidth: 2.5 }} />
              New Project
            </button>
          </div>
        </div>

        {/* Status tabs */}
        <div style={{ display: "flex", gap: 0 }}>
          {TABS.map(tab => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "8px 14px", fontSize: 12.5,
                  fontWeight: active ? 700 : 500,
                  background: "none", border: "none", cursor: "pointer",
                  color: active ? "var(--accent)" : "var(--text-muted)",
                  borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
                  marginBottom: -1, transition: "color 0.15s",
                  whiteSpace: "nowrap",
                }}
              >
                {tab.label}
                <span style={{
                  fontSize: 9, fontWeight: 800, padding: "1.5px 6px", borderRadius: 100,
                  background: active ? "rgba(99,102,241,0.1)" : "var(--bg-elevated)",
                  color: active ? "var(--accent)" : "var(--text-subtle)",
                }}>
                  {tabCount(tab.id)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Scrollable content ───────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px 56px" }}>

        {loading ? (
          /* Skeleton */
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(288px, 1fr))", gap: 20 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ borderRadius: 20, overflow: "hidden", background: "var(--bg-card)", border: "1px solid var(--border)", animation: "pulse 1.8s ease-in-out infinite" }}>
                <div style={{ height: 134, background: "var(--bg-elevated)" }} />
                <div style={{ padding: "15px 16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
                  {[80, 95, 60].map((w, j) => (
                    <div key={j} style={{ height: 11, width: `${w}%`, borderRadius: 6, background: "var(--bg-elevated)" }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Stats strip (only when browsing all) */}
            <AnimatePresence>
              {activeTab === "ALL" && !search && (
                <motion.div
                  key="stats"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25 }}
                  style={{ display: "flex", gap: 12, marginBottom: 28 }}
                >
                  <StatChip label="Total"     value={stats.total}     color="var(--text-foreground)" />
                  <StatChip label="Active"    value={stats.active}    color="#818CF8" />
                  <StatChip label="Completed" value={stats.completed} color="#22C55E" />
                  <StatChip label="Overdue"   value={stats.overdue}   color={stats.overdue > 0 ? "#EF4444" : "var(--text-subtle)"} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Empty state */}
            {filtered.length === 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{ textAlign: "center", padding: "80px 0" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>
                  {search ? "🔍" : "📁"}
                </div>
                <p style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--text-foreground)", marginBottom: 6 }}>
                  {search ? `No results for "${search}"` : "No projects here yet"}
                </p>
                <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 24 }}>
                  {search ? "Try a different keyword" : "Create your first project to get started"}
                </p>
                {!search && (
                  <button
                    onClick={() => setShowCreate(true)}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 8,
                      padding: "10px 20px", borderRadius: 12, fontSize: 13, fontWeight: 700,
                      color: "#fff", background: "linear-gradient(135deg, #6366F1, #818CF8)",
                      border: "none", cursor: "pointer", boxShadow: "0 4px 14px rgba(99,102,241,0.35)",
                    }}>
                    <Plus style={{ width: 14, height: 14 }} />
                    New Project
                  </button>
                )}
              </motion.div>
            )}

            {/* Project grid */}
            {filtered.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(288px, 1fr))", gap: 20 }}>
                <AnimatePresence mode="popLayout">
                  {filtered.map((p, i) => (
                    <ProjectCard key={p.id} project={p} index={i} />
                  ))}
                </AnimatePresence>

                {/* Add project tile */}
                <motion.div
                  layout
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                  onClick={() => setShowCreate(true)}
                  style={{
                    borderRadius: 20, border: "2px dashed var(--border)",
                    minHeight: 134 + 130,
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10,
                    cursor: "pointer", color: "var(--text-subtle)",
                    transition: "border-color 0.15s, background 0.15s, color 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.borderColor = "rgba(99,102,241,0.4)";
                    el.style.color = "var(--accent)";
                    el.style.background = "rgba(99,102,241,0.03)";
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.borderColor = "var(--border)";
                    el.style.color = "var(--text-subtle)";
                    el.style.background = "transparent";
                  }}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: 12, border: "2px dashed currentColor",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Plus style={{ width: 18, height: 18 }} />
                  </div>
                  <span style={{ fontSize: 12.5, fontWeight: 600 }}>New Project</span>
                </motion.div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Create modal ──────────────────────────────────────────────── */}
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
              label="Status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              options={[
                { value: "PLANNING", label: "Planning" },
                { value: "ACTIVE",   label: "Active"   },
                { value: "ON_HOLD",  label: "On Hold"  },
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
            <button
              type="button" onClick={() => setShowCreate(false)}
              className="h-9 px-4 rounded-[10px] text-[13px] font-semibold transition-colors"
              style={{ color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "none"; }}>
              Cancel
            </button>
            <button
              type="submit" disabled={creating || !form.name.trim()}
              className="h-9 px-5 rounded-[10px] text-[13px] font-bold text-white flex items-center gap-2 disabled:opacity-60"
              style={{
                background: "linear-gradient(135deg, #6366F1, #818CF8)",
                boxShadow: creating ? "none" : "0 4px 14px rgba(99,102,241,0.38)",
                border: "none", cursor: creating ? "wait" : "pointer",
                transition: "box-shadow 0.15s",
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
