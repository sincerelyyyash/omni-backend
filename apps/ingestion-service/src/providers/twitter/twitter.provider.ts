import type { DataProvider, FetchOptions, FetchResult, SyncState } from "../base/types";
import type { TwitterFetchOptions, TwitterTweet, TwitterUser } from "./types";
import { createTwitterClient } from "./twitter.auth";
import { TwitterClient } from "./twitter.client";
import { TwitterTransformer } from "./twitter.transformer";
import { TwitterSyncService } from "./twitter.sync";
import { memoryClient } from "../../services/memory-client.service";
import { stringToNumericUserId } from "../../utils/userId";

export class TwitterProvider implements DataProvider {
  name = "twitter";
  private syncService: TwitterSyncService;

  constructor() {
    this.syncService = new TwitterSyncService();
  }

  async fetch(userId: string, options: FetchOptions = {}): Promise<FetchResult> {
    try {
      if (!userId || typeof userId !== "string") {
        throw new Error(`Invalid userId: ${userId}`);
      }

      const userIdNum = stringToNumericUserId(userId);

      const syncState = await this.syncService.getSyncState(userId);
      const lastSyncTime = syncState.lastSyncTime;

      const twitterAuthClient = await createTwitterClient(userId);
      const twitterClient = new TwitterClient(twitterAuthClient);

      const currentUser = await twitterClient.getCurrentUser();
      if (!currentUser) {
        throw new Error(`Could not fetch current Twitter user for userId ${userId}`);
      }

      const twitterUserId = currentUser.id;

      const fetchOptions: TwitterFetchOptions = {
        max_results: options.maxResults || 50,
        since_id: syncState.lastTweetId || undefined,
        start_time: options.since || lastSyncTime || undefined,
      };

      const [timelineResult, mentionsResult] = await Promise.allSettled([
        twitterClient.getUserTimeline(twitterUserId, fetchOptions),
        twitterClient.getMentions(twitterUserId, {
          ...fetchOptions,
          since_id: syncState.lastMentionId || undefined,
        }),
      ]);

      const timelineTweets: Array<{ tweet: TwitterTweet; user: TwitterUser | null }> = [];
      const mentionTweets: Array<{ tweet: TwitterTweet; user: TwitterUser | null }> = [];

      if (timelineResult.status === "fulfilled") {
        timelineResult.value.tweets.forEach((tweet) => {
          const user = timelineResult.value.users.find((u) => u.id === tweet.author_id);
          timelineTweets.push({ tweet, user: user || null });
        });
      } else {
        console.error("Error fetching timeline:", timelineResult.reason);
      }

      if (mentionsResult.status === "fulfilled") {
        mentionsResult.value.tweets.forEach((tweet) => {
          const user = mentionsResult.value.users.find((u) => u.id === tweet.author_id);
          mentionTweets.push({ tweet, user: user || null });
        });
      } else {
        console.error("Error fetching mentions:", mentionsResult.reason);
      }

      const allTweets = [...timelineTweets, ...mentionTweets];
      const tweetIds = new Set<string>();
      const uniqueTweets: Array<{ tweet: TwitterTweet; user: TwitterUser | null; isMention: boolean }> = [];

      for (const item of allTweets) {
        if (!tweetIds.has(item.tweet.id)) {
          tweetIds.add(item.tweet.id);
          const isMention = mentionTweets.some((m) => m.tweet.id === item.tweet.id);
          uniqueTweets.push({
            tweet: item.tweet,
            user: item.user,
            isMention,
          });
        }
      }

      if (uniqueTweets.length === 0) {
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

      const transformer = new TwitterTransformer();
      const allUsers = [
        ...(timelineResult.status === "fulfilled" ? timelineResult.value.users : []),
        ...(mentionsResult.status === "fulfilled" ? mentionsResult.value.users : []),
      ];

      const memoryInputs = uniqueTweets
        .map(({ tweet, user, isMention }) =>
          transformer.transformTweetToMemory(tweet, allUsers, userIdNum, isMention),
        )
        .filter((mem): mem is typeof mem & {} => mem !== null);

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

      const timelineTweetIds = timelineTweets.map((t) => t.tweet.id);
      const mentionTweetIds = mentionTweets.map((t) => t.tweet.id);

      const lastTweetId =
        timelineTweetIds.length > 0
          ? timelineTweetIds[timelineTweetIds.length - 1]
          : syncState.lastTweetId;
      const lastMentionId =
        mentionTweetIds.length > 0
          ? mentionTweetIds[mentionTweetIds.length - 1]
          : syncState.lastMentionId;

      await this.syncService.updateSyncState(userId, {
        lastSyncTime: new Date(),
        lastTweetId,
        lastMentionId,
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
      console.error(`Twitter fetch error for user ${userId}:`, error);
      return {
        success: false,
        itemsProcessed: 0,
        itemsFailed: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async getSyncState(userId: string): Promise<SyncState> {
    const twitterSyncState = await this.syncService.getSyncState(userId);
    return {
      lastSyncTime: twitterSyncState.lastSyncTime,
      lastItemId: twitterSyncState.lastTweetId,
      metadata: {
        lastMentionId: twitterSyncState.lastMentionId,
      },
    };
  }
}

export const twitterProvider = new TwitterProvider();
