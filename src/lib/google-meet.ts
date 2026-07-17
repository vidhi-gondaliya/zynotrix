export async function createGoogleMeetEvent(params: {
  title: string;
  startTime: string;
  endTime: string;
  attendeeEmails: string[];
  accessToken: string;
}): Promise<{ meetUrl: string; eventId: string } | null> {
  try {
    const { google } = await import("googleapis");
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: params.accessToken });

    const calendar = google.calendar({ version: "v3", auth });
    const event = await calendar.events.insert({
      calendarId: "primary",
      conferenceDataVersion: 1,
      requestBody: {
        summary: params.title,
        start: { dateTime: params.startTime },
        end: { dateTime: params.endTime },
        attendees: params.attendeeEmails.map((email) => ({ email })),
        conferenceData: {
          createRequest: { requestId: `zynotrix-${Date.now()}` },
        },
      },
    });

    const meetUrl =
      event.data.conferenceData?.entryPoints?.find(
        (e) => e.entryPointType === "video"
      )?.uri ?? "";

    return { meetUrl, eventId: event.data.id! };
  } catch {
    return null;
  }
}
