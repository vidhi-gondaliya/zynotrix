import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: { userId: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { role } = await req.json();
  if (!role) return NextResponse.json({ error: "Role required" }, { status: 400 });

  // Verify role exists
  const roleRecord = await prisma.role.findUnique({ where: { name: role } });
  if (!roleRecord) return NextResponse.json({ error: "Unknown role" }, { status: 400 });

  const user = await prisma.user.update({
    where: { id: params.userId },
    data: { role },
    select: { id: true, name: true, email: true, image: true, role: true, createdAt: true },
  });

  return NextResponse.json(user);
}
