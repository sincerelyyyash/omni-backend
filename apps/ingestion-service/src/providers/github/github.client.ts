import type { GitHubNotification, GitHubFetchOptions } from "./types";
import type { GitHubClient as GitHubAuthClient } from "./github.auth";

const GITHUB_API_BASE = "https://api.github.com";

export class GitHubClient {
  constructor(private client: GitHubAuthClient) {}

  async listNotifications(options: GitHubFetchOptions = {}): Promise<string[]> {
    const {
      all = false,
      participating = true,
      since,
      before,
      per_page = 50,
      page = 1,
    } = options;

    const params = new URLSearchParams();
    if (all !== undefined) params.append("all", all.toString());
    if (participating !== undefined) params.append("participating", participating.toString());
    if (since) params.append("since", since.toISOString());
    if (before) params.append("before", before.toISOString());
    params.append("per_page", per_page.toString());
    params.append("page", page.toString());

    try {
      const url = `${GITHUB_API_BASE}/notifications?${params.toString()}`;
      const response = await this.client.fetch(url);

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("GitHub authentication failed - invalid token");
        }
        if (response.status === 403) {
          throw new Error("GitHub API rate limit exceeded or access forbidden");
        }
        const errorText = await response.text();
        throw new Error(`GitHub API error: ${response.status} - ${errorText}`);
      }

      const notifications: GitHubNotification[] = await response.json();
      return notifications.map((n) => n.id).filter(Boolean);
    } catch (error) {
      console.error("Error listing GitHub notifications:", error);
      throw error;
    }
  }

  async getNotification(threadId: string): Promise<GitHubNotification | null> {
    try {
      const url = `${GITHUB_API_BASE}/notifications/threads/${threadId}`;
      const response = await this.client.fetch(url);

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        const errorText = await response.text();
        console.error(`Error fetching notification ${threadId}:`, errorText);
        return null;
      }

      const notification: GitHubNotification = await response.json();
      return notification;
    } catch (error) {
      console.error(`Error fetching GitHub notification ${threadId}:`, error);
      return null;
    }
  }

  async getNotifications(
    threadIds: string[],
  ): Promise<Array<GitHubNotification | null>> {
    const results = await Promise.allSettled(
      threadIds.map((id) => this.getNotification(id)),
    );

    return results.map((result) =>
      result.status === "fulfilled" ? result.value : null,
    );
  }
}
