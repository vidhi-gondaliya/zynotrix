"use client";
import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { BoardImportExport } from "@/components/kanban/BoardImportExport";
import { getBoardColumns } from "@/lib/board-templates";
import { Sparkles, X, Zap, ArrowLeftRight, CalendarDays, Globe } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { format } from "date-fns";

export default function BoardPage({ params }: { params: { projectId: string } }) {
  const router        = useRouter();
  const searchParams  = useSearchParams();
  const isNewProject  = searchParams.get("new") === "1";
  const defaultTaskId = searchParams.get("task") ?? undefined;

  const [boardKey,         setBoardKey]         = useState(0);
  const [project,          setProject]          = useState<{ name: string; description?: string; createdAt?: string } | null>(null);
  const [currentBoardConfig, setCurrentBoardConfig] = useState<string | null>(null);
  const [showAiBanner,     setShowAiBanner]     = useState(isNewProject);
  const [generatingTasks,  setGeneratingTasks]  = useState(false);
  const [showImportExport, setShowImportExport] = useState(false);

  const loadProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${params.projectId}`, { cache: "no-store" });
      const p   = await res.json();
      setCurrentBoardConfig(p.boardConfig ?? null);
      setProject({ name: p.name, description: p.description, createdAt: p.createdAt });
    } catch {}
  }, [params.projectId]);

  useEffect(() => { loadProject(); }, [loadProject, boardKey]);

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
      toast.success(`✨ ${created} tasks added to your board!`);
      dismissBanner();
      setBoardKey((k) => k + 1);
    } catch { toast.error("Failed to generate tasks — try again"); }
    finally { setGeneratingTasks(false); }
  };

  return (
    <div className="relative flex flex-col h-full">

      {/* ── Project header ─────────────────────────────────────────── */}
      {project && (
        <div className="px-6 pt-5 pb-4 shrink-0"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold mb-1.5 flex items-center gap-1.5"
                style={{ color: "var(--text-subtle)" }}>
                <Globe className="w-3 h-3" />
                Public · Last updated just now
              </p>
              <h1 className="text-[26px] font-black tracking-[-0.03em] leading-none mb-3"
                style={{ color: "var(--text-foreground)" }}>
                {project.name}
              </h1>
            </div>
            {project.createdAt && (
              <div className="text-right shrink-0">
                <p className="text-[9.5px] font-semibold uppercase tracking-widest"
                  style={{ color: "var(--text-subtle)" }}>Created On</p>
                <p className="text-[12px] font-bold mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {format(new Date(project.createdAt), "MMMM d, yyyy")}
                </p>
              </div>
            )}
          </div>

          {/* Toolbar row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1" />
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowImportExport(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-bold transition-all"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                  color: "var(--text-muted)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.color = "var(--accent)";
                  (e.currentTarget as HTMLElement).style.borderColor = "var(--accent-glow)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
                  (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                }}
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                Import / Export
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── AI task generation banner ─────────────────────────────── */}
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
            }}
          >
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: "var(--accent)" }}>
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black" style={{ color: "var(--text-foreground)" }}>
                Generate your initial tasks with AI
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

      {/* ── Board ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        <KanbanBoard
          key={boardKey}
          projectId={params.projectId}
          defaultOpenTaskId={defaultTaskId}
          myTasksOnly={false}
        />
      </div>

      {/* ── Import / Export panel ─────────────────────────────────── */}
      {showImportExport && project && (
        <BoardImportExport
          projectId={params.projectId}
          projectName={project.name}
          onImported={() => setBoardKey((k) => k + 1)}
          onClose={() => setShowImportExport(false)}
        />
      )}
    </div>
  );
}
