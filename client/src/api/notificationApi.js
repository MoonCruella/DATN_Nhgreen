import { axiosPrivate } from "./axios";

const notificationApi = {
  // Get notifications with pagination
  getNotifications: async (accessToken, page = 1, limit = 10) => {
    const response = await axiosPrivate.get("/api/notifications", {
      params: { page, limit },
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data;
  },

  // Get unread count
  getUnreadCount: async (accessToken) => {
    const response = await axiosPrivate.get("/api/notifications/unread-count", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data;
  },

  // Mark as read
  markAsRead: async (accessToken, notificationId) => {
    const response = await axiosPrivate.patch(
      `/api/notifications/${notificationId}/read`,
      {},
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    return response.data;
  },

  // Mark all as read
  markAllAsRead: async (accessToken) => {
    const response = await axiosPrivate.patch(
      "/api/notifications/read-all",
      {},
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    return response.data;
  },
};

export default notificationApi;
