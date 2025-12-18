import type {
  TwitterTweet,
  TwitterUser,
  TwitterFetchOptions,
  TwitterAPIResponse,
} from "./types";
import type { TwitterClient as TwitterAuthClient } from "./twitter.auth";

const TWITTER_API_BASE = "https://api.twitter.com/2";

export class TwitterClient {
  constructor(private client: TwitterAuthClient) {}

  private async makeRequest<T>(
    endpoint: string,
    params?: URLSearchParams,
  ): Promise<TwitterAPIResponse<T>> {
    const url = params
      ? `${TWITTER_API_BASE}${endpoint}?${params.toString()}`
      : `${TWITTER_API_BASE}${endpoint}`;

    const response = await this.client.fetch(url);

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Twitter authentication failed - invalid token");
      }
      if (response.status === 403) {
        throw new Error("Twitter API access forbidden - account may be suspended");
      }
      if (response.status === 429) {
        const resetTime = response.headers.get("x-rate-limit-reset");
        throw new Error(
          `Twitter API rate limit exceeded. Reset at: ${resetTime || "unknown"}`,
        );
      }
      const errorText = await response.text();
      throw new Error(`Twitter API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  async getUserTimeline(
    userId: string,
    options: TwitterFetchOptions = {},
  ): Promise<{ tweets: TwitterTweet[]; users: TwitterUser[]; nextToken?: string }> {
    const {
      max_results = 50,
      since_id,
      until_id,
      start_time,
      end_time,
      pagination_token,
    } = options;

    const params = new URLSearchParams();
    params.append("max_results", max_results.toString());
    if (since_id) params.append("since_id", since_id);
    if (until_id) params.append("until_id", until_id);
    if (start_time) params.append("start_time", start_time.toISOString());
    if (end_time) params.append("end_time", end_time.toISOString());
    if (pagination_token) params.append("pagination_token", pagination_token);

    params.append("tweet.fields", "id,text,created_at,public_metrics,referenced_tweets,author_id,in_reply_to_user_id,conversation_id,lang");
    params.append("expansions", "author_id,referenced_tweets.id");
    params.append("user.fields", "id,username,name,profile_image_url");

    const response = await this.makeRequest<TwitterTweet>(
      `/users/${userId}/tweets`,
      params,
    );

    const tweets = response.data || [];
    const users = response.includes?.users || [];

    return {
      tweets,
      users,
      nextToken: response.meta?.next_token,
    };
  }

  async getMentions(
    userId: string,
    options: TwitterFetchOptions = {},
  ): Promise<{ tweets: TwitterTweet[]; users: TwitterUser[]; nextToken?: string }> {
    const {
      max_results = 50,
      since_id,
      until_id,
      start_time,
      end_time,
      pagination_token,
    } = options;

    const params = new URLSearchParams();
    params.append("max_results", max_results.toString());
    if (since_id) params.append("since_id", since_id);
    if (until_id) params.append("until_id", until_id);
    if (start_time) params.append("start_time", start_time.toISOString());
    if (end_time) params.append("end_time", end_time.toISOString());
    if (pagination_token) params.append("pagination_token", pagination_token);

    params.append("tweet.fields", "id,text,created_at,public_metrics,referenced_tweets,author_id,in_reply_to_user_id,conversation_id,lang");
    params.append("expansions", "author_id,referenced_tweets.id");
    params.append("user.fields", "id,username,name,profile_image_url");

    const response = await this.makeRequest<TwitterTweet>(
      `/users/${userId}/mentions`,
      params,
    );

    const tweets = response.data || [];
    const users = response.includes?.users || [];

    return {
      tweets,
      users,
      nextToken: response.meta?.next_token,
    };
  }

  async getTweet(tweetId: string): Promise<{ tweet: TwitterTweet | null; users: TwitterUser[] }> {
    try {
      const params = new URLSearchParams();
      params.append("tweet.fields", "id,text,created_at,public_metrics,referenced_tweets,author_id,in_reply_to_user_id,conversation_id,lang");
      params.append("expansions", "author_id,referenced_tweets.id");
      params.append("user.fields", "id,username,name,profile_image_url");

      const url = `${TWITTER_API_BASE}/tweets/${tweetId}?${params.toString()}`;
      const response = await this.client.fetch(url);

      if (!response.ok) {
        if (response.status === 404) {
          return { tweet: null, users: [] };
        }
        const errorText = await response.text();
        console.error(`Error fetching tweet ${tweetId}: ${response.status} - ${errorText}`);
        return { tweet: null, users: [] };
      }

      const responseData: TwitterAPIResponse<TwitterTweet> = await response.json();
      const tweet = (Array.isArray(responseData.data) ? responseData.data[0] : responseData.data) || null;
      const users = responseData.includes?.users || [];

      return { tweet, users };
    } catch (error) {
      console.error(`Error fetching tweet ${tweetId}:`, error);
      return { tweet: null, users: [] };
    }
  }

  async getTweets(
    tweetIds: string[],
  ): Promise<{ tweets: TwitterTweet[]; users: TwitterUser[] }> {
    if (tweetIds.length === 0) {
      return { tweets: [], users: [] };
    }

    const params = new URLSearchParams();
    params.append("ids", tweetIds.join(","));
    params.append("tweet.fields", "id,text,created_at,public_metrics,referenced_tweets,author_id,in_reply_to_user_id,conversation_id,lang");
    params.append("expansions", "author_id,referenced_tweets.id");
    params.append("user.fields", "id,username,name,profile_image_url");

    try {
      const response = await this.makeRequest<TwitterTweet>("/tweets", params);
      const tweets = response.data || [];
      const users = response.includes?.users || [];
      return { tweets, users };
    } catch (error) {
      console.error("Error fetching tweets:", error);
      return { tweets: [], users: [] };
    }
  }

  async getCurrentUser(): Promise<TwitterUser | null> {
    try {
      const params = new URLSearchParams();
      params.append("user.fields", "id,username,name,profile_image_url");

      const response = await this.makeRequest<TwitterUser>("/users/me", params);
      return (Array.isArray(response.data) ? response.data[0] : response.data) || null;
    } catch (error) {
      console.error("Error fetching current user:", error);
      return null;
    }
  }
}
