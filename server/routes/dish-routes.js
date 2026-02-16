import express from "express";
import {
  createDish,
  getDishes,
  getTopSellingDishes,
  getNewestDishes,
  getDishById,
  updateDish,
  deleteDish,
  getDishByTag,
} from "../controllers/dish-controller.js";
import {
  authMiddleware,
  checkAuthOptional,
  requireAdmin,
} from "../middleware/auth-middleware.js";
const router = express.Router();

// Tạo món ăn mới
router.post("/", authMiddleware, requireAdmin, createDish);

// Lấy danh sách món ăn (có phân trang + populate)
router.get("/", checkAuthOptional, getDishes);

// Top-selling và newest (ngắn gọn)
router.get("/top-selling", getTopSellingDishes);
router.get("/newest", getNewestDishes);
// Support both query-based tag search (/api/dishes/tags?tag=xyz)
router.get("/tags", getDishByTag);
// Support param-based tag search (/api/dishes/tags/:tag) used by client-side helpers
router.get("/tags/:tag", getDishByTag);

// Lấy chi tiết 1 món ăn theo ID
router.get("/:id", getDishById);

// Cập nhật món ăn
router.put("/:id", authMiddleware, requireAdmin, updateDish);

// Xóa món ăn
router.delete("/:id", authMiddleware, requireAdmin, deleteDish);

export default router;
