import express from "express";
import {
  createRating,
  getOrderRatings,
  getRatingsByDish,
  deleteRating,
  updateRating,
  getDishAverageRating,
  getAllRatings,
  checkUserRatingForDish,
  getAllRatingsForManager,
} from "../controllers/rating-controller.js";
import { authMiddleware, requireAdmin, requireManager } from "../middleware/auth-middleware.js";

const router = express.Router();

// Specific routes first - Manager listing of all ratings (with filters) — protected
router.get("/manager/all", authMiddleware, requireManager, getAllRatingsForManager);

// Get ratings for a specific dish (public)
router.get("/dish/:dishId", getRatingsByDish);

// Get average rating for a dish (public)
router.get("/dish/:dishId/average", getDishAverageRating);

// Check user rating for a dish (authenticated)
router.get("/dish/:dishId/check", authMiddleware, checkUserRatingForDish);

// Get ratings for a specific order (authenticated)
router.get("/order/:orderId", authMiddleware, getOrderRatings);

// Create a new rating (authenticated users) - MUST BE BEFORE GET /
router.post("/", authMiddleware, createRating);

// Admin listing of all ratings (with filters) — protected
router.get("/", authMiddleware, requireAdmin, getAllRatings);

// Update a rating (authenticated; controller enforces owner/seller)
router.put("/:id", authMiddleware, updateRating);

// Delete a rating (authenticated; controller enforces owner/seller)
router.delete("/:id", authMiddleware, deleteRating);

export default router;
