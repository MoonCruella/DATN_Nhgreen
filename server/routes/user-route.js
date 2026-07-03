import express from "express";
import {
  getMyProfile,
  updateMyProfile,
  updatePassword,
  getUsers,
  getUserByEmail,
  getUserList,
  getUserProfile,
  updateUserProfile,
  deleteUser,
  toggleUserStatus,
  getUserStats,
  banUser,
  unbanUser,
} from "../controllers/user-controller.js";
import {
  authMiddleware,
  requireAdmin,
} from "../middleware/auth-middleware.js";
import { upload } from "./upload-routes.js";

const router = express.Router();

// Current user routes
router.get("/profile", authMiddleware, getMyProfile);

router.put(
  "/profile",
  authMiddleware,
  upload.single("avatar"),
  updateMyProfile
);

router.put("/password", authMiddleware, updatePassword);

router.put(
  "/profile/update",
  authMiddleware,
  upload.single("avatar"),
  updateMyProfile
);

// Admin routes
router.get("/admin/stats", authMiddleware, requireAdmin, getUserStats);

router.get("/admin/list", authMiddleware, requireAdmin, getUserList);

router.get("/admin/all", authMiddleware, requireAdmin, getUsers);


router.get("/admin/email/:email", authMiddleware, requireAdmin, getUserByEmail);

router.patch(
  "/admin/toggle-status/:userId",
  authMiddleware,
  requireAdmin,
  toggleUserStatus
);

router.delete("/admin/:userId", authMiddleware, requireAdmin, deleteUser);

router.post("/admin/ban/:userId", authMiddleware, requireAdmin, banUser);

router.post("/admin/unban/:userId", authMiddleware, requireAdmin, unbanUser);

// Protected routes (owner or admin)
router.get("/profile/:userId", authMiddleware, getUserProfile);

router.put("/profile/:userId", authMiddleware, updateUserProfile);

// Fallback route
router.get("/", authMiddleware, getUsers);

export default router;
