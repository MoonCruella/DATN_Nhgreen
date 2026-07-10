import bcrypt from "bcryptjs";
import User from "../models/user-model.js";
import redisClient from "../config/redisClient.js";
import sendMail from "../config/nodemailer.js";
import crypto from "crypto";
import {
  generateTokenPair,
  generateAccessToken,
  verifyRefreshToken,
} from "../utils/jwt.js";

const isProduction =
  process.env.NODE_ENV === "production" || process.env.RENDER === "true";

const refreshCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  maxAge: 1 * 60 * 60 * 1000,
};

const clearRefreshCookieOptions = {
  httpOnly: refreshCookieOptions.httpOnly,
  secure: refreshCookieOptions.secure,
  sameSite: refreshCookieOptions.sameSite,
};

// Gửi OTP đến email
const sendOtpToEmail = async (email) => {
  try {
    const otp = crypto.randomInt(100000, 999999).toString();

    // Lưu OTP vào Redis với TTL 120s
    await redisClient.setEx(`otp:register:${email}`, 120, otp);
    await sendMail(email, "Mã OTP đăng ký", `Mã OTP đăng ký của bạn: ${otp}`);
    return { success: true };
  } catch (error) {
    console.error("Send OTP error:", error);
    return { success: false, error };
  }
};

// Register
const registerUser = async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const checkUser = await User.findOne({ email });
    if (checkUser) {
      return res.json({
        success: false,
        message: "Email đã tồn tại, vui lòng sử dụng email khác",
      });
    }
    const hashedPassword = await bcrypt.hash(password, 12);
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
    });
    const createdUser = await User.create(newUser);
    if (!createdUser) {
      return res.json({
        success: false,
        message: "Tạo người dùng thất bại!",
      });
    }

    // Gửi OTP
    const otpResult = await sendOtpToEmail(email);

    if (otpResult.success) {
      return res.status(200).json({
        success: true,
        message:
          "User created successfully. Please check your email for OTP verification.",
        user: createdUser,
      });
    } else {
      return res.json({
        success: false,
        message: "User created successfully but email send failed! Try again!",
        user: createdUser,
      });
    }
  } catch (e) {
    console.log(e);
    res.status(500).json({
      success: false,
      message: "Lỗi server, vui lòng thử lại sau",
    });
  }
};

// Login
const loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    const checkUser = await User.findOne({ email });
    if (!checkUser) {
      return res.json({
        success: false,
        message: "Tài khoản không tồn tại!",
      });
    }

    // Kiểm tra tài khoản có bị khóa không
    const banStatus = checkUser.isBanned();
    if (banStatus.banned) {
      return res.json({
        success: false,
        message: banStatus.message,
        banned: true,
        banned_until: banStatus.banned_until,
        ban_reason: banStatus.reason,
      });
    }

    // Kiểm tra xem user đã verify OTP chưa (kiểm tra trước khi check password)
    if (checkUser.disabled) {
      return res.json({
        success: false,
        disabled: true,
        message: "Tai khoan da bi vo hieu hoa. Vui long lien he quan tri vien.",
      });
    }

    if (!checkUser.active) {
      // Gửi lại OTP nếu chưa verify
      const otpResult = await sendOtpToEmail(email);

      return res.json({
        success: false,
        requireOtp: true,
        email: email,
        message:
          "Tài khoản chưa được xác thực. Vui lòng kiểm tra email để nhận mã OTP.",
      });
    }

    const checkPasswordMatch = await bcrypt.compare(
      password,
      checkUser.password
    );

    if (!checkPasswordMatch) {
      return res.json({
        success: false,
        message: "Mật khẩu không đúng!",
      });
    }

    const payload = {
      userId: checkUser._id,
      email: checkUser.email,
      role: checkUser.role,
      coin: checkUser.coin,
      name: checkUser.name,
      active: checkUser.active,
      disabled: checkUser.disabled,
      address: checkUser.address,
      phone: checkUser.phone,
      gender: checkUser.gender,
      date_of_birth: checkUser.date_of_birth,
      avatar: checkUser.avatar,
      branch_id: checkUser.branch_id,
    };
    const { accessToken, refreshToken } = generateTokenPair(payload);
    // Lưu refresh token vào database
    const userDoc = await User.findById(checkUser._id);
    const deviceInfo = req.get("User-Agent") || "Unknown Device";
    await userDoc.addRefreshToken(refreshToken, deviceInfo);

    // Cập nhật last login
    await userDoc.updateLastLogin();
    res
      .status(200)
      .cookie("refreshToken", refreshToken, refreshCookieOptions)
      .json({
        success: true,
        message: "Đăng nhập thành công!",
        user: {
          _id: checkUser._id,
          userId: checkUser._id,
          email: checkUser.email,
          role: checkUser.role,
          coin: checkUser.coin,
          name: checkUser.name,
          active: checkUser.active,
          disabled: checkUser.disabled,
          address: checkUser.address,
          phone: checkUser.phone,
          gender: checkUser.gender,
          date_of_birth: checkUser.date_of_birth,
          avatar: checkUser.avatar,
          branch_id: checkUser.branch_id,
        },
        accessToken,
        refreshToken,
      });
  } catch (e) {
    console.log(e);
    res.status(500).json({
      success: false,
      message: "Lỗi server, vui lòng thử lại sau!",
    });
  }
};

// Logout
const logoutUser = (req, res) => {
  res.clearCookie("refreshToken", clearRefreshCookieOptions).json({
    success: true,
    message: "Đăng xuất thành công!",
  });
};

// Refresh Token
const refreshToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res
        .status(400)
        .json({ success: false, message: "Refresh token không được cung cấp" });
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    // Tìm user
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "User không tồn tại" });
    }

    // Kiểm tra refresh token có trong database không
    if (user.disabled) {
      return res.status(403).json({
        success: false,
        disabled: true,
        message: "Tai khoan da bi vo hieu hoa. Vui long lien he quan tri vien.",
      });
    }

    const tokenExists = user.refresh_tokens.find(
      (item) => item.token === refreshToken
    );
    if (!tokenExists) {
      return res
        .status(401)
        .json({ success: false, message: "Refresh token không hợp lệ" });
    }

    // Kiểm tra token hết hạn
    if (new Date() > tokenExists.expires_at) {
      await user.removeRefreshToken(refreshToken);
      return res
        .status(401)
        .json({ success: false, message: "Refresh token đã hết hạn" });
    }

    // Generate new tokens
    const payload = {
      userId: user._id,
      email: user.email,
      role: user.role,
      coin: user.coin,
      name: user.name,
      active: user.active,
      disabled: user.disabled,
      address: user.address,
      phone: user.phone,
      gender: user.gender,
      date_of_birth: user.date_of_birth,
      avatar: user.avatar,
      branch_id: user.branch_id,
    };

    const accessToken = generateAccessToken(payload);

    return res
      .status(200)
      .cookie("refreshToken", refreshToken, refreshCookieOptions)
      .json({
        success: true,
        message: "Token đã được làm mới",
        user: {
          _id: user._id,
          userId: user._id,
          email: user.email,
          role: user.role,
          coin: user.coin,
          name: user.name,
          active: user.active,
          disabled: user.disabled,
          address: user.address,
          phone: user.phone,
          gender: user.gender,
          date_of_birth: user.date_of_birth,
          avatar: user.avatar,
          branch_id: user.branch_id,
        },
        accessToken: accessToken,
      });
  } catch (error) {
    console.error("Refresh token error:", error);
    return res.status(401).json({
      success: false,
      message: "Refresh token không hợp lệ",
      error: error.message,
    });
  }
};

// Update user password
const updatePassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    if (!newPassword) {
      return res.status(400).json({
        success: false,
        message: "New password is required",
      });
    }

    // Dùng User thay vì User
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Người dùng không tồn tại",
      });
    }

    // Kiểm tra OTP đã được verify chưa
    const isVerified = await redisClient.get(`verified:forgot:${email}`);
    if (!isVerified) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng verify OTP trước khi reset password",
      });
    }

    // Hash mật khẩu mới
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    // Xóa cache OTP đã verify
    await redisClient.del(`verified:forgot:${email}`);

    return res.status(200).json({
      success: true,
      message: "Đặt lại mật khẩu thành công",
    });
  } catch (err) {
    console.error("Reset password error:", err);
    return res.status(500).json({
      success: false,
      message: "Reset mật khẩu thất bại",
      error: err.message,
    });
  }
};

export { registerUser, loginUser, logoutUser, updatePassword, refreshToken };
