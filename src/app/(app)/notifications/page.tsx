"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Bell, CheckCheck, Info, AlertTriangle, Calendar,
  CheckSquare, MessageSquare, AtSign, Activity, X,
} from "lucide-react";
import { useNotifications } from "@/store/useNotifications";
import type { Notification, NotificationType } from "@/types";
import { formatDistanceToNow, isToday, isThisWeek } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

const TYPE_CONFIG: Record<NotificationType, {
  icon: React.ReactNode;
  bg: string;
  color: string;
  label: string;
}> = {
  TASK_ASSIGNED:    { icon: <CheckSquare className="w-4 h-4" />,  bg: "var(--accent-muted)",   color: "var(--accent)",   label: "Task Assigned"     },
  TASK_DUE:         { icon: <AlertTriangle className="w-4 h-4" />, bg: "var(--warning-muted)",  color: "var(--warning)",  label: "Due Soon"          },
  TASK_OVERDUE:     { icon: <AlertTriangle className="w-4 h-4" />, bg: "var(--danger-muted)",   color: "var(--danger)",   label: "Overdue"           },
  COMMENT_ADDED:    { icon: <MessageSquare className="w-4 h-4" />, bg: "var(--info-muted)",     color: "var(--info)",     label: "New Comment"       },
  MEETING_REMINDER: { icon: <Calendar className="w-4 h-4" />,      bg: "var(--energy-muted)",   color: "var(--energy)",   label: "Meeting Reminder"  },
  MEETING_INVITE:   { icon: <Calendar className="w-4 h-4" />,      bg: "var(--energy-muted)",   color: "var(--energy)",   label: "Meeting Invite"    },
  HEALTH_ALERT:     { icon: <Activity className="w-4 h-4" />,      bg: "var(--warning-muted)",  color: "var(--warning)",  label: "Health Alert"      },
  MENTION:          { icon: <AtSign className="w-4 h-4" />,        bg: "var(--accent-muted)",   color: "var(--accent)",   label: "Mentioned"         },
  SYSTEM:           { icon: <Info className="w-4 h-4" />,          bg: "var(--bg-elevated)",    color: "var(--text-muted)", label: "System"          },
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

function groupNotifications(notifications: Notification[]) {
  const unread: Notification[] = [];
  const today: Notification[] = [];
  const thisWeek: Notification[] = [];
  const earlier: Notification[] = [];

  notifications.forEach((n) => {
    if (!n.isRead) { unread.push(n); return; }
    const d = new Date(n.createdAt);
    if (isToday(d)) { today.push(n); return; }
    if (isThisWeek(d)) { thisWeek.push(n); return; }
    earlier.push(n);
  });
  return { unread, today, thisWeek, earlier };
}

function NotifItem({ n, index, onMark, onNavigate }: {
  n: Notification;
  index: number;
  onMark: (id: string) => void;
  onNavigate: (n: Notification) => void;
}) {
  const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.SYSTEM;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -16 }}
      transition={{ delay: index * 0.025, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      onClick={() => onNavigate(n)}
      className="group relative flex items-start gap-4 px-5 py-4 cursor-pointer transition-all duration-150"
      style={{
        background: !n.isRead ? "var(--accent-muted)" : "transparent",
        borderBottom: "1px solid var(--border-subtle)",
      }}
      onMouseEnter={(e) => {
        if (n.isRead) (e.currentTarget as HTMLElement).style.background = "var(--bg-card-hover)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = !n.isRead ? "var(--accent-muted)" : "transparent";
      }}
    >
      {/* Unread left rail */}
      {!n.isRead && (
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[60%] rounded-r-full"
          style={{ background: cfg.color }}
        />
      )}

      {/* Type icon */}
      <div
        className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: cfg.bg, color: cfg.color }}
      >
        {cfg.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3 mb-0.5">
          <p
            className="text-[13.5px] leading-snug"
            style={{
              color: "var(--text-foreground)",
              fontWeight: n.isRead ? 500 : 700,
            }}
          >
            {n.title}
          </p>
          <span
            className="text-[11px] whitespace-nowrap shrink-0 mt-0.5"
            style={{ color: "var(--text-subtle)" }}
          >
            {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
          </span>
        </div>

        {n.body && (
          <p className="text-[12.5px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
            {n.body}
          </p>
        )}

        <span
          className="inline-block mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: cfg.bg, color: cfg.color }}
        >
          {cfg.label}
        </span>
      </div>

      {/* Mark read button (hover) */}
      {!n.isRead && (
        <button
          onClick={(e) => { e.stopPropagation(); onMark(n.id); }}
          title="Mark as read"
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all shrink-0 mt-1"
          style={{ color: "var(--text-subtle)" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "var(--bg-card-hover)";
            (e.currentTarget as HTMLElement).style.color = "var(--text-foreground)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
            (e.currentTarget as HTMLElement).style.color = "var(--text-subtle)";
          }}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Unread dot */}
      {!n.isRead && (
        <div
          className="w-2 h-2 rounded-full shrink-0 mt-2"
          style={{ background: cfg.color }}
        />
      )}
    </motion.div>
  );
}

function GroupLabel({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-3 px-5 py-2.5">
      <span className="label-caps">{label}</span>
      <span
        className="text-[10px] font-bold px-1.5 py-0.5 rounded-full tabular"
        style={{ background: "var(--bg-elevated)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
      >
        {count}
      </span>
    </div>
  );
}

export default function NotificationsPage() {
  const router = useRouter();
  const { notifications, setNotifications, markRead, markAllRead } = useNotifications();

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then(setNotifications);
  }, [setNotifications]);

  const handleMarkAllRead = async () => {
    const res = await fetch("/api/notifications/read-all", { method: "PUT" });
    if (res.ok) { markAllRead(); toast.success("All marked as read"); }
  };

  const handleNavigate = (n: Notification) => {
    if (!n.isRead) markRead(n.id);
    const link = getNotificationLink(n);
    if (link) router.push(link);
  };

  const { unread, today, thisWeek, earlier } = groupNotifications(notifications);
  const totalUnread = unread.length;

  return (
    <div className="p-6 animate-fade-in">
      <div className="max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "var(--accent-muted)", color: "var(--accent)" }}
            >
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2
                className="text-[17px] font-black leading-none"
                style={{ color: "var(--text-foreground)", letterSpacing: "-0.025em" }}
              >
                Notifications
              </h2>
              <p className="text-[12px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                {totalUnread > 0
                  ? <><span style={{ color: "var(--accent)", fontWeight: 700 }}>{totalUnread} unread</span> · {notifications.length} total</>
                  : "You're all caught up"
                }
              </p>
            </div>
          </div>

          {totalUnread > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-2 h-8 px-4 rounded-xl text-[12px] font-semibold transition-all"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                color: "var(--text-muted)",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = "var(--accent-muted)";
                el.style.color = "var(--accent)";
                el.style.borderColor = "var(--accent-glow)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = "var(--bg-elevated)";
                el.style.color = "var(--text-muted)";
                el.style.borderColor = "var(--border)";
              }}
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read
            </button>
          )}
        </div>

        {/* Empty state */}
        {notifications.length === 0 && (
          <div
            className="rounded-2xl p-16 flex flex-col items-center justify-center text-center"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: "var(--accent-muted)" }}
            >
              <Bell className="w-7 h-7" style={{ color: "var(--accent)" }} />
            </div>
            <h3
              className="text-[15px] font-bold mb-2"
              style={{ color: "var(--text-foreground)" }}
            >
              All clear!
            </h3>
            <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>
              Notifications will appear here when something happens.
            </p>
          </div>
        )}

        {/* Notification groups */}
        {notifications.length > 0 && (
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}
          >
            <AnimatePresence initial={false}>

              {/* Unread */}
              {unread.length > 0 && (
                <>
                  <GroupLabel label="Unread" count={unread.length} />
                  {unread.map((n, i) => (
                    <NotifItem key={n.id} n={n} index={i} onMark={markRead} onNavigate={handleNavigate} />
                  ))}
                </>
              )}

              {/* Today */}
              {today.length > 0 && (
                <>
                  {unread.length > 0 && <div style={{ height: 1, background: "var(--border)", margin: "4px 0" }} />}
                  <GroupLabel label="Today" count={today.length} />
                  {today.map((n, i) => (
                    <NotifItem key={n.id} n={n} index={i} onMark={markRead} onNavigate={handleNavigate} />
                  ))}
                </>
              )}

              {/* This week */}
              {thisWeek.length > 0 && (
                <>
                  {(unread.length > 0 || today.length > 0) && <div style={{ height: 1, background: "var(--border)", margin: "4px 0" }} />}
                  <GroupLabel label="This Week" count={thisWeek.length} />
                  {thisWeek.map((n, i) => (
                    <NotifItem key={n.id} n={n} index={i} onMark={markRead} onNavigate={handleNavigate} />
                  ))}
                </>
              )}

              {/* Earlier */}
              {earlier.length > 0 && (
                <>
                  {(unread.length > 0 || today.length > 0 || thisWeek.length > 0) && (
                    <div style={{ height: 1, background: "var(--border)", margin: "4px 0" }} />
                  )}
                  <GroupLabel label="Earlier" count={earlier.length} />
                  {earlier.map((n, i) => (
                    <NotifItem key={n.id} n={n} index={i} onMark={markRead} onNavigate={handleNavigate} />
                  ))}
                </>
              )}

            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
