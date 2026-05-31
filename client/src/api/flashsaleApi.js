import { axiosPrivate, axiosPublic } from "./axios";

const base = "/api/flashsales";

// List with pagination & filters
const getAll = (params) => {
  // params: { page, limit, status, q, startAfter, startBefore, sortBy, sortDir }
  return axiosPublic.get(base, { params }).then((r) => r.data);
};

const getById = (id) => {
  return axiosPublic.get(`${base}/${id}`).then((r) => r.data);
};

const create = (accessToken, payload) => {
  const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  return axiosPrivate.post(base, payload, { headers }).then((r) => r.data);
};

const update = (accessToken, id, payload) => {
  const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  return axiosPrivate
    .put(`${base}/${id}`, payload, { headers })
    .then((r) => r.data);
};

const remove = (accessToken, id) => {
  const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  return axiosPrivate.delete(`${base}/${id}`, { headers }).then((r) => r.data);
};

const getActive = () => {
  return axiosPublic.get(`${base}/active`).then((r) => r.data);
};

const getNearest = () => {
  return axiosPublic.get(`${base}/nearest`).then((r) => r.data);
};

const getStatistics = (id) => {
  return axiosPublic.get(`${base}/${id}/statistics`).then((r) => r.data);
};

const updateSold = (accessToken, id, dish_id, quantity) => {
  const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  return axiosPrivate
    .post(`${base}/${id}/sold`, { dish_id, quantity }, { headers })
    .then((r) => r.data);
};

export default {
  getAll,
  getById,
  create,
  update,
  remove,
  getActive,
  getNearest,
  getStatistics,
  updateSold,
};
