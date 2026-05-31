import express from "express";
import {
  createPayment,
  ipn,
  momoReturn,
} from "../controllers/momo-controller.js";

const router = express.Router();

router.post("/payment", createPayment);
router.post("/ipn", ipn);
router.get("/return", momoReturn);

export default router;
