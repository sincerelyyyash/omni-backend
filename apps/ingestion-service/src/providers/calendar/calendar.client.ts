import type { calendar_v3 } from "googleapis";
import type { CalendarEvent, CalendarFetchOptions } from "./types";

export class CalendarClient {
  constructor(private calendar: calendar_v3.Calendar) {}

  async listEvents(options: CalendarFetchOptions = {}): Promise<string[]> {
    const {
      maxResults = 50,
      timeMin,
      timeMax,
      calendarId = "primary",
      singleEvents = true,
      orderBy = "startTime",
    } = options;

    try {
      const response = await this.calendar.events.list({
        calendarId,
        maxResults,
        timeMin: timeMin?.toISOString(),
        timeMax: timeMax?.toISOString(),
        singleEvents,
        orderBy,
        showDeleted: false,
      });

      return response.data.items?.map((event) => event.id || "").filter(Boolean) || [];
    } catch (error) {
      console.error("Error listing calendar events:", error);
      throw error;
    }
  }

  async getEvent(eventId: string, calendarId: string = "primary"): Promise<CalendarEvent | null> {
    try {
      const response = await this.calendar.events.get({
        calendarId,
        eventId,
      });

      if (!response.data) {
        return null;
      }

      const event = response.data;

      return {
        id: event.id || "",
        summary: event.summary || null,
        description: event.description || null,
        location: event.location || null,
        start: {
          dateTime: event.start?.dateTime || undefined,
          date: event.start?.date || undefined,
          timeZone: event.start?.timeZone || undefined,
        },
        end: {
          dateTime: event.end?.dateTime || undefined,
          date: event.end?.date || undefined,
          timeZone: event.end?.timeZone || undefined,
        },
        organizer: event.organizer
          ? {
              email: event.organizer.email || "",
              displayName: event.organizer.displayName || undefined,
            }
          : undefined,
        attendees: event.attendees?.map((attendee) => ({
          email: attendee.email || "",
          displayName: attendee.displayName || undefined,
          responseStatus: attendee.responseStatus || undefined,
        })),
        recurrence: event.recurrence || undefined,
        htmlLink: event.htmlLink || undefined,
        status: event.status || undefined,
        created: event.created || undefined,
        updated: event.updated || undefined,
        iCalUID: event.iCalUID || undefined,
      };
    } catch (error) {
      console.error(`Error fetching calendar event ${eventId}:`, error);
      return null;
    }
  }

  async getEvents(
    eventIds: string[],
    calendarId: string = "primary",
  ): Promise<Array<CalendarEvent | null>> {
    const results = await Promise.allSettled(
      eventIds.map((id) => this.getEvent(id, calendarId)),
    );

    return results.map((result) =>
      result.status === "fulfilled" ? result.value : null,
    );
  }
}
