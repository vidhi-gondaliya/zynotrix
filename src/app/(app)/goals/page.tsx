"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Target, X, ChevronDown, ChevronUp, Trash2, Edit3, CheckCircle2, AlertTriangle, TrendingDown, Calendar, Loader2 } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { format, isPast } from "date-fns";
import toast from "react-hot-toast";
import { getApiError } from "@/lib/api-error";

interface KeyResult {
  id: string; goalId: string; title: string; unit: string | null;
  targetValue: number; currentValue: number; dueDate: string | null;
}
interface Owner { id: string; name: string | null; image: string | null; email: string; }
interface Goal {
  id: string; title: string; description: string | null;
  type: "COMPANY" | "TEAM" | "PERSONAL"; status: string;
  dueDate: string | null; owner: Owner; keyResults: KeyResult[];
  _count: { keyResults: number; childGoals: number };
}

const TYPE_CONFIG = {
  COMPANY:  { label: "Company",  color: "#7C3AED", bg: "#7C3AED18" },
  TEAM:     { label: "Team",     color: "#2563EB", bg: "#2563EB18" },
  PERSONAL: { label: "Personal", color: "#059669", bg: "#05966918" },
};
const STATUS_CONFIG = {
  ON_TRACK:  { label: "On Track",  color: "#16A34A", icon: CheckCircle2  },
  AT_RISK:   { label: "At Risk",   color: "#D97706", icon: AlertTriangle  },
  OFF_TRACK: { label: "Off Track", color: "#DC2626", icon: TrendingDown   },
  COMPLETED: { label: "Completed", color: "#7C3AED", icon: CheckCircle2  },
};

function goalProgress(krs: KeyResult[]): number {
  if (!krs.length) return 0;
  const sum = krs.reduce((acc, kr) => {
    const pct = kr.targetValue > 0 ? Math.min(kr.currentValue / kr.targetValue, 1) : 0;
    return acc + pct;
  }, 0);
  return Math.round((sum / krs.length) * 100);
}

function ProgressRing({ pct, color }: { pct: number; color: string }) {
  const r = 22, circ = 2 * Math.PI * r;
  const dash = ((100 - pct) / 100) * circ;
  return (
    <svg width={54} height={54} style={{ flexShrink: 0 }}>
      <circle cx={27} cy={27} r={r} fill="none" stroke="var(--bg-elevated)" strokeWidth={4} />
      <circle cx={27} cy={27} r={r} fill="none" stroke={color} strokeWidth={4}
        strokeDasharray={circ} strokeDashoffset={dash}
        strokeLinecap="round" transform="rotate(-90 27 27)"
        style={{ transition: "stroke-dashoffset 0.6s ease" }} />
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle"
        fill={color} fontSize="11" fontWeight="800">{pct}%</text>
    </svg>
  );
}

function KRSlider({ kr, onChange }: { kr: KeyResult; onChange: (id: string, val: number) => void }) {
  const pct = kr.targetValue > 0 ? Math.round((kr.currentValue / kr.targetValue) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium" style={{ color: "var(--text-foreground)" }}>{kr.title}</span>
          <span className="text-xs font-bold tabular-nums" style={{ color: "var(--accent)" }}>
            {kr.currentValue}{kr.unit ?? ""} / {kr.targetValue}{kr.unit ?? ""}
          </span>
        </div>
        <div className="relative h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
          <motion.div className="absolute inset-y-0 left-0 rounded-full"
            animate={{ width: `${pct}%` }} transition={{ duration: 0.5 }}
            style={{ background: pct >= 100 ? "#16A34A" : pct >= 60 ? "var(--accent)" : "#D97706" }} />
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={() => onChange(kr.id, Math.max(0, kr.currentValue - 1))}
          className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold hover:bg-elevated transition-colors"
          style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}>−</button>
        <button onClick={() => onChange(kr.id, Math.min(kr.targetValue, kr.currentValue + 1))}
          className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold hover:bg-elevated transition-colors"
          style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}>+</button>
      </div>
    </div>
  );
}

function GoalCard({ goal, onUpdate, onDelete }: {
  goal: Goal;
  onUpdate: (id: string, data: Partial<Goal>) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [krs, setKrs] = useState<KeyResult[]>(goal.keyResults);
  const [addingKR, setAddingKR] = useState(false);
  const [krTitle, setKrTitle] = useState("");
  const [krTarget, setKrTarget] = useState("100");
  const [krUnit, setKrUnit] = useState("");

  const pct    = goalProgress(krs);
  const type   = TYPE_CONFIG[goal.type] ?? TYPE_CONFIG.COMPANY;
  const status = STATUS_CONFIG[goal.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.ON_TRACK;
  const StatusIcon = status.icon;
  const overdue = goal.dueDate && isPast(new Date(goal.dueDate)) && goal.status !== "COMPLETED";

  const handleKRChange = async (krId: string, val: number) => {
    setKrs((prev) => prev.map((k) => k.id === krId ? { ...k, currentValue: val } : k));
    await fetch(`/api/goals/${goal.id}/key-results`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: krId, currentValue: val }),
    });
  };

  const handleAddKR = async () => {
    if (!krTitle.trim()) return;
    const res = await fetch(`/api/goals/${goal.id}/key-results`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: krTitle.trim(), targetValue: parseFloat(krTarget) || 100, unit: krUnit || null }),
    });
    if (!res.ok) { toast.error(await getApiError(res, "Failed to add key result")); return; }
    const kr = await res.json();
    setKrs((prev) => [...prev, kr]);
    setKrTitle(""); setKrTarget("100"); setKrUnit(""); setAddingKR(false);
  };

  const handleDeleteKR = async (krId: string) => {
    await fetch(`/api/goals/${goal.id}/key-results`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: krId }),
    });
    setKrs((prev) => prev.filter((k) => k.id !== krId));
  };

  const cycleStatus = async () => {
    const order: (keyof typeof STATUS_CONFIG)[] = ["ON_TRACK", "AT_RISK", "OFF_TRACK", "COMPLETED"];
    const next = order[(order.indexOf(goal.status as keyof typeof STATUS_CONFIG) + 1) % order.length];
    const res = await fetch(`/api/goals/${goal.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (res.ok) onUpdate(goal.id, { status: next });
  };

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>
      {/* Top accent bar */}
      <div style={{ height: 3, background: type.color }} />

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start gap-3 mb-4">
          <ProgressRing pct={pct} color={type.color} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-[10px] font-800 px-2 py-0.5 rounded-full uppercase tracking-wider"
                style={{ background: type.bg, color: type.color, fontWeight: 700 }}>
                {type.label}
              </span>
              <button onClick={cycleStatus}
                className="flex items-center gap-1 text-[10px] font-700 px-2 py-0.5 rounded-full transition-opacity hover:opacity-70"
                style={{ background: `${status.color}18`, color: status.color, fontWeight: 700 }}>
                <StatusIcon className="w-3 h-3" />
                {status.label}
              </button>
              {overdue && (
                <span className="text-[10px] font-700 px-2 py-0.5 rounded-full"
                  style={{ background: "#DC262618", color: "#DC2626", fontWeight: 700 }}>Overdue</span>
              )}
            </div>
            <h3 className="font-800 text-sm leading-snug" style={{ color: "var(--text-foreground)", fontWeight: 800 }}>
              {goal.title}
            </h3>
            {goal.description && (
              <p className="text-xs mt-1 line-clamp-2" style={{ color: "var(--text-muted)" }}>{goal.description}</p>
            )}
          </div>
          <button onClick={() => onDelete(goal.id)}
            className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:opacity-100 transition-all"
            style={{ color: "var(--text-subtle)", background: "var(--bg-elevated)" }}>
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <Avatar name={goal.owner.name} image={goal.owner.image} size="xs" />
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>{goal.owner.name}</span>
          {goal.dueDate && (
            <div className="flex items-center gap-1 text-xs" style={{ color: overdue ? "#DC2626" : "var(--text-muted)" }}>
              <Calendar className="w-3 h-3" />
              {format(new Date(goal.dueDate), "MMM d, yyyy")}
            </div>
          )}
          <span className="text-xs ml-auto" style={{ color: "var(--text-muted)" }}>
            {krs.length} key result{krs.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Overall progress bar */}
        <div className="h-1.5 rounded-full overflow-hidden mb-3" style={{ background: "var(--bg-elevated)" }}>
          <motion.div className="h-full rounded-full"
            animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }}
            style={{ background: pct >= 100 ? "#16A34A" : type.color, boxShadow: `0 0 8px ${type.color}60` }} />
        </div>

        {/* Expand toggle */}
        <button onClick={() => setExpanded((e) => !e)}
          className="w-full flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-600 transition-colors"
          style={{ color: "var(--text-muted)", background: "var(--bg-elevated)", fontWeight: 600 }}>
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {expanded ? "Hide" : "Show"} Key Results
        </button>
      </div>

      {/* Key Results panel */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
            <div className="px-5 pb-5 pt-0 flex flex-col gap-3"
              style={{ borderTop: "1px solid var(--border)" }}>
              <div className="pt-3 flex flex-col gap-3">
                {krs.map((kr) => (
                  <div key={kr.id} className="group flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <KRSlider kr={kr} onChange={handleKRChange} />
                    </div>
                    <button onClick={() => handleDeleteKR(kr.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1"
                      style={{ color: "var(--text-subtle)" }}>
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>

              {addingKR ? (
                <div className="flex flex-col gap-2 p-3 rounded-xl" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                  <input value={krTitle} onChange={(e) => setKrTitle(e.target.value)}
                    placeholder="Key result title…"
                    className="text-xs bg-transparent outline-none w-full"
                    style={{ color: "var(--text-foreground)" }} />
                  <div className="flex gap-2">
                    <input value={krTarget} onChange={(e) => setKrTarget(e.target.value)}
                      placeholder="Target (100)" type="number"
                      className="text-xs bg-transparent outline-none w-20 border rounded px-2 py-1"
                      style={{ color: "var(--text-foreground)", borderColor: "var(--border)" }} />
                    <input value={krUnit} onChange={(e) => setKrUnit(e.target.value)}
                      placeholder="Unit (%,$,…)"
                      className="text-xs bg-transparent outline-none w-20 border rounded px-2 py-1"
                      style={{ color: "var(--text-foreground)", borderColor: "var(--border)" }} />
                    <button onClick={handleAddKR}
                      className="ml-auto text-xs font-700 px-3 py-1 rounded-lg"
                      style={{ background: "var(--accent)", color: "#fff", fontWeight: 700 }}>Add</button>
                    <button onClick={() => setAddingKR(false)}
                      className="text-xs px-2 py-1 rounded-lg"
                      style={{ color: "var(--text-muted)", background: "var(--border)" }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setAddingKR(true)}
                  className="flex items-center gap-2 text-xs py-2 rounded-lg transition-colors"
                  style={{ color: "var(--accent)" }}>
                  <Plus className="w-3.5 h-3.5" /> Add Key Result
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function GoalsPage() {
  const [goals, setGoals]         = useState<Goal[]>([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState<"ALL" | "COMPANY" | "TEAM" | "PERSONAL">("ALL");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm]           = useState({ title: "", description: "", type: "COMPANY", dueDate: "" });
  const [saving, setSaving]       = useState(false);

  useEffect(() => {
    fetch("/api/goals").then((r) => r.json()).then(setGoals).catch(console.error).finally(() => setLoading(false));
  }, []);

  const filtered = filter === "ALL" ? goals : goals.filter((g) => g.type === filter);

  const stats = {
    total:     goals.length,
    onTrack:   goals.filter((g) => g.status === "ON_TRACK").length,
    atRisk:    goals.filter((g) => g.status === "AT_RISK").length,
    completed: goals.filter((g) => g.status === "COMPLETED").length,
  };

  const handleCreate = async () => {
    if (!form.title.trim()) { toast.error("Goal title is required."); return; }
    setSaving(true);
    const res = await fetch("/api/goals", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) { toast.error(await getApiError(res, "Failed to create goal")); return; }
    const goal = await res.json();
    setGoals((prev) => [goal, ...prev]);
    setShowModal(false);
    setForm({ title: "", description: "", type: "COMPANY", dueDate: "" });
    toast.success("Goal created!");
  };

  const handleUpdate = (id: string, data: Partial<Goal>) => {
    setGoals((prev) => prev.map((g) => g.id === id ? { ...g, ...data } : g));
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this goal? This cannot be undone.")) return;
    const res = await fetch(`/api/goals/${id}`, { method: "DELETE" });
    if (res.ok) { setGoals((prev) => prev.filter((g) => g.id !== id)); toast.success("Goal deleted."); }
    else toast.error(await getApiError(res, "Failed to delete goal"));
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight" style={{ color: "var(--text-foreground)", fontWeight: 900 }}>
            Goals & OKRs
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Connect your team's daily work to company objectives
          </p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-700 transition-all hover:opacity-90"
          style={{ background: "var(--accent)", color: "#fff", fontWeight: 700, boxShadow: "0 4px 14px var(--accent-glow)" }}>
          <Plus className="w-4 h-4" /> New Goal
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Goals",  val: stats.total,     color: "var(--accent)" },
          { label: "On Track",     val: stats.onTrack,   color: "#16A34A" },
          { label: "At Risk",      val: stats.atRisk,    color: "#D97706" },
          { label: "Completed",    val: stats.completed, color: "#7C3AED" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <div className="text-2xl font-900 tabular-nums" style={{ color: s.color, fontWeight: 900 }}>{s.val}</div>
            <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5">
        {(["ALL", "COMPANY", "TEAM", "PERSONAL"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className="px-3 py-1.5 rounded-lg text-xs font-700 transition-all"
            style={{
              fontWeight: 700,
              background: filter === f ? "var(--accent)" : "var(--bg-elevated)",
              color:      filter === f ? "#fff" : "var(--text-muted)",
            }}>
            {f === "ALL" ? "All" : TYPE_CONFIG[f].label}
          </button>
        ))}
      </div>

      {/* Goals grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--accent)" }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
            style={{ background: "var(--bg-elevated)" }}>🎯</div>
          <p className="font-700 text-sm" style={{ color: "var(--text-foreground)", fontWeight: 700 }}>No goals yet</p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Create your first goal to connect daily tasks to business outcomes
          </p>
          <button onClick={() => setShowModal(true)}
            className="mt-2 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-700"
            style={{ background: "var(--accent)", color: "#fff", fontWeight: 700 }}>
            <Plus className="w-4 h-4" /> Create Goal
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 group">
          {filtered.map((g) => (
            <GoalCard key={g.id} goal={g} onUpdate={handleUpdate} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {/* Create Goal Modal */}
      <AnimatePresence>
        {showModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="fixed inset-0 z-50" style={{ background: "rgba(0,0,0,0.5)" }} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="fixed z-50 rounded-2xl p-6 w-full max-w-md"
              style={{
                top: "50%", left: "50%", transform: "translate(-50%,-50%)",
                background: "var(--bg-card)", border: "1px solid var(--border)",
                boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
              }}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-800" style={{ fontWeight: 800, color: "var(--text-foreground)" }}>
                  Create Goal
                </h2>
                <button onClick={() => setShowModal(false)} style={{ color: "var(--text-muted)" }}>
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-700 mb-1" style={{ color: "var(--text-muted)", fontWeight: 700 }}>
                    Goal Title *
                  </label>
                  <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. Grow monthly revenue by 30%"
                    className="w-full text-sm rounded-xl px-3 py-2.5 outline-none"
                    style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-foreground)" }} />
                </div>
                <div>
                  <label className="block text-xs font-700 mb-1" style={{ color: "var(--text-muted)", fontWeight: 700 }}>
                    Description
                  </label>
                  <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Why does this goal matter?"
                    rows={2}
                    className="w-full text-sm rounded-xl px-3 py-2.5 outline-none resize-none"
                    style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-foreground)" }} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-700 mb-1" style={{ color: "var(--text-muted)", fontWeight: 700 }}>Type</label>
                    <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                      className="w-full text-sm rounded-xl px-3 py-2.5 outline-none"
                      style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-foreground)" }}>
                      <option value="COMPANY">Company</option>
                      <option value="TEAM">Team</option>
                      <option value="PERSONAL">Personal</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-700 mb-1" style={{ color: "var(--text-muted)", fontWeight: 700 }}>Due Date</label>
                    <input type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                      className="w-full text-sm rounded-xl px-3 py-2.5 outline-none"
                      style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-foreground)" }} />
                  </div>
                </div>

                <div className="flex gap-3 pt-1">
                  <button onClick={() => setShowModal(false)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-700"
                    style={{ background: "var(--bg-elevated)", color: "var(--text-muted)", fontWeight: 700 }}>
                    Cancel
                  </button>
                  <button onClick={handleCreate} disabled={saving}
                    className="flex-1 py-2.5 rounded-xl text-sm font-700 flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
                    style={{ background: "var(--accent)", color: "#fff", fontWeight: 700 }}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
                    Create Goal
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
