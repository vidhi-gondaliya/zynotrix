"use client";
import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Calendar, Loader2, AlertCircle } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay,
  addMonths, subMonths, isWithinInterval, differenceInDays } from "date-fns";

interface Task {
  id: string; title: string; status: string; priority: string;
  startDate: string | null; dueDate: string | null; assignee?: { name: string; image?: string } | null;
}

const PRIORITY_COLOR: Record<string, string> = {
  URGENT: "#FF4466", HIGH: "#FFC107", MEDIUM: "#9D6BFF", LOW: "#6B7280",
};
const STATUS_OPACITY: Record<string, number> = {
  DONE: 0.45, IN_PROGRESS: 1, REVIEW: 0.85, TODO: 0.7, BACKLOG: 0.55,
};

export default function TimelinePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/projects/${projectId}/tasks`)
      .then((r) => r.json())
      .then((d) => {
        setTasks((d.tasks ?? d) as Task[]);
        setLoading(false);
      });
  }, [projectId]);

  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
  const today = new Date();

  const positioned = tasks.filter((t) => t.startDate || t.dueDate);
  const floating   = tasks.filter((t) => !t.startDate && !t.dueDate);

  function barProps(t: Task) {
    const start = t.startDate ? new Date(t.startDate) : new Date(t.dueDate!);
    const end   = t.dueDate   ? new Date(t.dueDate)   : new Date(t.startDate!);
    const monthStart = startOfMonth(month);
    const monthEnd   = endOfMonth(month);
    const clampedStart = start < monthStart ? monthStart : start;
    const clampedEnd   = end   > monthEnd   ? monthEnd   : end;
    const totalDays = days.length;
    const startIdx  = differenceInDays(clampedStart, monthStart);
    const span      = differenceInDays(clampedEnd, clampedStart) + 1;
    const pct = (startIdx / totalDays) * 100;
    const width = (span / totalDays) * 100;
    const inMonth = isWithinInterval(start, { start: monthStart, end: monthEnd }) ||
                    isWithinInterval(end,   { start: monthStart, end: monthEnd }) ||
                    (start <= monthStart && end >= monthEnd);
    return { pct, width, inMonth };
  }

  const todayIdx = differenceInDays(today, startOfMonth(month));
  const showToday = todayIdx >= 0 && todayIdx < days.length;
  const todayPct = (todayIdx / days.length) * 100;

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg-base)" }}>
      {/* Controls */}
      <div className="px-6 py-4 flex items-center justify-between"
        style={{ borderBottom: "1px solid var(--border)" }}>
        <h2 className="text-base font-black text-foreground">Gantt Timeline</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => setMonth((m) => subMonths(m, 1))}
            className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-card-hover transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-bold text-foreground min-w-[120px] text-center">
            {format(month, "MMMM yyyy")}
          </span>
          <button onClick={() => setMonth((m) => addMonths(m, 1))}
            className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-card-hover transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
          <button onClick={() => setMonth(new Date())}
            className="ml-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
            style={{ background: "var(--accent-muted)", color: "var(--accent)" }}>
            Today
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted" />
        </div>
      ) : (
        <div className="flex-1 overflow-auto" ref={containerRef}>
          {/* Day header row */}
          <div className="sticky top-0 z-10 flex" style={{ background: "var(--bg-sidebar)", borderBottom: "1px solid var(--border)" }}>
            <div className="shrink-0 w-56 px-4 py-2 text-[10px] font-bold text-muted uppercase tracking-widest"
              style={{ borderRight: "1px solid var(--border)" }}>
              Task
            </div>
            <div className="flex-1 flex relative">
              {days.map((d) => (
                <div key={d.toISOString()} className="flex-1 text-center py-2"
                  style={{ borderRight: "1px solid var(--border-subtle)" }}>
                  <p className="text-[9px] font-bold text-muted">{format(d, "EEE")}</p>
                  <p className={`text-[10px] font-black mt-0.5 ${isSameDay(d, today) ? "text-accent" : "text-muted"}`}>
                    {format(d, "d")}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Rows */}
          <div className="relative">
            {positioned.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Calendar className="w-10 h-10 text-muted" />
                <p className="text-sm font-semibold text-muted">No tasks with dates this month.</p>
                <p className="text-xs text-subtle">Add start or due dates to tasks to see them on the timeline.</p>
              </div>
            )}

            {positioned.map((task, i) => {
              const { pct, width, inMonth } = barProps(task);
              if (!inMonth) return null;
              const color = PRIORITY_COLOR[task.priority] ?? "#9D6BFF";
              const opacity = STATUS_OPACITY[task.status] ?? 1;

              return (
                <motion.div key={task.id} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="flex items-center"
                  style={{ borderBottom: "1px solid var(--border-subtle)", minHeight: "44px" }}>
                  {/* Label */}
                  <div className="shrink-0 w-56 px-4 py-2 flex items-center gap-2"
                    style={{ borderRight: "1px solid var(--border)" }}>
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                    <span className="text-xs font-semibold text-foreground truncate">{task.title}</span>
                  </div>

                  {/* Bar area */}
                  <div className="flex-1 relative h-full flex items-center" style={{ minHeight: "44px" }}>
                    {/* Today line */}
                    {showToday && (
                      <div className="absolute top-0 bottom-0 w-px z-10 pointer-events-none"
                        style={{ left: `${todayPct}%`, background: "var(--accent)", opacity: 0.5 }} />
                    )}

                    {/* Gantt bar */}
                    <div className="absolute h-6 rounded-full flex items-center px-2 overflow-hidden"
                      style={{
                        left: `${Math.max(0, pct)}%`,
                        width: `${Math.min(100 - Math.max(0, pct), width)}%`,
                        background: color,
                        opacity,
                        boxShadow: `0 2px 8px ${color}40`,
                      }}>
                      <span className="text-[10px] font-bold text-white truncate drop-shadow">{task.title}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Floating tasks (no dates) */}
          {floating.length > 0 && (
            <div className="px-6 py-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-3.5 h-3.5 text-muted" />
                <span className="text-xs font-bold text-muted">Tasks without dates ({floating.length})</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {floating.map((t) => (
                  <span key={t.id} className="text-xs font-semibold px-3 py-1.5 rounded-full"
                    style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                    {t.title}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
