"use client";
import { Sidebar, useSidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { NotificationProvider } from "@/components/layout/NotificationBell";
import { CommandPalette } from "@/components/command/CommandPalette";
import { AIChatBubble } from "@/components/ai/AIChatBubble";
import { TourGuide } from "@/components/ui/TourGuide";
import { useEffect, useState } from "react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [cmdOpen, setCmdOpen]   = useState(false);
  const [projects, setProjects] = useState<{ id: string; name: string; color: string }[]>([]);
  const { collapsed }           = useSidebar();

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((d) => setProjects(
        d.map((p: { id: string; name: string; color: string }) => ({
          id: p.id, name: p.name, color: p.color,
        }))
      ))
      .catch((err) => console.error("[layout] failed to load projects", err));
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setCmdOpen((o) => !o); }
      if (e.key === "Escape") setCmdOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  /*
   * The sidebar is position:fixed. On desktop (≥ 1024px) we shift the content
   * shell right by the sidebar width using a CSS custom property injected into
   * a <style> tag.  This avoids Tailwind arbitrary-value limitations with
   * CSS vars, while still reacting to the Zustand collapsed state.
   */
  const sidebarVar = collapsed
    ? "var(--sidebar-w-collapsed)"
    : "var(--sidebar-w)";

  return (
    <NotificationProvider>
      <div style={{ background: "var(--bg-base)", minHeight: "100dvh" }}>
        <Sidebar />

        <style>{`
          @media (min-width: 1024px) {
            .app-shell { margin-left: ${sidebarVar}; }
          }
        `}</style>

        <div
          className="app-shell flex flex-col min-h-dvh"
          style={{ transition: "margin-left 0.22s cubic-bezier(0.4,0,0.2,1)" }}
        >
          <Header onOpenCommand={() => setCmdOpen(true)} />
          <main className="flex-1">
            {children}
          </main>
        </div>
      </div>

      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} projects={projects} />
      <AIChatBubble />
      <TourGuide />
    </NotificationProvider>
  );
}
