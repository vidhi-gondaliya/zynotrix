"use client";
import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  CheckSquare, ChevronDown, Search, X, AlertCircle, Calendar,
  Plus, CheckCircle2, Circle, Loader, User2, Users, Wand2, Sparkles,
  Trash2, Square, Minus,
} from "lucide-react";
import { NLTaskCreator } from "@/components/ai/NLTaskCreator";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonList } from "@/components/ui/Skeleton";
import type { Task, Project } from "@/types";
import { format, isPast } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

const PRIORITY_BADGE: Record<string, "default" | "info" | "warning" | "danger"> = {
  LOW: "default", MEDIUM: "info", HIGH: "warning", URGENT: "danger",
};
const STATUS_DOT: Record<string, string> = {
  BACKLOG: "#6B7280", TODO: "#60A5FA", IN_PROGRESS: "#A78BFA", REVIEW: "#FBBF24", DONE: "#34D399",
};
const STATUS_ICON: Record<string, React.ReactNode> = {
  BACKLOG:     <Circle className="w-3.5 h-3.5" style={{ color: "#6B7280" }} />,
  TODO:        <Circle className="w-3.5 h-3.5" style={{ color: "#60A5FA" }} />,
  IN_PROGRESS: <Loader className="w-3.5 h-3.5" style={{ color: "#A78BFA" }} />,
  REVIEW:      <Loader className="w-3.5 h-3.5" style={{ color: "#FBBF24" }} />,
  DONE:        <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "#34D399" }} />,
};

type QuickFilter = "all" | "mine" | "overdue" | "today" | "tomorrow";
type ViewMode = "hybrid" | "team";

function FilterDropdown({ label, options, value, onChange }: {
  label: string; options: { value: string; label: string }[];
  value: string; onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  return (
    <div className="relative">
      <button onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
        style={{
          background: value ? "var(--accent-muted)" : "var(--bg-elevated)",
          color: value ? "var(--accent)" : "var(--text-muted)",
          border: `1px solid ${value ? "var(--accent-glow)" : "var(--border)"}`,
        }}>
        <span>{selected?.label ?? label}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
        {value && (
          <span onClick={(e) => { e.stopPropagation(); onChange(""); setOpen(false); }} className="ml-0.5 hover:opacity-70">
            <X className="w-3 h-3" />
          </span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.div initial={{ opacity: 0, y: -4, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }} transition={{ duration: 0.15 }}
              className="absolute top-full mt-1.5 left-0 z-20 min-w-[140px] rounded-2xl overflow-hidden panel shadow-float">
              {[{ value: "", label: `All ${label}` }, ...options].map((o) => (
                <button key={o.value} onClick={() => { onChange(o.value); setOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 text-xs font-semibold transition-colors
                    ${value === o.value ? "text-accent" : "text-muted hover:text-foreground"} hover:bg-card-hover`}>
                  {o.label}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Personal tasks panel ─────────────────────────────────────────────────────

function PersonalPanel() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState("MEDIUM");
  const [newDue, setNewDue] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/tasks/personal")
      .then((r) => r.json())
      .then((d) => { setTasks(Array.isArray(d.tasks) ? d.tasks : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const createTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    const res = await fetch("/api/tasks/personal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle.trim(), priority: newPriority, dueDate: newDue || null }),
    });
    if (res.ok) {
      const t = await res.json();
      setTasks((prev) => [t, ...prev]);
      setNewTitle(""); setNewDue(""); setNewPriority("MEDIUM"); setAdding(false);
    }
    setCreating(false);
  };

  const toggleDone = async (task: Task) => {
    const next = task.status === "DONE" ? "TODO" : "DONE";
    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: next } : t));
    await fetch(`/api/tasks/${task.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
  };

  const active = tasks.filter((t) => t.status !== "DONE");
  const done   = tasks.filter((t) => t.status === "DONE");

  return (
    <div className="rounded-2xl overflow-hidden flex flex-col"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-xs)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-elevated)" }}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "var(--accent-muted)" }}>
            <User2 className="w-3 h-3" style={{ color: "var(--accent)" }} />
          </div>
          <span className="text-sm font-bold text-foreground">Personal</span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
            style={{ background: "var(--accent-muted)", color: "var(--accent)" }}>
            {active.length}
          </span>
        </div>
        <button onClick={() => setAdding((v) => !v)}
          className="flex items-center gap-1 text-xs font-bold transition-colors px-2 py-1 rounded-lg hover:bg-card-hover"
          style={{ color: "var(--accent)" }}>
          <Plus className="w-3.5 h-3.5" />
          Add
        </button>
      </div>

      {/* Quick-add form */}
      <AnimatePresence>
        {adding && (
          <motion.form onSubmit={createTask}
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
            className="overflow-hidden"
            style={{ borderBottom: "1px solid var(--border)" }}>
            <div className="p-3 space-y-2">
              <input autoFocus value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Task title…"
                className="w-full px-3 py-2 rounded-xl text-sm font-medium outline-none transition-all"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-foreground)" }} />
              <div className="flex items-center gap-2">
                <select value={newPriority} onChange={(e) => setNewPriority(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-xl text-xs font-semibold outline-none"
                  style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
                <input type="date" value={newDue} onChange={(e) => setNewDue(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-xl text-xs font-semibold outline-none"
                  style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-muted)" }} />
                <button type="submit" disabled={creating || !newTitle.trim()}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                  style={{ background: "var(--accent)", color: "#fff" }}>
                  {creating ? "…" : "Add"}
                </button>
                <button type="button" onClick={() => setAdding(false)}
                  className="p-1.5 rounded-xl hover:bg-card-hover transition-colors">
                  <X className="w-3.5 h-3.5 text-muted" />
                </button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Task list */}
      <div className="flex-1 divide-y" style={{ "--tw-divide-opacity": 1 } as React.CSSProperties}>
        {loading ? (
          <div className="p-3"><SkeletonList count={3} /></div>
        ) : active.length === 0 && done.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center px-4">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center mb-2" style={{ background: "var(--bg-elevated)" }}>
              <User2 className="w-5 h-5 text-subtle" />
            </div>
            <p className="text-xs text-muted">No personal tasks yet.</p>
            <p className="text-[11px] text-subtle mt-0.5">Click Add to create one.</p>
          </div>
        ) : (
          <>
            {active.map((task) => {
              const overdue = task.dueDate && isPast(new Date(task.dueDate));
              return (
                <motion.div key={task.id} layout
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-card-hover transition-colors group"
                  style={{ borderColor: "var(--border)" }}>
                  <button onClick={() => toggleDone(task)} className="shrink-0 transition-transform hover:scale-110">
                    {STATUS_ICON[task.status] ?? STATUS_ICON.TODO}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{task.title}</p>
                    {task.dueDate && (
                      <span className={`text-[11px] flex items-center gap-1 ${overdue ? "text-danger" : "text-subtle"}`}>
                        {overdue ? <AlertCircle className="w-3 h-3" /> : <Calendar className="w-3 h-3" />}
                        {format(new Date(task.dueDate), "MMM d")}
                      </span>
                    )}
                  </div>
                  <Badge variant={PRIORITY_BADGE[task.priority] ?? "default"} size="sm">{task.priority}</Badge>
                </motion.div>
              );
            })}
            {done.length > 0 && (
              <details className="group/done">
                <summary className="px-4 py-2 text-[11px] font-bold text-subtle cursor-pointer select-none hover:text-muted list-none flex items-center gap-2">
                  <ChevronDown className="w-3 h-3 transition-transform group-open/done:rotate-180" />
                  {done.length} completed
                </summary>
                {done.map((task) => (
                  <motion.div key={task.id} layout
                    className="flex items-center gap-3 px-4 py-2 hover:bg-card-hover transition-colors"
                    style={{ borderColor: "var(--border)", borderTop: "1px solid var(--border)" }}>
                    <button onClick={() => toggleDone(task)} className="shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "#34D399" }} />
                    </button>
                    <p className="flex-1 text-sm text-muted line-through truncate">{task.title}</p>
                  </motion.div>
                ))}
              </details>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Bulk action bar ──────────────────────────────────────────────────────────

function BulkBar({ selected, onClear, onAction }: {
  selected: Set<string>;
  onClear: () => void;
  onAction: (action: "status" | "priority" | "delete", value?: string) => Promise<void>;
}) {
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const run = async (action: "status" | "priority" | "delete", value?: string) => {
    setBusyAction(action + (value ?? ""));
    await onAction(action, value);
    setBusyAction(null);
  };

  const count = selected.size;

  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 38 }}
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-strong)", boxShadow: "0 8px 40px rgba(0,0,0,0.4), 0 0 0 1px var(--border-strong)" }}>

          {/* Count */}
          <div className="flex items-center gap-2 pr-3" style={{ borderRight: "1px solid var(--border)" }}>
            <span className="min-w-[20px] h-5 px-1.5 rounded-md text-[11px] font-black text-white flex items-center justify-center"
              style={{ background: "var(--accent)" }}>{count}</span>
            <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>selected</span>
          </div>

          {/* Status */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-subtle)" }}>Status:</span>
            {[
              { v: "TODO", label: "To Do", color: "#60A5FA" },
              { v: "IN_PROGRESS", label: "In Progress", color: "#A78BFA" },
              { v: "DONE", label: "Done", color: "#34D399" },
            ].map(s => (
              <button key={s.v} onClick={() => run("status", s.v)} disabled={!!busyAction}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all disabled:opacity-50"
                style={{ background: busyAction === "status" + s.v ? s.color + "33" : "var(--bg-elevated)", color: s.color }}>
                {s.label}
              </button>
            ))}
          </div>

          {/* Priority */}
          <div className="flex items-center gap-1" style={{ borderLeft: "1px solid var(--border)", paddingLeft: 12 }}>
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-subtle)" }}>Priority:</span>
            {[
              { v: "LOW", label: "Low", color: "#6B7280" },
              { v: "HIGH", label: "High", color: "#FFC107" },
              { v: "URGENT", label: "Urgent", color: "#FF4466" },
            ].map(p => (
              <button key={p.v} onClick={() => run("priority", p.v)} disabled={!!busyAction}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all disabled:opacity-50"
                style={{ background: "var(--bg-elevated)", color: p.color }}>
                {p.label}
              </button>
            ))}
          </div>

          {/* Delete */}
          <button onClick={() => { if (confirm(`Delete ${count} task${count > 1 ? "s" : ""}?`)) run("delete"); }}
            disabled={!!busyAction}
            aria-label="Delete selected tasks"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-bold transition-all disabled:opacity-50"
            style={{ background: "var(--danger-muted)", color: "var(--danger)", borderLeft: "1px solid var(--border)", marginLeft: 4 }}>
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>

          {/* Clear */}
          <button onClick={onClear} aria-label="Clear selection"
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: "var(--text-subtle)" }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-elevated)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            <X className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Team tasks panel ─────────────────────────────────────────────────────────

function TeamPanel() {
  const searchParams = useSearchParams();
  const initialFilter = (searchParams.get("filter") as QuickFilter) ?? "mine";

  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [quick, setQuick] = useState<QuickFilter>(initialFilter);
  const [statusFilter, setStatusFilter]   = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [projectFilter, setProjectFilter]  = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const QUICK_TABS: { key: QuickFilter; label: string }[] = [
    { key: "all",      label: "All Tasks"      },
    { key: "mine",     label: "Assigned to Me" },
    { key: "overdue",  label: "Overdue"        },
    { key: "today",    label: "Due Today"      },
    { key: "tomorrow", label: "Due Tomorrow"   },
  ];

  const loadTasks = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (quick !== "all") params.set("filter", quick);
    if (statusFilter) params.set("status", statusFilter);
    if (priorityFilter) params.set("priority", priorityFilter);
    if (projectFilter) params.set("projectId", projectFilter);
    fetch(`/api/tasks?${params}`)
      .then((r) => r.json())
      .then((data) => { setTasks(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [quick, statusFilter, priorityFilter, projectFilter]);

  useEffect(() => { loadTasks(); }, [loadTasks]);
  useEffect(() => { setSelected(new Set()); }, [tasks]);
  useEffect(() => {
    fetch("/api/projects").then((r) => r.json()).then(setProjects).catch((err) => console.error("[tasks] load projects", err));
  }, []);

  const filtered = tasks.filter((t) =>
    !search || t.title.toLowerCase().includes(search.toLowerCase()) ||
    t.project?.name?.toLowerCase().includes(search.toLowerCase())
  );
  const hasFilters = statusFilter || priorityFilter || projectFilter || search;
  const allSelected = filtered.length > 0 && filtered.every(t => selected.has(t.id));
  const someSelected = filtered.some(t => selected.has(t.id));

  const toggleTask = (id: string) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(filtered.map(t => t.id)));
  };

  const handleBulkAction = async (action: "status" | "priority" | "delete", value?: string) => {
    const ids = Array.from(selected);
    await fetch("/api/tasks/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, action, value }),
    });
    setSelected(new Set());
    loadTasks();
  };

  return (
    <div className="space-y-4">
      <BulkBar selected={selected} onClear={() => setSelected(new Set())} onAction={handleBulkAction} />

      {/* Quick filter tabs */}
      <div className="flex items-center gap-1 p-1 rounded-2xl w-fit"
        style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
        {QUICK_TABS.map(({ key, label }) => (
          <button key={key} onClick={() => setQuick(key)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150
              ${quick === key ? "text-foreground shadow-xs" : "text-muted hover:text-foreground"}`}
            style={quick === key ? { background: "var(--bg-card)" } : {}}>
            {label}
          </button>
        ))}
      </div>

      {/* Filters row */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-subtle pointer-events-none" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks…"
            className="pl-9 pr-3 py-1.5 rounded-xl text-xs font-medium w-48 outline-none transition-all"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-foreground)" }} />
        </div>
        <FilterDropdown label="Status" value={statusFilter} onChange={setStatusFilter}
          options={[
            { value: "BACKLOG", label: "Backlog" }, { value: "TODO", label: "To Do" },
            { value: "IN_PROGRESS", label: "In Progress" }, { value: "REVIEW", label: "In Review" },
            { value: "DONE", label: "Completed" },
          ]} />
        <FilterDropdown label="Priority" value={priorityFilter} onChange={setPriorityFilter}
          options={[
            { value: "URGENT", label: "Urgent" }, { value: "HIGH", label: "High" },
            { value: "MEDIUM", label: "Medium" }, { value: "LOW", label: "Low" },
          ]} />
        <FilterDropdown label="Project" value={projectFilter} onChange={setProjectFilter}
          options={projects.map((p) => ({ value: p.id, label: p.name }))} />
        {hasFilters && (
          <button onClick={() => { setStatusFilter(""); setPriorityFilter(""); setProjectFilter(""); setSearch(""); }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors text-muted hover:text-danger hover:bg-danger/10">
            <X className="w-3 h-3" /> Clear
          </button>
        )}
        <span className="ml-auto text-xs font-semibold text-subtle">
          {filtered.length} task{filtered.length !== 1 ? "s" : ""}
          {selected.size > 0 && <span style={{ color: "var(--accent)" }}> · {selected.size} selected</span>}
        </span>
      </div>

      {/* Task list */}
      {loading ? (
        <SkeletonList count={5} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<CheckSquare className="w-6 h-6" />} title="No tasks found"
          description={hasFilters ? "Try adjusting your filters." : "Tasks will appear here once created in your projects."} />
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--bg-card)" }}>
          {/* Select-all header */}
          <div className="flex items-center gap-3 px-5 py-2.5"
            style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-elevated)" }}>
            <button onClick={toggleAll} aria-label="Select all tasks"
              className="shrink-0 w-4 h-4 rounded flex items-center justify-center transition-colors"
              style={{
                background: allSelected ? "var(--accent)" : someSelected ? "var(--accent-muted)" : "var(--bg-card)",
                border: `1.5px solid ${allSelected || someSelected ? "var(--accent)" : "var(--border-strong)"}`,
              }}>
              {allSelected ? <CheckSquare className="w-2.5 h-2.5 text-white" />
                : someSelected ? <Minus className="w-2.5 h-2.5" style={{ color: "var(--accent)" }} />
                : null}
            </button>
            <span className="text-[11px] font-semibold" style={{ color: "var(--text-subtle)" }}>
              {allSelected ? "Deselect all" : "Select all"}
            </span>
          </div>

          {filtered.map((task, i) => {
            const overdue = task.dueDate && isPast(new Date(task.dueDate)) && task.status !== "DONE";
            const isSelected = selected.has(task.id);
            return (
              <motion.div key={task.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
                <div className={`flex items-center gap-4 px-5 py-3.5 transition-colors cursor-pointer group
                  ${i < filtered.length - 1 ? "border-b" : ""} ${overdue ? "border-l-2 border-l-danger pl-4" : ""}
                  ${isSelected ? "bg-accent/5" : "hover:bg-card-hover"}`}
                  style={{ borderColor: "var(--border)" }}>
                  {/* Checkbox */}
                  <button onClick={() => toggleTask(task.id)} aria-label={`Select task: ${task.title}`}
                    className="shrink-0 w-4 h-4 rounded flex items-center justify-center transition-all"
                    style={{
                      background: isSelected ? "var(--accent)" : "var(--bg-elevated)",
                      border: `1.5px solid ${isSelected ? "var(--accent)" : "var(--border-strong)"}`,
                    }}>
                    {isSelected && <Square className="w-2.5 h-2.5 text-white fill-white" />}
                  </button>

                  <Link href={`/projects/${task.projectId}/board`} className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: STATUS_DOT[task.status] ?? "#6B7280" }} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${task.status === "DONE" ? "line-through text-muted" : "text-foreground"}`}>
                        {task.title}
                      </p>
                      {task.project && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <div className="w-2 h-2 rounded-sm" style={{ background: task.project.color }} />
                          <span className="text-[11px] text-subtle">{task.project.name}</span>
                        </div>
                      )}
                    </div>
                    <div className="hidden sm:flex items-center gap-3 shrink-0">
                      <Badge variant={PRIORITY_BADGE[task.priority] ?? "default"} size="sm">{task.priority}</Badge>
                      {task.dueDate && (
                        <span className={`flex items-center gap-1 text-[11px] font-semibold ${overdue ? "text-danger" : "text-muted"}`}>
                          {overdue ? <AlertCircle className="w-3 h-3" /> : <Calendar className="w-3 h-3" />}
                          {format(new Date(task.dueDate), "MMM d")}
                        </span>
                      )}
                      {task.assignee
                        ? <Avatar name={task.assignee.name} image={task.assignee.image} size="xs" />
                        : <div className="w-6 h-6 rounded-full border border-dashed" style={{ borderColor: "var(--border-strong)" }} />}
                    </div>
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Page shell ───────────────────────────────────────────────────────────────

function TasksContent() {
  const [view, setView]         = useState<ViewMode>("hybrid");
  const [showNL, setShowNL]     = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="p-6 space-y-5">
      <NLTaskCreator open={showNL} onClose={() => setShowNL(false)} onCreated={() => setRefreshKey((k) => k + 1)} />

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black text-foreground">Tasks</h1>
          <p className="text-xs text-muted mt-0.5">Personal + Team tasks in one place</p>
        </div>
        {/* Controls */}
        <div className="flex items-center gap-2">
          <button onClick={() => setShowNL(true)}
            className="flex items-center gap-2 h-9 px-4 rounded-xl text-sm font-bold text-white transition-all"
            style={{ background: "linear-gradient(135deg,#9D6BFF,#00CFFF)", boxShadow: "0 4px 14px rgba(157,107,255,0.35)" }}>
            <Wand2 className="w-3.5 h-3.5" /> AI Create
          </button>
          <div className="flex items-center gap-1 p-1 rounded-xl"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
            <button onClick={() => setView("hybrid")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                ${view === "hybrid" ? "text-foreground" : "text-muted hover:text-foreground"}`}
              style={view === "hybrid" ? { background: "var(--bg-card)", boxShadow: "var(--shadow-xs)" } : {}}>
              <User2 className="w-3.5 h-3.5" /> Hybrid
            </button>
            <button onClick={() => setView("team")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                ${view === "team" ? "text-foreground" : "text-muted hover:text-foreground"}`}
              style={view === "team" ? { background: "var(--bg-card)", boxShadow: "var(--shadow-xs)" } : {}}>
              <Users className="w-3.5 h-3.5" /> Team Only
            </button>
          </div>
        </div>
      </div>

      {view === "hybrid" ? (
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5 items-start">
          {/* Personal panel */}
          <div className="sticky top-4">
            <PersonalPanel />
          </div>
          {/* Team tasks panel */}
          <TeamPanel />
        </div>
      ) : (
        <TeamPanel />
      )}
    </div>
  );
}

export default function TasksPage() {
  return (
    <Suspense fallback={<div className="p-6"><SkeletonList count={5} /></div>}>
      <TasksContent />
    </Suspense>
  );
}
