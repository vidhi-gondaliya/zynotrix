"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, FolderKanban, CheckSquare,
  MessageSquare, Calendar, FileText, MessageCircle,
  Bot, Sparkles, Heart, Search,
  ClipboardCheck, BarChart2, Trophy,
  Workflow, LayoutTemplate, ArrowLeftRight, Puzzle, Shield,
  Bell, Settings, ShieldCheck, LogOut, CreditCard,
  Zap, PanelLeftClose, PanelLeftOpen, ChevronDown, Receipt,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useNotifications } from "@/store/useNotifications";
import { motion, AnimatePresence } from "framer-motion";
import { hasPermission } from "@/lib/permissions";
import { Avatar } from "@/components/ui/Avatar";
import { create } from "zustand";
import { useEffect, useState } from "react";

/* ── Zustand store ─────────────────────────────────────────────────────────── */
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

/* ── Nav data ──────────────────────────────────────────────────────────────── */
interface NavItem { href: string; icon: React.ElementType; label: string; }

const PINNED: NavItem[] = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/projects",  icon: FolderKanban,    label: "Projects"  },
  { href: "/tasks",     icon: CheckSquare,     label: "My Tasks"  },
];

const SECTIONS = [
  {
    key: "collaborate", label: "Collaborate", dot: "#60A5FA",
    items: [
      { href: "/chat",      icon: MessageSquare, label: "Team Chat"  },
      { href: "/messages",  icon: MessageCircle, label: "Messages"   },
      { href: "/meetings",  icon: Calendar,      label: "Meetings"   },
      { href: "/documents", icon: FileText,      label: "Documents"  },
    ] as NavItem[],
  },
  {
    key: "ai", label: "Colliq AI", dot: "#818CF8",
    items: [
      { href: "/ai/assistant", icon: Bot,      label: "Ask Colliq"         },
      { href: "/ai/reports",   icon: Sparkles, label: "Colliq Reports"     },
      { href: "/ai/health",    icon: Heart,    label: "Project Health"     },
      { href: "/ai/search",    icon: Search,   label: "Search with Colliq" },
    ] as NavItem[],
  },
  {
    key: "people", label: "People", dot: "#4ADE80",
    items: [
      { href: "/workload",   icon: BarChart2,      label: "Workload"   },
      { href: "/attendance", icon: ClipboardCheck, label: "Attendance" },
      { href: "/rewards",    icon: Trophy,         label: "Rewards"    },
    ] as NavItem[],
  },
  {
    key: "tools", label: "Tools", dot: "#FBBF24",
    items: [
      { href: "/automations",   icon: Workflow,       label: "Automations"     },
      { href: "/templates",     icon: LayoutTemplate, label: "Templates"       },
      { href: "/import-export", icon: ArrowLeftRight, label: "Import / Export" },
      { href: "/integrations",  icon: Puzzle,         label: "Integrations"    },
    ] as NavItem[],
  },
] as const;

/* ── Motion variants ───────────────────────────────────────────────────────── */
const navVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.038, delayChildren: 0.06 } },
};
const itemVariant = {
  hidden: { opacity: 0, x: -10 },
  show:   { opacity: 1, x: 0, transition: { duration: 0.28, ease: "easeOut" as const } },
};
// Submenu container — animates height AND propagates "hidden"/"show" to NavLink children
const submenuVariants = {
  hidden: { height: 0, opacity: 0, transition: { duration: 0.16, ease: "easeInOut" as const } },
  show:   { height: "auto", opacity: 1, transition: { duration: 0.18, ease: "easeInOut" as const, staggerChildren: 0.04, delayChildren: 0.04 } },
};

/* ── Always-dark sidebar palette ───────────────────────────────────────────── */
const SB = {
  bg:      "linear-gradient(180deg, #0C0D26 0%, #08091C 100%)",
  border:  "rgba(255,255,255,0.07)",
  text:    "rgba(255,255,255,0.52)",
  hover:   "rgba(255,255,255,0.88)",
  hoverBg: "rgba(255,255,255,0.065)",
  active:  "#ffffff",
  section: "rgba(255,255,255,0.28)",
  userBg:  "rgba(255,255,255,0.04)",
};

/* ── Badge ─────────────────────────────────────────────────────────────────── */
function Badge({ count }: { count: number }) {
  return (
    <span style={{
      minWidth: 16, height: 16, padding: "0 3.5px", borderRadius: 100,
      background: "#EF4444", color: "#fff", fontSize: 8, fontWeight: 900,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      {count > 9 ? "9+" : count}
    </span>
  );
}

/* ── NavLink ───────────────────────────────────────────────────────────────── */
function NavLink({
  item, badge, collapsed, active,
}: {
  item: NavItem;
  badge?: React.ReactNode;
  collapsed: boolean;
  active: boolean;
}) {
  return (
    <motion.div variants={itemVariant}>
      <Link
        href={item.href}
        title={collapsed ? item.label : undefined}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          justifyContent: collapsed ? "center" : undefined,
          padding: collapsed ? "10px 0" : "9px 13px",
          borderRadius: 13,
          fontSize: 14,
          fontWeight: active ? 700 : 450,
          letterSpacing: active ? "-0.01em" : "-0.005em",
          color: active ? SB.active : SB.text,
          background: active
            ? "linear-gradient(135deg, rgba(99,102,241,0.92) 0%, rgba(139,92,246,0.88) 100%)"
            : "transparent",
          boxShadow: active
            ? "0 2px 22px rgba(99,102,241,0.48), inset 0 1px 0 rgba(255,255,255,0.16)"
            : "none",
          textDecoration: "none",
          position: "relative",
          overflow: "hidden",
          transition: "background 0.16s ease, color 0.16s ease, transform 0.16s ease, box-shadow 0.16s ease",
        }}
        onMouseEnter={(e) => {
          if (!active) {
            (e.currentTarget as HTMLElement).style.background = SB.hoverBg;
            (e.currentTarget as HTMLElement).style.color = SB.hover;
            (e.currentTarget as HTMLElement).style.transform = "translateX(3px)";
          }
        }}
        onMouseLeave={(e) => {
          if (!active) {
            (e.currentTarget as HTMLElement).style.background = "transparent";
            (e.currentTarget as HTMLElement).style.color = SB.text;
            (e.currentTarget as HTMLElement).style.transform = "translateX(0)";
          }
        }}
      >
        {active && (
          <motion.span
            layoutId="active-ring"
            style={{
              position: "absolute", inset: 0, borderRadius: 13,
              boxShadow: "0 0 0 1px rgba(99,102,241,0.55)",
              pointerEvents: "none",
            }}
          />
        )}

        <span style={{
          flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
          width: 18, height: 18,
        }}>
          <item.icon style={{ width: 16, height: 16 }} strokeWidth={active ? 2.3 : 1.85} />
        </span>

        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.14 }}
              style={{ flex: 1, overflow: "hidden", whiteSpace: "nowrap" }}
            >
              {item.label}
            </motion.span>
          )}
        </AnimatePresence>

        {badge && !collapsed && <span style={{ marginLeft: "auto", flexShrink: 0 }}>{badge}</span>}
        {badge && collapsed  && <span style={{ position: "absolute", top: 2, right: 2 }}>{badge}</span>}
      </Link>
    </motion.div>
  );
}

/* ── SectionToggle ─────────────────────────────────────────────────────────── */
function SectionToggle({
  section, collapsed, isOpen, hasActive, onToggle,
}: {
  section: { key: string; label: string; dot: string };
  collapsed: boolean;
  isOpen: boolean;
  hasActive: boolean;
  onToggle: () => void;
}) {
  if (collapsed) return (
    <div style={{ height: 1, margin: "10px 8px", background: SB.border }} />
  );

  return (
    <motion.button
      variants={itemVariant}
      onClick={onToggle}
      style={{
        width: "100%", display: "flex", alignItems: "center", gap: 7,
        padding: "8px 10px 4px", background: "none", border: "none", cursor: "pointer",
        marginTop: 6,
      }}
    >
      <motion.span
        animate={{ scale: hasActive ? [1, 1.3, 1] : 1 }}
        transition={{ duration: 0.4 }}
        style={{
          width: 5, height: 5, borderRadius: "50%", flexShrink: 0,
          background: hasActive ? section.dot : "rgba(255,255,255,0.18)",
          boxShadow: hasActive ? `0 0 7px ${section.dot}` : "none",
          transition: "background 0.2s, box-shadow 0.2s",
        }}
      />
      <span style={{
        fontSize: 9.5, fontWeight: 800, letterSpacing: "0.13em", textTransform: "uppercase",
        color: hasActive ? "rgba(255,255,255,0.72)" : SB.section,
        flex: 1, textAlign: "left",
        transition: "color 0.2s",
      }}>
        {section.label}
      </span>
      <ChevronDown style={{
        width: 11, height: 11, flexShrink: 0,
        color: "rgba(255,255,255,0.2)",
        transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
        transition: "transform 0.22s ease",
      }} />
    </motion.button>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
export function Sidebar() {
  const pathname        = usePathname();
  const { unreadCount } = useNotifications();
  const { data: session } = useSession();
  const { collapsed, toggle, mobileOpen, setMobileOpen } = useSidebar();
  const userRole = (session?.user as { role?: string })?.role ?? "MEMBER";
  const isAdmin  = hasPermission(userRole, "admin:access");

  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"));

  const activeSection = SECTIONS.find((s) =>
    s.items.some((item) => isActive(item.href))
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

  /* ── Sidebar body ────────────────────────────────────────────────────────── */
  const sidebarContent = (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>

      {/* Brand */}
      <div style={{
        position: "relative", flexShrink: 0, height: 68, overflow: "hidden",
        padding: "0 14px", borderBottom: `1px solid ${SB.border}`,
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <div aria-hidden style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "radial-gradient(ellipse 140% 120% at 30% 50%, rgba(99,102,241,0.22) 0, transparent 65%), radial-gradient(ellipse 80% 80% at 80% 20%, rgba(167,139,250,0.14) 0, transparent 55%)",
          animation: "aurora-shift 10s ease-in-out infinite",
        }} />

        <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0, overflow: "hidden", textDecoration: "none" }}>
          <motion.div
            whileHover={{ scale: 1.08, rotate: 5 }}
            transition={{ type: "spring", stiffness: 400, damping: 18 }}
            style={{
              flexShrink: 0, width: 37, height: 37, borderRadius: 12,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "linear-gradient(135deg, #6366F1 0%, #A78BFA 100%)",
              boxShadow: "0 0 28px rgba(99,102,241,0.7), 0 4px 14px rgba(0,0,0,0.35)",
            }}
          >
            <Zap style={{ width: 17, height: 17, color: "#fff" }} strokeWidth={2.5} />
          </motion.div>

          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.14 }}
                style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}
              >
                <span style={{
                  fontSize: 17, fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1, whiteSpace: "nowrap",
                  background: "linear-gradient(120deg, #ffffff 10%, #a5b4fc 88%)",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                }}>
                  COLLIQ
                </span>
                <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginTop: 2 }}>
                  by Zynotrix
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </Link>

        <button
          onClick={toggle}
          title={collapsed ? "Expand (⌘B)" : "Collapse (⌘B)"}
          className="hidden lg:flex"
          style={{
            flexShrink: 0, width: 26, height: 26, borderRadius: 8,
            alignItems: "center", justifyContent: "center",
            color: "rgba(255,255,255,0.28)", background: "none", border: "none", cursor: "pointer",
            transition: "background 0.15s, color 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.09)";
            (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.8)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "none";
            (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.28)";
          }}
        >
          {collapsed
            ? <PanelLeftOpen style={{ width: 14, height: 14 }} />
            : <PanelLeftClose style={{ width: 14, height: 14 }} />}
        </button>
      </div>

      {/* Nav */}
      <motion.nav
        initial="hidden"
        animate="show"
        variants={navVariants}
        className="no-scrollbar"
        style={{ flex: 1, overflowY: "auto", padding: "10px 10px 6px", display: "flex", flexDirection: "column", gap: 2 }}
      >
        {PINNED.map((item) => (
          <NavLink key={item.href} item={item} collapsed={collapsed} active={isActive(item.href)} />
        ))}

        <div style={{ height: 8 }} />

        {SECTIONS.map((section) => (
          <div key={section.key} style={{ marginBottom: 2 }}>
            <SectionToggle
              section={section}
              collapsed={collapsed}
              isOpen={open[section.key]}
              hasActive={section.items.some((item) => isActive(item.href))}
              onToggle={() => setOpen((p) => ({ ...p, [section.key]: !p[section.key] }))}
            />
            <AnimatePresence initial={false}>
              {(collapsed || open[section.key]) && (
                <motion.div
                  key={section.key}
                  variants={submenuVariants}
                  initial="hidden"
                  animate="show"
                  exit="hidden"
                  style={{ overflow: "hidden", marginTop: 2 }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {section.items.map((item) => {
                      const badge = item.href === "/messages" && unreadCount > 0
                        ? <Badge count={unreadCount} />
                        : null;
                      return (
                        <NavLink
                          key={item.href}
                          item={item}
                          badge={badge}
                          collapsed={collapsed}
                          active={isActive(item.href)}
                        />
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </motion.nav>

      {/* Bottom dock */}
      <div style={{ flexShrink: 0, padding: "8px 10px 10px", borderTop: `1px solid ${SB.border}` }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
            <NavLink
              item={{ href: "/notifications", icon: Bell, label: "Notifications" }}
              badge={unreadCount > 0 ? <Badge count={unreadCount} /> : null}
              collapsed={collapsed}
              active={isActive("/notifications")}
            />
          </motion.div>
          {(isAdmin || pathname.startsWith("/admin")) && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.44 }}>
              <NavLink item={{ href: "/admin", icon: ShieldCheck, label: "Admin Panel" }} collapsed={collapsed} active={isActive("/admin")} />
            </motion.div>
          )}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.46 }}>
            <NavLink item={{ href: "/billing", icon: CreditCard, label: "Billing" }} collapsed={collapsed} active={isActive("/billing")} />
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.48 }}>
            <NavLink item={{ href: "/audit", icon: Receipt, label: "Audit Log" }} collapsed={collapsed} active={isActive("/audit")} />
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.50 }}>
            <NavLink item={{ href: "/settings", icon: Settings, label: "Settings" }} collapsed={collapsed} active={isActive("/settings")} />
          </motion.div>
        </div>

        {/* User card */}
        <motion.div
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.52, duration: 0.3 }}
          style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${SB.border}` }}
        >
          <div style={{
            display: "flex", alignItems: "center", gap: 9,
            padding: "10px 11px", borderRadius: 14,
            background: SB.userBg,
            border: "1px solid rgba(255,255,255,0.06)",
          }}>
            <div style={{ position: "relative", flexShrink: 0 }}>
              <Avatar name={session?.user?.name} image={session?.user?.image} size="xs" />
              <span style={{
                position: "absolute", bottom: -1, right: -1,
                width: 8, height: 8, borderRadius: "50%",
                background: "#22C55E", border: "2px solid #0C0D26",
              }} />
            </div>

            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: "auto" }} exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.14 }}
                  style={{ flex: 1, minWidth: 0, overflow: "hidden" }}
                >
                  <p style={{
                    fontSize: 13, fontWeight: 700, color: "#fff",
                    lineHeight: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                    {session?.user?.name?.split(" ")[0] ?? session?.user?.email?.split("@")[0]}
                  </p>
                  <p style={{
                    fontSize: 9.5, fontWeight: 600, marginTop: 2,
                    color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.09em",
                    whiteSpace: "nowrap",
                  }}>
                    {userRole}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {!collapsed && (
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                title="Sign out"
                style={{
                  flexShrink: 0, padding: 6, borderRadius: 8,
                  color: "rgba(255,255,255,0.28)", background: "none", border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "color 0.15s, background 0.15s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.color = "#F87171";
                  (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.14)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.28)";
                  (e.currentTarget as HTMLElement).style.background = "none";
                }}
              >
                <LogOut style={{ width: 13, height: 13 }} />
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex flex-col fixed left-0 top-0 h-full z-[var(--z-sidebar)] overflow-hidden"
        style={{
          width: collapsed ? "var(--sidebar-w-collapsed)" : "var(--sidebar-w)",
          background: SB.bg,
          borderRight: `1px solid ${SB.border}`,
          transition: "width 0.22s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="mobile-overlay lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 400, damping: 38 }}
            className="fixed left-0 top-0 h-full z-[var(--z-modal)] flex flex-col lg:hidden overflow-hidden"
            style={{
              width: "var(--sidebar-w)",
              background: SB.bg,
              borderRight: `1px solid ${SB.border}`,
            }}
          >
            {sidebarContent}
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
