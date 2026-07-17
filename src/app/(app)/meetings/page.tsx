"use client";
import { useEffect, useState, useMemo } from "react";
import {
  Calendar, Plus, Video, Users, Clock, ExternalLink,
  Zap, CalendarDays, List, ChevronLeft, ChevronRight,
  X, Search, Check, AlignLeft, FileText,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { MeetingNotesPanel } from "@/components/ai/MeetingNotesPanel";
import type { Meeting, User } from "@/types";
import {
  format, isPast, isToday, isSameDay, startOfMonth, endOfMonth,
  eachDayOfInterval, startOfWeek, endOfWeek, addMonths, subMonths,
  parseISO, isFuture, differenceInMinutes, addHours,
} from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

// ── Create Meeting Modal ───────────────────────────────────────────────────────
type CreateMode = "now" | "schedule";

function CreateMeetingModal({ users, onCreated, onClose }: {
  users: User[];
  onCreated: (m: Meeting) => void;
  onClose: () => void;
}) {
  const [mode, setMode]           = useState<CreateMode | null>(null);
  const [creating, setCreating]   = useState(false);
  const [searchUser, setSearchUser] = useState("");
  const [form, setForm] = useState({
    title: "", description: "",
    startTime: format(addHours(new Date(), 1), "yyyy-MM-dd'T'HH:mm"),
    endTime:   format(addHours(new Date(), 2), "yyyy-MM-dd'T'HH:mm"),
    attendeeIds: [] as string[],
    createMeet: false,
  });

  const toggleAttendee = (id: string) =>
    setForm((f) => ({
      ...f,
      attendeeIds: f.attendeeIds.includes(id) ? f.attendeeIds.filter((x) => x !== id) : [...f.attendeeIds, id],
    }));

  const startNow = async () => {
    setCreating(true);
    const now  = new Date();
    const end  = addHours(now, 1);
    const res  = await fetch("/api/meetings", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title || "Instant Meeting",
        description: form.description,
        startTime: now.toISOString(),
        endTime: end.toISOString(),
        attendeeIds: form.attendeeIds,
        createMeet: true,
      }),
    });
    if (res.ok) {
      const m = await res.json();
      onCreated(m);
      onClose();
      toast.success("Meeting started!");
      if (m.googleMeetUrl) window.open(m.googleMeetUrl, "_blank");
    } else { toast.error("Failed to start meeting"); }
    setCreating(false);
  };

  const scheduleMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    const res = await fetch("/api/meetings", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        startTime: new Date(form.startTime).toISOString(),
        endTime:   new Date(form.endTime).toISOString(),
      }),
    });
    if (res.ok) {
      const m = await res.json();
      onCreated(m);
      onClose();
      toast.success("Meeting scheduled!");
      if (m.googleMeetUrl) toast.success("Google Meet link created!", { icon: "🎥" });
    } else { toast.error("Failed to schedule meeting"); }
    setCreating(false);
  };

  const filteredUsers = users.filter((u) =>
    !searchUser || u.name?.toLowerCase().includes(searchUser.toLowerCase()) || u.email?.toLowerCase().includes(searchUser.toLowerCase())
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(5,5,15,0.85)", backdropFilter: "blur(8px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 16 }}
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border-strong)", boxShadow: "0 32px 100px rgba(0,0,0,0.85)" }}>

        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid var(--border)" }}>
          <h2 className="text-sm font-black text-foreground">New Meeting</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-elevated transition-colors">
            <X className="w-4 h-4 text-muted" />
          </button>
        </div>

        {/* Mode picker */}
        {!mode && (
          <div className="p-5 space-y-3">
            <p className="text-xs text-muted mb-4">Choose how you want to start</p>

            {/* Start Now */}
            <button onClick={() => setMode("now")}
              className="w-full flex items-center gap-4 p-4 rounded-2xl text-left group transition-all hover:scale-[1.01]"
              style={{ background: "linear-gradient(135deg, rgba(0,207,255,0.12), rgba(157,107,255,0.12))", border: "1.5px solid rgba(0,207,255,0.25)" }}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                style={{ background: "linear-gradient(135deg, #00CFFF, #9D6BFF)" }}>
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-black text-foreground">Start Now</p>
                <p className="text-xs text-muted mt-0.5">Instant meeting — opens Google Meet immediately</p>
              </div>
            </button>

            {/* Schedule */}
            <button onClick={() => setMode("schedule")}
              className="w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all hover:scale-[1.01]"
              style={{ background: "var(--bg-elevated)", border: "1.5px solid var(--border)" }}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                style={{ background: "var(--accent-muted)", border: "1px solid var(--accent-glow)" }}>
                <CalendarDays className="w-5 h-5" style={{ color: "var(--accent)" }} />
              </div>
              <div>
                <p className="text-sm font-black text-foreground">Schedule</p>
                <p className="text-xs text-muted mt-0.5">Pick a date, time, and invite attendees</p>
              </div>
            </button>
          </div>
        )}

        {/* Now flow — just title, attendees, then Start */}
        {mode === "now" && (
          <div className="p-5 space-y-4">
            <button onClick={() => setMode(null)} className="text-xs text-muted hover:text-foreground flex items-center gap-1 transition-colors">
              <ChevronLeft className="w-3.5 h-3.5" /> Back
            </button>

            <div>
              <p className="text-[10px] font-bold text-subtle uppercase tracking-wider mb-1.5">Meeting Title</p>
              <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Instant Meeting"
                className="w-full px-3 py-2.5 rounded-xl text-sm text-foreground placeholder:text-subtle outline-none"
                style={{ background: "var(--bg-elevated)", border: "1.5px solid var(--border)" }} />
            </div>

            {/* Attendees */}
            <div>
              <p className="text-[10px] font-bold text-subtle uppercase tracking-wider mb-1.5">Invite (optional)</p>
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-subtle" />
                <input value={searchUser} onChange={(e) => setSearchUser(e.target.value)}
                  placeholder="Search users…"
                  className="w-full pl-7 pr-3 py-1.5 rounded-xl text-xs outline-none"
                  style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-foreground)" }} />
              </div>
              <div className="max-h-36 overflow-y-auto space-y-1">
                {filteredUsers.map((u) => (
                  <label key={u.id} className="flex items-center gap-2 px-2 py-1.5 rounded-xl cursor-pointer hover:bg-elevated transition-colors"
                    style={{ background: form.attendeeIds.includes(u.id) ? "var(--accent-muted)" : "transparent" }}>
                    <input type="checkbox" className="sr-only" checked={form.attendeeIds.includes(u.id)}
                      onChange={() => toggleAttendee(u.id)} />
                    <Avatar name={u.name} image={u.image} size="xs" />
                    <span className="flex-1 text-xs font-semibold text-foreground truncate">{u.name ?? u.email}</span>
                    {form.attendeeIds.includes(u.id) && <Check className="w-3 h-3 shrink-0" style={{ color: "var(--accent)" }} />}
                  </label>
                ))}
              </div>
            </div>

            <button onClick={startNow} disabled={creating}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold text-white transition-all disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #00CFFF, #9D6BFF)", boxShadow: "0 4px 24px rgba(0,207,255,0.30)" }}>
              <Video className="w-4 h-4" />
              {creating ? "Starting…" : "Start Meeting Now"}
            </button>
          </div>
        )}

        {/* Schedule flow */}
        {mode === "schedule" && (
          <form onSubmit={scheduleMeeting} className="p-5 space-y-4">
            <button type="button" onClick={() => setMode(null)} className="text-xs text-muted hover:text-foreground flex items-center gap-1 transition-colors">
              <ChevronLeft className="w-3.5 h-3.5" /> Back
            </button>

            <div>
              <p className="text-[10px] font-bold text-subtle uppercase tracking-wider mb-1.5">Title *</p>
              <input required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Weekly standup, Sprint planning…"
                className="w-full px-3 py-2.5 rounded-xl text-sm text-foreground placeholder:text-subtle outline-none"
                style={{ background: "var(--bg-elevated)", border: "1.5px solid var(--border)" }} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] font-bold text-subtle uppercase tracking-wider mb-1.5">Start</p>
                <input type="datetime-local" required value={form.startTime}
                  onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl text-xs text-foreground outline-none"
                  style={{ background: "var(--bg-elevated)", border: "1.5px solid var(--border)" }} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-subtle uppercase tracking-wider mb-1.5">End</p>
                <input type="datetime-local" required value={form.endTime}
                  onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl text-xs text-foreground outline-none"
                  style={{ background: "var(--bg-elevated)", border: "1.5px solid var(--border)" }} />
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold text-subtle uppercase tracking-wider mb-1.5"><AlignLeft className="w-3 h-3 inline" /> Agenda</p>
              <textarea value={form.description} rows={2}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Optional agenda…"
                className="w-full px-3 py-2.5 rounded-xl text-sm text-foreground placeholder:text-subtle outline-none resize-none"
                style={{ background: "var(--bg-elevated)", border: "1.5px solid var(--border)" }} />
            </div>

            {/* Attendees */}
            <div>
              <p className="text-[10px] font-bold text-subtle uppercase tracking-wider mb-1.5">Attendees</p>
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-subtle" />
                <input value={searchUser} onChange={(e) => setSearchUser(e.target.value)}
                  placeholder="Search users…"
                  className="w-full pl-7 pr-3 py-1.5 rounded-xl text-xs outline-none"
                  style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-foreground)" }} />
              </div>
              <div className="max-h-28 overflow-y-auto space-y-1">
                {filteredUsers.map((u) => (
                  <label key={u.id} className="flex items-center gap-2 px-2 py-1.5 rounded-xl cursor-pointer hover:bg-elevated transition-colors"
                    style={{ background: form.attendeeIds.includes(u.id) ? "var(--accent-muted)" : "transparent" }}>
                    <input type="checkbox" className="sr-only" checked={form.attendeeIds.includes(u.id)}
                      onChange={() => toggleAttendee(u.id)} />
                    <Avatar name={u.name} image={u.image} size="xs" />
                    <span className="flex-1 text-xs font-semibold text-foreground truncate">{u.name ?? u.email}</span>
                    {form.attendeeIds.includes(u.id) && <Check className="w-3 h-3 shrink-0" style={{ color: "var(--accent)" }} />}
                  </label>
                ))}
              </div>
            </div>

            {/* Google Meet toggle */}
            <label className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all"
              style={{
                background: form.createMeet ? "rgba(0,207,255,0.08)" : "var(--bg-elevated)",
                border: `1.5px solid ${form.createMeet ? "rgba(0,207,255,0.30)" : "var(--border)"}`,
              }}>
              <input type="checkbox" className="sr-only" checked={form.createMeet}
                onChange={(e) => setForm((f) => ({ ...f, createMeet: e.target.checked }))} />
              <div className="w-8 h-4 rounded-full relative transition-all shrink-0"
                style={{ background: form.createMeet ? "#00CFFF" : "var(--bg-card)", border: "1px solid var(--border)" }}>
                <div className="absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all duration-200"
                  style={{ left: form.createMeet ? "calc(100% - 14px)" : "2px", boxShadow: "0 1px 2px rgba(0,0,0,0.3)" }} />
              </div>
              <div className="flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5" style={{ color: "#00CFFF" }} />
                <span className="text-xs font-bold text-foreground">Add Google Meet link</span>
              </div>
            </label>

            <div className="flex gap-2">
              <button type="button" onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-muted hover:text-foreground hover:bg-elevated transition-all">
                Cancel
              </button>
              <button type="submit" disabled={creating}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
                style={{ background: "var(--accent)", boxShadow: "0 4px 20px var(--accent-muted)" }}>
                {creating ? "Scheduling…" : "Schedule Meeting"}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
}

// ── Mini Calendar ─────────────────────────────────────────────────────────────
function MiniCalendar({ meetings, onSelectDay }: { meetings: Meeting[]; onSelectDay: (d: Date) => void }) {
  const [current, setCurrent] = useState(new Date());
  const monthStart = startOfMonth(current);
  const monthEnd   = endOfMonth(current);
  const calStart   = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd     = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days       = eachDayOfInterval({ start: calStart, end: calEnd });
  const today      = new Date();

  const meetingDays = new Set(meetings.map((m) => format(parseISO(m.startTime), "yyyy-MM-dd")));

  return (
    <div className="rounded-2xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      {/* Month nav */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setCurrent(subMonths(current, 1))}
          className="w-7 h-7 rounded-xl flex items-center justify-center hover:bg-elevated transition-colors text-muted hover:text-foreground">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-xs font-black text-foreground">{format(current, "MMMM yyyy")}</span>
        <button onClick={() => setCurrent(addMonths(current, 1))}
          className="w-7 h-7 rounded-xl flex items-center justify-center hover:bg-elevated transition-colors text-muted hover:text-foreground">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {["Mo","Tu","We","Th","Fr","Sa","Su"].map((d) => (
          <div key={d} className="text-center text-[10px] font-bold text-subtle py-1">{d}</div>
        ))}
      </div>

      {/* Days */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {days.map((day) => {
          const key     = format(day, "yyyy-MM-dd");
          const hasMeet = meetingDays.has(key);
          const isThisMonth = day.getMonth() === current.getMonth();
          const isTod   = isToday(day);

          return (
            <button key={key} onClick={() => onSelectDay(day)}
              className="aspect-square flex flex-col items-center justify-center rounded-lg transition-all hover:bg-elevated group"
              style={{ opacity: isThisMonth ? 1 : 0.25 }}>
              <span className="text-[11px] font-semibold"
                style={{
                  color: isTod ? "#fff" : "var(--text-muted)",
                  background: isTod ? "var(--accent)" : "transparent",
                  width: "22px", height: "22px", borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                {format(day, "d")}
              </span>
              {hasMeet && (
                <div className="w-1 h-1 rounded-full mt-0.5" style={{ background: "var(--accent)" }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Meeting Card ──────────────────────────────────────────────────────────────
function MeetingCard({ meeting, index }: { meeting: Meeting; index: number }) {
  const start   = parseISO(meeting.startTime);
  const end     = parseISO(meeting.endTime);
  const past    = isPast(end);
  const live    = !isPast(start) === false && !isPast(end);
  const duration = differenceInMinutes(end, start);

  const statusColor = past ? "#6B7280" : live ? "#00F090" : "var(--accent)";
  const statusLabel = past ? "Past" : live ? "Live" : "Upcoming";

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="flex gap-3 p-4 rounded-2xl transition-all"
      style={{
        background: "var(--bg-card)",
        border: `1px solid ${live ? "rgba(0,240,144,0.25)" : "var(--border)"}`,
        boxShadow: live ? "0 0 20px rgba(0,240,144,0.08)" : "none",
        opacity: past ? 0.65 : 1,
      }}>
      {/* Date block */}
      <div className="w-12 shrink-0 flex flex-col items-center justify-center rounded-xl py-2"
        style={{ background: past ? "var(--bg-elevated)" : "var(--accent-muted)" }}>
        <span className="text-[9px] font-black uppercase" style={{ color: past ? "var(--text-subtle)" : "var(--accent)" }}>
          {format(start, "MMM")}
        </span>
        <span className="text-lg font-black leading-none" style={{ color: past ? "var(--text-muted)" : "var(--text-foreground)" }}>
          {format(start, "d")}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="text-sm font-bold text-foreground leading-snug">{meeting.title}</h3>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: `${statusColor}15`, color: statusColor }}>
              {statusLabel}
            </span>
            {meeting.googleMeetUrl && (
              <a href={meeting.googleMeetUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full transition-all hover:opacity-80"
                style={{ background: "rgba(0,207,255,0.12)", color: "#00CFFF" }}>
                <Video className="w-3 h-3" /> Join
              </a>
            )}
            {!meeting.googleEventId && (
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  const res = await fetch("/api/integrations/google-calendar/sync", {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ meetingId: meeting.id }),
                  });
                  if (res.ok) toast.success("Synced to Google Calendar ✅");
                  else {
                    const d = await res.json().catch(() => ({}));
                    toast.error(d.error ?? "Failed to sync");
                  }
                }}
                className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full transition-all hover:opacity-80"
                style={{ background: "rgba(66,133,244,0.12)", color: "#4285F4" }}>
                <Calendar className="w-3 h-3" /> Sync
              </button>
            )}
          </div>
        </div>

        {meeting.description && (
          <p className="text-[11px] text-muted line-clamp-1 mb-1.5">{meeting.description}</p>
        )}

        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1 text-[10px] text-muted">
            <Clock className="w-3 h-3" />
            {format(start, "HH:mm")} – {format(end, "HH:mm")} · {duration}m
          </span>
          {meeting.attendees && meeting.attendees.length > 0 && (
            <div className="flex items-center gap-1">
              <div className="flex -space-x-1">
                {meeting.attendees.slice(0, 3).map((a) => (
                  <div key={a.userId} className="rounded-full ring-1 ring-card">
                    <Avatar name={a.user?.name} image={a.user?.image} size="xs" />
                  </div>
                ))}
              </div>
              {meeting.attendees.length > 3 && (
                <span className="text-[10px] text-muted">+{meeting.attendees.length - 3}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
type ViewMode = "list" | "calendar";

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [users, setUsers]       = useState<User[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string; color: string }[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | undefined>(undefined);

  useEffect(() => {
    Promise.all([
      fetch("/api/meetings").then((r) => r.json()),
      fetch("/api/users").then((r) => r.json()),
      fetch("/api/projects").then((r) => r.json()),
    ]).then(([m, u, p]) => { setMeetings(Array.isArray(m) ? m : []); setUsers(Array.isArray(u) ? u : []); setProjects(Array.isArray(p) ? p : []); setLoading(false); });
  }, []);

  const upcoming = meetings.filter((m) => isFuture(parseISO(m.startTime)));
  const past     = meetings.filter((m) => isPast(parseISO(m.endTime)));

  const dayMeetings = selectedDay
    ? meetings.filter((m) => isSameDay(parseISO(m.startTime), selectedDay))
    : null;

  return (
    <div className="flex" style={{ height: "calc(100vh - var(--header-h))" }}>
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: "1px solid var(--border)" }}>
          <div>
            <h1 className="text-lg font-black text-foreground">Meetings</h1>
            <p className="text-xs text-muted">{upcoming.length} upcoming</p>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center gap-0.5 p-0.5 rounded-xl"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
              {([["list", List], ["calendar", CalendarDays]] as [ViewMode, React.ElementType][]).map(([v, Icon]) => (
                <button key={v} onClick={() => setViewMode(v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                  style={{
                    background: viewMode === v ? "var(--bg-card)" : "transparent",
                    color: viewMode === v ? "var(--text-foreground)" : "var(--text-subtle)",
                    boxShadow: viewMode === v ? "var(--shadow-sm)" : "none",
                  }}>
                  <Icon className="w-3.5 h-3.5" />
                  {v === "list" ? "List" : "Calendar"}
                </button>
              ))}
            </div>
            <button onClick={() => { setSelectedMeetingId(undefined); setShowNotes(true); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-foreground)" }}>
              <FileText className="w-3.5 h-3.5" style={{ color: "#9D6BFF" }} /> AI Notes
            </button>
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-bold text-white transition-all hover:scale-105"
              style={{ background: "var(--accent)", boxShadow: "0 4px 20px var(--accent-muted)" }}>
              <Plus className="w-4 h-4" /> New Meeting
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 skeleton rounded-2xl" />
              ))}
            </div>
          ) : viewMode === "list" ? (
            <div className="space-y-6">
              {upcoming.length > 0 && (
                <div>
                  <p className="text-[10px] font-black text-subtle uppercase tracking-widest mb-3">Upcoming</p>
                  <div className="space-y-2">
                    {upcoming.map((m, i) => <MeetingCard key={m.id} meeting={m} index={i} />)}
                  </div>
                </div>
              )}
              {past.length > 0 && (
                <div>
                  <p className="text-[10px] font-black text-subtle uppercase tracking-widest mb-3">Past</p>
                  <div className="space-y-2">
                    {past.slice(0, 8).map((m, i) => <MeetingCard key={m.id} meeting={m} index={i} />)}
                  </div>
                </div>
              )}
              {meetings.length === 0 && (
                <div className="text-center py-20">
                  <div className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4"
                    style={{ background: "var(--accent-muted)" }}>
                    <Calendar className="w-8 h-8" style={{ color: "var(--accent)" }} />
                  </div>
                  <h3 className="text-sm font-bold text-foreground mb-1">No meetings yet</h3>
                  <p className="text-xs text-muted">Schedule or start a meeting to get going</p>
                  <button onClick={() => setShowCreate(true)}
                    className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold mx-auto transition-all hover:scale-105"
                    style={{ background: "var(--accent)", color: "#fff" }}>
                    <Plus className="w-4 h-4" /> New Meeting
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Calendar view — 2 column */
            <div className="grid grid-cols-[auto,1fr] gap-5 items-start">
              <div className="w-64 shrink-0">
                <MiniCalendar meetings={meetings} onSelectDay={setSelectedDay} />
              </div>
              <div>
                {selectedDay ? (
                  <>
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className="text-sm font-black text-foreground">
                        {format(selectedDay, "EEEE, MMMM d")}
                      </h3>
                      <button onClick={() => setSelectedDay(null)} className="text-subtle hover:text-muted transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {(dayMeetings ?? []).length === 0 ? (
                      <p className="text-sm text-muted">No meetings on this day</p>
                    ) : (
                      <div className="space-y-2">
                        {(dayMeetings ?? []).map((m, i) => <MeetingCard key={m.id} meeting={m} index={i} />)}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-48 text-subtle">
                    <CalendarDays className="w-8 h-8 mb-2 opacity-30" />
                    <p className="text-sm">Click a day to see meetings</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create modal */}
      <AnimatePresence>
        {showCreate && (
          <CreateMeetingModal
            users={users}
            onCreated={(m) => setMeetings((p) => [m, ...p])}
            onClose={() => setShowCreate(false)} />
        )}
      </AnimatePresence>

      {/* AI Meeting Notes drawer */}
      <AnimatePresence>
        {showNotes && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.4)" }}
              onClick={() => setShowNotes(false)} />
            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 38 }}
              className="fixed right-0 top-0 h-full z-50 flex flex-col overflow-hidden"
              style={{ width: "480px", background: "var(--bg-card)", borderLeft: "1px solid var(--border)", boxShadow: "var(--shadow-float)" }}>
              <div className="flex items-center justify-between px-5 py-4 shrink-0"
                style={{ borderBottom: "1px solid var(--border)" }}>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" style={{ color: "#9D6BFF" }} />
                  <h2 className="text-sm font-black text-foreground">AI Meeting Notes</h2>
                </div>
                <button onClick={() => setShowNotes(false)}
                  className="w-7 h-7 rounded-xl flex items-center justify-center transition-colors"
                  style={{ color: "var(--text-muted)" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                <MeetingNotesPanel meetingId={selectedMeetingId} projects={projects} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
