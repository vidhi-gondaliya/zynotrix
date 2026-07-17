"use client";
import { useState, useEffect, useCallback } from "react";
import {
  FileText, Sparkles, Copy, Download, Filter,
  BarChart2, Users, Calendar, Flag, CheckCircle2,
  AlertTriangle, Clock, RefreshCw, ChevronDown, X, Printer,
} from "lucide-react";
import { useClaude } from "@/hooks/useClaude";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import { motion, AnimatePresence } from "framer-motion";
import { format, subDays, subMonths } from "date-fns";
import toast from "react-hot-toast";

// ── Types ──────────────────────────────────────────────────────────────────────
interface Project { id: string; name: string; color: string; }
interface UserItem { id: string; name: string | null; image: string | null; }

interface ReportFilters {
  reportType: string;
  startDate:  string;
  endDate:    string;
  projectIds: string[];
  memberIds:  string[];
  statuses:   string[];
  priorities: string[];
  sections:   string[];
}

// ── Constants ─────────────────────────────────────────────────────────────────
const REPORT_TYPES = [
  { value: "weekly",     label: "Weekly Summary",        icon: "📅" },
  { value: "daily",      label: "Daily Standup",         icon: "☀️" },
  { value: "client",     label: "Client Report",         icon: "👔" },
  { value: "sprint",     label: "Sprint Retrospective",  icon: "🏃" },
  { value: "team",       label: "Team Performance",      icon: "👥" },
  { value: "custom",     label: "Custom Report",         icon: "⚡" },
];

const DATE_PRESETS = [
  { label: "Last 7 days",   start: () => format(subDays(new Date(), 7), "yyyy-MM-dd") },
  { label: "Last 30 days",  start: () => format(subDays(new Date(), 30), "yyyy-MM-dd") },
  { label: "Last 3 months", start: () => format(subMonths(new Date(), 3), "yyyy-MM-dd") },
  { label: "This month",    start: () => format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), "yyyy-MM-dd") },
];

const TASK_STATUSES = ["BACKLOG", "TODO", "IN_PROGRESS", "REVIEW", "DONE"];
const TASK_PRIORITIES = ["URGENT", "HIGH", "MEDIUM", "LOW"];
const STATUS_COLOR: Record<string, string> = {
  BACKLOG: "#6B7280", TODO: "#60A5FA", IN_PROGRESS: "#9D6BFF", REVIEW: "#FFC107", DONE: "#00F090",
};
const PRI_COLOR: Record<string, string> = {
  URGENT: "#FF4466", HIGH: "#FFC107", MEDIUM: "#60A5FA", LOW: "#6B7280",
};

const REPORT_SECTIONS = [
  { key: "task_summary",    label: "Task Summary",      icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  { key: "overdue",         label: "Overdue Tasks",     icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  { key: "team_activity",   label: "Team Activity",     icon: <Users className="w-3.5 h-3.5" /> },
  { key: "time_tracking",   label: "Time Tracking",     icon: <Clock className="w-3.5 h-3.5" /> },
  { key: "priorities",      label: "Priority Breakdown",icon: <Flag className="w-3.5 h-3.5" /> },
  { key: "completion_rate", label: "Completion Rate",   icon: <BarChart2 className="w-3.5 h-3.5" /> },
];

// ── Multi-select chip group ────────────────────────────────────────────────────
function ChipGroup<T extends string>({ items, selected, onChange, color }: {
  items: { value: T; label: string }[];
  selected: T[];
  onChange: (v: T[]) => void;
  color?: (v: T) => string;
}) {
  const toggle = (v: T) => onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => {
        const active = selected.includes(item.value);
        const c = color?.(item.value) ?? "var(--accent)";
        return (
          <button key={item.value} onClick={() => toggle(item.value)}
            className="px-2.5 py-1 rounded-full text-[11px] font-bold transition-all"
            style={{
              background: active ? `${c}20` : "var(--bg-elevated)",
              color: active ? c : "var(--text-subtle)",
              border: `1px solid ${active ? c + "40" : "transparent"}`,
            }}>
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const today   = format(new Date(), "yyyy-MM-dd");
  const weekAgo = format(subDays(new Date(), 7), "yyyy-MM-dd");

  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers]       = useState<UserItem[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(true);

  const [filters, setFilters] = useState<ReportFilters>({
    reportType: "weekly",
    startDate:  weekAgo,
    endDate:    today,
    projectIds: [],
    memberIds:  [],
    statuses:   [],
    priorities: [],
    sections:   ["task_summary", "team_activity", "completion_rate"],
  });

  const { ask, text, streaming, reset } = useClaude();

  useEffect(() => {
    fetch("/api/projects").then((r) => r.json()).then((d) => setProjects(Array.isArray(d) ? d : [])).catch(() => {});
    fetch("/api/users").then((r) => r.json()).then((d) => setUsers(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  const setF = useCallback(<K extends keyof ReportFilters>(key: K, val: ReportFilters[K]) =>
    setFilters((f) => ({ ...f, [key]: val })), []);

  const applyPreset = (preset: typeof DATE_PRESETS[0]) => {
    setF("startDate", preset.start());
    setF("endDate", today);
  };

  const generate = () => {
    const body: Record<string, unknown> = { ...filters };
    ask("/api/ai/reports", body);
  };

  const copyReport = () => {
    navigator.clipboard.writeText(text);
    toast.success("Copied!");
  };

  const downloadReport = () => {
    const blob = new Blob([text], { type: "text/markdown" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = `${filters.reportType}-report-${filters.startDate}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printReport = () => {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Report</title>
<style>body{font-family:system-ui,sans-serif;max-width:800px;margin:40px auto;padding:0 20px;color:#111}
h1,h2,h3{color:#111}p{line-height:1.6}ul{padding-left:20px}pre{background:#f5f5f5;padding:12px;border-radius:8px;overflow:auto}
code{background:#f0f0f0;padding:2px 6px;border-radius:4px;font-size:13px}
@media print{body{margin:0}}</style></head>
<body><pre style="white-space:pre-wrap;font-family:system-ui">${text.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
<script>window.print();window.close();</script></body></html>`);
    win.document.close();
  };

  const activeFilterCount = [
    filters.projectIds.length, filters.memberIds.length,
    filters.statuses.length, filters.priorities.length,
  ].reduce((a, b) => a + b, 0);

  const selectedType = REPORT_TYPES.find((r) => r.value === filters.reportType)!;

  return (
    <div className="flex h-full" style={{ height: "calc(100vh - var(--header-h))" }}>
      {/* ── Filter Sidebar ── */}
      <div className="shrink-0 flex flex-col overflow-hidden transition-all duration-200"
        style={{ width: filtersOpen ? "280px" : "48px", borderRight: "1px solid var(--border)", background: "var(--bg-elevated)" }}>

        {/* Sidebar header */}
        <div className="flex items-center justify-between px-3 py-3 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
          {filtersOpen && (
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-muted" />
              <span className="text-xs font-bold text-foreground">Filters</span>
              {activeFilterCount > 0 && (
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
                  style={{ background: "var(--accent)", color: "#fff" }}>{activeFilterCount}</span>
              )}
            </div>
          )}
          <button onClick={() => setFiltersOpen((v) => !v)}
            className="p-1.5 rounded-lg hover:bg-card transition-colors text-muted hover:text-foreground ml-auto">
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${filtersOpen ? "-rotate-90" : "rotate-90"}`} />
          </button>
        </div>

        {filtersOpen && (
          <div className="flex-1 overflow-y-auto p-3 space-y-5">
            {/* Report type */}
            <div>
              <p className="text-[10px] font-black text-subtle uppercase tracking-wider mb-2">Report Type</p>
              <div className="space-y-1">
                {REPORT_TYPES.map((r) => (
                  <button key={r.value} onClick={() => setF("reportType", r.value)}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all text-left"
                    style={{
                      background: filters.reportType === r.value ? "var(--accent-muted)" : "transparent",
                      color: filters.reportType === r.value ? "var(--accent)" : "var(--text-muted)",
                    }}>
                    <span>{r.icon}</span>{r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date range */}
            <div>
              <p className="text-[10px] font-black text-subtle uppercase tracking-wider mb-2">Date Range</p>
              <div className="flex flex-wrap gap-1 mb-2">
                {DATE_PRESETS.map((p) => (
                  <button key={p.label} onClick={() => applyPreset(p)}
                    className="text-[10px] font-semibold px-2 py-1 rounded-lg hover:bg-card transition-colors text-muted hover:text-foreground"
                    style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="space-y-1.5">
                <div>
                  <p className="text-[10px] text-subtle mb-0.5">From</p>
                  <input type="date" value={filters.startDate} onChange={(e) => setF("startDate", e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl text-xs text-foreground outline-none"
                    style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }} />
                </div>
                <div>
                  <p className="text-[10px] text-subtle mb-0.5">To</p>
                  <input type="date" value={filters.endDate} onChange={(e) => setF("endDate", e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl text-xs text-foreground outline-none"
                    style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }} />
                </div>
              </div>
            </div>

            {/* Projects */}
            {projects.length > 0 && (
              <div>
                <p className="text-[10px] font-black text-subtle uppercase tracking-wider mb-2">Projects</p>
                <div className="space-y-1">
                  {projects.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 px-2 py-1.5 rounded-xl cursor-pointer hover:bg-card transition-colors"
                      style={{ background: filters.projectIds.includes(p.id) ? `${p.color}10` : "transparent" }}>
                      <input type="checkbox" className="sr-only" checked={filters.projectIds.includes(p.id)}
                        onChange={() => setF("projectIds", filters.projectIds.includes(p.id) ? filters.projectIds.filter((x) => x !== p.id) : [...filters.projectIds, p.id])} />
                      <div className="w-2 h-2 rounded-sm shrink-0" style={{ background: p.color }} />
                      <span className="text-xs font-semibold text-foreground truncate">{p.name}</span>
                      {filters.projectIds.includes(p.id) && <span className="text-[10px] ml-auto" style={{ color: p.color }}>✓</span>}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Members */}
            {users.length > 0 && (
              <div>
                <p className="text-[10px] font-black text-subtle uppercase tracking-wider mb-2">Team Members</p>
                <div className="space-y-1">
                  {users.map((u) => (
                    <label key={u.id} className="flex items-center gap-2 px-2 py-1.5 rounded-xl cursor-pointer hover:bg-card transition-colors"
                      style={{ background: filters.memberIds.includes(u.id) ? "var(--accent-muted)" : "transparent" }}>
                      <input type="checkbox" className="sr-only" checked={filters.memberIds.includes(u.id)}
                        onChange={() => setF("memberIds", filters.memberIds.includes(u.id) ? filters.memberIds.filter((x) => x !== u.id) : [...filters.memberIds, u.id])} />
                      <span className="text-xs font-semibold text-foreground truncate">{u.name}</span>
                      {filters.memberIds.includes(u.id) && <span className="text-[10px] text-accent ml-auto">✓</span>}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Statuses */}
            <div>
              <p className="text-[10px] font-black text-subtle uppercase tracking-wider mb-2">Task Status</p>
              <ChipGroup
                items={TASK_STATUSES.map((s) => ({ value: s, label: s.replace("_", " ") }))}
                selected={filters.statuses}
                onChange={(v) => setF("statuses", v)}
                color={(v) => STATUS_COLOR[v] ?? "var(--accent)"}
              />
            </div>

            {/* Priorities */}
            <div>
              <p className="text-[10px] font-black text-subtle uppercase tracking-wider mb-2">Priority</p>
              <ChipGroup
                items={TASK_PRIORITIES.map((p) => ({ value: p, label: p }))}
                selected={filters.priorities}
                onChange={(v) => setF("priorities", v)}
                color={(v) => PRI_COLOR[v] ?? "var(--accent)"}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center gap-3 px-5 py-3 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 flex-1">
            <span className="text-lg">{selectedType.icon}</span>
            <div>
              <h1 className="text-sm font-black text-foreground">{selectedType.label}</h1>
              <p className="text-[10px] text-subtle">
                {filters.startDate} → {filters.endDate}
                {filters.projectIds.length > 0 && ` · ${filters.projectIds.length} project${filters.projectIds.length !== 1 ? "s" : ""}`}
                {filters.memberIds.length > 0 && ` · ${filters.memberIds.length} member${filters.memberIds.length !== 1 ? "s" : ""}`}
              </p>
            </div>
          </div>

          {text && !streaming && (
            <div className="flex items-center gap-1.5">
              <button onClick={copyReport}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:bg-elevated"
                style={{ color: "var(--text-muted)" }}>
                <Copy className="w-3.5 h-3.5" /> Copy
              </button>
              <button onClick={downloadReport}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:bg-elevated"
                style={{ color: "var(--text-muted)" }}>
                <Download className="w-3.5 h-3.5" /> .md
              </button>
              <button onClick={printReport}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:bg-elevated"
                style={{ color: "var(--text-muted)" }}>
                <Printer className="w-3.5 h-3.5" /> PDF
              </button>
            </div>
          )}

          {text && !streaming && (
            <button onClick={reset} className="p-1.5 rounded-lg hover:bg-elevated transition-colors text-subtle">
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <button onClick={generate} disabled={streaming}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 hover:scale-105"
            style={{ background: "var(--accent)", boxShadow: "0 4px 20px var(--accent-muted)" }}>
            {streaming
              ? <><RefreshCw className="w-4 h-4 animate-spin" />Generating…</>
              : <><Sparkles className="w-4 h-4" />Generate Report</>
            }
          </button>
        </div>

        {/* Sections selector + output */}
        <div className="flex-1 overflow-y-auto p-5">

          {/* Report sections (custom builder) */}
          <div className="mb-5">
            <p className="text-[10px] font-black text-subtle uppercase tracking-wider mb-2">Include Sections</p>
            <div className="flex flex-wrap gap-2">
              {REPORT_SECTIONS.map((sec) => {
                const active = filters.sections.includes(sec.key);
                return (
                  <button key={sec.key}
                    onClick={() => setF("sections", active ? filters.sections.filter((x) => x !== sec.key) : [...filters.sections, sec.key])}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                    style={{
                      background: active ? "var(--accent-muted)" : "var(--bg-elevated)",
                      color: active ? "var(--accent)" : "var(--text-subtle)",
                      border: `1px solid ${active ? "var(--accent-glow)" : "transparent"}`,
                    }}>
                    {sec.icon}{sec.label}
                    {active && <X className="w-2.5 h-2.5 ml-0.5 opacity-60" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Report output */}
          <AnimatePresence>
            {(text || streaming) ? (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl p-6"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)", minHeight: "300px" }}>
                {streaming && !text && (
                  <div className="flex items-center gap-2 text-xs text-muted mb-4">
                    <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--accent)" }} />
                    Generating your report…
                  </div>
                )}
                <div className="prose max-w-none text-sm text-foreground leading-relaxed">
                  <MarkdownRenderer content={text || "…"} />
                </div>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4"
                  style={{ background: "var(--accent-muted)" }}>
                  <BarChart2 className="w-8 h-8" style={{ color: "var(--accent)" }} />
                </div>
                <h3 className="text-sm font-bold text-foreground mb-2">Custom Report Builder</h3>
                <p className="text-xs text-muted max-w-sm">
                  Choose your filters on the left, select which sections to include above, then click Generate Report.
                </p>
                <button onClick={generate}
                  className="mt-5 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-105"
                  style={{ background: "var(--accent)", boxShadow: "0 4px 20px var(--accent-muted)" }}>
                  <Sparkles className="w-4 h-4" /> Generate Report
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
