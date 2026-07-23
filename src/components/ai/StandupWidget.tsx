"use client";
import { useState } from "react";
import { Sparkles, RefreshCw, ChevronDown, ChevronUp, CheckCircle2, Clock, AlertTriangle, Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Standup {
  yesterday: string[];
  today: string[];
  blockers: string[];
  highlight: string;
  mood: "great" | "good" | "okay" | "challenging";
  emoji: string;
}

const MOOD_COLOR = { great: "#00F090", good: "#60A5FA", okay: "#FFC107", challenging: "#FF4466" };
const MOOD_BG    = { great: "rgba(0,240,144,0.10)", good: "rgba(96,165,250,0.10)", okay: "rgba(255,193,7,0.10)", challenging: "rgba(255,68,102,0.10)" };

export function StandupWidget() {
  const [standup, setStandup] = useState<Standup | null>(null);
  const [stats, setStats]     = useState<{ done: number; active: number; dueSoon: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [generated, setGenerated] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const res  = await fetch("/api/ai/standup");
      const data = await res.json();
      setStandup(data.standup);
      setStats(data.stats);
      setGenerated(true);
    } catch {}
    finally { setLoading(false); }
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-xs)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: generated ? "1px solid var(--border)" : "none" }}>
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #9D6BFF, #EC4899)" }}>
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-black text-foreground">Colliq Standup</h3>
            {standup && <p className="text-[10px] text-muted">{standup.emoji} {standup.mood} day ahead</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {generated && (
            <button onClick={generate} disabled={loading}
              className="w-7 h-7 rounded-xl flex items-center justify-center transition-colors"
              style={{ color: "var(--text-muted)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          )}
          {generated && (
            <button onClick={() => setExpanded(!expanded)}
              className="w-7 h-7 rounded-xl flex items-center justify-center transition-colors"
              style={{ color: "var(--text-muted)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
          {!generated && (
            <button onClick={generate} disabled={loading}
              className="flex items-center gap-1.5 h-8 px-4 rounded-xl text-xs font-bold text-white transition-all"
              style={{ background: "linear-gradient(135deg, #9D6BFF, #EC4899)", boxShadow: "0 4px 12px rgba(157,107,255,0.4)" }}>
              {loading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              {loading ? "Generating…" : "Generate"}
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {generated && expanded && standup && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="p-5 space-y-4">
              {/* Stats row */}
              {stats && (
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Done", value: stats.done, color: "#00F090", icon: <CheckCircle2 className="w-3 h-3" /> },
                    { label: "Active", value: stats.active, color: "#9D6BFF", icon: <Clock className="w-3 h-3" /> },
                    { label: "Due Soon", value: stats.dueSoon, color: "#FFC107", icon: <AlertTriangle className="w-3 h-3" /> },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: `${s.color}10` }}>
                      <div className="flex items-center justify-center gap-1 mb-1" style={{ color: s.color }}>{s.icon}<span className="text-[10px] font-bold">{s.label}</span></div>
                      <div className="text-lg font-black" style={{ color: s.color }}>{s.value}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Highlight */}
              <div className="rounded-xl px-3 py-2.5 flex items-center gap-2"
                style={{ background: MOOD_BG[standup.mood], border: `1px solid ${MOOD_COLOR[standup.mood]}30` }}>
                <Star className="w-3.5 h-3.5 shrink-0" style={{ color: MOOD_COLOR[standup.mood] }} />
                <p className="text-xs font-semibold" style={{ color: MOOD_COLOR[standup.mood] }}>{standup.highlight}</p>
              </div>

              {/* Yesterday */}
              {standup.yesterday.length > 0 && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-subtle mb-2">Yesterday</p>
                  <ul className="space-y-1">
                    {standup.yesterday.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-muted">
                        <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0" style={{ color: "#00F090" }} />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Today */}
              {standup.today.length > 0 && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-subtle mb-2">Today</p>
                  <ul className="space-y-1">
                    {standup.today.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-muted">
                        <Clock className="w-3 h-3 mt-0.5 shrink-0" style={{ color: "#9D6BFF" }} />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Blockers */}
              {standup.blockers.length > 0 && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-subtle mb-2">Blockers</p>
                  <ul className="space-y-1">
                    {standup.blockers.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-muted">
                        <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" style={{ color: "#FF4466" }} />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
