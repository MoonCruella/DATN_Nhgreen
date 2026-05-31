import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

const publicRoutes = [
  "/",
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
  "/auth/verify-otp",
  "/auth/reset-password",
];
const privateRoutes = ["/admin", "/manager"];

const CheckAuth = ({ isAuthenticated, user, children }) => {
  const location = useLocation();
  const path = location.pathname;
  const isLoading = useSelector((state) => state.auth.isLoading);

  // Nếu đang check/refresh token thì chờ, tránh redirect nhảy lung tung
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-800 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  // // Nếu chưa login nhưng vào protected route (sau khi đã xác định isLoading=false)
  if (!isAuthenticated && privateRoutes.some((r) => path.startsWith(r))) {
    return <Navigate to="/" replace />;
  }

  // Nếu đã login mà vẫn vào /login hoặc /register → redirect theo role
  if (
    !isLoading &&
    isAuthenticated &&
    (path.startsWith("/auth/login") || path.startsWith("/auth/register"))
  ) {
    if (user?.role === "admin")
      return <Navigate to="/admin/dashboard" replace />;
    if (user?.role === "manager")
      return <Navigate to="/manager/dashboard" replace />;
    return <Navigate to="/" replace />;
  }

  // Nếu customer cố vào admin/manager
  if (isAuthenticated && user?.role === "customer") {
    if (path.includes("admin") || path.includes("manager")) {
      return <Navigate to="/unauth-page" replace />;
    }
  }

  // Nếu manager cố vào admin
  if (isAuthenticated && user?.role === "manager" && path.includes("admin")) {
    return <Navigate to="/unauth-page" replace />;
  }

  // Nếu admin vào customer/manager → ép về dashboard admin
  if (isAuthenticated && user?.role === "admin") {
    if (path.includes("manager") || path.includes("customer")) {
      return <Navigate to="/admin/dashboard" replace />;
    }
  }

  // Nếu manager vào customer → ép về dashboard manager
  if (
    isAuthenticated &&
    user?.role === "manager" &&
    path.includes("customer")
  ) {
    return <Navigate to="/manager/dashboard" replace />;
  }

  return <>{children}</>;
};

export default CheckAuth;
