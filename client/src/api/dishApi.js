import { axiosPrivate, axiosPublic } from "./axios";
const base = "/api/dishes";

// getAll supports two call signatures:
// - getAll(params) -> public request
// - getAll(accessToken, params) -> authenticated request (admin)
const getAll = (a, b) => {
  let accessToken = null;
  let params = {};
  if (typeof a === "string") {
    accessToken = a;
    params = b || {};
  } else {
    params = a || {};
  }

  if (accessToken) {
    const headers = { Authorization: `Bearer ${accessToken}` };
    return axiosPrivate.get(base, { params, headers }).then((r) => r.data);
  }

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

const getTopSelling = (params) => {
  // params can include limit, e.g. { limit: 8 }
  return axiosPublic.get(`${base}/top-selling`, { params }).then((r) => r.data);
};

const getNewest = (params) => {
  // params can include limit, e.g. { limit: 8 }
  return axiosPublic.get(`${base}/newest`, { params }).then((r) => r.data);
};

const getByTag = (tag, params) => {
  return axiosPublic.get(`${base}/tags/${tag}`, { params }).then((r) => r.data);
};

const toggleFavorite = (dishId) => {
  return axiosPrivate.post(`${base}/${dishId}/favorite`).then((r) => r.data);
};

const getFavorites = (params) => {
  return axiosPrivate.get(`${base}/favorites`, { params }).then((r) => r.data);
};

export default {
  getAll,
  getById,
  create,
  update,
  remove,
  getTopSelling,
  getNewest,
  getByTag,
  toggleFavorite,
  getFavorites,
};
