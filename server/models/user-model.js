import mongoose from "mongoose";
import { config } from "../config/env.js";
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      maxlength: 15,
    },
    coin: {
      type: Number,
      default: 0,
    },
    shipping_addresses: [
      {
        full_name: { type: String, required: true },
        phone: { type: String, required: true },
        street: String,
        ward: {
          code: { type: Number },
          name: { type: String },
        },
        district: {
          code: { type: Number },
          name: { type: String },
        },
        province: {
          code: { type: Number },
          name: { type: String },
        },
        full_address: String,
        coordinates: {
          latitude: { type: Number, default: null },
          longitude: { type: Number, default: null },
        },
        is_default: { type: Boolean, default: false },
      },
    ],
    role: {
      type: String,
      enum: ["customer", "manager", "admin"],
      default: "customer",
    },
    branch_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      default: null,
    },
    avatar: {
      type: String,
      default: null,
    },
    date_of_birth: {
      type: Date,
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
    },
    active: {
      type: Boolean,
      default: false,
    },
    ban_info: {
      status: {
        type: String,
        enum: ["banned_order"],
        default: null,
      },
      reason: {
        type: String,
        enum: ["cancel_order", "admin_ban"],
      },
      banned_until: Date,
      cancel_order_count: {
        type: Number,
        default: 0,
      },
      cancel_order_streak: {
        type: Number,
        default: 0,
      },
      ban_level: {
        type: Number,
        default: 0, // 0: no ban, 1: 3 days, 2: 7 days, 3: 30 days
      },
    },
    verifyOtp: {
      type: String,
      default: "",
    },
    verifyOtpExpireAt: {
      type: Number,
      default: 0,
    },
    last_login: {
      type: Date,
    },
    refresh_tokens: [
      {
        token: String,
        created_at: {
          type: Date,
          default: Date.now,
        },
        expires_at: Date,
        device_info: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Method

// Method cập nhật last login
userSchema.methods.updateLastLogin = function () {
  this.last_login = new Date();
  return this.save();
};
userSchema.methods.addRefreshToken = function (refreshToken, deviceInfo = "") {
  const expiresAt = new Date();

  // Parse refreshTokenLife: supports "7d", "7", "1d", etc.
  let daysToAdd = 7; // default
  const lifeStr = String(config.refreshTokenLife || "7").trim();

  if (lifeStr.endsWith("d")) {
    daysToAdd = parseInt(lifeStr) || 7;
  } else {
    daysToAdd = parseInt(lifeStr) || 7;
  }

  expiresAt.setDate(expiresAt.getDate() + daysToAdd);

  this.refresh_tokens.push({
    token: refreshToken,
    expires_at: expiresAt,
    device_info: deviceInfo,
  });

  // Giới hạn số lượng refresh token (tối đa 5 thiết bị)
  if (this.refresh_tokens.length > 5) {
    this.refresh_tokens = this.refresh_tokens.slice(-5);
  }

  return this.save();
};

// Method để xóa refresh token
userSchema.methods.removeRefreshToken = function (refreshToken) {
  this.refresh_tokens = this.refresh_tokens.filter(
    (item) => item.token !== refreshToken
  );
  return this.save();
};

// Method để xóa tất cả refresh token (logout all devices)
userSchema.methods.removeAllRefreshTokens = function () {
  this.refresh_tokens = [];
  return this.save();
};

// Method để kiểm tra xem tài khoản có bị khóa không
userSchema.methods.isBanned = function () {
  if (!this.ban_info || !this.ban_info.status) return { banned: false };

  const now = new Date();

  // Kiểm tra nếu đã hết thời gian khóa
  if (this.ban_info.banned_until) {
    if (now >= this.ban_info.banned_until) {
      // Hết thời gian khóa, tự động mở khóa
      this.ban_info.status = null;
      this.ban_info.reason = null;
      this.ban_info.banned_until = null;
      this.save();
      return { banned: false };
    }

    // Còn trong thời gian khóa
    return {
      banned: true,
      reason: this.ban_info.reason,
      banned_until: this.ban_info.banned_until,
      message: this.getBanMessage(),
    };
  }

  return { banned: false };
};

// Method để lấy thông báo khóa tài khoản
userSchema.methods.getBanMessage = function () {
  if (!this.ban_info || !this.ban_info.banned_until) {
    return "Tài khoản bị khóa.";
  }

  const timeRemaining = this.ban_info.banned_until - new Date();
  const hoursRemaining = Math.ceil(timeRemaining / (1000 * 60 * 60));
  const daysRemaining = Math.ceil(timeRemaining / (1000 * 60 * 60 * 24));

  switch (this.ban_info.reason) {
    case "cancel_order":
      if (daysRemaining > 1) {
        return `Tài khoản bị khóa do hủy đơn hàng liên tiếp. Vui lòng thử lại sau ${daysRemaining} ngày.`;
      }
      return `Tài khoản bị khóa do hủy đơn hàng liên tiếp. Vui lòng thử lại sau ${hoursRemaining} giờ.`;
    case "admin_ban":
      return "Tài khoản bị khóa bởi quản trị viên. Vui lòng liên hệ hỗ trợ.";
    default:
      return "Tài khoản bị khóa. Vui lòng liên hệ hỗ trợ.";
  }
};

// Method để xử lý hủy đơn hàng
userSchema.methods.handleCancelOrder = async function () {
  const now = new Date();

  // Khởi tạo ban_info nếu chưa có
  if (!this.ban_info) {
    this.ban_info = {
      status: null,
      cancel_order_count: 0,
      cancel_order_streak: 0,
      ban_level: 0,
    };
  }

  this.ban_info.cancel_order_count += 1;
  this.ban_info.cancel_order_streak += 1;

  // Hủy 5 đơn liên tiếp
  if (this.ban_info.cancel_order_streak >= 5) {
    this.ban_info.ban_level += 1;
    this.ban_info.status = "banned_order";
    this.ban_info.reason = "cancel_order";

    // Xác định thời gian khóa theo level
    let banDuration;
    switch (this.ban_info.ban_level) {
      case 1:
        banDuration = 3 * 24 * 60 * 60 * 1000; // 3 ngày
        break;
      case 2:
        banDuration = 7 * 24 * 60 * 60 * 1000; // 7 ngày
        break;
      default:
        banDuration = 30 * 24 * 60 * 60 * 1000; // 30 ngày
        break;
    }

    this.ban_info.banned_until = new Date(now.getTime() + banDuration);
    this.ban_info.cancel_order_streak = 0; // Reset streak sau khi khóa
  }

  return this.save();
};

// Method để reset cancel order streak khi có đơn thành công
userSchema.methods.resetCancelOrderStreak = async function () {
  if (!this.ban_info) {
    this.ban_info = {
      status: null,
      cancel_order_count: 0,
      cancel_order_streak: 0,
      ban_level: 0,
    };
  }

  this.ban_info.cancel_order_streak = 0;
  // Reset ban level về 0 khi có đơn thành công
  this.ban_info.ban_level = 0;
  return this.save();
};

const User = mongoose.model("User", userSchema);
export default User;
