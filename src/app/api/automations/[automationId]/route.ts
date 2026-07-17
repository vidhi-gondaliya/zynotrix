import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH — toggle active / rename
export async function PATCH(req: NextRequest, { params }: { params: { automationId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const automation = await (prisma as any).automation.update({
    where: { id: params.automationId },
    data: {
      ...(typeof body.isActive === "boolean" ? { isActive: body.isActive } : {}),
      ...(body.name ? { name: body.name } : {}),
    },
  });
  return NextResponse.json(automation);
}

// DELETE
export async function DELETE(_req: NextRequest, { params }: { params: { automationId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await (prisma as any).automation.delete({ where: { id: params.automationId } });
  return NextResponse.json({ ok: true });
}
