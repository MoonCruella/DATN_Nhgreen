import express from "express";
import {
  getUserOrders,
  getOrderById,
  cancelOrder,
  reorder,
  createOrder,
  getOrderStats,
  updateShippingInfo,
  getAllOrders,
  searchOrders,
  getUserOrdersByAdmin,
  getOrdersByBranch,
  confirmReceived,
  reportNotReceived,
  completeDineInOrder,
  ghnWebhook,
  syncGhnShippingStatus,
} from "../controllers/order-controller.js";
import { authMiddleware, checkAuthOptional } from "../middleware/auth-middleware.js";

const router = express.Router();

// Tất cả routes đều cần authentication
router.post("/", checkAuthOptional, createOrder);
router.post("/ghn/webhook", ghnWebhook);

router.use(authMiddleware);

// POST /api/orders - Tạo đơn hàng mới

// GET /api/orders - Lấy danh sách đơn hàng của user (có filter & pagination)
router.get("/user", getUserOrders);

// GET /api/orders/stats - Lấy thống kê đơn hàng
router.get("/stats", getOrderStats);

// GET /api/orders/all - Lấy tất cả đơn hàng (Admin)
router.get("/all", getAllOrders);

// GET /api/orders/search - Tìm kiếm đơn hàng
router.get("/search", searchOrders);

// GET /api/orders/user/:userId - Lấy đơn hàng của user (Admin)
router.get("/user/:userId", getUserOrdersByAdmin);

// GET /api/orders/branch/:branchId - Lấy đơn hàng theo chi nhánh (Manager)
router.get("/branch/:branchId", getOrdersByBranch);

// GET /api/orders/:orderId - Lấy chi tiết đơn hàng
router.get("/:orderId", getOrderById);

// PUT /api/orders/:orderId/cancel - Hủy đơn hàng
router.put("/:orderId/cancel", cancelOrder);

// PUT /api/orders/:orderId/confirm-received - Khách hàng xác nhận đã nhận hàng
router.put("/:orderId/confirm-received", confirmReceived);

// PUT /api/orders/:orderId/report-not-received - Khách hàng báo cáo chưa nhận hàng
router.put("/:orderId/report-not-received", reportNotReceived);

router.put("/:orderId/dine-in/complete", completeDineInOrder);

// POST /api/orders/:orderId/reorder - Đặt lại đơn hàng
router.post("/:orderId/reorder", reorder);

// PUT /api/orders/:orderId/shipping - Cập nhật thông tin vận chuyển (Admin)
router.put("/:orderId/shipping", updateShippingInfo);

// PUT /api/orders/:orderId/ghn-sync - Đồng bộ trạng thái vận đơn GHN
router.put("/:orderId/ghn-sync", syncGhnShippingStatus);

export default router;
