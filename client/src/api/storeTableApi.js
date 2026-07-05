import { axiosPrivate } from "./axios";

const authHeaders = (accessToken) =>
  accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;

const storeTableApi = {
  getAll: async (accessToken, params = {}) => {
    const res = await axiosPrivate.get("/api/store-tables", {
      params,
      headers: authHeaders(accessToken),
    });
    return res.data;
  },

  create: async (accessToken, payload) => {
    const res = await axiosPrivate.post("/api/store-tables", payload, {
      headers: authHeaders(accessToken),
    });
    return res.data;
  },

  update: async (accessToken, id, payload) => {
    const res = await axiosPrivate.put(`/api/store-tables/${id}`, payload, {
      headers: authHeaders(accessToken),
    });
    return res.data;
  },

  transferOrder: async (accessToken, sourceTableId, targetTableId) => {
    const res = await axiosPrivate.post(
      `/api/store-tables/${sourceTableId}/transfer`,
      { target_table_id: targetTableId },
      { headers: authHeaders(accessToken) },
    );
    return res.data;
  },

  remove: async (accessToken, id) => {
    const res = await axiosPrivate.delete(`/api/store-tables/${id}`, {
      headers: authHeaders(accessToken),
    });
    return res.data;
  },

};

export default storeTableApi;
