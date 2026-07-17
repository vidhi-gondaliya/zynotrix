"use client";
import { useState } from "react";
import {
  FileText, Sparkles, Loader2, CheckSquare, Lightbulb, Target,
  ChevronDown, ChevronUp, Plus, Copy,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

interface Project { id: string; name: string; color: string; }
interface ActionItem { task: string; owner: string | null; dueDate: string | null; priority: string; }
interface Notes {
  title: string; summary: string; keyDecisions: string[];
  actionItems: ActionItem[]; followUps: string[];
  sentiment: "positive" | "neutral" | "negative";
  durationEstimate: string;
}

interface Props { meetingId?: string; projects: Project[]; }

const SENTIMENT_COLOR = { positive: "#00F090", neutral: "#60A5FA", negative: "#FF4466" };
const PRIORITY_COLOR: Record<string, string> = { URGENT: "#FF4466", HIGH: "#FFC107", MEDIUM: "#60A5FA", LOW: "#6B7280" };

export function MeetingNotesPanel({ meetingId, projects }: Props) {
  const [transcript, setTranscript]     = useState("");
  const [projectId, setProjectId]       = useState("");
  const [autoCreate, setAutoCreate]     = useState(true);
  const [loading, setLoading]           = useState(false);
  const [notes, setNotes]               = useState<Notes | null>(null);
  const [createdTasks, setCreatedTasks] = useState<{ id: string; title: string }[]>([]);
  const [sectionsOpen, setSectionsOpen] = useState({ decisions: true, actions: true, followUps: true });

  async function analyze() {
    if (!transcript.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/ai/meeting-notes", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, meetingId, projectId: projectId || undefined, autoCreateTasks: autoCreate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNotes(data.notes);
      setCreatedTasks(data.createdTasks ?? []);
      if (data.createdTasks?.length > 0) toast.success(`${data.createdTasks.length} tasks created from action items`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to analyze");
    } finally { setLoading(false); }
  }

  function copyNotes() {
    if (!notes) return;
    const md = `# ${notes.title}\n\n${notes.summary}\n\n## Key Decisions\n${notes.keyDecisions.map((d) => `- ${d}`).join("\n")}\n\n## Action Items\n${notes.actionItems.map((a) => `- [ ] ${a.task}${a.owner ? ` (${a.owner})` : ""}${a.dueDate ? ` — ${a.dueDate}` : ""}`).join("\n")}\n\n## Follow-ups\n${notes.followUps.map((f) => `- ${f}`).join("\n")}`;
    navigator.clipboard.writeText(md);
    toast.success("Copied as Markdown");
  }

  function toggle(s: keyof typeof sectionsOpen) {
    setSectionsOpen((p) => ({ ...p, [s]: !p[s] }));
  }

  return (
    <div className="space-y-4">
      {!notes ? (
        <div className="space-y-4">
          <div>
            <p className="text-[10px] font-bold text-subtle uppercase tracking-widest mb-1.5">Meeting Transcript or Notes</p>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Paste meeting transcript, recording summary, or raw notes here..."
              rows={8}
              className="w-full rounded-2xl px-4 py-3 text-sm text-foreground resize-none focus:outline-none"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", lineHeight: 1.7 }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] font-bold text-subtle uppercase tracking-widest mb-1.5">Project for Tasks</p>
              <select value={projectId} onChange={(e) => setProjectId(e.target.value)}
                className="w-full h-9 rounded-xl px-3 text-xs font-medium text-foreground focus:outline-none"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                <option value="">None</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={autoCreate} onChange={(e) => setAutoCreate(e.target.checked)}
                  className="w-4 h-4 rounded accent-violet-500" />
                <span className="text-xs font-semibold text-muted">Auto-create tasks from action items</span>
              </label>
            </div>
          </div>

          <button onClick={analyze} disabled={!transcript.trim() || loading}
            className="w-full h-10 rounded-xl text-sm font-bold text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: "linear-gradient(135deg,#9D6BFF,#EC4899)", boxShadow: "0 4px 16px rgba(157,107,255,0.35)" }}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? "Analyzing…" : "Analyze Meeting"}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-foreground">{notes.title}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: `${SENTIMENT_COLOR[notes.sentiment]}15`, color: SENTIMENT_COLOR[notes.sentiment] }}>
                  {notes.sentiment}
                </span>
                <span className="text-[10px] text-muted">{notes.durationEstimate}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={copyNotes}
                className="flex items-center gap-1.5 h-8 px-3 rounded-xl text-xs font-bold transition-colors"
                style={{ background: "var(--bg-elevated)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                <Copy className="w-3 h-3" /> Copy MD
              </button>
              <button onClick={() => { setNotes(null); setTranscript(""); }}
                className="flex items-center gap-1.5 h-8 px-3 rounded-xl text-xs font-bold transition-all text-white"
                style={{ background: "linear-gradient(135deg,#9D6BFF,#EC4899)" }}>
                <Plus className="w-3 h-3" /> New
              </button>
            </div>
          </div>

          {/* Summary */}
          <div className="rounded-xl p-4" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
            <p className="text-sm text-muted leading-relaxed">{notes.summary}</p>
          </div>

          {/* Tasks created banner */}
          {createdTasks.length > 0 && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-xl p-3 flex items-center gap-2"
              style={{ background: "rgba(0,240,144,0.08)", border: "1px solid rgba(0,240,144,0.20)" }}>
              <CheckSquare className="w-4 h-4 shrink-0" style={{ color: "#00F090" }} />
              <p className="text-xs font-semibold" style={{ color: "#00F090" }}>
                {createdTasks.length} task{createdTasks.length !== 1 ? "s" : ""} created: {createdTasks.map((t) => t.title).join(", ")}
              </p>
            </motion.div>
          )}

          {/* Key Decisions */}
          {notes.keyDecisions.length > 0 && (
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
              <button onClick={() => toggle("decisions")}
                className="w-full flex items-center justify-between px-4 py-3"
                style={{ background: "var(--bg-elevated)" }}>
                <div className="flex items-center gap-2">
                  <Target className="w-3.5 h-3.5" style={{ color: "#9D6BFF" }} />
                  <span className="text-xs font-black text-foreground">Key Decisions</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                    style={{ background: "var(--accent-muted)", color: "var(--accent)" }}>
                    {notes.keyDecisions.length}
                  </span>
                </div>
                {sectionsOpen.decisions ? <ChevronUp className="w-3.5 h-3.5 text-muted" /> : <ChevronDown className="w-3.5 h-3.5 text-muted" />}
              </button>
              <AnimatePresence>
                {sectionsOpen.decisions && (
                  <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                    <ul className="px-4 py-3 space-y-2">
                      {notes.keyDecisions.map((d, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted">
                          <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: "#9D6BFF" }} />
                          {d}
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Action Items */}
          {notes.actionItems.length > 0 && (
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
              <button onClick={() => toggle("actions")}
                className="w-full flex items-center justify-between px-4 py-3"
                style={{ background: "var(--bg-elevated)" }}>
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-3.5 h-3.5" style={{ color: "#00F090" }} />
                  <span className="text-xs font-black text-foreground">Action Items</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                    style={{ background: "rgba(0,240,144,0.10)", color: "#00F090" }}>
                    {notes.actionItems.length}
                  </span>
                </div>
                {sectionsOpen.actions ? <ChevronUp className="w-3.5 h-3.5 text-muted" /> : <ChevronDown className="w-3.5 h-3.5 text-muted" />}
              </button>
              <AnimatePresence>
                {sectionsOpen.actions && (
                  <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                    <ul className="px-4 py-3 space-y-3">
                      {notes.actionItems.map((a, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <CheckSquare className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "#6B7280" }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground">{a.task}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {a.owner && <span className="text-[10px] text-muted">@{a.owner}</span>}
                              {a.dueDate && <span className="text-[10px] text-muted">{a.dueDate}</span>}
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                                style={{ background: `${PRIORITY_COLOR[a.priority] ?? "#6B7280"}18`, color: PRIORITY_COLOR[a.priority] ?? "#6B7280" }}>
                                {a.priority}
                              </span>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Follow-ups */}
          {notes.followUps.length > 0 && (
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
              <button onClick={() => toggle("followUps")}
                className="w-full flex items-center justify-between px-4 py-3"
                style={{ background: "var(--bg-elevated)" }}>
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-3.5 h-3.5" style={{ color: "#FFC107" }} />
                  <span className="text-xs font-black text-foreground">Follow-ups</span>
                </div>
                {sectionsOpen.followUps ? <ChevronUp className="w-3.5 h-3.5 text-muted" /> : <ChevronDown className="w-3.5 h-3.5 text-muted" />}
              </button>
              <AnimatePresence>
                {sectionsOpen.followUps && (
                  <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                    <ul className="px-4 py-3 space-y-2">
                      {notes.followUps.map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted">
                          <Lightbulb className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "#FFC107" }} />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
