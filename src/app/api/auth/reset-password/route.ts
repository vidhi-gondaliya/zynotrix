import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const { token, password } = await req.json();
  if (!token || !password) return NextResponse.json({ error: "Token and password required" }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });

  const record = await (prisma as any).passwordResetToken.findUnique({ where: { token } });

  if (!record || record.used || new Date(record.expires) < new Date()) {
    return NextResponse.json({ error: "This reset link is invalid or has expired" }, { status: 400 });
  }

  const hash = await bcrypt.hash(password, 12);

  await prisma.$transaction([
    prisma.user.update({
      where: { email: record.email },
      data: { passwordHash: hash },
    }),
    (prisma as any).passwordResetToken.update({
      where: { token },
      data: { used: true },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
