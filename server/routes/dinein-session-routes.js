import express from "express";
import {
  createDineInSession,
  getDineInActiveOrder,
  getDineInOrderStatus,
  getDineInSession,
  requestDineInCashPayment,
  scanDineInQr,
  updateDineInSessionCart,
} from "../controllers/dinein-session-controller.js";

const router = express.Router();

router.get("/scan/:qrToken", scanDineInQr);
router.post("/sessions", createDineInSession);
router.get("/sessions/:sessionToken", getDineInSession);
router.get("/sessions/:sessionToken/active-order", getDineInActiveOrder);
router.get("/sessions/:sessionToken/orders/:orderId/status", getDineInOrderStatus);
router.post(
  "/sessions/:sessionToken/orders/:orderId/request-cash-payment",
  requestDineInCashPayment
);
router.put("/sessions/:sessionToken/cart", updateDineInSessionCart);

export default router;
