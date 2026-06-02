import {
  IconBellRinging,
  IconChefHat,
  IconChevronDown,
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
      key: "menu",
      label: "Qu\u1ea3n l\u00fd th\u1ef1c \u0111\u01a1n",
      icon: IconChefHat,
      children: [
        {
          link: "/admin/categories",
          label: "Danh m\u1ee5c m\u00f3n \u0103n",
          icon: IconFingerprint,
        },
        {
          link: "/admin/dishes",
          label: "M\u00f3n \u0103n",
          icon: IconSalad,
        },
        {
          link: "/admin/ingredients",
          label: "Kho nguy\u00ean li\u1ec7u",
          icon: IconPackage,
        },
      ],
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
      key: "customerService",
      label: "D\u1ecbch v\u1ee5 kh\u00e1ch h\u00e0ng",
      icon: IconMessages,
      children: [
        {
          link: "/admin/ratings",
          label: "Qu\u1ea3n l\u00fd \u0111\u00e1nh gi\u00e1",
          icon: IconMessageReply,
        },
        {
          link: "/admin/chat",
          label: "Chat h\u1ed7 tr\u1ee3",
          icon: IconMessages,
          badge: "chat",
        },
      ],
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
  const [openMenus, setOpenMenus] = useState({
    menu:
      activePath.startsWith("/admin/categories") ||
      activePath.startsWith("/admin/dishes") ||
      activePath.startsWith("/admin/ingredients"),
    customerService:
      activePath.startsWith("/admin/ratings") ||
      activePath.startsWith("/admin/chat"),
  });

  const isLinkActive = (link) =>
    activePath === link || activePath.startsWith(link + "/");

  const closeAllMenus = () => {
    setOpenMenus((prev) =>
      Object.fromEntries(Object.keys(prev).map((key) => [key, false]))
    );
  };

  const toggleMenu = (menuKey, isOpen) => {
    setOpenMenus((prev) =>
      Object.fromEntries(
        Object.keys(prev).map((key) => [key, key === menuKey ? !isOpen : false])
      )
    );
  };

  const keepMenuOpen = (menuKey) => {
    setOpenMenus((prev) =>
      Object.fromEntries(Object.keys(prev).map((key) => [key, key === menuKey]))
    );
  };

  const getActiveItemLabel = () => {
    for (const item of data) {
      if (item.children) {
        const activeChild = item.children.find((child) =>
          isLinkActive(child.link)
        );
        if (activeChild) return activeChild.label;
      }

      if (item.link && isLinkActive(item.link)) return item.label;
    }

    return "Dashboard";
  };

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
      <nav className="h-full w-[280px] px-6 pb-6 flex flex-col bg-green-900">
        <div className="flex-1 overflow-y-auto">
          {/* Header */}
          <div className="flex h-[65px] items-center justify-between mb-6 border-b border-green-800">
            <div className="flex items-center gap-2">
              <img
                src={assets.logo}
                alt="Logo"
                className="w-10 h-10 rounded-lg"
              />
              <span className="text-white font-medium text-xl">NHGreen</span>
            </div>
            <span className="bg-green-800 text-green-50 text-sm px-2 py-1 rounded font-bold">
              v1.0.0
            </span>
          </div>

          {/* Links */}
          <div className="space-y-1">
            {data.map((item) => {
              if (item.children) {
                const isOpen = openMenus[item.key];
                const isParentActive = item.children.some((child) =>
                  isLinkActive(child.link)
                );

                return (
                  <div key={item.label}>
                    <button
                      type="button"
                      onClick={() => toggleMenu(item.key, isOpen)}
                      className={`flex w-full items-center rounded-md px-4 py-3 font-semibold transition-colors ${
                        isParentActive
                          ? "bg-green-800 text-white"
                          : "text-white hover:bg-green-800"
                      }`}
                    >
                      <item.icon
                        stroke={1.5}
                        className="mr-4 h-6 w-6 text-gray-400"
                      />
                      <span className="flex-1 text-left">{item.label}</span>
                      <IconChevronDown
                        stroke={1.5}
                        className={`h-5 w-5 text-gray-400 transition-transform ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {isOpen && (
                      <div className="mt-1 space-y-1 pl-6">
                        {item.children.map((child) => {
                          const isChildActive = isLinkActive(child.link);
                          const showChildBadge =
                            child.badge === "chat" && unreadCount > 0;

                          return (
                            <Link
                              to={child.link}
                              key={child.label}
                              onClick={() => keepMenuOpen(item.key)}
                              className={`flex items-center rounded-md px-4 py-2.5 text-base font-semibold transition-colors ${
                                isChildActive
                                  ? "bg-white text-gray-900 shadow"
                                  : "text-white hover:bg-green-800"
                              }`}
                            >
                              <child.icon
                                stroke={1.5}
                                className={`mr-3 h-5 w-5 ${
                                  isChildActive
                                    ? "text-green-700"
                                    : "text-gray-400"
                                }`}
                              />
                              <span>{child.label}</span>
                              {showChildBadge && (
                                <span className="ml-auto min-w-[20px] rounded-full bg-red-500 px-2 py-0.5 text-center text-xs font-bold text-white">
                                  {unreadCount > 99 ? "99+" : unreadCount}
                                </span>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              const isActive =
                item.link &&
                (activePath === item.link ||
                  activePath.startsWith(item.link + "/"));
              const isChatSupport = item.link === "/admin/chat";
              const showBadge = isChatSupport && unreadCount > 0;

              return (
                <Link
                  to={item.link}
                  key={item.label}
                  onClick={closeAllMenus}
                  className={`flex items-center px-4 py-3 rounded-md font-semibold transition-colors relative
                    ${
                      isActive
                        ? "bg-white text-gray-900 shadow"
                        : "text-white hover:bg-green-800"
                    }`}
                >
                  <item.icon
                    stroke={1.5}
                    className={`mr-4 w-6 h-6 ${
                      isActive ? "text-green-700" : "text-gray-400"
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
        <div className="mt-6 border-t border-green-800">
          <button
            onClick={() => {
              closeAllMenus();
              handleLogout();
            }}
            disabled={isLoggingOut}
            className={`flex items-center w-full text-sm text-white px-4 py-3 rounded-md font-medium transition-colors cursor-pointer ${
              isLoggingOut
                ? "opacity-60 cursor-not-allowed"
                : "hover:bg-green-800"
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
            {getActiveItemLabel()}
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


