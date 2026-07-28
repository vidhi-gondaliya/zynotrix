"use client";
import { useEffect, useState, useMemo } from "react";
import { Plus, Calendar, AlertCircle, Search, ChevronDown, X, CheckSquare } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { TaskModal } from "@/components/kanban/TaskModal";
import { SkeletonList } from "@/components/ui/Skeleton";
import type { Task, TaskStatus } from "@/types";
import { format, isPast } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

const STATUS_BADGE: Record<string, "default" | "info" | "accent" | "warning" | "success"> = {
  BACKLOG: "default", TODO: "info", IN_PROGRESS: "accent", REVIEW: "warning", DONE: "success",
};
const PRIORITY_BADGE: Record<string, "default" | "info" | "warning" | "danger"> = {
  LOW: "default", MEDIUM: "info", HIGH: "warning", URGENT: "danger",
};

type SortKey = "dueDate" | "priority" | "status" | "title" | "createdAt";
const PRIORITY_RANK: Record<string, number> = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };

function SortButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider transition-colors"
      style={{ color: active ? "var(--accent)" : "var(--text-subtle)" }}>
      {label}
      <ChevronDown className={`w-2.5 h-2.5 transition-transform ${active ? "rotate-180" : ""}`} />
    </button>
  );
}

export default function TaskListPage({ params }: { params: { projectId: string } }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    fetch(`/api/projects/${params.projectId}/tasks`)
      .then((r) => r.json())
      .then((data) => { setTasks(data); setLoading(false); });
  }, [params.projectId]);

  const handleSave = (saved: Task) => {
    setTasks((prev) => {
      const filtered = prev.filter((t) => t.id !== saved.id);
      return [...filtered, saved].sort((a, b) => a.position - b.position);
    });
  };

  const handleDelete = (id: string) => setTasks((prev) => prev.filter((t) => t.id !== id));

  const cycleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((p) => !p);
    else { setSortKey(key); setSortAsc(true); }
  };

  const filtered = useMemo(() => {
    let list = tasks.filter((t) => {
      if (statusFilter   && t.status   !== statusFilter)   return false;
      if (priorityFilter && t.priority !== priorityFilter) return false;
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });

    list = [...list].sort((a, b) => {
      let diff = 0;
      if (sortKey === "dueDate") {
        const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        diff = da - db;
      } else if (sortKey === "priority") {
        diff = (PRIORITY_RANK[b.priority] ?? 0) - (PRIORITY_RANK[a.priority] ?? 0);
      } else if (sortKey === "status") {
        diff = a.status.localeCompare(b.status);
      } else if (sortKey === "title") {
        diff = a.title.localeCompare(b.title);
      } else {
        diff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return sortAsc ? diff : -diff;
    });

    return list;
  }, [tasks, search, statusFilter, priorityFilter, sortKey, sortAsc]);

  const hasFilters = search || statusFilter || priorityFilter;

  if (loading) return <div className="p-6"><SkeletonList count={5} /></div>;

  const PRIORITY_COLOR: Record<string, string> = {
    URGENT: "#F43F5E", HIGH: "#FBBF24", MEDIUM: "#60A5FA", LOW: "#6B7280",
  };
  const STATUS_COLOR: Record<string, string> = {
    BACKLOG: "#6B7280", TODO: "#60A5FA", IN_PROGRESS: "#818CF8", REVIEW: "#FBBF24", DONE: "#22C55E",
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar — sticky */}
      <div className="sticky top-0 z-10 flex items-center gap-2 flex-wrap px-6 py-3"
        style={{
          background: "var(--bg-overlay)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid var(--border-subtle)",
        }}>
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "var(--text-subtle)" }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks…"
            className="pl-9 pr-3 py-1.5 rounded-xl text-xs font-medium w-44 outline-none transition-all"
            style={{
              background: "var(--bg-elevated)", color: "var(--text-foreground)",
              border: `1px solid ${search ? "rgba(99,102,241,0.40)" : "var(--border)"}`,
              boxShadow: search ? "0 0 0 3px rgba(99,102,241,0.08)" : "none",
            }}
          />
        </div>

        {/* Status filter pills */}
        <div className="flex items-center gap-1">
          {["", "BACKLOG", "TODO", "IN_PROGRESS", "REVIEW", "DONE"].map((s) => {
            const active = statusFilter === s;
            const color = s ? STATUS_COLOR[s] : "var(--accent)";
            return (
              <button key={s} onClick={() => setStatusFilter(s)}
                className="px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all"
                style={{
                  background: active ? (s ? `${color}18` : "var(--accent-muted)") : "transparent",
                  color: active ? color : "var(--text-subtle)",
                  border: active ? `1px solid ${color}35` : "1px solid transparent",
                }}>
                {s ? s.replace(/_/g, " ") : "All"}
              </button>
            );
          })}
        </div>

        {/* Priority filter pills */}
        <div className="flex items-center gap-1">
          {["", "URGENT", "HIGH", "MEDIUM", "LOW"].map((p) => {
            const active = priorityFilter === p;
            const color = p ? PRIORITY_COLOR[p] : "var(--accent)";
            return (
              <button key={p} onClick={() => setPriorityFilter(p)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all"
                style={{
                  background: active ? `${color}18` : "transparent",
                  color: active ? color : "var(--text-subtle)",
                  border: active ? `1px solid ${color}35` : "1px solid transparent",
                }}>
                {p && <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />}
                {p || "All Priorities"}
              </button>
            );
          })}
        </div>

        {hasFilters && (
          <button onClick={() => { setSearch(""); setStatusFilter(""); setPriorityFilter(""); }}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all"
            style={{ color: "var(--danger)", background: "rgba(244,63,94,0.06)" }}>
            <X className="w-3 h-3" /> Clear
          </button>
        )}

        <div className="ml-auto flex items-center gap-2">
          <span className="text-[11px] font-semibold" style={{ color: "var(--text-subtle)" }}>
            {filtered.length} task{filtered.length !== 1 ? "s" : ""}
          </span>
          <button
            onClick={() => { setSelectedTask(null); setShowModal(true); }}
            className="flex items-center gap-1.5 h-8 px-4 rounded-xl text-xs font-bold text-white transition-all"
            style={{
              background: "linear-gradient(135deg, #6366F1, #A78BFA)",
              boxShadow: "0 4px 16px rgba(99,102,241,0.35), inset 0 1px 0 rgba(255,255,255,0.18)",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 20px rgba(99,102,241,0.45), inset 0 1px 0 rgba(255,255,255,0.18)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "none"; (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(99,102,241,0.35), inset 0 1px 0 rgba(255,255,255,0.18)"; }}>
            <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
            New Task
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 py-4">
        <div className="rounded-[18px] overflow-hidden"
          style={{ border: "1px solid var(--border)", background: "var(--bg-card)" }}>
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-[1]">
              <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-elevated)" }}>
                <th className="text-left px-5 py-3 w-[40%]">
                  <SortButton label="Task" active={sortKey === "title"} onClick={() => cycleSort("title")} />
                </th>
                <th className="text-left px-4 py-3">
                  <SortButton label="Status" active={sortKey === "status"} onClick={() => cycleSort("status")} />
                </th>
                <th className="text-left px-4 py-3">
                  <SortButton label="Priority" active={sortKey === "priority"} onClick={() => cycleSort("priority")} />
                </th>
                <th className="text-left px-4 py-3 hidden md:table-cell">
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-subtle)" }}>Assignee</span>
                </th>
                <th className="text-left px-4 py-3 hidden sm:table-cell">
                  <SortButton label="Due" active={sortKey === "dueDate"} onClick={() => cycleSort("dueDate")} />
                </th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {filtered.map((task, i) => {
                  const overdue = task.dueDate && isPast(new Date(task.dueDate)) && task.status !== "DONE";
                  const priColor = PRIORITY_COLOR[task.priority] ?? "#6B7280";
                  const stColor = STATUS_COLOR[task.status] ?? "#6B7280";
                  return (
                    <motion.tr key={task.id}
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: i * 0.012 }}
                      className="cursor-pointer group"
                      style={i < filtered.length - 1 ? { borderBottom: "1px solid var(--border-subtle)" } : {}}
                      onClick={() => { setSelectedTask(task); setShowModal(true); }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>

                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          {/* Priority color indicator */}
                          <div className="w-[3px] h-8 rounded-full shrink-0" style={{ background: priColor, opacity: 0.7 }} />
                          <div>
                            <div className="flex items-center gap-2">
                              {overdue && <AlertCircle className="w-3 h-3 shrink-0" style={{ color: "var(--danger)" }} />}
                              <span className={`text-[13px] font-semibold leading-tight ${task.status === "DONE" ? "line-through opacity-40" : ""}`}
                                style={{ color: "var(--text-foreground)" }}>
                                {task.title}
                              </span>
                            </div>
                            {task.description && (
                              <p className="text-[11px] mt-0.5 truncate max-w-xs" style={{ color: "var(--text-subtle)" }}>{task.description}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full"
                          style={{ background: `${stColor}14`, color: stColor, border: `1px solid ${stColor}28` }}>
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: stColor }} />
                          {task.status.replace(/_/g, " ")}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full"
                          style={{ background: `${priColor}14`, color: priColor, border: `1px solid ${priColor}28` }}>
                          {task.priority}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 hidden md:table-cell">
                        {task.assignee ? (
                          <div className="flex items-center gap-2">
                            <Avatar name={task.assignee.name} image={task.assignee.image} size="xs" />
                            <span className="text-[12px] font-medium" style={{ color: "var(--text-muted)" }}>{task.assignee.name?.split(" ")[0]}</span>
                          </div>
                        ) : (
                          <span className="text-[12px]" style={{ color: "var(--text-subtle)" }}>—</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 hidden sm:table-cell">
                        {task.dueDate ? (
                          <span className={`flex items-center gap-1 text-[11px] font-semibold ${overdue ? "text-danger" : ""}`}
                            style={{ color: overdue ? "var(--danger)" : "var(--text-muted)" }}>
                            <Calendar className="w-3 h-3" />
                            {format(new Date(task.dueDate), "MMM d")}
                          </span>
                        ) : (
                          <span className="text-[12px]" style={{ color: "var(--text-subtle)" }}>—</span>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="py-16 flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                  <CheckSquare className="w-7 h-7" style={{ color: "var(--text-subtle)" }} />
                </div>
                <div className="absolute inset-0 rounded-2xl pointer-events-none"
                  style={{ background: "radial-gradient(circle at 50% 50%, rgba(99,102,241,0.08) 0%, transparent 65%)" }} />
              </div>
              <div className="text-center">
                <p className="text-[14px] font-bold" style={{ color: "var(--text-foreground)" }}>
                  {hasFilters ? "No matching tasks" : "No tasks yet"}
                </p>
                <p className="text-[12px] mt-1" style={{ color: "var(--text-muted)" }}>
                  {hasFilters ? "Try adjusting your filters" : "Create your first task to get started"}
                </p>
              </div>
              {!hasFilters && (
                <button onClick={() => { setSelectedTask(null); setShowModal(true); }}
                  className="flex items-center gap-2 h-9 px-5 rounded-xl text-[13px] font-bold text-white transition-all"
                  style={{ background: "linear-gradient(135deg, #6366F1, #A78BFA)", boxShadow: "0 4px 16px rgba(99,102,241,0.35)" }}>
                  <Plus className="w-3.5 h-3.5" /> New Task
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <TaskModal
        open={showModal}
        onClose={() => { setShowModal(false); setSelectedTask(null); }}
        projectId={params.projectId}
        task={selectedTask}
        defaultStatus={"TODO" as TaskStatus}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </div>
  );
}
