import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET custom field values for a task
export async function GET(_req: NextRequest, { params }: { params: { taskId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const values = await (prisma as any).customFieldValue.findMany({
    where: { taskId: params.taskId },
    include: { field: true },
  });
  return NextResponse.json(values);
}

// PUT — upsert a value { fieldId, value }
export async function PUT(req: NextRequest, { params }: { params: { taskId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { fieldId, value } = await req.json();
  if (!fieldId) return NextResponse.json({ error: "fieldId required" }, { status: 400 });

  const val = await (prisma as any).customFieldValue.upsert({
    where: { fieldId_taskId: { fieldId, taskId: params.taskId } },
    update: { value: String(value) },
    create: { fieldId, taskId: params.taskId, value: String(value) },
    include: { field: true },
  });
  return NextResponse.json(val);
}
