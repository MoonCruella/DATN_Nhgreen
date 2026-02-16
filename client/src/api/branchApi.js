import { axiosPrivate, axiosPublic } from "./axios";

const branchApi = {
  getAll: async (params = {}) => {
    const res = await axiosPublic.get(`/api/branches`, { params });
    return res.data;
  },
  getById: async (id) => {
    const res = await axiosPublic.get(`/api/branches/${id}`);
    return res.data;
  },
  create: async (accessToken, payload) => {
    const headers = accessToken
      ? { Authorization: `Bearer ${accessToken}` }
      : undefined;
    const res = await axiosPrivate.post(`/api/branches`, payload, { headers });
    return res.data;
  },
  update: async (accessToken, id, payload) => {
    const headers = accessToken
      ? { Authorization: `Bearer ${accessToken}` }
      : undefined;
    const res = await axiosPrivate.put(`/api/branches/${id}`, payload, {
      headers,
    });
    return res.data;
  },
  remove: async (accessToken, id) => {
    const headers = accessToken
      ? { Authorization: `Bearer ${accessToken}` }
      : undefined;
    const res = await axiosPrivate.delete(`/api/branches/${id}`, { headers });
    return res.data;
  },

  // Get dishes of a branch with availability status
  getBranchDishes: async (branchId, params = {}) => {
    const response = await axiosPublic.get(`/api/branches/${branchId}/dishes`, {
      params,
    });
    return response.data;
  },

  // Update dish status at branch
  updateDishStatus: async (token, branchId, dishId, isAvailable) => {
    const response = await axiosPublic.put(
      `/api/branches/${branchId}/dishes/${dishId}/status`,
      { isAvailable },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },

  // Check dishes availability at branch
  checkDishesAvailability: async (branchId, dishIds) => {
    const response = await axiosPublic.post(
      `/api/branches/${branchId}/dishes/check-availability`,
      { dishIds }
    );
    return response.data;
  },

  // Create manager account for branch
  createManager: async (accessToken, branchId, payload) => {
    const headers = accessToken
      ? { Authorization: `Bearer ${accessToken}` }
      : undefined;
    const res = await axiosPrivate.post(
      `/api/branches/${branchId}/create-manager`,
      payload,
      { headers }
    );
    return res.data;
  },

  // Get managers of branch
  getManagers: async (accessToken, branchId) => {
    const headers = accessToken
      ? { Authorization: `Bearer ${accessToken}` }
      : undefined;
    const res = await axiosPrivate.get(`/api/branches/${branchId}/managers`, {
      headers,
    });
    return res.data;
  },
};

export default branchApi;
