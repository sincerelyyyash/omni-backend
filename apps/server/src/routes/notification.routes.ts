import Router from "express";
import { authenticate } from "../middleware/auth.middleware";
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  getNotificationSuggestions,
  executeSuggestion,
  getActionItems,
  getFinanceNotifications,
  getUpcoming,
} from "../controllers/notification.controller";

const router = Router();

router.route("/notifications").get(authenticate, getNotifications);
router.route("/notifications/unread-count").get(authenticate, getUnreadCount);
router.route("/notifications/:id/read").post(authenticate, markAsRead);
router.route("/notifications/:id/suggestions").get(authenticate, getNotificationSuggestions);
router.route("/notifications/:id/suggestions/:suggestionId/execute").post(authenticate, executeSuggestion);
router.route("/action-items").get(authenticate, getActionItems);
router.route("/finance/notifications").get(authenticate, getFinanceNotifications);
router.route("/upcoming").get(authenticate, getUpcoming);

export default router;
