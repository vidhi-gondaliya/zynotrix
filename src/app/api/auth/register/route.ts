import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { createNotification } from "@/lib/notifications";

export async function POST(req: NextRequest) {
  const { name, email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  // First user ever gets OWNER role
  const userCount = await prisma.user.count();
  const role = userCount === 0 ? "OWNER" : "MEMBER";

  const user = await prisma.user.create({
    data: { name, email, passwordHash, role },
  });

  // Add user to general channel
  const general = await prisma.channel.findFirst({ where: { isGeneral: true } });
  if (general) {
    await prisma.channelMember.create({
      data: { channelId: general.id, userId: user.id },
    });
  }

  await createNotification(user.id, "SYSTEM", "Welcome to ZYNOTRIX! 🎉", "Your workspace is ready.");

  return NextResponse.json({ success: true });
}
