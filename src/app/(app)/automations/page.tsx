"use client";
import { useEffect, useState } from "react";
import {
  Zap, Plus, Loader2, Trash2, ToggleLeft, ToggleRight,
  CheckCircle2, Clock, Sparkles, ArrowRight, ChevronDown, ChevronUp,
  AlertCircle, FolderKanban, Columns3,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

interface Automation {
  id: string; name: string; description: string | null; rule: string;
  trigger: string; action: string; isActive: boolean; runCount: number;
  lastRunAt: string | null; createdAt: string;
  runs: { id: string; status: string; triggeredAt: string }[];
}

interface Project { id: string; name: string; color: string; boardConfig: string | null; }
interface BoardColumn { id: string; label: string; color: string; }

const TRIGGER_EXAMPLES = [
  "When a task is marked done, send me a notification",
  "Every Monday morning, generate a standup summary",
  "When a team member has more than 10 tasks, alert me",
  "When a task is overdue, change its priority to URGENT",
  "When a PR is merged, move the linked task to Done",
  "Every Friday, create a weekly review task for me",
  "When project health drops below 50, notify the team",
  "When a new task is created without an assignee, assign it to me",
];

function TriggerChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full font-medium"
      style={{ background: "var(--accent-muted)", color: "var(--accent)" }}>
      <Zap className="w-2.5 h-2.5" />{label}
    </span>
  );
}

function ActionChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full font-medium"
      style={{ background: "rgba(0,207,255,0.10)", color: "#00CFFF" }}>
      <ArrowRight className="w-2.5 h-2.5" />{label}
    </span>
  );
}

function AutomationCard({ auto, onToggle, onDelete }: {
  auto: Automation;
  onToggle: (id: string, val: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  let trigger: { type: string } = { type: "" };
  let action:  { type: string } = { type: "" };
  try { trigger = JSON.parse(auto.trigger); } catch {}
  try { action  = JSON.parse(auto.action);  } catch {}

  return (
    <motion.div layout className="rounded-2xl overflow-hidden transition-all"
      style={{
        background: "var(--bg-card)", border: `1px solid ${auto.isActive ? "var(--border)" : "var(--border-subtle)"}`,
        boxShadow: "var(--shadow-xs)", opacity: auto.isActive ? 1 : 0.6,
      }}>
      <div className="flex items-start gap-4 p-4">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
          style={{ background: auto.isActive ? "linear-gradient(135deg,#9D6BFF,#00CFFF)" : "var(--bg-elevated)" }}>
          <Zap className="w-4 h-4" style={{ color: auto.isActive ? "white" : "var(--text-muted)" }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold" style={{ color: "var(--text-foreground)" }}>{auto.name}</h3>
              {auto.description && <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{auto.description}</p>}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button onClick={() => onToggle(auto.id, !auto.isActive)}
                className="transition-colors" style={{ color: auto.isActive ? "#00F090" : "var(--text-subtle)" }}>
                {auto.isActive ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
              </button>
              <button onClick={() => onDelete(auto.id)}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                style={{ color: "var(--text-subtle)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#FF4466"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-subtle)"; }}>
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <TriggerChip label={trigger.type?.replace(/_/g, " ") || "trigger"} />
            <ArrowRight className="w-3 h-3" style={{ color: "var(--text-subtle)" }} />
            <ActionChip label={action.type?.replace(/_/g, " ") || "action"} />
          </div>

          <div className="flex items-center gap-4 mt-3">
            <span className="flex items-center gap-1 text-[10px]" style={{ color: "var(--text-muted)" }}>
              <CheckCircle2 className="w-3 h-3" style={{ color: "#00F090" }} /> {auto.runCount} runs
            </span>
            {auto.lastRunAt && (
              <span className="flex items-center gap-1 text-[10px]" style={{ color: "var(--text-muted)" }}>
                <Clock className="w-3 h-3" /> Last: {new Date(auto.lastRunAt).toLocaleDateString()}
              </span>
            )}
            <button onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-[10px] font-bold ml-auto transition-colors"
              style={{ color: "var(--accent)" }}>
              Rule {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          <AnimatePresence>
            {expanded && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden">
                <div className="mt-3 px-3 py-2 rounded-xl text-xs italic"
                  style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}>
                  "{auto.rule}"
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

export default function AutomationsPage() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [projects, setProjects]       = useState<Project[]>([]);
  const [loading, setLoading]         = useState(true);
  const [creating, setCreating]       = useState(false);
  const [rule, setRule]               = useState("");
  const [showCreate, setShowCreate]   = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [customStatuses, setCustomStatuses]        = useState<BoardColumn[]>([]);
  const [createError, setCreateError]              = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/automations").then((r) => r.json()),
      fetch("/api/projects").then((r) => r.json()),
    ]).then(([autos, projs]) => {
      setAutomations(Array.isArray(autos) ? autos : []);
      setProjects(Array.isArray(projs) ? projs : []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // Parse custom statuses from selected project's boardConfig
  useEffect(() => {
    if (!selectedProjectId) { setCustomStatuses([]); return; }
    const project = projects.find((p) => p.id === selectedProjectId);
    if (!project?.boardConfig) { setCustomStatuses([]); return; }
    try {
      const cfg = JSON.parse(project.boardConfig) as { columns?: BoardColumn[] };
      setCustomStatuses(cfg.columns ?? []);
    } catch { setCustomStatuses([]); }
  }, [selectedProjectId, projects]);

  async function create() {
    if (!rule.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/automations", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rule,
          projectId: selectedProjectId || null,
          customStatuses: customStatuses.length ? customStatuses.map((c) => ({ id: c.id, label: c.label })) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Show inline error — don't clear the rule so user can fix it
        setCreateError(data.error ?? "Could not parse this rule. Try rephrasing it.");
        return;
      }
      setAutomations((prev) => [data, ...prev]);
      setRule(""); setShowCreate(false); setCreateError(null);
      toast.success("Automation created!");
    } catch {
      setCreateError("Network error — please try again.");
    } finally { setCreating(false); }
  }

  async function toggle(id: string, isActive: boolean) {
    setAutomations((prev) => prev.map((a) => a.id === id ? { ...a, isActive } : a));
    await fetch(`/api/automations/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive }),
    });
  }

  async function remove(id: string) {
    setAutomations((prev) => prev.filter((a) => a.id !== id));
    await fetch(`/api/automations/${id}`, { method: "DELETE" });
    toast.success("Automation deleted");
  }

  const active   = automations.filter((a) => a.isActive);
  const inactive = automations.filter((a) => !a.isActive);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ color: "var(--text-foreground)" }}>Automations</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Write rules in plain English — AI handles the rest
          </p>
        </div>
        <button onClick={() => { setShowCreate(true); setCreateError(null); }}
          className="flex items-center gap-2 h-9 px-4 rounded-xl text-sm font-bold text-white transition-all"
          style={{ background: "linear-gradient(135deg,#9D6BFF,#00CFFF)", boxShadow: "0 4px 16px rgba(157,107,255,0.35)" }}>
          <Plus className="w-4 h-4" /> New Automation
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total",      value: automations.length,                                  color: "#9D6BFF" },
          { label: "Active",     value: active.length,                                        color: "#00F090" },
          { label: "Total Runs", value: automations.reduce((s, a) => s + a.runCount, 0),     color: "#00CFFF" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl p-4 text-center"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-xs)" }}>
            <div className="text-2xl font-black mb-1" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Create rule panel */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="rounded-2xl p-5 space-y-4"
            style={{ background: "var(--bg-card)", border: "1px solid var(--accent)", boxShadow: "0 0 0 3px var(--accent-muted), var(--shadow-sm)" }}>

            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" style={{ color: "var(--accent)" }} />
              <h3 className="text-sm font-black" style={{ color: "var(--text-foreground)" }}>New Automation Rule</h3>
            </div>

            {/* Optional project selector for custom statuses */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: "var(--text-subtle)" }}>
                Project context (optional — enables custom status names)
              </label>
              <div className="relative">
                <FolderKanban className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "var(--text-subtle)" }} />
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-xl text-sm outline-none"
                  style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-foreground)" }}
                >
                  <option value="">No specific project</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              {/* Show custom statuses when project selected */}
              {customStatuses.length > 0 && (
                <div className="mt-2">
                  <p className="text-[9px] font-black uppercase tracking-widest mb-1.5 flex items-center gap-1" style={{ color: "var(--text-subtle)" }}>
                    <Columns3 className="w-2.5 h-2.5" /> Available statuses for this project
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {customStatuses.map((col) => (
                      <span
                        key={col.id}
                        className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full cursor-pointer transition-all"
                        style={{ background: `${col.color}18`, color: col.color, border: `1px solid ${col.color}30` }}
                        onClick={() => setRule((r) => r + (r ? " " : "") + `"${col.label}"`)}
                        title="Click to insert into rule"
                      >
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: col.color }} />
                        {col.label}
                      </span>
                    ))}
                  </div>
                  <p className="text-[9px] mt-1" style={{ color: "var(--text-subtle)" }}>Click a status chip to insert it into your rule</p>
                </div>
              )}
            </div>

            {/* Rule textarea */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: "var(--text-subtle)" }}>
                Rule (plain English)
              </label>
              <textarea
                value={rule}
                onChange={(e) => { setRule(e.target.value); setCreateError(null); }}
                placeholder='e.g. "When a task is overdue, change priority to URGENT and notify me"'
                rows={3}
                className="w-full rounded-xl px-4 py-3 text-sm resize-none focus:outline-none"
                style={{
                  background: "var(--bg-elevated)",
                  border: `1px solid ${createError ? "var(--danger)" : "var(--border)"}`,
                  color: "var(--text-foreground)",
                }}
                onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) create(); }}
              />
            </div>

            {/* Inline error message */}
            <AnimatePresence>
              {createError && (
                <motion.div
                  initial={{ opacity: 0, y: -4, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -4, height: 0 }}
                  className="flex items-start gap-2.5 px-3 py-3 rounded-xl overflow-hidden"
                  style={{ background: "var(--danger-muted)", border: "1px solid rgba(220,38,38,0.25)" }}
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "var(--danger)" }} />
                  <div>
                    <p className="text-xs font-bold" style={{ color: "var(--danger)" }}>Could not create automation</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{createError}</p>
                    <p className="text-[10px] mt-1.5 font-semibold" style={{ color: "var(--text-subtle)" }}>
                      Try rephrasing — be specific about the trigger condition and the action to take.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Example chips */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-subtle)" }}>Try these</p>
              <div className="flex flex-wrap gap-2">
                {TRIGGER_EXAMPLES.slice(0, 4).map((ex, i) => (
                  <button key={i} onClick={() => { setRule(ex); setCreateError(null); }}
                    className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                    style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}
                    onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.color = "var(--text-foreground)"}
                    onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"}>
                    {ex}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button onClick={() => { setShowCreate(false); setRule(""); setCreateError(null); }}
                className="text-sm transition-colors" style={{ color: "var(--text-muted)" }}
                onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.color = "var(--text-foreground)"}
                onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"}>
                Cancel
              </button>
              <button onClick={create} disabled={!rule.trim() || creating}
                className="flex items-center gap-2 h-9 px-5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
                style={{ background: "linear-gradient(135deg,#9D6BFF,#00CFFF)" }}>
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                {creating ? "Parsing rule…" : "Create Rule"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Automation list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 skeleton rounded-2xl" />)}
        </div>
      ) : automations.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto"
            style={{ background: "var(--accent-muted)" }}>
            <Zap className="w-7 h-7" style={{ color: "var(--accent)" }} />
          </div>
          <p className="text-sm font-bold" style={{ color: "var(--text-foreground)" }}>No automations yet</p>
          <p className="text-xs max-w-xs mx-auto" style={{ color: "var(--text-muted)" }}>
            Write a rule in plain English and AI will set it up automatically
          </p>
          <button onClick={() => setShowCreate(true)}
            className="mt-2 flex items-center gap-2 h-9 px-5 rounded-xl text-sm font-bold text-white mx-auto transition-all"
            style={{ background: "linear-gradient(135deg,#9D6BFF,#00CFFF)", boxShadow: "0 4px 16px rgba(157,107,255,0.35)" }}>
            <Plus className="w-4 h-4" /> Create First Automation
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {active.length > 0 && (
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "var(--text-subtle)" }}>Active ({active.length})</p>
              {active.map((a) => <AutomationCard key={a.id} auto={a} onToggle={toggle} onDelete={remove} />)}
            </div>
          )}
          {inactive.length > 0 && (
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "var(--text-subtle)" }}>Paused ({inactive.length})</p>
              {inactive.map((a) => <AutomationCard key={a.id} auto={a} onToggle={toggle} onDelete={remove} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
