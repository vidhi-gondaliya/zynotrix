// Google Calendar integration using the googleapis package
// Requires the user to have signed in with Google OAuth (NextAuth)

export interface CalendarEventInput {
  summary: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  attendeeEmails?: string[];
  meetingUrl?: string;
}

export interface CalendarEventResult {
  id: string;
  htmlLink: string;
  hangoutLink?: string;
}

export async function createCalendarEvent(
  accessToken: string,
  event: CalendarEventInput,
): Promise<CalendarEventResult | null> {
  try {
    const body: any = {
      summary: event.summary,
      description: event.description,
      start: { dateTime: event.startTime.toISOString(), timeZone: "UTC" },
      end:   { dateTime: event.endTime.toISOString(),   timeZone: "UTC" },
      ...(event.attendeeEmails?.length && {
        attendees: event.attendeeEmails.map((email) => ({ email })),
      }),
      ...(event.meetingUrl && {
        conferenceData: {
          entryPoints: [{ entryPointType: "video", uri: event.meetingUrl, label: "Join Meeting" }],
        },
      }),
    };

    const res = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("[Google Calendar] create failed:", err);
      return null;
    }

    const data = await res.json();
    return { id: data.id, htmlLink: data.htmlLink, hangoutLink: data.hangoutLink };
  } catch (e) {
    console.error("[Google Calendar] error:", e);
    return null;
  }
}

export async function deleteCalendarEvent(accessToken: string, eventId: string): Promise<boolean> {
  try {
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } },
    );
    return res.status === 204 || res.ok;
  } catch {
    return false;
  }
}

export async function listUpcomingEvents(
  accessToken: string,
  maxResults = 20,
): Promise<{ id: string; summary: string; start: string; htmlLink: string }[]> {
  try {
    const timeMin = new Date().toISOString();
    const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
    url.searchParams.set("timeMin", timeMin);
    url.searchParams.set("maxResults", String(maxResults));
    url.searchParams.set("singleEvents", "true");
    url.searchParams.set("orderBy", "startTime");

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items ?? []).map((e: any) => ({
      id: e.id,
      summary: e.summary,
      start: e.start?.dateTime ?? e.start?.date,
      htmlLink: e.htmlLink,
    }));
  } catch {
    return [];
  }
}
