"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { LayoutGrid, List, Settings, ArrowLeft, GanttChartSquare, Zap } from "lucide-react";
import type { Project } from "@/types";
import { BoardTemplateModal } from "@/components/kanban/BoardTemplateModal";

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const params     = useParams();
  const pathname   = usePathname();
  const projectId  = params.projectId as string;
  const [project,           setProject]           = useState<Project | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  const loadProject = () => {
    fetch(`/api/projects/${projectId}`).then((r) => r.json()).then(setProject)
      .catch((err) => console.error("[project-layout] failed to load project", err));
  };
  useEffect(() => { loadProject(); }, [projectId]);

  const views = [
    { href: `/projects/${projectId}/list`,     label: "List",     icon: List             },
    { href: `/projects/${projectId}/board`,    label: "Workspace", icon: LayoutGrid       },
    { href: `/projects/${projectId}/timeline`, label: "Timeline", icon: GanttChartSquare },
    { href: `/projects/${projectId}/sprint`,   label: "Sprint",   icon: Zap              },
  ];

  const pColor = project?.color ?? "#6366F1";

  return (
    <div className="flex flex-col h-full">
      {/* ── Project sub-header ──────────────────────────────── */}
      <div
        className="relative flex items-center gap-3 px-4 overflow-hidden shrink-0"
        style={{
          background: project
            ? `linear-gradient(135deg, ${pColor}08 0%, var(--bg-sidebar) 60%)`
            : "var(--bg-sidebar)",
          borderBottom: "1px solid var(--border)",
          minHeight: 56,
        }}
      >
        {/* Ambient color wash */}
        {project && (
          <>
            <div className="absolute left-0 top-0 bottom-0 w-[3.5px]"
              style={{ background: `linear-gradient(180deg, ${pColor}, ${pColor}55)` }} />
            <div className="absolute left-0 top-0 bottom-0 w-56 pointer-events-none"
              style={{ background: `linear-gradient(90deg, ${pColor}14, transparent)` }} />
            <div className="absolute right-0 top-0 bottom-0 w-32 pointer-events-none"
              style={{ background: `linear-gradient(270deg, ${pColor}06, transparent)` }} />
          </>
        )}

        {/* Back */}
        <Link
          href="/projects"
          className="relative z-10 p-1.5 rounded-lg transition-all shrink-0"
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
          <ArrowLeft className="w-3.5 h-3.5" />
        </Link>

        {/* Project identity */}
        {project && (
          <div className="relative z-10 flex items-center gap-2.5 shrink-0">
            <div
              className="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${pColor} 0%, ${pColor}BB 100%)`,
                boxShadow: `0 4px 16px ${pColor}45, inset 0 1px 0 rgba(255,255,255,0.25)`,
              }}
            >
              <div className="w-3 h-3 rounded-sm bg-white opacity-90" />
            </div>
            <div>
              <span className="text-[14px] font-black block" style={{ color: "var(--text-foreground)", letterSpacing: "-0.02em", lineHeight: 1 }}>
                {project.name}
              </span>
              {(project as { description?: string }).description && (
                <span className="text-[10px] block mt-0.5 max-w-[200px] truncate" style={{ color: "var(--text-subtle)" }}>
                  {(project as { description?: string }).description}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Divider */}
        <div className="relative z-10 w-px h-4 shrink-0" style={{ background: "var(--border)" }} />

        {/* View toggle */}
        <div className="relative z-10 flex items-center gap-0.5">
          {views.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all duration-150"
                style={{
                  background: active
                    ? `linear-gradient(135deg, ${pColor}25 0%, ${pColor}12 100%)`
                    : "transparent",
                  color: active ? pColor : "var(--text-muted)",
                  border: active ? `1px solid ${pColor}35` : "1px solid transparent",
                  boxShadow: active ? `0 2px 12px ${pColor}18` : "none",
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
                <Icon className="w-3.5 h-3.5" strokeWidth={active ? 2.2 : 1.8} />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
        </div>

        {/* Settings */}
        <div className="relative z-10 ml-auto">
          <Link href={`/projects/${projectId}/settings`}>
            <button
              className="p-2 rounded-xl transition-all"
              style={
                pathname.endsWith("/settings")
                  ? { color: pColor, background: `${pColor}18`, boxShadow: `0 0 12px ${pColor}20` }
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
              <Settings className="w-3.5 h-3.5" />
            </button>
          </Link>
        </div>
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
