import type { DataProvider, FetchOptions, FetchResult, SyncState } from "../base/types";
import type { GmailFetchOptions } from "./types";
import { createGmailClient } from "./gmail.auth";
import { GmailClient } from "./gmail.client";
import { GmailTransformer } from "./gmail.transformer";
import { GmailSyncService } from "./gmail.sync";
import { memoryClient } from "../../services/memory-client.service";
import { stringToNumericUserId } from "../../utils/userId";

export class GmailProvider implements DataProvider {
  name = "gmail";
  private syncService: GmailSyncService;

  constructor() {
    this.syncService = new GmailSyncService();
  }

  async fetch(userId: string, options: FetchOptions = {}): Promise<FetchResult> {
    try {
      if (!userId || typeof userId !== "string") {
        throw new Error(`Invalid userId: ${userId}`);
      }

      const userIdNum = stringToNumericUserId(userId);

      const syncState = await this.syncService.getSyncState(userId);
      const lastSyncTime = syncState.lastSyncTime;

      const gmailOptions: GmailFetchOptions = {
        maxResults: options.maxResults || 50,
        since: options.since || lastSyncTime || undefined,
        query: this.buildQuery(lastSyncTime, options),
      };

      const gmail = await createGmailClient(userId);
      const gmailClient = new GmailClient(gmail);

      const messageIds = await gmailClient.listMessages(gmailOptions);

      if (messageIds.length === 0) {
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

      const messages = await gmailClient.getMessages(messageIds);

      const transformer = new GmailTransformer(gmailClient);
      const memoryInputs = transformer.transformEmailsToMemories(
        messages,
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

      const lastMessageId = messageIds[messageIds.length - 1];
      await this.syncService.updateSyncState(userId, {
        lastSyncTime: new Date(),
        lastMessageId,
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
      console.error(`Gmail fetch error for user ${userId}:`, error);
      return {
        success: false,
        itemsProcessed: 0,
        itemsFailed: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async getSyncState(userId: string): Promise<SyncState> {
    const gmailSyncState = await this.syncService.getSyncState(userId);
    return {
      lastSyncTime: gmailSyncState.lastSyncTime,
      lastItemId: gmailSyncState.lastMessageId,
      metadata: {
        lastHistoryId: gmailSyncState.lastHistoryId,
      },
    };
  }

  private buildQuery(
    lastSyncTime: Date | null,
    options: FetchOptions,
  ): string {
    const queries: string[] = ["in:inbox"];

    if (lastSyncTime && !options.forceFullSync) {
      const dateStr = lastSyncTime.toISOString().split("T")[0].replace(/-/g, "/");
      queries.push(`after:${dateStr}`);
    }

    return queries.join(" ");
  }
}

export const gmailProvider = new GmailProvider();
