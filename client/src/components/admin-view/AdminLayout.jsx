import {
  IconBellRinging,
  IconFingerprint,
  IconKey,
  IconLogout,
  IconReceipt2,
  IconUser,
  IconMessages,
  IconSalad,
  IconTicket,
  IconArticle,
  IconMessageReply,
  IconPackage,
} from "@tabler/icons-react";
import { useState, useEffect } from "react";
import { assets } from "../../assets/assets";
import { useDispatch, useSelector } from "react-redux";
import { logoutUser } from "@/store/auth-slice";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useSocket } from "@/context/SocketContext";
import supportChatService from "@/api/supportChatApi";

const AdminLayout = () => {
  const data = [
    { link: "/admin/dashboard", label: "Dashboard", icon: IconReceipt2 },
    {
      link: "/admin/dishes",
      label: "Quản lý món ăn",
      icon: IconSalad,
    },
    {
      link: "/admin/categories",
      label: "Quản lý danh mục",
      icon: IconFingerprint,
    },
    {
      link: "/admin/ingredients",
      label: "Quản lý nguyên liệu",
      icon: IconSalad,
    },
    {
      link: "/admin/orders",
      label: "Quản lý đơn hàng",
      icon: IconPackage,
    },
    { link: "/admin/vouchers", label: "Quản lý voucher", icon: IconTicket },
    {
      label: "Chương trình Flash Sale",
      icon: IconArticle,
      link: "/admin/flash-sale",
    },
    {
      link: "/admin/branches",
      label: "Quản lý chi nhánh",
      icon: IconBellRinging,
    },
    {
      link: "/admin/ratings",
      label: "Quản lý đánh giá",
      icon: IconMessageReply,
    },
    {
      link: "/admin/chat",
      label: "Chat hỗ trợ",
      icon: IconMessages,
    },
    {
      link: "/admin/manage-user",
      label: "Quản lý người dùng",
      icon: IconUser,
    },
  ];

  const navigate = useNavigate();
  const location = useLocation();
  const activePath = location.pathname;
  const dispatch = useDispatch();
  const { socket } = useSocket();
  const { accessToken } = useSelector((state) => state.auth);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Load unread count
  const loadUnreadCount = async () => {
    try {
      const response = await supportChatService.getConversations(accessToken, {
        status: "active",
      });
      if (response.success) {
        const total = response.data.conversations.reduce(
          (sum, conv) => sum + (conv.unreadCountAdmin || 0),
          0
        );
        setUnreadCount(total);
      }
    } catch (error) {
      console.error("Error loading unread count:", error);
    }
  };

  // Initial load and socket listeners
  useEffect(() => {
    if (accessToken) {
      loadUnreadCount();
    }
  }, [accessToken]);

  // Reload unread count when on chat page
  useEffect(() => {
    if (activePath === "/admin/chat" && accessToken) {
      const interval = setInterval(() => {
        loadUnreadCount();
      }, 2000); // Reload every 2 seconds when on chat page

      return () => clearInterval(interval);
    }
  }, [activePath, accessToken]);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = () => {
      loadUnreadCount();
    };

    const handleConversationUpdate = () => {
      loadUnreadCount();
    };

    socket.on("support_new_message", handleNewMessage);
    socket.on("support_conversation_update", handleConversationUpdate);

    return () => {
      socket.off("support_new_message", handleNewMessage);
      socket.off("support_conversation_update", handleConversationUpdate);
    };
  }, [socket]);

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
    } catch (error) {
      toast.error("Có lỗi xảy ra khi đăng xuất");
    } finally {
      toast.dismiss(loadingToast);
      setIsLoggingOut(false);
    }
  };

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
              const isChatSupport = item.link === "/admin/chat";
              const showBadge = isChatSupport && unreadCount > 0;

              return (
                <Link
                  to={item.link}
                  key={item.label}
                  className={`flex items-center px-4 py-3 rounded-md font-semibold transition-colors relative
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
                  <span>{item.label}</span>
                  {showBadge && (
                    <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
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
            <span>{isLoggingOut ? "Đang đăng xuất..." : "Đăng xuất"}</span>
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
          {/* <div className="flex items-center gap-4">
            <SellerNotificationBell />
          </div> */}
        </div>

        {/* Content Area - scrollable */}
        <div id="admin-content" className="flex-1 overflow-y-auto bg-gray-50">
          <div className="w-full px-3 py-3">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
