"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Video, Users, ArrowLeft, Clock, Sparkles, Link2 } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import type { User } from "@/types";
import { format, addHours } from "date-fns";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { useSession, signIn } from "next-auth/react";

function toDatetimeLocal(d: Date) {
  return format(d, "yyyy-MM-dd'T'HH:mm");
}

export default function NewMeetingPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const hasGoogleToken = !!(session?.user as { accessToken?: string } | undefined)?.accessToken;
  const [users, setUsers] = useState<User[]>([]);
  const [creating, setCreating] = useState(false);
  const now = new Date();
  const [form, setForm] = useState({
    title: "",
    description: "",
    startTime: toDatetimeLocal(addHours(now, 1)),
    endTime: toDatetimeLocal(addHours(now, 2)),
    attendeeIds: [] as string[],
    projectId: "",
    createMeet: false,
  });

  useEffect(() => {
    fetch("/api/users").then((r) => r.json()).then(setUsers).catch(() => {});
  }, []);

  const toggle = (id: string) =>
    setForm((f) => ({
      ...f,
      attendeeIds: f.attendeeIds.includes(id)
        ? f.attendeeIds.filter((x) => x !== id)
        : [...f.attendeeIds, id],
    }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.startTime || !form.endTime) {
      toast.error("Title, start, and end time are required");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const m = await res.json();
        toast.success("Meeting scheduled!");
        if (m.googleMeetUrl) toast.success("Google Meet link ready", { icon: "🎥" });
        router.push("/meetings");
      } else {
        toast.error("Failed to schedule meeting");
      }
    } finally { setCreating(false); }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => router.back()}
            className="p-2 rounded-xl hover:bg-elevated transition-colors text-muted hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #9D6BFF, #00CFFF)", boxShadow: "0 0 20px rgba(157,107,255,0.40)" }}>
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-foreground">Schedule Meeting</h1>
              <p className="text-xs text-muted">Create a new meeting and invite your team</p>
            </div>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-5">
          {/* Title */}
          <div className="rounded-2xl p-5 space-y-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <h2 className="text-xs font-bold text-subtle uppercase tracking-wider">Meeting Details</h2>
            <div>
              <label className="text-[11px] font-bold text-subtle uppercase tracking-wider block mb-1.5">Title *</label>
              <input autoFocus required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Weekly standup, Sprint review, Client sync…"
                className="w-full px-4 py-3 rounded-xl text-sm font-semibold text-foreground placeholder:text-subtle outline-none transition-all"
                style={{ background: "var(--bg-elevated)", border: form.title ? "1.5px solid var(--accent)" : "1.5px solid var(--border)" }} />
            </div>
            <div>
              <label className="text-[11px] font-bold text-subtle uppercase tracking-wider block mb-1.5">Description <span className="font-normal opacity-60">(optional)</span></label>
              <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Agenda, goals, or notes for attendees…"
                className="w-full px-4 py-3 rounded-xl text-sm text-foreground placeholder:text-subtle outline-none resize-none transition-all"
                style={{ background: "var(--bg-elevated)", border: "1.5px solid var(--border)" }} />
            </div>
          </div>

          {/* Time */}
          <div className="rounded-2xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <h2 className="text-xs font-bold text-subtle uppercase tracking-wider mb-4">Time</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-subtle uppercase tracking-wider flex items-center gap-1 mb-1.5">
                  <Clock className="w-3 h-3" /> Start *
                </label>
                <input required type="datetime-local" value={form.startTime}
                  onChange={(e) => {
                    const start = new Date(e.target.value);
                    const end = new Date(form.endTime);
                    setForm({
                      ...form,
                      startTime: e.target.value,
                      endTime: end <= start ? toDatetimeLocal(addHours(start, 1)) : form.endTime,
                    });
                  }}
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-foreground outline-none"
                  style={{ background: "var(--bg-elevated)", border: "1.5px solid var(--border)" }} />
              </div>
              <div>
                <label className="text-[11px] font-bold text-subtle uppercase tracking-wider flex items-center gap-1 mb-1.5">
                  <Clock className="w-3 h-3" /> End *
                </label>
                <input required type="datetime-local" value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                  min={form.startTime}
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-foreground outline-none"
                  style={{ background: "var(--bg-elevated)", border: "1.5px solid var(--border)" }} />
              </div>
            </div>
            {form.startTime && form.endTime && new Date(form.endTime) > new Date(form.startTime) && (
              <p className="text-[11px] text-muted mt-2 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Duration: {Math.round((new Date(form.endTime).getTime() - new Date(form.startTime).getTime()) / 60000)} minutes
              </p>
            )}
          </div>

          {/* Attendees */}
          <div className="rounded-2xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold text-subtle uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> Attendees
              </h2>
              {form.attendeeIds.length > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: "var(--accent-muted)", color: "var(--accent)" }}>
                  {form.attendeeIds.length} selected
                </span>
              )}
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto no-scrollbar">
              {users.map((u) => {
                const checked = form.attendeeIds.includes(u.id);
                return (
                  <label key={u.id}
                    className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all"
                    style={{ background: checked ? "var(--accent-muted)" : "transparent", border: `1px solid ${checked ? "var(--accent)" : "transparent"}` }}>
                    <input type="checkbox" className="accent-accent" checked={checked} onChange={() => toggle(u.id)} />
                    <Avatar name={u.name} image={u.image} size="xs" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{u.name ?? u.email}</p>
                      <p className="text-[10px] text-subtle truncate">{u.email}</p>
                    </div>
                    {checked && <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--accent)" }}>
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Google Meet */}
          {hasGoogleToken ? (
            <label className="flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all"
              style={{
                background: form.createMeet ? "rgba(0,207,255,0.06)" : "var(--bg-card)",
                border: `1.5px solid ${form.createMeet ? "#00CFFF" : "var(--border)"}`,
              }}>
              <input type="checkbox" className="accent-accent w-4 h-4" checked={form.createMeet}
                onChange={(e) => setForm({ ...form, createMeet: e.target.checked })} />
              <div className="flex items-center gap-3 flex-1">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: form.createMeet ? "rgba(0,207,255,0.15)" : "var(--bg-elevated)" }}>
                  <Video className="w-4 h-4" style={{ color: form.createMeet ? "#00CFFF" : "var(--text-muted)" }} />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    Create Google Meet link
                    <Sparkles className="w-3 h-3" style={{ color: "#00CFFF" }} />
                  </p>
                  <p className="text-xs text-muted">Auto-generates a video call link for all attendees</p>
                </div>
              </div>
            </label>
          ) : (
            <div className="flex items-center gap-4 p-4 rounded-2xl"
              style={{ background: "var(--bg-card)", border: "1.5px solid var(--border)", opacity: 0.85 }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "var(--bg-elevated)" }}>
                <Video className="w-4 h-4 text-subtle" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground">Google Meet integration</p>
                <p className="text-xs text-muted">Connect your Google account to generate Meet links automatically</p>
              </div>
              <button type="button"
                onClick={() => signIn("google", { callbackUrl: "/meetings/new" })}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:opacity-90 shrink-0"
                style={{ background: "var(--accent)", color: "#fff" }}>
                <Link2 className="w-3 h-3" /> Connect Google
              </button>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => router.back()}
              className="flex-1 py-3 rounded-2xl text-sm font-semibold text-muted hover:text-foreground hover:bg-elevated transition-all">
              Cancel
            </button>
            <button type="submit" disabled={!form.title.trim() || creating}
              className="flex-1 py-3 rounded-2xl text-sm font-bold text-white transition-all disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #9D6BFF, #00CFFF)", boxShadow: "0 4px 24px rgba(157,107,255,0.40)" }}>
              {creating ? "Scheduling…" : "Schedule Meeting"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
