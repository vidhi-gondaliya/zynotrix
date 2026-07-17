import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type P = { params: { projectId: string; fieldId: string } };

export async function PATCH(req: NextRequest, { params }: P) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, options, isRequired } = await req.json();
  const field = await (prisma as any).customField.update({
    where: { id: params.fieldId },
    data: {
      ...(name && { name }),
      ...(options !== undefined && { options: JSON.stringify(options) }),
      ...(isRequired !== undefined && { isRequired }),
    },
  });
  return NextResponse.json(field);
}

export async function DELETE(_req: NextRequest, { params }: P) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await (prisma as any).customField.delete({ where: { id: params.fieldId } });
  return NextResponse.json({ ok: true });
}
