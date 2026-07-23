import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";
import { isRateLimited } from "@/lib/rate-limit";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  // 5 attempts per email per 15 minutes
  if (isRateLimited(`forgot:${email.toLowerCase()}`, 5, 15 * 60_000)) {
    return NextResponse.json({ error: "Too many requests. Please wait before trying again." }, { status: 429 });
  }

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

  // Always return 200 — don't leak whether the email exists
  if (!user) return NextResponse.json({ ok: true });

  // Invalidate any existing tokens for this email
  await (prisma as any).passwordResetToken.deleteMany({ where: { email: email.toLowerCase() } });

  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await (prisma as any).passwordResetToken.create({
    data: { email: email.toLowerCase(), token, expires },
  });

  try {
    await sendPasswordResetEmail(email, token);
  } catch (err) {
    console.error("[forgot-password] email send failed", err);
    return NextResponse.json({ error: "Failed to send email. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
