import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { createNotification } from "@/lib/notifications";
import { isRateLimited } from "@/lib/rate-limit";
import { sendNewMemberNotification } from "@/lib/email";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(`register:${ip}`, 10, 60 * 60_000)) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  let body: { name?: unknown; email?: unknown; password?: unknown; inviteToken?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 100) : "";
  const inviteToken = typeof body.inviteToken === "string" ? body.inviteToken.trim() : "";

  if (!email || !password) return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  if (email.length > 254 || !EMAIL_RE.test(email)) return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  if (password.length < 12 || password.length > 1024) {
    return NextResponse.json({ error: "Password must be between 12 and 1024 characters" }, { status: 400 });
  }
  if (body.inviteToken !== undefined && (typeof body.inviteToken !== "string" || inviteToken.length < 16 || inviteToken.length > 256)) {
    return NextResponse.json({ error: "Invalid or expired invitation" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const now = new Date();

  try {
    const result = await prisma.$transaction(async (tx) => {
      const invite = inviteToken
        ? await tx.invitation.findFirst({
            where: { token: inviteToken, email, accepted: false, expires: { gt: now } },
            select: { id: true, organizationId: true, role: true },
          })
        : null;
      if (inviteToken && !invite) throw new Error("INVALID_INVITATION");

      const userCount = await tx.user.count();
      const user = await tx.user.create({
        data: { name: name || null, email, passwordHash, role: userCount === 0 ? "OWNER" : "MEMBER" },
        select: { id: true, name: true, email: true },
      });

      if (invite) {
        const consumed = await tx.invitation.updateMany({
          where: { id: invite.id, accepted: false, expires: { gt: now }, email },
          data: { accepted: true },
        });
        if (consumed.count !== 1) throw new Error("INVALID_INVITATION");

        await tx.organizationMember.create({
          data: { organizationId: invite.organizationId, userId: user.id, role: invite.role },
        });
        const general = await tx.channel.findFirst({
          where: { organizationId: invite.organizationId, isGeneral: true },
          select: { id: true },
        });
        if (general) await tx.channelMember.create({ data: { channelId: general.id, userId: user.id } });
      }
      return { user, organizationId: invite?.organizationId ?? null };
    }, { isolationLevel: "Serializable" });

    await createNotification(result.user.id, "SYSTEM", "Welcome to Colliq! 🎉", "Your workspace is ready.").catch(() => {});

    if (result.organizationId) {
      try {
        const org = await prisma.organization.findUnique({ where: { id: result.organizationId }, select: { name: true } });
        const owners = await prisma.organizationMember.findMany({
          where: { organizationId: result.organizationId, role: "OWNER" },
          include: { user: { select: { email: true, name: true } } },
        });
        for (const owner of owners) {
          await sendNewMemberNotification(owner.user.email, owner.user.name ?? "Owner", result.user.name ?? "", result.user.email, org?.name ?? "your workspace");
        }
      } catch {
        // Email notifications are best-effort after the registration transaction commits.
      }
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_INVITATION") {
      return NextResponse.json({ error: "Invalid or expired invitation" }, { status: 400 });
    }
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }
    console.error("[auth/register] registration failed", error);
    return NextResponse.json({ error: "Unable to complete registration. Please try again." }, { status: 500 });
  }
}
