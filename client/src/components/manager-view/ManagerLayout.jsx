import {
  IconBellRinging,
  IconLogout,
  IconReceipt2,
  IconPackage,
  IconChefHat,
  IconStar,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useSelector } from "react-redux";
import { assets } from "../../assets/assets";
import { useDispatch } from "react-redux";
import { logoutUser } from "@/store/auth-slice";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import NotificationBell, { useNotificationCount } from "./NotificationBell";

const ManagerLayout = () => {
  const data = [
    { link: "/manager/dashboard", label: "Dashboard", icon: IconReceipt2 },
    {
      link: "/manager/notifications",
      label: "Thông báo",
      icon: IconBellRinging,
    },
    {
      link: "/manager/orders",
      label: "Quản lý đơn hàng",
      icon: IconPackage,
    },
    {
      link: "/manager/dishes",
      label: "Quản lý thực đơn",
      icon: IconChefHat,
    },
    {
      link: "/manager/ratings",
      label: "Quản lý đánh giá",
      icon: IconStar,
    },
  ];

  const navigate = useNavigate();
  const location = useLocation();
  const activePath = location.pathname;
  const dispatch = useDispatch();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const accessToken = useSelector((state) => state.auth.accessToken);
  const user = useSelector((state) => state.auth.user);
  // Unread notification count + manual refresh capability
  const { count: sidebarNotificationCount } = useNotificationCount();

  // Logout handler
  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    const loadingToast = toast.loading("Đang đăng xuất...");
    try {
      await dispatch(logoutUser()).unwrap();
      toast.success("Đăng xuất thành công");

      // Chuyển hướng đến trang login
      navigate("/auth/login");
    } catch {
      toast.error("Có lỗi xảy ra khi đăng xuất");
    } finally {
      toast.dismiss(loadingToast);
      setIsLoggingOut(false);
    }
  };

  // Auto join branch room for realtime order updates
  useEffect(() => {
    if (!accessToken || !user?.branch_id) return;
    const socket = io(import.meta.env.VITE_API_BASE_URL, {
      auth: { token: accessToken },
      transports: ["websocket", "polling"],
    });
    socket.on("connect", () => {
      socket.emit("join_branch_room", user.branch_id);
    });
    return () => {
      socket.emit("leave_branch_room", user.branch_id);
      socket.disconnect();
    };
  }, [accessToken, user?.branch_id]);

  return (
    <div className="flex h-screen font-medium">
      {/* Sidebar */}
      <nav className="h-full w-[280px] p-6 flex flex-col bg-gray-900">
        <div className="flex-1 overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between pb-6 mb-9 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <img
                src={assets.logo}
                alt="Logo"
                className="w-10 h-10 rounded-lg"
              />
              <span className="text-white font-medium text-xl">NHGreen</span>
            </div>
            <span className="bg-gray-800 text-gray-200 text-sm px-2 py-1 rounded font-bold">
              v1.0.0
            </span>
          </div>

          {/* Links */}
          <div className="space-y-1">
            {data.map((item) => {
              const isActive =
                activePath === item.link ||
                activePath.startsWith(item.link + "/");
              return (
                <Link
                  to={item.link}
                  key={item.label}
                  className={`flex items-center  px-4 py-3 rounded-md font-semibold transition-colors
                    ${
                      isActive
                        ? "bg-white text-gray-900 shadow"
                        : "text-gray-300 hover:bg-gray-800"
                    }`}
                >
                  <item.icon
                    stroke={1.5}
                    className={`mr-4 w-6 h-6 ${
                      isActive ? "text-blue-700" : "text-gray-400"
                    }`}
                  />
                  {item.label === "Thông báo" ? (
                    <span className="relative">
                      {item.label}
                      {sidebarNotificationCount > 0 && (
                        <span className="absolute -top-1 -right-6 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                          {sidebarNotificationCount > 9
                            ? "9+"
                            : sidebarNotificationCount}
                        </span>
                      )}
                    </span>
                  ) : (
                    <span>{item.label}</span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 border-t border-gray-800">
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className={`flex items-center w-full text-sm text-gray-200 px-4 py-3 rounded-md font-medium transition-colors cursor-pointer ${
              isLoggingOut
                ? "opacity-60 cursor-not-allowed"
                : "hover:bg-gray-800"
            }`}
          >
            <IconLogout className="mr-4 w-6 h-6 text-gray-400" stroke={1.5} />
            <span>{isLoggingOut ? "Đang đăng xuất..." : "Đăng xuất"}</span>
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col bg-white overflow-hidden">
        {/* Header Bar */}
        <div className="bg-white shadow-sm p-4 flex justify-between items-center border-b">
          <h1 className="text-xl font-semibold text-green-700">
            {data.find(
              (item) =>
                item.link === activePath ||
                activePath.startsWith(item.link + "/")
            )?.label || "Dashboard"}
          </h1>
          <div className="flex items-center gap-4">
            <NotificationBell />
          </div>
        </div>

        {/* Content Area - scrollable */}
        <div id="manager-content" className="flex-1 overflow-y-auto bg-gray-50">
          <div className="w-full px-3 py-3">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};

export default ManagerLayout;
