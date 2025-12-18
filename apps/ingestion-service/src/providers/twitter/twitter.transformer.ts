import type { TwitterTweet, TwitterUser } from "./types";
import type { CreateMemoryInput } from "@repo/types";

interface TweetWithUser {
  tweet: TwitterTweet;
  user: TwitterUser | null;
  isMention: boolean;
}

export class TwitterTransformer {
  private findUserById(users: TwitterUser[], userId?: string): TwitterUser | null {
    if (!userId) return null;
    return users.find((u) => u.id === userId) || null;
  }

  transformTweetToMemory(
    tweet: TwitterTweet,
    users: TwitterUser[],
    userId: number,
    isMention: boolean = false,
  ): CreateMemoryInput | null {
    if (!tweet.id) {
      return null;
    }

    const author = this.findUserById(users, tweet.author_id);
    const username = author?.username || "unknown";
    const name = author?.name || username;
    const text = tweet.text || "";
    const metrics = tweet.public_metrics || {
      retweet_count: 0,
      like_count: 0,
      reply_count: 0,
      quote_count: 0,
    };

    const createdAt = tweet.created_at ? new Date(tweet.created_at) : new Date();

    let content = `Tweet: ${text}\nAuthor: @${username} (${name})\nLikes: ${metrics.like_count}, Retweets: ${metrics.retweet_count}, Replies: ${metrics.reply_count}`;

    if (tweet.referenced_tweets && tweet.referenced_tweets.length > 0) {
      const refTypes = tweet.referenced_tweets.map((r) => r.type).join(", ");
      content += `\nReferenced: ${refTypes}`;
    }

    content += `\nCreated: ${createdAt.toISOString()}`;

    const contentUrl = `https://twitter.com/${username}/status/${tweet.id}`;

    const title = text.length > 100 ? text.substring(0, 100) + "..." : text || "Twitter Tweet";

    return {
      userId,
      source: "twitter",
      sourceId: tweet.id,
      timestamp: createdAt,
      content,
      contentUrl,
      title,
      origin: `@${username}`,
      tags: this.extractTags(tweet, isMention),
      category: this.extractCategories(tweet, isMention),
      type: isMention ? "twitter_mention" : "twitter_tweet",
      attribute: {
        tweetId: tweet.id,
        text: tweet.text,
        author: author
          ? {
              id: author.id,
              username: author.username,
              name: author.name,
              profile_image_url: author.profile_image_url,
            }
          : null,
        public_metrics: metrics,
        referenced_tweets: tweet.referenced_tweets,
        in_reply_to_user_id: tweet.in_reply_to_user_id,
        conversation_id: tweet.conversation_id,
        lang: tweet.lang,
        created_at: tweet.created_at,
      },
      summary: text.length > 200 ? text.substring(0, 200) + "..." : text || title,
    };
  }

  private extractTags(tweet: TwitterTweet, isMention: boolean): string[] {
    const tags: string[] = ["twitter", "tweet"];

    if (isMention) {
      tags.push("mention");
    }

    if (tweet.referenced_tweets) {
      tweet.referenced_tweets.forEach((ref) => {
        if (ref.type === "quoted") {
          tags.push("quote");
        } else if (ref.type === "replied_to") {
          tags.push("reply");
        } else if (ref.type === "retweeted") {
          tags.push("retweet");
        }
      });
    }

    if (tweet.public_metrics) {
      if (tweet.public_metrics.like_count > 100) {
        tags.push("popular");
      }
      if (tweet.public_metrics.retweet_count > 10) {
        tags.push("viral");
      }
    }

    return tags;
  }

  private extractCategories(tweet: TwitterTweet, isMention: boolean): string[] {
    const categories: string[] = ["twitter", "tweet"];

    if (isMention) {
      categories.push("mention");
    }

    if (tweet.referenced_tweets) {
      tweet.referenced_tweets.forEach((ref) => {
        if (ref.type === "quoted") {
          categories.push("quote");
        } else if (ref.type === "replied_to") {
          categories.push("reply");
        }
      });
    }

    return categories;
  }

  transformTweetsToMemories(
    tweets: TwitterTweet[],
    users: TwitterUser[],
    userId: number,
    isMention: boolean = false,
  ): CreateMemoryInput[] {
    return tweets
      .map((tweet) => this.transformTweetToMemory(tweet, users, userId, isMention))
      .filter((mem): mem is CreateMemoryInput => mem !== null);
  }
}
