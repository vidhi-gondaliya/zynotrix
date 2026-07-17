"use client";
import { useState, useRef, useEffect } from "react";
import { Sparkles, Mic, MicOff, X, Loader2, CheckCircle2, Plus, Wand2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

interface Project { id: string; name: string; color: string; }
interface CreatedTask { id: string; title: string; priority: string; status: string; dueDate: string | null; }

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: (tasks: CreatedTask[]) => void;
  defaultProjectId?: string;
}

const EXAMPLES = [
  "Launch beta by July 20 — need landing page design, API integration, QA testing, and deployment",
  "Fix critical login bug ASAP and write regression tests",
  "Plan team offsite next Friday: venue booking, agenda, send invites, order catering",
  "Weekly report due Monday — gather metrics, write summary, review with manager",
];

const PRIORITY_COLOR: Record<string, string> = {
  URGENT: "#FF4466", HIGH: "#FFC107", MEDIUM: "#60A5FA", LOW: "#6B7280",
};

export function NLTaskCreator({ open, onClose, onCreated, defaultProjectId }: Props) {
  const [text, setText]     = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [projects, setProjects]   = useState<Project[]>([]);
  const [projectId, setProjectId] = useState(defaultProjectId ?? "");
  const [created, setCreated]     = useState<CreatedTask[] | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (open) {
      fetch("/api/projects").then((r) => r.json()).then(setProjects).catch(() => {});
      setTimeout(() => textareaRef.current?.focus(), 100);
      setCreated(null);
      setText("");
    }
  }, [open]);

  useEffect(() => {
    if (!open && listening) stopVoice();
  }, [open]);

  function startVoice() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) { toast.error("Voice input not supported in this browser"); return; }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec = new SpeechRecognitionAPI() as any;
    rec.continuous    = true;
    rec.interimResults = true;
    rec.lang          = "en-US";

    let finalText = text;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript + " ";
        else interim = e.results[i][0].transcript;
      }
      setText(finalText + interim);
    };
    rec.onerror = () => setListening(false);
    rec.onend   = () => setListening(false);
    rec.start();
    recognitionRef.current = rec;
    setListening(true);
  }

  function stopVoice() {
    recognitionRef.current?.stop();
    setListening(false);
  }

  async function handleCreate() {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/ai/parse-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, projectId: projectId || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCreated(data.tasks);
      onCreated?.(data.tasks);
      toast.success(`Created ${data.tasks.length} task${data.tasks.length !== 1 ? "s" : ""}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create tasks");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl rounded-3xl overflow-hidden"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-float)" }}>

        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #9D6BFF, #00CFFF)" }}>
            <Wand2 className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-black text-foreground">AI Task Creator</h2>
            <p className="text-[11px] text-muted">Describe what needs to be done — AI creates structured tasks</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-xl flex items-center justify-center transition-colors"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {!created ? (
            <motion.div key="input" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Input */}
              <div className="p-6 space-y-4">
                <div className="relative">
                  <textarea
                    ref={textareaRef}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Describe your work in plain English..."
                    rows={4}
                    className="w-full rounded-2xl px-4 py-3 text-sm text-foreground resize-none focus:outline-none transition-all"
                    style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", lineHeight: 1.6 }}
                    onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleCreate(); }}
                  />
                  {/* Voice button */}
                  <button
                    onClick={listening ? stopVoice : startVoice}
                    className="absolute bottom-3 right-3 w-8 h-8 rounded-xl flex items-center justify-center transition-all"
                    style={{
                      background: listening ? "rgba(255,68,102,0.15)" : "var(--bg-card)",
                      border: `1px solid ${listening ? "#FF4466" : "var(--border)"}`,
                      color: listening ? "#FF4466" : "var(--text-muted)",
                      boxShadow: listening ? "0 0 12px rgba(255,68,102,0.3)" : "none",
                    }}
                    title={listening ? "Stop recording" : "Voice input"}>
                    {listening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Project selector */}
                <div className="flex items-center gap-3">
                  <label className="text-[11px] font-bold text-subtle uppercase tracking-widest shrink-0">Project</label>
                  <select value={projectId} onChange={(e) => setProjectId(e.target.value)}
                    className="flex-1 h-8 rounded-xl px-3 text-xs font-medium text-foreground focus:outline-none"
                    style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                    <option value="">Personal (no project)</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                {/* Examples */}
                {!text && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-subtle uppercase tracking-widest">Examples</p>
                    <div className="space-y-1.5">
                      {EXAMPLES.map((ex, i) => (
                        <button key={i} onClick={() => setText(ex)}
                          className="w-full text-left text-xs px-3 py-2 rounded-xl transition-colors text-muted hover:text-foreground"
                          style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
                          "{ex}"
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-6 pb-5">
                <p className="text-[10px] text-subtle">⌘↵ to create</p>
                <button
                  onClick={handleCreate}
                  disabled={!text.trim() || loading}
                  className="flex items-center gap-2 h-9 px-5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #9D6BFF, #00CFFF)", boxShadow: "0 4px 16px rgba(157,107,255,0.4)" }}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {loading ? "Creating…" : "Create Tasks"}
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div key="results" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <div className="p-6 space-y-3">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle2 className="w-4 h-4" style={{ color: "#00F090" }} />
                  <p className="text-sm font-bold text-foreground">{created.length} task{created.length !== 1 ? "s" : ""} created</p>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {created.map((t) => (
                    <div key={t.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                      style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: PRIORITY_COLOR[t.priority] ?? "#6B7280" }} />
                      <span className="flex-1 text-sm text-foreground truncate">{t.title}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                        style={{ background: `${PRIORITY_COLOR[t.priority] ?? "#6B7280"}18`, color: PRIORITY_COLOR[t.priority] ?? "#6B7280" }}>
                        {t.priority}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between px-6 pb-5">
                <button onClick={() => { setCreated(null); setText(""); }}
                  className="flex items-center gap-2 text-sm font-semibold text-muted hover:text-foreground transition-colors">
                  <Plus className="w-4 h-4" /> Create more
                </button>
                <button onClick={onClose}
                  className="h-9 px-5 rounded-xl text-sm font-bold text-white transition-all"
                  style={{ background: "linear-gradient(135deg, #9D6BFF, #00CFFF)" }}>
                  Done
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
