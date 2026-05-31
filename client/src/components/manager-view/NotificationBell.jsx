import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { io } from "socket.io-client";
import { IconBellRinging } from "@tabler/icons-react";
import notificationApi from "@/api/notificationApi";
import { useNavigate } from "react-router-dom";

// Singleton subscribers to sync notification count across multiple hook instances
const _notificationSubscribers = new Set();
let _currentNotificationCount = 0;

const broadcastCount = (val) => {
  _currentNotificationCount = val;
  _notificationSubscribers.forEach((fn) => fn(val));
};

export const useNotificationCount = () => {
  const accessToken = useSelector((state) => state.auth.accessToken);
  const [count, setCount] = useState(_currentNotificationCount);

  useEffect(() => {
    const listener = (val) => setCount(val);
    _notificationSubscribers.add(listener);
    setCount(_currentNotificationCount);
    return () => _notificationSubscribers.delete(listener);
  }, []);

  const refresh = async () => {
    if (!accessToken) return;
    try {
      const response = await notificationApi.getUnreadCount(accessToken);
      if (response.success && typeof response.data.count === "number") {
        broadcastCount(response.data.count);
      }
    } catch (_) {
      /* silent */
    }
  };

  useEffect(() => {
    refresh();
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) return;
    const socket = io(import.meta.env.VITE_API_BASE_URL, {
      auth: { token: accessToken },
      transports: ["websocket", "polling"],
    });

    socket.on("new_notification", () => {
      broadcastCount(_currentNotificationCount + 1);
    });
    socket.on("notification_count", (data) => {
      if (typeof data?.count === "number") broadcastCount(data.count);
    });

    return () => socket.disconnect();
  }, [accessToken]);

  return { count, refresh };
};

const NotificationBell = () => {
  const navigate = useNavigate();
  const { count } = useNotificationCount();

  return (
    <button
      onClick={() => navigate("/manager/notifications")}
      className="relative p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
    >
      <IconBellRinging className="w-6 h-6 text-gray-700" stroke={1.5} />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </button>
  );
};

export default NotificationBell;
