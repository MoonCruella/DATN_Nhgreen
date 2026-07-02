import { axiosPrivate, axiosPublic } from "./axios";

const base = "/api/ingredients";

const ingredientApi = {
  getAll: async (accessToken, params = {}) => {
    const headers = accessToken
      ? { Authorization: `Bearer ${accessToken}` }
      : undefined;
    const client = accessToken ? axiosPrivate : axiosPublic;
    const res = await client.get(base, { params, headers });
    return res.data;
  },
  getById: async (accessToken, id) => {
    const headers = accessToken
      ? { Authorization: `Bearer ${accessToken}` }
      : undefined;
    const res = await axiosPrivate.get(`${base}/${id}`, { headers });
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

export default ingredientApi;
