import type { GitHubNotification } from "./types";
import type { CreateMemoryInput } from "@repo/types";

export class GitHubTransformer {
  transformNotificationToMemory(
    notification: GitHubNotification,
    userId: number,
  ): CreateMemoryInput | null {
    if (!notification.id) {
      return null;
    }

    const repoName = notification.repository.full_name;
    const subjectTitle = notification.subject.title || "GitHub Notification";
    const subjectType = notification.subject.type || "Unknown";
    const reason = notification.reason || "unknown";
    const url = notification.subject.url || notification.url;

    const content = `Repository: ${repoName}\nType: ${subjectType}\nReason: ${reason}\nSubject: ${subjectTitle}\nURL: ${url}`;

    const contentUrl = url || notification.url;

    return {
      userId,
      source: "github",
      sourceId: notification.id,
      timestamp: new Date(notification.updated_at),
      content,
      contentUrl,
      title: subjectTitle,
      origin: repoName,
      tags: this.extractTags(notification),
      category: this.extractCategories(notification),
      type: "github_notification",
      attribute: {
        notificationId: notification.id,
        repository: notification.repository,
        subject: notification.subject,
        reason: notification.reason,
        unread: notification.unread,
        updatedAt: notification.updated_at,
        lastReadAt: notification.last_read_at,
        url: notification.url,
      },
      summary: subjectTitle || content.substring(0, 200),
    };
  }

  private extractTags(notification: GitHubNotification): string[] {
    const tags: string[] = ["github", "notification"];

    tags.push(notification.reason);

    if (notification.unread) {
      tags.push("unread");
    }

    const subjectType = notification.subject.type?.toLowerCase();
    if (subjectType) {
      tags.push(subjectType);
    }

    return tags;
  }

  private extractCategories(notification: GitHubNotification): string[] {
    const categories: string[] = ["github", "notification"];

    const subjectType = notification.subject.type || "Unknown";
    categories.push(subjectType);

    return categories;
  }

  transformNotificationsToMemories(
    notifications: Array<GitHubNotification | null>,
    userId: number,
  ): CreateMemoryInput[] {
    return notifications
      .filter(
        (notification): notification is GitHubNotification =>
          notification !== null,
      )
      .map((notification) =>
        this.transformNotificationToMemory(notification, userId),
      )
      .filter((mem): mem is CreateMemoryInput => mem !== null);
  }
}
