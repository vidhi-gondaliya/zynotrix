import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg, isOrgError } from "@/lib/org";

const VALID_STATUSES   = ["BACKLOG","TODO","IN_PROGRESS","REVIEW","DONE"] as const;
const VALID_PRIORITIES = ["LOW","MEDIUM","HIGH","URGENT"] as const;

export async function POST(req: NextRequest) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId } = ctx;

  const body = await req.json() as {
    ids: string[];
    action: "status" | "priority" | "delete";
    value?: string;
  };

  const { ids, action, value } = body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "No task IDs provided" }, { status: 400 });
  }
  if (ids.length > 200) {
    return NextResponse.json({ error: "Maximum 200 tasks per bulk operation" }, { status: 400 });
  }

  // Verify all tasks belong to this org via their project
  const tasks = await prisma.task.findMany({
    where: { id: { in: ids } },
    select: { id: true, project: { select: { organizationId: true } } },
  });
  const ownedIds = tasks
    .filter(t => t.project?.organizationId === orgId)
    .map(t => t.id);

  if (ownedIds.length === 0) {
    return NextResponse.json({ error: "No matching tasks found" }, { status: 404 });
  }

  if (action === "delete") {
    await prisma.task.deleteMany({ where: { id: { in: ownedIds } } });
    return NextResponse.json({ deleted: ownedIds.length });
  }

  if (action === "status") {
    if (!value || !(VALID_STATUSES as readonly string[]).includes(value)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    await prisma.task.updateMany({ where: { id: { in: ownedIds } }, data: { status: value } });
    return NextResponse.json({ updated: ownedIds.length });
  }

  if (action === "priority") {
    if (!value || !(VALID_PRIORITIES as readonly string[]).includes(value)) {
      return NextResponse.json({ error: "Invalid priority" }, { status: 400 });
    }
    await prisma.task.updateMany({ where: { id: { in: ownedIds } }, data: { priority: value } });
    return NextResponse.json({ updated: ownedIds.length });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
