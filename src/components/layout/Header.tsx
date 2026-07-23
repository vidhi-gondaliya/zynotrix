"use client";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Bell, Search, Plus, Command, Menu } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { ThemeToggle } from "./ThemeToggle";
import { PunchClock } from "./PunchClock";
import { useNotifications } from "@/store/useNotifications";
import { usePathname } from "next/navigation";
import { useSidebar } from "./Sidebar";

const PAGE_TITLES: Record<string, { title: string; sub?: string }> = {
  "/dashboard":    { title: "Dashboard",       sub: "Your command centre" },
  "/projects":     { title: "Projects",        sub: "All your workspaces" },
  "/tasks":        { title: "My Tasks",        sub: "What needs doing" },
  "/attendance":   { title: "Attendance",      sub: "Punch in & out" },
  "/workload":     { title: "Workload",        sub: "Team capacity" },
  "/rewards":      { title: "Rewards",         sub: "Gamified milestones" },
  "/chat":         { title: "Team Chat",       sub: "Real-time collaboration" },
  "/messages":     { title: "Messages",        sub: "Direct conversations" },
  "/meetings":     { title: "Meetings",        sub: "Schedule & video" },
  "/documents":    { title: "Documents",       sub: "Shared knowledge" },
  "/ai/assistant": { title: "Ask Colliq",       sub: "Your AI teammate" },
  "/ai/reports":   { title: "Colliq Reports",  sub: "AI-generated insights" },
  "/ai/health":    { title: "Project Health",  sub: "Colliq risk analysis" },
  "/ai/search":    { title: "Search with Colliq", sub: "Find anything, instantly" },
  "/notifications":{ title: "Notifications",   sub: "Inbox" },
  "/settings":     { title: "Settings",        sub: "Your preferences" },
  "/admin":        { title: "Admin Panel",     sub: "Workspace management" },
  "/automations":  { title: "Automations",     sub: "Workflow rules" },
  "/templates":    { title: "Templates",       sub: "Reusable patterns" },
  "/integrations": { title: "Integrations",    sub: "Connected services" },
  "/audit":        { title: "Audit Log",       sub: "Activity history" },
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
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderBottom: "1px solid var(--border-subtle)",
      }}
    >
      {/* Mobile menu */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center transition-all"
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
        <Menu className="w-[17px] h-[17px]" />
      </button>

      {/* Page identity */}
      <div className="flex flex-col justify-center flex-1 min-w-0">
        <h1
          className="text-[14px] font-bold leading-none truncate"
          style={{ color: "var(--text-foreground)", letterSpacing: "-0.02em" }}
        >
          {title}
        </h1>
        {sub && (
          <p
            className="hidden sm:block text-[11px] leading-none mt-0.5 truncate"
            style={{ color: "var(--text-subtle)" }}
          >
            {sub}
          </p>
        )}
      </div>

      {/* ⌘K search pill */}
      <button
        onClick={onOpenCommand}
        className="hidden sm:flex items-center gap-2 h-8 px-3 rounded-xl transition-all duration-150"
        style={{
          background: "var(--bg-elevated)",
          border: "1.5px solid var(--border)",
          minWidth: "180px",
          maxWidth: "260px",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "var(--accent)";
          e.currentTarget.style.boxShadow = "0 0 0 3px var(--accent-muted)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "var(--border)";
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        <Search className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--text-subtle)" }} />
        <span
          className="flex-1 text-left text-[12.5px]"
          style={{ color: "var(--text-subtle)" }}
        >
          Ask Colliq or search…
        </span>
        <span
          className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-1 rounded-md shrink-0"
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
          background: "var(--accent)",
          boxShadow: "var(--shadow-glow-btn)",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background = "var(--accent-hover)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background = "var(--accent)";
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
        className="relative w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-100 shrink-0"
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
        <Bell className="w-[16px] h-[16px]" />
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
          <Avatar name={session?.user?.name} image={session?.user?.image} size="sm" ring />
          <span
            className="absolute -bottom-0.5 -right-0.5 w-[9px] h-[9px] rounded-full border-[1.5px]"
            style={{ background: "var(--success)", borderColor: "var(--bg-base)" }}
          />
        </div>
        <span
          className="hidden md:block text-[12.5px] font-semibold leading-none transition-colors duration-100 group-hover:text-[var(--accent)]"
          style={{ color: "var(--text-secondary)" }}
        >
          {session?.user?.name?.split(" ")[0] ?? session?.user?.email?.split("@")[0]}
        </span>
      </Link>
    </header>
  );
}
