import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg, isOrgError } from "@/lib/org";
import { createGoogleMeetEvent } from "@/lib/google-meet";
import { createNotification } from "@/lib/notifications";

export async function GET() {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId } = ctx;

  const meetings = await prisma.meeting.findMany({
    where: { organizationId: orgId, status: { not: "CANCELLED" } },
    include: {
      organizer: { select: { id: true, name: true, email: true, image: true } },
      project:   { select: { id: true, name: true, color: true } },
      attendees: { include: { user: { select: { id: true, name: true, email: true, image: true } } } },
    },
    orderBy: { startTime: "asc" },
  });

  return NextResponse.json(meetings);
}

export async function POST(req: NextRequest) {
  const ctx = await requireOrg();
  if (isOrgError(ctx)) return ctx;
  const { orgId, userId, session } = ctx;

  const body = await req.json();
  const { title, description, startTime, endTime, attendeeIds = [], projectId, createMeet } = body;

  let googleMeetUrl: string | undefined;
  let googleEventId: string | undefined;

  if (createMeet && session.user.accessToken) {
    const attendees = await prisma.user.findMany({
      where: { id: { in: attendeeIds } },
      select: { email: true },
    });
    const result = await createGoogleMeetEvent({
      title, startTime, endTime,
      attendeeEmails: attendees.map((u) => u.email),
      accessToken: session.user.accessToken,
    });
    if (result) { googleMeetUrl = result.meetUrl; googleEventId = result.eventId; }
  }

  const meeting = await prisma.meeting.create({
    data: {
      title, description,
      startTime:      new Date(startTime),
      endTime:        new Date(endTime),
      googleMeetUrl,
      googleEventId,
      projectId:      projectId || null,
      organizerId:    userId,
      organizationId: orgId,
      attendees: {
        create: [
          { userId, rsvp: "ACCEPTED" },
          ...attendeeIds.filter((id: string) => id !== userId).map((id: string) => ({ userId: id, rsvp: "PENDING" })),
        ],
      },
    },
    include: {
      organizer: { select: { id: true, name: true, email: true, image: true } },
      project:   { select: { id: true, name: true, color: true } },
      attendees: { include: { user: { select: { id: true, name: true, email: true, image: true } } } },
    },
  });

  await prisma.searchIndex.upsert({
    where:  { sourceId: meeting.id },
    update: { content: `${title} ${description ?? ""}`, organizationId: orgId },
    create: { sourceType: "MEETING", sourceId: meeting.id, content: `${title} ${description ?? ""} ${new Date(startTime).toDateString()}`, projectId: projectId || null, authorId: userId, organizationId: orgId },
  });

  for (const id of attendeeIds) {
    if (id !== userId) {
      await createNotification(id, "MEETING_INVITE", `Meeting invite: ${title}`, `${new Date(startTime).toLocaleString()}`, { meetingId: meeting.id });
    }
  }

  return NextResponse.json(meeting, { status: 201 });
}
