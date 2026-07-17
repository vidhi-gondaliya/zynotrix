import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createCalendarEvent, listUpcomingEvents } from "@/lib/integrations/google-calendar";

// POST — push a meeting to Google Calendar
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accessToken = (session as any).accessToken as string | undefined;
  if (!accessToken) {
    return NextResponse.json({ error: "No Google access token. Please reconnect your Google account." }, { status: 400 });
  }

  const { meetingId } = await req.json();
  if (!meetingId) return NextResponse.json({ error: "meetingId required" }, { status: 400 });

  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: {
      attendees: { include: { user: { select: { email: true } } } },
    },
  });
  if (!meeting) return NextResponse.json({ error: "Meeting not found" }, { status: 404 });

  const start = new Date(meeting.startTime);
  const end   = new Date(meeting.endTime);
  const attendeeEmails = meeting.attendees
    .map((a: any) => a.user?.email)
    .filter(Boolean) as string[];

  const event = await createCalendarEvent(accessToken, {
    summary: meeting.title,
    description: meeting.notes ?? undefined,
    startTime: start,
    endTime: end,
    attendeeEmails,
    meetingUrl: meeting.googleMeetUrl ?? undefined,
  });

  if (!event) {
    return NextResponse.json({ error: "Failed to create Calendar event" }, { status: 500 });
  }

  // Store the calendar event ID on the meeting
  await prisma.meeting.update({
    where: { id: meetingId },
    data: { googleEventId: event.id },
  }).catch(() => {});

  return NextResponse.json({ ok: true, calendarEventId: event.id, htmlLink: event.htmlLink });
}

// GET — list upcoming Google Calendar events for the current user
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accessToken = (session as any).accessToken as string | undefined;
  if (!accessToken) {
    return NextResponse.json({ error: "No Google access token", events: [] });
  }

  const events = await listUpcomingEvents(accessToken, 10);
  return NextResponse.json({ events });
}
