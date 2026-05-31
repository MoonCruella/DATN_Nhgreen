import express from "express";
import {
  createIngredient,
  getIngredients,
  getIngredientById,
  updateIngredient,
  deleteIngredient,
} from "../controllers/ingredient-controller.js";
import { authMiddleware, requireAdmin } from "../middleware/auth-middleware.js";

const router = express.Router();

// Tạo mới ingredient
router.post("/", authMiddleware, requireAdmin, createIngredient);

// Lấy tất cả ingredient
router.get("/", getIngredients);

// Lấy ingredient theo ID
router.get("/:id", getIngredientById);

// Cập nhật ingredient
router.put("/:id", authMiddleware, requireAdmin, updateIngredient);

// Xóa ingredient
router.delete("/:id", authMiddleware, requireAdmin, deleteIngredient);

export default router;
