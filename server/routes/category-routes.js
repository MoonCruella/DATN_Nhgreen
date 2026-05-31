import express from "express";
import {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
} from "../controllers/category-controller.js";
import { authMiddleware, requireAdmin } from "../middleware/auth-middleware.js";

const router = express.Router();

// Tạo category mới
router.post("/", authMiddleware, requireAdmin, createCategory);

// Lấy danh sách category (có phân trang)
router.get("/", getCategories);

// Lấy chi tiết 1 category theo id
router.get("/:id", getCategoryById);

// Cập nhật category
router.put("/:id", authMiddleware, requireAdmin, updateCategory);

// Xóa category
router.delete("/:id", authMiddleware, requireAdmin, deleteCategory);

export default router;
