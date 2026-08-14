"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Search, X, ChevronRight, CalendarDays, Layers,
  CheckCircle2, AlertTriangle, TrendingDown, Users,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Project } from "@/types";
import Link from "next/link";
import { format, differenceInDays, isPast } from "date-fns";
import { Avatar } from "@/components/ui/Avatar";

// ── Portfolio enrichment data ──────────────────────────────────────────────
interface PortfolioMember { id: string; name: string | null; image: string | null; email: string; }
interface PortfolioProject {
  id: string;
  total: number; done: number; inProgress: number; todo: number; overdue: number;
  progress: number;
  health: "ON_TRACK" | "AT_RISK" | "OFF_TRACK";
  members: PortfolioMember[];
  budget: number | null; budgetSpent: number;
}
interface PortfolioSummary { total: number; onTrack: number; atRisk: number; offTrack: number; }

const HEALTH = {
  ON_TRACK:  { label: "On Track",  color: "#16A34A", Icon: CheckCircle2  },
  AT_RISK:   { label: "At Risk",   color: "#D97706", Icon: AlertTriangle  },
  OFF_TRACK: { label: "Off Track", color: "#DC2626", Icon: TrendingDown   },
} as const;

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

// ── Mini progress arc ──────────────────────────────────────────────────────
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

// ── Project card ───────────────────────────────────────────────────────────
function ProjectCard({
  project, index, portfolio,
}: {
  project: Project;
  index: number;
  portfolio: PortfolioProject | null;
}) {
  const sm     = STATUS_META[project.status] ?? { label: project.status, dot: "#94A3B8" };
  const tasks  = project._count?.tasks ?? portfolio?.total ?? 0;
  const health = project.healthScore ?? 0;

  const safeDeadline   = project.deadline ? new Date(project.deadline) : null;
  const deadlineValid  = safeDeadline && !isNaN(safeDeadline.getTime());
  const daysLeft       = deadlineValid ? differenceInDays(safeDeadline, new Date()) : null;
  const isOverdue      = daysLeft !== null && daysLeft < 0 && project.status !== "COMPLETED";

  // Portfolio enrichment
  const ph = portfolio;
  const healthInfo = ph ? HEALTH[ph.health] : null;
  const budgetPct = ph?.budget && ph.budget > 0
    ? Math.min(Math.round((ph.budgetSpent / ph.budget) * 100), 100)
    : null;

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
          {/* Cover */}
          <div style={{
            height: 120,
            background: `linear-gradient(140deg, ${project.color} 0%, ${project.color}bb 100%)`,
            position: "relative", padding: "14px 16px",
            display: "flex", flexDirection: "column", justifyContent: "space-between",
          }}>
            <div aria-hidden style={{
              position: "absolute", inset: 0, pointerEvents: "none",
              backgroundImage: "radial-gradient(rgba(255,255,255,0.13) 1px, transparent 1px)",
              backgroundSize: "18px 18px",
            }} />
            {/* Top row: status + health chip */}
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
              {healthInfo ? (
                <span style={{
                  display: "flex", alignItems: "center", gap: 4,
                  fontSize: 9.5, fontWeight: 800,
                  padding: "4px 9px", borderRadius: 100,
                  background: `${healthInfo.color}22`,
                  color: healthInfo.color,
                  border: `1px solid ${healthInfo.color}55`,
                }}>
                  <healthInfo.Icon style={{ width: 9, height: 9 }} />
                  {healthInfo.label}
                </span>
              ) : (
                <ChevronRight style={{ width: 16, height: 16, color: "rgba(255,255,255,0.5)" }} />
              )}
            </div>
            {/* Project name */}
            <div style={{ position: "relative" }}>
              {project.clientName && (
                <p style={{ fontSize: 9.5, fontWeight: 600, color: "rgba(255,255,255,0.6)", letterSpacing: "0.06em", marginBottom: 3 }}>
                  {project.clientName}
                </p>
              )}
              <h3 style={{
                fontSize: 16, fontWeight: 900, color: "#ffffff",
                lineHeight: 1.2, letterSpacing: "-0.02em",
                textShadow: "0 1px 8px rgba(0,0,0,0.2)",
              }}>
                {project.name}
              </h3>
            </div>
          </div>

          {/* Progress bar (portfolio data) */}
          {ph && (
            <div style={{ padding: "10px 16px 0", background: "var(--bg-card)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontSize: 9.5, color: "var(--text-muted)" }}>Progress</span>
                <span style={{ fontSize: 10, fontWeight: 800, color: "var(--text-foreground)", fontVariantNumeric: "tabular-nums" }}>
                  {ph.progress}%
                </span>
              </div>
              <div style={{ height: 5, borderRadius: 100, overflow: "hidden", background: "var(--bg-elevated)" }}>
                <motion.div
                  animate={{ width: `${ph.progress}%` }}
                  initial={{ width: 0 }}
                  transition={{ duration: 0.9, ease: "easeOut", delay: index * 0.04 + 0.15 }}
                  style={{
                    height: "100%", borderRadius: 100,
                    background: ph.progress >= 80 ? "#16A34A" : ph.progress >= 40 ? project.color : "#D97706",
                    boxShadow: `0 0 8px ${project.color}60`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Body */}
          <div style={{ padding: ph ? "10px 16px 14px" : "15px 16px 16px" }}>
            {/* Description */}
            {project.description ? (
              <p style={{
                fontSize: 12, color: "var(--text-muted)", lineHeight: 1.55, marginBottom: 12,
                display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
              }}>
                {project.description}
              </p>
            ) : (
              <div style={{ height: ph ? 4 : 8 }} />
            )}

            {/* Task status chips (portfolio) */}
            {ph && (
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 12 }}>
                {[
                  { label: "Done",        val: ph.done,       color: "#16A34A", bg: "#16A34A18" },
                  { label: "In Progress", val: ph.inProgress, color: "#7C3AED", bg: "#7C3AED18" },
                  { label: "Todo",        val: ph.todo,       color: "#60A5FA", bg: "#60A5FA18" },
                  ...(ph.overdue > 0 ? [{ label: "Overdue", val: ph.overdue, color: "#DC2626", bg: "#DC262618" }] : []),
                ].map((s) => (
                  <span key={s.label} style={{
                    display: "flex", alignItems: "center", gap: 4,
                    padding: "2px 8px", borderRadius: 100, fontSize: 9.5, fontWeight: 700,
                    background: s.bg, color: s.color,
                  }}>
                    {s.val} {s.label}
                  </span>
                ))}
              </div>
            )}

            {/* Budget bar (portfolio) */}
            {ph && budgetPct !== null && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 9.5, color: "var(--text-muted)" }}>Budget</span>
                  <span style={{
                    fontSize: 9.5, fontWeight: 700, fontVariantNumeric: "tabular-nums",
                    color: budgetPct >= 90 ? "#DC2626" : "var(--text-muted)",
                  }}>
                    ${ph.budgetSpent.toLocaleString()} / ${ph.budget!.toLocaleString()}
                  </span>
                </div>
                <div style={{ height: 4, borderRadius: 100, overflow: "hidden", background: "var(--bg-elevated)" }}>
                  <div style={{
                    height: "100%", borderRadius: 100, width: `${budgetPct}%`,
                    background: budgetPct >= 90 ? "#DC2626" : budgetPct >= 70 ? "#D97706" : "#16A34A",
                    transition: "width 0.8s ease",
                  }} />
                </div>
              </div>
            )}

            {/* Health arc + deadline + team avatars (fallback / combined footer) */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              {/* Left: arc (no portfolio) or avatar stack (with portfolio) */}
              {ph ? (
                <div style={{ display: "flex", alignItems: "center" }}>
                  {/* Avatar stack */}
                  <div style={{ display: "flex", alignItems: "center" }}>
                    {ph.members.slice(0, 4).map((m) => (
                      <div key={m.id} style={{ marginRight: -6, border: "2px solid var(--bg-card)", borderRadius: "50%" }}>
                        <Avatar name={m.name} image={m.image} size="xs" />
                      </div>
                    ))}
                    {ph.members.length > 4 && (
                      <div style={{
                        width: 20, height: 20, borderRadius: "50%",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 8, fontWeight: 800,
                        background: "var(--bg-elevated)", color: "var(--text-muted)",
                        border: "2px solid var(--bg-card)",
                      }}>
                        +{ph.members.length - 4}
                      </div>
                    )}
                    {ph.members.length === 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--text-muted)" }}>
                        <Users style={{ width: 12, height: 12 }} />
                        <span style={{ fontSize: 10 }}>No members</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
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
              )}

              {/* Right: deadline */}
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

            {/* "Open board" footer */}
            {!ph && (
              <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 12, marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: project.color }}>Open board →</span>
              </div>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// ── Stat chip ──────────────────────────────────────────────────────────────
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

// ── Page ───────────────────────────────────────────────────────────────────
export default function ProjectsPage() {
  const router = useRouter();
  const [projects,    setProjects]    = useState<Project[]>([]);
  const [portfolioMap, setPortfolioMap] = useState<Record<string, PortfolioProject>>({});
  const [summary,     setSummary]     = useState<PortfolioSummary | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [activeTab,   setActiveTab]   = useState("ALL");
  const [search,      setSearch]      = useState("");
  const [healthFilter, setHealthFilter] = useState<"ALL" | "ON_TRACK" | "AT_RISK" | "OFF_TRACK">("ALL");

  useEffect(() => {
    Promise.all([
      fetch("/api/projects").then((r) => r.json()),
      fetch("/api/portfolio").then((r) => r.json()),
    ]).then(([projectsData, portfolioData]) => {
      setProjects(Array.isArray(projectsData) ? projectsData : []);
      if (portfolioData?.projects) {
        const map: Record<string, PortfolioProject> = {};
        for (const p of portfolioData.projects) map[p.id] = p;
        setPortfolioMap(map);
        setSummary(portfolioData.summary ?? null);
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => ({
    total:     projects.length,
    active:    projects.filter((p) => p.status === "ACTIVE").length,
    completed: projects.filter((p) => p.status === "COMPLETED").length,
    overdue:   projects.filter((p) => {
      if (!p.deadline || p.status === "COMPLETED") return false;
      const dt = new Date(p.deadline);
      return !isNaN(dt.getTime()) && differenceInDays(dt, new Date()) < 0;
    }).length,
  }), [projects]);

  const filtered = useMemo(() => {
    let list = projects;
    if (activeTab !== "ALL") list = list.filter((p) => p.status === activeTab);
    if (healthFilter !== "ALL") list = list.filter((p) => portfolioMap[p.id]?.health === healthFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        (p.clientName ?? "").toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [projects, activeTab, healthFilter, search, portfolioMap]);

  const tabCount = (id: string) =>
    id === "ALL" ? projects.length : projects.filter((p) => p.status === id).length;

  return (
    <div style={{ height: "calc(100vh - 64px)", display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* Header */}
      <div style={{
        flexShrink: 0,
        background: "var(--bg-base)",
        borderBottom: "1px solid var(--border-subtle)",
        padding: "0 32px",
      }}>
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
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                style={{
                  paddingLeft: 30, paddingRight: search ? 28 : 12, height: 34,
                  borderRadius: 11, fontSize: 12.5, fontWeight: 500, width: 180,
                  background: "var(--bg-elevated)", border: "1px solid var(--border)",
                  color: "var(--text-foreground)", outline: "none",
                  transition: "border-color 0.15s, width 0.18s ease",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(99,102,241,0.45)"; e.currentTarget.style.width = "220px"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.width = "180px"; }}
              />
              {search && (
                <button onClick={() => setSearch("")}
                  style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 0, color: "var(--text-subtle)", display: "flex" }}>
                  <X style={{ width: 11, height: 11 }} />
                </button>
              )}
            </div>
            <button
              onClick={() => router.push("/projects/new")}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                height: 34, padding: "0 15px", borderRadius: 11,
                fontSize: 13, fontWeight: 700, color: "#fff", border: "none", cursor: "pointer",
                background: "linear-gradient(135deg, #6366F1 0%, #818CF8 100%)",
                boxShadow: "0 4px 14px rgba(99,102,241,0.38)",
                transition: "transform 0.15s, box-shadow 0.15s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1.04)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 20px rgba(99,102,241,0.5)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 14px rgba(99,102,241,0.38)"; }}
            >
              <Plus style={{ width: 14, height: 14, strokeWidth: 2.5 }} />
              New Project
            </button>
          </div>
        </div>

        {/* Status tabs + health filter row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 0 }}>
            {TABS.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "8px 14px", fontSize: 12.5,
                    fontWeight: active ? 700 : 500,
                    background: "none", border: "none", cursor: "pointer",
                    color: active ? "var(--accent)" : "var(--text-muted)",
                    borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
                    marginBottom: -1, transition: "color 0.15s",
                    whiteSpace: "nowrap",
                  }}>
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

          {/* Health filter pills */}
          {summary && (
            <div style={{ display: "flex", gap: 6, paddingBottom: 8 }}>
              {([
                { id: "ALL",       label: "All",       color: "var(--accent)",  count: summary.total    },
                { id: "ON_TRACK",  label: "On Track",  color: "#16A34A",        count: summary.onTrack  },
                { id: "AT_RISK",   label: "At Risk",   color: "#D97706",        count: summary.atRisk   },
                { id: "OFF_TRACK", label: "Off Track", color: "#DC2626",        count: summary.offTrack },
              ] as const).map(({ id, label, color, count }) => (
                <button key={id} onClick={() => setHealthFilter(id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 5,
                    padding: "4px 10px", borderRadius: 100, fontSize: 10.5, fontWeight: 700,
                    border: "none", cursor: "pointer",
                    background: healthFilter === id ? color : "var(--bg-elevated)",
                    color: healthFilter === id ? "#fff" : "var(--text-muted)",
                    transition: "background 0.15s, color 0.15s",
                  }}>
                  {label}
                  <span style={{
                    fontSize: 9, fontWeight: 900, padding: "1px 5px", borderRadius: 100,
                    background: healthFilter === id ? "rgba(255,255,255,0.2)" : "var(--border)",
                    color: healthFilter === id ? "#fff" : "var(--text-subtle)",
                  }}>
                    {count}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px 56px" }}>

        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(288px, 1fr))", gap: 20 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ borderRadius: 20, overflow: "hidden", background: "var(--bg-card)", border: "1px solid var(--border)", animation: "pulse 1.8s ease-in-out infinite" }}>
                <div style={{ height: 120, background: "var(--bg-elevated)" }} />
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
            {/* Stats strip */}
            <AnimatePresence>
              {activeTab === "ALL" && !search && healthFilter === "ALL" && (
                <motion.div key="stats"
                  initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25 }}
                  style={{ display: "flex", gap: 12, marginBottom: 28 }}>
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
                  {search ? "🔍" : healthFilter !== "ALL" ? "📊" : "📁"}
                </div>
                <p style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--text-foreground)", marginBottom: 6 }}>
                  {search ? `No results for "${search}"` : healthFilter !== "ALL" ? `No ${HEALTH[healthFilter].label.toLowerCase()} projects` : "No projects here yet"}
                </p>
                <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 24 }}>
                  {search || healthFilter !== "ALL" ? "Try adjusting your filters" : "Create your first project to get started"}
                </p>
                {!search && healthFilter === "ALL" && (
                  <button onClick={() => router.push("/projects/new")}
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
                    <ProjectCard key={p.id} project={p} index={i} portfolio={portfolioMap[p.id] ?? null} />
                  ))}
                </AnimatePresence>

                {/* Add project tile */}
                <motion.div
                  layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                  onClick={() => router.push("/projects/new")}
                  style={{
                    borderRadius: 20, border: "2px dashed var(--border)",
                    minHeight: 300,
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
    </div>
  );
}
