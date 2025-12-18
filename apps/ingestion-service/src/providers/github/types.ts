export interface GitHubNotification {
  id: string;
  repository: {
    id: number;
    name: string;
    full_name: string;
    owner: {
      login: string;
      id: number;
    };
  };
  subject: {
    title: string;
    url: string;
    latest_comment_url: string | null;
    type: string;
  };
  reason: string;
  unread: boolean;
  updated_at: string;
  last_read_at: string | null;
  url: string;
}

export interface GitHubSyncState {
  lastSyncTime: Date | null;
  lastNotificationId: string | null;
  lastReadAt: Date | null;
}

export interface GitHubFetchOptions {
  all?: boolean;
  participating?: boolean;
  since?: Date;
  before?: Date;
  per_page?: number;
  page?: number;
}
