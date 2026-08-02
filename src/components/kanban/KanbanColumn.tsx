"use client";
import { useState, useRef } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus, MoreHorizontal, X, CornerDownLeft, Check, Pencil, ChevronsLeftRight, Hash } from "lucide-react";
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

// Subtle group-based column background tints
const GROUP_BG: Record<string, string> = {
  progress: "rgba(99,102,241,0.025)",
  done:     "rgba(34,197,94,0.02)",
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
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onSetWipLimit?: (limit: number | null) => void;
}

export function KanbanColumn({
  status, label, color, group, tasks, onTaskClick, onAddTask,
  onQuickCreate, onRename, onCardContextMenu, searchQuery,
  wipLimit, collapsed, onToggleCollapse, onSetWipLimit,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  const [quickTitle,   setQuickTitle]   = useState("");
  const [showQuick,    setShowQuick]    = useState(false);
  const [savingQuick,  setSavingQuick]  = useState(false);
  const [editing,      setEditing]      = useState(false);
  const [editValue,    setEditValue]    = useState(label ?? (status as string).replace(/_/g, " "));
  const [showMenu,     setShowMenu]     = useState(false);
  const [editingWip,   setEditingWip]   = useState(false);
  const [wipDraft,     setWipDraft]     = useState(String(wipLimit ?? ""));
  const quickRef  = useRef<HTMLInputElement>(null);
  const editRef   = useRef<HTMLInputElement>(null);
  const wipRef    = useRef<HTMLInputElement>(null);

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

  const startWipEdit = () => {
    setShowMenu(false);
    setWipDraft(String(wipLimit ?? ""));
    setEditingWip(true);
    setTimeout(() => wipRef.current?.focus(), 40);
  };

  const confirmWip = () => {
    setEditingWip(false);
    if (!onSetWipLimit) return;
    const n = parseInt(wipDraft, 10);
    onSetWipLimit(isNaN(n) || n <= 0 ? null : n);
  };

  const accent       = color ?? DEFAULT_COLORS[status] ?? "#818CF8";
  const displayLabel = label ?? (status as string).replace(/_/g, " ");
  const taskIds      = tasks.map((t) => t.id);
  const isArchived   = status === "ARCHIVED";
  const isDoneGroup  = group === "done" || status === "DONE" || isArchived || status === "REVIEW";

  const wipPct   = wipLimit ? Math.min(100, (tasks.length / wipLimit) * 100) : 0;
  const overLimit = wipLimit ? tasks.length > wipLimit : false;
  const nearLimit = wipLimit ? tasks.length / wipLimit >= 0.75 : false;
  const wipBarColor = overLimit ? "#EF4444" : nearLimit ? "#F59E0B" : accent;

  const groupBg = GROUP_BG[group ?? "progress"] ?? GROUP_BG.progress;

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

  /* ── Collapsed view ─────────────────────────────────────────────────── */
  if (collapsed) {
    return (
      <div
        className="flex flex-col items-center shrink-0 rounded-2xl cursor-pointer select-none transition-all"
        style={{
          width: 40, minHeight: 120,
          background: `${accent}12`,
          border: `1.5px solid ${accent}25`,
        }}
        onClick={onToggleCollapse}
        title={`Expand ${displayLabel} (${tasks.length} tasks)`}
      >
        <div style={{
          width: 6, borderRadius: "0 0 3px 3px",
          background: accent, marginBottom: 8,
          height: 24, flexShrink: 0,
          boxShadow: `0 2px 8px ${accent}50`,
        }} />
        <span style={{
          writingMode: "vertical-rl",
          transform: "rotate(180deg)",
          fontSize: 10, fontWeight: 800,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: accent,
          flex: 1,
        }}>
          {displayLabel}
        </span>
        <span style={{
          fontSize: 11, fontWeight: 900, color: overLimit ? "#EF4444" : accent,
          marginTop: 6, marginBottom: 10,
        }}>
          {tasks.length}
        </span>
      </div>
    );
  }

  /* ── Full column ─────────────────────────────────────────────────────── */
  return (
    <div
      className="flex flex-col shrink-0 rounded-2xl overflow-visible"
      style={{
        width: 300,
        background: isOver ? `${accent}08` : groupBg,
        border: isOver ? `1.5px solid ${accent}35` : `1.5px solid ${accent}14`,
        transition: "border-color 0.15s, background 0.15s",
      }}
    >
      {/* ── Column header ──────────────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-3">
        {/* Top row: label + count + actions */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 min-w-0">
            {editing ? (
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
                  style={{ background: `${accent}18`, border: `1.5px solid ${accent}60`, color: "var(--text-foreground)" }}
                />
                <button onClick={confirmEdit} className="p-1 rounded" style={{ color: "#22C55E" }}>
                  <Check className="w-3 h-3" />
                </button>
                <button onClick={() => { setEditing(false); setEditValue(displayLabel); }} className="p-1 rounded" style={{ color: "var(--text-subtle)" }}>
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <>
                {/* Colored accent strip + label */}
                <div className="flex items-center gap-2">
                  <span style={{
                    width: 4, height: 18, borderRadius: 2, background: accent,
                    boxShadow: `0 2px 8px ${accent}50`, flexShrink: 0,
                  }} />
                  <span className="text-[13px] font-black leading-none" style={{ color: "var(--text-foreground)", letterSpacing: "-0.01em" }}>
                    {displayLabel}
                  </span>
                </div>

                {/* Count badge */}
                <span className="flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-black shrink-0"
                  style={{
                    background: overLimit ? "rgba(239,68,68,0.12)" : `${accent}18`,
                    color: overLimit ? "#EF4444" : accent,
                  }}>
                  {tasks.length}
                </span>
              </>
            )}
          </div>

          {/* Action buttons */}
          {!editing && (
            <div className="flex items-center gap-0.5 shrink-0">
              {/* Collapse */}
              {onToggleCollapse && (
                <button
                  onClick={onToggleCollapse}
                  title="Collapse column"
                  className="w-6 h-6 rounded-md flex items-center justify-center transition-colors"
                  style={{ color: "var(--text-subtle)" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)"; (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--text-subtle)"; }}
                >
                  <ChevronsLeftRight className="w-3 h-3" />
                </button>
              )}

              {/* Add card */}
              {!isDoneGroup && (
                <button
                  onClick={onQuickCreate ? openQuick : () => onAddTask(status)}
                  title="Add card"
                  className="w-6 h-6 rounded-md flex items-center justify-center transition-colors"
                  style={{ color: "var(--text-subtle)" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)"; (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--text-subtle)"; }}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Three-dot menu */}
              <div className="relative">
                <button
                  className="w-6 h-6 rounded-md flex items-center justify-center transition-colors"
                  style={{ color: "var(--text-subtle)" }}
                  onClick={() => setShowMenu((v) => !v)}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)"; (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--text-subtle)"; }}
                >
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </button>

                {showMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                    <div className="absolute right-0 top-7 z-20 rounded-[12px] py-1 min-w-[160px]"
                      style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "0 8px 24px rgba(0,0,0,0.14)" }}>
                      {onRename && (
                        <button onClick={startEdit}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] font-semibold text-left transition-colors"
                          style={{ color: "var(--text-foreground)" }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                        >
                          <Pencil className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
                          Rename status
                        </button>
                      )}
                      {onSetWipLimit && (
                        <button onClick={startWipEdit}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] font-semibold text-left transition-colors"
                          style={{ color: "var(--text-foreground)" }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                        >
                          <Hash className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
                          {wipLimit ? "Edit WIP limit" : "Set WIP limit"}
                        </button>
                      )}
                      {onSetWipLimit && wipLimit && (
                        <button onClick={() => { setShowMenu(false); onSetWipLimit(null); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] font-semibold text-left transition-colors"
                          style={{ color: "var(--danger)" }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                        >
                          <X className="w-3.5 h-3.5" />
                          Remove WIP limit
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* WIP limit inline edit */}
        {editingWip && (
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[9.5px] font-black uppercase tracking-wider" style={{ color: "var(--text-subtle)" }}>WIP limit</span>
            <input
              ref={wipRef}
              type="number"
              min={1}
              value={wipDraft}
              onChange={(e) => setWipDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") confirmWip(); if (e.key === "Escape") setEditingWip(false); }}
              onBlur={confirmWip}
              className="w-16 rounded-md px-2 py-0.5 text-[12px] font-bold outline-none text-center"
              style={{ background: `${accent}18`, border: `1.5px solid ${accent}60`, color: "var(--text-foreground)" }}
            />
            <button onClick={confirmWip} style={{ color: "#22C55E" }}><Check className="w-3 h-3" /></button>
            <button onClick={() => setEditingWip(false)} style={{ color: "var(--text-subtle)" }}><X className="w-3 h-3" /></button>
          </div>
        )}

        {/* WIP capacity bar */}
        {wipLimit && !editingWip && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[8.5px] font-black uppercase tracking-[0.1em]" style={{ color: "var(--text-subtle)" }}>
                WIP CAPACITY
              </span>
              <span className="text-[9px] font-black tabular-nums" style={{ color: overLimit ? "#EF4444" : "var(--text-muted)" }}>
                {tasks.length}/{wipLimit}
              </span>
            </div>
            <div className="h-[3px] rounded-full overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
              <div style={{
                height: "100%",
                borderRadius: 100,
                width: `${wipPct}%`,
                background: wipBarColor,
                boxShadow: overLimit ? `0 0 6px ${wipBarColor}60` : "none",
                transition: "width 0.35s ease, background 0.2s ease",
              }} />
            </div>
            {overLimit && (
              <p className="text-[8.5px] font-bold mt-1" style={{ color: "#EF4444" }}>
                Over limit — move or complete tasks
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Column body ────────────────────────────────────────────────── */}
      <div
        ref={setNodeRef}
        className="flex-1 flex flex-col gap-3 px-3 pb-3 min-h-[80px]"
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

        {/* Empty state */}
        {tasks.length === 0 && !showQuick && (
          <div className="flex flex-col items-center justify-center py-6 rounded-xl"
            style={{ border: `1.5px dashed ${accent}25` }}>
            <p className="text-[11px] font-semibold" style={{ color: "var(--text-subtle)" }}>
              No tasks
            </p>
            {!isDoneGroup && (
              <button onClick={onQuickCreate ? openQuick : () => onAddTask(status)}
                className="mt-1.5 text-[10px] font-bold transition-colors"
                style={{ color: accent }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0.7"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
              >
                + Create Task
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Add card area ─────────────────────────────────────────────── */}
      {!isDoneGroup && (
        <div className="px-3 pb-3">
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
                placeholder="Task title… Enter to add"
                className="w-full bg-transparent outline-none text-[12.5px] font-medium mb-2"
                style={{ color: "var(--text-foreground)" }}
                disabled={savingQuick}
              />
              <div className="flex items-center justify-between gap-1">
                <p className="text-[9px]" style={{ color: "var(--text-subtle)" }}>
                  <kbd className="font-mono">Enter</kbd> add · <kbd className="font-mono">Esc</kbd> cancel
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => { setShowQuick(false); setQuickTitle(""); }} className="p-1 rounded-lg" style={{ color: "var(--text-subtle)" }}>
                    <X className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => submitQuick(false)}
                    disabled={!quickTitle.trim() || savingQuick}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold text-white disabled:opacity-40"
                    style={{ background: accent }}
                  >
                    <CornerDownLeft className="w-2.5 h-2.5" />
                    {savingQuick ? "…" : "Add"}
                  </button>
                  <button onClick={() => onAddTask(status)}
                    className="px-2 py-0.5 rounded-lg text-[10px] font-bold"
                    style={{ background: `${accent}18`, color: accent }}>
                    Full form
                  </button>
                </div>
              </div>
            </div>
          ) : (
            tasks.length > 0 && (
              <button
                onClick={onQuickCreate ? openQuick : () => onAddTask(status)}
                className="w-full flex items-center justify-center gap-2 h-9 rounded-xl text-[11.5px] font-bold transition-all"
                style={{ border: `1.5px dashed ${accent}30`, color: "var(--text-subtle)", background: "transparent" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = `${accent}08`; (e.currentTarget as HTMLElement).style.color = accent; (e.currentTarget as HTMLElement).style.borderColor = `${accent}55`; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--text-subtle)"; (e.currentTarget as HTMLElement).style.borderColor = `${accent}30`; }}
              >
                <Plus className="w-3 h-3" />
                Add card
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
