"use client";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Bell, Search, Plus, Command, Menu, Sparkles } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { ThemeToggle } from "./ThemeToggle";
import { PunchClock } from "./PunchClock";
import { useNotifications } from "@/store/useNotifications";
import { usePathname } from "next/navigation";
import { useSidebar } from "./Sidebar";

const PAGE_TITLES: Record<string, { title: string; sub?: string; emoji?: string }> = {
  "/dashboard":             { title: "Dashboard",          sub: "Your command centre",       emoji: "⚡" },
  "/projects":              { title: "Projects",           sub: "All your workspaces",        emoji: "📁" },
  "/tasks":                 { title: "My Tasks",           sub: "What needs doing",           emoji: "✓"  },
  "/attendance":            { title: "Attendance",         sub: "Punch in & out",             emoji: "🕐" },
  "/workload":              { title: "Workload",           sub: "Team capacity",              emoji: "📊" },
  "/rewards":               { title: "Rewards",            sub: "Gamified milestones",        emoji: "🏆" },
  "/chat":                  { title: "Team Chat",          sub: "Real-time collaboration",    emoji: "💬" },
  "/messages":              { title: "Messages",           sub: "Direct conversations",       emoji: "✉️" },
  "/meetings":              { title: "Meetings",           sub: "Schedule & video",           emoji: "📅" },
  "/documents":             { title: "Documents",          sub: "Shared knowledge",           emoji: "📄" },
  "/ai/assistant":          { title: "Ask Colliq",         sub: "Your AI teammate",           emoji: "🤖" },
  "/ai/reports":            { title: "Colliq Reports",     sub: "AI-generated insights",      emoji: "✨" },
  "/ai/health":             { title: "Project Health",     sub: "Colliq risk analysis",       emoji: "💚" },
  "/ai/search":             { title: "Smart Search",       sub: "Find anything, instantly",   emoji: "🔍" },
  "/notifications":         { title: "Notifications",      sub: "Inbox",                      emoji: "🔔" },
  "/settings":              { title: "Settings",           sub: "Your preferences",           emoji: "⚙️" },
  "/settings/organization": { title: "Organization",       sub: "Workspace & members",        emoji: "🏢" },
  "/admin":                 { title: "Admin Panel",        sub: "Workspace management",       emoji: "🛡️" },
  "/automations":           { title: "Automations",        sub: "Workflow rules",             emoji: "⚡" },
  "/templates":             { title: "Templates",          sub: "Reusable patterns",          emoji: "📋" },
  "/integrations":          { title: "Integrations",       sub: "Connected services",         emoji: "🔗" },
  "/audit":                 { title: "Audit Log",          sub: "Activity history",           emoji: "📜" },
};

interface HeaderProps { onOpenCommand?: () => void; }

export function Header({ onOpenCommand }: HeaderProps) {
  const { data: session } = useSession();
  const { unreadCount } = useNotifications();
  const pathname = usePathname();
  const { setMobileOpen } = useSidebar();

  const matched = Object.entries(PAGE_TITLES).find(([key]) =>
    pathname === key || pathname.startsWith(key + "/")
  );
  const { title, sub } = matched?.[1] ?? { title: "Colliq" };

  return (
    <header
      className="flex items-center gap-3 sticky top-0 z-[var(--z-overlay)]"
      style={{
        height: "var(--header-h)",
        padding: "0 var(--page-x)",
        background: "var(--bg-overlay)",
        backdropFilter: "blur(28px) saturate(1.6)",
        WebkitBackdropFilter: "blur(28px) saturate(1.6)",
        borderBottom: "1px solid var(--border-subtle)",
        boxShadow: "0 1px 0 var(--border-subtle)",
      }}
    >
      {/* Mobile menu */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden w-8 h-8 rounded-xl flex items-center justify-center transition-all"
        style={{ color: "var(--text-muted)", background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
      >
        <Menu className="w-[15px] h-[15px]" />
      </button>

      {/* Page identity */}
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <div className="flex flex-col justify-center">
          <h1
            className="text-[14.5px] font-black leading-none truncate"
            style={{
              letterSpacing: "-0.03em",
              background: "linear-gradient(120deg, var(--text-foreground) 30%, var(--accent) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {title}
          </h1>
          {sub && (
            <p className="hidden sm:block text-[10.5px] leading-none mt-[3px] truncate"
              style={{ color: "var(--text-subtle)" }}>
              {sub}
            </p>
          )}
        </div>
      </div>

      {/* Search pill */}
      <button
        onClick={onOpenCommand}
        className="hidden md:flex items-center gap-2 h-8 px-3 rounded-xl transition-all duration-150 group"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          minWidth: "200px",
          maxWidth: "280px",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "rgba(99,102,241,0.4)";
          e.currentTarget.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.08)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "var(--border)";
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        <Search className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--text-subtle)" }} />
        <span className="flex-1 text-left text-[12px]" style={{ color: "var(--text-subtle)" }}>
          Search anything…
        </span>
        <span
          className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-md shrink-0"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-strong)",
            color: "var(--text-subtle)",
          }}
        >
          <Command className="w-2.5 h-2.5" />K
        </span>
      </button>

      {/* Quick create */}
      <button
        onClick={onOpenCommand}
        title="Quick create (⌘K)"
        className="w-8 h-8 rounded-xl text-white flex items-center justify-center transition-all duration-100 active:scale-95 shrink-0"
        style={{
          background: "linear-gradient(135deg, #6366F1 0%, #A78BFA 100%)",
          boxShadow: "0 4px 20px rgba(99,102,241,0.40), inset 0 1px 0 rgba(255,255,255,0.20)",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.transform = "scale(1.05)";
          (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 28px rgba(99,102,241,0.55), inset 0 1px 0 rgba(255,255,255,0.25)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.transform = "scale(1)";
          (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 20px rgba(99,102,241,0.40), inset 0 1px 0 rgba(255,255,255,0.20)";
        }}
      >
        <Plus className="w-4 h-4" strokeWidth={2.5} />
      </button>

      {/* Punch clock */}
      <PunchClock />

      {/* Theme toggle */}
      <ThemeToggle />

      {/* Notifications */}
      <Link
        href="/notifications"
        className="relative w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-150 shrink-0"
        style={{ color: "var(--text-muted)" }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLElement;
          el.style.background = "var(--bg-elevated)";
          el.style.color = "var(--text-foreground)";
          el.style.boxShadow = "0 0 0 1px var(--border)";
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLElement;
          el.style.background = "transparent";
          el.style.color = "var(--text-muted)";
          el.style.boxShadow = "none";
        }}
      >
        <Bell className="w-[15px] h-[15px]" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] px-1 rounded-full text-white text-[8px] font-bold flex items-center justify-center"
            style={{ background: "var(--danger)", boxShadow: "0 0 0 2px var(--bg-base)" }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Link>

      {/* User avatar */}
      <Link href="/settings" className="flex items-center gap-2 shrink-0 group">
        <div className="relative">
          <div style={{
            padding: 2,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #6366F1, #A78BFA)",
            boxShadow: "0 0 12px rgba(99,102,241,0.35)",
          }}>
            <div style={{ borderRadius: "50%", overflow: "hidden", background: "var(--bg-sidebar)" }}>
              <Avatar name={session?.user?.name} image={session?.user?.image} size="sm" />
            </div>
          </div>
          <span
            className="absolute -bottom-0.5 -right-0.5 w-[9px] h-[9px] rounded-full border-[1.5px]"
            style={{ background: "#22C55E", borderColor: "var(--bg-base)" }}
          />
        </div>
        <span
          className="hidden md:block text-[12px] font-semibold leading-none transition-colors group-hover:opacity-80"
          style={{ color: "var(--text-secondary)" }}
        >
          {session?.user?.name?.split(" ")[0] ?? session?.user?.email?.split("@")[0]}
        </span>
      </Link>
    </header>
  );
}
