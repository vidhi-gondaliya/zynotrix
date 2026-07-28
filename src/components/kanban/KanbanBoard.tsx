"use client";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useSession } from "next-auth/react";
import {
  DndContext, DragOverlay, PointerSensor,
  useSensor, useSensors,
  type DragStartEvent, type DragEndEvent, type DragOverEvent,
  closestCorners,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanCard } from "./KanbanCard";
import { TaskModal } from "./TaskModal";
import { TaskDetailPanel } from "./TaskDetailPanel";
import { BoardContextMenu } from "./BoardContextMenu";
import { SkeletonList } from "@/components/ui/Skeleton";
import { Avatar } from "@/components/ui/Avatar";
import type { Task, TaskStatus, BoardColumnConfig, Project } from "@/types";
import { getBoardColumns } from "@/lib/board-templates";
import { isPast, isThisWeek } from "date-fns";
import toast from "react-hot-toast";
import { Search, SlidersHorizontal, X, Clock, AlertTriangle } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

interface KanbanBoardProps {
  projectId: string;
  onConfigureBoard?: () => void;
  defaultOpenTaskId?: string;
  myTasksOnly?: boolean;
}

interface Member { id: string; name: string | null; email: string; image: string | null; }

interface Filters {
  assignees:  string[];
  priorities: string[];
  overdue:    boolean;
  thisWeek:   boolean;
}

const PRIORITY_OPTS = [
  { value: "URGENT", label: "Urgent", color: "#F43F5E" },
  { value: "HIGH",   label: "High",   color: "#FBBF24" },
  { value: "MEDIUM", label: "Medium", color: "#60A5FA" },
  { value: "LOW",    label: "Low",    color: "#6B7280" },
];

export function KanbanBoard({ projectId, defaultOpenTaskId, myTasksOnly }: KanbanBoardProps) {
  const { data: session } = useSession();
  const [columns,       setColumns]       = useState<BoardColumnConfig[]>([]);
  const [tasks,         setTasks]         = useState<Record<string, Task[]>>({});
  const [loading,       setLoading]       = useState(true);
  const [activeTask,    setActiveTask]    = useState<Task | null>(null);
  const [selectedTask,  setSelectedTask]  = useState<Task | null>(null);
  const [showModal,     setShowModal]     = useState(false);
  const [defaultStatus, setDefaultStatus] = useState<TaskStatus>("BACKLOG");
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [members,       setMembers]       = useState<Member[]>([]);

  /* ── Search ─────────────────────────────────────────────────── */
  const [showSearch,  setShowSearch]  = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  /* ── Filters ─────────────────────────────────────────────────── */
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({ assignees: [], priorities: [], overdue: false, thisWeek: false });

  /* ── Context menu ────────────────────────────────────────────── */
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; task: Task } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const loadBoard = useCallback(async () => {
    const [projectRes, tasksRes] = await Promise.all([
      fetch(`/api/projects/${projectId}`, { cache: "no-store" }),
      fetch(`/api/projects/${projectId}/tasks`, { cache: "no-store" }),
    ]);
    const project: Project & { members?: { user: Member }[] } = await projectRes.json();
    const taskData: Task[]  = await tasksRes.json();

    const cols = getBoardColumns(project.boardConfig);
    setColumns(cols);
    setMembers((project.members ?? []).map((m) => m.user));

    const grouped: Record<string, Task[]> = {};
    cols.forEach((c) => { grouped[c.id] = []; });
    taskData.forEach((t) => {
      if (grouped[t.status] !== undefined) {
        grouped[t.status].push(t);
      } else {
        const first = cols.find((c) => c.group === "progress") ?? cols[0];
        if (first) grouped[first.id] = [...(grouped[first.id] ?? []), t];
      }
    });
    cols.forEach((c) => { grouped[c.id]?.sort((a, b) => a.position - b.position); });
    setTasks(grouped);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { loadBoard(); }, [loadBoard]);

  /* Cmd/Ctrl + F → toggle search */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        setShowSearch((v) => {
          if (!v) setTimeout(() => searchRef.current?.focus(), 60);
          else setSearchQuery("");
          return !v;
        });
      }
      if (e.key === "Escape" && showSearch) {
        setShowSearch(false);
        setSearchQuery("");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showSearch]);

  const colIds = columns.map((c) => c.id);

  const findColumn = (taskId: string): string | null => {
    for (const col of colIds) {
      if (tasks[col]?.some((t) => t.id === taskId)) return col;
    }
    return null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const col = findColumn(event.active.id as string);
    if (col) setActiveTask(tasks[col].find((t) => t.id === event.active.id) ?? null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeId  = active.id as string;
    const overId    = over.id as string;
    const activeCol = findColumn(activeId);
    const overCol   = colIds.includes(overId) ? overId : findColumn(overId);
    if (!activeCol || !overCol || activeCol === overCol) return;
    setTasks((prev) => {
      const activeItems = [...prev[activeCol]];
      const overItems   = [...prev[overCol]];
      const activeIndex = activeItems.findIndex((t) => t.id === activeId);
      const overIndex   = overItems.findIndex((t) => t.id === overId);
      const [moved] = activeItems.splice(activeIndex, 1);
      moved.status = overCol as TaskStatus;
      overItems.splice(overIndex >= 0 ? overIndex : overItems.length, 0, moved);
      return { ...prev, [activeCol]: activeItems, [overCol]: overItems };
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;
    const activeId  = active.id as string;
    const overId    = over.id as string;
    const activeCol = findColumn(activeId);
    if (!activeCol) return;
    const overCol = colIds.includes(overId) ? overId : findColumn(overId) ?? activeCol;
    if (activeCol === overCol) {
      const items    = [...tasks[activeCol]];
      const oldIndex = items.findIndex((t) => t.id === activeId);
      const newIndex = items.findIndex((t) => t.id === overId);
      if (oldIndex !== newIndex && oldIndex >= 0 && newIndex >= 0) {
        const reordered = arrayMove(items, oldIndex, newIndex);
        setTasks((prev) => ({ ...prev, [activeCol]: reordered }));
        try {
          await fetch(`/api/tasks/${activeId}/move`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: activeCol, position: newIndex }),
          });
        } catch { loadBoard(); }
      }
    } else {
      const position = tasks[overCol].findIndex((t) => t.id === activeId);
      try {
        await fetch(`/api/tasks/${activeId}/move`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: overCol, position: Math.max(0, position) }),
        });
      } catch { toast.error("Failed to move task"); loadBoard(); }
    }
  };

  const handleAddTask = (status: string) => {
    setSelectedTask(null);
    setDefaultStatus(status as TaskStatus);
    setShowModal(true);
  };

  const handleQuickCreate = async (status: string, title: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, status, priority: "MEDIUM", tags: [] }),
      });
      if (res.ok) {
        const saved: Task = await res.json();
        handleSaveTask(saved);
      } else {
        toast.error("Failed to create task");
      }
    } catch { toast.error("Failed to create task"); }
  };

  const handleTaskClick = (task: Task) => { setSelectedTask(task); setShowModal(false); setShowDetailPanel(true); };

  const autoOpenedRef = useRef(false);
  useEffect(() => {
    if (!defaultOpenTaskId || loading || autoOpenedRef.current) return;
    const allTasks = Object.values(tasks).flat();
    const target = allTasks.find((t) => t.id === defaultOpenTaskId);
    if (target) { autoOpenedRef.current = true; setSelectedTask(target); setShowDetailPanel(true); }
  }, [defaultOpenTaskId, loading, tasks]);

  const handleSaveTask = (saved: Task) => {
    setTasks((prev) => {
      const next = { ...prev };
      colIds.forEach((c) => { next[c] = next[c]?.filter((t) => t.id !== saved.id) ?? []; });
      const target = saved.status in next ? saved.status : colIds[0];
      next[target] = [...(next[target] ?? []), saved];
      return next;
    });
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks((prev) => {
      const next = { ...prev };
      colIds.forEach((c) => { next[c] = next[c]?.filter((t) => t.id !== taskId) ?? []; });
      return next;
    });
  };

  const handleRenameColumn = async (colStatus: string, newLabel: string) => {
    const updated = columns.map((c) => c.id === colStatus ? { ...c, label: newLabel } : c);
    setColumns(updated);
    try {
      await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boardConfig: JSON.stringify({ templateId: "custom", columns: updated }) }),
      });
      toast.success("Status renamed");
    } catch { toast.error("Failed to rename"); loadBoard(); }
  };

  /* ── Context menu actions ────────────────────────────────────── */
  const handleCtxStatusChange = async (taskId: string, status: string) => {
    setTasks((prev) => {
      const next     = { ...prev };
      const fromCol  = Object.keys(next).find((c) => next[c].some((t) => t.id === taskId));
      if (!fromCol) return prev;
      const task     = next[fromCol].find((t) => t.id === taskId)!;
      next[fromCol]  = next[fromCol].filter((t) => t.id !== taskId);
      next[status]   = [{ ...task, status: status as TaskStatus }, ...(next[status] ?? [])];
      return next;
    });
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
    } catch { toast.error("Failed to update"); loadBoard(); }
  };

  const handleCtxPriorityChange = async (taskId: string, priority: string) => {
    setTasks((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((c) => {
        next[c] = next[c].map((t) => t.id === taskId ? { ...t, priority: priority as Task["priority"] } : t);
      });
      return next;
    });
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority }),
      });
    } catch { toast.error("Failed to update"); loadBoard(); }
  };

  const handleCtxAssignToMe = async (taskId: string) => {
    const uid = session?.user?.id;
    if (!uid) { toast.error("Not signed in"); return; }
    setTasks((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((c) => {
        next[c] = next[c].map((t) => t.id === taskId ? { ...t, assigneeId: uid } : t);
      });
      return next;
    });
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigneeId: uid }),
      });
    } catch { toast.error("Failed to assign"); loadBoard(); }
  };

  const handleCtxDelete = async (taskId: string) => {
    handleDeleteTask(taskId);
    try {
      await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      toast.success("Task deleted");
    } catch { toast.error("Failed to delete"); loadBoard(); }
  };

  /* ── Derived visible tasks (myTasksOnly + filters) ───────────── */
  const visibleTasks = useMemo(() => {
    let result: Record<string, Task[]> = { ...tasks };

    if (myTasksOnly && session?.user?.id) {
      const uid = session.user.id;
      const out: Record<string, Task[]> = {};
      Object.entries(result).forEach(([col, list]) => {
        out[col] = list.filter((t) => t.assignee?.id === uid || t.creator?.id === uid);
      });
      result = out;
    }

    const hasA = filters.assignees.length > 0;
    const hasP = filters.priorities.length > 0;
    const hasO = filters.overdue;
    const hasW = filters.thisWeek;
    if (hasA || hasP || hasO || hasW) {
      const out: Record<string, Task[]> = {};
      Object.entries(result).forEach(([col, list]) => {
        out[col] = list.filter((t) => {
          if (hasA && !filters.assignees.includes(t.assigneeId ?? "")) return false;
          if (hasP && !filters.priorities.includes(t.priority))          return false;
          if (hasO && !(t.dueDate && isPast(new Date(t.dueDate)) && t.status !== "DONE" && t.status !== "ARCHIVED")) return false;
          if (hasW && !(t.dueDate && isThisWeek(new Date(t.dueDate)))) return false;
          return true;
        });
      });
      result = out;
    }

    return result;
  }, [tasks, myTasksOnly, session?.user?.id, filters]);

  /* ── Stats ───────────────────────────────────────────────────── */
  const allTasks   = useMemo(() => Object.values(tasks).flat(), [tasks]);
  const totalCount = allTasks.length;
  const doneCount  = useMemo(() => (tasks["DONE"] ?? []).length, [tasks]);
  const pct        = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const firstCol   = columns.find((c) => c.group === "progress");
  const canvasColor = firstCol?.color ?? "#818CF8";

  const activeFilterCount = filters.assignees.length + filters.priorities.length + (filters.overdue ? 1 : 0) + (filters.thisWeek ? 1 : 0);
  const hasActiveFilters  = activeFilterCount > 0;

  const toggleAssignee  = (id: string)  => setFilters((f) => ({ ...f, assignees:  f.assignees.includes(id)    ? f.assignees.filter((a)  => a !== id)    : [...f.assignees, id] }));
  const togglePriority  = (v: string)   => setFilters((f) => ({ ...f, priorities: f.priorities.includes(v)    ? f.priorities.filter((p) => p !== v)    : [...f.priorities, v] }));
  const clearFilters    = ()            => setFilters({ assignees: [], priorities: [], overdue: false, thisWeek: false });

  if (loading) return (
    <div className="p-6 animate-fade-in">
      <div className="h-14 skeleton rounded-2xl mb-4" />
      <SkeletonList count={3} />
    </div>
  );

  return (
    <>
      {/* ── Stats bar ───────────────────────────────────────────── */}
      <div
        className="flex items-center gap-4 px-6 py-2.5 flex-wrap shrink-0"
        style={{ borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-sidebar)" }}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex-1 max-w-[200px]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold" style={{ color: "var(--text-muted)" }}>
                {doneCount}/{totalCount} completed
              </span>
              <span className="text-[11px] font-black tabular" style={{ color: pct === 100 ? "var(--success)" : "var(--accent)" }}>
                {pct}%
              </span>
            </div>
            <div className="h-[4px] rounded-full overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, background: pct === 100 ? "var(--success)" : "linear-gradient(90deg, var(--accent), #A78BFA)" }}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {columns.map((col) => {
            const count = visibleTasks[col.id]?.length ?? 0;
            return (
              <span key={col.id} className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: `${col.color}15`, color: col.color, border: `1px solid ${col.color}25`, opacity: count === 0 ? 0.4 : 1 }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: col.color }} />
                {count}
              </span>
            );
          })}
        </div>

        {/* ── Toolbar buttons (right side) ──────────────────────── */}
        <div className="flex items-center gap-1.5 ml-auto shrink-0">
          {/* Search */}
          <button
            onClick={() => { setShowSearch((v) => { if (!v) setTimeout(() => searchRef.current?.focus(), 60); else setSearchQuery(""); return !v; }); }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all"
            style={{
              background: showSearch ? "var(--accent-muted)" : "var(--bg-elevated)",
              border: `1px solid ${showSearch ? "var(--accent-glow)" : "var(--border)"}`,
              color: showSearch ? "var(--accent)" : "var(--text-muted)",
            }}
            title="Search tasks (Ctrl+F)"
          >
            <Search className="w-3.5 h-3.5" />
            {showSearch ? "Close" : "Search"}
          </button>

          {/* Filter */}
          <button
            onClick={() => setShowFilters((v) => !v)}
            className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all"
            style={{
              background: showFilters || hasActiveFilters ? "var(--accent-muted)" : "var(--bg-elevated)",
              border: `1px solid ${showFilters || hasActiveFilters ? "var(--accent-glow)" : "var(--border)"}`,
              color: showFilters || hasActiveFilters ? "var(--accent)" : "var(--text-muted)",
            }}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filter
            {hasActiveFilters && (
              <span className="ml-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black text-white"
                style={{ background: "var(--accent)" }}>
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── Search bar ──────────────────────────────────────────── */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden shrink-0"
            style={{ borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-sidebar)" }}
          >
            <div className="flex items-center gap-2 px-6 py-2">
              <Search className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--text-muted)" }} />
              <input
                ref={searchRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Escape") { setSearchQuery(""); setShowSearch(false); } }}
                placeholder="Search tasks by title… (Esc to close)"
                className="flex-1 bg-transparent outline-none text-xs"
                style={{ color: "var(--text-foreground)" }}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="shrink-0" style={{ color: "var(--text-subtle)" }}>
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              {searchQuery && (
                <span className="text-[10px] font-semibold shrink-0" style={{ color: "var(--text-muted)" }}>
                  {Object.values(tasks).flat().filter((t) => t.title.toLowerCase().includes(searchQuery.toLowerCase())).length} results
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Filter panel ────────────────────────────────────────── */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden shrink-0"
            style={{ borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-sidebar)" }}
          >
            <div className="flex flex-wrap items-center gap-4 px-6 py-2.5">
              {/* Assignee filter */}
              {members.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider shrink-0" style={{ color: "var(--text-subtle)" }}>Assignee</span>
                  <div className="flex items-center gap-1">
                    {members.map((m) => {
                      const active = filters.assignees.includes(m.id);
                      return (
                        <button
                          key={m.id}
                          onClick={() => toggleAssignee(m.id)}
                          title={m.name ?? m.email}
                          className="transition-all"
                          style={{ opacity: active ? 1 : 0.4, transform: active ? "scale(1.1)" : "scale(1)", outline: active ? "2px solid var(--accent)" : "none", outlineOffset: 2, borderRadius: "50%" }}
                        >
                          <Avatar name={m.name ?? m.email} image={m.image ?? undefined} size="xs" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Priority filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider shrink-0" style={{ color: "var(--text-subtle)" }}>Priority</span>
                <div className="flex items-center gap-1">
                  {PRIORITY_OPTS.map((p) => {
                    const active = filters.priorities.includes(p.value);
                    return (
                      <button
                        key={p.value}
                        onClick={() => togglePriority(p.value)}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all"
                        style={{
                          background: active ? `${p.color}22` : "var(--bg-elevated)",
                          border: `1px solid ${active ? p.color + "60" : "var(--border)"}`,
                          color: active ? p.color : "var(--text-muted)",
                        }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: p.color }} />
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Overdue */}
              <button
                onClick={() => setFilters((f) => ({ ...f, overdue: !f.overdue }))}
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all"
                style={{
                  background: filters.overdue ? "rgba(244,63,94,0.12)" : "var(--bg-elevated)",
                  border: `1px solid ${filters.overdue ? "rgba(244,63,94,0.35)" : "var(--border)"}`,
                  color: filters.overdue ? "var(--danger)" : "var(--text-muted)",
                }}
              >
                <AlertTriangle className="w-3 h-3" />
                Overdue
              </button>

              {/* Due this week */}
              <button
                onClick={() => setFilters((f) => ({ ...f, thisWeek: !f.thisWeek }))}
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all"
                style={{
                  background: filters.thisWeek ? "rgba(96,165,250,0.12)" : "var(--bg-elevated)",
                  border: `1px solid ${filters.thisWeek ? "rgba(96,165,250,0.35)" : "var(--border)"}`,
                  color: filters.thisWeek ? "#60A5FA" : "var(--text-muted)",
                }}
              >
                <Clock className="w-3 h-3" />
                This week
              </button>

              {/* Clear */}
              {hasActiveFilters && (
                <button onClick={clearFilters} className="text-[10px] font-bold transition-colors"
                  style={{ color: "var(--danger)" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0.7"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
                >
                  Clear all
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Board canvas ─────────────────────────────────────────── */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div
          className="flex gap-4 p-6 overflow-x-auto pb-10 relative"
          style={{
            minHeight: "calc(100vh - 200px)",
            backgroundImage: `
              radial-gradient(ellipse at 8% 25%, ${canvasColor}18 0%, transparent 50%),
              radial-gradient(ellipse at 88% 72%, ${canvasColor}10 0%, transparent 45%),
              radial-gradient(ellipse at 50% 100%, ${canvasColor}08 0%, transparent 40%),
              radial-gradient(circle, rgba(79,82,217,0.10) 1px, transparent 1px)
            `,
            backgroundSize: "100% 100%, 100% 100%, 100% 100%, 22px 22px",
          }}
        >
          {columns.map((col) => (
            <KanbanColumn
              key={col.id}
              status={col.id as TaskStatus}
              label={col.label}
              color={col.color}
              group={col.group}
              tasks={visibleTasks[col.id] ?? []}
              onTaskClick={handleTaskClick}
              onAddTask={handleAddTask}
              onQuickCreate={handleQuickCreate}
              onRename={handleRenameColumn}
              onCardContextMenu={(e, task) => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, task }); }}
              searchQuery={searchQuery || undefined}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask && <KanbanCard task={activeTask} onClick={() => {}} overlay />}
        </DragOverlay>
      </DndContext>

      <TaskModal
        open={showModal && !selectedTask}
        onClose={() => { setShowModal(false); setSelectedTask(null); }}
        projectId={projectId}
        task={null}
        defaultStatus={defaultStatus}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
      />

      <TaskDetailPanel
        task={selectedTask}
        open={showDetailPanel}
        onClose={() => { setShowDetailPanel(false); setSelectedTask(null); }}
        onUpdate={handleSaveTask}
        onDelete={handleDeleteTask}
        projectId={projectId}
      />

      {/* ── Context menu ─────────────────────────────────────────── */}
      {ctxMenu && (
        <BoardContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          task={ctxMenu.task}
          columns={columns}
          onClose={() => setCtxMenu(null)}
          onStatusChange={handleCtxStatusChange}
          onPriorityChange={handleCtxPriorityChange}
          onAssignToMe={handleCtxAssignToMe}
          onOpen={(t) => { handleTaskClick(t); setCtxMenu(null); }}
          onDelete={handleCtxDelete}
        />
      )}
    </>
  );
}
