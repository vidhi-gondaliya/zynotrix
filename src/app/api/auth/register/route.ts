import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { createNotification } from "@/lib/notifications";

export async function POST(req: NextRequest) {
  const { name, email, password, inviteToken } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const normalEmail = email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({ where: { email: normalEmail } });
  if (existing) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  // Validate invite token if provided
  let invite: { id: string; organizationId: string; role: string } | null = null;
  if (inviteToken) {
    invite = await (prisma as any).invitation.findUnique({
      where: { token: inviteToken },
      select: { id: true, organizationId: true, role: true, accepted: true, expires: true, email: true },
    });
    if (!invite || invite.accepted || new Date((invite as any).expires) < new Date()) {
      return NextResponse.json({ error: "Invalid or expired invitation" }, { status: 400 });
    }
    if ((invite as any).email !== normalEmail) {
      return NextResponse.json({ error: "This invitation was sent to a different email address" }, { status: 400 });
    }
  }

  const passwordHash = await bcrypt.hash(password, 12);

  // First user ever gets OWNER role
  const userCount = await prisma.user.count();
  const role = userCount === 0 ? "OWNER" : "MEMBER";

  const user = await prisma.user.create({
    data: { name, email: normalEmail, passwordHash, role },
  });

  if (invite) {
    // Add to org with invited role
    await prisma.organizationMember.create({
      data: { organizationId: invite.organizationId, userId: user.id, role: invite.role },
    });
    await (prisma as any).invitation.update({ where: { id: invite.id }, data: { accepted: true } });
  }

  // Add user to general channel
  const general = await prisma.channel.findFirst({ where: { isGeneral: true } });
  if (general) {
    await prisma.channelMember.create({
      data: { channelId: general.id, userId: user.id },
    }).catch(() => {});
  }

  await createNotification(user.id, "SYSTEM", "Welcome to Colliq! 🎉", "Your workspace is ready.");

  return NextResponse.json({ success: true });
}
