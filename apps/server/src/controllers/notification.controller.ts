import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.middleware";
import { notificationService } from "../services/notification.service";
import { stringToNumericUserId } from "../utils/userId";

export const getNotifications = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const userId = stringToNumericUserId(req.user!.id);
  const { source, status, priority, requiresAction, limit, offset } =
    req.query;

  try {
    const notifications = await notificationService.getNotifications(userId, {
      source: source as string | undefined,
      status: status as string | undefined,
      priority: priority as string | undefined,
      requiresAction:
        requiresAction === "true" ? true : requiresAction === "false" ? false : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    return res.status(200).json({
      message: "Notifications fetched successfully",
      data: notifications,
      count: notifications.length,
    });
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error";
    console.error("Error fetching notifications:", errorMessage);
    return res.status(500).json({
      message: "Internal server error",
      error: errorMessage,
    });
  }
};

export const getUnreadCount = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const userId = stringToNumericUserId(req.user!.id);

  try {
    const count = await notificationService.getUnreadCount(userId);

    return res.status(200).json({
      message: "Unread count fetched successfully",
      data: count,
    });
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error";
    console.error("Error fetching unread count:", errorMessage);
    return res.status(500).json({
      message: "Internal server error",
      error: errorMessage,
    });
  }
};

export const markAsRead = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const userId = stringToNumericUserId(req.user!.id);
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({
      message: "Notification ID is required",
    });
  }

  try {
    const notification = await notificationService.markAsRead(id, userId);

    if (!notification) {
      return res.status(404).json({
        message: "Notification not found",
      });
    }

    return res.status(200).json({
      message: "Notification marked as read",
      data: notification,
    });
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error";
    console.error("Error marking notification as read:", errorMessage);
    return res.status(500).json({
      message: "Internal server error",
      error: errorMessage,
    });
  }
};

export const getNotificationSuggestions = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const userId = stringToNumericUserId(req.user!.id);
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({
      message: "Notification ID is required",
    });
  }

  try {
    const notification = await notificationService.getNotification(id, userId);

    if (!notification) {
      return res.status(404).json({
        message: "Notification not found",
      });
    }

    const suggestions = notification.suggestions as unknown[];

    return res.status(200).json({
      message: "Suggestions fetched successfully",
      data: suggestions,
    });
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error";
    console.error("Error fetching suggestions:", errorMessage);
    return res.status(500).json({
      message: "Internal server error",
      error: errorMessage,
    });
  }
};

export const executeSuggestion = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const userId = stringToNumericUserId(req.user!.id);
  const { id, suggestionId } = req.params;

  if (!id || !suggestionId) {
    return res.status(400).json({
      message: "Notification ID and Suggestion ID are required",
    });
  }

  try {
    const result = await notificationService.executeSuggestion(
      userId,
      id as string,
      suggestionId as string,
    );

    return res.status(200).json({
      message: "Suggestion execution queued",
      data: result,
    });
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error";
    console.error("Error executing suggestion:", errorMessage);
    return res.status(500).json({
      message: "Internal server error",
      error: errorMessage,
    });
  }
};

export const getActionItems = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const userId = stringToNumericUserId(req.user!.id);

  try {
    const actionItems = await notificationService.getActionItems(userId);

    return res.status(200).json({
      message: "Action items fetched successfully",
      data: actionItems,
      count: actionItems.length,
    });
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error";
    console.error("Error fetching action items:", errorMessage);
    return res.status(500).json({
      message: "Internal server error",
      error: errorMessage,
    });
  }
};

export const getFinanceNotifications = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const userId = stringToNumericUserId(req.user!.id);

  try {
    const notifications =
      await notificationService.getFinanceNotifications(userId);

    return res.status(200).json({
      message: "Finance notifications fetched successfully",
      data: notifications,
      count: notifications.length,
    });
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error";
    console.error("Error fetching finance notifications:", errorMessage);
    return res.status(500).json({
      message: "Internal server error",
      error: errorMessage,
    });
  }
};

export const getUpcoming = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const userId = stringToNumericUserId(req.user!.id);
  const hours = req.query.hours ? parseInt(req.query.hours as string) : 24;

  try {
    const notifications = await notificationService.getUpcoming(userId, hours);

    return res.status(200).json({
      message: "Upcoming items fetched successfully",
      data: notifications,
      count: notifications.length,
    });
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error";
    console.error("Error fetching upcoming items:", errorMessage);
    return res.status(500).json({
      message: "Internal server error",
      error: errorMessage,
    });
  }
};
