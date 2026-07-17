"use client";
import { useEffect, useState, useCallback } from "react";
import { ClipboardCheck, Clock, LogIn, LogOut, Calendar, CheckCircle2, XCircle, AlertCircle, Wifi } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar } from "@/components/ui/Avatar";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, getDay } from "date-fns";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";

interface AttendanceRecord {
  id: string;
  userId: string;
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  status: string;
  notes: string | null;
  user?: { id: string; name: string | null; image: string | null };
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof CheckCircle2 }> = {
  PRESENT:  { label: "Present",   color: "#34D399", bg: "rgba(52,211,153,0.12)", icon: CheckCircle2 },
  ABSENT:   { label: "Absent",    color: "#F87171", bg: "rgba(248,113,113,0.12)", icon: XCircle },
  LATE:     { label: "Late",      color: "#FBBF24", bg: "rgba(251,191,36,0.12)",  icon: AlertCircle },
  HALF_DAY: { label: "Half Day",  color: "#60A5FA", bg: "rgba(96,165,250,0.12)",  icon: Clock },
  REMOTE:   { label: "Remote",    color: "#A78BFA", bg: "rgba(167,139,250,0.12)", icon: Wifi },
};

export default function AttendancePage() {
  const { data: session } = useSession();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [now, setNow] = useState(new Date());

  const monthKey = format(currentMonth, "yyyy-MM");

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/attendance?month=${monthKey}`);
    const data: AttendanceRecord[] = await res.json();
    setRecords(data);
    // Use isSameDay so local timezone is used when comparing, not UTC string prefix
    const today = data.find((r) => isSameDay(new Date(r.date), new Date()));
    setTodayRecord(today ?? null);
    setLoading(false);
  }, [monthKey]);

  useEffect(() => { load(); }, [load]);

  const clockAction = async (action: "clock-in" | "clock-out") => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Clock action failed");
        return;
      }
      setTodayRecord(data);
      toast.success(action === "clock-in" ? "Clocked in!" : "Clocked out!");
      load();
    } catch {
      toast.error("Network error – please try again");
    } finally { setActionLoading(false); }
  };

  // Calendar grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd   = endOfMonth(currentMonth);
  const days       = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPad   = getDay(monthStart); // 0=Sun

  // Stats
  const present  = records.filter((r) => r.status === "PRESENT" || r.status === "REMOTE").length;
  const absent   = records.filter((r) => r.status === "ABSENT").length;
  const late     = records.filter((r) => r.status === "LATE").length;
  const halfDay  = records.filter((r) => r.status === "HALF_DAY").length;

  const isClockedIn  = !!todayRecord?.clockIn && !todayRecord?.clockOut;
  const isClockedOut = !!todayRecord?.clockOut;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl gradient-bg flex items-center justify-center shadow-glow-sm">
            <ClipboardCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Attendance</h1>
            <p className="text-xs text-subtle">{format(now, "EEEE, MMMM d, yyyy")}</p>
          </div>
        </div>
        {/* Live clock */}
        <div className="text-right">
          <p className="text-2xl font-bold font-mono text-foreground">{format(now, "HH:mm:ss")}</p>
          <p className="text-[10px] text-subtle">{format(now, "zzz")}</p>
        </div>
      </div>

      {/* Clock In/Out card */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-6"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-sm font-semibold text-foreground mb-1">Today's Status</p>
            {todayRecord ? (
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{
                  background: STATUS_CONFIG[todayRecord.status]?.bg,
                  color: STATUS_CONFIG[todayRecord.status]?.color,
                }}>
                  {STATUS_CONFIG[todayRecord.status]?.label ?? todayRecord.status}
                </span>
                {todayRecord.clockIn && (
                  <span className="text-xs text-subtle flex items-center gap-1">
                    <LogIn className="w-3 h-3 text-success" /> In: {format(new Date(todayRecord.clockIn), "HH:mm")}
                  </span>
                )}
                {todayRecord.clockOut && (
                  <span className="text-xs text-subtle flex items-center gap-1">
                    <LogOut className="w-3 h-3 text-danger" /> Out: {format(new Date(todayRecord.clockOut), "HH:mm")}
                  </span>
                )}
              </div>
            ) : (
              <p className="text-xs text-subtle">Not clocked in yet</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {!isClockedIn && !isClockedOut && (
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={() => clockAction("clock-in")} disabled={actionLoading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #34D399, #059669)" }}>
                <LogIn className="w-4 h-4" /> Clock In
              </motion.button>
            )}
            {isClockedIn && (
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={() => clockAction("clock-out")} disabled={actionLoading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #F87171, #DC2626)" }}>
                <LogOut className="w-4 h-4" /> Clock Out
              </motion.button>
            )}
            {isClockedOut && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-success"
                style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.3)" }}>
                <CheckCircle2 className="w-4 h-4" /> Day Complete
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Present",  value: present, color: "#34D399" },
          { label: "Absent",   value: absent,  color: "#F87171" },
          { label: "Late",     value: late,    color: "#FBBF24" },
          { label: "Half Day", value: halfDay, color: "#60A5FA" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl p-4"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
            <p className="text-xs text-subtle mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Month selector + Calendar */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Calendar className="w-4 h-4 text-accent" />
            {format(currentMonth, "MMMM yyyy")}
          </h2>
          <div className="flex gap-1">
            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
              className="p-1.5 rounded-lg hover:bg-card-hover text-muted hover:text-foreground transition-colors text-xs font-bold">
              ‹
            </button>
            <button onClick={() => setCurrentMonth(new Date())}
              className="px-2.5 py-1 rounded-lg hover:bg-card-hover text-xs font-semibold text-subtle hover:text-foreground transition-colors">
              Today
            </button>
            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
              className="p-1.5 rounded-lg hover:bg-card-hover text-muted hover:text-foreground transition-colors text-xs font-bold">
              ›
            </button>
          </div>
        </div>

        <div className="p-4">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-2">
            {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (
              <div key={d} className="text-center text-[10px] font-bold text-subtle py-1">{d}</div>
            ))}
          </div>

          {/* Calendar cells */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: startPad }).map((_, i) => <div key={`pad-${i}`} />)}
            {days.map((day) => {
              const rec = records.find((r) => isSameDay(new Date(r.date), day));
              const cfg = rec ? STATUS_CONFIG[rec.status] : null;
              const today = isToday(day);
              return (
                <div key={day.toISOString()}
                  className="aspect-square flex flex-col items-center justify-center rounded-xl text-xs font-semibold relative"
                  style={{
                    background: cfg ? cfg.bg : today ? "var(--accent-muted)" : "transparent",
                    border: today ? "1.5px solid var(--accent)" : "1px solid transparent",
                    color: cfg ? cfg.color : today ? "var(--accent)" : "var(--text-muted)",
                  }}>
                  <span>{format(day, "d")}</span>
                  {cfg && <span className="text-[8px] mt-0.5 font-bold opacity-80">{cfg.label.charAt(0)}</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 px-5 py-3" style={{ borderTop: "1px solid var(--border)" }}>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <div key={k} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-sm" style={{ background: v.color }} />
              <span className="text-[10px] text-subtle">{v.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent records */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <h2 className="text-sm font-bold text-foreground">Recent Records</h2>
        </div>
        <div>
          <AnimatePresence>
            {loading ? (
              <div className="px-5 py-8 text-center text-sm text-subtle">Loading…</div>
            ) : records.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-subtle">No records for this month</div>
            ) : (
              records.slice(0, 10).map((rec, i) => {
                const cfg = STATUS_CONFIG[rec.status];
                const Icon = cfg?.icon ?? CheckCircle2;
                return (
                  <motion.div key={rec.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                    className="flex items-center gap-4 px-5 py-3"
                    style={i < records.length - 1 ? { borderBottom: "1px solid var(--border)" } : {}}>
                    <Icon className="w-4 h-4 shrink-0" style={{ color: cfg?.color }} />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">{format(new Date(rec.date), "EEEE, MMM d")}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        {rec.clockIn && <span className="text-[11px] text-subtle flex items-center gap-1"><LogIn className="w-3 h-3 text-success" />In: {format(new Date(rec.clockIn), "HH:mm")}</span>}
                        {rec.clockOut && <span className="text-[11px] text-subtle flex items-center gap-1"><LogOut className="w-3 h-3 text-danger" />Out: {format(new Date(rec.clockOut), "HH:mm")}</span>}
                      </div>
                    </div>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: cfg?.bg, color: cfg?.color }}>
                      {cfg?.label ?? rec.status}
                    </span>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
