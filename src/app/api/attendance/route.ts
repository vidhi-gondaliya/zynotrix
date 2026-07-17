import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { awardPoints } from "@/lib/rewards";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId") ?? session.user.id;
  const month  = searchParams.get("month"); // YYYY-MM

  let dateFilter = {};
  if (month) {
    const [year, m] = month.split("-").map(Number);
    const start = new Date(year, m - 1, 1);
    const end   = new Date(year, m, 0, 23, 59, 59);
    dateFilter = { gte: start, lte: end };
  }

  const records = await prisma.attendanceRecord.findMany({
    where: {
      userId,
      ...(month ? { date: dateFilter } : {}),
    },
    include: { user: { select: { id: true, name: true, image: true, email: true } } },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(records);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { action } = body; // "clock-in" | "clock-out" | "mark"

  const now = new Date();
  const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (action === "clock-in") {
    const existing = await prisma.attendanceRecord.findUnique({
      where: { userId_date: { userId: session.user.id, date: todayDate } },
    });
    const record = await prisma.attendanceRecord.upsert({
      where: { userId_date: { userId: session.user.id, date: todayDate } },
      update: { clockIn: now, status: "PRESENT" },
      create: { userId: session.user.id, date: todayDate, clockIn: now, status: "PRESENT" },
    });
    // Award attendance points only on first clock-in of the day
    if (!existing?.clockIn) {
      try {
        const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
        if (user) await awardPoints(session.user.id, user.role, "attendance", { date: todayDate.toISOString() });
      } catch { /* non-fatal — points failure shouldn't block clock-in */ }
    }
    return NextResponse.json(record);
  }

  if (action === "clock-out") {
    const record = await prisma.attendanceRecord.upsert({
      where: { userId_date: { userId: session.user.id, date: todayDate } },
      update: { clockOut: now },
      create: { userId: session.user.id, date: todayDate, clockOut: now, status: "PRESENT" },
    });
    return NextResponse.json(record);
  }

  if (action === "mark") {
    const { userId, date, status, notes } = body;
    const record = await prisma.attendanceRecord.upsert({
      where: { userId_date: { userId: userId ?? session.user.id, date: new Date(date) } },
      update: { status, notes },
      create: { userId: userId ?? session.user.id, date: new Date(date), status, notes },
    });
    return NextResponse.json(record);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
