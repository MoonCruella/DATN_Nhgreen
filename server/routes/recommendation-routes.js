import express from "express";
import { getFamiliarDishesForCurrentUser } from "../controllers/recommendation-controller.js";
import { authMiddleware } from "../middleware/auth-middleware.js";

const router = express.Router();

router.get("/familiar/me", authMiddleware, getFamiliarDishesForCurrentUser);

export default router;
