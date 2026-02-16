import React, { useState, useRef, useEffect } from "react";
import { useCartContext } from "@/context/CartContext";
import { NavLink, Link, useNavigate } from "react-router-dom";
import logo from "../../assets/logo.png";
import { assets } from "../../assets/assets";
import { useSelector, useDispatch } from "react-redux";
import { logoutUser } from "@/store/auth-slice";
import { toast } from "sonner";
import NotificationPopup from "./NotificationPopup";

const IconButton = ({ children, title = "", className = "", ...props }) => (
  <button
    type="button"
    aria-label={title}
    title={title}
    className={
      "flex items-center justify-center h-10 w-10 rounded-full bg-gray-100 hover:bg-gray-50 focus:outline-none cursor-pointer " +
      className
    }
    {...props}
  >
    {children}
  </button>
);

const CustomerHeader = () => {
  const { items } = useCartContext();
  const cartCount = items.length;
  const isAuthenticated = useSelector((state) => state.auth?.isAuthenticated);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef(null);
  const closeTimeoutRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (accountRef.current && !accountRef.current.contains(e.target)) {
        setAccountOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  const handleLogout = async () => {
    try {
      const loadingToast = toast.loading("Đang đăng xuất...");
      await dispatch(logoutUser()).unwrap?.();
      toast.dismiss(loadingToast);
      toast.success("Đăng xuất thành công");
    } catch (err) {
      toast.error("Có lỗi xảy ra khi đăng xuất");
    }
    setAccountOpen(false);
    navigate("/");
  };

  const linkClass = ({ isActive }) =>
    (isActive ? "text-green-500 font-extrabold" : "text-gray-700") +
    " hover:text-green-500";

  return (
    <header className="bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: logo */}
          <div className="flex items-center flex-shrink-0">
            <Link to="/">
              <img src={logo} alt="Cabbage" className="h-16 w-auto" />
            </Link>
          </div>

          {/* Center: navigation */}
          <nav className="hidden md:flex font-extrabold space-x-8">
            <NavLink to="/" className={linkClass} end>
              Trang chủ
            </NavLink>
            <NavLink to="/products" className={linkClass}>
              Sản phẩm
            </NavLink>
            <NavLink to="/branches" className={linkClass}>
              Chi nhánh
            </NavLink>
          </nav>

          {/* Right: icon buttons */}
          <div className="flex items-center space-x-3">
            {/* Notification Bell - only show when authenticated */}
            {isAuthenticated && <NotificationPopup />}

            <Link to="/my-cart" className="relative">
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                  {/* Cart icon from assets */}
                  <img src={assets.cart} alt="cart" className="h-6 w-6" />
                </div>

                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs font-semibold rounded-full h-5 w-5 flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </div>
            </Link>

            {/* Show Account button when authenticated, otherwise show Login button */}
            {isAuthenticated ? (
              <div
                className="relative"
                ref={accountRef}
                onMouseEnter={() => {
                  if (closeTimeoutRef.current) {
                    clearTimeout(closeTimeoutRef.current);
                    closeTimeoutRef.current = null;
                  }
                  setAccountOpen(true);
                }}
                onMouseLeave={() => {
                  // delay closing slightly to allow pointer to move into menu
                  closeTimeoutRef.current = setTimeout(
                    () => setAccountOpen(false),
                    180
                  );
                }}
              >
                <IconButton
                  title="Account"
                  className="bg-green-50 cursor-pointer"
                >
                  {/* User icon */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-green-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 12a5 5 0 100-10 5 5 0 000 10zm-7 7a7 7 0 0114 0H3z"
                      clipRule="evenodd"
                    />
                  </svg>
                </IconButton>

                {/* keep dropdown mounted so we can animate open/close smoothly */}
                <div
                  className={`absolute right-0 mt-2 w-40 bg-white rounded shadow-lg z-50 transform transition-all duration-200 ease-out origin-top-right ${
                    accountOpen
                      ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
                      : "opacity-0 -translate-y-2 scale-95 pointer-events-none"
                  }`}
                  aria-hidden={!accountOpen}
                >
                  <Link
                    to="/my-account"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setAccountOpen(false)}
                  >
                    Tài khoản của tôi
                  </Link>
                  <Link
                    to="/my-account/orders"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setAccountOpen(false)}
                  >
                    Đơn hàng
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                  >
                    Đăng xuất
                  </button>
                </div>
              </div>
            ) : (
              <Link
                to="/auth/login"
                className="flex items-center justify-center gap-2 px-4 py-2 btn-primary rounded text-white font-medium"
              >
                Đăng nhập
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default CustomerHeader;
