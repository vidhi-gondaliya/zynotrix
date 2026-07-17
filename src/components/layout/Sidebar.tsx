"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, FolderKanban, CheckSquare,
  MessageSquare, Calendar, FileText, MessageCircle,
  Bot, Sparkles, Heart, Search,
  ClipboardCheck, BarChart2, Trophy,
  Workflow, LayoutTemplate, ArrowLeftRight, Puzzle, Shield,
  Bell, Settings, ShieldCheck, LogOut,
  Zap, PanelLeftClose, PanelLeftOpen, ChevronRight,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useNotifications } from "@/store/useNotifications";
import { motion, AnimatePresence } from "framer-motion";
import { hasPermission } from "@/lib/permissions";
import { Avatar } from "@/components/ui/Avatar";
import { create } from "zustand";
import { useEffect, useState } from "react";

// ── Sidebar state ──────────────────────────────────────────────────
interface SidebarStore {
  collapsed: boolean;
  mobileOpen: boolean;
  toggle: () => void;
  setMobileOpen: (v: boolean) => void;
}
export const useSidebar = create<SidebarStore>((set) => ({
  collapsed: false,
  mobileOpen: false,
  toggle: () => set((s) => ({ collapsed: !s.collapsed })),
  setMobileOpen: (v) => set({ mobileOpen: v }),
}));

interface NavItem { href: string; icon: React.ElementType; label: string; }

// ── Pinned — always visible ────────────────────────────────────────
const PINNED: NavItem[] = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/projects",  icon: FolderKanban,    label: "Projects"  },
  { href: "/tasks",     icon: CheckSquare,     label: "My Tasks"  },
];

// ── Collapsible sections ───────────────────────────────────────────
const SECTIONS = [
  {
    key: "collaborate",
    label: "Collaborate",
    items: [
      { href: "/chat",      icon: MessageSquare, label: "Team Chat" },
      { href: "/messages",  icon: MessageCircle, label: "Messages"  },
      { href: "/meetings",  icon: Calendar,      label: "Meetings"  },
      { href: "/documents", icon: FileText,       label: "Documents" },
    ] as NavItem[],
  },
  {
    key: "ai",
    label: "AI",
    items: [
      { href: "/ai/assistant", icon: Bot,      label: "AI Assistant"   },
      { href: "/ai/reports",   icon: Sparkles, label: "AI Reports"     },
      { href: "/ai/health",    icon: Heart,    label: "Project Health" },
      { href: "/ai/search",    icon: Search,   label: "AI Search"      },
    ] as NavItem[],
  },
  {
    key: "people",
    label: "People",
    items: [
      { href: "/workload",   icon: BarChart2,      label: "Workload"   },
      { href: "/attendance", icon: ClipboardCheck, label: "Attendance" },
      { href: "/rewards",    icon: Trophy,         label: "Rewards"    },
    ] as NavItem[],
  },
  {
    key: "tools",
    label: "Tools",
    items: [
      { href: "/automations",   icon: Workflow,       label: "Automations"    },
      { href: "/templates",     icon: LayoutTemplate, label: "Templates"      },
      { href: "/import-export", icon: ArrowLeftRight, label: "Import / Export"},
      { href: "/integrations",  icon: Puzzle,         label: "Integrations"   },
      { href: "/audit",         icon: Shield,         label: "Audit Log"      },
    ] as NavItem[],
  },
] as const;

// ── Sidebar ────────────────────────────────────────────────────────
export function Sidebar() {
  const pathname = usePathname();
  const { unreadCount } = useNotifications();
  const { data: session } = useSession();
  const { collapsed, toggle, mobileOpen, setMobileOpen } = useSidebar();
  const userRole = (session?.user as { role?: string })?.role ?? "MEMBER";
  const isAdmin  = hasPermission(userRole, "admin:access");

  // Which section has an active route — auto-expand it
  const activeSection = SECTIONS.find((s) =>
    s.items.some((item) => pathname === item.href || pathname.startsWith(item.href + "/"))
  )?.key ?? null;

  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    SECTIONS.forEach((s) => { init[s.key] = false; });
    return init;
  });

  // Auto-expand section containing active route
  useEffect(() => {
    if (activeSection) setOpen((p) => ({ ...p, [activeSection]: true }));
  }, [activeSection]);

  useEffect(() => { setMobileOpen(false); }, [pathname, setMobileOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "b") { e.preventDefault(); toggle(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggle]);

  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"));

  // ── Single nav item ──────────────────────────────────────────────
  const NavLink = ({ item, badge }: { item: NavItem; badge?: React.ReactNode }) => {
    const active = isActive(item.href);
    return (
      <Link
        href={item.href}
        title={collapsed ? item.label : undefined}
        className="relative flex items-center gap-2 rounded-[8px] transition-all duration-100 group"
        style={{
          padding: collapsed ? "5px 7px" : "5px 8px",
          justifyContent: collapsed ? "center" : undefined,
          color: active ? "var(--accent)" : "var(--text-muted)",
          background: active ? "var(--accent-muted)" : "transparent",
          fontSize: "12.5px",
          fontWeight: active ? 600 : 400,
          lineHeight: 1,
        }}
      >
        {active && (
          <motion.div
            layoutId="nav-rail"
            className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full"
            style={{ height: "55%", background: "var(--accent)" }}
            transition={{ type: "spring", stiffness: 600, damping: 48 }}
          />
        )}
        {!active && (
          <span className="absolute inset-0 rounded-[8px] opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "var(--bg-card-hover)" }} />
        )}

        <span className="relative z-10 shrink-0 flex items-center justify-center" style={{ width: 16, height: 16 }}>
          <item.icon className="w-[14px] h-[14px]" />
        </span>

        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.12 }}
              className="relative z-10 flex-1 truncate overflow-hidden whitespace-nowrap"
            >
              {item.label}
            </motion.span>
          )}
        </AnimatePresence>

        {badge && !collapsed && <span className="relative z-10 ml-auto shrink-0">{badge}</span>}
        {badge && collapsed && <span className="absolute top-0.5 right-0.5">{badge}</span>}
      </Link>
    );
  };

  // ── Inline section divider (collapsible) ─────────────────────────
  const SectionToggle = ({ section }: { section: typeof SECTIONS[number] }) => {
    const isOpen = open[section.key];
    const hasActive = section.items.some((item) => isActive(item.href));

    if (collapsed) {
      return (
        <div className="mx-2 my-1.5 h-px" style={{ background: "var(--border)" }} />
      );
    }

    return (
      <button
        onClick={() => setOpen((p) => ({ ...p, [section.key]: !p[section.key] }))}
        className="w-full flex items-center gap-1.5 px-1.5 py-1 mt-0.5 group/sec"
        style={{ minHeight: 22 }}
      >
        <ChevronRight
          className="w-2.5 h-2.5 shrink-0 transition-all duration-200"
          style={{
            color: hasActive ? "var(--accent)" : "var(--text-subtle)",
            transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
          }}
        />
        <span
          className="text-[9.5px] font-bold uppercase tracking-widest transition-colors whitespace-nowrap shrink-0"
          style={{ color: hasActive ? "var(--accent)" : isOpen ? "var(--text-muted)" : "var(--text-subtle)" }}
        >
          {section.label}
        </span>
        <div className="flex-1 h-px" style={{ background: isOpen || hasActive ? "var(--border)" : "var(--border-subtle)" }} />
      </button>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Brand ─────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-2 shrink-0"
        style={{
          height: 52,
          padding: "0 10px",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <Link href="/dashboard" className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
          <div
            className="shrink-0 rounded-[8px] flex items-center justify-center"
            style={{
              width: 28, height: 28,
              background: "linear-gradient(135deg, var(--accent) 0%, #A78BFA 100%)",
              boxShadow: "0 0 14px var(--accent-glow)",
            }}
          >
            <Zap className="w-[13px] h-[13px] text-white" strokeWidth={2.5} />
          </div>
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.12 }}
                className="text-[13.5px] font-black tracking-[-0.03em] overflow-hidden whitespace-nowrap"
                style={{
                  background: "linear-gradient(120deg, var(--text-foreground) 20%, var(--accent) 100%)",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                }}
              >
                ZYNOTRIX
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
        <button
          onClick={toggle}
          title={collapsed ? "Expand (⌘B)" : "Collapse (⌘B)"}
          className="hidden lg:flex shrink-0 w-6 h-6 rounded-md items-center justify-center transition-all"
          style={{ color: "var(--text-subtle)" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-card-hover)"; (e.currentTarget as HTMLElement).style.color = "var(--text-foreground)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--text-subtle)"; }}
        >
          {collapsed ? <PanelLeftOpen className="w-3.5 h-3.5" /> : <PanelLeftClose className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* ── Nav ───────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5 no-scrollbar">

        {/* Pinned core items */}
        {PINNED.map((item) => <NavLink key={item.href} item={item} />)}

        {/* Collapsible sections */}
        {SECTIONS.map((section) => (
          <div key={section.key}>
            <SectionToggle section={section} />
            <AnimatePresence initial={false}>
              {(collapsed || open[section.key]) && (
                <motion.div
                  initial={false}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.15, ease: "easeInOut" }}
                  className="overflow-hidden space-y-0.5"
                  style={{ paddingLeft: collapsed ? 0 : 2 }}
                >
                  {section.items.map((item) => {
                    const badge = item.href === "/messages" && unreadCount > 0
                      ? <span className="min-w-[14px] h-[14px] px-0.5 rounded-full text-white text-[8px] font-bold flex items-center justify-center" style={{ background: "var(--danger)" }}>{unreadCount > 9 ? "9+" : unreadCount}</span>
                      : null;
                    return <NavLink key={item.href} item={item} badge={badge} />;
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </nav>

      {/* ── Bottom dock ───────────────────────────────────────── */}
      <div className="shrink-0 px-2 pb-2" style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 8 }}>
        <div className="space-y-0.5">
          <NavLink
            item={{ href: "/notifications", icon: Bell, label: "Notifications" }}
            badge={unreadCount > 0 ? <span className="min-w-[14px] h-[14px] px-0.5 rounded-full text-white text-[8px] font-bold flex items-center justify-center" style={{ background: "var(--danger)" }}>{unreadCount > 9 ? "9+" : unreadCount}</span> : null}
          />
          {(isAdmin || pathname.startsWith("/admin")) && (
            <NavLink item={{ href: "/admin", icon: ShieldCheck, label: "Admin Panel" }} />
          )}
          <NavLink item={{ href: "/settings", icon: Settings, label: "Settings" }} />
        </div>

        {/* User */}
        <div className="mt-2 pt-2 flex items-center gap-2 px-1" style={{ borderTop: "1px solid var(--border-subtle)" }}>
          <div className="relative shrink-0">
            <Avatar name={session?.user?.name} image={session?.user?.image} size="xs" />
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border-[1.5px]"
              style={{ background: "var(--success)", borderColor: "var(--bg-sidebar)" }} />
          </div>
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: "auto" }} exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.12 }}
                className="flex-1 min-w-0 overflow-hidden"
              >
                <p className="text-[11.5px] font-semibold leading-none truncate whitespace-nowrap" style={{ color: "var(--text-foreground)" }}>
                  {session?.user?.name?.split(" ")[0] ?? session?.user?.email?.split("@")[0]}
                </p>
                <p className="text-[9.5px] font-semibold mt-0.5 truncate whitespace-nowrap uppercase tracking-wider" style={{ color: "var(--text-subtle)" }}>
                  {userRole}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
          {!collapsed && (
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              title="Sign out"
              className="shrink-0 p-1 rounded-md transition-all"
              style={{ color: "var(--text-subtle)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--danger)"; (e.currentTarget as HTMLElement).style.background = "var(--danger-muted)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-subtle)"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <LogOut className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside
        className="hidden lg:flex flex-col fixed left-0 top-0 h-full z-[var(--z-sidebar)] overflow-hidden"
        style={{
          width: collapsed ? "var(--sidebar-w-collapsed)" : "var(--sidebar-w)",
          background: "var(--bg-sidebar)",
          borderRight: "1px solid var(--border)",
          transition: "width 0.2s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {sidebarContent}
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="mobile-overlay lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 400, damping: 38 }}
            className="fixed left-0 top-0 h-full z-[var(--z-modal)] flex flex-col lg:hidden overflow-hidden"
            style={{ width: "var(--sidebar-w)", background: "var(--bg-sidebar)", borderRight: "1px solid var(--border)" }}
          >
            {sidebarContent}
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
