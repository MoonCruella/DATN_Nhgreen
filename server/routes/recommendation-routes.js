import express from "express";
import * as recommendationController from "../controllers/recommendation-controller.js";
import {
  authMiddleware,
  requireAdmin,
  requireManager,
} from "../middleware/auth-middleware.js";

const router = express.Router();

/**
 * @route   GET /api/recommendations/user/:userId
 * @desc    Lấy gợi ý món ăn cho user
 * @access  Private (cần đăng nhập)
 */
router.get(
  "/user/:userId",
  authMiddleware,
  recommendationController.getRecommendationsForUser
);

/**
 * @route   GET /api/recommendations/similar/:dishId
 * @desc    Lấy món tương tự
 * @access  Public
 */
router.get("/similar/:dishId", recommendationController.getSimilarDishes);

/**
 * @route   POST /api/recommendations/retrain
 * @desc    Train lại AI model (Admin only)
 * @access  Private (Admin)
 */
router.post(
  "/retrain",
  authMiddleware,
  requireAdmin,
  recommendationController.retrainModel
);

export default router;
