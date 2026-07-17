import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const prefs = await prisma.notificationPreference.findUnique({
    where: { userId: session.user.id },
  });

  if (!prefs) {
    return NextResponse.json({
      browser: true, email: false, whatsapp: false,
      whatsappPhone: null, emailAddress: null,
      taskAssigned: true, taskDue: true, taskOverdue: true,
      meetingInvite: true, projectUpdate: false,
      smartFilter: false, minPriority: "LOW",
      dndEnabled: false, dndStart: "22:00", dndEnd: "08:00", digestMode: false,
    });
  }

  return NextResponse.json(prefs);
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const prefs = await prisma.notificationPreference.upsert({
    where: { userId: session.user.id },
    update: {
      browser:       body.browser       ?? undefined,
      email:         body.email         ?? undefined,
      whatsapp:      body.whatsapp      ?? undefined,
      whatsappPhone: body.whatsappPhone ?? undefined,
      emailAddress:  body.emailAddress  ?? undefined,
      taskAssigned:  body.taskAssigned  ?? undefined,
      taskDue:       body.taskDue       ?? undefined,
      taskOverdue:   body.taskOverdue   ?? undefined,
      meetingInvite: body.meetingInvite ?? undefined,
      projectUpdate: body.projectUpdate ?? undefined,
      smartFilter:   body.smartFilter   ?? undefined,
      minPriority:   body.minPriority   ?? undefined,
      dndEnabled:    body.dndEnabled    ?? undefined,
      dndStart:      body.dndStart      ?? undefined,
      dndEnd:        body.dndEnd        ?? undefined,
      digestMode:    body.digestMode    ?? undefined,
    },
    create: {
      userId:        session.user.id,
      browser:       body.browser       ?? true,
      email:         body.email         ?? false,
      whatsapp:      body.whatsapp      ?? false,
      whatsappPhone: body.whatsappPhone ?? null,
      emailAddress:  body.emailAddress  ?? null,
      taskAssigned:  body.taskAssigned  ?? true,
      taskDue:       body.taskDue       ?? true,
      taskOverdue:   body.taskOverdue   ?? true,
      meetingInvite: body.meetingInvite ?? true,
      projectUpdate: body.projectUpdate ?? false,
      smartFilter:   body.smartFilter   ?? false,
      minPriority:   body.minPriority   ?? "LOW",
      dndEnabled:    body.dndEnabled    ?? false,
      dndStart:      body.dndStart      ?? "22:00",
      dndEnd:        body.dndEnd        ?? "08:00",
      digestMode:    body.digestMode    ?? false,
    },
  });

  return NextResponse.json(prefs);
}
