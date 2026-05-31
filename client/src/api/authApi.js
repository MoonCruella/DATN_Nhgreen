import { axiosPublic, axiosPrivate } from "./axios";
// PUBLIC API
// REGISTER, LOGIN, REFRESH TOKEN Methods
export const registerUserApi = async (formData) => {
  const res = await axiosPublic.post("/api/auth/register", formData);
  return res.data;
};

export const loginUserApi = async (formData) => {
  const res = await axiosPublic.post("/api/auth/login", formData);
  return res.data;
};

export const refreshAccessTokenApi = async () => {
  // Use axiosPublic (no auth interceptors) to call refresh endpoint
  const res = await axiosPublic.post("/api/auth/refresh-token");
  console.log("refreshed token:", res.data);
  return res.data;
};

// OTP Methods
export const resendOtpRegister = async (email) => {
  return await axiosPublic.post("/api/auth/register/resend-otp", { email });
};

export const verifyOtpRegister = async (email, otp) => {
  return await axiosPublic.post("/api/auth/register/verify-otp", {
    email,
    otp,
  });
};

export const sendOtpForgotPassword = async (email) => {
  return await axiosPublic.post("/api/auth/forgot-password/send-otp", {
    email,
  });
};

export const verifyOtpForgotPassword = async (email, otp) => {
  return await axiosPublic.post("/api/auth/forgot-password/verify-otp", {
    email,
    otp,
  });
};

export const resetPassword = async (email, newPassword) => {
  return await axiosPublic.post("/api/auth/forgot-password/reset", {
    email,
    newPassword,
  });
};

// PRIVATE API
// LOGOUT User
export const logoutUserApi = async (accessToken) => {
  const res = await axiosPrivate.post(
    "/api/auth/logout",
    {},
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  return res.data;
};

// CHANGE PASSWORD
export const changePassword = async (accessToken, data) => {
  const res = await axiosPrivate.put("/api/users/password", data, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.data;
};

const authApi = {
  changePassword,
  logoutUserApi,
  refreshAccessTokenApi,
  loginUserApi,
  registerUserApi,
  resendOtpRegister,
  verifyOtpRegister,
  sendOtpForgotPassword,
  verifyOtpForgotPassword,
  resetPassword,
};

export default authApi;
