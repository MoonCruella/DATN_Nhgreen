import express from "express";
import {
  createBranch,
  getBranches,
  getBranchById,
  updateBranch,
  deleteBranch,
  getBranchDishes,
  updateBranchDishStatus,
  checkDishesAvailability,
  calculateBranchShippingFee,
  createBranchManager,
  getBranchManagers,
} from "../controllers/branch-controller.js";
import {
  authMiddleware,
  requireAdmin,
  requireManager,
} from "../middleware/auth-middleware.js";
const router = express.Router();

// Tạo mới branch
router.post("/", authMiddleware, requireAdmin, createBranch);

// Lấy danh sách tất cả branch
router.get("/", getBranches);

// Lấy chi tiết 1 branch theo ID
router.get("/:id", getBranchById);

// Lấy danh sách manager của chi nhánh
router.get("/:id/managers", authMiddleware, requireAdmin, getBranchManagers);

// Lấy danh sách món ăn của chi nhánh với trạng thái
router.get("/:id/dishes", getBranchDishes);

// Kiểm tra tính khả dụng của các món trong giỏ hàng
router.post("/:id/dishes/check-availability", checkDishesAvailability);

// Tính phí giao hàng GHN theo chi nhánh và địa chỉ nhận
router.post("/:id/shipping-fee", calculateBranchShippingFee);

// Tạo tài khoản manager cho chi nhánh
router.post(
  "/:id/create-manager",
  authMiddleware,
  requireAdmin,
  createBranchManager
);

// Cập nhật trạng thái món ăn tại chi nhánh (Manager only)
router.put(
  "/:id/dishes/:dishId/status",
  authMiddleware,
  requireManager,
  updateBranchDishStatus
);

// Cập nhật branch theo ID
router.put("/:id", authMiddleware, requireAdmin, updateBranch);

// Xóa branch theo ID
router.delete("/:id", authMiddleware, deleteBranch);

export default router;
