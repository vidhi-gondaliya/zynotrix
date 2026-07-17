import { prisma } from "./prisma";

export type ActivityAction =
  | "created"
  | "status_changed"
  | "assigned"
  | "unassigned"
  | "priority_changed"
  | "due_date_changed"
  | "title_changed"
  | "description_changed"
  | "commented"
  | "comment_deleted"
  | "subtask_added";

export async function logActivity(
  taskId: string,
  userId: string,
  action: ActivityAction,
  meta: Record<string, string | number | null> = {}
) {
  try {
    await (prisma as any).taskActivity.create({
      data: {
        taskId,
        userId,
        action,
        meta: JSON.stringify(meta),
      },
    });
  } catch {
    // Non-fatal — don't let activity logging break the main operation
  }
}
