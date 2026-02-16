import redisClient from "../config/redisClient.js";
import sendMail from "../config/nodemailer.js";
import crypto from "crypto";
import User from "../models/user-model.js";

export const resendOtpRegister = async (req, res) => {
  try {
    //const { email, userName } = req.body;
    const { email } = req.body;
    if (!email)
      return res.json({ success: false, message: "Email is required" });

    // Kiểm tra user tồn tại
    const user = await User.findOne({ email });
    if (!user) {
      return res.json({ success: false, message: "Tài khoản không tồn tại!" });
    }

    // Kiểm tra user đã active chưa
    if (user.active) {
      return res.json({
        success: false,
        message: "Tài khoản đã được kích hoạt rồi",
      });
    }

    // Check giới hạn resend OTP
    const limitKey = `otp:limit:${email}`;
    if (await redisClient.get(limitKey)) {
      return res.status(429).json({
        success: false,
        message: "Vui lòng chờ 1 phút trước khi gửi lại OTP!",
      });
    }
    await redisClient.setEx(limitKey, 60, "true"); // lock resend 60s

    // Tạo OTP
    const otp = crypto.randomInt(100000, 999999).toString();

    // Xóa OTP cũ và lưu OTP mới
    await redisClient.del(`otp:register:${email}`);
    await redisClient.setEx(`otp:register:${email}`, 120, otp);

    // Gửi OTP qua email
    await sendMail(
      email,
      "Mã OTP tái kích hoạt",
      `Mã OTP tái kích hoạt của bạn: ${otp}`
    );

    return res
      .status(200)
      .json({ success: true, message: "OTP đã được gửi về email của bạn!" });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ success: false, message: "Gửi OTP thất bại" });
  }
};

// Xác thực OTP cho Register
export const verifyOtpRegister = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const savedOtp = await redisClient.get(`otp:register:${email}`);
    if (!savedOtp) {
      return res.json({
        success: false,
        message: "OTP hết hạn hoặc không tồn tại!",
      });
    }

    if (savedOtp !== otp) {
      return res.json({ success: false, message: "OTP không hợp lệ" });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.json({ success: false, message: "Không tìm thấy user" });
    }

    // Cập nhật user thành active
    await User.findOneAndUpdate({ email }, { active: true });

    // Xóa OTP
    await redisClient.del(`otp:register:${email}`);

    return res.status(200).json({
      success: true,
      message: "Xác thực OTP thành công, tài khoản đã kích hoạt!",
    });
  } catch (err) {
    console.error(err);
    return res.json({
      success: false,
      message: "Xác thực OTP thất bại!",
    });
  }
};

// Gửi OTP cho ForgotPassword
export const sendOtpForgotPass = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email)
      return res.json({
        success: false,
        message: "Email is required!",
      });

    const user = await User.findOne({ email });
    if (!user)
      return res.json({
        success: false,
        message: "Email không tồn tại!",
      });

    const limitKey = `otp:limit:${email}`;
    if (await redisClient.get(limitKey))
      return res.status(429).json({
        success: false,
        message: "Vui lòng chờ 1 phút trước khi gửi lại OTP!",
      });
    await redisClient.setEx(limitKey, 60, "true");

    const otp = crypto.randomInt(100000, 999999).toString();

    // Xóa OTP cũ và lưu OTP mới
    await redisClient.del(`otp:forgot:${email}`);
    await redisClient.setEx(`otp:forgot:${email}`, 120, otp);
    await redisClient.setEx(limitKey, 60, "true"); // lock resend 60s

    // Gửi OTP qua email
    await sendMail(
      email,
      "Mã OTP tái kích hoạt",
      `Mã OTP tái kích hoạt của bạn: ${otp}`
    );

    return res.status(200).json({
      success: true,
      message: "OTP đã được gửi về email của bạn!",
    });
  } catch (err) {
    console.error(err);
    return res.json({
      success: false,
      message: "Gửi OTP thất bại, vui lòng thử lại!",
    });
  }
};

// Xác thực OTP cho Forgot Password
export const verifyOtpForgot = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.json({
        success: false,
        message: "Email và OTP là bắt buộc!",
      });
    }

    const savedOtp = await redisClient.get(`otp:forgot:${email}`);
    if (!savedOtp) {
      return res.json({
        success: false,
        message: "OTP hết hạn hoặc không tồn tại!",
      });
    }

    if (savedOtp !== otp) {
      return res.json({
        success: false,
        message: "OTP không hợp lệ!",
      });
    }

    // Xóa OTP sau khi verify
    await redisClient.del(`otp:forgot:${email}`);

    // Lưu trạng thái đã verify (TTL 10 phút)
    await redisClient.setEx(`verified:forgot:${email}`, 600, "true");

    return res.status(200).json({
      success: true,
      message: "Xác thực OTP thành công!",
    });
  } catch (err) {
    console.error(err);
    return res.json({
      success: false,
      message: "Xác thực OTP thất bại!",
    });
  }
};
