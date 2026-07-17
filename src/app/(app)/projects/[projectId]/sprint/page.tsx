"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, Plus, ChevronDown, ChevronUp, Play, CheckCircle2, Archive,
  Loader2, X, Grip, Target,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import toast from "react-hot-toast";

interface Task { id: string; title: string; status: string; priority: string; storyPoints: number | null; }
interface Sprint { id: string; name: string; goal: string | null; startDate: string; endDate: string; status: string; velocity: number | null; tasks: { task: Task }[]; }

const PRIORITY_COLOR: Record<string, string> = { URGENT: "#FF4466", HIGH: "#FFC107", MEDIUM: "#9D6BFF", LOW: "#6B7280" };
const STATUS_COLOR:   Record<string, string>  = { DONE: "#00F090", IN_PROGRESS: "#06B6D4", REVIEW: "#FFC107", TODO: "#9D6BFF", BACKLOG: "#6B7280" };

export default function SprintPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [sprints, setSprints]       = useState<Sprint[]>([]);
  const [backlog,  setBacklog]       = useState<Task[]>([]);
  const [loading,  setLoading]       = useState(true);
  const [expanded, setExpanded]      = useState<Record<string, boolean>>({});
  const [creating, setCreating]      = useState(false);
  const [form, setForm]              = useState({ name: "", goal: "", startDate: "", endDate: "" });

  const load = useCallback(async () => {
    const [sprintRes, taskRes] = await Promise.all([
      fetch(`/api/projects/${projectId}/sprints`).then((r) => r.json()),
      fetch(`/api/projects/${projectId}/tasks`).then((r) => r.json()),
    ]);
    const allSprints = sprintRes as Sprint[];
    setSprints(allSprints);
    const sprintTaskIds = new Set(allSprints.flatMap((s) => s.tasks.map((t) => t.task.id)));
    const allTasks: Task[] = (taskRes.tasks ?? taskRes);
    setBacklog(allTasks.filter((t) => !sprintTaskIds.has(t.id) && t.status !== "DONE"));
    const exp: Record<string, boolean> = {};
    allSprints.forEach((s) => { exp[s.id] = s.status !== "COMPLETED"; });
    setExpanded(exp);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  async function createSprint() {
    if (!form.name || !form.startDate || !form.endDate) return toast.error("Name, start, and end date required");
    const res = await fetch(`/api/projects/${projectId}/sprints`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) return toast.error("Failed to create sprint");
    toast.success("Sprint created");
    setCreating(false);
    setForm({ name: "", goal: "", startDate: "", endDate: "" });
    load();
  }

  async function moveTasks(sprintId: string, taskId: string, action: "add" | "remove") {
    await fetch(`/api/projects/${projectId}/sprints/${sprintId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(action === "add" ? { addTaskId: taskId } : { removeTaskId: taskId }),
    });
    load();
  }

  async function changeStatus(sprintId: string, status: string) {
    await fetch(`/api/projects/${projectId}/sprints/${sprintId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    toast.success(`Sprint ${status === "ACTIVE" ? "started" : status === "COMPLETED" ? "completed" : "updated"}`);
    load();
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-muted" />
    </div>
  );

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-foreground">Sprint Planning</h2>
          <p className="text-xs text-muted mt-0.5">{backlog.length} tasks in backlog</p>
        </div>
        <button onClick={() => setCreating(true)}
          className="flex items-center gap-2 h-9 px-4 rounded-xl text-sm font-bold text-white transition-all"
          style={{ background: "linear-gradient(135deg,#9D6BFF,#06B6D4)", boxShadow: "0 4px 12px rgba(157,107,255,0.3)" }}>
          <Plus className="w-4 h-4" /> New Sprint
        </button>
      </div>

      {/* Create sprint form */}
      <AnimatePresence>
        {creating && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="rounded-2xl p-5 space-y-4"
            style={{ background: "var(--bg-card)", border: "1px solid var(--accent)", boxShadow: "0 0 0 3px rgba(157,107,255,0.08)" }}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-black text-foreground">New Sprint</span>
              <button onClick={() => setCreating(false)}><X className="w-4 h-4 text-muted" /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-[10px] font-bold text-subtle uppercase tracking-widest mb-1">Sprint Name *</label>
                <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Sprint 1 — Alpha Launch"
                  className="w-full h-9 rounded-xl px-3 text-sm font-medium text-foreground focus:outline-none"
                  style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }} />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-bold text-subtle uppercase tracking-widest mb-1">Sprint Goal</label>
                <input value={form.goal} onChange={(e) => setForm((p) => ({ ...p, goal: e.target.value }))}
                  placeholder="What do we want to ship?"
                  className="w-full h-9 rounded-xl px-3 text-sm font-medium text-foreground focus:outline-none"
                  style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-subtle uppercase tracking-widest mb-1">Start Date *</label>
                <input type="date" value={form.startDate} onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
                  className="w-full h-9 rounded-xl px-3 text-sm font-medium text-foreground focus:outline-none"
                  style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-subtle uppercase tracking-widest mb-1">End Date *</label>
                <input type="date" value={form.endDate} onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
                  className="w-full h-9 rounded-xl px-3 text-sm font-medium text-foreground focus:outline-none"
                  style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }} />
              </div>
            </div>
            <button onClick={createSprint}
              className="w-full h-10 rounded-xl text-sm font-bold text-white"
              style={{ background: "linear-gradient(135deg,#9D6BFF,#06B6D4)" }}>
              Create Sprint
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sprints */}
      {sprints.map((sprint) => {
        const sprintTasks = sprint.tasks.map((st) => st.task);
        const done = sprintTasks.filter((t) => t.status === "DONE").length;
        const total = sprintTasks.length;
        const points = sprintTasks.reduce((s, t) => s + (t.storyPoints ?? 0), 0);
        const daysLeft = differenceInDays(new Date(sprint.endDate), new Date());
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;

        return (
          <div key={sprint.id} className="rounded-2xl overflow-hidden"
            style={{ border: sprint.status === "ACTIVE" ? "1px solid var(--accent)" : "1px solid var(--border)", boxShadow: sprint.status === "ACTIVE" ? "0 0 0 3px rgba(157,107,255,0.08)" : "none" }}>
            {/* Sprint header */}
            <div className="px-5 py-4 flex items-center gap-4"
              style={{ background: "var(--bg-card)" }}>
              <button onClick={() => setExpanded((p) => ({ ...p, [sprint.id]: !p[sprint.id] }))}>
                {expanded[sprint.id] ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 shrink-0"
                    style={{ color: sprint.status === "ACTIVE" ? "var(--accent)" : "var(--text-muted)" }} />
                  <span className="text-sm font-black text-foreground">{sprint.name}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                    style={{
                      background: sprint.status === "ACTIVE" ? "var(--accent-muted)" : sprint.status === "COMPLETED" ? "rgba(0,240,144,0.1)" : "var(--bg-elevated)",
                      color: sprint.status === "ACTIVE" ? "var(--accent)" : sprint.status === "COMPLETED" ? "#00F090" : "var(--text-muted)",
                    }}>
                    {sprint.status}
                  </span>
                </div>
                {sprint.goal && <p className="text-xs text-muted mt-0.5 truncate">{sprint.goal}</p>}
              </div>

              <div className="flex items-center gap-4 shrink-0 text-xs text-muted">
                <span>{format(new Date(sprint.startDate), "MMM d")} – {format(new Date(sprint.endDate), "MMM d")}</span>
                {sprint.status === "ACTIVE" && (
                  <span className={daysLeft < 0 ? "text-red-400 font-bold" : ""}>{daysLeft < 0 ? "Overdue" : `${daysLeft}d left`}</span>
                )}
                <span className="font-semibold text-foreground">{done}/{total} tasks</span>
                {points > 0 && <span>{points} pts</span>}
              </div>

              {/* Status actions */}
              <div className="flex items-center gap-2 shrink-0">
                {sprint.status === "PLANNING" && (
                  <button onClick={() => changeStatus(sprint.id, "ACTIVE")}
                    className="flex items-center gap-1.5 h-7 px-3 rounded-lg text-xs font-bold text-white"
                    style={{ background: "var(--accent)" }}>
                    <Play className="w-3 h-3" /> Start
                  </button>
                )}
                {sprint.status === "ACTIVE" && (
                  <button onClick={() => changeStatus(sprint.id, "COMPLETED")}
                    className="flex items-center gap-1.5 h-7 px-3 rounded-lg text-xs font-bold"
                    style={{ background: "rgba(0,240,144,0.12)", color: "#00F090", border: "1px solid rgba(0,240,144,0.2)" }}>
                    <CheckCircle2 className="w-3 h-3" /> Complete
                  </button>
                )}
                {sprint.status === "COMPLETED" && <Archive className="w-4 h-4 text-muted" />}
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-1" style={{ background: "var(--bg-elevated)" }}>
              <div className="h-full transition-all duration-500 rounded-full"
                style={{ width: `${pct}%`, background: "linear-gradient(90deg,var(--accent),#00F090)" }} />
            </div>

            {/* Tasks */}
            <AnimatePresence>
              {expanded[sprint.id] && (
                <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                  <div className="px-5 py-3 space-y-1.5"
                    style={{ borderTop: "1px solid var(--border-subtle)" }}>
                    {sprintTasks.length === 0 && (
                      <p className="text-xs text-muted py-2 text-center">No tasks — drag from backlog below</p>
                    )}
                    {sprintTasks.map((task) => (
                      <div key={task.id} className="flex items-center gap-3 px-3 py-2 rounded-xl transition-colors hover:bg-card-hover">
                        <Grip className="w-3.5 h-3.5 text-muted cursor-grab shrink-0" />
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: PRIORITY_COLOR[task.priority] }} />
                        <span className={`flex-1 text-sm text-foreground truncate ${task.status === "DONE" ? "line-through opacity-50" : ""}`}>{task.title}</span>
                        {task.storyPoints && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "var(--bg-elevated)", color: "var(--text-muted)" }}>{task.storyPoints}pt</span>
                        )}
                        <span className="text-[10px] font-bold" style={{ color: STATUS_COLOR[task.status] ?? "#6B7280" }}>{task.status.replace("_", " ")}</span>
                        <button onClick={() => moveTasks(sprint.id, task.id, "remove")}
                          className="p-1 rounded-lg text-muted hover:text-red-400 transition-colors shrink-0">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      {/* Backlog */}
      {backlog.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
          <div className="px-5 py-4 flex items-center gap-3" style={{ background: "var(--bg-card)" }}>
            <Target className="w-4 h-4 text-muted" />
            <span className="text-sm font-black text-foreground">Backlog</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
              style={{ background: "var(--bg-elevated)", color: "var(--text-muted)" }}>
              {backlog.length}
            </span>
          </div>
          <div className="divide-y" style={{ "--tw-divide-opacity": "1", borderTop: "1px solid var(--border-subtle)" } as React.CSSProperties}>
            {backlog.map((task) => {
              const activeSprint = sprints.find((s) => s.status !== "COMPLETED");
              return (
                <div key={task.id} className="flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-card-hover">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: PRIORITY_COLOR[task.priority] }} />
                  <span className="flex-1 text-sm text-foreground truncate">{task.title}</span>
                  {task.storyPoints && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "var(--bg-elevated)", color: "var(--text-muted)" }}>{task.storyPoints}pt</span>
                  )}
                  {activeSprint && (
                    <button onClick={() => moveTasks(activeSprint.id, task.id, "add")}
                      className="flex items-center gap-1.5 h-6 px-2 rounded-lg text-[10px] font-bold transition-colors"
                      style={{ background: "var(--accent-muted)", color: "var(--accent)" }}>
                      <Plus className="w-3 h-3" /> Add to Sprint
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {sprints.length === 0 && !creating && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: "var(--accent-muted)" }}>
            <Zap className="w-8 h-8" style={{ color: "var(--accent)" }} />
          </div>
          <p className="text-base font-black text-foreground">No sprints yet</p>
          <p className="text-sm text-muted">Create your first sprint to start planning iterations.</p>
          <button onClick={() => setCreating(true)}
            className="mt-2 h-10 px-6 rounded-xl text-sm font-bold text-white"
            style={{ background: "linear-gradient(135deg,#9D6BFF,#06B6D4)" }}>
            Create Sprint
          </button>
        </div>
      )}
    </div>
  );
}
