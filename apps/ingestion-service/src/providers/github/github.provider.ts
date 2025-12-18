import type { DataProvider, FetchOptions, FetchResult, SyncState } from "../base/types";
import type { GitHubFetchOptions } from "./types";
import { createGitHubClient } from "./github.auth";
import { GitHubClient } from "./github.client";
import { GitHubTransformer } from "./github.transformer";
import { GitHubSyncService } from "./github.sync";
import { memoryClient } from "../../services/memory-client.service";
import { stringToNumericUserId } from "../../utils/userId";

export class GitHubProvider implements DataProvider {
  name = "github";
  private syncService: GitHubSyncService;

  constructor() {
    this.syncService = new GitHubSyncService();
  }

  async fetch(userId: string, options: FetchOptions = {}): Promise<FetchResult> {
    try {
      if (!userId || typeof userId !== "string") {
        throw new Error(`Invalid userId: ${userId}`);
      }

      const userIdNum = stringToNumericUserId(userId);

      const syncState = await this.syncService.getSyncState(userId);
      const lastSyncTime = syncState.lastSyncTime;

      const githubOptions: GitHubFetchOptions = {
        all: false,
        participating: true,
        since: options.since || lastSyncTime || undefined,
        per_page: options.maxResults || 50,
        page: 1,
      };

      const githubAuthClient = await createGitHubClient(userId);
      const githubClient = new GitHubClient(githubAuthClient);

      const notificationIds = await githubClient.listNotifications(githubOptions);

      if (notificationIds.length === 0) {
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

      const notifications = await githubClient.getNotifications(notificationIds);

      const transformer = new GitHubTransformer();
      const memoryInputs = transformer.transformNotificationsToMemories(
        notifications,
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

      const lastNotificationId = notificationIds[notificationIds.length - 1];
      await this.syncService.updateSyncState(userId, {
        lastSyncTime: new Date(),
        lastNotificationId,
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
      console.error(`GitHub fetch error for user ${userId}:`, error);
      return {
        success: false,
        itemsProcessed: 0,
        itemsFailed: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async getSyncState(userId: string): Promise<SyncState> {
    const githubSyncState = await this.syncService.getSyncState(userId);
    return {
      lastSyncTime: githubSyncState.lastSyncTime,
      lastItemId: githubSyncState.lastNotificationId,
      metadata: {
        lastReadAt: githubSyncState.lastReadAt,
      },
    };
  }
}

export const githubProvider = new GitHubProvider();
