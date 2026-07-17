"use client";
import { useEffect, useState, useMemo } from "react";
import { Plus, Calendar, AlertCircle, Search, ChevronDown, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
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

  return (
    <div className="p-6">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-subtle pointer-events-none" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks…"
            className="pl-9 pr-3 py-1.5 rounded-xl text-xs font-medium w-44 outline-none"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-foreground)" }}
          />
        </div>

        {/* Status dropdown */}
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 rounded-xl text-xs font-semibold outline-none appearance-none cursor-pointer"
          style={{
            background: statusFilter ? "var(--accent-muted)" : "var(--bg-elevated)",
            color: statusFilter ? "var(--accent)" : "var(--text-muted)",
            border: `1px solid ${statusFilter ? "var(--accent-glow)" : "var(--border)"}`,
          }}>
          <option value="">All Status</option>
          <option value="BACKLOG">Backlog</option>
          <option value="TODO">To Do</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="REVIEW">In Review</option>
          <option value="DONE">Completed</option>
        </select>

        {/* Priority dropdown */}
        <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-3 py-1.5 rounded-xl text-xs font-semibold outline-none appearance-none cursor-pointer"
          style={{
            background: priorityFilter ? "var(--accent-muted)" : "var(--bg-elevated)",
            color: priorityFilter ? "var(--accent)" : "var(--text-muted)",
            border: `1px solid ${priorityFilter ? "var(--accent-glow)" : "var(--border)"}`,
          }}>
          <option value="">All Priority</option>
          <option value="URGENT">Urgent</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>

        {hasFilters && (
          <button onClick={() => { setSearch(""); setStatusFilter(""); setPriorityFilter(""); }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-muted hover:text-danger hover:bg-danger/10 transition-colors">
            <X className="w-3 h-3" /> Clear
          </button>
        )}

        <span className="ml-auto text-xs font-semibold text-subtle">
          {filtered.length} task{filtered.length !== 1 ? "s" : ""}
        </span>

        <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />}
          onClick={() => { setSelectedTask(null); setShowModal(true); }}>
          New Task
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden"
        style={{ border: "1px solid var(--border)", background: "var(--bg-card)" }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
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
                return (
                  <motion.tr key={task.id}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: i * 0.015 }}
                    className="cursor-pointer transition-colors hover:bg-card-hover"
                    style={i < filtered.length - 1 ? { borderBottom: "1px solid var(--border)" } : {}}
                    onClick={() => { setSelectedTask(task); setShowModal(true); }}>

                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        {overdue && <AlertCircle className="w-3 h-3 text-danger shrink-0" />}
                        <span className={`font-semibold ${task.status === "DONE" ? "line-through text-muted" : "text-foreground"}`}>
                          {task.title}
                        </span>
                      </div>
                      {task.description && (
                        <p className="text-[11px] text-subtle mt-0.5 truncate max-w-xs">{task.description}</p>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <Badge variant={STATUS_BADGE[task.status] ?? "default"} size="sm" dot>
                        {task.status.replace(/_/g, " ")}
                      </Badge>
                    </td>

                    <td className="px-4 py-3">
                      <Badge variant={PRIORITY_BADGE[task.priority] ?? "default"} size="sm">
                        {task.priority}
                      </Badge>
                    </td>

                    <td className="px-4 py-3 hidden md:table-cell">
                      {task.assignee ? (
                        <div className="flex items-center gap-2">
                          <Avatar name={task.assignee.name} image={task.assignee.image} size="xs" />
                          <span className="text-xs text-muted">{task.assignee.name?.split(" ")[0]}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-subtle">—</span>
                      )}
                    </td>

                    <td className="px-4 py-3 hidden sm:table-cell">
                      {task.dueDate ? (
                        <span className={`flex items-center gap-1 text-xs font-semibold ${overdue ? "text-danger" : "text-muted"}`}>
                          <Calendar className="w-3 h-3" />
                          {format(new Date(task.dueDate), "MMM d")}
                        </span>
                      ) : (
                        <span className="text-xs text-subtle">—</span>
                      )}
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="py-14 text-center">
            <p className="text-sm text-muted font-semibold">No tasks found</p>
            {hasFilters && <p className="text-xs text-subtle mt-1">Try adjusting your filters</p>}
          </div>
        )}
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
