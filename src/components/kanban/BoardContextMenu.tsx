"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronRight, ExternalLink, User, Trash2 } from "lucide-react";
import type { Task, BoardColumnConfig } from "@/types";

interface Props {
  x: number;
  y: number;
  task: Task;
  columns: BoardColumnConfig[];
  onClose: () => void;
  onStatusChange: (taskId: string, status: string) => void;
  onPriorityChange: (taskId: string, priority: string) => void;
  onAssignToMe: (taskId: string) => void;
  onOpen: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

const PRIORITIES = [
  { value: "URGENT", label: "Urgent", color: "#F43F5E" },
  { value: "HIGH",   label: "High",   color: "#FBBF24" },
  { value: "MEDIUM", label: "Medium", color: "#60A5FA" },
  { value: "LOW",    label: "Low",    color: "#6B7280" },
];

export function BoardContextMenu({ x, y, task, columns, onClose, onStatusChange, onPriorityChange, onAssignToMe, onOpen, onDelete }: Props) {
  const ref  = useRef<HTMLDivElement>(null);
  const [sub, setSub] = useState<"status" | "priority" | null>(null);

  useEffect(() => {
    const click = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    const key   = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", click);
    document.addEventListener("keydown",   key);
    return () => { document.removeEventListener("mousedown", click); document.removeEventListener("keydown", key); };
  }, [onClose]);

  const vw = typeof window !== "undefined" ? window.innerWidth  : 1200;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const W  = 210;
  const ax = x + W > vw ? x - W : x;
  const ay = y + 340 > vh ? y - 340 : y;

  const menuBtn = (
    label: string,
    icon: React.ReactNode,
    onClick: () => void,
    danger?: boolean,
  ) => (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-3 py-[7px] text-xs font-medium rounded-xl transition-colors text-left"
      style={{ color: danger ? "var(--danger)" : "var(--text-foreground)" }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = danger ? "rgba(220,38,38,0.08)" : "var(--bg-elevated)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
    >
      {icon}
      {label}
    </button>
  );

  const activeColColor = columns.find((c) => c.id === task.status)?.color ?? "#6B7280";
  const activePriColor = PRIORITIES.find((p) => p.value === task.priority)?.color ?? "#60A5FA";

  return (
    <div
      ref={ref}
      className="fixed z-[9999] rounded-2xl p-1.5 select-none"
      style={{
        top: ay, left: ax, width: W,
        background: "var(--bg-sidebar)",
        border: "1px solid var(--border)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.45), 0 4px 16px rgba(0,0,0,0.2)",
      }}
    >
      {/* ── Status ───────────────────────────────────────────── */}
      <button
        className="w-full flex items-center gap-2.5 px-3 py-[7px] text-xs font-medium rounded-xl transition-colors text-left"
        style={{ color: "var(--text-foreground)", background: sub === "status" ? "var(--bg-elevated)" : "transparent" }}
        onClick={() => setSub((s) => s === "status" ? null : "status")}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)"; }}
        onMouseLeave={(e) => { if (sub !== "status") (e.currentTarget as HTMLElement).style.background = "transparent"; }}
      >
        <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ background: activeColColor }} />
        Change Status
        <ChevronRight className="w-3 h-3 ml-auto shrink-0 transition-transform duration-150" style={{ transform: sub === "status" ? "rotate(90deg)" : "", color: "var(--text-subtle)" }} />
      </button>

      {sub === "status" && (
        <div className="mt-0.5 ml-2 pl-2 border-l space-y-0.5" style={{ borderColor: "var(--border-subtle)" }}>
          {columns.map((col) => (
            <button
              key={col.id}
              onClick={() => { onStatusChange(task.id, col.id); onClose(); }}
              className="w-full flex items-center gap-2 px-2.5 py-[6px] rounded-lg text-[11px] font-medium transition-colors"
              style={{ color: col.id === task.status ? col.color : "var(--text-muted)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = `${col.color}18`; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: col.color }} />
              {col.label}
              {col.id === task.status && <span className="ml-auto text-[9px] font-black opacity-50">NOW</span>}
            </button>
          ))}
        </div>
      )}

      {/* ── Priority ─────────────────────────────────────────── */}
      <button
        className="w-full flex items-center gap-2.5 px-3 py-[7px] text-xs font-medium rounded-xl transition-colors text-left"
        style={{ color: "var(--text-foreground)", background: sub === "priority" ? "var(--bg-elevated)" : "transparent" }}
        onClick={() => setSub((s) => s === "priority" ? null : "priority")}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)"; }}
        onMouseLeave={(e) => { if (sub !== "priority") (e.currentTarget as HTMLElement).style.background = "transparent"; }}
      >
        <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ background: activePriColor }} />
        Change Priority
        <ChevronRight className="w-3 h-3 ml-auto shrink-0 transition-transform duration-150" style={{ transform: sub === "priority" ? "rotate(90deg)" : "", color: "var(--text-subtle)" }} />
      </button>

      {sub === "priority" && (
        <div className="mt-0.5 ml-2 pl-2 border-l space-y-0.5" style={{ borderColor: "var(--border-subtle)" }}>
          {PRIORITIES.map((p) => (
            <button
              key={p.value}
              onClick={() => { onPriorityChange(task.id, p.value); onClose(); }}
              className="w-full flex items-center gap-2 px-2.5 py-[6px] rounded-lg text-[11px] font-medium transition-colors"
              style={{ color: p.value === task.priority ? p.color : "var(--text-muted)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = `${p.color}18`; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
              {p.label}
              {p.value === task.priority && <span className="ml-auto text-[9px] font-black opacity-50">NOW</span>}
            </button>
          ))}
        </div>
      )}

      <div className="my-1.5 h-px mx-2" style={{ background: "var(--border-subtle)" }} />

      {menuBtn("Assign to Me",   <User className="w-3.5 h-3.5 shrink-0" />,         () => { onAssignToMe(task.id); onClose(); })}
      {menuBtn("Open Details",   <ExternalLink className="w-3.5 h-3.5 shrink-0" />, () => { onOpen(task);           onClose(); })}

      <div className="my-1.5 h-px mx-2" style={{ background: "var(--border-subtle)" }} />

      {menuBtn("Delete Task", <Trash2 className="w-3.5 h-3.5 shrink-0" />, () => { if (confirm(`Delete "${task.title}"?`)) { onDelete(task.id); onClose(); } }, true)}
    </div>
  );
}
