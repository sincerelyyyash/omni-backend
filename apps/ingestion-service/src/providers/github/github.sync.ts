import { prisma } from "@repo/database";
import type { GitHubSyncState } from "./types";

export class GitHubSyncService {
  async getSyncState(userId: string): Promise<GitHubSyncState> {
    try {
      const account = await prisma.account.findFirst({
        where: {
          userId,
          providerId: "github",
        },
        select: {
          scope: true,
        },
      });

      if (!account?.scope) {
        return {
          lastSyncTime: null,
          lastNotificationId: null,
          lastReadAt: null,
        };
      }

      try {
        const parsed = JSON.parse(account.scope);

        if (
          typeof parsed === "object" &&
          parsed.githubSyncState &&
          typeof parsed.githubSyncState === "object"
        ) {
          const state = parsed.githubSyncState as GitHubSyncState;
          return {
            lastSyncTime: state.lastSyncTime
              ? new Date(state.lastSyncTime)
              : null,
            lastNotificationId: state.lastNotificationId || null,
            lastReadAt: state.lastReadAt ? new Date(state.lastReadAt) : null,
          };
        }

        if (
          typeof parsed === "object" &&
          ("lastSyncTime" in parsed ||
            "lastNotificationId" in parsed ||
            "lastReadAt" in parsed) &&
          !("lastMessageId" in parsed ||
            "lastHistoryId" in parsed ||
            "lastEventId" in parsed ||
            "syncToken" in parsed)
        ) {
          const state = parsed as GitHubSyncState;
          return {
            lastSyncTime: state.lastSyncTime
              ? new Date(state.lastSyncTime)
              : null,
            lastNotificationId: state.lastNotificationId || null,
            lastReadAt: state.lastReadAt ? new Date(state.lastReadAt) : null,
          };
        }

        return {
          lastSyncTime: null,
          lastNotificationId: null,
          lastReadAt: null,
        };
      } catch (parseError) {
        console.warn(
          `Could not parse GitHub sync state for user ${userId}:`,
          parseError instanceof Error ? parseError.message : "Unknown error",
        );
        return {
          lastSyncTime: null,
          lastNotificationId: null,
          lastReadAt: null,
        };
      }
    } catch (error) {
      console.error(`Error getting GitHub sync state for user ${userId}:`, error);
      return {
        lastSyncTime: null,
        lastNotificationId: null,
        lastReadAt: null,
      };
    }
  }

  async updateSyncState(
    userId: string,
    state: Partial<GitHubSyncState>,
  ): Promise<void> {
    try {
      const currentState = await this.getSyncState(userId);

      const updatedState: GitHubSyncState = {
        lastSyncTime: state.lastSyncTime || currentState.lastSyncTime || null,
        lastNotificationId:
          state.lastNotificationId || currentState.lastNotificationId || null,
        lastReadAt: state.lastReadAt || currentState.lastReadAt || null,
      };

      const account = await prisma.account.findFirst({
        where: {
          userId,
          providerId: "github",
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
        githubSyncState: updatedState,
      };

      const result = await prisma.account.updateMany({
        where: {
          userId,
          providerId: "github",
        },
        data: {
          scope: JSON.stringify(combinedData),
        },
      });

      if (result.count === 0) {
        throw new Error(
          `No GitHub account found for user ${userId} to update sync state`,
        );
      }
    } catch (error) {
      console.error(
        `Error updating GitHub sync state for user ${userId}:`,
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
