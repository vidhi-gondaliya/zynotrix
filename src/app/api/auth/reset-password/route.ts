import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Token and password are required." }, { status: 400 });
  }
  const { token, password } = body as Record<string, unknown>;
  if (typeof token !== "string" || !token || token.length > 256 ||
      typeof password !== "string" || !password) {
    return NextResponse.json({ error: "Token and password are required." }, { status: 400 });
  }
  if (password.length < 12) {
    return NextResponse.json({ error: "Password must be at least 12 characters." }, { status: 400 });
  }
  if (password.length > 1024) {
    return NextResponse.json({ error: "Password is too long." }, { status: 400 });
  }

  const record = await (prisma as any).passwordResetToken.findUnique({ where: { token }, select: { email: true } });
  if (!record) return NextResponse.json({ error: "This reset link is invalid or has expired." }, { status: 400 });

  const hash = await bcrypt.hash(password, 12);
  const now = new Date();
  try {
    await prisma.$transaction(async (tx) => {
      // Consume conditionally inside the same transaction as the password update.
      // Concurrent submissions cannot both consume the same one-time token.
      const consumed = await (tx as any).passwordResetToken.updateMany({
        where: { token, used: false, expires: { gt: now } },
        data: { used: true },
      });
      if (consumed.count !== 1) throw new Error("RESET_TOKEN_INVALID");

      const updated = await tx.user.updateMany({
        where: { email: record.email },
        data: { passwordHash: hash },
      });
      if (updated.count !== 1) throw new Error("RESET_USER_NOT_FOUND");
    });
  } catch (error) {
    if (error instanceof Error && (error.message === "RESET_TOKEN_INVALID" || error.message === "RESET_USER_NOT_FOUND")) {
      return NextResponse.json({ error: "This reset link is invalid or has expired." }, { status: 400 });
    }
    console.error("[reset-password] password reset failed");
    return NextResponse.json({ error: "Unable to reset password right now." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
