import express from "express";
import {
  addAddress,
  getAddresses,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from "../controllers/address-controller.js";
import { authMiddleware } from "../middleware/auth-middleware.js";

const router = express.Router();

// Tất cả routes đều cần authentication
router.use(authMiddleware);

// GET /api/addresses - Lấy danh sách địa chỉ
router.get("/", getAddresses);

// POST /api/addresses - Thêm địa chỉ mới
router.post("/", addAddress);

// PUT /api/addresses/:addressId - Cập nhật địa chỉ
router.put("/:addressId", updateAddress);

// DELETE /api/addresses/:addressId - Xóa địa chỉ
router.delete("/:addressId", deleteAddress);

// PATCH /api/addresses/:addressId/default - Đặt địa chỉ mặc định
router.patch("/:addressId/default", setDefaultAddress);

export default router;
