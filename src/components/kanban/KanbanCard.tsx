"use client";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Calendar, MessageSquare, AlertCircle, CheckSquare, Sparkles, Link2 } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import type { Task } from "@/types";
import { format, isPast, differenceInDays } from "date-fns";
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

  const isOverdue   = !!(task.dueDate && isPast(new Date(task.dueDate)) && task.status !== "DONE" && task.status !== "ARCHIVED");
  const isDone      = task.status === "DONE" || task.status === "ARCHIVED";
  const pri         = PRIORITY[task.priority] ?? PRIORITY.MEDIUM;
  const railColor   = isOverdue ? "#F43F5E" : isDone ? "#22C55E" : pri.color;
  const isCritical  = task.priority === "URGENT" && isOverdue;
  const isHighRisk  = (task.priority === "URGENT" || task.priority === "HIGH") && isOverdue;
  const searchMatch = !searchQuery || task.title.toLowerCase().includes(searchQuery.toLowerCase());
  const tint        = columnColor ?? "var(--accent)";

  // Days overdue
  const daysOverdue = task.dueDate && isOverdue
    ? differenceInDays(new Date(), new Date(task.dueDate))
    : 0;

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

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      onClick={() => onClick(task)}
      onMouseEnter={() => !overlay && !isDragging && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onContextMenu={e => { e.preventDefault(); onContextMenu?.(e, task); }}
      className={`group relative rounded-[14px] cursor-pointer select-none overflow-hidden flex ${isDragging ? "opacity-20" : ""}`}
      style={{
        ...style,
        opacity: dimmed ? 0.22 : 1,
        background: "var(--bg-card)",
        border: `1.5px solid ${
          searchQuery && searchMatch && !dimmed ? "#FBBF2480"
          : isCritical  ? "rgba(244,63,94,0.5)"
          : isHighRisk  ? "rgba(244,63,94,0.3)"
          : isOverdue   ? "rgba(244,63,94,0.25)"
          : isDone      ? "rgba(34,197,94,0.2)"
          : hovered     ? `${tint}45`
          : "var(--border)"
        }`,
        boxShadow: overlay
          ? "0 32px 80px rgba(0,0,0,0.85), 0 8px 24px rgba(0,0,0,0.6)"
          : isCritical
          ? "0 0 0 1px rgba(244,63,94,0.2), 0 4px 16px rgba(244,63,94,0.12)"
          : hovered && !isDragging
          ? `0 8px 24px rgba(0,0,0,0.16), 0 0 0 1px ${tint}25`
          : "0 1px 3px rgba(0,0,0,0.07)",
        transform: overlay
          ? `${CSS.Transform.toString(transform) ?? ""} scale(1.03) rotate(1.5deg)`
          : hovered && !isDragging
          ? `${CSS.Transform.toString(transform) ?? ""} translateY(-2px)`
          : CSS.Transform.toString(transform) ?? undefined,
        transition: isDragging ? transition ?? undefined : "all 0.15s ease",
      }}
    >
      {/* Priority left rail */}
      <div className="w-[4px] shrink-0 self-stretch"
        style={{
          background: task.priority === "LOW" && !isDone && !isOverdue
            ? "var(--border)"
            : isDone ? "#22C55E"
            : isOverdue ? "#F43F5E"
            : `linear-gradient(180deg, ${railColor} 0%, ${railColor}55 100%)`,
          borderRadius: "14px 0 0 14px",
        }} />

      {/* Card body */}
      <div className="flex-1 px-3.5 py-3 min-w-0">

        {/* URGENT flash */}
        {task.priority === "URGENT" && !isDone && (
          <div className="absolute top-0 left-[4px] right-0 h-[2px]"
            style={{ background: "linear-gradient(90deg, #F43F5E, #FB923C 60%, transparent)" }} />
        )}

        {/* Risk badge (overdue + high priority) */}
        {isHighRisk && !isDone && (
          <div className="flex items-center gap-1 mb-2">
            <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded"
              style={{ background: "rgba(244,63,94,0.1)", color: "#F43F5E", border: "1px solid rgba(244,63,94,0.2)" }}>
              ⚠ {daysOverdue > 0 ? `${daysOverdue}d overdue` : "overdue"}
            </span>
          </div>
        )}

        {/* Title + drag handle */}
        <div className="flex items-start gap-2 mb-2">
          <p className={`flex-1 text-[13px] font-semibold leading-[1.4] ${isDone ? "line-through opacity-55" : ""}`}
            style={{ color: "var(--text-foreground)" }}>
            {task.title}
          </p>
          <div
            {...attributes}
            {...listeners}
            className="shrink-0 cursor-grab active:cursor-grabbing w-5 h-5 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-35 hover:!opacity-70 transition-opacity mt-0.5"
            style={{ color: "var(--text-subtle)" }}
            onClick={e => e.stopPropagation()}>
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
            {tags.slice(0, 3).map(tag => (
              <span key={tag} className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{ background: `${tint}14`, color: tint, border: `1px solid ${tint}28` }}>
                {tag}
              </span>
            ))}
            {tags.length > 3 && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{ background: "var(--bg-elevated)", color: "var(--text-subtle)" }}>
                +{tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Subtask progress bar */}
        {subtaskTotal > 0 && (
          <div className="mb-2.5">
            <div className="flex items-center justify-between mb-1">
              <span className="flex items-center gap-1 text-[10px] font-semibold"
                style={{ color: subtaskPct === 100 ? "var(--success)" : "var(--text-subtle)" }}>
                <CheckSquare className="w-3 h-3" />{subtaskDone}/{subtaskTotal}
              </span>
              <span className="text-[10px] font-bold tabular-nums"
                style={{ color: subtaskPct === 100 ? "var(--success)" : "var(--text-subtle)" }}>{subtaskPct}%</span>
            </div>
            <div className="h-[3px] rounded-full overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${subtaskPct}%`, background: subtaskPct === 100 ? "var(--success)" : `linear-gradient(90deg, ${tint}, #A78BFA)` }} />
            </div>
          </div>
        )}

        {/* Footer row */}
        <div className="flex items-center gap-2 mt-1">
          {task.assignee
            ? <Avatar name={task.assignee.name} image={task.assignee.image} size="xs" />
            : <div className="w-5 h-5 rounded-full border border-dashed shrink-0" style={{ borderColor: "var(--border-strong)" }} />
          }

          <span className="flex items-center gap-1 text-[10px] font-bold" style={{ color: railColor }}>
            <span className="w-[4px] h-[4px] rounded-full shrink-0" style={{ background: railColor }} />
            {pri.label}
          </span>

          <div className="flex items-center gap-2 ml-auto">
            {task.dueDate && (
              <span className="flex items-center gap-0.5 text-[10.5px] font-semibold shrink-0"
                style={{ color: isOverdue ? "var(--danger)" : "var(--text-muted)" }}>
                {isOverdue ? <AlertCircle className="w-3 h-3" /> : <Calendar className="w-3 h-3" />}
                {format(new Date(task.dueDate), "MMM d")}
              </span>
            )}
            {commentCount > 0 && (
              <span className="flex items-center gap-0.5 text-[10.5px] font-medium" style={{ color: "var(--text-subtle)" }}>
                <MessageSquare className="w-3 h-3" />{commentCount}
              </span>
            )}
          </div>
        </div>

        {/* Hover AI action — appears on card hover */}
        {hovered && !isDragging && !overlay && (
          <div
            className="absolute bottom-2.5 right-2.5 flex items-center gap-1"
            onClick={e => e.stopPropagation()}>
            <button
              onClick={() => window.open(`/ai/assistant?task=${encodeURIComponent(task.title)}`, "_self")}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold text-white transition-all hover:scale-105"
              style={{
                background: "linear-gradient(135deg, rgba(157,107,255,0.9), rgba(236,72,153,0.9))",
                backdropFilter: "blur(8px)",
                boxShadow: "0 2px 8px rgba(157,107,255,0.3)",
              }}>
              <Sparkles className="w-2.5 h-2.5" />
              Ask Colliq
            </button>
          </div>
        )}

        {/* Dependency indicator */}
        {task.parentId && (
          <div className="absolute top-2.5 right-2.5">
            <span className="text-[9px] p-0.5 rounded" style={{ color: "var(--text-subtle)" }}>
              <Link2 className="w-2.5 h-2.5" />
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
