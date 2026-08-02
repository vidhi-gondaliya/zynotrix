import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg, isOrgError } from "@/lib/org";
import { sendInvitationEmail } from "@/lib/email";
import { hasPermission } from "@/lib/permissions";
import { requireUnderLimit } from "@/lib/plan-gate";

export async function POST(req: NextRequest) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId, userId, userName, orgRole } = ctx;

  if (!hasPermission(orgRole, "users:manage")) {
    return NextResponse.json({ error: "Only Admins and Owners can invite members." }, { status: 403 });
  }

  const limitErr = await requireUnderLimit(orgId, "members");
  if (limitErr) return limitErr;

  const { email, role = "MEMBER" } = await req.json();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  const normalEmail = email.toLowerCase().trim();

  // Check if already a member
  const existing = await prisma.user.findUnique({ where: { email: normalEmail } });
  if (existing) {
    const isMember = await prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId: existing.id } },
    });
    if (isMember) return NextResponse.json({ error: "This user is already a member" }, { status: 409 });
  }

  // Delete any pending invitation for same email+org
  await (prisma as any).invitation.deleteMany({ where: { email: normalEmail, organizationId: orgId, accepted: false } });

  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const invitation = await (prisma as any).invitation.create({
    data: { email: normalEmail, organizationId: orgId, role, invitedById: userId, expires },
  });

  const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { name: true } });

  try {
    await sendInvitationEmail(normalEmail, invitation.token, org?.name ?? "your team", userName ?? "A teammate");
  } catch (err) {
    console.error("[invitations] email send failed", err);
    return NextResponse.json({ error: "Failed to send invitation email" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: invitation.id });
}
