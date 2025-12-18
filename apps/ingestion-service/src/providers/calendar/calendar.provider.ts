import type { DataProvider, FetchOptions, FetchResult, SyncState } from "../base/types";
import type { CalendarFetchOptions } from "./types";
import { createCalendarClient } from "./calendar.auth";
import { CalendarClient } from "./calendar.client";
import { CalendarTransformer } from "./calendar.transformer";
import { CalendarSyncService } from "./calendar.sync";
import { memoryClient } from "../../services/memory-client.service";
import { stringToNumericUserId } from "../../utils/userId";

export class CalendarProvider implements DataProvider {
  name = "calendar";
  private syncService: CalendarSyncService;

  constructor() {
    this.syncService = new CalendarSyncService();
  }

  async fetch(userId: string, options: FetchOptions = {}): Promise<FetchResult> {
    try {
      if (!userId || typeof userId !== "string") {
        throw new Error(`Invalid userId: ${userId}`);
      }

      const userIdNum = stringToNumericUserId(userId);

      const syncState = await this.syncService.getSyncState(userId);
      const lastSyncTime = syncState.lastSyncTime;

      const timeMin = options.since || lastSyncTime || undefined;
      const timeMax = options.forceFullSync ? undefined : new Date();

      const calendarOptions: CalendarFetchOptions = {
        maxResults: options.maxResults || 50,
        timeMin: timeMin,
        timeMax: timeMax,
        calendarId: "primary",
        singleEvents: true,
        orderBy: "startTime",
      };

      const calendar = await createCalendarClient(userId);
      const calendarClient = new CalendarClient(calendar);

      const eventIds = await calendarClient.listEvents(calendarOptions);

      if (eventIds.length === 0) {
        await this.syncService.updateSyncState(userId, {
          lastSyncTime: new Date(),
        });
        return {
          success: true,
          itemsProcessed: 0,
          itemsFailed: 0,
          lastSyncTime: new Date(),
        };
      }

      const events = await calendarClient.getEvents(eventIds);

      const transformer = new CalendarTransformer();
      const memoryInputs = transformer.transformEventsToMemories(
        events,
        userIdNum,
      );

      if (memoryInputs.length === 0) {
        await this.syncService.updateSyncState(userId, {
          lastSyncTime: new Date(),
        });
        return {
          success: true,
          itemsProcessed: 0,
          itemsFailed: 0,
          lastSyncTime: new Date(),
        };
      }

      const results = await memoryClient.addMemories(
        memoryInputs.map((input) => ({
          messages: [
            {
              role: "user" as const,
              content: input.content,
            },
          ],
          userId: input.userId,
          source: input.source,
          sourceId: input.sourceId,
          timestamp: input.timestamp,
          contentUrl: input.contentUrl,
          title: input.title,
          origin: input.origin,
          tags: input.tags,
          category: input.category,
          type: input.type,
          attribute: input.attribute,
          summary: input.summary,
        })),
      );

      const lastEventId = eventIds[eventIds.length - 1];
      await this.syncService.updateSyncState(userId, {
        lastSyncTime: new Date(),
        lastEventId,
      });

      const itemsProcessed = results.length;
      const itemsFailed = memoryInputs.length - itemsProcessed;

      return {
        success: true,
        itemsProcessed,
        itemsFailed,
        lastSyncTime: new Date(),
      };
    } catch (error) {
      console.error(`Calendar fetch error for user ${userId}:`, error);
      return {
        success: false,
        itemsProcessed: 0,
        itemsFailed: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async getSyncState(userId: string): Promise<SyncState> {
    const calendarSyncState = await this.syncService.getSyncState(userId);
    return {
      lastSyncTime: calendarSyncState.lastSyncTime,
      lastItemId: calendarSyncState.lastEventId,
      metadata: {
        syncToken: calendarSyncState.syncToken,
      },
    };
  }
}

export const calendarProvider = new CalendarProvider();
