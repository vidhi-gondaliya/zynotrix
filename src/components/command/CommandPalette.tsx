"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Plus, FolderKanban, CheckSquare, Calendar,
  MessageSquare, LayoutDashboard, Zap, ArrowRight,
  Clock, Sparkles, X, Hash, AtSign, Send,
  FileText, Users, Settings, Shield,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { parseTask } from "@/lib/nlp-parser";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  projects?: { id: string; name: string; color: string }[];
}

type Mode = "search" | "create-task" | "ask-colliq";

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard",       href: "/dashboard",     kbd: "G D", group: "Navigate" },
  { icon: FolderKanban,    label: "Projects",        href: "/projects",      kbd: "G P", group: "Navigate" },
  { icon: CheckSquare,     label: "My Tasks",        href: "/tasks",         kbd: "G T", group: "Navigate" },
  { icon: Calendar,        label: "Meetings",        href: "/meetings",      kbd: "G M", group: "Navigate" },
  { icon: MessageSquare,   label: "Team Chat",       href: "/chat",          kbd: "",    group: "Navigate" },
  { icon: FileText,        label: "Documents",       href: "/documents",     kbd: "",    group: "Navigate" },
  { icon: Users,           label: "Workload",        href: "/workload",      kbd: "",    group: "Navigate" },
  { icon: Shield,          label: "Rewards",         href: "/rewards",       kbd: "",    group: "Navigate" },
  { icon: Settings,        label: "Settings",        href: "/settings",      kbd: "",    group: "Navigate" },
];

const QUICK_ACTIONS = [
  { label: "New Task",         icon: Plus,       action: "create-task",   color: "#9D6BFF" },
  { label: "New Project",      icon: FolderKanban, action: "/projects/new", color: "#00CFFF" },
  { label: "Ask Colliq",       icon: Sparkles,   action: "ask-colliq",   color: "#EC4899" },
  { label: "Schedule Meeting", icon: Calendar,   action: "/meetings",    color: "#FFC107" },
];

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  URGENT: { label: "Urgent", color: "#FF4466", bg: "rgba(255,68,102,0.12)" },
  HIGH:   { label: "High",   color: "#FFC107", bg: "rgba(255,193,7,0.12)"  },
  MEDIUM: { label: "Medium", color: "#60A5FA", bg: "rgba(96,165,250,0.12)" },
  LOW:    { label: "Low",    color: "#6B7280", bg: "rgba(107,114,128,0.12)"},
};

const COLLIQ_SUGGESTIONS = [
  "What's blocking my team right now?",
  "Summarize this week's progress",
  "Which projects are at risk?",
  "What should I focus on today?",
];

export function CommandPalette({ open, onClose, projects = [] }: CommandPaletteProps) {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<Mode>("search");
  const [creating, setCreating] = useState(false);
  const [selectedProject, setSelectedProject] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [aiStreaming, setAiStreaming] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const [debouncedInput, setDebouncedInput] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedInput(input), 80);
    return () => clearTimeout(t);
  }, [input]);

  const parsed = mode === "create-task" ? parseTask(debouncedInput) : null;
  const parsedRef = useRef(parsed);
  const selectedProjectRef = useRef(selectedProject);
  parsedRef.current = parsed;
  selectedProjectRef.current = selectedProject;

  useEffect(() => {
    if (open) {
      setInput("");
      setMode("search");
      setAiResponse("");
      setAiStreaming(false);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [open]);

  const switchMode = (m: Mode) => {
    setMode(m);
    setInput("");
    setAiResponse("");
    setTimeout(() => inputRef.current?.focus(), 40);
  };

  const handleKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") { onClose(); return; }
    if (e.key === "Enter" && mode === "create-task") { e.preventDefault(); createTask(); return; }
    if (e.key === "Enter" && mode === "ask-colliq" && input.trim()) { e.preventDefault(); askColliq(); return; }
    if (e.key === "Tab") {
      e.preventDefault();
      const modes: Mode[] = ["search", "create-task", "ask-colliq"];
      const idx = modes.indexOf(mode);
      setMode(modes[(idx + 1) % modes.length]);
      setInput("");
      setAiResponse("");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, onClose, input]);

  const createTask = async () => {
    const p = parsedRef.current;
    const proj = selectedProjectRef.current;
    if (!p?.title || !proj) { if (!proj) toast.error("Select a project first"); return; }
    setCreating(true);
    try {
      const res = await fetch(`/api/projects/${proj}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: p.title, status: "TODO", priority: p.priority, dueDate: p.dueDate ? new Date(p.dueDate).toISOString() : undefined, tags: p.tags }),
      });
      if (res.ok) { toast.success("Task created!", { icon: "✓" }); onClose(); router.refresh(); }
    } finally { setCreating(false); }
  };

  const askColliq = async () => {
    if (!input.trim() || aiStreaming) return;
    setAiStreaming(true);
    setAiResponse("");
    try {
      const res = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: input }] }),
      });
      if (!res.ok || !res.body) throw new Error();
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setAiResponse(acc);
      }
    } catch { setAiResponse("Sorry, Colliq couldn't answer that. Please try again."); }
    finally { setAiStreaming(false); }
  };

  const navigate = (href: string) => { router.push(href); onClose(); };

  const filteredNav = input
    ? NAV_ITEMS.filter(i => i.label.toLowerCase().includes(input.toLowerCase()))
    : NAV_ITEMS;
  const filteredProjects = input && mode === "search"
    ? projects.filter(p => p.name.toLowerCase().includes(input.toLowerCase()))
    : projects.slice(0, 5);

  const MODE_LABELS: Record<Mode, string> = {
    "search": "Search",
    "create-task": "Create Task",
    "ask-colliq": "Ask Colliq",
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[999] flex items-start justify-center pt-[12vh] px-4" onClick={onClose}>

          {/* Backdrop */}
          <motion.div className="absolute inset-0"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            style={{ background: "rgba(4,4,14,0.86)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }} />

          {/* Palette */}
          <motion.div
            initial={{ opacity: 0, y: -18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -14, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-[580px] rounded-2xl overflow-hidden z-10"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-strong)",
              boxShadow: "0 0 0 1px rgba(157,107,255,0.12), 0 32px 80px rgba(0,0,0,0.85), 0 8px 32px rgba(157,107,255,0.08)",
            }}
            onClick={e => e.stopPropagation()}>

            {/* Top accent line */}
            <div className="absolute top-0 left-0 right-0 h-[1.5px]"
              style={{ background: "linear-gradient(90deg, transparent, rgba(157,107,255,0.6) 40%, rgba(0,207,255,0.4) 70%, transparent)" }} />

            {/* Mode tabs */}
            <div className="flex items-center gap-1.5 px-3 pt-3 pb-2">
              {(["search", "create-task", "ask-colliq"] as Mode[]).map(m => (
                <button key={m} onClick={() => switchMode(m)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all"
                  style={{
                    background: mode === m ? "var(--accent-muted)" : "transparent",
                    color: mode === m ? "var(--accent)" : "var(--text-subtle)",
                    border: mode === m ? "1px solid var(--accent-glow)" : "1px solid transparent",
                  }}>
                  {m === "search" && <Search className="w-3 h-3" />}
                  {m === "create-task" && <Plus className="w-3 h-3" />}
                  {m === "ask-colliq" && <Sparkles className="w-3 h-3" />}
                  {MODE_LABELS[m]}
                </button>
              ))}
              <span className="ml-auto text-[10px]" style={{ color: "var(--text-subtle)" }}>Tab to switch · Esc to close</span>
            </div>

            {/* Input */}
            <div className="flex items-center gap-3 px-4 pb-3" style={{ borderBottom: "1px solid var(--border)" }}>
              <div className="flex items-center justify-center shrink-0" style={{ color: "var(--text-subtle)" }}>
                {mode === "create-task" ? <Zap className="w-4 h-4" style={{ color: "var(--accent)" }} />
                  : mode === "ask-colliq" ? <Sparkles className="w-4 h-4" style={{ color: "#EC4899" }} />
                  : <Search className="w-4 h-4" />}
              </div>
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder={
                  mode === "create-task" ? "Review PR @sarah by friday !high #backend"
                    : mode === "ask-colliq" ? "Ask Colliq anything about your workspace…"
                    : "Search pages, projects, tasks…"
                }
                className="flex-1 bg-transparent text-[14px] text-foreground placeholder:text-subtle outline-none font-medium py-1"
              />
              <div className="flex items-center gap-2 shrink-0">
                {input && <button onClick={() => setInput("")} style={{ color: "var(--text-subtle)" }}><X className="w-3.5 h-3.5" /></button>}
                {mode === "ask-colliq" && input.trim() && (
                  <button onClick={askColliq} disabled={aiStreaming}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold text-white transition-all disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg, #EC4899, #9D6BFF)" }}>
                    {aiStreaming ? <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <Send className="w-3 h-3" />}
                    {aiStreaming ? "Thinking…" : "Ask"}
                  </button>
                )}
              </div>
            </div>

            {/* ── SEARCH MODE ── */}
            {mode === "search" && (
              <div className="max-h-[400px] overflow-y-auto">
                {!input && (
                  <div className="px-4 pt-3 pb-1">
                    <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--text-subtle)" }}>Quick Actions</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {QUICK_ACTIONS.map(({ label, icon: Icon, action, color }) => (
                        <button key={label}
                          onClick={() => typeof action === "string" && action.startsWith("/") ? navigate(action) : switchMode(action as Mode)}
                          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[12px] font-semibold transition-colors text-left"
                          style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = color + "50"; (e.currentTarget as HTMLElement).style.color = "var(--text-foreground)"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}>
                          <Icon className="w-3.5 h-3.5 shrink-0" style={{ color }} />
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="px-4 pt-3 pb-2">
                  {!input && <p className="text-[9px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "var(--text-subtle)" }}>Navigate</p>}
                  <div className="space-y-0.5">
                    {filteredNav.map(({ icon: Icon, label, href, kbd }) => (
                      <button key={href} onClick={() => navigate(href)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors text-left group"
                        style={{ color: "var(--text-muted)" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)"; (e.currentTarget as HTMLElement).style.color = "var(--text-foreground)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}>
                        <Icon className="w-4 h-4 shrink-0" style={{ color: "var(--text-subtle)" }} />
                        <span className="flex-1">{label}</span>
                        {kbd && <span className="text-[9px] hidden group-hover:block" style={{ color: "var(--text-subtle)" }}>{kbd}</span>}
                        <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                      </button>
                    ))}
                  </div>
                </div>

                {filteredProjects.length > 0 && (
                  <div className="px-4 pt-2 pb-3">
                    <p className="text-[9px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "var(--text-subtle)" }}>Projects</p>
                    <div className="space-y-0.5">
                      {filteredProjects.map(p => (
                        <button key={p.id} onClick={() => navigate(`/projects/${p.id}/board`)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors text-left"
                          style={{ color: "var(--text-muted)" }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)"; (e.currentTarget as HTMLElement).style.color = "var(--text-foreground)"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}>
                          <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: p.color }} />
                          <span>{p.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── CREATE TASK MODE ── */}
            {mode === "create-task" && (
              <div className="p-4 space-y-4">
                {parsed && input && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl p-3"
                    style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                    <p className="text-[9px] font-bold text-subtle uppercase tracking-wider mb-2">Preview</p>
                    <p className="text-[13px] font-bold text-foreground">{parsed.title || "Type your task…"}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {parsed.priority !== "MEDIUM" && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: PRIORITY_CONFIG[parsed.priority].bg, color: PRIORITY_CONFIG[parsed.priority].color }}>
                          {PRIORITY_CONFIG[parsed.priority].label}
                        </span>
                      )}
                      {parsed.dueDate && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"
                          style={{ background: "rgba(96,165,250,0.12)", color: "#60A5FA" }}>
                          <Clock className="w-2.5 h-2.5" />{format(new Date(parsed.dueDate), "MMM d")}
                        </span>
                      )}
                      {parsed.assigneeName && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"
                          style={{ background: "rgba(157,107,255,0.12)", color: "#9D6BFF" }}>
                          <AtSign className="w-2.5 h-2.5" />{parsed.assigneeName}
                        </span>
                      )}
                      {parsed.tags.map(t => (
                        <span key={t} className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"
                          style={{ background: "rgba(0,207,255,0.12)", color: "#00CFFF" }}>
                          <Hash className="w-2.5 h-2.5" />{t}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                )}

                <div>
                  <p className="text-[9px] font-bold text-subtle uppercase tracking-wider mb-2">Project *</p>
                  <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto">
                    {projects.map(p => (
                      <button key={p.id} onClick={() => setSelectedProject(p.id)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-semibold transition-all text-left"
                        style={{
                          background: selectedProject === p.id ? "var(--accent-muted)" : "var(--bg-elevated)",
                          border: `1px solid ${selectedProject === p.id ? "var(--accent)" : "var(--border)"}`,
                          color: selectedProject === p.id ? "var(--accent)" : "var(--text-muted)",
                        }}>
                        <div className="w-2 h-2 rounded-sm shrink-0" style={{ background: p.color }} />
                        <span className="truncate">{p.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ borderTop: "1px solid var(--border)", paddingTop: "0.75rem" }}>
                  <p className="text-[9px] text-subtle mb-1.5">Syntax:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[["@name","Assign"],["!high","Priority"],["by friday","Due date"],["#tag","Tag"]].map(([s,l]) => (
                      <span key={s} className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                        style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-subtle)" }}>
                        {s} = {l}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── ASK COLLIQ MODE ── */}
            {mode === "ask-colliq" && (
              <div className="p-4 space-y-4">
                {!input && !aiResponse && (
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--text-subtle)" }}>Try asking</p>
                    <div className="space-y-1.5">
                      {COLLIQ_SUGGESTIONS.map(s => (
                        <button key={s} onClick={() => { setInput(s); setTimeout(() => inputRef.current?.focus(), 40); }}
                          className="w-full text-left px-3 py-2.5 rounded-xl text-[12px] font-medium transition-colors"
                          style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(236,72,153,0.3)"; (e.currentTarget as HTMLElement).style.color = "var(--text-foreground)"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}>
                          <Sparkles className="w-3 h-3 inline-block mr-2 shrink-0" style={{ color: "#EC4899" }} />
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <AnimatePresence>
                  {(aiResponse || aiStreaming) && (
                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl p-4 max-h-[280px] overflow-y-auto"
                      style={{ background: "var(--bg-elevated)", border: "1px solid rgba(236,72,153,0.2)" }}>
                      <div className="flex items-center gap-2 mb-2.5">
                        <div className="w-5 h-5 rounded-lg flex items-center justify-center"
                          style={{ background: "linear-gradient(135deg, #EC4899, #9D6BFF)" }}>
                          <Sparkles className="w-2.5 h-2.5 text-white" />
                        </div>
                        <span className="text-[11px] font-bold" style={{ color: "var(--text-foreground)" }}>Colliq</span>
                        {aiStreaming && (
                          <span className="text-[10px] animate-pulse" style={{ color: "#EC4899" }}>thinking…</span>
                        )}
                      </div>
                      {aiResponse ? (
                        <div className="text-[13px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
                          <MarkdownRenderer content={aiResponse} />
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          {[0,1,2].map(i => (
                            <motion.div key={i} className="w-1.5 h-1.5 rounded-full"
                              style={{ background: "#EC4899" }}
                              animate={{ scale: [1,1.5,1], opacity: [0.4,1,0.4] }}
                              transition={{ duration: 0.75, delay: i * 0.18, repeat: Infinity }} />
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center gap-3 px-4 py-2.5" style={{ borderTop: "1px solid var(--border)", background: "var(--bg-elevated)" }}>
              {mode === "create-task" && (
                <>
                  <button onClick={createTask} disabled={creating || !input.trim() || !selectedProject}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-[11px] font-bold text-white disabled:opacity-40"
                    style={{ background: "var(--accent)" }}>
                    {creating ? "Creating…" : "Create Task"}
                  </button>
                  <span className="text-[10px]" style={{ color: "var(--text-subtle)" }}>↵ Enter to create</span>
                </>
              )}
              {mode === "search" && (
                <span className="text-[10px]" style={{ color: "var(--text-subtle)" }}>↵ to navigate</span>
              )}
              {mode === "ask-colliq" && (
                <span className="text-[10px]" style={{ color: "var(--text-subtle)" }}>↵ to ask Colliq</span>
              )}
              <div className="ml-auto flex items-center gap-3">
                <span className="text-[10px]" style={{ color: "var(--text-subtle)" }}>Tab to switch modes</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
