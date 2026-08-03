"use client";
import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { BoardImportExport } from "@/components/kanban/BoardImportExport";
import { getBoardColumns } from "@/lib/board-templates";
import { Sparkles, X, Zap, ArrowLeftRight, CalendarDays, Globe, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { format } from "date-fns";

export default function BoardPage({ params }: { params: { projectId: string } }) {
  const router        = useRouter();
  const searchParams  = useSearchParams();
  const isNewProject  = searchParams.get("new") === "1";
  const defaultTaskId = searchParams.get("task") ?? undefined;

  const [boardKey,         setBoardKey]         = useState(0);
  const [project,          setProject]          = useState<{ name: string; description?: string; createdAt?: string; color?: string; status?: string } | null>(null);
  const [currentBoardConfig, setCurrentBoardConfig] = useState<string | null>(null);
  const [showAiBanner,     setShowAiBanner]     = useState(isNewProject);
  const [generatingTasks,  setGeneratingTasks]  = useState(false);
  const [showImportExport, setShowImportExport] = useState(false);

  const loadProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${params.projectId}`, { cache: "no-store" });
      const p   = await res.json();
      setCurrentBoardConfig(p.boardConfig ?? null);
      setProject({ name: p.name, description: p.description, createdAt: p.createdAt, color: p.color, status: p.status });
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
        <div className="shrink-0 px-6 py-3 flex items-center gap-4"
          style={{ borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-sidebar)" }}>

          {/* Color dot */}
          <div className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-white text-base font-black shadow-sm"
            style={{ background: project.color ?? "var(--accent)" }}>
            {project.name.charAt(0).toUpperCase()}
          </div>

          {/* Title + meta */}
          <div className="flex-1 min-w-0">
            <h1 className="text-[17px] font-black tracking-[-0.025em] leading-tight truncate"
              style={{ color: "var(--text-foreground)" }}>
              {project.name}
            </h1>
            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
              <span className="flex items-center gap-1 text-[10.5px] font-medium"
                style={{ color: "var(--text-subtle)" }}>
                <Globe className="w-3 h-3" /> Public
              </span>
              {project.createdAt && (
                <span className="flex items-center gap-1 text-[10.5px] font-medium"
                  style={{ color: "var(--text-subtle)" }}>
                  <CalendarDays className="w-3 h-3" />
                  Created {format(new Date(project.createdAt), "MMM d, yyyy")}
                </span>
              )}
              {project.status && (
                <span className="px-2 py-0.5 rounded-full text-[9.5px] font-black uppercase tracking-wide"
                  style={{
                    background: project.status === "ACTIVE" ? "#00F09018" : project.status === "ON_HOLD" ? "#FFC10718" : "#60A5FA18",
                    color: project.status === "ACTIVE" ? "#00C070" : project.status === "ON_HOLD" ? "#D4A017" : "#60A5FA",
                  }}>
                  {project.status.replace("_", " ")}
                </span>
              )}
            </div>
          </div>

          {/* Import / Export action */}
          <button
            onClick={() => setShowImportExport(true)}
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11.5px] font-bold transition-all"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              color: "var(--text-muted)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color = "var(--accent)";
              (e.currentTarget as HTMLElement).style.borderColor = "var(--accent-glow)";
              (e.currentTarget as HTMLElement).style.background = "var(--accent-muted)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
              (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
              (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)";
            }}
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            Import / Export
          </button>
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
