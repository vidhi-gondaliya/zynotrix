import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg, isOrgError } from "@/lib/org";
import { generateJSON } from "@/lib/claude";

export async function GET() {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId } = ctx;

  const automations = await (prisma as any).automation.findMany({
    where: { organizationId: orgId },
    include: {
      runs: { orderBy: { triggeredAt: "desc" }, take: 1 },
      _count: { select: { runs: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(automations);
}

export async function POST(req: NextRequest) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId, userId } = ctx;

  const { rule, customStatuses } = await req.json();
  if (!rule?.trim()) return NextResponse.json({ error: "Rule required" }, { status: 400 });

  const statusList = (customStatuses as { id: string; label: string }[] | null)?.length
    ? (customStatuses as { id: string; label: string }[]).map((s) => `${s.id} (displayed as "${s.label}")`).join(", ")
    : "BACKLOG, TODO, IN_PROGRESS, REVIEW, DONE, ARCHIVED";

  const parsed = await generateJSON<{
    name: string; description: string;
    trigger: { type: string; conditions: Record<string, unknown> };
    action:  { type: string; params:     Record<string, unknown> };
    isValid: boolean; validationMessage: string;
  }>(
    [{ role: "user", content: `Parse this automation rule: "${rule}"` }],
    `You are an automation rule parser for ZYNOTRIX.
Available triggers: task_status_changed, task_created, task_due_soon, task_overdue, project_health_low, member_overloaded, comment_added, daily_schedule, weekly_schedule
Available actions: change_task_status, assign_task, send_notification, create_task, move_to_project, add_tag, set_priority, send_standup
Available task statuses: ${statusList}
Return JSON only: { "name":"", "description":"", "trigger":{...}, "action":{...}, "isValid":true, "validationMessage":"" }`,
    true
  );

  if (!parsed.isValid) return NextResponse.json({ error: parsed.validationMessage || "Could not parse rule" }, { status: 400 });

  const automation = await (prisma as any).automation.create({
    data: {
      name: parsed.name, description: parsed.description, rule,
      trigger: JSON.stringify(parsed.trigger), action: JSON.stringify(parsed.action),
      createdById: userId, organizationId: orgId,
    },
  });

  return NextResponse.json(automation, { status: 201 });
}
