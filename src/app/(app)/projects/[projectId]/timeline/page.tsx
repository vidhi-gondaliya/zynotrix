"use client";
import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Calendar, Loader2, AlertCircle, GanttChartSquare } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay,
  addMonths, subMonths, isWithinInterval, differenceInDays } from "date-fns";

interface Task {
  id: string; title: string; status: string; priority: string;
  startDate: string | null; dueDate: string | null; assignee?: { name: string; image?: string } | null;
}

const PRIORITY_COLOR: Record<string, string> = {
  URGENT: "#F43F5E", HIGH: "#F59E0B", MEDIUM: "#8B5CF6", LOW: "#6B7280",
};
const STATUS_OPACITY: Record<string, number> = {
  DONE: 0.45, IN_PROGRESS: 1, REVIEW: 0.85, TODO: 0.7, BACKLOG: 0.55,
};
const STATUS_COLOR: Record<string, string> = {
  IN_PROGRESS: "#8B5CF6", REVIEW: "#F59E0B", DONE: "#22C55E", TODO: "#6B7280", BACKLOG: "#475569",
};

export default function TimelinePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date());
  const [hoveredTask, setHoveredTask] = useState<string | null>(null);
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
      <div className="px-6 py-3.5 flex items-center justify-between shrink-0"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-sidebar)" }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[10px] flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.18), rgba(99,102,241,0.10))" }}>
            <GanttChartSquare className="w-4 h-4" style={{ color: "#8B5CF6" }} />
          </div>
          <div>
            <h2 className="text-[14px] font-black" style={{
              background: "linear-gradient(135deg, var(--text-foreground) 0%, #8B5CF6 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              letterSpacing: "-0.02em",
            }}>Gantt Timeline</h2>
            <p className="text-[10px]" style={{ color: "var(--text-subtle)" }}>
              {positioned.length} tasks scheduled
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button onClick={() => setMonth((m) => subMonths(m, 1))}
            className="p-2 rounded-[10px] transition-all"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)"; (e.currentTarget as HTMLElement).style.color = "var(--text-foreground)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}>
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="px-4 py-1.5 rounded-[10px] text-[13px] font-bold min-w-[130px] text-center"
            style={{ background: "var(--bg-elevated)", color: "var(--text-foreground)" }}>
            {format(month, "MMMM yyyy")}
          </div>

          <button onClick={() => setMonth((m) => addMonths(m, 1))}
            className="p-2 rounded-[10px] transition-all"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)"; (e.currentTarget as HTMLElement).style.color = "var(--text-foreground)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}>
            <ChevronRight className="w-4 h-4" />
          </button>

          <button onClick={() => setMonth(new Date())}
            className="ml-2 px-3 py-1.5 rounded-[10px] text-[11px] font-bold transition-all"
            style={{
              background: "linear-gradient(135deg, rgba(139,92,246,0.18), rgba(99,102,241,0.12))",
              color: "#8B5CF6",
              border: "1px solid rgba(139,92,246,0.25)",
            }}>
            Today
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#8B5CF6" }} />
            <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>Loading timeline…</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto" ref={containerRef}>
          {/* Day header row */}
          <div className="sticky top-0 z-20 flex"
            style={{ background: "var(--bg-sidebar)", borderBottom: "1px solid var(--border)" }}>
            <div className="shrink-0 w-60 px-4 py-2.5 flex items-center"
              style={{ borderRight: "1px solid var(--border)" }}>
              <span className="text-[9px] font-bold uppercase tracking-[0.1em]" style={{ color: "var(--text-subtle)" }}>Task</span>
            </div>
            <div className="flex-1 flex relative">
              {days.map((d) => {
                const isToday = isSameDay(d, today);
                const isWknd = d.getDay() === 0 || d.getDay() === 6;
                return (
                  <div key={d.toISOString()} className="flex-1 flex flex-col items-center py-2"
                    style={{
                      borderRight: "1px solid var(--border-subtle)",
                      background: isToday ? "rgba(139,92,246,0.06)" : isWknd ? "rgba(0,0,0,0.02)" : "transparent",
                    }}>
                    <p className="text-[8px] font-bold uppercase tracking-wider" style={{ color: isWknd ? "var(--text-subtle)" : "var(--text-subtle)" }}>
                      {format(d, "EEE")}
                    </p>
                    <p className={`text-[11px] font-black mt-0.5 ${isToday ? "w-5 h-5 rounded-full flex items-center justify-center text-white" : ""}`}
                      style={{
                        background: isToday ? "linear-gradient(135deg, #8B5CF6, #6D28D9)" : "transparent",
                        color: isToday ? "white" : isWknd ? "var(--text-subtle)" : "var(--text-muted)",
                        boxShadow: isToday ? "0 2px 8px rgba(139,92,246,0.40)" : "none",
                      }}>
                      {format(d, "d")}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Task rows */}
          <div className="relative">
            {positioned.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.12), rgba(99,102,241,0.08))", border: "1px solid rgba(139,92,246,0.20)" }}>
                  <Calendar className="w-8 h-8" style={{ color: "#8B5CF6" }} />
                </div>
                <p className="text-[15px] font-black" style={{ color: "var(--text-foreground)", letterSpacing: "-0.02em" }}>No tasks this month</p>
                <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>Add start or due dates to tasks to see them on the timeline.</p>
              </div>
            )}

            {positioned.map((task, i) => {
              const { pct, width, inMonth } = barProps(task);
              if (!inMonth) return null;
              const color = PRIORITY_COLOR[task.priority] ?? "#8B5CF6";
              const opacity = STATUS_OPACITY[task.status] ?? 1;
              const isHovered = hoveredTask === task.id;
              const isDone = task.status === "DONE";

              return (
                <motion.div key={task.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.025, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="flex items-center"
                  style={{
                    borderBottom: "1px solid var(--border-subtle)",
                    minHeight: "46px",
                    background: isHovered ? "var(--bg-elevated)" : "transparent",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={() => setHoveredTask(task.id)}
                  onMouseLeave={() => setHoveredTask(null)}>
                  {/* Label column */}
                  <div className="shrink-0 w-60 px-4 py-2 flex items-center gap-2.5"
                    style={{ borderRight: "1px solid var(--border)" }}>
                    <div className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: color, boxShadow: `0 0 5px ${color}80` }} />
                    <span className={`text-[12px] font-semibold truncate ${isDone ? "line-through" : ""}`}
                      style={{ color: isDone ? "var(--text-subtle)" : "var(--text-foreground)" }}>
                      {task.title}
                    </span>
                    {task.assignee && (
                      <div className="ml-auto w-5 h-5 rounded-full overflow-hidden shrink-0"
                        style={{ background: `linear-gradient(135deg, ${color}, ${color}88)` }}>
                        {task.assignee.image ? (
                          <img src={task.assignee.image} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[8px] font-black text-white">
                            {task.assignee.name[0]}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Bar area */}
                  <div className="flex-1 relative" style={{ minHeight: "46px" }}>
                    {/* Weekend shading columns */}
                    {days.map((d, di) => {
                      const isWknd = d.getDay() === 0 || d.getDay() === 6;
                      if (!isWknd) return null;
                      return (
                        <div key={di} className="absolute top-0 bottom-0 pointer-events-none"
                          style={{
                            left: `${(di / days.length) * 100}%`,
                            width: `${(1 / days.length) * 100}%`,
                            background: "rgba(0,0,0,0.015)",
                          }} />
                      );
                    })}

                    {/* Today line */}
                    {showToday && (
                      <div className="absolute top-0 bottom-0 w-[2px] z-10 pointer-events-none"
                        style={{
                          left: `${todayPct}%`,
                          background: "linear-gradient(180deg, #8B5CF6, rgba(139,92,246,0.20))",
                        }} />
                    )}

                    {/* Gantt bar */}
                    <div className="absolute flex items-center overflow-hidden"
                      style={{
                        left: `${Math.max(0, pct)}%`,
                        width: `${Math.min(100 - Math.max(0, pct), width)}%`,
                        top: "50%",
                        transform: "translateY(-50%)",
                        height: isHovered ? "28px" : "22px",
                        borderRadius: "100px",
                        background: isDone
                          ? `linear-gradient(90deg, ${color}55, ${color}33)`
                          : `linear-gradient(90deg, ${color}, ${color}bb)`,
                        opacity,
                        boxShadow: isHovered ? `0 4px 16px ${color}50` : `0 2px 8px ${color}30`,
                        transition: "height 0.15s, box-shadow 0.15s",
                        paddingLeft: "8px",
                        paddingRight: "8px",
                      }}>
                      <span className="text-[10px] font-bold text-white truncate drop-shadow-sm">{task.title}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Floating tasks */}
          {floating.length > 0 && (
            <div className="px-6 py-5 mt-2">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
                <span className="text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: "var(--text-muted)" }}>
                  Unscheduled tasks ({floating.length})
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {floating.map((t) => {
                  const color = PRIORITY_COLOR[t.priority] ?? "#6B7280";
                  return (
                    <span key={t.id}
                      className="text-[11px] font-semibold px-3 py-1 rounded-full flex items-center gap-1.5"
                      style={{
                        background: "var(--bg-elevated)",
                        border: "1px solid var(--border)",
                        color: "var(--text-muted)",
                      }}>
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
                      {t.title}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
