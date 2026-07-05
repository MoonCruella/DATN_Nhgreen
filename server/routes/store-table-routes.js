import express from "express";
import {
  createStoreTable,
  deleteStoreTable,
  getStoreTableById,
  getStoreTables,
  transferStoreTableOrder,
  updateStoreTable,
} from "../controllers/store-table-controller.js";
import { authMiddleware } from "../middleware/auth-middleware.js";
import response from "../helpers/response.js";

const router = express.Router();

const requireAdminOrManager = (req, res, next) => {
  if (req.user.role !== "admin" && req.user.role !== "manager") {
    return response.sendError(
      res,
      "Không có quyền truy cập. Cần role admin hoặc manager",
      403
    );
  }

  next();
};

router.use(authMiddleware, requireAdminOrManager);

router.post("/", createStoreTable);
router.get("/", getStoreTables);
router.get("/:id", getStoreTableById);
router.post("/:id/transfer", transferStoreTableOrder);
router.put("/:id", updateStoreTable);
router.delete("/:id", deleteStoreTable);

export default router;
