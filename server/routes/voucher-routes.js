import express from "express";
import {
  createVoucher,
  getAllVouchers,
  updateVoucher,
  deleteVoucher,
  applyVoucher,
  getAvailableVouchers,
} from "../controllers/voucher-controller.js";

import { authMiddleware, requireAdmin } from "../middleware/auth-middleware.js";

const router = express.Router();

// 📌 User routes
router.get("/get-all", authMiddleware, getAvailableVouchers); // Lấy danh sách voucher không phân trang
router.post("/apply", authMiddleware, applyVoucher); // Nhập tay mã

// 📌 Admin routes
router.post("/", authMiddleware, requireAdmin, createVoucher); // Tạo voucher
router.get("/", authMiddleware, requireAdmin, getAllVouchers); // Lấy danh sách voucher (có filter + phân trang)
router.put("/:id", authMiddleware, requireAdmin, updateVoucher); // Cập nhật voucher
router.delete("/:id", authMiddleware, requireAdmin, deleteVoucher); // Xóa voucher

export default router;
