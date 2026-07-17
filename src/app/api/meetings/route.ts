import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createGoogleMeetEvent } from "@/lib/google-meet";
import { createNotification } from "@/lib/notifications";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const meetings = await prisma.meeting.findMany({
    where: { status: { not: "CANCELLED" } },
    include: {
      organizer: { select: { id: true, name: true, email: true, image: true } },
      project: { select: { id: true, name: true, color: true } },
      attendees: {
        include: { user: { select: { id: true, name: true, email: true, image: true } } },
      },
    },
    orderBy: { startTime: "asc" },
  });

  return NextResponse.json(meetings);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
      title,
      startTime,
      endTime,
      attendeeEmails: attendees.map((u) => u.email),
      accessToken: session.user.accessToken,
    });
    if (result) {
      googleMeetUrl = result.meetUrl;
      googleEventId = result.eventId;
    }
  }

  const meeting = await prisma.meeting.create({
    data: {
      title,
      description,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      googleMeetUrl,
      googleEventId,
      projectId: projectId || null,
      organizerId: session.user.id,
      attendees: {
        create: [
          { userId: session.user.id, rsvp: "ACCEPTED" },
          ...attendeeIds
            .filter((id: string) => id !== session.user.id)
            .map((userId: string) => ({ userId, rsvp: "PENDING" })),
        ],
      },
    },
    include: {
      organizer: { select: { id: true, name: true, email: true, image: true } },
      project: { select: { id: true, name: true, color: true } },
      attendees: {
        include: { user: { select: { id: true, name: true, email: true, image: true } } },
      },
    },
  });

  // Index for search
  await prisma.searchIndex.create({
    data: {
      sourceType: "MEETING",
      sourceId: meeting.id,
      content: `${title} ${description ?? ""} ${new Date(startTime).toDateString()}`,
      projectId: projectId || null,
      authorId: session.user.id,
    },
  });

  // Notify attendees
  for (const id of attendeeIds) {
    if (id !== session.user.id) {
      await createNotification(id, "MEETING_INVITE", `Meeting invite: ${title}`, `${new Date(startTime).toLocaleString()}`, { meetingId: meeting.id });
    }
  }

  return NextResponse.json(meeting, { status: 201 });
}
