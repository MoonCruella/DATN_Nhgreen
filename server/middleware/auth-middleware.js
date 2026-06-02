import { config } from "../config/env.js";
import jwt from "jsonwebtoken";
import { verifyAccessToken } from "../utils/jwt.js";
import User from "../models/user-model.js";
import response from "../helpers/response.js";

//auth middleware
const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token)
    return res.status(401).json({
      success: false,
      message: "Unauthorized user!",
    });

  try {
    const decoded = jwt.verify(token, config.accessTokenKey);

    // Kiểm tra trạng thái ban của user
    const user = await User.findById(decoded.userId);
    if (user) {
      const banStatus = user.isBanned();
      if (banStatus.banned) {
        return res.status(403).json({
          success: false,
          message: banStatus.message,
          banned: true,
          banned_until: banStatus.banned_until,
          ban_reason: banStatus.reason,
        });
      }
    }

    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Unauthorized user!",
    });
  }
};
const requireAdmin = async (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      return response.sendError(
        res,
        "Không có quyền truy cập. Cần role admin",
        403
      );
    }
    next();
  } catch (error) {
    return response.sendError(
      res,
      "Lỗi kiểm tra quyền admin",
      500,
      error.message
    );
  }
};
const requireManager = async (req, res, next) => {
  try {
    if (req.user.role !== "manager") {
      return response.sendError(
        res,
        "Không có quyền truy cập. Cần role manager",
        403
      );
    }
    next();
  } catch (error) {
    return response.sendError(
      res,
      "Lỗi kiểm tra quyền manager",
      500,
      error.message
    );
  }
};

const requireAdminOrManager = async (req, res, next) => {
  try {
    if (!["admin", "manager"].includes(req.user.role)) {
      return response.sendError(
        res,
        "Không có quyền truy cập. Cần role admin hoặc manager",
        403
      );
    }
    next();
  } catch (error) {
    return response.sendError(
      res,
      "Lỗi kiểm tra quyền truy cập",
      500,
      error.message
    );
  }
};

const checkAuthOptional = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (token) {
      try {
        const decoded = verifyAccessToken(token);
        const user = await User.findById(decoded.userId);
        if (user && user.active) {
          req.user = {
            ...decoded,
            email: user.email,
            role: user.role,
            name: user.name,
            avatar: user.avatar,
          };
        }
      } catch (tokenError) {
        console.log("Optional auth token error:", tokenError.message);
      }
    }

    next();
  } catch (error) {
    // Không block request nếu có lỗi
    next();
  }
};
export {
  authMiddleware,
  requireAdmin,
  requireManager,
  requireAdminOrManager,
  checkAuthOptional,
};
