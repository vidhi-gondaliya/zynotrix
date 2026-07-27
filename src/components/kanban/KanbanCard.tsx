"use client";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Calendar, MessageSquare, AlertCircle, CheckSquare, Sparkles, Link2 } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import type { Task } from "@/types";
import { format, isPast, differenceInDays } from "date-fns";
import { useState, useEffect } from "react";

const PRIORITY: Record<string, { color: string; label: string; glow: string; gradient: string }> = {
  LOW:    { color: "#6B7280", label: "Low",    glow: "rgba(107,114,128,0.25)", gradient: "linear-gradient(135deg,#6B7280,#4B5563)" },
  MEDIUM: { color: "#60A5FA", label: "Medium", glow: "rgba(96,165,250,0.30)",  gradient: "linear-gradient(135deg,#60A5FA,#3B82F6)" },
  HIGH:   { color: "#FBBF24", label: "High",   glow: "rgba(251,191,36,0.35)",  gradient: "linear-gradient(135deg,#FBBF24,#F59E0B)" },
  URGENT: { color: "#F43F5E", label: "Urgent", glow: "rgba(244,63,94,0.40)",   gradient: "linear-gradient(135deg,#F43F5E,#BE185D)" },
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
  const railGlow    = isOverdue ? "rgba(244,63,94,0.40)" : isDone ? "rgba(34,197,94,0.35)" : pri.glow;
  const isCritical  = task.priority === "URGENT" && isOverdue;
  const isHighRisk  = (task.priority === "URGENT" || task.priority === "HIGH") && isOverdue;
  const isUrgent    = task.priority === "URGENT";
  const isHigh      = task.priority === "HIGH";
  const searchMatch = !searchQuery || task.title.toLowerCase().includes(searchQuery.toLowerCase());
  const tint        = columnColor ?? "var(--accent)";

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

  // Determine card background
  const cardBg = isCritical
    ? "linear-gradient(160deg, rgba(244,63,94,0.14) 0%, rgba(190,24,93,0.08) 100%)"
    : isUrgent && !isDone
    ? "linear-gradient(160deg, rgba(244,63,94,0.08) 0%, var(--kanban-card-bg) 60%)"
    : isHigh && !isDone
    ? "linear-gradient(160deg, rgba(251,191,36,0.06) 0%, var(--kanban-card-bg) 60%)"
    : isDone
    ? "linear-gradient(160deg, rgba(34,197,94,0.05) 0%, var(--kanban-card-bg) 60%)"
    : "var(--kanban-card-bg)";

  const cardBorder = searchQuery && searchMatch && !dimmed
    ? "rgba(251,191,36,0.60)"
    : isCritical
    ? "rgba(244,63,94,0.55)"
    : isHighRisk
    ? "rgba(244,63,94,0.38)"
    : isOverdue
    ? "rgba(244,63,94,0.28)"
    : isDone
    ? "rgba(34,197,94,0.22)"
    : hovered
    ? `${railColor}45`
    : "var(--border)";

  const cardShadow = overlay
    ? "0 32px 80px rgba(0,0,0,0.88), 0 8px 28px rgba(0,0,0,0.65)"
    : isCritical
    ? `0 0 0 1px rgba(244,63,94,0.22), 0 6px 28px rgba(244,63,94,0.20), inset 0 1px 0 rgba(255,255,255,0.04)`
    : hovered && !isDragging
    ? `0 12px 40px rgba(0,0,0,0.28), 0 0 0 1px ${railColor}35, 0 0 28px ${railGlow}`
    : "0 1px 4px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.035)";

  const cardTransform = overlay
    ? `${CSS.Transform.toString(transform) ?? ""} scale(1.04) rotate(1.5deg)`
    : hovered && !isDragging
    ? `${CSS.Transform.toString(transform) ?? ""} translateY(-4px)`
    : CSS.Transform.toString(transform) ?? undefined;

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      onClick={() => onClick(task)}
      onMouseEnter={() => !overlay && !isDragging && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onContextMenu={e => { e.preventDefault(); onContextMenu?.(e, task); }}
      className={`glass-card group relative rounded-[14px] cursor-pointer select-none overflow-hidden ${isDragging ? "opacity-20" : ""}`}
      style={{
        ...style,
        opacity: dimmed ? 0.18 : 1,
        background: cardBg,
        border: `1px solid ${cardBorder}`,
        boxShadow: cardShadow,
        transform: cardTransform,
        transition: isDragging ? transition ?? undefined : "all 0.20s cubic-bezier(0.16,1,0.3,1)",
      }}
    >
      {/* Top gradient accent line */}
      <div
        className="absolute top-0 left-0 right-0"
        style={{
          height: 2,
          background: isDone
            ? "linear-gradient(90deg, transparent 0%, #22C55E 40%, #10B981 70%, transparent 100%)"
            : isOverdue
            ? "linear-gradient(90deg, transparent 0%, #F43F5E 30%, #FB923C 70%, transparent 100%)"
            : isUrgent
            ? "linear-gradient(90deg, transparent, #F43F5E 20%, #FB923C 55%, transparent)"
            : `linear-gradient(90deg, transparent, ${railColor} 30%, ${railColor}cc 70%, transparent)`,
          opacity: hovered || isCritical ? 1 : 0.75,
          transition: "opacity 0.2s ease",
        }}
      />

      {/* Critical glow overlay */}
      {isCritical && (
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(244,63,94,0.10), transparent 65%)" }} />
      )}

      {/* Card body */}
      <div className="px-3.5 pt-3.5 pb-3 min-w-0">

        {/* Risk / overdue badge */}
        {isHighRisk && !isDone && (
          <div className="flex items-center gap-1.5 mb-2.5">
            <span
              className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{
                background: "rgba(244,63,94,0.10)",
                color: "#F43F5E",
                border: "1px solid rgba(244,63,94,0.30)",
                boxShadow: "0 0 10px rgba(244,63,94,0.18)",
              }}>
              <AlertCircle className="w-2.5 h-2.5" />
              {daysOverdue > 0 ? `${daysOverdue}d overdue` : "overdue"}
            </span>
          </div>
        )}

        {/* Title + drag handle */}
        <div className="flex items-start gap-2 mb-3">
          <p
            className={`flex-1 text-[13px] font-semibold leading-[1.5] ${isDone ? "line-through opacity-45" : ""}`}
            style={{ color: "var(--text-foreground)", letterSpacing: "-0.008em" }}
          >
            {task.title}
          </p>
          <div
            {...attributes}
            {...listeners}
            className="shrink-0 cursor-grab active:cursor-grabbing w-5 h-5 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-25 hover:!opacity-55 transition-opacity mt-0.5"
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
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{
                  background: `${tint}14`,
                  color: tint === "var(--accent)" ? "var(--accent)" : tint,
                  border: `1px solid ${tint}28`,
                }}
              >
                {tag}
              </span>
            ))}
            {tags.length > 3 && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: "var(--bg-elevated)", color: "var(--text-subtle)" }}>
                +{tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Subtask progress */}
        {subtaskTotal > 0 && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="flex items-center gap-1 text-[10px] font-semibold"
                style={{ color: subtaskPct === 100 ? "var(--success)" : "var(--text-subtle)" }}>
                <CheckSquare className="w-3 h-3" />{subtaskDone}/{subtaskTotal}
              </span>
              <span className="text-[10px] font-bold tabular-nums"
                style={{ color: subtaskPct === 100 ? "var(--success)" : "var(--text-subtle)" }}>
                {subtaskPct}%
              </span>
            </div>
            <div className="h-[3px] rounded-full overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${subtaskPct}%`,
                  background: subtaskPct === 100
                    ? "linear-gradient(90deg, #22C55E, #10B981)"
                    : `linear-gradient(90deg, ${railColor}, ${railColor}99)`,
                  boxShadow: subtaskPct > 0 ? `0 0 8px ${railGlow}` : "none",
                }}
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center gap-2">
          {task.assignee
            ? <Avatar name={task.assignee.name} image={task.assignee.image} size="xs" />
            : (
              <div className="w-[18px] h-[18px] rounded-full border border-dashed shrink-0"
                style={{ borderColor: "var(--border-strong)" }} />
            )
          }

          {/* Priority pill */}
          <span
            className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
            style={{
              background: `${railColor}16`,
              color: railColor,
              border: `1px solid ${railColor}30`,
            }}
          >
            <span className="w-[3.5px] h-[3.5px] rounded-full shrink-0" style={{ background: railColor }} />
            {pri.label}
          </span>

          <div className="flex items-center gap-2 ml-auto">
            {task.dueDate && (
              <span
                className="flex items-center gap-0.5 text-[10px] font-semibold shrink-0"
                style={{ color: isOverdue ? "var(--danger)" : "var(--text-muted)" }}
              >
                {isOverdue ? <AlertCircle className="w-3 h-3" /> : <Calendar className="w-3 h-3" />}
                {format(new Date(task.dueDate), "MMM d")}
              </span>
            )}
            {commentCount > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] font-medium" style={{ color: "var(--text-subtle)" }}>
                <MessageSquare className="w-3 h-3" />{commentCount}
              </span>
            )}
          </div>
        </div>

        {/* Hover AI pill */}
        {hovered && !isDragging && !overlay && (
          <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => window.open(`/ai/assistant?task=${encodeURIComponent(task.title)}`, "_self")}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold text-white transition-all hover:scale-105"
              style={{
                background: "linear-gradient(135deg, rgba(99,102,241,0.92), rgba(167,139,250,0.92))",
                backdropFilter: "blur(8px)",
                boxShadow: "0 2px 14px rgba(99,102,241,0.45)",
              }}
            >
              <Sparkles className="w-2.5 h-2.5" />
              Ask AI
            </button>
          </div>
        )}

        {task.parentTaskId && (
          <div className="absolute top-3 right-3">
            <span style={{ color: "var(--text-subtle)" }}>
              <Link2 className="w-2.5 h-2.5" />
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
