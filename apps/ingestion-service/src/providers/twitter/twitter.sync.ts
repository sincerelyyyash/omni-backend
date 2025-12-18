import { prisma } from "@repo/database";
import type { TwitterSyncState } from "./types";

export class TwitterSyncService {
  async getSyncState(userId: string): Promise<TwitterSyncState> {
    try {
      const account = await prisma.account.findFirst({
        where: {
          userId,
          providerId: "twitter",
        },
        select: {
          scope: true,
        },
      });

      if (!account?.scope) {
        return {
          lastSyncTime: null,
          lastTweetId: null,
          lastMentionId: null,
        };
      }

      try {
        const parsed = JSON.parse(account.scope);

        if (
          typeof parsed === "object" &&
          parsed.twitterSyncState &&
          typeof parsed.twitterSyncState === "object"
        ) {
          const state = parsed.twitterSyncState as TwitterSyncState;
          return {
            lastSyncTime: state.lastSyncTime
              ? new Date(state.lastSyncTime)
              : null,
            lastTweetId: state.lastTweetId || null,
            lastMentionId: state.lastMentionId || null,
          };
        }

        if (
          typeof parsed === "object" &&
          ("lastSyncTime" in parsed ||
            "lastTweetId" in parsed ||
            "lastMentionId" in parsed) &&
          !(
            "lastMessageId" in parsed ||
            "lastHistoryId" in parsed ||
            "lastEventId" in parsed ||
            "syncToken" in parsed ||
            "lastNotificationId" in parsed ||
            "lastReadAt" in parsed
          )
        ) {
          const state = parsed as TwitterSyncState;
          return {
            lastSyncTime: state.lastSyncTime
              ? new Date(state.lastSyncTime)
              : null,
            lastTweetId: state.lastTweetId || null,
            lastMentionId: state.lastMentionId || null,
          };
        }

        return {
          lastSyncTime: null,
          lastTweetId: null,
          lastMentionId: null,
        };
      } catch (parseError) {
        console.warn(
          `Could not parse Twitter sync state for user ${userId}:`,
          parseError instanceof Error ? parseError.message : "Unknown error",
        );
        return {
          lastSyncTime: null,
          lastTweetId: null,
          lastMentionId: null,
        };
      }
    } catch (error) {
      console.error(`Error getting Twitter sync state for user ${userId}:`, error);
      return {
        lastSyncTime: null,
        lastTweetId: null,
        lastMentionId: null,
      };
    }
  }

  async updateSyncState(
    userId: string,
    state: Partial<TwitterSyncState>,
  ): Promise<void> {
    try {
      const currentState = await this.getSyncState(userId);

      const updatedState: TwitterSyncState = {
        lastSyncTime: state.lastSyncTime || currentState.lastSyncTime || null,
        lastTweetId: state.lastTweetId || currentState.lastTweetId || null,
        lastMentionId: state.lastMentionId || currentState.lastMentionId || null,
      };

      const account = await prisma.account.findFirst({
        where: {
          userId,
          providerId: "twitter",
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
        twitterSyncState: updatedState,
      };

      const result = await prisma.account.updateMany({
        where: {
          userId,
          providerId: "twitter",
        },
        data: {
          scope: JSON.stringify(combinedData),
        },
      });

      if (result.count === 0) {
        throw new Error(
          `No Twitter account found for user ${userId} to update sync state`,
        );
      }
    } catch (error) {
      console.error(
        `Error updating Twitter sync state for user ${userId}:`,
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
