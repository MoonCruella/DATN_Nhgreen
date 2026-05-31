import { loginUser, registerUser } from "@/store/auth-slice";
import {
  verifyOtpRegister,
  resendOtpRegister,
  sendOtpForgotPassword,
  verifyOtpForgotPassword,
  resetPassword,
} from "@/api/authApi";
import { useState, useRef, useEffect } from "react";
import { useDispatch } from "react-redux";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import BanDialog from "@/components/common/BanDialog";
const AuthPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isActive, setIsActive] = useState(
    location.pathname === "/auth/register"
  );
  const [isLoading, setIsLoading] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otpEmail, setOtpEmail] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordStep, setForgotPasswordStep] = useState(1); // 1: Email, 2: OTP, 3: Reset Password
  const [forgotEmail, setForgotEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const inputsRef = useRef([]);
  const forgotOtpInputsRef = useRef([]);
  const dispatch = useDispatch();

  // Handle toggle with URL update
  const handleToggle = (newState) => {
    setIsActive(newState);
    setTimeout(() => {
      navigate(newState ? "/auth/register" : "/auth/login", { replace: true });
    }, 1700);
  };

  // Login form state
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });

  // Login validation errors
  const [loginErrors, setLoginErrors] = useState({
    email: "",
    credentials: "",
  });

  // Register validation errors
  const [registerErrors, setRegisterErrors] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });

  // Forgot password validation errors
  const [forgotPasswordErrors, setForgotPasswordErrors] = useState({
    email: "",
    otp: "",
    password: "",
    confirmPassword: "",
  });

  // Email validation
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      return "Email không được để trống";
    }
    if (email.length > 100) {
      return "Email không được vượt quá 100 ký tự";
    }
    if (!emailRegex.test(email)) {
      return "Email không đúng định dạng";
    }
    return "";
  };

  // Password validation
  const validatePassword = (password) => {
    if (!password) {
      return "Mật khẩu không được để trống";
    }
    if (password.length < 8) {
      return "Mật khẩu phải có ít nhất 8 ký tự";
    }
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!hasLower || !hasUpper || !hasNumber || !hasSpecial) {
      return "Mật khẩu phải có ít nhất 8 ký tự bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt";
    }
    return "";
  };

  // Register form state
  const [registerData, setRegisterData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  // OTP state
  const [otpCode, setOtpCode] = useState(["", "", "", "", "", ""]);
  const [forgotOtpCode, setForgotOtpCode] = useState(["", "", "", "", "", ""]);

  // Ban countdown state
  const [banCountdown, setBanCountdown] = useState(null);
  const [remainingAttempts, setRemainingAttempts] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState("");
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [banInfo, setBanInfo] = useState(null);

  const [failedLoginCount, setFailedLoginCount] = useState(0);

  // Countdown timer effect
  useEffect(() => {
    if (!banCountdown) {
      setTimeRemaining("");
      return;
    }

    const updateCountdown = () => {
      const now = new Date();
      const diff = banCountdown - now;

      if (diff <= 0) {
        setBanCountdown(null);
        setTimeRemaining("");
        setLoginErrors({ email: "", credentials: "" });
        setBanDialogOpen(false);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 24) {
        const days = Math.floor(hours / 24);
        const remainingHours = hours % 24;
        setTimeRemaining(`${days} ngày ${remainingHours} giờ`);
      } else if (hours > 0) {
        setTimeRemaining(`${hours} giờ ${minutes} phút`);
      } else {
        setTimeRemaining(`${minutes} phút ${seconds} giây`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [banCountdown]);

  // Handle Login
  async function handleLogin(event) {
    event.preventDefault();

    // Validate email only
    const emailError = validateEmail(loginData.email);

    setLoginErrors({
      email: emailError,
      credentials: "",
    });

    // If there are validation errors, stop submission
    if (emailError) {
      return;
    }

    try {
      setIsLoading(true);
      const data = await dispatch(
        loginUser({
          ...loginData,
        })
      );

      if (data?.payload?.success) {
        toast.success("Đăng nhập thành công!");
        setBanCountdown(null);
        setRemainingAttempts(null);
        setFailedLoginCount(0);
      } else if (data?.payload?.requireOtp) {
        // Nếu cần verify OTP - chuyển thẳng sang OTP form
        toast.warning(data?.payload?.message || "Vui lòng xác thực OTP!");
        setOtpEmail(data.payload.email);

        // Nếu đang ở login form, chuyển sang register tab và hiện OTP luôn
        if (!isActive) {
          setIsActive(true); // Chuyển sang tab register
          setShowOtp(true); // Hiện OTP form ngay lập tức
        } else {
          // Nếu đã ở register tab rồi thì hiện OTP luôn
          setShowOtp(true);
        }
        // Đổi URL sau khi animation xong
        setTimeout(() => {
          window.history.replaceState(null, "", "/auth/verify-otp");
        }, 700);
      } else if (data?.payload?.banned) {
        // Handle banned account - show dialog
        const bannedUntil = new Date(data.payload.banned_until);
        setBanCountdown(bannedUntil);
        setRemainingAttempts(null);

        // Show ban dialog
        setBanInfo({
          banned_until: bannedUntil,
          reason: data.payload.ban_reason || "login_failed",
        });
        setBanDialogOpen(true);

        setLoginErrors({
          email: "",
          credentials: data.payload.message || "Tài khoản đã bị khóa tạm thời",
        });
      } else {
        // Handle failed login
        const newFailedCount = failedLoginCount + 1;
        setFailedLoginCount(newFailedCount);

        setLoginErrors({
          email: "",
          credentials:
            data?.payload?.message || "Tài khoản hoặc mật khẩu không đúng",
        });
      }
    } catch (error) {
      setLoginErrors({
        email: "",
        credentials: "Tài khoản hoặc mật khẩu không đúng",
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Handle Register
  async function handleRegister(event) {
    event.preventDefault();

    // Validate email and password
    const emailError = validateEmail(registerData.email);
    const passwordError = validatePassword(registerData.password);
    const confirmPasswordError =
      registerData.password !== registerData.confirmPassword
        ? "Mật khẩu xác nhận không khớp"
        : "";

    setRegisterErrors({
      email: emailError,
      password: passwordError,
      confirmPassword: confirmPasswordError,
    });

    // If there are validation errors, stop submission
    if (emailError || passwordError || confirmPasswordError) {
      return;
    }

    try {
      setRegisterLoading(true);
      const data = await dispatch(registerUser(registerData));

      if (data?.payload?.success === true) {
        const email = registerData.email;
        setOtpEmail(email);
        toast.success("Đăng ký thành công! Vui lòng xác thực OTP.");
        setRegisterLoading(false);
        setShowOtp(true);
        // Đổi URL sau khi animation xong (700ms)
        setTimeout(() => {
          window.history.replaceState(null, "", "/auth/verify-otp");
        }, 700);
      } else {
        // Show inline error for email already exists
        setRegisterErrors({
          email: data?.payload?.message || "Email đã tồn tại trong hệ thống",
          password: "",
          confirmPassword: "",
        });
        setRegisterLoading(false);
      }
    } catch (error) {
      console.error("Register error:", error);
      setRegisterErrors({
        email: "Email đã tồn tại trong hệ thống",
        password: "",
        confirmPassword: "",
      });
      setRegisterLoading(false);
    }
  }

  // Handle OTP Input
  const handleOtpChange = (index, value) => {
    if (/^[0-9]$/.test(value) || value === "") {
      const newOtp = [...otpCode];
      newOtp[index] = value;
      setOtpCode(newOtp);

      // Auto focus next input
      if (value !== "" && index < 5) {
        inputsRef.current[index + 1]?.focus();
      }
    }
  };

  // Handle OTP Backspace
  const handleOtpKeyDown = (e, index) => {
    if (e.key === "Backspace" && !otpCode[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  // Handle OTP Submit
  async function handleOtpSubmit(event) {
    event.preventDefault();
    const code = otpCode.join("");
    if (code.length !== 6) {
      toast.error("Vui lòng nhập đầy đủ mã OTP!");
      return;
    }

    try {
      setIsLoading(true);
      const res = await verifyOtpRegister(otpEmail, code);

      if (res.data.success) {
        toast.success(res.data.message || "Xác thực thành công!");
        setShowOtp(false);
        setOtpCode(["", "", "", "", "", ""]);
        setRegisterData({ name: "", email: "", password: "" });
        handleToggle(false); // Switch to login form
      } else {
        toast.error(res.data.message || "Xác thực OTP thất bại");
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Mã OTP không chính xác!");
    } finally {
      setIsLoading(false);
    }
  }

  // Handle Resend OTP
  async function handleResendOtp() {
    try {
      setIsLoading(true);
      const res = await resendOtpRegister(otpEmail);

      if (res.data.success) {
        toast.success(res.data.message || "Đã gửi lại mã OTP!");
        setOtpCode(["", "", "", "", "", ""]); // Reset OTP inputs
      } else {
        toast.error(res.data.message || "Không thể gửi lại OTP");
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Có lỗi xảy ra!");
    } finally {
      setIsLoading(false);
    }
  }

  // Handle Forgot Password Click
  const handleForgotPasswordClick = () => {
    setShowForgotPassword(true);
    setForgotPasswordStep(1);
    setIsActive(true); // Chuyển sang bên phải
    setTimeout(() => {
      window.history.replaceState(null, "", "/auth/forgot-password");
    }, 700);
  };

  // Handle Send Forgot Password OTP
  const handleSendForgotPasswordOtp = async (e) => {
    e.preventDefault();
    const emailSchema = z.string().email("Email không hợp lệ");
    try {
      emailSchema.parse(forgotEmail);
      setForgotPasswordErrors({
        email: "",
        otp: "",
        password: "",
        confirmPassword: "",
      });
      setIsLoading(true);
      const res = await sendOtpForgotPassword(forgotEmail);
      setIsLoading(false);

      if (res.data.success) {
        toast.success(res.data.message);
        setForgotPasswordStep(2);
        setTimeout(() => {
          window.history.replaceState(null, "", "/auth/verify-otp");
        }, 700);
      } else {
        setForgotPasswordErrors({
          ...forgotPasswordErrors,
          email: res.data.message || "Không tìm thấy tài khoản",
        });
      }
    } catch (error) {
      setIsLoading(false);
      if (error instanceof z.ZodError) {
        setForgotPasswordErrors({
          ...forgotPasswordErrors,
          email: error.errors[0].message,
        });
      } else {
        setForgotPasswordErrors({
          ...forgotPasswordErrors,
          email:
            error.response?.data?.message ||
            "Email không tồn tại trong hệ thống",
        });
      }
    }
  };

  // Handle Forgot OTP Change
  const handleForgotOtpChange = (index, value) => {
    if (/^[0-9]$/.test(value) || value === "") {
      const newOtp = [...forgotOtpCode];
      newOtp[index] = value;
      setForgotOtpCode(newOtp);
      if (value !== "" && index < 5) {
        forgotOtpInputsRef.current[index + 1]?.focus();
      }
    }
  };

  const handleForgotOtpKeyDown = (e, index) => {
    if (e.key === "Backspace" && !forgotOtpCode[index] && index > 0) {
      forgotOtpInputsRef.current[index - 1]?.focus();
    }
  };

  // Handle Verify Forgot Password OTP
  const handleVerifyForgotOtp = async (e) => {
    e.preventDefault();
    const code = forgotOtpCode.join("");
    if (code.length !== 6) {
      setForgotPasswordErrors({
        ...forgotPasswordErrors,
        otp: "Vui lòng nhập đầy đủ mã OTP!",
      });
      return;
    }

    try {
      setIsLoading(true);
      setForgotPasswordErrors({ ...forgotPasswordErrors, otp: "" });
      const res = await verifyOtpForgotPassword(forgotEmail, code);

      if (res.data.success) {
        toast.success(res.data.message || "Xác thực thành công!");
        setForgotPasswordStep(3);
        setTimeout(() => {
          window.history.replaceState(null, "", "/auth/reset-password");
        }, 700);
      } else {
        setForgotPasswordErrors({
          ...forgotPasswordErrors,
          otp: res.data.message || "Mã OTP không chính xác",
        });
      }
    } catch (error) {
      setForgotPasswordErrors({
        ...forgotPasswordErrors,
        otp: error.response?.data?.message || "Mã OTP không chính xác!",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Resend Forgot Password OTP
  const handleResendForgotOtp = async () => {
    try {
      setIsLoading(true);
      const res = await sendOtpForgotPassword(forgotEmail);

      if (res.data.success) {
        toast.success(res.data.message || "Đã gửi lại mã OTP!");
        setForgotOtpCode(["", "", "", "", "", ""]);
      } else {
        toast.error(res.data.message || "Không thể gửi lại OTP");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Có lỗi xảy ra!");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    const schema = z
      .object({
        password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
        confirmPassword: z.string(),
      })
      .refine((data) => data.password === data.confirmPassword, {
        message: "Mật khẩu xác nhận không khớp",
        path: ["confirmPassword"],
      });

    try {
      schema.parse({
        password: newPassword,
        confirmPassword: confirmNewPassword,
      });
      setForgotPasswordErrors({
        email: "",
        otp: "",
        password: "",
        confirmPassword: "",
      });
      setIsLoading(true);
      const res = await resetPassword(forgotEmail, newPassword);
      setIsLoading(false);

      if (res.data.success) {
        toast.success(res.data.message || "Đặt lại mật khẩu thành công!");
        // Reset về login form
        setShowForgotPassword(false);
        setForgotPasswordStep(1);
        setForgotEmail("");
        setNewPassword("");
        setConfirmNewPassword("");
        setForgotOtpCode(["", "", "", "", "", ""]);
        handleToggle(false);
      } else {
        setForgotPasswordErrors({
          ...forgotPasswordErrors,
          password: res.data.message || "Đặt lại mật khẩu thất bại!",
        });
      }
    } catch (error) {
      setIsLoading(false);
      if (error instanceof z.ZodError) {
        const errorMessage = error.errors[0].message;
        const errorPath = error.errors[0].path[0];
        if (errorPath === "confirmPassword") {
          setForgotPasswordErrors({
            ...forgotPasswordErrors,
            confirmPassword: errorMessage,
          });
        } else {
          setForgotPasswordErrors({
            ...forgotPasswordErrors,
            password: errorMessage,
          });
        }
      } else {
        setForgotPasswordErrors({
          ...forgotPasswordErrors,
          password: error.response?.data?.message || "Có lỗi xảy ra!",
        });
      }
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen">
      <div
        className={`relative w-[850px] h-[550px] bg-white m-5 rounded-[30px] shadow-[0_0_30px_rgba(0,0,0,0.2)] overflow-hidden transition-all duration-1000 ${
          isActive ? "active" : ""
        }`}
      >
        {/* Login Form */}
        <div
          className={`absolute ${
            isActive ? "right-1/2" : "right-0"
          } w-1/2 h-full bg-white flex items-center text-gray-800 text-center p-10 transition-all duration-[1000ms] ease-in-out ${
            isActive
              ? "delay-0 -z-10 opacity-0"
              : "delay-[700ms] z-10 opacity-100"
          }`}
        >
          <form onSubmit={handleLogin} className="w-full">
            <h1 className="text-4xl -mt-2.5 mb-0 font-bold">Đăng Nhập</h1>

            {remainingAttempts !== null && remainingAttempts > 0 && (
              <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2 text-yellow-700">
                  <i className="bx bx-error text-lg"></i>
                  <p className="text-sm font-medium">
                    Cảnh báo: Còn {remainingAttempts} lần thử. Tài khoản sẽ bị
                    khóa 1 giờ nếu đăng nhập sai tiếp.
                  </p>
                </div>
              </div>
            )}

            <div className="my-7">
              <div className="relative">
                <div className="font-bold text-left">Tên đăng nhập</div>
                <input
                  type="email"
                  name="email"
                  placeholder="Nhập tên đăng nhập"
                  required
                  autoComplete="email"
                  value={loginData.email}
                  onChange={(e) => {
                    setLoginData({ ...loginData, email: e.target.value });
                    setLoginErrors({ ...loginErrors, email: "" });
                  }}
                  onBlur={(e) => {
                    const error = validateEmail(e.target.value);
                    setLoginErrors({ ...loginErrors, email: error });
                  }}
                  className={`w-full py-3 pr-12 pl-5 bg-gray-100 rounded-lg border-none outline-none text-base text-gray-800 font-medium placeholder:text-gray-500 placeholder:font-normal ${
                    loginErrors.email ? "border-2 border-red-500" : ""
                  }`}
                />
                <i className="bx bxs-envelope absolute right-5 top-1/2 -translate-y-1/2 text-xl"></i>
              </div>
              {loginErrors.email && (
                <p className="text-red-500 text-xs mt-1 ml-1">
                  {loginErrors.email}
                </p>
              )}
            </div>

            <div className="my-7">
              <div className="relative">
                <div className="font-bold text-left">Mật khẩu</div>
                <input
                  type="password"
                  name="password"
                  placeholder="Nhập mật khẩu"
                  required
                  autoComplete="current-password"
                  value={loginData.password}
                  onChange={(e) => {
                    setLoginData({ ...loginData, password: e.target.value });
                    setLoginErrors({ ...loginErrors, credentials: "" });
                  }}
                  className="w-full py-3 pr-12 pl-5 bg-gray-100 rounded-lg border-none outline-none text-base text-gray-800 font-medium placeholder:text-gray-500 placeholder:font-normal"
                />
                <i className="bx bxs-lock-alt absolute right-5 top-1/2 -translate-y-1/2 text-xl"></i>
              </div>
              {loginErrors.credentials && (
                <p className="text-red-500 text-xs mt-1 ml-1">
                  {loginErrors.credentials}
                </p>
              )}
            </div>
            <div className="text-center mb-6">
              <button
                type="button"
                onClick={handleForgotPasswordClick}
                className="text-sm text-primary font-semibold hover:underline"
              >
                Quên mật khẩu?
              </button>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-primary rounded-lg shadow-[0_0_10px_rgba(0,0,0,0.1)] border-none cursor-pointer text-base text-white font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  <span>Đang xử lý...</span>
                </>
              ) : (
                "Đăng Nhập"
              )}
            </button>
          </form>
        </div>

        {/* Register Form */}
        <div
          className={`absolute right-0 w-1/2 h-full bg-white text-gray-800 text-center transition-all duration-[1000ms] ease-in-out overflow-hidden ${
            isActive
              ? "right-1/2 z-10 opacity-100 delay-[700ms]"
              : "right-0 -z-10 opacity-0 delay-0"
          }`}
        >
          {/* Register Form Container */}
          <div
            className={`absolute inset-0 flex items-center justify-center p-10 transition-all duration-700 ease-in-out ${
              showOtp
                ? "opacity-0 -translate-x-full"
                : showForgotPassword
                ? "opacity-0 -translate-x-full"
                : "opacity-100 translate-x-0"
            }`}
          >
            <form onSubmit={handleRegister} className="w-full">
              <h1 className="text-4xl -mt-2.5 mb-0 font-bold">Đăng Ký</h1>

              <div className="relative my-7">
                <input
                  type="text"
                  placeholder="Họ và tên"
                  required
                  value={registerData.name}
                  onChange={(e) =>
                    setRegisterData({ ...registerData, name: e.target.value })
                  }
                  className="w-full py-3 pr-12 pl-5 bg-gray-100 rounded-lg border-none outline-none text-base text-gray-800 font-medium placeholder:text-gray-500 placeholder:font-normal"
                />
                <i className="bx bxs-user absolute right-5 top-1/2 -translate-y-1/2 text-xl"></i>
              </div>

              <div className="my-7">
                <div className="relative">
                  <input
                    type="email"
                    placeholder="Email"
                    required
                    value={registerData.email}
                    onChange={(e) => {
                      setRegisterData({
                        ...registerData,
                        email: e.target.value,
                      });
                      setRegisterErrors({ ...registerErrors, email: "" });
                    }}
                    onBlur={(e) => {
                      const error = validateEmail(e.target.value);
                      setRegisterErrors({ ...registerErrors, email: error });
                    }}
                    className={`w-full py-3 pr-12 pl-5 bg-gray-100 rounded-lg border-none outline-none text-base text-gray-800 font-medium placeholder:text-gray-500 placeholder:font-normal ${
                      registerErrors.email ? "border-2 border-red-500" : ""
                    }`}
                  />
                  <i className="bx bxs-envelope absolute right-5 top-1/2 -translate-y-1/2 text-xl"></i>
                </div>
                {registerErrors.email && (
                  <p className="text-red-500 text-xs mt-1 ml-1">
                    {registerErrors.email}
                  </p>
                )}
              </div>

              <div className="my-7">
                <div className="relative">
                  <input
                    type="password"
                    placeholder="Mật khẩu"
                    required
                    value={registerData.password}
                    onChange={(e) => {
                      setRegisterData({
                        ...registerData,
                        password: e.target.value,
                      });
                      setRegisterErrors({ ...registerErrors, password: "" });
                    }}
                    onBlur={(e) => {
                      const error = validatePassword(e.target.value);
                      setRegisterErrors({ ...registerErrors, password: error });
                    }}
                    className={`w-full py-3 pr-12 pl-5 bg-gray-100 rounded-lg border-none outline-none text-base text-gray-800 font-medium placeholder:text-gray-500 placeholder:font-normal ${
                      registerErrors.password ? "border-2 border-red-500" : ""
                    }`}
                  />
                  <i className="bx bxs-lock-alt absolute right-5 top-1/2 -translate-y-1/2 text-xl"></i>
                </div>
                {registerErrors.password && (
                  <p className="text-red-500 text-xs mt-1 ml-1">
                    {registerErrors.password}
                  </p>
                )}
              </div>

              <div className="my-7">
                <div className="relative">
                  <input
                    type="password"
                    placeholder="Xác nhận mật khẩu"
                    required
                    value={registerData.confirmPassword}
                    onChange={(e) => {
                      setRegisterData({
                        ...registerData,
                        confirmPassword: e.target.value,
                      });
                      setRegisterErrors({
                        ...registerErrors,
                        confirmPassword: "",
                      });
                    }}
                    onBlur={(e) => {
                      const error =
                        registerData.password !== e.target.value
                          ? "Mật khẩu xác nhận không khớp"
                          : "";
                      setRegisterErrors({
                        ...registerErrors,
                        confirmPassword: error,
                      });
                    }}
                    className={`w-full py-3 pr-12 pl-5 bg-gray-100 rounded-lg border-none outline-none text-base text-gray-800 font-medium placeholder:text-gray-500 placeholder:font-normal ${
                      registerErrors.confirmPassword
                        ? "border-2 border-red-500"
                        : ""
                    }`}
                  />
                  <i className="bx bxs-lock-alt absolute right-5 top-1/2 -translate-y-1/2 text-xl"></i>
                </div>
                {registerErrors.confirmPassword && (
                  <p className="text-red-500 text-xs mt-1 ml-1">
                    {registerErrors.confirmPassword}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={registerLoading}
                className="w-full h-12 bg-primary rounded-lg shadow-[0_0_10px_rgba(0,0,0,0.1)] border-none cursor-pointer text-base text-white font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {registerLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    <span>Đang xử lý...</span>
                  </>
                ) : (
                  "Đăng Ký"
                )}
              </button>
            </form>
          </div>

          {/* OTP Form Container */}
          <div
            className={`absolute inset-0 flex items-center justify-center p-10 transition-all duration-700 ease-in-out ${
              showOtp
                ? "opacity-100 translate-x-0"
                : "opacity-0 translate-x-full"
            }`}
          >
            <form onSubmit={handleOtpSubmit} className="w-full">
              <h1 className="text-4xl -mt-2.5 mb-0 font-bold">Xác Thực OTP</h1>
              <p className="text-sm text-gray-600 mt-3 mb-6">
                Mã OTP đã được gửi đến{" "}
                <span className="font-semibold">{otpEmail}</span>
              </p>

              <div className="flex justify-center gap-2 mb-7">
                {otpCode.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (inputsRef.current[index] = el)}
                    type="text"
                    maxLength="1"
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(e, index)}
                    className="w-12 h-12 text-center text-2xl font-bold bg-gray-100 rounded-lg border-none outline-none focus:ring-2 focus:ring-primary"
                    disabled={isLoading}
                  />
                ))}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-primary rounded-lg shadow-[0_0_10px_rgba(0,0,0,0.1)] border-none cursor-pointer text-base text-white font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 mb-4"
              >
                {isLoading ? "Đang xác thực..." : "Xác Nhận"}
              </button>

              <div className="text-center text-sm text-gray-600 mb-4">
                <span>Không nhận được mã? </span>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={isLoading}
                  className="font-semibold text-primary hover:underline disabled:opacity-50"
                >
                  Gửi lại OTP
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowOtp(false);
                  setOtpCode(["", "", "", "", "", ""]);
                }}
                disabled={isLoading}
                className="w-full text-sm text-gray-600 hover:text-primary transition-colors cursor-pointer"
              >
                Quay lại đăng ký
              </button>
            </form>
          </div>

          {/* Forgot Password Forms */}
          {showForgotPassword && (
            <>
              {/* Forgot Password Email Form */}
              <div
                className={`absolute inset-0 flex items-center justify-center p-10 transition-all duration-700 ease-in-out ${
                  forgotPasswordStep === 1
                    ? "opacity-100 translate-x-0"
                    : "opacity-0 -translate-x-full"
                }`}
              >
                <form onSubmit={handleSendForgotPasswordOtp} className="w-full">
                  <h1 className="text-4xl -mt-2.5 mb-0 font-bold">
                    Quên Mật Khẩu
                  </h1>
                  <p className="text-sm text-gray-600 mt-3 mb-6">
                    Nhập email để nhận mã OTP
                  </p>

                  <div className="my-7">
                    <div className="relative">
                      <input
                        type="email"
                        placeholder="Email"
                        required
                        value={forgotEmail}
                        onChange={(e) => {
                          setForgotEmail(e.target.value);
                          setForgotPasswordErrors({
                            ...forgotPasswordErrors,
                            email: "",
                          });
                        }}
                        disabled={isLoading}
                        className={`w-full py-3 pr-12 pl-5 bg-gray-100 rounded-lg border-none outline-none text-base text-gray-800 font-medium placeholder:text-gray-500 placeholder:font-normal ${
                          forgotPasswordErrors.email
                            ? "border-2 border-red-500"
                            : ""
                        }`}
                      />
                      <i className="bx bxs-envelope absolute right-5 top-1/2 -translate-y-1/2 text-xl"></i>
                    </div>
                    {forgotPasswordErrors.email && (
                      <p className="text-red-500 text-xs mt-1 ml-1">
                        {forgotPasswordErrors.email}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 bg-primary rounded-lg shadow-[0_0_10px_rgba(0,0,0,0.1)] border-none cursor-pointer text-base text-white font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mb-4"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                        <span>Đang gửi...</span>
                      </>
                    ) : (
                      "Gửi mã OTP"
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setForgotEmail("");
                      handleToggle(false);
                    }}
                    disabled={isLoading}
                    className="w-full text-sm text-gray-600 hover:text-primary transition-colors cursor-pointer"
                  >
                    Quay lại đăng nhập
                  </button>
                </form>
              </div>

              {/* Forgot Password OTP Form */}
              <div
                className={`absolute inset-0 flex items-center justify-center p-10 transition-all duration-700 ease-in-out ${
                  forgotPasswordStep === 2
                    ? "opacity-100 translate-x-0"
                    : forgotPasswordStep === 1
                    ? "opacity-0 translate-x-full"
                    : "opacity-0 -translate-x-full"
                }`}
              >
                <form onSubmit={handleVerifyForgotOtp} className="w-full">
                  <h1 className="text-4xl -mt-2.5 mb-0 font-bold">
                    Xác Thực OTP
                  </h1>
                  <p className="text-sm text-gray-600 mt-3 mb-6">
                    Mã OTP đã được gửi đến{" "}
                    <span className="font-semibold">{forgotEmail}</span>
                  </p>

                  <div className="mb-7">
                    <div className="flex justify-center gap-2">
                      {forgotOtpCode.map((digit, index) => (
                        <input
                          key={index}
                          ref={(el) => (forgotOtpInputsRef.current[index] = el)}
                          type="text"
                          maxLength="1"
                          value={digit}
                          onChange={(e) => {
                            handleForgotOtpChange(index, e.target.value);
                            setForgotPasswordErrors({
                              ...forgotPasswordErrors,
                              otp: "",
                            });
                          }}
                          onKeyDown={(e) => handleForgotOtpKeyDown(e, index)}
                          className="w-12 h-12 text-center text-2xl font-bold bg-gray-100 rounded-lg border-none outline-none focus:ring-2 focus:ring-primary"
                          disabled={isLoading}
                        />
                      ))}
                    </div>
                    {forgotPasswordErrors.otp && (
                      <p className="text-red-500 text-xs mt-2 text-center">
                        {forgotPasswordErrors.otp}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 bg-primary rounded-lg shadow-[0_0_10px_rgba(0,0,0,0.1)] border-none cursor-pointer text-base text-white font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 mb-4"
                  >
                    {isLoading ? "Đang xác thực..." : "Xác Nhận"}
                  </button>

                  <div className="text-center text-sm text-gray-600 mb-4">
                    <span>Không nhận được mã? </span>
                    <button
                      type="button"
                      onClick={handleResendForgotOtp}
                      disabled={isLoading}
                      className="font-semibold text-primary hover:underline disabled:opacity-50"
                    >
                      Gửi lại OTP
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setForgotPasswordStep(1);
                      setForgotOtpCode(["", "", "", "", "", ""]);
                      window.history.replaceState(
                        null,
                        "",
                        "/auth/forgot-password"
                      );
                    }}
                    disabled={isLoading}
                    className="w-full text-sm text-gray-600 hover:text-primary transition-colors cursor-pointer"
                  >
                    Quay lại
                  </button>
                </form>
              </div>

              {/* Reset Password Form */}
              <div
                className={`absolute inset-0 flex items-center justify-center p-10 transition-all duration-700 ease-in-out ${
                  forgotPasswordStep === 3
                    ? "opacity-100 translate-x-0"
                    : "opacity-0 translate-x-full"
                }`}
              >
                <form onSubmit={handleResetPassword} className="w-full">
                  <h1 className="text-4xl -mt-2.5 mb-0 font-bold">
                    Đặt Lại Mật Khẩu
                  </h1>
                  <p className="text-sm text-gray-600 mt-3 mb-6">
                    Nhập mật khẩu mới
                  </p>

                  <div className="my-7">
                    <div className="relative">
                      <input
                        type="password"
                        placeholder="Mật khẩu mới"
                        required
                        value={newPassword}
                        onChange={(e) => {
                          setNewPassword(e.target.value);
                          setForgotPasswordErrors({
                            ...forgotPasswordErrors,
                            password: "",
                          });
                        }}
                        disabled={isLoading}
                        className={`w-full py-3 pr-12 pl-5 bg-gray-100 rounded-lg border-none outline-none text-base text-gray-800 font-medium placeholder:text-gray-500 placeholder:font-normal ${
                          forgotPasswordErrors.password
                            ? "border-2 border-red-500"
                            : ""
                        }`}
                      />
                      <i className="bx bxs-lock-alt absolute right-5 top-1/2 -translate-y-1/2 text-xl"></i>
                    </div>
                    {forgotPasswordErrors.password && (
                      <p className="text-red-500 text-xs mt-1 ml-1">
                        {forgotPasswordErrors.password}
                      </p>
                    )}
                  </div>

                  <div className="my-7">
                    <div className="relative">
                      <input
                        type="password"
                        placeholder="Xác nhận mật khẩu"
                        required
                        value={confirmNewPassword}
                        onChange={(e) => {
                          setConfirmNewPassword(e.target.value);
                          setForgotPasswordErrors({
                            ...forgotPasswordErrors,
                            confirmPassword: "",
                          });
                        }}
                        disabled={isLoading}
                        className={`w-full py-3 pr-12 pl-5 bg-gray-100 rounded-lg border-none outline-none text-base text-gray-800 font-medium placeholder:text-gray-500 placeholder:font-normal ${
                          forgotPasswordErrors.confirmPassword
                            ? "border-2 border-red-500"
                            : ""
                        }`}
                      />
                      <i className="bx bxs-lock-alt absolute right-5 top-1/2 -translate-y-1/2 text-xl"></i>
                    </div>
                    {forgotPasswordErrors.confirmPassword && (
                      <p className="text-red-500 text-xs mt-1 ml-1">
                        {forgotPasswordErrors.confirmPassword}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 bg-primary rounded-lg shadow-[0_0_10px_rgba(0,0,0,0.1)] border-none cursor-pointer text-base text-white font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mb-4"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                        <span>Đang xử lý...</span>
                      </>
                    ) : (
                      "Đặt Lại Mật Khẩu"
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setForgotPasswordStep(2);
                      setNewPassword("");
                      setConfirmNewPassword("");
                      window.history.replaceState(null, "", "/auth/verify-otp");
                    }}
                    disabled={isLoading}
                    className="w-full text-sm text-gray-600 hover:text-primary transition-colors cursor-pointer"
                  >
                    Quay lại
                  </button>
                </form>
              </div>
            </>
          )}
        </div>

        {/* Toggle Box */}
        <div className="absolute w-full h-full pointer-events-none">
          {/* Animated Background */}
          <div
            className={`absolute ${
              isActive ? "left-1/2" : "-left-[250%]"
            } w-[300%] h-full bg-primary rounded-[150px] z-20 transition-all duration-[1000ms] ease-in-out`}
          ></div>

          {/* Toggle Left Panel */}
          <div
            className={`absolute ${
              isActive ? "-left-1/2 delay-[400ms]" : "left-0 delay-[700ms]"
            } w-1/2 h-full text-white flex flex-col justify-center items-center z-20 transition-all duration-[400ms] ease-in-out pointer-events-auto`}
          >
            <h1 className="text-4xl -mt-2.5 mb-0 font-bold">Xin Chào!</h1>
            <p className="text-sm my-4 mb-5">Chưa có tài khoản?</p>
            <button
              onClick={() => handleToggle(true)}
              className="w-40 h-[46px] bg-transparent border-2 border-white rounded-lg shadow-none cursor-pointer text-base text-white font-semibold hover:bg-white hover:text-primary transition-colors"
            >
              Đăng Ký
            </button>
          </div>

          {/* Toggle Right Panel */}
          <div
            className={`absolute ${
              isActive ? "right-0 delay-[700ms]" : "-right-1/2 delay-[400ms]"
            } w-1/2 h-full text-white flex flex-col justify-center items-center z-20 transition-all duration-[400ms] ease-in-out pointer-events-auto`}
          >
            <h1 className="text-4xl -mt-2.5 mb-0 font-bold">
              {showForgotPassword
                ? forgotPasswordStep === 1
                  ? "Quên Mật Khẩu?"
                  : forgotPasswordStep === 2
                  ? "Xác Thực OTP"
                  : "Đặt Lại Mật Khẩu"
                : showOtp
                ? "Xác Thực Tài Khoản"
                : "Chào Mừng Trở Lại!"}
            </h1>
            <p className="text-sm my-4 mb-5">
              {showForgotPassword
                ? forgotPasswordStep === 1
                  ? "Nhập email để nhận mã OTP"
                  : forgotPasswordStep === 2
                  ? "Nhập mã OTP để xác thực"
                  : "Tạo mật khẩu mới cho tài khoản"
                : showOtp
                ? "Vui lòng nhập mã OTP để hoàn tất"
                : "Đã có tài khoản?"}
            </p>
            {!showOtp && !showForgotPassword && (
              <button
                onClick={() => handleToggle(false)}
                className="w-40 h-[46px] bg-transparent border-2 border-white rounded-lg shadow-none cursor-pointer text-base text-white font-semibold hover:bg-white hover:text-primary transition-colors"
              >
                Đăng Nhập
              </button>
            )}
          </div>
        </div>
      </div>

      <BanDialog
        open={banDialogOpen}
        onClose={() => setBanDialogOpen(false)}
        banInfo={banInfo}
      />
    </div>
  );
};

export default AuthPage;
