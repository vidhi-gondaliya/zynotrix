"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Command, Search, Plus, FolderKanban, CheckSquare, Calendar,
  MessageSquare, LayoutDashboard, Bot, Zap, User, ArrowRight,
  Clock, AlertTriangle, Sparkles, X, Hash, AtSign,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { parseTask } from "@/lib/nlp-parser";
import { format } from "date-fns";
import toast from "react-hot-toast";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  projects?: { id: string; name: string; color: string }[];
}

type Mode = "search" | "create-task";

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard",       href: "/dashboard",     kbd: "G D" },
  { icon: FolderKanban,    label: "Projects",        href: "/projects",      kbd: "G P" },
  { icon: CheckSquare,     label: "My Tasks",        href: "/tasks",         kbd: "G T" },
  { icon: Calendar,        label: "Meetings",        href: "/meetings",      kbd: "G M" },
  { icon: MessageSquare,   label: "Team Chat",       href: "/chat",          kbd: "" },
  { icon: Bot,             label: "AI Assistant",    href: "/ai/assistant",  kbd: "" },
  { icon: User,            label: "Admin Panel",     href: "/admin",         kbd: "" },
];

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  URGENT: { label: "Urgent", color: "#FF4466", bg: "rgba(255,68,102,0.12)" },
  HIGH:   { label: "High",   color: "#FFC107", bg: "rgba(255,193,7,0.12)" },
  MEDIUM: { label: "Medium", color: "#60A5FA", bg: "rgba(96,165,250,0.12)" },
  LOW:    { label: "Low",    color: "#6B7280", bg: "rgba(107,114,128,0.12)" },
};

export function CommandPalette({ open, onClose, projects = [] }: CommandPaletteProps) {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<Mode>("search");
  const [creating, setCreating] = useState(false);
  const [selectedProject, setSelectedProject] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Debounce NLP parse: only recompute 80ms after user stops typing
  const [debouncedInput, setDebouncedInput] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedInput(input), 80);
    return () => clearTimeout(t);
  }, [input]);

  const parsed = mode === "create-task" ? parseTask(debouncedInput) : null;
  // Keep a ref to always-current parsed/selectedProject so handleKey never captures stale values
  const parsedRef = useRef(parsed);
  const selectedProjectRef = useRef(selectedProject);
  parsedRef.current = parsed;
  selectedProjectRef.current = selectedProject;

  useEffect(() => {
    if (open) {
      setInput("");
      setMode("search");
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [open]);

  const handleKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") { onClose(); return; }
    if (e.key === "Enter" && mode === "create-task") { e.preventDefault(); createTask(); return; }
    if (e.key === "Tab" && mode === "search") { e.preventDefault(); setMode("create-task"); return; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, onClose]);

  const createTask = async () => {
    const p = parsedRef.current;
    const proj = selectedProjectRef.current;
    if (!p || !p.title || !proj) {
      if (!proj) { toast.error("Select a project first"); return; }
      return;
    }
    setCreating(true);
    try {
      const res = await fetch(`/api/projects/${proj}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: p.title,
          status: "TODO",
          priority: p.priority,
          dueDate: p.dueDate ? new Date(p.dueDate).toISOString() : undefined,
          tags: p.tags,
        }),
      });
      if (res.ok) {
        toast.success("Task created!", { icon: "✓" });
        onClose();
        router.refresh();
      }
    } finally { setCreating(false); }
  };

  const navigate = (href: string) => { router.push(href); onClose(); };

  const filteredNav = input
    ? NAV_ITEMS.filter((i) => i.label.toLowerCase().includes(input.toLowerCase()))
    : NAV_ITEMS;

  const filteredProjects = input && mode === "search"
    ? projects.filter((p) => p.name.toLowerCase().includes(input.toLowerCase()))
    : projects.slice(0, 5);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[999] flex items-start justify-center pt-[14vh] px-4"
          onClick={onClose}>
          {/* Backdrop */}
          <motion.div className="absolute inset-0"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{ background: "rgba(5,5,15,0.82)", backdropFilter: "blur(10px)" }} />

          {/* Palette */}
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-[560px] rounded-2xl overflow-hidden z-10"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-strong)",
              boxShadow: "0 32px 96px rgba(0,0,0,0.9), 0 0 0 1px rgba(157,107,255,0.15)",
            }}
            onClick={(e) => e.stopPropagation()}>

            {/* Mode toggle */}
            <div className="flex items-center gap-2 px-3 pt-3 pb-2">
              <button
                onClick={() => { setMode("search"); setInput(""); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  mode === "search" ? "text-accent bg-accent-muted" : "text-muted hover:text-foreground hover:bg-elevated"
                }`}>
                <Search className="w-3 h-3" /> Search
              </button>
              <button
                onClick={() => { setMode("create-task"); setInput(""); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  mode === "create-task" ? "text-accent bg-accent-muted" : "text-muted hover:text-foreground hover:bg-elevated"
                }`}>
                <Plus className="w-3 h-3" /> Quick Task
              </button>
              <span className="ml-auto text-[10px] text-subtle">Tab to switch</span>
            </div>

            {/* Input */}
            <div className="flex items-center gap-3 px-4 pb-3" style={{ borderBottom: "1px solid var(--border)" }}>
              <div className="flex items-center justify-center text-subtle">
                {mode === "create-task" ? <Zap className="w-4 h-4 text-accent" /> : <Search className="w-4 h-4" />}
              </div>
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder={mode === "create-task"
                  ? "Review PR @sarah by friday !high #backend"
                  : "Search pages, projects, tasks…"}
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-subtle outline-none font-medium py-1"
              />
              {input && (
                <button onClick={() => setInput("")} className="text-subtle hover:text-muted transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* SEARCH MODE */}
            {mode === "search" && (
              <div className="max-h-[380px] overflow-y-auto">
                {/* Quick actions */}
                {!input && (
                  <div className="px-4 pt-3 pb-1">
                    <p className="text-[9px] font-bold text-subtle uppercase tracking-widest mb-2">Quick Actions</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { label: "New Task",    icon: Plus,        action: () => setMode("create-task"), color: "#9D6BFF" },
                        { label: "New Project", icon: FolderKanban,action: () => navigate("/projects/new"), color: "#00CFFF" },
                        { label: "AI Assistant",icon: Sparkles,    action: () => navigate("/ai/assistant"), color: "#FF4466" },
                        { label: "Schedule Meeting", icon: Calendar, action: () => navigate("/meetings/new"), color: "#FFC107" },
                      ].map(({ label, icon: Icon, action, color }) => (
                        <button key={label} onClick={action}
                          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-muted hover:text-foreground hover:bg-elevated transition-colors text-left"
                          style={{ border: "1px solid var(--border)" }}>
                          <Icon className="w-3.5 h-3.5 shrink-0" style={{ color }} />
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Navigation */}
                <div className="px-4 pt-3 pb-1">
                  {!input && <p className="text-[9px] font-bold text-subtle uppercase tracking-widest mb-1.5">Navigate</p>}
                  <div className="space-y-0.5">
                    {filteredNav.map(({ icon: Icon, label, href, kbd }) => (
                      <button key={href} onClick={() => navigate(href)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted hover:text-foreground hover:bg-elevated transition-colors text-left group">
                        <Icon className="w-4 h-4 shrink-0 text-subtle group-hover:text-accent transition-colors" />
                        <span className="flex-1">{label}</span>
                        {kbd && <span className="text-[9px] text-subtle hidden group-hover:block">{kbd}</span>}
                        <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Projects */}
                {filteredProjects.length > 0 && (
                  <div className="px-4 pt-3 pb-3">
                    <p className="text-[9px] font-bold text-subtle uppercase tracking-widest mb-1.5">Projects</p>
                    <div className="space-y-0.5">
                      {filteredProjects.map((p) => (
                        <button key={p.id} onClick={() => navigate(`/projects/${p.id}/board`)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted hover:text-foreground hover:bg-elevated transition-colors text-left">
                          <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: p.color }} />
                          {p.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* CREATE TASK MODE */}
            {mode === "create-task" && (
              <div className="p-4 space-y-4">
                {/* Parsed preview */}
                {parsed && input && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl p-3 space-y-2"
                    style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                    <p className="text-xs font-semibold text-muted uppercase tracking-wider">Preview</p>
                    <p className="text-sm font-bold text-foreground">{parsed.title || "Type your task…"}</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {parsed.priority !== "MEDIUM" && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: PRIORITY_CONFIG[parsed.priority].bg, color: PRIORITY_CONFIG[parsed.priority].color }}>
                          {PRIORITY_CONFIG[parsed.priority].label}
                        </span>
                      )}
                      {parsed.dueDate && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"
                          style={{ background: "rgba(96,165,250,0.12)", color: "#60A5FA" }}>
                          <Clock className="w-2.5 h-2.5" />
                          {format(new Date(parsed.dueDate), "MMM d")}
                        </span>
                      )}
                      {parsed.assigneeName && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"
                          style={{ background: "rgba(157,107,255,0.12)", color: "#9D6BFF" }}>
                          <AtSign className="w-2.5 h-2.5" />
                          {parsed.assigneeName}
                        </span>
                      )}
                      {parsed.tags.map((t) => (
                        <span key={t} className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"
                          style={{ background: "rgba(0,207,255,0.12)", color: "#00CFFF" }}>
                          <Hash className="w-2.5 h-2.5" />
                          {t}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Project picker */}
                <div>
                  <p className="text-[10px] font-bold text-subtle uppercase tracking-wider mb-2">Project *</p>
                  <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto">
                    {projects.map((p) => (
                      <button key={p.id} onClick={() => setSelectedProject(p.id)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left"
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

                {/* Hints */}
                <div className="pt-1" style={{ borderTop: "1px solid var(--border)" }}>
                  <p className="text-[10px] text-subtle mb-2">Syntax hints:</p>
                  <div className="flex flex-wrap gap-2">
                    {[["@name","Assign"],["#project","Project"],["!high","Priority"],["by friday","Due date"],["!urgent","Urgent"]].map(([s,l]) => (
                      <span key={s} className="text-[9px] font-mono px-1.5 py-0.5 rounded text-subtle"
                        style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                        {s} = {l}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center gap-3 px-4 py-2.5" style={{ borderTop: "1px solid var(--border)", background: "var(--bg-elevated)" }}>
              {mode === "create-task" ? (
                <>
                  <button onClick={createTask} disabled={creating || !input.trim() || !selectedProject}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-40"
                    style={{ background: "var(--accent)" }}>
                    {creating ? "Creating…" : "Create Task"}
                  </button>
                  <span className="text-[10px] text-subtle">↵ Enter to create</span>
                </>
              ) : (
                <span className="text-[10px] text-subtle">↵ Enter to navigate · Tab for quick task</span>
              )}
              <span className="ml-auto text-[10px] text-subtle">Esc to close</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
