"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { Kanban, List, Settings, ArrowLeft, GanttChartSquare, Zap } from "lucide-react";
import type { Project } from "@/types";
import { BoardTemplateModal } from "@/components/kanban/BoardTemplateModal";

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const params     = useParams();
  const pathname   = usePathname();
  const projectId  = params.projectId as string;
  const [project,           setProject]           = useState<Project | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  const loadProject = () => {
    fetch(`/api/projects/${projectId}`).then((r) => r.json()).then(setProject).catch((err) => console.error("[project-layout] failed to load project", err));
  };
  useEffect(() => { loadProject(); }, [projectId]);

  const isBoard = pathname.endsWith("/board");

  const views = [
    { href: `/projects/${projectId}/list`,     label: "All Tasks", icon: List             },
    { href: `/projects/${projectId}/board`,    label: "Board",     icon: Kanban           },
    { href: `/projects/${projectId}/timeline`, label: "Timeline",  icon: GanttChartSquare },
    { href: `/projects/${projectId}/sprint`,   label: "Sprint",    icon: Zap              },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* ── Project sub-header ───────────────────────────── */}
      <div
        className="relative flex items-center gap-3 px-5 overflow-hidden"
        style={{
          background: "var(--bg-sidebar)",
          borderBottom: "1px solid var(--border)",
          minHeight: 54,
        }}
      >
        {/* Project color ambient glow */}
        {project && (
          <>
            <div className="absolute left-0 top-0 bottom-0 w-[3px]"
              style={{ background: project.color }} />
            <div className="absolute left-0 top-0 bottom-0 w-24 pointer-events-none"
              style={{ background: `linear-gradient(90deg, ${project.color}18, transparent)` }} />
          </>
        )}

        {/* Back */}
        <Link
          href="/projects"
          className="p-1.5 rounded-lg transition-all shrink-0"
          style={{ color: "var(--text-muted)" }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.background = "var(--bg-card-hover)";
            el.style.color = "var(--text-foreground)";
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.background = "transparent";
            el.style.color = "var(--text-muted)";
          }}
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>

        {/* Project identity */}
        {project && (
          <div className="flex items-center gap-2 shrink-0">
            <div
              className="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${project.color}30, ${project.color}15)`,
                border: `1px solid ${project.color}35`,
                boxShadow: `0 0 12px ${project.color}22`,
              }}
            >
              <div className="w-3 h-3 rounded-sm" style={{
                background: project.color,
                boxShadow: `0 0 6px ${project.color}80`,
              }} />
            </div>
            <span className="text-[13.5px] font-bold" style={{ color: "var(--text-foreground)" }}>
              {project.name}
            </span>
          </div>
        )}

        {/* Divider */}
        <div className="w-px h-5 shrink-0" style={{ background: "var(--border)" }} />

        {/* View toggle — pill style */}
        <div
          className="flex items-center gap-1 p-1 rounded-xl"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
        >
          {views.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            const pColor = project?.color ?? "var(--accent)";
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-semibold transition-all duration-150"
                style={{
                  background: active
                    ? "var(--bg-card)"
                    : "transparent",
                  color: active ? "var(--text-foreground)" : "var(--text-muted)",
                  boxShadow: active
                    ? `var(--shadow-xs), 0 0 0 1px ${pColor}25`
                    : "none",
                  borderBottom: active ? `2px solid ${pColor}` : "2px solid transparent",
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
                <Icon className="w-3.5 h-3.5" />
                {label}
              </Link>
            );
          })}
        </div>

        {/* Settings */}
        <Link href={`/projects/${projectId}/settings`} className="ml-auto shrink-0">
          <button
            className="p-2 rounded-xl transition-all"
            style={
              pathname.endsWith("/settings")
                ? { color: "var(--accent)", background: "var(--accent-muted)" }
                : { color: "var(--text-muted)", background: "transparent" }
            }
            onMouseEnter={(e) => {
              if (!pathname.endsWith("/settings")) {
                const el = e.currentTarget as HTMLElement;
                el.style.color = "var(--text-foreground)";
                el.style.background = "var(--bg-card-hover)";
              }
            }}
            onMouseLeave={(e) => {
              if (!pathname.endsWith("/settings")) {
                const el = e.currentTarget as HTMLElement;
                el.style.color = "var(--text-muted)";
                el.style.background = "transparent";
              }
            }}
          >
            <Settings className="w-4 h-4" />
          </button>
        </Link>
      </div>

      <div className="flex-1 overflow-auto">{children}</div>

      {project && (
        <BoardTemplateModal
          open={showTemplateModal}
          onClose={() => setShowTemplateModal(false)}
          projectId={projectId}
          currentConfig={project.boardConfig}
          onApplied={loadProject}
        />
      )}
    </div>
  );
}
