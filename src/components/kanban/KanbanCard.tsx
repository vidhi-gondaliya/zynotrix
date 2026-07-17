"use client";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Calendar, MessageSquare, AlertCircle, CheckSquare } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import type { Task } from "@/types";
import { format, isPast } from "date-fns";
import { useState, useEffect } from "react";

const PRIORITY: Record<string, { color: string; label: string }> = {
  LOW:    { color: "#6B7280", label: "Low"    },
  MEDIUM: { color: "#60A5FA", label: "Medium" },
  HIGH:   { color: "#FBBF24", label: "High"   },
  URGENT: { color: "#F43F5E", label: "Urgent" },
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

export function KanbanCard({ task, onClick, overlay, columnColor, onContextMenu, searchQuery, dimmed }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  const style = { transform: CSS.Transform.toString(transform), transition };

  const isOverdue    = task.dueDate && isPast(new Date(task.dueDate)) && task.status !== "DONE" && task.status !== "ARCHIVED";
  const searchMatch  = !searchQuery || task.title.toLowerCase().includes(searchQuery.toLowerCase());
  const isDone    = task.status === "DONE" || task.status === "ARCHIVED";
  const pri       = PRIORITY[task.priority] ?? PRIORITY.MEDIUM;
  const railColor = isOverdue ? "#F43F5E" : isDone ? "#22C55E" : pri.color;

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
        setSubtaskDone(subs.filter((s) => s.done).length);
      }
    } catch {}
  }, [task.id]);

  const subtaskPct   = subtaskTotal > 0 ? Math.round((subtaskDone / subtaskTotal) * 100) : 0;
  const commentCount = task._count?.comments ?? 0;

  /* The card background gets an extremely subtle tint from the column color */
  const tint = columnColor ?? "var(--accent)";

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      onClick={() => onClick(task)}
      onMouseEnter={() => !overlay && !isDragging && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onContextMenu={(e) => { e.preventDefault(); onContextMenu?.(e, task); }}
      className={`group relative rounded-[14px] cursor-pointer select-none overflow-hidden flex ${isDragging ? "opacity-20" : ""}`}
      style={{
        ...style,
        opacity: dimmed ? 0.25 : 1,
        background: `var(--bg-card)`,
        border: `1.5px solid ${
          searchQuery && searchMatch && !dimmed ? "#FBBF2480" :
          isOverdue                             ? "rgba(244,63,94,0.35)" :
          isDone                                ? "rgba(34,197,94,0.25)"  :
          hovered                               ? `${tint}50`              :
                                                  "var(--border)"
        }`,
        boxShadow: overlay
          ? "0 32px 80px rgba(0,0,0,0.85), 0 8px 24px rgba(0,0,0,0.60)"
          : hovered && !isDragging
          ? `0 8px 24px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.08), 0 0 0 1px ${tint}30`
          : "0 1px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)",
        transform: overlay
          ? `${CSS.Transform.toString(transform) ?? ""} scale(1.03) rotate(1.5deg)`
          : hovered && !isDragging
          ? `${CSS.Transform.toString(transform) ?? ""} translateY(-2px)`
          : CSS.Transform.toString(transform) ?? undefined,
        transition: isDragging ? transition ?? undefined : "all 0.15s ease",
      }}
    >
      {/* Priority left rail */}
      <div
        className="w-[4px] shrink-0 self-stretch"
        style={{
          background: task.priority === "LOW" && !isDone && !isOverdue
            ? "var(--border)"
            : isDone
            ? "#22C55E"
            : isOverdue
            ? "#F43F5E"
            : `linear-gradient(180deg, ${railColor} 0%, ${railColor}60 100%)`,
          borderRadius: "14px 0 0 14px",
        }}
      />

      {/* Card body */}
      <div className="flex-1 px-3.5 py-3 min-w-0">

        {/* URGENT top flash */}
        {task.priority === "URGENT" && !isDone && (
          <div
            className="absolute top-0 left-[4px] right-0 h-[2px]"
            style={{ background: "linear-gradient(90deg, #F43F5E, #FB923C 60%, transparent)" }}
          />
        )}

        {/* Title + drag */}
        <div className="flex items-start gap-2 mb-2">
          <p
            className={`flex-1 text-[13px] font-semibold leading-[1.4] ${isDone ? "line-through opacity-60" : ""}`}
            style={{ color: "var(--text-foreground)" }}
          >
            {task.title}
          </p>
          <div
            {...attributes}
            {...listeners}
            className="shrink-0 cursor-grab active:cursor-grabbing w-5 h-5 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-40 hover:!opacity-80 transition-opacity mt-0.5"
            style={{ color: "var(--text-subtle)" }}
            onClick={(e) => e.stopPropagation()}
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
          <div className="flex flex-wrap gap-1 mb-2">
            {tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{ background: `${tint}18`, color: tint, border: `1px solid ${tint}30` }}
              >
                {tag}
              </span>
            ))}
            {tags.length > 3 && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "var(--bg-elevated)", color: "var(--text-subtle)" }}>
                +{tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Subtask progress */}
        {subtaskTotal > 0 && (
          <div className="mb-2.5">
            <div className="flex items-center justify-between mb-1">
              <span className="flex items-center gap-1 text-[10px] font-semibold" style={{ color: subtaskPct === 100 ? "var(--success)" : "var(--text-subtle)" }}>
                <CheckSquare className="w-3 h-3" />{subtaskDone}/{subtaskTotal}
              </span>
              <span className="text-[10px] font-bold tabular" style={{ color: subtaskPct === 100 ? "var(--success)" : "var(--text-subtle)" }}>{subtaskPct}%</span>
            </div>
            <div className="h-[3px] rounded-full overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${subtaskPct}%`, background: subtaskPct === 100 ? "var(--success)" : `linear-gradient(90deg, ${tint}, #A78BFA)` }} />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center gap-2 mt-1">
          {/* Assignee */}
          {task.assignee
            ? <Avatar name={task.assignee.name} image={task.assignee.image} size="xs" />
            : <div className="w-5 h-5 rounded-full border border-dashed shrink-0" style={{ borderColor: "var(--border-strong)" }} />
          }

          {/* Priority */}
          <span className="flex items-center gap-1 text-[10px] font-bold" style={{ color: railColor }}>
            <span className="w-[5px] h-[5px] rounded-full shrink-0" style={{ background: railColor }} />
            {pri.label}
          </span>

          <div className="flex items-center gap-2 ml-auto">
            {/* Due date */}
            {task.dueDate && (
              <span className="flex items-center gap-0.5 text-[10.5px] font-semibold shrink-0" style={{ color: isOverdue ? "var(--danger)" : "var(--text-muted)" }}>
                {isOverdue ? <AlertCircle className="w-3 h-3" /> : <Calendar className="w-3 h-3" />}
                {format(new Date(task.dueDate), "MMM d")}
              </span>
            )}
            {/* Comments */}
            {commentCount > 0 && (
              <span className="flex items-center gap-0.5 text-[10.5px] font-medium" style={{ color: "var(--text-subtle)" }}>
                <MessageSquare className="w-3 h-3" />{commentCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
