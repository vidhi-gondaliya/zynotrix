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
import { getApiError } from "@/lib/api-error";

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
    if (!res.ok) return void toast.error(await getApiError(res, "Failed to create sprint"));
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
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[20px] font-black tracking-[-0.03em]"
            style={{
              background: "linear-gradient(120deg, var(--text-foreground) 30%, var(--accent) 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            }}>
            Sprint Planning
          </h2>
          <p className="text-[12px] mt-0.5" style={{ color: "var(--text-subtle)" }}>
            {backlog.length} task{backlog.length !== 1 ? "s" : ""} in backlog
          </p>
        </div>
        <button onClick={() => setCreating(true)}
          className="flex items-center gap-2 h-9 px-4 rounded-[12px] text-[13px] font-bold text-white transition-all hover:scale-[1.03] active:scale-[0.98]"
          style={{
            background: "linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%)",
            boxShadow: "0 4px 20px rgba(139,92,246,0.40), inset 0 1px 0 rgba(255,255,255,0.20)",
          }}>
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

        const sprintColor = sprint.status === "ACTIVE" ? "#8B5CF6"
          : sprint.status === "COMPLETED" ? "#22C55E"
          : "#6B7280";

        return (
          <motion.div key={sprint.id}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-[18px] overflow-hidden"
            style={{
              border: `1px solid ${sprint.status === "ACTIVE" ? "rgba(139,92,246,0.40)" : "var(--border)"}`,
              boxShadow: sprint.status === "ACTIVE"
                ? "0 4px 32px rgba(139,92,246,0.12), 0 0 0 1px rgba(139,92,246,0.08)"
                : "var(--shadow-xs)",
            }}>
            {/* Sprint header */}
            <div className="relative px-5 py-4 flex items-center gap-4 overflow-hidden"
              style={{
                background: sprint.status === "ACTIVE"
                  ? "linear-gradient(135deg, rgba(139,92,246,0.12) 0%, var(--bg-card) 60%)"
                  : "var(--bg-card)",
              }}>
              {/* Color accent bar */}
              <div className="absolute left-0 top-0 bottom-0 w-[3px]"
                style={{ background: `linear-gradient(180deg, ${sprintColor}, ${sprintColor}44)` }} />

              <button
                onClick={() => setExpanded((p) => ({ ...p, [sprint.id]: !p[sprint.id] }))}
                className="p-1 rounded-lg transition-colors shrink-0"
                style={{ color: "var(--text-muted)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                {expanded[sprint.id] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Zap className="w-3.5 h-3.5 shrink-0" style={{ color: sprintColor }} />
                  <span className="text-[14px] font-black" style={{ color: "var(--text-foreground)", letterSpacing: "-0.02em" }}>
                    {sprint.name}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                    style={{
                      background: sprint.status === "ACTIVE" ? "rgba(139,92,246,0.18)"
                        : sprint.status === "COMPLETED" ? "rgba(34,197,94,0.12)"
                        : "var(--bg-elevated)",
                      color: sprintColor,
                      border: `1px solid ${sprintColor}35`,
                    }}>
                    {sprint.status}
                  </span>
                </div>
                {sprint.goal && (
                  <p className="text-[12px] mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>{sprint.goal}</p>
                )}
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right hidden sm:block">
                  <p className="text-[11px] font-semibold" style={{ color: "var(--text-muted)" }}>
                    {format(new Date(sprint.startDate), "MMM d")} – {format(new Date(sprint.endDate), "MMM d")}
                  </p>
                  {sprint.status === "ACTIVE" && (
                    <p className="text-[11px] font-bold" style={{ color: daysLeft < 0 ? "var(--danger)" : "var(--text-subtle)" }}>
                      {daysLeft < 0 ? "Overdue" : `${daysLeft}d left`}
                    </p>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-[18px] font-black" style={{ color: sprintColor }}>{done}/{total}</p>
                  <p className="text-[9px] uppercase tracking-widest font-bold" style={{ color: "var(--text-subtle)" }}>tasks</p>
                </div>
                {points > 0 && (
                  <div className="text-center">
                    <p className="text-[18px] font-black" style={{ color: "var(--text-foreground)" }}>{points}</p>
                    <p className="text-[9px] uppercase tracking-widest font-bold" style={{ color: "var(--text-subtle)" }}>points</p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {sprint.status === "PLANNING" && (
                  <button onClick={() => changeStatus(sprint.id, "ACTIVE")}
                    className="flex items-center gap-1.5 h-8 px-3 rounded-[10px] text-[12px] font-bold text-white"
                    style={{
                      background: "linear-gradient(135deg, #8B5CF6, #6D28D9)",
                      boxShadow: "0 3px 12px rgba(139,92,246,0.40)",
                    }}>
                    <Play className="w-3 h-3" fill="currentColor" /> Start
                  </button>
                )}
                {sprint.status === "ACTIVE" && (
                  <button onClick={() => changeStatus(sprint.id, "COMPLETED")}
                    className="flex items-center gap-1.5 h-8 px-3 rounded-[10px] text-[12px] font-bold"
                    style={{
                      background: "rgba(34,197,94,0.12)",
                      color: "#22C55E",
                      border: "1px solid rgba(34,197,94,0.25)",
                    }}>
                    <CheckCircle2 className="w-3 h-3" /> Complete
                  </button>
                )}
                {sprint.status === "COMPLETED" && (
                  <Archive className="w-4 h-4" style={{ color: "var(--text-subtle)" }} />
                )}
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-[4px]" style={{ background: "var(--bg-elevated)" }}>
              <div className="h-full transition-all duration-700 rounded-full"
                style={{
                  width: `${pct}%`,
                  background: `linear-gradient(90deg, ${sprintColor}, ${pct === 100 ? "#22C55E" : sprintColor}88)`,
                  boxShadow: pct > 0 ? `0 0 8px ${sprintColor}60` : "none",
                }} />
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
                    {sprintTasks.map((task) => {
                      const prColor = PRIORITY_COLOR[task.priority] ?? "#6B7280";
                      const stColor = STATUS_COLOR[task.status] ?? "#6B7280";
                      return (
                        <div key={task.id}
                          className="group flex items-center gap-3 px-3 py-2.5 rounded-[12px] transition-all duration-150"
                          style={{ background: "transparent" }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                          <Grip className="w-3.5 h-3.5 cursor-grab shrink-0 opacity-30 group-hover:opacity-70 transition-opacity" style={{ color: "var(--text-muted)" }} />
                          {/* Priority dot */}
                          <div className="w-[6px] h-[6px] rounded-full shrink-0" style={{ background: prColor, boxShadow: `0 0 4px ${prColor}80` }} />
                          <span className={`flex-1 text-[13px] font-medium truncate ${task.status === "DONE" ? "line-through" : ""}`}
                            style={{ color: task.status === "DONE" ? "var(--text-subtle)" : "var(--text-foreground)" }}>
                            {task.title}
                          </span>
                          {task.storyPoints && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                              style={{ background: "rgba(139,92,246,0.10)", color: "#8B5CF6", border: "1px solid rgba(139,92,246,0.20)" }}>
                              {task.storyPoints}sp
                            </span>
                          )}
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                            style={{ background: `${stColor}18`, color: stColor }}>
                            {task.status.replace(/_/g, " ")}
                          </span>
                          <button onClick={() => moveTasks(sprint.id, task.id, "remove")}
                            className="p-1 rounded-lg shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ color: "var(--text-muted)" }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#F43F5E"; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}>
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}

      {/* Backlog */}
      {backlog.length > 0 && (
        <div className="rounded-[18px] overflow-hidden"
          style={{ border: "1px solid var(--border)", boxShadow: "var(--shadow-xs)" }}>
          <div className="px-5 py-3.5 flex items-center gap-3"
            style={{ background: "var(--bg-card)", borderBottom: "1px solid var(--border-subtle)" }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(107,114,128,0.12)" }}>
              <Target className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
            </div>
            <span className="text-[13px] font-black" style={{ color: "var(--text-foreground)", letterSpacing: "-0.01em" }}>Backlog</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
              style={{ background: "var(--bg-elevated)", color: "var(--text-subtle)", border: "1px solid var(--border)" }}>
              {backlog.length} tasks
            </span>
          </div>
          <div style={{ background: "var(--bg-card)" }}>
            {backlog.map((task, idx) => {
              const activeSprint = sprints.find((s) => s.status !== "COMPLETED");
              const prColor = PRIORITY_COLOR[task.priority] ?? "#6B7280";
              return (
                <div key={task.id}
                  className="group flex items-center gap-3 px-5 py-2.5 transition-all duration-150"
                  style={{
                    borderTop: idx > 0 ? "1px solid var(--border-subtle)" : "none",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                  <div className="w-[6px] h-[6px] rounded-full shrink-0" style={{ background: prColor, boxShadow: `0 0 4px ${prColor}80` }} />
                  <span className="flex-1 text-[13px] font-medium truncate" style={{ color: "var(--text-foreground)" }}>{task.title}</span>
                  {task.storyPoints && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: "rgba(139,92,246,0.10)", color: "#8B5CF6", border: "1px solid rgba(139,92,246,0.20)" }}>
                      {task.storyPoints}sp
                    </span>
                  )}
                  {activeSprint && (
                    <button onClick={() => moveTasks(activeSprint.id, task.id, "add")}
                      className="flex items-center gap-1.5 h-7 px-3 rounded-[8px] text-[11px] font-bold opacity-0 group-hover:opacity-100 transition-all"
                      style={{
                        background: "linear-gradient(135deg, rgba(139,92,246,0.18), rgba(99,102,241,0.12))",
                        color: "#8B5CF6",
                        border: "1px solid rgba(139,92,246,0.25)",
                      }}>
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
