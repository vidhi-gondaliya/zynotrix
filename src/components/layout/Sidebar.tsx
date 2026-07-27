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

const PINNED: NavItem[] = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/projects",  icon: FolderKanban,    label: "Projects"  },
  { href: "/tasks",     icon: CheckSquare,     label: "My Tasks"  },
];

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
    label: "Colliq AI",
    items: [
      { href: "/ai/assistant", icon: Bot,      label: "Ask Colliq"      },
      { href: "/ai/reports",   icon: Sparkles, label: "Colliq Reports"  },
      { href: "/ai/health",    icon: Heart,    label: "Project Health"  },
      { href: "/ai/search",    icon: Search,   label: "Search with Colliq" },
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

export function Sidebar() {
  const pathname = usePathname();
  const { unreadCount } = useNotifications();
  const { data: session } = useSession();
  const { collapsed, toggle, mobileOpen, setMobileOpen } = useSidebar();
  const userRole = (session?.user as { role?: string })?.role ?? "MEMBER";
  const isAdmin  = hasPermission(userRole, "admin:access");

  const activeSection = SECTIONS.find((s) =>
    s.items.some((item) => pathname === item.href || pathname.startsWith(item.href + "/"))
  )?.key ?? null;

  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    SECTIONS.forEach((s) => { init[s.key] = false; });
    return init;
  });

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

  const NavLink = ({ item, badge }: { item: NavItem; badge?: React.ReactNode }) => {
    const active = isActive(item.href);
    return (
      <Link
        href={item.href}
        title={collapsed ? item.label : undefined}
        className="relative flex items-center gap-2.5 rounded-[10px] transition-all duration-150 group"
        style={{
          padding: "7px 10px",
          justifyContent: collapsed ? "center" : undefined,
          color: active ? "#fff" : "var(--text-secondary)",
          background: active
            ? "linear-gradient(135deg, rgba(99,102,241,0.90) 0%, rgba(139,92,246,0.85) 100%)"
            : "transparent",
          boxShadow: active
            ? "0 2px 16px rgba(99,102,241,0.40), inset 0 1px 0 rgba(255,255,255,0.15)"
            : "none",
          fontSize: "13px",
          fontWeight: active ? 700 : 500,
        }}
      >
        {!active && (
          <span className="absolute inset-0 rounded-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: "rgba(255,255,255,0.05)" }} />
        )}

        <span className="relative z-10 shrink-0 flex items-center justify-center" style={{ width: 17, height: 17 }}>
          <item.icon className="w-[15px] h-[15px]" strokeWidth={active ? 2.3 : 1.9} />
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

  const SectionToggle = ({ section }: { section: typeof SECTIONS[number] }) => {
    const isOpen = open[section.key];
    const hasActive = section.items.some((item) => isActive(item.href));

    if (collapsed) {
      return <div className="mx-2 my-2 h-px" style={{ background: "var(--border-subtle)" }} />;
    }

    return (
      <button
        onClick={() => setOpen((p) => ({ ...p, [section.key]: !p[section.key] }))}
        className="w-full flex items-center gap-1.5 px-1.5 py-1 mt-1 group/sec"
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
          className="text-[10px] font-bold uppercase tracking-widest transition-colors whitespace-nowrap shrink-0"
          style={{
            color: hasActive ? "var(--accent)" : isOpen ? "var(--text-muted)" : "var(--text-subtle)",
            letterSpacing: "0.09em",
          }}
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
        className="relative flex items-center gap-2.5 shrink-0 overflow-hidden"
        style={{
          height: 64,
          padding: "0 12px",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 140% 120% at 30% 50%, rgba(99,102,241,0.22) 0, transparent 65%), radial-gradient(ellipse 80% 80% at 80% 20%, rgba(167,139,250,0.14) 0, transparent 55%)",
            backgroundSize: "200% 200%",
            animation: "aurora-shift 10s ease-in-out infinite",
          }}
        />
        <Link href="/dashboard" className="relative flex items-center gap-2.5 flex-1 min-w-0 overflow-hidden">
          <div
            className="shrink-0 rounded-[11px] flex items-center justify-center"
            style={{
              width: 34, height: 34,
              background: "linear-gradient(135deg, #6366F1 0%, #A78BFA 100%)",
              boxShadow: "0 0 20px rgba(99,102,241,0.55), 0 4px 12px rgba(0,0,0,0.30)",
            }}
          >
            <Zap className="w-[15px] h-[15px] text-white" strokeWidth={2.5} />
          </div>
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.12 }}
                className="flex flex-col overflow-hidden"
              >
                <span
                  className="text-[16px] font-black tracking-[-0.04em] whitespace-nowrap leading-none"
                  style={{
                    background: "linear-gradient(120deg, #fff 10%, #a5b4fc 85%)",
                    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                  }}
                >
                  COLLIQ
                </span>
                <span className="text-[9px] font-semibold tracking-widest uppercase whitespace-nowrap leading-none mt-0.5"
                  style={{ color: "var(--text-subtle)" }}>
                  by Zynotrix
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </Link>
        <button
          onClick={toggle}
          title={collapsed ? "Expand (⌘B)" : "Collapse (⌘B)"}
          className="hidden lg:flex shrink-0 w-6 h-6 rounded-md items-center justify-center transition-all"
          style={{ color: "var(--text-subtle)" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)";
            (e.currentTarget as HTMLElement).style.color = "var(--text-foreground)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
            (e.currentTarget as HTMLElement).style.color = "var(--text-subtle)";
          }}
        >
          {collapsed ? <PanelLeftOpen className="w-3.5 h-3.5" /> : <PanelLeftClose className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* ── Nav ───────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5 no-scrollbar">
        {PINNED.map((item) => <NavLink key={item.href} item={item} />)}

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
                      ? <span className="min-w-[14px] h-[14px] px-0.5 rounded-full text-white text-[8px] font-bold flex items-center justify-center"
                          style={{ background: "var(--danger)" }}>{unreadCount > 9 ? "9+" : unreadCount}</span>
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
      <div className="shrink-0 px-2 pb-2"
        style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 8 }}>
        <div className="space-y-0.5">
          <NavLink
            item={{ href: "/notifications", icon: Bell, label: "Notifications" }}
            badge={unreadCount > 0 ? <span className="min-w-[14px] h-[14px] px-0.5 rounded-full text-white text-[8px] font-bold flex items-center justify-center"
              style={{ background: "var(--danger)" }}>{unreadCount > 9 ? "9+" : unreadCount}</span> : null}
          />
          {(isAdmin || pathname.startsWith("/admin")) && (
            <NavLink item={{ href: "/admin", icon: ShieldCheck, label: "Admin Panel" }} />
          )}
          <NavLink item={{ href: "/settings", icon: Settings, label: "Settings" }} />
        </div>

        {/* User card */}
        <div className="mt-2 pt-2" style={{ borderTop: "1px solid var(--border-subtle)" }}>
          <div className="flex items-center gap-2 px-2 py-2 rounded-xl transition-all"
            style={{ background: "var(--bg-card-hover)" }}>
            <div className="relative shrink-0">
              <Avatar name={session?.user?.name} image={session?.user?.image} size="xs" />
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border-[1.5px]"
                style={{ background: "#22C55E", borderColor: "var(--bg-sidebar)" }} />
            </div>
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: "auto" }} exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.12 }}
                  className="flex-1 min-w-0 overflow-hidden"
                >
                  <p className="text-[12px] font-bold leading-none truncate whitespace-nowrap"
                    style={{ color: "var(--text-foreground)" }}>
                    {session?.user?.name?.split(" ")[0] ?? session?.user?.email?.split("@")[0]}
                  </p>
                  <p className="text-[9.5px] font-semibold mt-0.5 truncate whitespace-nowrap uppercase tracking-wider"
                    style={{ color: "var(--text-subtle)" }}>
                    {userRole}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
            {!collapsed && (
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                title="Sign out"
                className="shrink-0 p-1 rounded-lg transition-all"
                style={{ color: "var(--text-subtle)" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.color = "var(--danger)";
                  (e.currentTarget as HTMLElement).style.background = "var(--danger-muted)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.color = "var(--text-subtle)";
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                }}
              >
                <LogOut className="w-3 h-3" />
              </button>
            )}
          </div>
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
