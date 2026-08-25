"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell, CheckCheck, Info, AlertTriangle, Calendar,
  CheckSquare, MessageSquare, AtSign, Activity, X,
} from "lucide-react";
import { useNotifications } from "@/store/useNotifications";
import type { Notification, NotificationType } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

const TYPE_CONFIG: Record<NotificationType, {
  icon: React.ReactNode;
  bg: string;
  color: string;
}> = {
  TASK_ASSIGNED:    { icon: <CheckSquare className="w-3.5 h-3.5" />,  bg: "var(--accent-muted)",   color: "var(--accent)"   },
  TASK_DUE:         { icon: <AlertTriangle className="w-3.5 h-3.5" />, bg: "var(--warning-muted)",  color: "var(--warning)"  },
  TASK_OVERDUE:     { icon: <AlertTriangle className="w-3.5 h-3.5" />, bg: "var(--danger-muted)",   color: "var(--danger)"   },
  COMMENT_ADDED:    { icon: <MessageSquare className="w-3.5 h-3.5" />, bg: "var(--info-muted)",     color: "var(--info)"     },
  MEETING_REMINDER: { icon: <Calendar className="w-3.5 h-3.5" />,      bg: "var(--energy-muted)",   color: "var(--energy)"   },
  MEETING_INVITE:   { icon: <Calendar className="w-3.5 h-3.5" />,      bg: "var(--energy-muted)",   color: "var(--energy)"   },
  HEALTH_ALERT:     { icon: <Activity className="w-3.5 h-3.5" />,      bg: "var(--warning-muted)",  color: "var(--warning)"  },
  MENTION:          { icon: <AtSign className="w-3.5 h-3.5" />,        bg: "var(--accent-muted)",   color: "var(--accent)"   },
  SYSTEM:           { icon: <Info className="w-3.5 h-3.5" />,          bg: "var(--bg-elevated)",    color: "var(--text-muted)" },
};

function getNotificationLink(n: Notification): string | null {
  if (!n.data) return null;
  try {
    const d = JSON.parse(n.data) as Record<string, string>;
    if (d.taskId && d.projectId) return `/projects/${d.projectId}/board?task=${d.taskId}`;
    if (d.projectId) return `/projects/${d.projectId}/board`;
    if (d.meetingId) return `/meetings`;
  } catch {}
  return null;
}

export function NotificationsPopover() {
  const router = useRouter();
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handleMarkAllRead = async () => {
    const res = await fetch("/api/notifications/read-all", { method: "PUT" });
    if (res.ok) { markAllRead(); toast.success("All marked as read"); }
  };

  const handleNavigate = (n: Notification) => {
    if (!n.isRead) markRead(n.id);
    const link = getNotificationLink(n);
    setOpen(false);
    if (link) router.push(link);
  };

  return (
    <div ref={rootRef} data-tour-id="tour-notifications" style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-150 shrink-0"
        style={{ color: open ? "var(--text-foreground)" : "var(--text-muted)", background: open ? "var(--bg-elevated)" : "transparent" }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLElement;
          el.style.background = "var(--bg-elevated)";
          el.style.color = "var(--text-foreground)";
          el.style.boxShadow = "0 0 0 1px var(--border)";
        }}
        onMouseLeave={(e) => {
          if (open) return;
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
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="panel"
            style={{
              position: "absolute", top: "calc(100% + 10px)", right: 0,
              width: 380, maxWidth: "calc(100vw - 32px)",
              maxHeight: 480, display: "flex", flexDirection: "column",
              overflow: "hidden", zIndex: 100,
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-bold" style={{ color: "var(--text-foreground)" }}>Notifications</span>
                {unreadCount > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "var(--accent-muted)", color: "var(--accent)" }}>
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    title="Mark all as read"
                    className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors"
                    style={{ color: "var(--text-muted)" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--accent)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors"
                  style={{ color: "var(--text-muted)" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-foreground)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="overflow-y-auto no-scrollbar" style={{ flex: 1 }}>
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-12 px-6">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-3" style={{ background: "var(--accent-muted)" }}>
                    <Bell className="w-5 h-5" style={{ color: "var(--accent)" }} />
                  </div>
                  <p className="text-[12.5px] font-semibold" style={{ color: "var(--text-foreground)" }}>All clear!</p>
                  <p className="text-[11.5px] mt-1" style={{ color: "var(--text-muted)" }}>You&apos;ll see updates here as they happen.</p>
                </div>
              ) : (
                notifications.slice(0, 30).map((n, i) => {
                  const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.SYSTEM;
                  return (
                    <motion.div
                      key={n.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: Math.min(i, 8) * 0.02 }}
                      onClick={() => handleNavigate(n)}
                      className="group flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors"
                      style={{ background: !n.isRead ? "var(--accent-muted)" : "transparent", borderBottom: "1px solid var(--border-subtle)" }}
                      onMouseEnter={(e) => { if (n.isRead) (e.currentTarget as HTMLElement).style.background = "var(--bg-card-hover)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = !n.isRead ? "var(--accent-muted)" : "transparent"; }}
                    >
                      <div className="w-7 h-7 rounded-[9px] flex items-center justify-center shrink-0" style={{ background: cfg.bg, color: cfg.color }}>
                        {cfg.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[12px] leading-snug" style={{ color: "var(--text-foreground)", fontWeight: n.isRead ? 500 : 700 }}>
                            {n.title}
                          </p>
                          <span className="text-[10px] whitespace-nowrap shrink-0 mt-0.5" style={{ color: "var(--text-subtle)" }}>
                            {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        {n.body && (
                          <p className="text-[11px] leading-relaxed line-clamp-2 mt-0.5" style={{ color: "var(--text-muted)" }}>
                            {n.body}
                          </p>
                        )}
                      </div>
                      {!n.isRead && <div className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5" style={{ background: cfg.color }} />}
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
