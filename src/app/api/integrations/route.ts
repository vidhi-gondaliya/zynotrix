import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET all integrations for current user
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const integrations = await (prisma as any).integration.findMany({
    where: { userId: session.user.id },
    orderBy: { type: "asc" },
  });

  return NextResponse.json(integrations.map((i: any) => ({
    ...i,
    config: JSON.parse(i.config),
  })));
}

// POST — upsert an integration config
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { type, config, isActive } = await req.json();
  if (!type) return NextResponse.json({ error: "type required" }, { status: 400 });

  const integration = await (prisma as any).integration.upsert({
    where: { userId_type: { userId: session.user.id, type } },
    update: {
      config: JSON.stringify(config ?? {}),
      isActive: isActive ?? true,
      updatedAt: new Date(),
    },
    create: {
      userId: session.user.id,
      type,
      config: JSON.stringify(config ?? {}),
      isActive: isActive ?? true,
    },
  });

  return NextResponse.json({ ...integration, config: JSON.parse(integration.config) });
}

// DELETE — remove an integration
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { type } = await req.json();
  await (prisma as any).integration.delete({
    where: { userId_type: { userId: session.user.id, type } },
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
