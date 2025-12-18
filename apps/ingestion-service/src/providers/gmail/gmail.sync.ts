import { prisma } from "@repo/database";
import type { GmailSyncState } from "./types";

export class GmailSyncService {
  async getSyncState(userId: string): Promise<GmailSyncState> {
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
          lastMessageId: null,
          lastHistoryId: null,
        };
      }

      try {
        const parsed = JSON.parse(account.scope);
        
        if (
          typeof parsed === "object" &&
          parsed !== null &&
          parsed.gmailSyncState &&
          typeof parsed.gmailSyncState === "object"
        ) {
          const state = parsed.gmailSyncState as GmailSyncState;
          return {
            lastSyncTime: state.lastSyncTime
              ? new Date(state.lastSyncTime)
              : null,
            lastMessageId: state.lastMessageId || null,
            lastHistoryId: state.lastHistoryId || null,
          };
        }

        if (
          typeof parsed === "object" &&
          parsed !== null &&
          ("lastSyncTime" in parsed ||
            "lastMessageId" in parsed ||
            "lastHistoryId" in parsed) &&
          !("calendarSyncState" in parsed || "githubSyncState" in parsed || "twitterSyncState" in parsed)
        ) {
          const state = parsed as GmailSyncState;
          return {
            lastSyncTime: state.lastSyncTime
              ? new Date(state.lastSyncTime)
              : null,
            lastMessageId: state.lastMessageId || null,
            lastHistoryId: state.lastHistoryId || null,
          };
        }

        return {
          lastSyncTime: null,
          lastMessageId: null,
          lastHistoryId: null,
        };
      } catch (parseError) {
        console.warn(
          `Could not parse sync state for user ${userId}, scope may contain OAuth scopes:`,
          parseError instanceof Error ? parseError.message : "Unknown error",
        );
        return {
          lastSyncTime: null,
          lastMessageId: null,
          lastHistoryId: null,
        };
      }
    } catch (error) {
      console.error(`Error getting sync state for user ${userId}:`, error);
      return {
        lastSyncTime: null,
        lastMessageId: null,
        lastHistoryId: null,
      };
    }
  }

  async updateSyncState(
    userId: string,
    state: Partial<GmailSyncState>,
  ): Promise<void> {
    try {
      const currentState = await this.getSyncState(userId);

      const updatedState: GmailSyncState = {
        lastSyncTime: state.lastSyncTime || currentState.lastSyncTime || null,
        lastMessageId: state.lastMessageId || currentState.lastMessageId || null,
        lastHistoryId: state.lastHistoryId || currentState.lastHistoryId || null,
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
        gmailSyncState: updatedState,
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
          `No Google account found for user ${userId} to update sync state`,
        );
      }
    } catch (error) {
      console.error(
        `Error updating sync state for user ${userId}:`,
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
