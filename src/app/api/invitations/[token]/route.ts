import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const invite = await (prisma as any).invitation.findUnique({
    where: { token: params.token },
    include: { organization: { select: { name: true, slug: true } } },
  });

  if (!invite) return NextResponse.json({ error: "Invalid invitation" }, { status: 404 });
  if (invite.accepted) return NextResponse.json({ error: "This invitation has already been used" }, { status: 410 });
  if (new Date(invite.expires) < new Date()) return NextResponse.json({ error: "This invitation has expired" }, { status: 410 });

  return NextResponse.json({
    email: invite.email,
    role: invite.role,
    orgName: invite.organization?.name,
    orgSlug: invite.organization?.slug,
  });
}
