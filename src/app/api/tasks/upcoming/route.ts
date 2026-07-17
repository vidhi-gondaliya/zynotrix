import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const todayStart      = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowStart   = new Date(todayStart.getTime() + 86_400_000);
  const dayAfterTomorrow = new Date(todayStart.getTime() + 2 * 86_400_000);

  const tasks = await prisma.task.findMany({
    where: {
      dueDate: { gte: todayStart, lt: dayAfterTomorrow },
      status:  { not: "DONE" },
    },
    include: {
      assignee: { select: { id: true, name: true, image: true } },
      project:  { select: { id: true, name: true, color: true } },
    },
    orderBy: { dueDate: "asc" },
  });

  const parse = (t: (typeof tasks)[number]) => ({ ...t, tags: JSON.parse(t.tags) });

  return NextResponse.json({
    today:    tasks.filter((t) => t.dueDate! < tomorrowStart).map(parse),
    tomorrow: tasks.filter((t) => t.dueDate! >= tomorrowStart).map(parse),
  });
}
