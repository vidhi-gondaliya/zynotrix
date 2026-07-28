"use client";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Calendar, MessageSquare, CheckSquare } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import type { Task } from "@/types";
import { format, isPast, differenceInDays } from "date-fns";
import { useState, useEffect } from "react";

const PRIORITY: Record<string, { color: string; label: string }> = {
  LOW:    { color: "#94A3B8", label: "Low"    },
  MEDIUM: { color: "#60A5FA", label: "Medium" },
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
  task, onClick, overlay, onContextMenu, searchQuery, dimmed,
}: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  const dndStyle = { transform: CSS.Transform.toString(transform), transition };

  const isOverdue = !!(
    task.dueDate &&
    isPast(new Date(task.dueDate)) &&
    task.status !== "DONE" &&
    task.status !== "ARCHIVED"
  );
  const isDone    = task.status === "DONE" || task.status === "ARCHIVED";
  const pri       = PRIORITY[task.priority] ?? PRIORITY.MEDIUM;
  const railColor = isDone ? "#22C55E" : isOverdue ? "#EF4444" : pri.color;

  const daysLate  = task.dueDate && isOverdue
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
        const arr = JSON.parse(saved) as { done: boolean }[];
        setSubtaskTotal(arr.length);
        setSubtaskDone(arr.filter(s => s.done).length);
      }
    } catch {}
  }, [task.id]);

  const subtaskPct   = subtaskTotal > 0 ? Math.round((subtaskDone / subtaskTotal) * 100) : 0;
  const commentCount = task._count?.comments ?? 0;

  // Left glow rail lives entirely in box-shadow — no extra DOM element
  const railShadow   = `inset 3px 0 0 ${railColor}`;
  const restShadow   = "var(--kanban-card-shadow)";
  const hoverShadow  = "0 8px 28px rgba(0,0,0,0.11), 0 2px 6px rgba(0,0,0,0.07)";
  const overlayShadow = "0 32px 80px rgba(0,0,0,0.80), 0 8px 24px rgba(0,0,0,0.55)";

  const boxShadow = overlay
    ? `${railShadow}, ${overlayShadow}`
    : hovered && !isDragging
    ? `${railShadow}, ${hoverShadow}`
    : `${railShadow}, ${restShadow}`;

  const borderColor = searchQuery && searchMatch && !dimmed
    ? "rgba(245,158,11,0.60)"
    : hovered && !isDragging
    ? `${railColor}30`
    : "var(--kanban-card-border)";

  const cardTransform = overlay
    ? `${CSS.Transform.toString(transform) ?? ""} scale(1.025) rotate(0.8deg)`
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
      className={`group relative rounded-2xl cursor-pointer select-none ${isDragging ? "opacity-10" : ""}`}
      style={{
        ...dndStyle,
        opacity: dimmed ? 0.10 : 1,
        background: "var(--kanban-card-bg)",
        border: `1px solid ${borderColor}`,
        boxShadow,
        transform: cardTransform,
        transition: isDragging
          ? dndStyle.transition ?? undefined
          : "box-shadow 0.20s ease, border-color 0.20s ease, transform 0.20s cubic-bezier(0.16,1,0.3,1)",
        backdropFilter: `blur(var(--kanban-card-blur))`,
        WebkitBackdropFilter: `blur(var(--kanban-card-blur))`,
      }}
    >
      {/* Drag handle — ghost until hover */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-3.5 right-3 cursor-grab active:cursor-grabbing w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-20 hover:!opacity-60 transition-opacity z-10"
        style={{ color: "var(--text-subtle)" }}
        onClick={e => e.stopPropagation()}
      >
        <svg width="8" height="12" viewBox="0 0 8 12" fill="currentColor">
          <circle cx="2" cy="2" r="1.4"/><circle cx="6" cy="2" r="1.4"/>
          <circle cx="2" cy="6" r="1.4"/><circle cx="6" cy="6" r="1.4"/>
          <circle cx="2" cy="10" r="1.4"/><circle cx="6" cy="10" r="1.4"/>
        </svg>
      </div>

      <div style={{ paddingLeft: 18, paddingRight: 40, paddingTop: 15, paddingBottom: 13 }}>

        {/* Title — primary hierarchy */}
        <p
          className={`text-[13.5px] font-bold leading-[1.45] mb-2.5 ${isDone ? "line-through" : ""}`}
          style={{
            color: isDone ? "var(--text-muted)" : "var(--text-foreground)",
            letterSpacing: "-0.015em",
          }}
        >
          {task.title}
        </p>

        {/* Tags — quiet, subordinate */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2.5">
            {tags.slice(0, 3).map(tag => (
              <span
                key={tag}
                className="text-[9.5px] font-medium px-1.5 py-[3px] rounded-[5px]"
                style={{ background: "var(--bg-elevated)", color: "var(--text-subtle)" }}
              >
                {tag}
              </span>
            ))}
            {tags.length > 3 && (
              <span
                className="text-[9.5px] font-medium px-1.5 py-[3px] rounded-[5px]"
                style={{ background: "var(--bg-elevated)", color: "var(--text-subtle)" }}
              >
                +{tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Subtask progress — only when present */}
        {subtaskTotal > 0 && (
          <div className="mb-2.5">
            <div className="h-[2px] rounded-full overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${subtaskPct}%`,
                  background: subtaskPct === 100 ? "#22C55E" : railColor,
                  transition: "width 0.7s ease",
                }}
              />
            </div>
            <span className="text-[9px] font-medium mt-1 block" style={{ color: "var(--text-subtle)" }}>
              <CheckSquare className="inline w-2.5 h-2.5 mr-0.5 relative -top-px" />
              {subtaskDone}/{subtaskTotal}
            </span>
          </div>
        )}

        {/* Hairline separator */}
        <div style={{ height: "0.5px", background: "var(--border-subtle)", margin: "10px 0 10px -2px" }} />

        {/* Footer — secondary hierarchy */}
        <div className="flex items-center gap-1.5">
          {/* Assignee */}
          {task.assignee
            ? <Avatar name={task.assignee.name} image={task.assignee.image} size="xs" />
            : (
              <div
                className="w-[18px] h-[18px] rounded-full border-dashed shrink-0"
                style={{ border: "1px dashed var(--border-strong)" }}
              />
            )
          }

          {/* Priority */}
          <div className="flex items-center gap-[5px] ml-0.5">
            <span className="inline-block w-[4px] h-[4px] rounded-full shrink-0" style={{ background: railColor }} />
            <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
              {pri.label}
            </span>
          </div>

          <div className="flex-1" />

          {/* Comments */}
          {commentCount > 0 && (
            <span className="flex items-center gap-[3px] text-[10px]" style={{ color: "var(--text-subtle)" }}>
              <MessageSquare className="w-[11px] h-[11px]" />
              <span className="font-medium">{commentCount}</span>
            </span>
          )}

          {/* Due date */}
          {task.dueDate && (
            <span
              className="flex items-center gap-[3px] text-[10px] font-semibold shrink-0"
              style={{ color: isOverdue ? "#EF4444" : "var(--text-muted)" }}
            >
              <Calendar className="w-[11px] h-[11px]" />
              {isOverdue && daysLate > 0
                ? `${daysLate}d late`
                : format(new Date(task.dueDate), "MMM d")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
