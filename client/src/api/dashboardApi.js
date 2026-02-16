import { axiosPrivate } from "./axios";
const base = "/api/dashboard";
export const dashboardApi = {
  // Get manager dashboard statistics
  getManagerDashboard: async (accessToken, params) => {
    const headers = accessToken
      ? { Authorization: `Bearer ${accessToken}` }
      : undefined;
    const res = await axiosPrivate.get(`${base}/manager`, {
      params,
      headers,
    });
    return res.data;
  },

  // Get top selling dishes with pagination
  getTopSellingDishes: async (accessToken, params) => {
    const headers = accessToken
      ? { Authorization: `Bearer ${accessToken}` }
      : undefined;
    const res = await axiosPrivate.get(`${base}/manager/top-dishes`, {
      params,
      headers,
    });
    return res.data;
  },

  // Get admin dashboard statistics (all branches)
  getAdminDashboard: async (accessToken, params) => {
    const headers = accessToken
      ? { Authorization: `Bearer ${accessToken}` }
      : undefined;
    const res = await axiosPrivate.get(`${base}/admin`, {
      params,
      headers,
    });
    return res.data;
  },

  // Get admin top selling dishes (all branches, include inactive)
  getAdminTopSellingDishes: async (accessToken, params) => {
    const headers = accessToken
      ? { Authorization: `Bearer ${accessToken}` }
      : undefined;
    const res = await axiosPrivate.get(`${base}/admin/top-dishes`, {
      params,
      headers,
    });
    return res.data;
  },
};
