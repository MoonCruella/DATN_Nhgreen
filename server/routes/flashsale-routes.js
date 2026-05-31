import express from "express";
import flashsaleController from "../controllers/flashsale-controller.js";
import { authMiddleware, requireAdmin } from "../middleware/auth-middleware.js";

const router = express.Router();

// Public routes
router.get("/", flashsaleController.listFlashSales);
router.get("/active", flashsaleController.getActiveFlashSales);
router.get("/nearest", flashsaleController.getNearestFlashSale);
router.get("/:id", flashsaleController.getFlashSale);
router.get("/:id/statistics", flashsaleController.getFlashSaleStatistics);

// Admin routes - require auth
router.post(
  "/",
  authMiddleware,
  requireAdmin,
  flashsaleController.createFlashSale
);
router.put(
  "/:id",
  authMiddleware,
  requireAdmin,
  flashsaleController.updateFlashSale
);
router.delete(
  "/:id",
  authMiddleware,
  requireAdmin,
  flashsaleController.deleteFlashSale
);
router.post(
  "/:id/sold",
  authMiddleware,
  flashsaleController.updateFlashSaleSold
);

export default router;
