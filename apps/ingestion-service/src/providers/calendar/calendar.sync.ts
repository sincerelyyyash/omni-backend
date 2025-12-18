import { prisma } from "@repo/database";
import type { CalendarSyncState } from "./types";

export class CalendarSyncService {
  async getSyncState(userId: string): Promise<CalendarSyncState> {
    try {
      const account = await prisma.account.findFirst({
        where: {
          userId,
          providerId: "google",
        },
        select: {
          scope: true,
        },
      });

      if (!account?.scope) {
        return {
          lastSyncTime: null,
          lastEventId: null,
          syncToken: null,
        };
      }

      try {
        const parsed = JSON.parse(account.scope);
        
        if (
          typeof parsed === "object" &&
          parsed.calendarSyncState &&
          typeof parsed.calendarSyncState === "object"
        ) {
          const state = parsed.calendarSyncState as CalendarSyncState;
          return {
            lastSyncTime: state.lastSyncTime
              ? new Date(state.lastSyncTime)
              : null,
            lastEventId: state.lastEventId || null,
            syncToken: state.syncToken || null,
          };
        }

        if (
          typeof parsed === "object" &&
          ("lastSyncTime" in parsed ||
            "lastEventId" in parsed ||
            "syncToken" in parsed) &&
          !("lastMessageId" in parsed || "lastHistoryId" in parsed)
        ) {
          const state = parsed as CalendarSyncState;
          return {
            lastSyncTime: state.lastSyncTime
              ? new Date(state.lastSyncTime)
              : null,
            lastEventId: state.lastEventId || null,
            syncToken: state.syncToken || null,
          };
        }

        return {
          lastSyncTime: null,
          lastEventId: null,
          syncToken: null,
        };
      } catch (parseError) {
        console.warn(
          `Could not parse calendar sync state for user ${userId}:`,
          parseError instanceof Error ? parseError.message : "Unknown error",
        );
        return {
          lastSyncTime: null,
          lastEventId: null,
          syncToken: null,
        };
      }
    } catch (error) {
      console.error(`Error getting calendar sync state for user ${userId}:`, error);
      return {
        lastSyncTime: null,
        lastEventId: null,
        syncToken: null,
      };
    }
  }

  async updateSyncState(
    userId: string,
    state: Partial<CalendarSyncState>,
  ): Promise<void> {
    try {
      const currentState = await this.getSyncState(userId);

      const updatedState: CalendarSyncState = {
        lastSyncTime: state.lastSyncTime || currentState.lastSyncTime || null,
        lastEventId: state.lastEventId || currentState.lastEventId || null,
        syncToken: state.syncToken || currentState.syncToken || null,
      };

      const account = await prisma.account.findFirst({
        where: {
          userId,
          providerId: "google",
        },
        select: {
          scope: true,
        },
      });

      let existingData: Record<string, unknown> = {};
      if (account?.scope) {
        try {
          const parsed = JSON.parse(account.scope);
          if (typeof parsed === "object" && parsed !== null) {
            existingData = parsed;
          }
        } catch {
          existingData = {};
        }
      }

      const combinedData = {
        ...existingData,
        calendarSyncState: updatedState,
      };

      const result = await prisma.account.updateMany({
        where: {
          userId,
          providerId: "google",
        },
        data: {
          scope: JSON.stringify(combinedData),
        },
      });

      if (result.count === 0) {
        throw new Error(
          `No Google account found for user ${userId} to update calendar sync state`,
        );
      }
    } catch (error) {
      console.error(
        `Error updating calendar sync state for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  async getLastSyncTime(userId: string): Promise<Date | null> {
    const state = await this.getSyncState(userId);
    return state.lastSyncTime;
  }
}
