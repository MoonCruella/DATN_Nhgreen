import express from "express";
import {
  createDineInCustomer,
  getDineInCustomerByPhone,
} from "../controllers/dinein-customer-controller.js";
import {
  authMiddleware,
  requireAdminOrManager,
} from "../middleware/auth-middleware.js";

const router = express.Router();

router.get(
  "/phone/:phone",
  authMiddleware,
  requireAdminOrManager,
  getDineInCustomerByPhone
);

router.post("/", authMiddleware, requireAdminOrManager, createDineInCustomer);

export default router;
