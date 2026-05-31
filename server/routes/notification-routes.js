import express from "express";
import { authMiddleware, requireAdmin } from "../middleware/auth-middleware.js";
import * as notificationController from "../controllers/notification-controller.js";

const router = express.Router();
// Lấy số thông báo chưa đọc
router.get(
  "/unread-count",
  authMiddleware,
  notificationController.getUnreadCount
);

// Đánh dấu thông báo đã đọc
router.patch(
  "/:notificationId/read",
  authMiddleware,
  notificationController.markAsRead
);

// Đánh dấu tất cả thông báo đã đọc
router.patch("/read-all", authMiddleware, notificationController.markAllAsRead);

// Lấy danh sách thông báo
router.get("/", authMiddleware, notificationController.getNotifications);

export default router;
