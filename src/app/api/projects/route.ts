import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projects = await prisma.project.findMany({
    where: { status: { not: "ARCHIVED" }, isPersonal: false },
    include: {
      owner: { select: { id: true, name: true, email: true, image: true } },
      _count: { select: { tasks: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const project = await prisma.project.create({
    data: {
      name: body.name,
      description: body.description,
      status: body.status ?? "ACTIVE",
      color: body.color ?? "#7C3AED",
      deadline: body.deadline ? new Date(body.deadline) : null,
      budget: body.budget ? parseFloat(body.budget) : null,
      clientName: body.clientName,
      clientEmail: body.clientEmail,
      ownerId: session.user.id,
      ...(body.boardConfig ? { boardConfig: body.boardConfig } : {}),
    },
    include: {
      owner: { select: { id: true, name: true, email: true, image: true } },
      _count: { select: { tasks: true } },
    },
  });

  return NextResponse.json(project, { status: 201 });
}
