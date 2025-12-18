import type { CalendarEvent } from "./types";
import type { CreateMemoryInput } from "@repo/types";

export class CalendarTransformer {
  transformEventToMemory(
    event: CalendarEvent,
    userId: number,
  ): CreateMemoryInput | null {
    if (!event.id) {
      return null;
    }

    const summary = event.summary || "Untitled Event";
    const description = event.description || "";
    const location = event.location || "";
    const organizerEmail = event.organizer?.email || "Unknown";
    const organizerName = event.organizer?.displayName || organizerEmail;

    const startTime = event.start.dateTime
      ? new Date(event.start.dateTime)
      : event.start.date
        ? new Date(event.start.date)
        : new Date();
    const endTime = event.end.dateTime
      ? new Date(event.end.dateTime)
      : event.end.date
        ? new Date(event.end.date)
        : startTime;

    const attendeesList =
      event.attendees
        ?.map((a) => a.displayName || a.email)
        .filter(Boolean)
        .join(", ") || "None";

    const timeStr = this.formatEventTime(startTime, endTime, event.start.dateTime ? "datetime" : "date");

    const content = `Event: ${summary}\nLocation: ${location}\nTime: ${timeStr}\nOrganizer: ${organizerName}\nAttendees: ${attendeesList}\nDescription: ${description}`;

    const contentUrl =
      event.htmlLink ||
      `https://calendar.google.com/calendar/event?eid=${encodeURIComponent(event.id)}`;

    return {
      userId,
      source: "calendar",
      sourceId: event.id,
      timestamp: startTime,
      content,
      contentUrl,
      title: summary,
      origin: organizerEmail,
      tags: this.extractTags(event),
      category: this.extractCategories(event),
      type: "calendar_event",
      attribute: {
        eventId: event.id,
        summary: event.summary,
        location: event.location,
        start: event.start,
        end: event.end,
        organizer: event.organizer,
        attendees: event.attendees,
        recurrence: event.recurrence,
        status: event.status,
        iCalUID: event.iCalUID,
      },
      summary: summary || description.substring(0, 200) || summary,
    };
  }

  private formatEventTime(start: Date, end: Date, type: "datetime" | "date"): string {
    if (type === "date") {
      const startStr = start.toLocaleDateString();
      const endStr = end.toLocaleDateString();
      if (startStr === endStr) {
        return startStr;
      }
      return `${startStr} - ${endStr}`;
    }

    const startStr = start.toLocaleString();
    const endStr = end.toLocaleString();
    if (start.toDateString() === end.toDateString()) {
      return `${start.toLocaleTimeString()} - ${end.toLocaleTimeString()}`;
    }
    return `${startStr} - ${endStr}`;
  }

  private extractTags(event: CalendarEvent): string[] {
    const tags: string[] = ["calendar", "event"];

    if (event.attendees && event.attendees.length > 0) {
      tags.push("meeting");
    }

    if (event.recurrence && event.recurrence.length > 0) {
      tags.push("recurring");
    }

    if (event.location) {
      tags.push("has-location");
    }

    if (event.status === "confirmed") {
      tags.push("confirmed");
    } else if (event.status === "tentative") {
      tags.push("tentative");
    } else if (event.status === "cancelled") {
      tags.push("cancelled");
    }

    return tags;
  }

  private extractCategories(event: CalendarEvent): string[] {
    const categories: string[] = ["calendar"];

    if (event.attendees && event.attendees.length > 0) {
      categories.push("meeting");
    }

    if (event.recurrence && event.recurrence.length > 0) {
      categories.push("recurring");
    }

    return categories;
  }

  transformEventsToMemories(
    events: Array<CalendarEvent | null>,
    userId: number,
  ): CreateMemoryInput[] {
    return events
      .filter((event): event is CalendarEvent => event !== null)
      .map((event) => this.transformEventToMemory(event, userId))
      .filter((mem): mem is CreateMemoryInput => mem !== null);
  }
}
