"use client";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Calendar, MessageSquare, CheckSquare, Sparkles, Link2 } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import type { Task } from "@/types";
import { format, isPast, differenceInDays } from "date-fns";
import { useState, useEffect } from "react";

const PRIORITY: Record<string, { color: string; label: string }> = {
  LOW:    { color: "#9CA3AF", label: "Low"    },
  MEDIUM: { color: "#60A5FA", label: "Med"    },
  HIGH:   { color: "#F59E0B", label: "High"   },
  URGENT: { color: "#EF4444", label: "Urgent" },
};

interface KanbanCardProps {
  task: Task;
  onClick: (task: Task) => void;
  overlay?: boolean;
  columnColor?: string;
  onContextMenu?: (e: React.MouseEvent, task: Task) => void;
  searchQuery?: string;
  dimmed?: boolean;
}

export function KanbanCard({
  task, onClick, overlay, columnColor, onContextMenu, searchQuery, dimmed,
}: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  const style = { transform: CSS.Transform.toString(transform), transition };

  const isOverdue = !!(
    task.dueDate &&
    isPast(new Date(task.dueDate)) &&
    task.status !== "DONE" &&
    task.status !== "ARCHIVED"
  );
  const isDone      = task.status === "DONE" || task.status === "ARCHIVED";
  const pri         = PRIORITY[task.priority] ?? PRIORITY.MEDIUM;
  const railColor   = isDone ? "#22C55E" : isOverdue ? "#EF4444" : pri.color;

  const daysOverdue = task.dueDate && isOverdue
    ? differenceInDays(new Date(), new Date(task.dueDate))
    : 0;

  const searchMatch = !searchQuery || task.title.toLowerCase().includes(searchQuery.toLowerCase());

  let tags: string[] = [];
  try {
    tags = Array.isArray(task.tags)
      ? task.tags
      : (typeof task.tags === "string" ? JSON.parse(task.tags) : []);
  } catch { tags = []; }

  const [subtaskDone,  setSubtaskDone]  = useState(0);
  const [subtaskTotal, setSubtaskTotal] = useState(0);
  const [hovered,      setHovered]      = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`subtasks_${task.id}`);
      if (saved) {
        const subs = JSON.parse(saved) as { done: boolean }[];
        setSubtaskTotal(subs.length);
        setSubtaskDone(subs.filter(s => s.done).length);
      }
    } catch {}
  }, [task.id]);

  const subtaskPct   = subtaskTotal > 0 ? Math.round((subtaskDone / subtaskTotal) * 100) : 0;
  const commentCount = task._count?.comments ?? 0;

  // Always clean white — the left rail alone carries priority color
  const cardBorder = searchQuery && searchMatch && !dimmed
    ? "rgba(245,158,11,0.65)"
    : hovered && !isDragging
    ? `${railColor}45`
    : "var(--kanban-card-border)";

  const cardShadow = overlay
    ? "0 32px 80px rgba(0,0,0,0.85), 0 8px 28px rgba(0,0,0,0.60)"
    : hovered && !isDragging
    ? "0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.08)"
    : "var(--kanban-card-shadow)";

  const cardTransform = overlay
    ? `${CSS.Transform.toString(transform) ?? ""} scale(1.03) rotate(1deg)`
    : hovered && !isDragging
    ? `${CSS.Transform.toString(transform) ?? ""} translateY(-2px)`
    : CSS.Transform.toString(transform) ?? undefined;

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      onClick={() => onClick(task)}
      onMouseEnter={() => !overlay && !isDragging && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onContextMenu={e => { e.preventDefault(); onContextMenu?.(e, task); }}
      className={`group relative rounded-2xl cursor-pointer select-none overflow-hidden ${isDragging ? "opacity-20" : ""}`}
      style={{
        ...style,
        opacity: dimmed ? 0.15 : 1,
        background: "var(--kanban-card-bg)",
        border: `1px solid ${cardBorder}`,
        boxShadow: cardShadow,
        transform: cardTransform,
        transition: isDragging ? transition ?? undefined : "box-shadow 0.18s ease, transform 0.18s ease, border-color 0.18s ease",
        backdropFilter: `blur(var(--kanban-card-blur))`,
        WebkitBackdropFilter: `blur(var(--kanban-card-blur))`,
      }}
    >
      {/* Left priority rail — the only color on the card */}
      <div
        className="absolute left-0 top-0 bottom-0"
        style={{
          width: 4,
          background: railColor,
          opacity: isDone ? 0.5 : 1,
        }}
      />

      {/* Card body */}
      <div className="pl-4 pr-3.5 pt-3 pb-3 min-w-0" style={{ paddingLeft: 16 }}>

        {/* Title row */}
        <div className="flex items-start gap-2 mb-2">
          <p
            className={`flex-1 text-[13px] font-semibold leading-[1.5] tracking-[-0.01em] min-w-0 ${isDone ? "line-through" : ""}`}
            style={{ color: isDone ? "var(--text-muted)" : "var(--text-foreground)" }}
          >
            {task.title}
          </p>

          {/* Drag handle */}
          <div
            {...attributes}
            {...listeners}
            className="shrink-0 cursor-grab active:cursor-grabbing w-5 h-5 rounded-md flex items-center justify-center mt-0.5 opacity-0 group-hover:opacity-30 hover:!opacity-60 transition-opacity"
            style={{ color: "var(--text-subtle)" }}
            onClick={e => e.stopPropagation()}
          >
            <svg width="8" height="12" viewBox="0 0 8 12" fill="currentColor">
              <circle cx="2" cy="2" r="1.4"/><circle cx="6" cy="2" r="1.4"/>
              <circle cx="2" cy="6" r="1.4"/><circle cx="6" cy="6" r="1.4"/>
              <circle cx="2" cy="10" r="1.4"/><circle cx="6" cy="10" r="1.4"/>
            </svg>
          </div>
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2.5">
            {tags.slice(0, 3).map(tag => (
              <span
                key={tag}
                className="text-[10px] font-medium px-1.5 py-0.5 rounded-md"
                style={{
                  background: "var(--bg-elevated)",
                  color: "var(--text-muted)",
                }}
              >
                {tag}
              </span>
            ))}
            {tags.length > 3 && (
              <span
                className="text-[10px] font-medium px-1.5 py-0.5 rounded-md"
                style={{ background: "var(--bg-elevated)", color: "var(--text-subtle)" }}
              >
                +{tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Subtask progress bar */}
        {subtaskTotal > 0 && (
          <div className="mb-2.5">
            <div className="flex items-center justify-between mb-1">
              <span className="flex items-center gap-1 text-[10px]" style={{ color: "var(--text-subtle)" }}>
                <CheckSquare className="w-3 h-3" />
                <span className="font-medium">{subtaskDone}/{subtaskTotal}</span>
              </span>
              <span className="text-[10px] font-semibold tabular-nums" style={{ color: subtaskPct === 100 ? "#22C55E" : "var(--text-subtle)" }}>
                {subtaskPct}%
              </span>
            </div>
            <div className="h-[2px] rounded-full overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${subtaskPct}%`,
                  background: subtaskPct === 100 ? "#22C55E" : railColor,
                }}
              />
            </div>
          </div>
        )}

        {/* Divider */}
        <div style={{ height: 1, background: "var(--border-subtle)", marginBottom: 10 }} />

        {/* Footer */}
        <div className="flex items-center gap-1.5">
          {/* Assignee */}
          {task.assignee
            ? <Avatar name={task.assignee.name} image={task.assignee.image} size="xs" />
            : (
              <div
                className="w-[18px] h-[18px] rounded-full border border-dashed shrink-0"
                style={{ borderColor: "var(--border-strong)" }}
              />
            )
          }

          {/* Priority dot + label */}
          <div className="flex items-center gap-1 shrink-0 ml-0.5">
            <span className="w-[5px] h-[5px] rounded-full shrink-0" style={{ background: railColor }} />
            <span className="text-[10px] font-semibold" style={{ color: "var(--text-muted)" }}>
              {pri.label}
            </span>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Comments */}
          {commentCount > 0 && (
            <span className="flex items-center gap-0.5 text-[10px]" style={{ color: "var(--text-subtle)" }}>
              <MessageSquare className="w-3 h-3" />
              <span className="font-medium">{commentCount}</span>
            </span>
          )}

          {/* Due date */}
          {task.dueDate && (
            <span
              className="flex items-center gap-0.5 text-[10px] font-semibold shrink-0"
              style={{ color: isOverdue ? "#EF4444" : "var(--text-muted)" }}
            >
              <Calendar className="w-3 h-3" />
              {isOverdue && daysOverdue > 0
                ? `${daysOverdue}d late`
                : format(new Date(task.dueDate), "MMM d")}
            </span>
          )}

          {task.parentTaskId && (
            <Link2 className="w-3 h-3 shrink-0" style={{ color: "var(--text-subtle)" }} />
          )}
        </div>

        {/* Hover quick action — AI */}
        {hovered && !isDragging && !overlay && (
          <div
            className="absolute bottom-2.5 right-2.5"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => window.open(`/ai/assistant?task=${encodeURIComponent(task.title)}`, "_self")}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold text-white"
              style={{
                background: "linear-gradient(135deg, #6366F1, #A78BFA)",
                boxShadow: "0 2px 12px rgba(99,102,241,0.40)",
              }}
            >
              <Sparkles className="w-2.5 h-2.5" />
              AI
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
