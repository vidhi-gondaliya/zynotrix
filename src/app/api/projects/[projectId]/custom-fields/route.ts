import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { projectId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const fields = await (prisma as any).customField.findMany({
    where: { projectId: params.projectId },
    orderBy: { position: "asc" },
  });
  return NextResponse.json(fields);
}

export async function POST(req: NextRequest, { params }: { params: { projectId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, type, options, isRequired } = await req.json();
  if (!name || !type) return NextResponse.json({ error: "name and type required" }, { status: 400 });

  const count = await (prisma as any).customField.count({ where: { projectId: params.projectId } });
  const field = await (prisma as any).customField.create({
    data: {
      projectId: params.projectId,
      name,
      type,
      options: options ? JSON.stringify(options) : null,
      isRequired: isRequired ?? false,
      position: count,
    },
  });
  return NextResponse.json(field, { status: 201 });
}
