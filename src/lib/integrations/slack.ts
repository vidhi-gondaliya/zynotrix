import { prisma } from "@/lib/prisma";

export interface SlackConfig {
  webhookUrl: string;
  channel?: string;
  notifyOn: {
    taskDone: boolean;
    taskUrgent: boolean;
    taskAssigned: boolean;
    taskOverdue: boolean;
    sprintStarted: boolean;
  };
}

export async function getSlackConfig(userId: string): Promise<SlackConfig | null> {
  const integration = await (prisma as any).integration.findUnique({
    where: { userId_type: { userId, type: "SLACK" } },
  });
  if (!integration || !integration.isActive) return null;
  try { return JSON.parse(integration.config) as SlackConfig; } catch { return null; }
}

export async function sendSlackMessage(webhookUrl: string, payload: SlackPayload): Promise<boolean> {
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}

interface SlackPayload {
  text?: string;
  blocks?: SlackBlock[];
  username?: string;
  icon_emoji?: string;
}

interface SlackBlock {
  type: string;
  text?: { type: string; text: string; emoji?: boolean };
  fields?: { type: string; text: string }[];
  elements?: any[];
}

export function buildTaskNotification(opts: {
  event: "done" | "urgent" | "assigned" | "overdue";
  taskTitle: string;
  taskId: string;
  projectName: string;
  assigneeName?: string;
  appUrl?: string;
}): SlackPayload {
  const { event, taskTitle, taskId, projectName, assigneeName, appUrl } = opts;
  const base = appUrl ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const taskUrl = `${base}/tasks?taskId=${taskId}`;

  const eventConfig = {
    done:     { emoji: "✅", verb: "completed",       color: "#00F090" },
    urgent:   { emoji: "🚨", verb: "marked URGENT",   color: "#FF4466" },
    assigned: { emoji: "👤", verb: "assigned to you", color: "#9D6BFF" },
    overdue:  { emoji: "⏰", verb: "is overdue",      color: "#FFC107" },
  }[event];

  return {
    username: "Colliq",
    icon_emoji: ":zap:",
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `${eventConfig.emoji} *Task ${eventConfig.verb}*\n<${taskUrl}|${taskTitle}>`,
        },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Project:*\n${projectName}` },
          ...(assigneeName ? [{ type: "mrkdwn", text: `*Assignee:*\n${assigneeName}` }] : []),
        ],
      },
    ],
  };
}

// Called from task update handler
export async function notifySlackForTaskEvent(
  userId: string,
  event: "done" | "urgent" | "assigned" | "overdue",
  task: { id: string; title: string; projectId: string },
  projectName: string,
  assigneeName?: string,
) {
  const cfg = await getSlackConfig(userId);
  if (!cfg) return;

  const shouldNotify =
    (event === "done"     && cfg.notifyOn.taskDone) ||
    (event === "urgent"   && cfg.notifyOn.taskUrgent) ||
    (event === "assigned" && cfg.notifyOn.taskAssigned) ||
    (event === "overdue"  && cfg.notifyOn.taskOverdue);

  if (!shouldNotify) return;

  const payload = buildTaskNotification({
    event, taskTitle: task.title, taskId: task.id, projectName, assigneeName,
  });
  await sendSlackMessage(cfg.webhookUrl, payload);
}
