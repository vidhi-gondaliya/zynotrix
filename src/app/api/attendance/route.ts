import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg, isOrgError } from "@/lib/org";
import { awardPoints } from "@/lib/rewards";
import { hasPermission } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId, userId: sessionUserId, orgRole } = ctx;

  const { searchParams } = new URL(req.url);
  const month  = searchParams.get("month");
  const viewAll = searchParams.get("all") === "true";

  let dateFilter = {};
  if (month) {
    const [year, m] = month.split("-").map(Number);
    dateFilter = { gte: new Date(year, m - 1, 1), lte: new Date(year, m, 0, 23, 59, 59) };
  }

  // Admin/manager team view — all members
  if (viewAll) {
    if (!hasPermission(orgRole, "attendance:view_all")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [records, members] = await Promise.all([
      prisma.attendanceRecord.findMany({
        where: { organizationId: orgId, ...(month ? { date: dateFilter } : {}) },
        include: { user: { select: { id: true, name: true, image: true, email: true } } },
        orderBy: [{ userId: "asc" }, { date: "desc" }],
      }),
      prisma.organizationMember.findMany({
        where: { organizationId: orgId },
        include: { user: { select: { id: true, name: true, image: true, email: true } } },
        orderBy: { user: { name: "asc" } },
      }),
    ]);

    return NextResponse.json({
      records,
      members: members.map((m) => ({
        id: m.user.id,
        name: m.user.name,
        image: m.user.image,
        email: m.user.email,
        role: m.role,
      })),
    });
  }

  // Personal view
  const userId = searchParams.get("userId") ?? sessionUserId;

  // Only allow fetching another user's records if caller has view_all
  if (userId !== sessionUserId && !hasPermission(orgRole, "attendance:view_all")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const records = await prisma.attendanceRecord.findMany({
    where: { userId, organizationId: orgId, ...(month ? { date: dateFilter } : {}) },
    include: { user: { select: { id: true, name: true, image: true, email: true } } },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(records);
}

export async function POST(req: NextRequest) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId, userId, orgRole } = ctx;

  const body = await req.json();
  const { action } = body;

  const now = new Date();
  const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (action === "clock-in") {
    const existing = await prisma.attendanceRecord.findUnique({
      where: { userId_organizationId_date: { userId, organizationId: orgId, date: todayDate } },
    });
    const record = await prisma.attendanceRecord.upsert({
      where:  { userId_organizationId_date: { userId, organizationId: orgId, date: todayDate } },
      update: { clockIn: now, status: "PRESENT" },
      create: { userId, organizationId: orgId, date: todayDate, clockIn: now, status: "PRESENT" },
    });
    if (!existing?.clockIn) {
      try {
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
        if (user) await awardPoints(userId, user.role, "attendance", { date: todayDate.toISOString() });
      } catch { /* non-fatal */ }
    }
    return NextResponse.json(record);
  }

  if (action === "clock-out") {
    const record = await prisma.attendanceRecord.upsert({
      where:  { userId_organizationId_date: { userId, organizationId: orgId, date: todayDate } },
      update: { clockOut: now },
      create: { userId, organizationId: orgId, date: todayDate, clockOut: now, status: "PRESENT" },
    });
    return NextResponse.json(record);
  }

  if (action === "mark") {
    const { userId: targetId, date, status, notes, clockIn: clockInStr, clockOut: clockOutStr } = body;
    const uid = targetId ?? userId;

    // Marking another user's record requires manage permission
    if (uid !== userId && !hasPermission(orgRole, "attendance:manage")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const record = await prisma.attendanceRecord.upsert({
      where:  { userId_organizationId_date: { userId: uid, organizationId: orgId, date: new Date(date) } },
      update: {
        status,
        notes,
        ...(clockInStr  ? { clockIn:  new Date(clockInStr)  } : {}),
        ...(clockOutStr ? { clockOut: new Date(clockOutStr) } : {}),
      },
      create: {
        userId: uid,
        organizationId: orgId,
        date: new Date(date),
        status,
        notes,
        ...(clockInStr  ? { clockIn:  new Date(clockInStr)  } : {}),
        ...(clockOutStr ? { clockOut: new Date(clockOutStr) } : {}),
      },
    });
    return NextResponse.json(record);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
