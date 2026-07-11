import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { io } from "socket.io-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import notificationApi from "@/api/notificationApi";
import { useNotificationCount } from "@/components/manager-view/NotificationBell";
import {
  Bell,
  Package,
  CheckCircle,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Star,
  AlertTriangle,
  Utensils,
} from "lucide-react";

const MaNotifications = () => {
  const navigate = useNavigate();
  const accessToken = useSelector((state) => state.auth.accessToken);
  const user = useSelector((state) => state.auth.user);
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
    currentPage: 1,
    limit: 10,
  });
  const { refresh: refreshUnread } = useNotificationCount();

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      toast.error("Vui lòng đăng nhập để tiếp tục");
      navigate("/auth/login");
      return;
    }

    if (user?.role !== "manager") {
      toast.error("Bạn không có quyền truy cập trang này");
      navigate("/");
      return;
    }
  }, [isAuthenticated, accessToken, user, navigate]);

  // Initialize Socket.IO for real-time notifications
  useEffect(() => {
    if (!accessToken) return;

    const newSocket = io(
      import.meta.env.VITE_API_BASE_URL,
      {
        auth: { token: accessToken },
        transports: ["websocket", "polling"],
      }
    );

    newSocket.on("connect", () => {
      console.log("✅ Notification socket connected");
    });

    newSocket.on("connect_error", (error) => {
      console.error("❌ Socket connection error:", error);
    });

    newSocket.on("new_notification", (notification) => {
      setNotifications((prev) => [notification, ...prev]);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [accessToken]);

  const fetchNotifications = async (pageNum = 1) => {
    if (!accessToken || !isAuthenticated) return;

    try {
      setLoading(true);
      const response = await notificationApi.getNotifications(
        accessToken,
        pageNum,
        10
      );

      if (response.success) {
        setNotifications(response.data.notifications || []);
        setPagination(response.data.pagination || pagination);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
      toast.error("Lỗi tải danh sách thông báo");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications(page);
  }, [page, accessToken, isAuthenticated]);

  const handleMarkAsRead = async (notificationId) => {
    try {
      const response = await notificationApi.markAsRead(
        accessToken,
        notificationId
      );

      if (response.success) {
        setNotifications((prev) =>
          prev.map((notif) =>
            notif._id === notificationId ? { ...notif, is_read: true } : notif
          )
        );
        refreshUnread();
      }
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      const response = await notificationApi.markAllAsRead(accessToken);

      if (response.success) {
        setNotifications((prev) =>
          prev.map((notif) => ({ ...notif, is_read: true }))
        );
        toast.success("Đã đánh dấu tất cả thông báo là đã đọc");
        refreshUnread();
      }
    } catch (error) {
      console.error("Error marking all as read:", error);
      toast.error("Lỗi khi đánh dấu thông báo");
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "new_order":
        return <Package className="w-5 h-5 text-green-600" />;
      case "order_status":
        return <Clock className="w-5 h-5 text-orange-600" />;
      case "order_confirmed":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "order_cancelled":
      case "cancel_request":
      case "order_cancelled_branch":
        return <XCircle className="w-5 h-5 text-red-600" />;
      case "not_received_report":
        return <AlertTriangle className="w-5 h-5 text-orange-600" />;
      case "new_rating":
        return <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-600" />;
    }
  };

  const formatDateTime = (date) => {
    const now = new Date();
    const notifDate = new Date(date);
    const diffInMs = now - notifDate;
    const diffInMinutes = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) return "Vừa xong";
    if (diffInMinutes < 60) return `${diffInMinutes} phút trước`;
    if (diffInHours < 24) return `${diffInHours} giờ trước`;
    if (diffInDays < 7) return `${diffInDays} ngày trước`;

    return new Date(date).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getReferenceOrder = (notification) =>
    notification.reference_model === "Order" &&
    notification.reference_id &&
    typeof notification.reference_id === "object"
      ? notification.reference_id
      : null;

  const getReferenceId = (notification) => {
    const reference = notification.reference_id;
    if (!reference) return notification.metadata?.order_id || "";
    if (typeof reference === "object") {
      return reference._id || notification.metadata?.order_id || "";
    }
    return reference;
  };

  const isDineInOrderNotification = (notification) => {
    const metadata = notification.metadata || {};
    const referenceOrder = getReferenceOrder(notification);

    return (
      metadata.order_type === "dine_in" ||
      metadata.order_channel === "dine-in" ||
      metadata.order_channel === "dine_in" ||
      metadata.order_channel === "dine_in_qr" ||
      referenceOrder?.order_type === "dine_in" ||
      referenceOrder?.order_channel === "dine_in" ||
      referenceOrder?.order_channel === "dine_in_qr" ||
      Boolean(metadata.table_id || referenceOrder?.table_id)
    );
  };

  const getOrderKindBadge = (notification) => {
    if (notification.reference_model !== "Order") return null;

    const dineIn = isDineInOrderNotification(notification);
    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${
          dineIn
            ? "bg-emerald-50 text-emerald-700"
            : "bg-sky-50 text-sky-700"
        }`}
      >
        {dineIn ? "Đơn tại bàn" : "Đơn online"}
      </span>
    );
  };

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      handleMarkAsRead(notification._id);
    }

    // Navigate based on notification type
    if (notification.reference_model === "Order") {
      if (isDineInOrderNotification(notification)) {
        navigate("/manager/orders/dine-in");
        return;
      }

      const orderId = getReferenceId(notification);
      if (orderId) {
        navigate(`/manager/orders/${orderId}`);
      } else {
        navigate("/manager/orders/online");
      }
    } else if (notification.reference_model === "Rating" && notification.reference_id) {
      navigate(`/manager/ratings`);
    }
  };

  if (loading && page === 1) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải thông báo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Bell className="w-6 h-6 text-gray-700" />
            <h1 className="text-2xl font-bold text-gray-800">Thông báo</h1>
            {notifications.filter((n) => !n.is_read).length > 0 && (
              <Badge className="bg-red-500 text-white">
                {notifications.filter((n) => !n.is_read).length} mới
              </Badge>
            )}
          </div>
          <Button
            onClick={handleMarkAllAsRead}
            variant="outline"
            className="cursor-pointer"
            disabled={notifications.every((n) => n.is_read)}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Đánh dấu tất cả đã đọc
          </Button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center">
            <Bell className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 text-lg">Không có thông báo nào</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification._id}
              onClick={() => handleNotificationClick(notification)}
              className={`bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-all cursor-pointer ${
                !notification.is_read ? "border-l-4 border-green-500" : ""
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div
                  className={`p-3 rounded-full ${
                    !notification.is_read ? "bg-green-50" : "bg-gray-50"
                  }`}
                >
                  {isDineInOrderNotification(notification) ? (
                    <Utensils className="w-5 h-5 text-emerald-600" />
                  ) : (
                    getNotificationIcon(notification.type)
                  )}
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3
                        className={`font-semibold text-gray-900 mb-1 ${
                          !notification.is_read ? "font-bold" : ""
                        }`}
                      >
                        {notification.title}
                      </h3>
                      {getOrderKindBadge(notification) && (
                        <div className="mb-2">
                          {getOrderKindBadge(notification)}
                        </div>
                      )}
                      <p className="text-sm text-gray-600 mb-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        {formatDateTime(notification.created_at)}
                      </div>
                    </div>

                    {/* Unread indicator */}
                    {!notification.is_read && (
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="bg-white rounded-xl shadow-sm p-4 mt-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Hiển thị trang {pagination.currentPage} / {pagination.totalPages}{" "}
              (Tổng: {pagination.total} thông báo)
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                variant="outline"
                size="sm"
                className="cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                Trước
              </Button>
              <div className="flex items-center gap-1">
                {[...Array(pagination.totalPages)].map((_, idx) => {
                  const pageNum = idx + 1;
                  // Show first, last, current, and adjacent pages
                  if (
                    pageNum === 1 ||
                    pageNum === pagination.totalPages ||
                    Math.abs(pageNum - page) <= 1
                  ) {
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`px-3 py-1 rounded text-sm ${
                          page === pageNum
                            ? "bg-green-600 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  } else if (Math.abs(pageNum - page) === 2) {
                    return (
                      <span key={pageNum} className="px-2 text-gray-400">
                        ...
                      </span>
                    );
                  }
                  return null;
                })}
              </div>
              <Button
                onClick={() =>
                  setPage((p) => Math.min(pagination.totalPages, p + 1))
                }
                disabled={page === pagination.totalPages}
                variant="outline"
                size="sm"
                className="cursor-pointer"
              >
                Sau
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaNotifications;


