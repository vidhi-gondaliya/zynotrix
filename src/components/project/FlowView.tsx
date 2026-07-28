"use client";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { isPast, differenceInDays, format, isThisWeek, isToday, isTomorrow } from "date-fns";
import { Avatar } from "@/components/ui/Avatar";
import { ChevronRight, ChevronDown, Plus } from "lucide-react";
import type { Task } from "@/types";

const P_COLOR: Record<string, string> = {
  LOW:    "#94A3B8",
  MEDIUM: "#60A5FA",
  HIGH:   "#F59E0B",
  URGENT: "#EF4444",
};

const STATUS_LABEL: Record<string, string> = {
  BACKLOG:     "Backlog",
  TODO:        "Todo",
  IN_PROGRESS: "Active",
  REVIEW:      "Review",
  DONE:        "Done",
  ARCHIVED:    "Archived",
};

interface FlowViewProps {
  projectId: string;
  onTaskClick: (task: Task) => void;
  onAddTask: (status: string) => void;
  focusMode?: boolean;
  refreshKey?: number;
}

function isOverdue(task: Task) {
  return !!(
    task.dueDate &&
    isPast(new Date(task.dueDate)) &&
    task.status !== "DONE" &&
    task.status !== "ARCHIVED"
  );
}

function dueDateLabel(task: Task): { label: string; color: string } {
  if (!task.dueDate) return { label: "", color: "var(--text-muted)" };
  const d = new Date(task.dueDate);
  const overdue = isOverdue(task);
  const days = differenceInDays(new Date(), d);

  if (overdue) return { label: `${days}d late`, color: "#EF4444" };
  if (isToday(d)) return { label: "Today", color: "#F59E0B" };
  if (isTomorrow(d)) return { label: "Tomorrow", color: "#F59E0B" };
  if (isThisWeek(d, { weekStartsOn: 1 })) return { label: format(d, "EEE"), color: "var(--text-muted)" };
  return { label: format(d, "MMM d"), color: "var(--text-muted)" };
}

function sectionInsight(id: string, tasks: Task[]): string {
  if (id === "now") {
    const overdue = tasks.filter(isOverdue);
    const review  = tasks.filter(t => t.status === "REVIEW");
    const parts: string[] = [];
    if (overdue.length) parts.push(`${overdue.length} overdue`);
    if (review.length)  parts.push(`${review.length} awaiting review`);
    if (!parts.length) return `${tasks.length} in motion`;
    return parts.join(" · ");
  }
  if (id === "next") {
    const thisWeek = tasks.filter(t => t.dueDate && isThisWeek(new Date(t.dueDate), { weekStartsOn: 1 }));
    if (thisWeek.length) return `${thisWeek.length} due this week`;
    return "Ready to start";
  }
  if (id === "pipeline") {
    const unassigned = tasks.filter(t => !t.assigneeId);
    if (unassigned.length === tasks.length) return "All unassigned — needs planning";
    if (unassigned.length) return `${unassigned.length} unassigned`;
    return "Queued for future sprints";
  }
  return "";
}

function TaskRow({ task, onClick }: { task: Task; onClick: (t: Task) => void }) {
  const [hovered, setHovered] = useState(false);
  const pri    = P_COLOR[task.priority] ?? "#94A3B8";
  const over   = isOverdue(task);
  const dot    = over ? "#EF4444" : pri;
  const due    = dueDateLabel(task);
  const isDone = task.status === "DONE" || task.status === "ARCHIVED";

  return (
    <div
      onClick={() => onClick(task)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex items-center gap-3 px-4 py-2.5 cursor-pointer rounded-xl transition-all select-none"
      style={{
        background: hovered ? "var(--bg-card-hover)" : "transparent",
        borderLeft: `2.5px solid ${dot}`,
        marginLeft: 1,
      }}
    >
      {/* Priority dot */}
      <span
        className="w-[5px] h-[5px] rounded-full shrink-0 -ml-1"
        style={{ background: dot }}
      />

      {/* Title */}
      <span
        className="flex-1 min-w-0 text-[13px] font-semibold truncate"
        style={{
          color: isDone ? "var(--text-muted)" : "var(--text-foreground)",
          textDecoration: isDone ? "line-through" : "none",
          letterSpacing: "-0.01em",
        }}
      >
        {task.title}
      </span>

      {/* Chips row */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Status chip */}
        <span
          className="text-[9.5px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md"
          style={{
            background: "var(--bg-elevated)",
            color: "var(--text-subtle)",
            letterSpacing: "0.06em",
          }}
        >
          {STATUS_LABEL[task.status] ?? task.status}
        </span>

        {/* Overdue chip */}
        {over && (
          <span
            className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-md"
            style={{ background: "rgba(239,68,68,0.10)", color: "#EF4444" }}
          >
            {due.label}
          </span>
        )}
      </div>

      {/* Assignee */}
      <div className="w-5 shrink-0 flex justify-center">
        {task.assignee
          ? <Avatar name={task.assignee.name} image={task.assignee.image} size="xs" />
          : <span className="w-[18px] h-[18px] rounded-full border-dashed flex" style={{ border: "1px dashed var(--border-strong)" }} />
        }
      </div>

      {/* Due date (non-overdue) */}
      {!over && task.dueDate && (
        <span
          className="text-[10px] font-semibold w-[52px] text-right tabular-nums shrink-0"
          style={{ color: due.color }}
        >
          {due.label}
        </span>
      )}
      {!task.dueDate && (
        <span className="w-[52px] shrink-0" />
      )}

      {/* Arrow */}
      <ChevronRight
        className="w-3.5 h-3.5 shrink-0 transition-opacity"
        style={{ color: "var(--text-subtle)", opacity: hovered ? 0.8 : 0.2 }}
      />
    </div>
  );
}

interface Section {
  id: string;
  label: string;
  addStatus: string;
  tasks: Task[];
}

export function FlowView({ projectId, onTaskClick, onAddTask, focusMode, refreshKey }: FlowViewProps) {
  const { data: session } = useSession();
  const [tasks,   setTasks]   = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [donOpen, setDoneOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks`, { cache: "no-store" });
      const data: Task[] = await res.json();
      setTasks(data);
    } catch {}
    finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { load(); }, [load, refreshKey]);

  const userId = (session?.user as { id?: string } | undefined)?.id;
  const filtered = focusMode && userId
    ? tasks.filter(t => t.assigneeId === userId)
    : tasks;

  const priorityOrder: Record<string, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  const byPriority = (a: Task, b: Task) => {
    const po = (priorityOrder[a.priority] ?? 4) - (priorityOrder[b.priority] ?? 4);
    if (po !== 0) return po;
    const ao = isOverdue(a) ? 0 : 1;
    const bo = isOverdue(b) ? 0 : 1;
    return ao - bo;
  };

  const now      = filtered.filter(t => t.status === "IN_PROGRESS" || t.status === "REVIEW").sort(byPriority);
  const next     = filtered.filter(t => t.status === "TODO").sort(byPriority);
  const pipeline = filtered.filter(t => t.status === "BACKLOG").sort(byPriority);
  const done     = filtered.filter(t => t.status === "DONE" || t.status === "ARCHIVED").sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const sections: Section[] = [
    { id: "now",      label: "NOW",      addStatus: "IN_PROGRESS", tasks: now      },
    { id: "next",     label: "NEXT",     addStatus: "TODO",        tasks: next     },
    { id: "pipeline", label: "PIPELINE", addStatus: "BACKLOG",     tasks: pipeline },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24" style={{ color: "var(--text-muted)" }}>
        <span className="text-[12px]">Loading workspace…</span>
      </div>
    );
  }

  return (
    <div className="px-6 py-5 max-w-4xl">
      {sections.map(({ id, label, addStatus, tasks: sectionTasks }) => {
        const insight = sectionInsight(id, sectionTasks);
        return (
          <div key={id} className="mb-8">
            {/* Section header */}
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className="text-[10px] font-black tracking-[0.14em]"
                  style={{ color: "var(--text-foreground)" }}
                >
                  {label}
                </span>
                <span
                  className="text-[10px] font-black tabular-nums min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-md"
                  style={{
                    background: "var(--bg-elevated)",
                    color: "var(--text-subtle)",
                  }}
                >
                  {sectionTasks.length}
                </span>
              </div>

              {insight && (
                <span className="text-[11px]" style={{ color: "var(--text-subtle)" }}>
                  {insight}
                </span>
              )}

              <div className="flex-1 h-px" style={{ background: "var(--border)" }} />

              {/* Add task button */}
              <button
                onClick={() => onAddTask(addStatus)}
                className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all shrink-0"
                style={{ color: "var(--text-subtle)", background: "transparent" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.color = "var(--accent)";
                  (e.currentTarget as HTMLElement).style.background = "var(--accent-muted)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.color = "var(--text-subtle)";
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                }}
              >
                <Plus className="w-3 h-3" />
                Add
              </button>
            </div>

            {/* Task rows */}
            {sectionTasks.length === 0 ? (
              <div
                className="flex items-center gap-2 px-4 py-3 rounded-xl text-[11px] cursor-pointer transition-all"
                style={{ border: "1.5px dashed var(--border)", color: "var(--text-subtle)", background: "transparent" }}
                onClick={() => onAddTask(addStatus)}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--accent-glow)"; (e.currentTarget as HTMLElement).style.color = "var(--accent)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.color = "var(--text-subtle)"; }}
              >
                <Plus className="w-3.5 h-3.5" />
                No tasks here — add one
              </div>
            ) : (
              <div className="flex flex-col gap-0.5">
                {sectionTasks.map(task => (
                  <TaskRow key={task.id} task={task} onClick={onTaskClick} />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* DONE — collapsed by default */}
      {done.length > 0 && (
        <div className="mb-4">
          <button
            onClick={() => setDoneOpen(o => !o)}
            className="flex items-center gap-3 w-full group mb-3"
          >
            <div className="flex items-center gap-2 shrink-0">
              {donOpen
                ? <ChevronDown className="w-3 h-3" style={{ color: "var(--text-muted)" }} />
                : <ChevronRight className="w-3 h-3" style={{ color: "var(--text-muted)" }} />
              }
              <span className="text-[10px] font-black tracking-[0.14em]" style={{ color: "var(--text-muted)" }}>
                DONE
              </span>
              <span
                className="text-[10px] font-black tabular-nums min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-md"
                style={{ background: "var(--bg-elevated)", color: "var(--text-subtle)" }}
              >
                {done.length}
              </span>
            </div>
            <div className="flex-1 h-px" style={{ background: "var(--border)", opacity: 0.5 }} />
          </button>

          {donOpen && (
            <div className="flex flex-col gap-0.5 opacity-60">
              {done.map(task => (
                <TaskRow key={task.id} task={task} onClick={onTaskClick} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
