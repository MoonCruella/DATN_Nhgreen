import express from "express";
import * as dashboardController from "../controllers/dashboard-controller.js";
import {
  authMiddleware,
  requireAdmin,
  requireManager,
} from "../middleware/auth-middleware.js";

const router = express.Router();

// Manager dashboard statistics
router.get(
  "/manager",
  authMiddleware,
  requireManager,
  dashboardController.getManagerDashboard
);

// Top selling dishes with pagination
router.get(
  "/manager/top-dishes",
  authMiddleware,
  requireManager,
  dashboardController.getTopSellingDishes
);

// Admin dashboard statistics (all branches)
router.get(
  "/admin",
  authMiddleware,
  requireAdmin,
  dashboardController.getAdminDashboard
);

// Admin top selling dishes (all branches, include inactive)
router.get(
  "/admin/top-dishes",
  authMiddleware,
  requireAdmin,
  dashboardController.getAdminTopSellingDishes
);

export default router;
