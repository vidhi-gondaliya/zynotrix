import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { createNotification } from "@/lib/notifications";
import { isRateLimited } from "@/lib/rate-limit";
import { sendNewMemberNotification } from "@/lib/email";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  // 10 registrations per IP per hour
  if (isRateLimited(`register:${ip}`, 10, 60 * 60_000)) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

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
  let invite: { id: string; organizationId: string; role: string; accepted: boolean; expires: Date; email: string } | null = null;
  if (inviteToken) {
    invite = await (prisma as any).invitation.findUnique({
      where: { token: inviteToken },
      select: { id: true, organizationId: true, role: true, accepted: true, expires: true, email: true },
    });
    if (!invite || invite.accepted || new Date(invite.expires) < new Date()) {
      return NextResponse.json({ error: "Invalid or expired invitation" }, { status: 400 });
    }
    if (invite.email !== normalEmail) {
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

    // Notify org owners that a new member has joined
    try {
      const org = await prisma.organization.findUnique({
        where: { id: invite.organizationId },
        select: { name: true },
      });
      const owners = await prisma.organizationMember.findMany({
        where: { organizationId: invite.organizationId, role: "OWNER" },
        include: { user: { select: { email: true, name: true } } },
      });
      for (const owner of owners) {
        await sendNewMemberNotification(
          owner.user.email,
          owner.user.name ?? "Owner",
          user.name ?? "",
          normalEmail,
          org?.name ?? "your workspace"
        );
      }
    } catch { /* non-fatal — don't block registration */ }
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
