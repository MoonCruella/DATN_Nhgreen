import {
  IconBellRinging,
  IconChevronDown,
  IconLogout,
  IconReceipt2,
  IconPackage,
  IconChefHat,
  IconStar,
  IconTable,
} from "@tabler/icons-react";
import { Banknote, Clock3, Utensils, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useDispatch, useSelector } from "react-redux";
import { assets } from "../../assets/assets";
import { logoutUser } from "@/store/auth-slice";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import NotificationBell, { useNotificationCount } from "./NotificationBell";

const formatMoney = (value = 0) =>
  new Intl.NumberFormat("vi-VN").format(Number(value) || 0);

const getOrderTypeText = (order = {}) => {
  const isDineIn =
    order.order_type === "dine_in" ||
    order.order_channel === "dine_in" ||
    order.order_channel === "dine_in_qr" ||
    Boolean(order.table_id || order.table_info);

  return isDineIn ? "Đơn tại bàn" : "Đơn online";
};

const getTableName = (order = {}) =>
  order.table_info?.name || order.table_name || order.table?.name || "bàn";

const formatRelativeTime = (value) => {
  const timestamp = value ? new Date(value).getTime() : Date.now();
  const diffMs = Math.max(Date.now() - timestamp, 0);
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return "Vừa xong";
  if (diffMinutes < 60) return `${diffMinutes} phút trước`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} ngày trước`;
};

const getOrderToastData = (eventType, payload = {}) => {
  if (eventType === "cash_payment_requested") {
    const tableName = getTableName(payload);
    const orderNumber = payload.order_number || payload.order_id;
    const total = payload.total_amount
      ? `, gi\u00e1 tr\u1ecb ${formatMoney(payload.total_amount)}\u0111`
      : "";

    return {
      id: `cash-payment-${payload.order_id || orderNumber}-${payload.created_at || Date.now()}`,
      title: "Y\u00eau c\u1ea7u thanh to\u00e1n t\u1ea1i b\u00e0n",
      badge: "Ti\u1ec1n m\u1eb7t",
      message: `Kh\u00e1ch t\u1ea1i ${tableName} y\u00eau c\u1ea7u thanh to\u00e1n${orderNumber ? ` cho \u0111\u01a1n #${orderNumber}` : ""}${total}.`,
      createdAt: payload.created_at || new Date().toISOString(),
      orderId: payload.order_id,
      navigateTo: "/manager/tables",
      icon: "cash",
    };
  }
  if (eventType === "dine_in_items_added") {
    const tableName = getTableName(payload);
    const orderNumber = payload.order_number || payload.order_id;

    return {
      id: `dine-in-items-added-${payload.order_id || orderNumber}-${payload.created_at || Date.now()}`,
      title: "Kh\u00e1ch g\u1ecdi th\u00eam m\u00f3n",
      badge: "\u0110\u01a1n t\u1ea1i b\u00e0n",
      message: `${tableName} v\u1eeba g\u1ecdi th\u00eam m\u00f3n${orderNumber ? ` cho \u0111\u01a1n #${orderNumber}` : ""}.`,
      createdAt: payload.created_at || new Date().toISOString(),
      orderId: payload.order_id,
      navigateTo: "/manager/notifications",
      icon: "food",
    };
  }
  if (payload.type === "new_order") {
    const order = payload.reference_id || {};
    const orderId =
      order._id ||
      payload.data?.order_id ||
      payload.reference_id ||
      payload._id;
    const typeText =
      payload.data?.order_type === "dine_in"
        ? "Đơn tại bàn"
        : payload.data?.order_type === "online"
          ? "Đơn online"
          : getOrderTypeText(order);
    const tableName =
      payload.data?.table_name || order.table_info?.name || getTableName(order);
    const orderNumber =
      order.order_number || payload.data?.order_number || orderId;
    const total = order.total_amount
      ? `, giá trị ${formatMoney(order.total_amount)}đ`
      : "";

    return {
      id: `new-order-${orderId}`,
      title: typeText === "Đơn tại bàn" ? "Đơn mới tại bàn" : "Đơn online mới",
      badge: typeText,
      message:
        typeText === "Đơn tại bàn"
          ? `Có đơn mới tại ${tableName}${orderNumber ? ` - #${orderNumber}` : ""}${total}.`
          : `Có đơn online mới${orderNumber ? ` - #${orderNumber}` : ""}${total}.`,
      createdAt: payload.created_at,
      orderId,
    };
  }

  if (eventType === "paid") {
    const typeText = getOrderTypeText(payload);
    const orderNumber = payload.order_number || payload.order_id;
    return {
      id: `paid-${payload.order_id || orderNumber}`,
      title: "Đã thanh toán",
      badge: typeText,
      message: `Đơn ${orderNumber ? `#${orderNumber}` : ""} đã thanh toán thành công.`,
      createdAt: new Date().toISOString(),
      orderId: payload.order_id,
    };
  }

  const typeText = getOrderTypeText(payload);
  const tableName = getTableName(payload);
  const orderNumber = payload.order_number || payload._id;
  const total = payload.total_amount
    ? `, giá trị ${formatMoney(payload.total_amount)}đ`
    : "";

  return {
    id: `new-order-${payload._id || orderNumber}`,
    title: typeText === "Đơn tại bàn" ? "Đơn mới tại bàn" : "Đơn online mới",
    badge: typeText,
    message:
      typeText === "Đơn tại bàn"
        ? `Có đơn mới tại ${tableName}${orderNumber ? ` - #${orderNumber}` : ""}${total}.`
        : `Có đơn online mới${orderNumber ? ` - #${orderNumber}` : ""}${total}.`,
    createdAt: payload.created_at || new Date().toISOString(),
    orderId: payload._id,
  };
};

const ManagerOrderToast = ({ data, onClick }) => {
  const Icon = data.icon === "cash" ? Banknote : Utensils;

  return (
    <div className="relative w-[390px] max-w-[calc(100vw-24px)] rounded-lg border border-gray-100 border-l-4 border-l-[#12b957] bg-white py-3 pl-4 pr-9 text-left font-sans shadow-lg shadow-gray-300/40">
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          data.onDismiss?.();
        }}
        className="absolute right-2.5 top-2.5 rounded-full p-1 text-slate-400 transition hover:bg-gray-100 hover:text-slate-700"
        aria-label="Đóng thông báo"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <button
        type="button"
        onClick={onClick}
        className="flex w-full gap-3 text-left font-sans"
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-50 text-[#009f6b]">
          <Icon className="h-6 w-6" strokeWidth={2.2} />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold leading-5 text-slate-950">
            {data.title}
          </h3>
          <span className="mt-1.5 inline-flex rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-bold leading-5 text-[#009f6b]">
            {data.badge}
          </span>
          <p className="mt-1.5 text-sm font-medium leading-5 text-slate-700">
            {data.message}
          </p>
          <div className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <Clock3 className="h-3.5 w-3.5" />
            <span>{formatRelativeTime(data.createdAt)}</span>
          </div>
        </div>
      </button>
    </div>
  );
};

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
  const shownToastIdsRef = useRef(new Set());

  const isLinkActive = (link) =>
    activePath === link || activePath.startsWith(link + "/");

  const closeAllMenus = () => {
    setOpenMenus((prev) =>
      Object.fromEntries(Object.keys(prev).map((key) => [key, false])),
    );
  };

  const toggleMenu = (menuKey, isOpen) => {
    setOpenMenus((prev) =>
      Object.fromEntries(
        Object.keys(prev).map((key) => [
          key,
          key === menuKey ? !isOpen : false,
        ]),
      ),
    );
  };

  const keepMenuOpen = (menuKey) => {
    setOpenMenus((prev) =>
      Object.fromEntries(
        Object.keys(prev).map((key) => [key, key === menuKey]),
      ),
    );
  };

  const getActiveItemLabel = () => {
    for (const item of data) {
      if (item.children) {
        const activeChild = item.children.find((child) =>
          isLinkActive(child.link),
        );
        if (activeChild) return activeChild.label;
      }

      if (item.link && isLinkActive(item.link)) return item.label;
    }

    return "Dashboard";
  };

  const showManagerOrderToast = (eventType, payload) => {
    const toastData = getOrderToastData(eventType, payload);
    if (!toastData?.id || shownToastIdsRef.current.has(toastData.id)) return;

    shownToastIdsRef.current.add(toastData.id);
    window.setTimeout(() => {
      shownToastIdsRef.current.delete(toastData.id);
    }, 15000);

    toast.custom(
      (toastId) => (
        <ManagerOrderToast
          data={{
            ...toastData,
            onDismiss: () => toast.dismiss(toastId),
          }}
          onClick={() => {
            toast.dismiss(toastId);
            if (toastData.navigateTo) {
              navigate(toastData.navigateTo);
            } else if (toastData.badge === "Đơn tại bàn") {
              navigate("/manager/tables");
            } else if (toastData.orderId) {
              navigate(`/manager/orders/${toastData.orderId}`);
            }
          }}
        />
      ),
      { duration: 7000, id: toastData.id },
    );
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    const loadingToast = toast.loading("Đang đăng xuất...");
    try {
      await dispatch(logoutUser()).unwrap();
      toast.success("Đăng xuất thành công", { id: loadingToast });
      navigate("/auth/login");
    } catch {
      toast.error("Có lỗi xảy ra khi đăng xuất", { id: loadingToast });
    } finally {
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

    socket.on("new_order", (order) => {
      showManagerOrderToast("new_order", order);
    });

    socket.on("new_notification", (notification) => {
      if (notification?.type === "new_order") {
        showManagerOrderToast("notification", notification);
      }
    });

    socket.on("dine_in_order_paid", (data) => {
      showManagerOrderToast("paid", data);
    });

    socket.on("dine_in_cash_payment_requested", (data) => {
      showManagerOrderToast("cash_payment_requested", data);
    });

    socket.on("dine_in_items_added", (data) => {
      showManagerOrderToast("dine_in_items_added", data);
    });

    socket.on("order_status_updated", (data) => {
      if (data?.updates?.payment_status === "paid") {
        showManagerOrderToast("paid", data);
      }
    });

    return () => {
      socket.off("new_order");
      socket.off("new_notification");
      socket.off("dine_in_order_paid");
      socket.off("dine_in_cash_payment_requested");
      socket.off("dine_in_items_added");
      socket.off("order_status_updated");
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
