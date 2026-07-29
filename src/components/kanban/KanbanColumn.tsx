"use client";
import { useState, useRef } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus, MoreHorizontal, X, CornerDownLeft, Check, Pencil } from "lucide-react";
import { KanbanCard } from "./KanbanCard";
import type { Task, TaskStatus } from "@/types";

const DEFAULT_COLORS: Record<string, string> = {
  BACKLOG:     "#60A5FA",
  TODO:        "#818CF8",
  IN_PROGRESS: "#A78BFA",
  REVIEW:      "#FBBF24",
  DONE:        "#22C55E",
  ARCHIVED:    "#94A3B8",
};

interface KanbanColumnProps {
  status: TaskStatus | string;
  label?: string;
  color?: string;
  group?: string;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onAddTask: (status: string) => void;
  onQuickCreate?: (status: string, title: string) => void;
  onRename?: (status: string, newLabel: string) => void;
  onCardContextMenu?: (e: React.MouseEvent, task: Task) => void;
  searchQuery?: string;
  wipLimit?: number;
}

export function KanbanColumn({
  status, label, color, group, tasks, onTaskClick, onAddTask,
  onQuickCreate, onRename, onCardContextMenu, searchQuery, wipLimit,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  const [quickTitle,  setQuickTitle]  = useState("");
  const [showQuick,   setShowQuick]   = useState(false);
  const [savingQuick, setSavingQuick] = useState(false);
  const [editing,     setEditing]     = useState(false);
  const [editValue,   setEditValue]   = useState(label ?? (status as string).replace(/_/g, " "));
  const [showMenu,    setShowMenu]    = useState(false);
  const quickRef  = useRef<HTMLInputElement>(null);
  const editRef   = useRef<HTMLInputElement>(null);

  const startEdit = () => {
    setShowMenu(false);
    setEditValue(displayLabel);
    setEditing(true);
    setTimeout(() => editRef.current?.select(), 40);
  };

  const confirmEdit = () => {
    setEditing(false);
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== displayLabel && onRename) onRename(status as string, trimmed);
  };

  const accent       = color ?? DEFAULT_COLORS[status] ?? "#818CF8";
  const displayLabel = label ?? (status as string).replace(/_/g, " ");
  const taskIds      = tasks.map((t) => t.id);

  const isArchived = status === "ARCHIVED";
  const isDoneGroup = group === "done" || status === "DONE" || isArchived || status === "REVIEW";

  const openQuick = () => {
    setShowQuick(true);
    setQuickTitle("");
    setTimeout(() => quickRef.current?.focus(), 40);
  };

  const submitQuick = async (andMore = false) => {
    const t = quickTitle.trim();
    if (!t) { if (!andMore) setShowQuick(false); return; }
    setSavingQuick(true);
    if (onQuickCreate) await onQuickCreate(status as string, t);
    setSavingQuick(false);
    if (andMore) {
      setQuickTitle("");
      setTimeout(() => quickRef.current?.focus(), 40);
    } else {
      setShowQuick(false);
      setQuickTitle("");
    }
  };

  const overLimit = wipLimit ? tasks.length > wipLimit : false;

  return (
    <div className="flex flex-col shrink-0 w-[300px]">

      {/* ── Column header — pill badge style ──────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 min-w-0">
          {editing ? (
            /* Inline rename input */
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <input
                ref={editRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") confirmEdit();
                  if (e.key === "Escape") { setEditing(false); setEditValue(displayLabel); }
                }}
                onBlur={confirmEdit}
                className="flex-1 min-w-0 rounded-lg px-2 py-1 text-[12px] font-bold outline-none"
                style={{
                  background: `${accent}18`,
                  border: `1.5px solid ${accent}60`,
                  color: "var(--text-foreground)",
                }}
              />
              <button onClick={confirmEdit} className="p-1 rounded" style={{ color: "#22C55E" }}>
                <Check className="w-3 h-3" />
              </button>
              <button
                onClick={() => { setEditing(false); setEditValue(displayLabel); }}
                className="p-1 rounded" style={{ color: "var(--text-subtle)" }}>
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <>
              {/* Colored pill */}
              <span
                className="px-4 py-[7px] rounded-full text-[12px] font-bold text-white leading-none whitespace-nowrap shrink-0"
                style={{
                  background: isArchived ? "#94A3B8" : accent,
                  boxShadow: isArchived ? "none" : `0 4px 12px ${accent}44`,
                }}
              >
                {displayLabel}
              </span>

              {/* Task count */}
              <span
                className="text-[11px] font-bold tabular-nums"
                style={{ color: overLimit ? "#EF4444" : "var(--text-subtle)" }}
              >
                {tasks.length}{wipLimit ? `/${wipLimit}` : ""}
              </span>
            </>
          )}
        </div>

        {/* Three-dot menu with dropdown */}
        {!editing && (
          <div className="relative shrink-0">
            <button
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
              style={{ color: "var(--text-subtle)" }}
              onClick={() => setShowMenu((v) => !v)}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)";
                (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "transparent";
                (e.currentTarget as HTMLElement).style.color = "var(--text-subtle)";
              }}
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {showMenu && (
              <>
                {/* Backdrop to close */}
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div
                  className="absolute right-0 top-8 z-20 rounded-[12px] py-1 min-w-[140px]"
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.14)",
                  }}
                >
                  {onRename && (
                    <button
                      onClick={startEdit}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] font-semibold text-left transition-colors"
                      style={{ color: "var(--text-foreground)" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                    >
                      <Pencil className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
                      Rename status
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Column body ────────────────────────────────────────────── */}
      <div
        ref={setNodeRef}
        className="flex-1 flex flex-col gap-3 rounded-2xl p-2 transition-all duration-150 min-h-[80px]"
        style={{
          background: isOver ? `${accent}10` : "transparent",
          border: isOver ? `1.5px solid ${accent}40` : "1.5px solid transparent",
        }}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => {
            const searchMatch = !searchQuery || task.title.toLowerCase().includes(searchQuery.toLowerCase());
            return (
              <div key={task.id} style={isArchived ? { filter: "grayscale(0.4)", opacity: 0.75 } : undefined}>
                <KanbanCard
                  task={task}
                  onClick={onTaskClick}
                  columnColor={accent}
                  onContextMenu={onCardContextMenu}
                  searchQuery={searchQuery}
                  dimmed={!!searchQuery && !searchMatch}
                />
              </div>
            );
          })}
        </SortableContext>
      </div>

      {/* ── Add card area ─────────────────────────────────────────── */}
      {!isDoneGroup && (
        <div className="mt-3">
          {showQuick ? (
            <div className="rounded-[14px] p-3"
              style={{ background: "var(--bg-card)", border: `1.5px solid ${accent}40` }}>
              <input
                ref={quickRef}
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitQuick(true); }
                  if (e.key === "Escape") { setShowQuick(false); setQuickTitle(""); }
                }}
                placeholder="Task title… Enter to add, Esc to cancel"
                className="w-full bg-transparent outline-none text-[12.5px] font-medium mb-2"
                style={{ color: "var(--text-foreground)" }}
                disabled={savingQuick}
              />
              <div className="flex items-center justify-between gap-1">
                <p className="text-[9px]" style={{ color: "var(--text-subtle)" }}>
                  <kbd className="font-mono">Enter</kbd> add more · <kbd className="font-mono">Esc</kbd> cancel
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => { setShowQuick(false); setQuickTitle(""); }}
                    className="p-1 rounded-lg" style={{ color: "var(--text-subtle)" }}>
                    <X className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => submitQuick(false)}
                    disabled={!quickTitle.trim() || savingQuick}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold text-white disabled:opacity-40"
                    style={{ background: accent }}>
                    <CornerDownLeft className="w-2.5 h-2.5" />
                    {savingQuick ? "…" : "Add"}
                  </button>
                  <button
                    onClick={() => onAddTask(status)}
                    className="px-2 py-0.5 rounded-lg text-[10px] font-bold"
                    style={{ background: `${accent}18`, color: accent }}>
                    Full form
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={onQuickCreate ? openQuick : () => onAddTask(status)}
              className="w-full flex items-center justify-center gap-2 h-10 rounded-xl text-[12px] font-bold transition-all"
              style={{
                border: `1.5px solid ${accent}40`,
                color: accent,
                background: "transparent",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = `${accent}10`;
                (e.currentTarget as HTMLElement).style.borderColor = `${accent}70`;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "transparent";
                (e.currentTarget as HTMLElement).style.borderColor = `${accent}40`;
              }}
            >
              <Plus className="w-3.5 h-3.5" />
              Add card
            </button>
          )}
        </div>
      )}
    </div>
  );
}
