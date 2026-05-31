import { axiosPrivate, axiosPublic } from "./axios";

const base = "/api/categories";

const categoryApi = {
  getAll: async (params = {}) => {
    const res = await axiosPublic.get(base, { params });
    return res.data;
  },
  getById: async (id) => {
    const res = await axiosPublic.get(`${base}/${id}`);
    return res.data;
  },
  create: async (accessToken, payload) => {
    const headers = accessToken
      ? { Authorization: `Bearer ${accessToken}` }
      : undefined;
    const res = await axiosPrivate.post(base, payload, { headers });
    return res.data;
  },
  update: async (accessToken, id, payload) => {
    const headers = accessToken
      ? { Authorization: `Bearer ${accessToken}` }
      : undefined;
    const res = await axiosPrivate.put(`${base}/${id}`, payload, { headers });
    return res.data;
  },
  remove: async (accessToken, id) => {
    const headers = accessToken
      ? { Authorization: `Bearer ${accessToken}` }
      : undefined;
    const res = await axiosPrivate.delete(`${base}/${id}`, { headers });
    return res.data;
  },
};

export default categoryApi;
