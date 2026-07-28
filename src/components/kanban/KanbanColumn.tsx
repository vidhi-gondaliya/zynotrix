"use client";
import { useState, useRef } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus, ChevronDown, Archive, CheckCircle2, Clock, Pencil, Check, X, CornerDownLeft } from "lucide-react";
import { KanbanCard } from "./KanbanCard";
import type { Task, TaskStatus } from "@/types";

const DEFAULT_COLORS: Record<string, string> = {
  BACKLOG:     "#6B7280",
  TODO:        "#60A5FA",
  IN_PROGRESS: "#818CF8",
  REVIEW:      "#FBBF24",
  DONE:        "#22C55E",
  ARCHIVED:    "#64748B",
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

export function KanbanColumn({ status, label, color, group, tasks, onTaskClick, onAddTask, onQuickCreate, onRename, onCardContextMenu, searchQuery, wipLimit }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const [collapsed,    setCollapsed]    = useState(false);
  const [editing,      setEditing]      = useState(false);
  const [editValue,    setEditValue]    = useState(label ?? status.replace(/_/g, " "));
  const [quickTitle,   setQuickTitle]   = useState("");
  const [showQuick,    setShowQuick]    = useState(false);
  const [savingQuick,  setSavingQuick]  = useState(false);
  const inputRef  = useRef<HTMLInputElement>(null);
  const quickRef  = useRef<HTMLInputElement>(null);

  const accent       = color ?? DEFAULT_COLORS[status] ?? "#6B7280";
  const displayLabel = label ?? status.replace(/_/g, " ");
  const taskIds      = tasks.map((t) => t.id);

  const isCompleted = status === "DONE";
  const isArchived  = status === "ARCHIVED";
  const isReview    = status === "REVIEW";
  const isDoneGroup = group === "done" || isCompleted || isArchived || isReview;

  const StatusIcon = isArchived ? Archive : isCompleted ? CheckCircle2 : isReview ? Clock : null;

  const startEdit = () => {
    setEditValue(displayLabel);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 40);
  };

  const confirmEdit = () => {
    setEditing(false);
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== displayLabel && onRename) onRename(status as string, trimmed);
  };

  const openQuick = () => {
    setShowQuick(true);
    setQuickTitle("");
    setTimeout(() => quickRef.current?.focus(), 40);
  };

  const submitQuick = async (andMore = false) => {
    const t = quickTitle.trim();
    if (!t) { if (!andMore) { setShowQuick(false); } return; }
    setSavingQuick(true);
    if (onQuickCreate) {
      await onQuickCreate(status as string, t);
    }
    setSavingQuick(false);
    if (andMore) {
      setQuickTitle("");
      setTimeout(() => quickRef.current?.focus(), 40);
    } else {
      setShowQuick(false);
      setQuickTitle("");
    }
  };

  return (
    <div className={`flex flex-col shrink-0 transition-all duration-200 ${collapsed ? "w-[52px]" : "w-[300px]"}`}>

      {/* ── Column header ──────────────────────────────────────────── */}
      <div
        className="relative rounded-[16px] overflow-hidden mb-2.5 select-none"
        style={{
          background: isArchived
            ? "rgba(100,116,139,0.09)"
            : `linear-gradient(135deg, ${accent}28 0%, ${accent}10 100%)`,
          border: `1px solid ${isArchived ? "rgba(100,116,139,0.20)" : `${accent}45`}`,
          boxShadow: isArchived
            ? "none"
            : `0 4px 24px ${accent}18, inset 0 1px 0 rgba(255,255,255,0.10)`,
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        {/* Top accent stripe */}
        <div
          className="absolute top-0 left-0 right-0"
          style={{
            height: 2.5,
            background: isArchived
              ? "linear-gradient(90deg, transparent, rgba(100,116,139,0.45), transparent)"
              : `linear-gradient(90deg, ${accent}00, ${accent}dd, ${accent}00)`,
          }}
        />

        <div className="flex items-center gap-2 px-3.5 py-3">
          {/* Collapse */}
          <button
            onClick={(e) => { e.stopPropagation(); setCollapsed((c) => !c); }}
            className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
            style={{ color: accent, opacity: 0.7 }}
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${collapsed ? "-rotate-90" : ""}`} />
          </button>

          {/* Icon */}
          {StatusIcon
            ? <StatusIcon className="w-3.5 h-3.5 shrink-0" style={{ color: accent }} />
            : <div className="w-2 h-2 rounded-full shrink-0" style={{ background: accent, boxShadow: `0 0 8px ${accent}` }} />
          }

          {!collapsed && (
            <>
              {/* Label */}
              {editing ? (
                <div className="flex-1 flex items-center gap-1.5 min-w-0">
                  <input
                    ref={inputRef}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") confirmEdit();
                      if (e.key === "Escape") { setEditing(false); setEditValue(displayLabel); }
                    }}
                    onBlur={confirmEdit}
                    className="flex-1 bg-transparent outline-none text-[11px] font-black uppercase tracking-widest"
                    style={{ color: accent }}
                  />
                  <button onClick={confirmEdit} style={{ color: "var(--success)" }}><Check className="w-3 h-3" /></button>
                  <button onClick={() => { setEditing(false); setEditValue(displayLabel); }} style={{ color: "var(--text-subtle)" }}><X className="w-3 h-3" /></button>
                </div>
              ) : (
                <div className="flex-1 flex items-center gap-1 min-w-0 group/label">
                  <span
                    className="text-[11.5px] font-black uppercase tracking-widest truncate"
                    style={{ color: isArchived ? "#94A3B8" : accent, letterSpacing: "0.10em" }}
                  >
                    {displayLabel}
                  </span>
                  {onRename && (
                    <button
                      onClick={startEdit}
                      className="opacity-0 group-hover/label:opacity-60 hover:!opacity-100 p-0.5 rounded"
                      style={{ color: accent }}
                      title="Rename"
                    >
                      <Pencil className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              )}

              {/* Count + add */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span
                  className="text-[11px] font-black min-w-[24px] h-6 px-2 flex items-center justify-center rounded-full"
                  style={{
                    background: wipLimit && tasks.length > wipLimit ? "rgba(244,63,94,0.18)" : `${accent}28`,
                    color: wipLimit && tasks.length > wipLimit ? "#F43F5E" : isArchived ? "#94A3B8" : accent,
                    border: `1px solid ${wipLimit && tasks.length > wipLimit ? "rgba(244,63,94,0.35)" : accent + "40"}`,
                    boxShadow: wipLimit && tasks.length > wipLimit ? "none" : `0 0 8px ${accent}20`,
                  }}
                >
                  {tasks.length}{wipLimit ? `/${wipLimit}` : ""}
                </span>
                {!isDoneGroup && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onAddTask(status); }}
                    className="w-5 h-5 rounded-md flex items-center justify-center transition-all"
                    style={{ color: `${accent}80` }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = `${accent}25`; (e.currentTarget as HTMLElement).style.color = accent; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = `${accent}80`; }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </>
          )}

          {collapsed && <span className="text-[10px] font-black" style={{ color: accent }}>{tasks.length}</span>}
        </div>
      </div>

      {/* ── Column body ────────────────────────────────────────────── */}
      {collapsed ? (
        <div
          className="flex-1 rounded-2xl flex flex-col items-center py-4 cursor-pointer"
          style={{ background: `${accent}08`, border: `1.5px dashed ${accent}25`, minHeight: "120px" }}
          onClick={() => setCollapsed(false)}
        >
          <div className="text-[9px] font-black uppercase mt-2"
            style={{ color: accent, writingMode: "vertical-rl", transform: "rotate(180deg)", letterSpacing: "0.12em" }}>
            {displayLabel}
          </div>
        </div>
      ) : (
        <div
          ref={setNodeRef}
          className="flex-1 min-h-[160px] rounded-2xl p-2 flex flex-col gap-2 transition-all duration-200"
          style={{
            background: isOver
              ? `${accent}20`
              : isArchived
              ? "rgba(100,116,139,0.04)"
              : `${accent}0C`,
            border: isOver
              ? `1.5px solid ${accent}55`
              : "1.5px dashed transparent",
            boxShadow: isOver
              ? `inset 0 0 40px ${accent}12, 0 0 0 1px ${accent}28`
              : "none",
            opacity: isArchived ? 0.78 : 1,
            transition: "all 0.15s ease",
          }}
        >
          <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
            {tasks.map((task) => {
              const searchMatch = !searchQuery || task.title.toLowerCase().includes(searchQuery.toLowerCase());
              return (
                <div key={task.id} style={isArchived ? { filter: "grayscale(0.4)" } : undefined}>
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

          {/* Add task / quick-create */}
          {!isDoneGroup && (
            showQuick ? (
              <div className="rounded-xl p-2 mt-auto" style={{ background: `${accent}08`, border: `1.5px solid ${accent}30` }}>
                <input
                  ref={quickRef}
                  value={quickTitle}
                  onChange={(e) => setQuickTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitQuick(true); }
                    if (e.key === "Escape") { setShowQuick(false); setQuickTitle(""); }
                  }}
                  placeholder="Task title… Enter to add more, Esc to cancel"
                  className="w-full bg-transparent outline-none text-[12px] font-medium"
                  style={{ color: "var(--text-foreground)" }}
                  disabled={savingQuick}
                />
                <div className="flex items-center justify-between mt-1.5 gap-1">
                  <p className="text-[9px]" style={{ color: "var(--text-subtle)" }}>
                    <kbd className="font-mono">Enter</kbd> add more · <kbd className="font-mono">Esc</kbd> cancel
                  </p>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => { setShowQuick(false); setQuickTitle(""); }}
                      className="p-1 rounded-lg transition-colors"
                      style={{ color: "var(--text-subtle)" }}
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => submitQuick(false)}
                      disabled={!quickTitle.trim() || savingQuick}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all disabled:opacity-40"
                      style={{ background: accent, color: "white" }}
                    >
                      <CornerDownLeft className="w-2.5 h-2.5" />
                      {savingQuick ? "…" : "Add"}
                    </button>
                    <button
                      onClick={() => onAddTask(status)}
                      className="px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all"
                      style={{ background: `${accent}18`, color: accent }}
                      title="Open full form"
                    >
                      Full form
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={onQuickCreate ? openQuick : () => onAddTask(status)}
                className="w-full flex items-center justify-center h-11 rounded-xl transition-all duration-200 mt-auto"
                style={{
                  border: `1.5px dashed ${tasks.length === 0 ? `${accent}40` : "var(--border)"}`,
                  background: "transparent",
                  opacity: tasks.length === 0 ? 1 : 0.4,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = `${accent}60`;
                  (e.currentTarget as HTMLElement).style.background = `${accent}08`;
                  (e.currentTarget as HTMLElement).style.opacity = "1";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = tasks.length === 0 ? `${accent}40` : "var(--border)";
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                  (e.currentTarget as HTMLElement).style.opacity = tasks.length === 0 ? "1" : "0.4";
                }}
              >
                <Plus className="w-3.5 h-3.5 mr-1" style={{ color: accent, opacity: 0.7 }} />
                <span className="text-[11px] font-semibold" style={{ color: accent, opacity: 0.7 }}>
                  {tasks.length === 0 ? `Add to ${displayLabel}` : "Add task"}
                </span>
              </button>
            )
          )}

          {isArchived && tasks.length === 0 && (
            <div className="flex flex-col items-center py-8 gap-2 opacity-30">
              <Archive className="w-6 h-6" style={{ color: "#64748B" }} />
              <span className="text-[10px]" style={{ color: "#64748B" }}>Nothing archived</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
