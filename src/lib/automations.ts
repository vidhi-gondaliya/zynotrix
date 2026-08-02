import { prisma } from "./prisma";
import { createNotification } from "./notifications";

export interface AutomationContext {
  taskId?: string;
  task?: Record<string, unknown>;
  fromStatus?: string;
  toStatus?: string;
  comment?: { content: string; authorId: string };
  projectId?: string;
  memberId?: string;
  memberTaskCount?: number;
  projectHealthScore?: number;
}

export async function runAutomations(
  orgId: string,
  triggerType: string,
  context: AutomationContext
): Promise<void> {
  try {
    const automations = await (prisma as any).automation.findMany({
      where: { organizationId: orgId, isActive: true },
    });

    for (const automation of automations) {
      try {
        const trigger = JSON.parse(automation.trigger as string);
        if (trigger.type !== triggerType) continue;
        if (!matchesConditions(trigger.conditions ?? {}, triggerType, context)) continue;

        const action = JSON.parse(automation.action as string);
        const output = await executeAction(action, context, orgId);

        await (prisma as any).automationRun.create({
          data: {
            automationId: automation.id,
            status: "success",
            output: JSON.stringify(output),
          },
        });
        await (prisma as any).automation.update({
          where: { id: automation.id },
          data: { runCount: { increment: 1 }, lastRunAt: new Date() },
        });
      } catch (err) {
        try {
          await (prisma as any).automationRun.create({
            data: {
              automationId: automation.id,
              status: "failed",
              output: String(err),
            },
          });
          await (prisma as any).automation.update({
            where: { id: automation.id },
            data: { runCount: { increment: 1 }, lastRunAt: new Date() },
          });
        } catch {}
      }
    }
  } catch {}
}

function matchesConditions(
  conditions: Record<string, unknown>,
  triggerType: string,
  context: AutomationContext
): boolean {
  if (Object.keys(conditions).length === 0) return true;

  switch (triggerType) {
    case "task_status_changed": {
      const from = conditions.fromStatus ?? conditions.from;
      const to = conditions.toStatus ?? conditions.to;
      if (from && from !== context.fromStatus) return false;
      if (to && to !== context.toStatus) return false;
      if (conditions.priority && (context.task as any)?.priority !== conditions.priority) return false;
      if (conditions.projectId && (context.task as any)?.projectId !== conditions.projectId) return false;
      return true;
    }
    case "task_created": {
      if (conditions.priority && (context.task as any)?.priority !== conditions.priority) return false;
      if (conditions.status && (context.task as any)?.status !== conditions.status) return false;
      if (conditions.projectId && (context.task as any)?.projectId !== conditions.projectId) return false;
      return true;
    }
    case "comment_added": {
      if (conditions.keyword) {
        const keyword = String(conditions.keyword).toLowerCase();
        if (!String(context.comment?.content ?? "").toLowerCase().includes(keyword)) return false;
      }
      return true;
    }
    case "member_overloaded": {
      const threshold = Number(conditions.threshold ?? 10);
      return (context.memberTaskCount ?? 0) >= threshold;
    }
    case "project_health_low": {
      const threshold = Number(conditions.threshold ?? 40);
      return (context.projectHealthScore ?? 100) < threshold;
    }
    default:
      return true;
  }
}

async function executeAction(
  action: { type: string; params: Record<string, unknown> },
  context: AutomationContext,
  orgId: string
): Promise<Record<string, unknown>> {
  const { type, params } = action;
  const taskId = (params.taskId as string | undefined) ?? context.taskId;

  switch (type) {
    case "change_task_status": {
      if (!taskId || !params.status) return { skipped: "no taskId or status" };
      await prisma.task.update({
        where: { id: taskId },
        data: { status: params.status as string },
      });
      return { updated: taskId, status: params.status };
    }

    case "assign_task": {
      if (!taskId) return { skipped: "no taskId" };
      let assigneeId = params.assigneeId as string | undefined;
      if (!assigneeId && params.assigneeEmail) {
        const user = await prisma.user.findUnique({
          where: { email: params.assigneeEmail as string },
          select: { id: true },
        });
        assigneeId = user?.id;
      }
      if (!assigneeId) return { skipped: "assignee not found" };
      await prisma.task.update({ where: { id: taskId }, data: { assigneeId } });
      return { assigned: taskId, to: assigneeId };
    }

    case "send_notification": {
      const message = String(params.message ?? "Automation triggered");
      if (params.userId) {
        await createNotification(
          params.userId as string,
          "SYSTEM",
          message,
          undefined,
          taskId ? { taskId } : undefined
        );
      } else {
        const members = await prisma.organizationMember.findMany({
          where: { organizationId: orgId },
          select: { userId: true },
        });
        await Promise.all(
          members.map((m) =>
            createNotification(m.userId, "SYSTEM", message, undefined, taskId ? { taskId } : undefined).catch(() => {})
          )
        );
      }
      return { notified: params.userId ?? "all_members" };
    }

    case "create_task": {
      const title = String(params.title ?? "Auto-created task");
      const projectId =
        (params.projectId as string | undefined) ?? (context.task as any)?.projectId ?? context.projectId;
      if (!projectId) return { skipped: "no projectId" };

      // Use automation creator or fall back to first org admin
      const owner = await prisma.organizationMember.findFirst({
        where: { organizationId: orgId, role: { in: ["OWNER", "ADMIN"] } },
        select: { userId: true },
        orderBy: { joinedAt: "asc" },
      });
      if (!owner) return { skipped: "no org admin found" };

      const maxPos = await prisma.task.aggregate({
        where: { projectId, status: (params.status as string) ?? "BACKLOG" },
        _max: { position: true },
      });
      const newTask = await (prisma as any).task.create({
        data: {
          title,
          projectId,
          creatorId: owner.userId,
          status: (params.status as string) ?? "BACKLOG",
          priority: (params.priority as string) ?? "MEDIUM",
          position: (maxPos._max.position ?? -1) + 1,
          tags: "[]",
        },
      });
      return { created: newTask.id };
    }

    case "move_to_project": {
      if (!taskId || !params.projectId) return { skipped: "no taskId or projectId" };
      await prisma.task.update({
        where: { id: taskId },
        data: { projectId: params.projectId as string },
      });
      return { moved: taskId, to: params.projectId };
    }

    case "add_tag": {
      if (!taskId || !params.tag) return { skipped: "no taskId or tag" };
      const task = await prisma.task.findUnique({ where: { id: taskId }, select: { tags: true } });
      if (!task) return { skipped: "task not found" };
      const tags: string[] = JSON.parse(task.tags);
      const tag = String(params.tag);
      if (!tags.includes(tag)) {
        tags.push(tag);
        await prisma.task.update({ where: { id: taskId }, data: { tags: JSON.stringify(tags) } });
      }
      return { tagged: taskId, tag };
    }

    case "set_priority": {
      if (!taskId || !params.priority) return { skipped: "no taskId or priority" };
      await prisma.task.update({
        where: { id: taskId },
        data: { priority: params.priority as string },
      });
      return { updated: taskId, priority: params.priority };
    }

    case "send_standup": {
      const message = String(params.message ?? "Daily standup reminder");
      const members = await prisma.organizationMember.findMany({
        where: { organizationId: orgId },
        select: { userId: true },
      });
      await Promise.all(
        members.map((m) =>
          createNotification(m.userId, "SYSTEM", message, "This is an automated standup reminder.").catch(() => {})
        )
      );
      return { standup_sent: true, recipients: members.length };
    }

    default:
      return { skipped: `unknown action type: ${type}` };
  }
}
