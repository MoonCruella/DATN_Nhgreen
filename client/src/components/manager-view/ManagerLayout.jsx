import {
  IconBellRinging,
  IconChevronDown,
  IconLogout,
  IconReceipt2,
  IconPackage,
  IconChefHat,
  IconStar,
  IconTable,
  IconUsers,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useDispatch, useSelector } from "react-redux";
import { assets } from "../../assets/assets";
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
      key: "orders",
      label: "Quản lý đơn hàng",
      icon: IconPackage,
      children: [
        {
          link: "/manager/orders/online",
          label: "Đơn hàng online",
          icon: IconPackage,
        },
        {
          link: "/manager/orders/dine-in",
          label: "Đơn hàng tại quán",
          icon: IconReceipt2,
        },
      ],
    },
    {
      link: "/manager/tables",
      label: "Quản lý bàn",
      icon: IconTable,
    },
    {
      link: "/manager/customers",
      label: "Quản lý khách hàng",
      icon: IconUsers,
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
  const [openMenus, setOpenMenus] = useState({
    orders: activePath.startsWith("/manager/orders"),
  });
  const accessToken = useSelector((state) => state.auth.accessToken);
  const user = useSelector((state) => state.auth.user);
  const { count: sidebarNotificationCount } = useNotificationCount();

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

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    const loadingToast = toast.loading("Đang đăng xuất...");
    try {
      await dispatch(logoutUser()).unwrap();
      toast.success("Đăng xuất thành công");
      navigate("/auth/login");
    } catch {
      toast.error("Có lỗi xảy ra khi đăng xuất");
    } finally {
      toast.dismiss(loadingToast);
      setIsLoggingOut(false);
    }
  };

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
      <nav className="flex h-full w-[280px] flex-col bg-green-900 px-6 pb-6">
        <div className="flex-1 overflow-y-auto">
          <div className="mb-6 flex h-[65px] items-center justify-between border-b border-green-800">
            <div className="flex items-center gap-2">
              <img
                src={assets.logo}
                alt="Logo"
                className="h-10 w-10 rounded-lg"
              />
              <span className="text-xl font-medium text-white">NHGreen</span>
            </div>
            <span className="rounded bg-green-800 px-2 py-1 text-sm font-bold text-green-50">
              v1.0.0
            </span>
          </div>

          <div className="space-y-1">
            {data.map((item) => {
              if (item.children) {
                const isOpen = openMenus[item.key];

                return (
                  <div key={item.label}>
                    <button
                      type="button"
                      onClick={() => toggleMenu(item.key, isOpen)}
                      className="flex w-full items-center rounded-md px-4 py-3 font-semibold text-white transition-colors hover:bg-green-800"
                    >
                      <item.icon
                        stroke={1.5}
                        className="mr-4 h-6 w-6 text-gray-400"
                      />
                      <span className="flex-1 text-left">{item.label}</span>
                      <IconChevronDown
                        stroke={1.5}
                        className={`h-5 w-5 transition-transform ${
                          isOpen ? "rotate-180" : ""
                        } text-gray-400`}
                      />
                    </button>

                    {isOpen && (
                      <div className="mt-1 space-y-1 pl-6">
                        {item.children.map((child) => {
                          const isChildActive = isLinkActive(child.link);

                          return (
                            <Link
                              to={child.link}
                              key={child.label}
                              onClick={() => keepMenuOpen(item.key)}
                              className={`flex items-center rounded-md px-4 py-2.5 text-base font-semibold transition-colors ${
                                isChildActive
                                  ? "bg-white text-gray-900"
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
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              const isActive = isLinkActive(item.link);
              return (
                <Link
                  to={item.link}
                  key={item.label}
                  onClick={closeAllMenus}
                  className={`flex items-center rounded-md px-4 py-3 font-semibold transition-colors ${
                    isActive
                      ? "bg-white text-gray-900"
                      : "text-white hover:bg-green-800"
                  }`}
                >
                  <item.icon
                    stroke={1.5}
                    className={`mr-4 h-6 w-6 ${
                      isActive ? "text-green-700" : "text-gray-400"
                    }`}
                  />
                  {item.label === "Thông báo" ? (
                    <span className="relative">
                      {item.label}
                      {sidebarNotificationCount > 0 && (
                        <span className="absolute -right-6 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
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

        <div className="mt-6 border-t border-green-800">
          <button
            onClick={() => {
              closeAllMenus();
              handleLogout();
            }}
            disabled={isLoggingOut}
            className={`flex w-full cursor-pointer items-center rounded-md px-4 py-3 text-sm font-medium text-white transition-colors ${
              isLoggingOut
                ? "cursor-not-allowed opacity-60"
                : "hover:bg-green-800"
            }`}
          >
            <IconLogout className="mr-4 h-6 w-6 text-gray-400" stroke={1.5} />
            <span>{isLoggingOut ? "Đang đăng xuất..." : "Đăng xuất"}</span>
          </button>
        </div>
      </nav>

      <main className="flex flex-1 flex-col overflow-hidden bg-white">
        <div className="flex items-center justify-between border-b bg-white p-4 shadow-sm">
          <h1 className="text-xl font-semibold text-green-700">
            {getActiveItemLabel()}
          </h1>
          <div className="flex items-center gap-4">
            <NotificationBell />
          </div>
        </div>

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


