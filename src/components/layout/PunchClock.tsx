"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Clock, LogIn, LogOut, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { isSameDay } from "date-fns";
import toast from "react-hot-toast";

interface AttendanceRecord {
  id: string;
  clockIn?: string | null;
  clockOut?: string | null;
  date: string;
}

function elapsed(from: string): string {
  const diff = Math.floor((Date.now() - new Date(from).getTime()) / 1000);
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function PunchClock() {
  const [record, setRecord] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [tick, setTick] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/attendance", { cache: "no-store" });
      if (!res.ok) return;
      const records: AttendanceRecord[] = await res.json();
      const today = records.find((r) => isSameDay(new Date(r.date), new Date()));
      setRecord(today ?? null);
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  // Tick every minute to update elapsed time display
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  // Close panel on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const clockAction = async (action: "clock-in" | "clock-out") => {
    setLoading(true);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Action failed"); return; }
      setRecord(data);
      toast.success(action === "clock-in" ? "Clocked in!" : "Clocked out!");
      setOpen(false);
    } catch { toast.error("Network error"); }
    finally { setLoading(false); }
  };

  const isClockedIn = !!record?.clockIn && !record?.clockOut;
  const isClockedOut = !!record?.clockIn && !!record?.clockOut;

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="hidden sm:flex items-center gap-1.5 h-8 px-3 rounded-xl text-xs font-bold transition-all shrink-0"
        style={{
          background: isClockedIn
            ? "rgba(0,240,144,0.12)"
            : isClockedOut
            ? "rgba(157,107,255,0.1)"
            : "var(--bg-elevated)",
          color: isClockedIn ? "#00F090" : isClockedOut ? "var(--accent)" : "var(--text-muted)",
          border: `1px solid ${isClockedIn ? "rgba(0,240,144,0.3)" : isClockedOut ? "var(--accent-glow)" : "var(--border)"}`,
        }}>
        <Clock className="w-3.5 h-3.5" />
        {isClockedIn
          ? `In · ${elapsed(record!.clockIn!)} ${tick >= 0 ? "" : ""}`
          : isClockedOut
          ? "Done"
          : "Punch In"}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-10 w-64 rounded-2xl p-4 z-50"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              boxShadow: "var(--shadow-lg)",
            }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-foreground">Today's Attendance</span>
              <button onClick={() => setOpen(false)} className="text-muted hover:text-foreground transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {record?.clockIn && (
              <div className="rounded-xl p-3 mb-3 space-y-1.5"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted">Clock In</span>
                  <span className="font-semibold text-foreground">
                    {new Date(record.clockIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                {record.clockOut && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted">Clock Out</span>
                    <span className="font-semibold text-foreground">
                      {new Date(record.clockOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                )}
                {isClockedIn && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted">Duration</span>
                    <span className="font-bold" style={{ color: "#00F090" }}>
                      {elapsed(record.clockIn)} so far
                    </span>
                  </div>
                )}
              </div>
            )}

            {!record?.clockIn && (
              <button
                onClick={() => clockAction("clock-in")}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
                style={{ background: "#00F090", color: "#000" }}>
                <LogIn className="w-4 h-4" />
                {loading ? "Clocking in…" : "Clock In"}
              </button>
            )}

            {isClockedIn && (
              <button
                onClick={() => clockAction("clock-out")}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                style={{ background: "var(--danger-muted)", color: "var(--danger)", border: "1px solid var(--danger-muted)" }}>
                <LogOut className="w-4 h-4" />
                {loading ? "Clocking out…" : "Clock Out"}
              </button>
            )}

            {isClockedOut && (
              <p className="text-center text-xs text-muted py-1">
                ✓ Work day logged — see you tomorrow!
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
