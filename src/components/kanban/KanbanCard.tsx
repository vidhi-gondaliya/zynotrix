"use client";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MessageSquare, Paperclip, MoreHorizontal } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import type { Task } from "@/types";
import { useState, useEffect } from "react";

const PRIORITY: Record<string, { color: string; label: string }> = {
  LOW:    { color: "#94A3B8", label: "Low priority"    },
  MEDIUM: { color: "#60A5FA", label: "Medium priority" },
  HIGH:   { color: "#F59E0B", label: "High priority"   },
  URGENT: { color: "#EF4444", label: "Urgent"          },
};

// Colored dot palette for the bottom-right accent
const DOT_COLORS = ["#22C55E", "#818CF8", "#F59E0B", "#EF4444", "#06B6D4", "#EC4899"];

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

  const dndStyle = { transform: CSS.Transform.toString(transform), transition };

  const isDone = task.status === "DONE" || task.status === "ARCHIVED";
  const pri    = PRIORITY[task.priority] ?? PRIORITY.MEDIUM;

  // Category label: first tag → priority label
  let tags: string[] = [];
  try {
    tags = Array.isArray(task.tags)
      ? task.tags
      : (typeof task.tags === "string" ? JSON.parse(task.tags as string) : []);
  } catch { tags = []; }
  const categoryLabel = tags[0] ?? pri.label;
  const categoryColor = columnColor ?? pri.color;

  // Deterministic dot color from task id
  const dotColor = DOT_COLORS[
    (task.id.charCodeAt(0) + task.id.charCodeAt(task.id.length - 1)) % DOT_COLORS.length
  ];

  const commentCount = task._count?.comments ?? 0;

  // Subtask count (from localStorage)
  const [subtaskTotal, setSubtaskTotal] = useState(0);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`subtasks_${task.id}`);
      if (saved) setSubtaskTotal((JSON.parse(saved) as unknown[]).length);
    } catch {}
  }, [task.id]);

  const [hovered, setHovered] = useState(false);

  const searchMatch = !searchQuery || task.title.toLowerCase().includes(searchQuery.toLowerCase());

  const cardStyle: React.CSSProperties = {
    ...dndStyle,
    opacity: dimmed ? 0.12 : isDragging ? 0 : 1,
    background: "var(--bg-card)",
    border: `1px solid ${
      searchQuery && searchMatch && !dimmed
        ? "rgba(245,158,11,0.55)"
        : hovered && !isDragging
        ? "var(--border)"
        : "var(--border)"
    }`,
    boxShadow: overlay
      ? "0 28px 64px rgba(0,0,0,0.70), 0 6px 20px rgba(0,0,0,0.40)"
      : hovered && !isDragging
      ? "0 8px 24px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)"
      : "0 1px 4px rgba(0,0,0,0.04)",
    transform: overlay
      ? `${CSS.Transform.toString(transform) ?? ""} rotate(1.5deg) scale(1.03)`
      : hovered && !isDragging
      ? `${CSS.Transform.toString(transform) ?? ""} translateY(-2px)`
      : CSS.Transform.toString(transform) ?? undefined,
    transition: isDragging
      ? dndStyle.transition ?? undefined
      : "box-shadow 0.18s ease, transform 0.18s cubic-bezier(0.16,1,0.3,1), border-color 0.18s ease",
    borderRadius: 16,
    cursor: "pointer",
    userSelect: "none",
    position: "relative",
    overflow: "hidden",
  };

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      onClick={() => onClick(task)}
      onMouseEnter={() => !overlay && !isDragging && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onContextMenu={(e) => { e.preventDefault(); onContextMenu?.(e, task); }}
      style={cardStyle}
    >
      {/* Drag handle (hidden, on the whole card via dnd-kit) */}
      <div
        {...attributes}
        {...listeners}
        className="absolute inset-0 z-0"
        onClick={(e) => e.stopPropagation()}
        style={{ cursor: isDragging ? "grabbing" : "grab" }}
      />

      <div className="relative z-10 p-4">
        {/* ── Top row: category label + three-dot ─────────────────── */}
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <span
            className="text-[10.5px] font-bold leading-none"
            style={{ color: categoryColor }}
          >
            {categoryLabel}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onContextMenu?.(e, task); }}
            className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-colors opacity-0"
            style={{
              color: "var(--text-subtle)",
              opacity: hovered ? 1 : 0,
              background: hovered ? "var(--bg-elevated)" : "transparent",
            }}
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* ── Title ───────────────────────────────────────────────── */}
        <p
          className="text-[13.5px] font-bold leading-snug mb-3"
          style={{
            color: isDone ? "var(--text-muted)" : "var(--text-foreground)",
            letterSpacing: "-0.015em",
            textDecoration: isDone ? "line-through" : "none",
          }}
        >
          {task.title}
        </p>

        {/* ── Avatars ─────────────────────────────────────────────── */}
        <div className="flex items-center mb-3">
          {task.assignee ? (
            <Avatar name={task.assignee.name} image={task.assignee.image} size="xs" />
          ) : (
            <div
              className="w-[22px] h-[22px] rounded-full border-dashed shrink-0"
              style={{ border: "1.5px dashed var(--border-strong)" }}
            />
          )}
          {task.creator && task.creator.id !== task.assignee?.id && (
            <div style={{ marginLeft: -6, position: "relative", zIndex: 1 }}>
              <Avatar name={task.creator.name} image={task.creator.image} size="xs" />
            </div>
          )}
        </div>

        {/* ── Footer: comment + file counts + dot accent ──────────── */}
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-[10.5px] font-semibold"
            style={{ color: "var(--text-muted)" }}>
            <MessageSquare className="w-3 h-3" />
            {commentCount} {commentCount === 1 ? "comment" : "comment"}
          </span>
          <span className="flex items-center gap-1 text-[10.5px] font-semibold"
            style={{ color: "var(--text-muted)" }}>
            <Paperclip className="w-3 h-3" />
            {subtaskTotal} {subtaskTotal === 1 ? "file" : "file"}
          </span>

          {/* Colored accent dot — bottom right */}
          <div className="ml-auto w-[10px] h-[10px] rounded-full shrink-0"
            style={{
              background: dotColor,
              boxShadow: `0 0 6px ${dotColor}88`,
            }} />
        </div>
      </div>
    </div>
  );
}
