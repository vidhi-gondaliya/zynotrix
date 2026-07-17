import { prisma } from "./prisma";
import { broadcastToUser } from "./sse";
import type { NotificationType } from "@/types";

const TYPE_TO_PREF: Partial<Record<NotificationType, "taskAssigned" | "taskDue" | "taskOverdue" | "meetingInvite" | "projectUpdate">> = {
  TASK_ASSIGNED:    "taskAssigned",
  TASK_DUE:         "taskDue",
  TASK_OVERDUE:     "taskOverdue",
  MEETING_INVITE:   "meetingInvite",
  MEETING_REMINDER: "meetingInvite",
  HEALTH_ALERT:     "projectUpdate",
};

const PRIORITY_ORDER = ["LOW", "MEDIUM", "HIGH", "URGENT"];

// Map notification type → implicit priority for smart filtering
const TYPE_PRIORITY: Partial<Record<NotificationType, string>> = {
  TASK_ASSIGNED:    "MEDIUM",
  TASK_DUE:         "HIGH",
  TASK_OVERDUE:     "HIGH",
  MEETING_INVITE:   "MEDIUM",
  MEETING_REMINDER: "MEDIUM",
  HEALTH_ALERT:     "HIGH",
  MENTION:          "HIGH",
  COMMENT_ADDED:    "LOW",
  SYSTEM:           "LOW",
};

function isInDND(start: string, end: string): boolean {
  const now = new Date();
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const startMin = sh * 60 + sm;
  const endMin   = eh * 60 + em;
  if (startMin <= endMin) return nowMin >= startMin && nowMin < endMin;
  // Crosses midnight
  return nowMin >= startMin || nowMin < endMin;
}

export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  body?: string,
  data?: Record<string, string>
) {
  const prefs = await prisma.notificationPreference.findUnique({ where: { userId } });
  const prefField = TYPE_TO_PREF[type];
  const notifPriority = TYPE_PRIORITY[type] ?? "MEDIUM";

  // Event toggle check
  if (prefs && prefField && prefs[prefField] === false) return null;

  // All channels off
  if (prefs && !prefs.browser && !prefs.email && !prefs.whatsapp) return null;

  // Smart filtering: skip if below minimum priority
  if (prefs?.smartFilter) {
    const minIdx  = PRIORITY_ORDER.indexOf(prefs.minPriority ?? "LOW");
    const notifIdx = PRIORITY_ORDER.indexOf(notifPriority);
    if (notifIdx < minIdx) return null;
  }

  // Do Not Disturb: skip non-URGENT during DND window
  if (prefs?.dndEnabled && notifPriority !== "URGENT") {
    if (isInDND(prefs.dndStart ?? "22:00", prefs.dndEnd ?? "08:00")) return null;
  }

  const notification = await prisma.notification.create({
    data: { userId, type, title, body, data: data ? JSON.stringify(data) : null },
  });

  broadcastToUser(userId, { type: "notification", payload: notification });

  return notification;
}
