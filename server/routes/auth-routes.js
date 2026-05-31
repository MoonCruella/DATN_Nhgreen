import express from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  updatePassword,
  refreshToken,
} from "../controllers/auth-controller.js";
import {
  resendOtpRegister,
  sendOtpForgotPass,
  verifyOtpForgot,
  verifyOtpRegister,
} from "../controllers/otp-controller.js";
import { authMiddleware } from "../middleware/auth-middleware.js";
const router = express.Router();

router.post("/register", registerUser);
router.post("/register/resend-otp", resendOtpRegister);
router.post("/register/verify-otp", verifyOtpRegister);
router.post("/login", loginUser);
router.post("/logout", authMiddleware, logoutUser);

//Forgot Password
router.post("/forgot-password/send-otp", sendOtpForgotPass);
router.post("/forgot-password/verify-otp", verifyOtpForgot);
router.post("/forgot-password/reset", updatePassword);

router.post("/refresh-token", refreshToken);

export default router;
