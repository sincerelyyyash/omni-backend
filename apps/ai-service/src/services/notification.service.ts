import { prisma } from "@repo/database";
import type { Suggestion } from "@repo/types";

export interface NotificationData {
  userId: number;
  memoryId: number;
  source: string;
  type: string;
  priority: string;
  status?: string;
  requiresAction: boolean;
  actionType?: string | null;
  actionUrl?: string | null;
  dueDate?: Date | null;
  enrichedData: Record<string, unknown>;
  suggestions: Suggestion[];
}

export class NotificationService {
  async createNotification(data: NotificationData) {
    const existing = await prisma.notification.findUnique({
      where: { memoryId: data.memoryId },
    });

    if (existing) {
      return await prisma.notification.update({
        where: { id: existing.id },
        data: {
          source: data.source,
          type: data.type,
          priority: data.priority,
          status: data.status || existing.status,
          requiresAction: data.requiresAction,
          actionType: data.actionType,
          actionUrl: data.actionUrl,
          dueDate: data.dueDate,
          enrichedData: data.enrichedData as unknown,
          suggestions: data.suggestions as unknown,
        },
      });
    }

    return await prisma.notification.create({
      data: {
        userId: data.userId,
        memoryId: data.memoryId,
        source: data.source,
        type: data.type,
        priority: data.priority,
        status: data.status || "unread",
        requiresAction: data.requiresAction,
        actionType: data.actionType,
        actionUrl: data.actionUrl,
        dueDate: data.dueDate,
        enrichedData: data.enrichedData as unknown,
        suggestions: data.suggestions as unknown,
      },
    });
  }

  async getNotification(id: string) {
    return await prisma.notification.findUnique({
      where: { id },
    });
  }

  async getNotificationsByUser(
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

    return await prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: filters?.limit || 50,
      skip: filters?.offset || 0,
    });
  }

  async markAsRead(id: string) {
    return await prisma.notification.update({
      where: { id },
      data: {
        status: "read",
        readAt: new Date(),
      },
    });
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
}

export const notificationService = new NotificationService();
