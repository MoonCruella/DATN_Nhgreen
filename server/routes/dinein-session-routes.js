import express from "express";
import {
  createDineInSession,
  getDineInSession,
  scanDineInQr,
  updateDineInSessionCart,
} from "../controllers/dinein-session-controller.js";

const router = express.Router();

router.get("/scan/:qrToken", scanDineInQr);
router.post("/sessions", createDineInSession);
router.get("/sessions/:sessionToken", getDineInSession);
router.put("/sessions/:sessionToken/cart", updateDineInSessionCart);

export default router;
