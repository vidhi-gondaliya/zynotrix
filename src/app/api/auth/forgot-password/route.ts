import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";
import { isRateLimited } from "@/lib/rate-limit";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const emailValue = body && typeof body === "object" && !Array.isArray(body)
    ? (body as Record<string, unknown>).email : null;
  if (typeof emailValue !== "string" || !emailValue.trim() || emailValue.length > 254) {
    return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
  }
  const email = emailValue.trim().toLowerCase();
  if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
  }

  // 5 attempts per email per 15 minutes
  if (isRateLimited(`forgot:${email}`, 5, 15 * 60_000)) {
    return NextResponse.json({ error: "Too many requests. Please wait before trying again." }, { status: 429 });
  }

  const user = await prisma.user.findUnique({ where: { email: email } });

  // Always return 200 — don't leak whether the email exists
  if (!user) return NextResponse.json({ ok: true });

  // Invalidate any existing tokens for this email
  await (prisma as any).passwordResetToken.deleteMany({ where: { email: email } });

  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await (prisma as any).passwordResetToken.create({
    data: { email: email, token, expires },
  });

  try {
    await sendPasswordResetEmail(email, token);
  } catch { 
    console.error("[forgot-password] email send failed");
    // Keep the response identical for existing and unknown accounts.
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
