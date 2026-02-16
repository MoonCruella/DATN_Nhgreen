import React, { useEffect, useState, useRef } from "react";
import { useSelector } from "react-redux";
import { io } from "socket.io-client";
import { useNavigate } from "react-router-dom";
import notificationApi from "@/api/notificationApi";
import { Bell, Package, X, CheckCheck } from "lucide-react";

const NotificationPopup = () => {
  const navigate = useNavigate();
  const { accessToken, isAuthenticated } = useSelector((state) => state.auth);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const popupRef = useRef(null);
  const observerRef = useRef(null);

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Fetch unread count
  const fetchUnreadCount = async () => {
    if (!accessToken) return;
    try {
      const response = await notificationApi.getUnreadCount(accessToken);
      if (response.success) {
        setUnreadCount(response.data.count || 0);
      }
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  };

  // Fetch notifications
  const fetchNotifications = async (pageNum = 1, append = false) => {
    if (!accessToken || loading) return;

    try {
      setLoading(true);
      const response = await notificationApi.getNotifications(
        accessToken,
        pageNum,
        10
      );

      if (response.success) {
        const newNotifs = response.data.notifications || [];

        if (append) {
          setNotifications((prev) => [...prev, ...newNotifs]);
        } else {
          setNotifications(newNotifs);
        }

        setHasMore(
          response.data.pagination?.currentPage <
            response.data.pagination?.totalPages
        );
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (isAuthenticated && accessToken) {
      fetchUnreadCount();
    }
  }, [isAuthenticated, accessToken]);

  // Socket for realtime updates
  useEffect(() => {
    if (!accessToken || !isAuthenticated) return;

    const socket = io(import.meta.env.VITE_API_BASE_URL, {
      auth: { token: accessToken },
      transports: ["websocket", "polling"],
    });

    socket.on("new_notification", (notification) => {
      console.log("📬 New notification received:", notification);
      setUnreadCount((prev) => prev + 1);

      // Add to list if popup is open
      if (isOpen) {
        setNotifications((prev) => [notification, ...prev]);
      }
    });

    socket.on("notification_count", (data) => {
      if (typeof data?.count === "number") {
        setUnreadCount(data.count);
      }
    });

    return () => socket.disconnect();
  }, [accessToken, isAuthenticated, isOpen]);

  // Load notifications when popup opens
  useEffect(() => {
    if (isOpen) {
      setPage(1);
      fetchNotifications(1, false);
    }
  }, [isOpen]);

  // Lazy loading with Intersection Observer
  useEffect(() => {
    if (!isOpen || !hasMore || loading) return;

    const lastNotifElement = document.getElementById("last-notification");
    if (!lastNotifElement) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchNotifications(nextPage, true);
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(lastNotifElement);
    observerRef.current = observer;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [isOpen, hasMore, loading, page, notifications.length]);

  // Mark as read
  const handleMarkAsRead = async (notificationId) => {
    if (!accessToken) return;

    try {
      await notificationApi.markAsRead(accessToken, notificationId);

      setNotifications((prev) =>
        prev.map((n) =>
          n._id === notificationId ? { ...n, is_read: true } : n
        )
      );

      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    if (!accessToken) return;

    try {
      await notificationApi.markAllAsRead(accessToken);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      handleMarkAsRead(notification._id);
    }

    // Navigate based on notification type
    if (notification.reference_model === "Order" && notification.reference_id) {
      navigate(`/my-account/orders`);
      setIsOpen(false);
    }
  };

  // Format time
  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / 1000 / 60);
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

  // Get notification icon
  const getNotificationIcon = (type) => {
    switch (type) {
      case "order_status":
      case "new_order":
        return <Package className="w-5 h-5 text-green-600" />;
      default:
        return <Bell className="w-5 h-5 text-blue-600" />;
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="relative" ref={popupRef}>
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center justify-center h-10 w-10 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-gray-700" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Popup */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[500px] flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Thông báo</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  Đánh dấu tất cả đã đọc
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-gray-500">
                <Bell className="w-12 h-12 text-gray-300 mb-2" />
                <p className="text-sm">Chưa có thông báo nào</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification, index) => (
                  <div
                    key={notification._id}
                    id={
                      index === notifications.length - 1
                        ? "last-notification"
                        : undefined
                    }
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 cursor-pointer transition-colors ${
                      notification.is_read
                        ? "bg-white hover:bg-gray-50"
                        : "bg-blue-50 hover:bg-blue-100"
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 mb-1">
                          {notification.title}
                        </p>
                        <p className="text-sm text-gray-600 mb-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            {formatTime(notification.created_at)}
                          </span>
                          {!notification.is_read && (
                            <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Loading indicator for lazy load */}
                {loading && notifications.length > 0 && (
                  <div className="flex items-center justify-center p-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
                  </div>
                )}

                {/* End of list indicator */}
                {!hasMore && notifications.length > 0 && (
                  <div className="p-4 text-center text-xs text-gray-400">
                    Đã hiển thị tất cả thông báo
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationPopup;
