import { prisma } from "@repo/database";
import { createQueue } from "@repo/redis";

const aiJobsQueue = createQueue("ai:jobs");

export class NotificationService {
  async getNotifications(
    userId: number,
    filters?: {
      source?: string;
      status?: string;
      priority?: string;
      requiresAction?: boolean;
      limit?: number;
      offset?: number;
    },
  ) {
    const where: Record<string, unknown> = { userId };

    if (filters?.source && filters.source !== "all") {
      where.source = filters.source;
    }

    if (filters?.status && filters.status !== "all") {
      where.status = filters.status;
    }

    if (filters?.priority && filters.priority !== "all") {
      where.priority = filters.priority;
    }

    if (filters?.requiresAction !== undefined) {
      where.requiresAction = filters.requiresAction;
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: filters?.limit || 50,
      skip: filters?.offset || 0,
    });

    return notifications;
  }

  async getNotification(id: string, userId: number) {
    const notification = await prisma.notification.findFirst({
      where: {
        id,
        userId,
      },
    });

    return notification;
  }

  async getUnreadCount(userId: number) {
    const total = await prisma.notification.count({
      where: {
        userId,
        status: "unread",
      },
    });

    const bySource = await prisma.notification.groupBy({
      by: ["source"],
      where: {
        userId,
        status: "unread",
      },
      _count: true,
    });

    const byPriority = await prisma.notification.groupBy({
      by: ["priority"],
      where: {
        userId,
        status: "unread",
      },
      _count: true,
    });

    return {
      total,
      bySource: bySource.map((item) => ({
        source: item.source,
        count: item._count,
      })),
      byPriority: byPriority.map((item) => ({
        priority: item.priority,
        count: item._count,
      })),
    };
  }

  async markAsRead(id: string, userId: number) {
    const notification = await prisma.notification.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!notification) {
      return null;
    }

    return await prisma.notification.update({
      where: { id },
      data: {
        status: "read",
        readAt: new Date(),
      },
    });
  }

  async getActionItems(userId: number) {
    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        requiresAction: true,
        status: "unread",
      },
      orderBy: { createdAt: "desc" },
    });

    const actionItems: Array<{
      id: string;
      text: string;
      source: string;
      memoryId: number;
      dueDate: Date | null;
      priority: string;
      completed: boolean;
    }> = [];

    for (const notification of notifications) {
      const enrichedData = notification.enrichedData as Record<string, unknown>;
      const items = (enrichedData.actionItems as unknown[]) || [];

      for (const item of items) {
        const actionItem = item as Record<string, unknown>;
        actionItems.push({
          id: `${notification.id}-${actionItem.text}`,
          text: actionItem.text as string,
          source: notification.source,
          memoryId: notification.memoryId,
          dueDate: actionItem.dueDate ? new Date(actionItem.dueDate as string) : null,
          priority: (actionItem.priority as string) || "medium",
          completed: false,
        });
      }
    }

    return actionItems;
  }

  async getFinanceNotifications(userId: number) {
    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        type: {
          in: ["bill", "receipt", "subscription", "payment"],
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return notifications.filter((n) => {
      const enrichedData = n.enrichedData as Record<string, unknown>;
      return enrichedData.finance !== undefined;
    });
  }

  async getUpcoming(userId: number, hours: number = 24) {
    const now = new Date();
    const futureDate = new Date(now.getTime() + hours * 60 * 60 * 1000);

    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        OR: [
          {
            dueDate: {
              gte: now,
              lte: futureDate,
            },
          },
          {
            type: "meeting",
            createdAt: {
              gte: now,
              lte: futureDate,
            },
          },
        ],
      },
      orderBy: { dueDate: "asc" },
    });

    return notifications;
  }

  async executeSuggestion(
    userId: number,
    notificationId: string,
    suggestionId: string,
  ) {
    const notification = await this.getNotification(notificationId, userId);

    if (!notification) {
      throw new Error("Notification not found");
    }

    const suggestions = notification.suggestions as Array<{
      id: string;
      type: string;
      title: string;
      action: string;
    }>;

    const suggestion = suggestions.find((s) => s.id === suggestionId);

    if (!suggestion) {
      throw new Error("Suggestion not found");
    }

    await aiJobsQueue.enqueue({
      type: "suggestion:execute",
      payload: {
        notificationId,
        suggestionId,
        userId,
      },
    });

    return {
      success: true,
      message: "Suggestion execution queued",
    };
  }
}

export const notificationService = new NotificationService();
