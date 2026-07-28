"use client";
import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { FlowView } from "@/components/project/FlowView";
import { TaskDetailPanel } from "@/components/kanban/TaskDetailPanel";
import { TaskModal } from "@/components/kanban/TaskModal";
import { BoardImportExport } from "@/components/kanban/BoardImportExport";
import { getBoardColumns } from "@/lib/board-templates";
import { Sparkles, X, Zap, ArrowLeftRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import type { Task, TaskStatus } from "@/types";

type Lens = "flow" | "focus" | "board";

const LENSES: { id: Lens; label: string; glyph: string }[] = [
  { id: "flow",  label: "Flow",  glyph: "⬡" },
  { id: "focus", label: "Focus", glyph: "◉" },
  { id: "board", label: "Board", glyph: "▦" },
];

export default function BoardPage({ params }: { params: { projectId: string } }) {
  const router      = useRouter();
  const searchParams = useSearchParams();
  const isNewProject = searchParams.get("new") === "1";
  const defaultTaskId = searchParams.get("task") ?? undefined;

  const [lens,           setLens]          = useState<Lens>("flow");
  const [boardKey,       setBoardKey]      = useState(0);
  const [flowKey,        setFlowKey]       = useState(0);
  const [project,        setProject]       = useState<{ name: string; description?: string } | null>(null);
  const [currentBoardConfig, setCurrentBoardConfig] = useState<string | null>(null);
  const [showAiBanner,   setShowAiBanner]  = useState(isNewProject);
  const [generatingTasks, setGeneratingTasks] = useState(false);
  const [showImportExport, setShowImportExport] = useState(false);

  // Task detail state (for FlowView task clicks)
  const [selectedTask,   setSelectedTask]  = useState<Task | null>(null);
  const [showTaskDetail, setShowTaskDetail] = useState(false);

  // Task creation modal (for FlowView "Add task")
  const [showCreateModal,  setShowCreateModal]  = useState(false);
  const [createStatus,     setCreateStatus]     = useState<TaskStatus>("TODO");

  const loadProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${params.projectId}`, { cache: "no-store" });
      const p = await res.json();
      setCurrentBoardConfig(p.boardConfig ?? null);
      setProject({ name: p.name, description: p.description });
    } catch {}
  }, [params.projectId]);

  useEffect(() => { loadProject(); }, [loadProject, boardKey]);

  // Auto-open task if passed via URL
  useEffect(() => {
    if (!defaultTaskId) return;
    fetch(`/api/tasks/${defaultTaskId}`)
      .then(r => r.json())
      .then((t: Task) => { setSelectedTask(t); setShowTaskDetail(true); })
      .catch(() => {});
  }, [defaultTaskId]);

  const dismissBanner = () => {
    setShowAiBanner(false);
    const url = new URL(window.location.href);
    url.searchParams.delete("new");
    router.replace(url.pathname + (url.search || ""));
  };

  const generateTasks = async () => {
    if (!project) return;
    setGeneratingTasks(true);
    try {
      const boardColumns = getBoardColumns(currentBoardConfig).map((c) => ({ id: c.id, label: c.label }));
      const aiRes = await fetch("/api/ai/project-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: project.name, description: project.description ?? "", boardColumns }),
      });
      if (!aiRes.ok) throw new Error();
      const aiTasks = await aiRes.json();
      let created = 0;
      for (const task of aiTasks) {
        const res = await fetch(`/api/projects/${params.projectId}/tasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: task.title, description: task.description, priority: task.priority, status: task.status }),
        });
        if (res.ok) created++;
      }
      toast.success(`✨ ${created} tasks added to your workspace!`);
      dismissBanner();
      setBoardKey((k) => k + 1);
      setFlowKey((k) => k + 1);
    } catch { toast.error("Failed to generate tasks — try again"); }
    finally { setGeneratingTasks(false); }
  };

  const handleFlowTaskClick = (task: Task) => {
    setSelectedTask(task);
    setShowTaskDetail(true);
  };

  const handleFlowAddTask = (status: string) => {
    setCreateStatus(status as TaskStatus);
    setShowCreateModal(true);
  };

  const handleTaskUpdated = (updated: Task) => {
    setSelectedTask(updated);
    setFlowKey(k => k + 1);
    setBoardKey(k => k + 1);
  };

  const handleTaskDeleted = () => {
    setShowTaskDetail(false);
    setSelectedTask(null);
    setFlowKey(k => k + 1);
    setBoardKey(k => k + 1);
  };

  const handleTaskCreated = (task: Task) => {
    setShowCreateModal(false);
    setFlowKey(k => k + 1);
    setBoardKey(k => k + 1);
  };

  return (
    <div className="relative flex flex-col h-full">

      {/* ── Lens switcher ─────────────────────────────────────────── */}
      <div
        className="flex items-center gap-1 px-6 pt-4 pb-2 shrink-0"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-0.5">
          {LENSES.map(({ id, label, glyph }) => {
            const active = lens === id;
            return (
              <button
                key={id}
                onClick={() => setLens(id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all"
                style={{
                  color: active ? "var(--accent)" : "var(--text-muted)",
                  background: active ? "var(--accent-muted)" : "transparent",
                  border: `1px solid ${active ? "var(--accent-glow)" : "transparent"}`,
                  letterSpacing: "0.02em",
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.color = "var(--text-foreground)";
                    (e.currentTarget as HTMLElement).style.background = "var(--bg-card-hover)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                  }
                }}
              >
                <span className="opacity-70">{glyph}</span>
                {label}
              </button>
            );
          })}
        </div>

        <div className="flex-1" />

        {/* Import / Export (board lens only) */}
        {lens === "board" && (
          <button
            onClick={() => setShowImportExport(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              color: "var(--text-muted)",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--accent)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--accent-glow)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            Import / Export
          </button>
        )}
      </div>

      {/* ── AI task generation banner ─────────────────────────── */}
      <AnimatePresence>
        {showAiBanner && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="mx-6 mt-4 rounded-2xl p-4 flex items-center gap-4 shrink-0"
            style={{
              background: "linear-gradient(135deg, var(--accent)15, var(--accent)08)",
              border: "1.5px solid var(--accent-glow)",
              backdropFilter: "blur(12px)",
            }}
          >
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: "var(--accent)" }}
            >
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black" style={{ color: "var(--text-foreground)" }}>
                Generate your initial backlog with AI
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                Claude will create 6–8 starter tasks tailored to &ldquo;{project?.name}&rdquo;
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={generateTasks}
                disabled={generatingTasks || !project}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90 disabled:opacity-60"
                style={{ background: "var(--accent)" }}
              >
                {generatingTasks
                  ? <><span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full" /> Generating…</>
                  : <><Sparkles className="w-3.5 h-3.5" /> Generate Tasks</>
                }
              </button>
              <button
                onClick={dismissBanner}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: "var(--text-subtle)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-foreground)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-subtle)"; }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Lens content ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        {lens === "flow" && (
          <FlowView
            key={flowKey}
            projectId={params.projectId}
            onTaskClick={handleFlowTaskClick}
            onAddTask={handleFlowAddTask}
            focusMode={false}
            refreshKey={flowKey}
          />
        )}

        {lens === "focus" && (
          <FlowView
            key={`focus-${flowKey}`}
            projectId={params.projectId}
            onTaskClick={handleFlowTaskClick}
            onAddTask={handleFlowAddTask}
            focusMode={true}
            refreshKey={flowKey}
          />
        )}

        {lens === "board" && (
          <KanbanBoard
            key={boardKey}
            projectId={params.projectId}
            defaultOpenTaskId={defaultTaskId}
            myTasksOnly={false}
          />
        )}
      </div>

      {/* ── Task detail panel (for Flow / Focus clicks) ─────────── */}
      <TaskDetailPanel
        task={selectedTask}
        open={showTaskDetail && (lens === "flow" || lens === "focus")}
        onClose={() => { setShowTaskDetail(false); setSelectedTask(null); }}
        onUpdate={handleTaskUpdated}
        onDelete={(_taskId: string) => handleTaskDeleted()}
        projectId={params.projectId}
      />

      {/* ── Task creation modal (for Flow / Focus "Add task") ────── */}
      <TaskModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        projectId={params.projectId}
        defaultStatus={createStatus}
        onSave={handleTaskCreated}
      />

      {/* ── Import / Export panel ───────────────────────────────── */}
      {showImportExport && project && (
        <BoardImportExport
          projectId={params.projectId}
          projectName={project.name}
          onImported={() => { setBoardKey((k) => k + 1); setFlowKey((k) => k + 1); }}
          onClose={() => setShowImportExport(false)}
        />
      )}
    </div>
  );
}
