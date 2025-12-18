export interface TwitterUser {
  id: string;
  username: string;
  name: string;
  profile_image_url?: string;
}

export interface TwitterPublicMetrics {
  retweet_count: number;
  like_count: number;
  reply_count: number;
  quote_count: number;
}

export interface TwitterReferencedTweet {
  type: "replied_to" | "quoted" | "retweeted";
  id: string;
}

export interface TwitterTweet {
  id: string;
  text: string;
  author_id?: string;
  created_at: string;
  public_metrics?: TwitterPublicMetrics;
  referenced_tweets?: TwitterReferencedTweet[];
  in_reply_to_user_id?: string;
  conversation_id?: string;
  lang?: string;
}

export interface TwitterMention extends TwitterTweet {
  isMention: true;
}

export interface TwitterSyncState {
  lastSyncTime: Date | null;
  lastTweetId: string | null;
  lastMentionId: string | null;
}

export interface TwitterFetchOptions {
  max_results?: number;
  since_id?: string;
  until_id?: string;
  start_time?: Date;
  end_time?: Date;
  pagination_token?: string;
}

export interface TwitterAPIResponse<T> {
  data?: T[];
  meta?: {
    result_count?: number;
    next_token?: string;
    previous_token?: string;
  };
  includes?: {
    users?: TwitterUser[];
    tweets?: TwitterTweet[];
  };
  errors?: Array<{
    message: string;
    code: number;
  }>;
}
