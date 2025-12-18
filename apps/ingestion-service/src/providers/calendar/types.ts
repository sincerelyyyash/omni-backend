export interface CalendarEvent {
  id: string;
  summary: string | null;
  description: string | null;
  location: string | null;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  organizer?: {
    email: string;
    displayName?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
  }>;
  recurrence?: string[];
  htmlLink?: string;
  status?: string;
  created?: string;
  updated?: string;
  iCalUID?: string;
}

export interface CalendarSyncState {
  lastSyncTime: Date | null;
  lastEventId: string | null;
  syncToken: string | null;
}

export interface CalendarFetchOptions {
  maxResults?: number;
  timeMin?: Date;
  timeMax?: Date;
  calendarId?: string;
  singleEvents?: boolean;
  orderBy?: "startTime" | "updated";
}
