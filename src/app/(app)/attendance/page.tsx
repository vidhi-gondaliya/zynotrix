"use client";
import { useEffect, useState, useCallback } from "react";
import {
  ClipboardCheck, Clock, LogIn, LogOut, Calendar, CheckCircle2,
  XCircle, AlertCircle, Wifi, Users, Edit3, X, ChevronDown, ChevronUp,
  Download,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar } from "@/components/ui/Avatar";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameDay, isToday, getDay,
} from "date-fns";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import { hasPermission } from "@/lib/permissions";

interface AttendanceRecord {
  id: string;
  userId: string;
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  status: string;
  notes: string | null;
  user?: { id: string; name: string | null; image: string | null; email: string };
}

interface TeamMember {
  id: string;
  name: string | null;
  image: string | null;
  email: string;
  role: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof CheckCircle2 }> = {
  PRESENT:  { label: "Present",  color: "#34D399", bg: "rgba(52,211,153,0.12)",  icon: CheckCircle2 },
  ABSENT:   { label: "Absent",   color: "#F87171", bg: "rgba(248,113,113,0.12)", icon: XCircle },
  LATE:     { label: "Late",     color: "#FBBF24", bg: "rgba(251,191,36,0.12)",  icon: AlertCircle },
  HALF_DAY: { label: "Half Day", color: "#60A5FA", bg: "rgba(96,165,250,0.12)",  icon: Clock },
  REMOTE:   { label: "Remote",   color: "#A78BFA", bg: "rgba(167,139,250,0.12)", icon: Wifi },
};

const ROLE_COLORS: Record<string, string> = {
  OWNER:   "#A78BFA",
  ADMIN:   "#60A5FA",
  MANAGER: "#34D399",
  MEMBER:  "#6B7280",
};

function memberStats(records: AttendanceRecord[], memberId: string) {
  const recs = records.filter((r) => r.userId === memberId);
  return {
    present:  recs.filter((r) => r.status === "PRESENT").length,
    absent:   recs.filter((r) => r.status === "ABSENT").length,
    late:     recs.filter((r) => r.status === "LATE").length,
    halfDay:  recs.filter((r) => r.status === "HALF_DAY").length,
    remote:   recs.filter((r) => r.status === "REMOTE").length,
    records:  recs,
  };
}

// Mini calendar for a single member in the team view
function MemberCalendar({
  member,
  records,
  currentMonth,
  canManage,
  onMark,
}: {
  member: TeamMember;
  records: AttendanceRecord[];
  currentMonth: Date;
  canManage: boolean;
  onMark: (memberId: string, memberName: string, date: string) => void;
}) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd   = endOfMonth(currentMonth);
  const days       = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPad   = getDay(monthStart);

  return (
    <div className="pt-4 px-4 pb-4">
      <div className="grid grid-cols-7 mb-1">
        {["Su","Mo","Tu","We","Th","Fr","Sa"].map((d) => (
          <div key={d} className="text-center text-[9px] font-bold py-1" style={{ color: "var(--text-subtle)" }}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: startPad }).map((_, i) => <div key={`pad-${i}`} />)}
        {days.map((day) => {
          const rec  = records.find((r) => r.userId === member.id && isSameDay(new Date(r.date), day));
          const cfg  = rec ? STATUS_CONFIG[rec.status] : null;
          const today = isToday(day);
          return (
            <div
              key={day.toISOString()}
              onClick={() => canManage && onMark(member.id, member.name ?? member.email, format(day, "yyyy-MM-dd"))}
              className="aspect-square flex flex-col items-center justify-center rounded-lg text-[10px] font-semibold relative"
              style={{
                background: cfg ? cfg.bg : today ? "var(--accent-muted)" : "var(--bg-elevated)",
                border: today ? "1.5px solid var(--accent)" : "1px solid transparent",
                color: cfg ? cfg.color : today ? "var(--accent)" : "var(--text-subtle)",
                cursor: canManage ? "pointer" : "default",
              }}
              title={rec ? `${cfg?.label} ${rec.clockIn ? `· In: ${format(new Date(rec.clockIn), "HH:mm")}` : ""}${rec.clockOut ? ` Out: ${format(new Date(rec.clockOut), "HH:mm")}` : ""}` : canManage ? "Click to mark" : ""}
            >
              <span>{format(day, "d")}</span>
              {cfg && <span className="text-[7px] font-bold opacity-80 leading-none">{cfg.label.charAt(0)}</span>}
            </div>
          );
        })}
      </div>
      {canManage && (
        <p className="text-[10px] mt-2 text-center" style={{ color: "var(--text-subtle)" }}>
          Click any day to mark attendance
        </p>
      )}
    </div>
  );
}

export default function AttendancePage() {
  const { data: session } = useSession();
  const orgRole = (session?.user as { orgRole?: string })?.orgRole;
  const canViewAll = hasPermission(orgRole, "attendance:view_all");
  const canManage  = hasPermission(orgRole, "attendance:manage");

  // ── Personal view state ─────────────────────────────────────────────────────
  const [records, setRecords]           = useState<AttendanceRecord[]>([]);
  const [loading, setLoading]           = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [todayRecord, setTodayRecord]   = useState<AttendanceRecord | null>(null);
  const [now, setNow]                   = useState(new Date());

  // ── Team view state ──────────────────────────────────────────────────────────
  const [activeTab, setActiveTab]           = useState<"mine" | "team">("mine");
  const [teamRecords, setTeamRecords]       = useState<AttendanceRecord[]>([]);
  const [teamMembers, setTeamMembers]       = useState<TeamMember[]>([]);
  const [teamLoading, setTeamLoading]       = useState(false);
  const [expandedId, setExpandedId]         = useState<string | null>(null);

  // ── Mark modal ──────────────────────────────────────────────────────────────
  const [markModal, setMarkModal] = useState<{ memberId: string; memberName: string; prefillDate?: string } | null>(null);
  const [markForm, setMarkForm]   = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    status: "PRESENT",
    clockIn: "",
    clockOut: "",
    notes: "",
  });
  const [markLoading, setMarkLoading] = useState(false);

  const monthKey = format(currentMonth, "yyyy-MM");

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Personal attendance load
  const loadMine = useCallback(async () => {
    setLoading(true);
    const res  = await fetch(`/api/attendance?month=${monthKey}`);
    const data: AttendanceRecord[] = await res.json();
    setRecords(data);
    const today = data.find((r) => isSameDay(new Date(r.date), new Date()));
    setTodayRecord(today ?? null);
    setLoading(false);
  }, [monthKey]);

  useEffect(() => { loadMine(); }, [loadMine]);

  // Team attendance load
  const loadTeam = useCallback(async () => {
    if (!canViewAll) return;
    setTeamLoading(true);
    try {
      const res  = await fetch(`/api/attendance?all=true&month=${monthKey}`);
      const data = await res.json();
      setTeamRecords(data.records ?? []);
      setTeamMembers(data.members ?? []);
    } catch { /* silent */ }
    setTeamLoading(false);
  }, [canViewAll, monthKey]);

  useEffect(() => {
    if (activeTab === "team") loadTeam();
  }, [activeTab, loadTeam]);

  // Clock in/out
  const clockAction = async (action: "clock-in" | "clock-out") => {
    setActionLoading(true);
    try {
      const res  = await fetch("/api/attendance", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Clock action failed"); return; }
      setTodayRecord(data);
      toast.success(action === "clock-in" ? "Clocked in!" : "Clocked out!");
      loadMine();
    } catch { toast.error("Network error – please try again"); }
    finally { setActionLoading(false); }
  };

  // Submit mark attendance
  const submitMark = async () => {
    if (!markModal) return;
    setMarkLoading(true);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mark",
          userId: markModal.memberId,
          date:     markForm.date,
          status:   markForm.status,
          clockIn:  markForm.clockIn  || undefined,
          clockOut: markForm.clockOut || undefined,
          notes:    markForm.notes    || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to mark"); return; }
      toast.success("Attendance marked");
      setMarkModal(null);
      loadTeam();
      if (markModal.memberId === session?.user?.id) loadMine();
    } catch { toast.error("Network error"); }
    finally { setMarkLoading(false); }
  };

  const openMarkModal = (memberId: string, memberName: string, prefillDate?: string) => {
    setMarkForm({
      date:     prefillDate ?? format(new Date(), "yyyy-MM-dd"),
      status:   "PRESENT",
      clockIn:  "",
      clockOut: "",
      notes:    "",
    });
    setMarkModal({ memberId, memberName, prefillDate });
  };

  // Export team CSV
  const exportCSV = () => {
    const rows = [["Name", "Email", "Date", "Status", "Clock In", "Clock Out", "Notes"]];
    for (const rec of teamRecords) {
      rows.push([
        rec.user?.name ?? "",
        rec.user?.email ?? "",
        format(new Date(rec.date), "yyyy-MM-dd"),
        rec.status,
        rec.clockIn ? format(new Date(rec.clockIn), "HH:mm") : "",
        rec.clockOut ? format(new Date(rec.clockOut), "HH:mm") : "",
        rec.notes ?? "",
      ]);
    }
    const csv  = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `attendance-${monthKey}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // Personal calendar data
  const monthStart = startOfMonth(currentMonth);
  const monthEnd   = endOfMonth(currentMonth);
  const days       = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPad   = getDay(monthStart);

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
            <h1 className="text-xl font-black" style={{
              background: "linear-gradient(135deg, var(--text-foreground) 0%, #34D399 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              letterSpacing: "-0.03em",
            }}>Attendance</h1>
            <p className="text-xs text-subtle">{format(now, "EEEE, MMMM d, yyyy")}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold font-mono text-foreground">{format(now, "HH:mm:ss")}</p>
          <p className="text-[10px] text-subtle">{format(now, "zzz")}</p>
        </div>
      </div>

      {/* Tabs — only show if user can see team data */}
      {canViewAll && (
        <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: "var(--bg-elevated)" }}>
          {(["mine", "team"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
              style={activeTab === tab
                ? { background: "var(--bg-card)", color: "var(--text-foreground)", boxShadow: "0 1px 4px rgba(0,0,0,0.15)" }
                : { color: "var(--text-subtle)" }
              }>
              {tab === "mine" ? <Clock className="w-4 h-4" /> : <Users className="w-4 h-4" />}
              {tab === "mine" ? "My Attendance" : "Team View"}
            </button>
          ))}
        </div>
      )}

      {/* ── MY ATTENDANCE VIEW ─────────────────────────────────────────────── */}
      {activeTab === "mine" && (
        <>
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
                      color:      STATUS_CONFIG[todayRecord.status]?.color,
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
              { label: "Present",  value: present,  color: "#34D399" },
              { label: "Absent",   value: absent,   color: "#F87171" },
              { label: "Late",     value: late,     color: "#FBBF24" },
              { label: "Half Day", value: halfDay,  color: "#60A5FA" },
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
                  className="p-1.5 rounded-lg hover:bg-card-hover text-muted hover:text-foreground transition-colors text-xs font-bold">‹</button>
                <button onClick={() => setCurrentMonth(new Date())}
                  className="px-2.5 py-1 rounded-lg hover:bg-card-hover text-xs font-semibold text-subtle hover:text-foreground transition-colors">Today</button>
                <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                  className="p-1.5 rounded-lg hover:bg-card-hover text-muted hover:text-foreground transition-colors text-xs font-bold">›</button>
              </div>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-7 mb-2">
                {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (
                  <div key={d} className="text-center text-[10px] font-bold text-subtle py-1">{d}</div>
                ))}
              </div>
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
                    const cfg  = STATUS_CONFIG[rec.status];
                    const Icon = cfg?.icon ?? CheckCircle2;
                    return (
                      <motion.div key={rec.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                        className="flex items-center gap-4 px-5 py-3"
                        style={i < records.length - 1 ? { borderBottom: "1px solid var(--border)" } : {}}>
                        <Icon className="w-4 h-4 shrink-0" style={{ color: cfg?.color }} />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-foreground">{format(new Date(rec.date), "EEEE, MMM d")}</p>
                          <div className="flex items-center gap-3 mt-0.5">
                            {rec.clockIn  && <span className="text-[11px] text-subtle flex items-center gap-1"><LogIn  className="w-3 h-3 text-success" />In: {format(new Date(rec.clockIn),  "HH:mm")}</span>}
                            {rec.clockOut && <span className="text-[11px] text-subtle flex items-center gap-1"><LogOut className="w-3 h-3 text-danger"  />Out: {format(new Date(rec.clockOut), "HH:mm")}</span>}
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
        </>
      )}

      {/* ── TEAM VIEW ──────────────────────────────────────────────────────── */}
      {activeTab === "team" && canViewAll && (
        <>
          {/* Team header controls */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex gap-1 items-center">
              <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                className="p-2 rounded-xl hover:bg-card-hover text-muted hover:text-foreground transition-colors font-bold">‹</button>
              <span className="text-sm font-bold text-foreground px-2">{format(currentMonth, "MMMM yyyy")}</span>
              <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                className="p-2 rounded-xl hover:bg-card-hover text-muted hover:text-foreground transition-colors font-bold">›</button>
              <button onClick={() => setCurrentMonth(new Date())}
                className="ml-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors"
                style={{ background: "var(--bg-elevated)", color: "var(--text-subtle)" }}>This Month</button>
            </div>
            <button onClick={exportCSV}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
              style={{ background: "var(--bg-elevated)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>

          {/* Team summary stats */}
          {!teamLoading && teamMembers.length > 0 && (() => {
            const totPresent = teamRecords.filter((r) => r.status === "PRESENT" || r.status === "REMOTE").length;
            const totAbsent  = teamRecords.filter((r) => r.status === "ABSENT").length;
            const totLate    = teamRecords.filter((r) => r.status === "LATE").length;
            return (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {[
                  { label: "Total Members",  value: teamMembers.length, color: "var(--accent)" },
                  { label: "Present (total)",value: totPresent,          color: "#34D399" },
                  { label: "Absent (total)", value: totAbsent,           color: "#F87171" },
                  { label: "Late (total)",   value: totLate,             color: "#FBBF24" },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                    <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                    <p className="text-[11px] text-subtle mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Member list */}
          <div className="rounded-2xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            {/* Table header */}
            <div className="grid gap-3 px-5 py-3 text-[11px] font-bold text-subtle"
              style={{ gridTemplateColumns: "1fr 72px 72px 64px 64px 72px 120px", borderBottom: "1px solid var(--border)" }}>
              <span>Member</span>
              <span className="text-center" style={{ color: "#34D399" }}>Present</span>
              <span className="text-center" style={{ color: "#F87171" }}>Absent</span>
              <span className="text-center" style={{ color: "#FBBF24" }}>Late</span>
              <span className="text-center" style={{ color: "#60A5FA" }}>Half</span>
              <span className="text-center" style={{ color: "#A78BFA" }}>Remote</span>
              <span className="text-right">Actions</span>
            </div>

            {teamLoading ? (
              <div className="px-5 py-10 text-center text-sm text-subtle">Loading team data…</div>
            ) : teamMembers.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-subtle">No members found</div>
            ) : (
              teamMembers.map((member, i) => {
                const stats    = memberStats(teamRecords, member.id);
                const expanded = expandedId === member.id;
                return (
                  <div key={member.id} style={i < teamMembers.length - 1 ? { borderBottom: "1px solid var(--border)" } : {}}>
                    {/* Member row */}
                    <div
                      className="grid items-center gap-3 px-5 py-3 hover:bg-card-hover transition-colors cursor-pointer"
                      style={{ gridTemplateColumns: "1fr 72px 72px 64px 64px 72px 120px" }}
                      onClick={() => setExpandedId(expanded ? null : member.id)}>
                      {/* Name + role */}
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar name={member.name} image={member.image} size="sm" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{member.name ?? member.email}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] font-bold"
                              style={{ color: ROLE_COLORS[member.role] ?? "#6B7280" }}>
                              {member.role}
                            </span>
                            <span className="text-[10px] text-subtle truncate">{member.email}</span>
                          </div>
                        </div>
                      </div>
                      {/* Stats */}
                      <span className="text-sm font-bold text-center" style={{ color: "#34D399" }}>{stats.present}</span>
                      <span className="text-sm font-bold text-center" style={{ color: "#F87171" }}>{stats.absent}</span>
                      <span className="text-sm font-bold text-center" style={{ color: "#FBBF24" }}>{stats.late}</span>
                      <span className="text-sm font-bold text-center" style={{ color: "#60A5FA" }}>{stats.halfDay}</span>
                      <span className="text-sm font-bold text-center" style={{ color: "#A78BFA" }}>{stats.remote}</span>
                      {/* Actions */}
                      <div className="flex items-center gap-2 justify-end">
                        {canManage && (
                          <button
                            onClick={(e) => { e.stopPropagation(); openMarkModal(member.id, member.name ?? member.email); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-colors"
                            style={{ background: "var(--accent-muted)", color: "var(--accent)" }}>
                            <Edit3 className="w-3 h-3" /> Mark
                          </button>
                        )}
                        <button className="p-1.5 rounded-lg transition-colors" style={{ color: "var(--text-subtle)" }}>
                          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Expanded calendar */}
                    <AnimatePresence>
                      {expanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          style={{ overflow: "hidden", borderTop: "1px solid var(--border-subtle)", background: "var(--bg-elevated)" }}>
                          <MemberCalendar
                            member={member}
                            records={teamRecords}
                            currentMonth={currentMonth}
                            canManage={canManage}
                            onMark={openMarkModal}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* ── MARK ATTENDANCE MODAL ──────────────────────────────────────────── */}
      <AnimatePresence>
        {markModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
              onClick={() => setMarkModal(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="fixed z-50 w-full max-w-md rounded-2xl p-6 shadow-2xl"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                top: "50%", left: "50%",
                transform: "translate(-50%, -50%)",
              }}>
              {/* Modal header */}
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-base font-bold text-foreground">Mark Attendance</h3>
                  <p className="text-xs text-subtle mt-0.5">{markModal.memberName}</p>
                </div>
                <button onClick={() => setMarkModal(null)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors hover:bg-card-hover"
                  style={{ color: "var(--text-subtle)" }}>
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Date */}
                <div>
                  <label className="text-xs font-semibold text-subtle block mb-1.5">Date</label>
                  <input type="date" value={markForm.date}
                    onChange={(e) => setMarkForm((f) => ({ ...f, date: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
                    style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-foreground)" }}
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="text-xs font-semibold text-subtle block mb-1.5">Status</label>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                      <button key={key}
                        onClick={() => setMarkForm((f) => ({ ...f, status: key }))}
                        className="px-3 py-2 rounded-xl text-xs font-bold transition-all"
                        style={markForm.status === key
                          ? { background: cfg.bg, color: cfg.color, border: `1.5px solid ${cfg.color}` }
                          : { background: "var(--bg-elevated)", color: "var(--text-subtle)", border: "1px solid var(--border)" }}>
                        {cfg.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Clock times */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-subtle block mb-1.5">Clock In (optional)</label>
                    <input type="time" value={markForm.clockIn}
                      onChange={(e) => setMarkForm((f) => ({ ...f, clockIn: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl text-sm transition-colors"
                      style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-foreground)" }}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-subtle block mb-1.5">Clock Out (optional)</label>
                    <input type="time" value={markForm.clockOut}
                      onChange={(e) => setMarkForm((f) => ({ ...f, clockOut: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl text-sm transition-colors"
                      style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-foreground)" }}
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="text-xs font-semibold text-subtle block mb-1.5">Notes (optional)</label>
                  <textarea value={markForm.notes} rows={2}
                    onChange={(e) => setMarkForm((f) => ({ ...f, notes: e.target.value }))}
                    placeholder="e.g. Medical leave, WFH, etc."
                    className="w-full px-3 py-2.5 rounded-xl text-sm resize-none transition-colors"
                    style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-foreground)" }}
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => setMarkModal(null)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                  style={{ background: "var(--bg-elevated)", color: "var(--text-muted)" }}>
                  Cancel
                </button>
                <button onClick={submitMark} disabled={markLoading}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, var(--accent), #A78BFA)" }}>
                  {markLoading ? "Saving…" : "Save"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
