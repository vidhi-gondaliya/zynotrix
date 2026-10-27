import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg, isOrgError } from "@/lib/org";
import { sendInvitationEmail } from "@/lib/email";
import { hasPermissionAsync } from "@/lib/permissions";
import { requireUnderLimit } from "@/lib/plan-gate";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SYSTEM_ROLES = ["OWNER", "ADMIN", "MANAGER", "MEMBER"];

export async function POST(req: NextRequest) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId, userId, userName, orgRole } = ctx;

  if (!(await hasPermissionAsync(orgRole, orgId, "users:manage"))) {
    return NextResponse.json({ error: "Only Admins and Owners can invite members." }, { status: 403 });
  }

  let body: { email?: unknown; role?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const normalEmail = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const role = typeof body.role === "string" ? body.role : "MEMBER";
  if (!normalEmail || normalEmail.length > 254 || !EMAIL_RE.test(normalEmail)) {
    return NextResponse.json({ error: "A valid email address is required" }, { status: 400 });
  }
  if (role.length > 80) return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  if (role === "OWNER" && orgRole !== "OWNER") {
    return NextResponse.json({ error: "Only workspace owners can invite another owner." }, { status: 403 });
  }

  const validRole = SYSTEM_ROLES.includes(role) || !!(await prisma.role.findFirst({
    where: { organizationId: orgId, name: role },
    select: { id: true },
  }));
  if (!validRole) return NextResponse.json({ error: "Invalid role for this workspace" }, { status: 400 });

  const limitErr = await requireUnderLimit(orgId, "members");
  if (limitErr) return limitErr;

  const existing = await prisma.user.findUnique({ where: { email: normalEmail }, select: { id: true } });
  if (existing) {
    const isMember = await prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId: existing.id } },
      select: { userId: true },
    });
    if (isMember) return NextResponse.json({ error: "This user is already a member" }, { status: 409 });
  }

  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  let invitation;
  try {
    invitation = await prisma.$transaction(async (tx) => {
      await tx.invitation.deleteMany({
        where: { email: normalEmail, organizationId: orgId, accepted: false },
      });
      return tx.invitation.create({
        data: { email: normalEmail, organizationId: orgId, role, invitedById: userId, expires },
        select: { id: true, token: true },
      });
    });
  } catch (err) {
    console.error("[invitations] creation failed", err);
    return NextResponse.json({ error: "Unable to create invitation. Please try again." }, { status: 500 });
  }

  const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { name: true } });
  try {
    await sendInvitationEmail(normalEmail, invitation.token, org?.name ?? "your team", userName ?? "A teammate");
  } catch (err) {
    console.error("[invitations] email send failed", err);
    // Remove the unsent token so a failed email does not leave a usable invitation.
    await prisma.invitation.delete({ where: { id: invitation.id } }).catch(() => {});
    return NextResponse.json({ error: "Failed to send invitation email" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: invitation.id });
}
