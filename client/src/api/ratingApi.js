import { axiosPrivate, axiosPublic } from "./axios";

const base = "/api/ratings";

// Create a new rating (requires auth)
const create = (accessToken, payload) => {
  const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  return axiosPrivate.post(base, payload, { headers }).then((r) => r.data);
};

// Admin: get all ratings (filters + pagination) - requires auth
const getAll = (accessToken, params) => {
  const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  return axiosPrivate.get(base, { params, headers }).then((r) => r.data);
};

// Public: get ratings for a specific dish
const getByDish = (dishId, params) => {
  return axiosPublic
    .get(`${base}/dish/${dishId}`, { params })
    .then((r) => r.data);
};

// Public: get average rating for a dish
const getDishAverage = (dishId) => {
  return axiosPublic.get(`${base}/dish/${dishId}/average`).then((r) => r.data);
};

const checkUserRating = (accessToken, dishId, orderId) => {
  const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  return axiosPrivate
    .get(`${base}/dish/${dishId}/check?order_id=${orderId}`, { headers })
    .then((r) => r.data);
};

const getOrderRatings = (accessToken, orderId) => {
  const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  return axiosPrivate
    .get(`${base}/order/${orderId}`, { headers })
    .then((r) => r.data);
};

// Update rating (auth required)
const update = (accessToken, id, payload) => {
  const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  return axiosPrivate
    .put(`${base}/${id}`, payload, { headers })
    .then((r) => r.data);
};

// Delete rating (auth required)
const remove = (accessToken, id) => {
  const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  return axiosPrivate.delete(`${base}/${id}`, { headers }).then((r) => r.data);
};

// Manager: get all ratings (filters + pagination) - requires manager auth
const getAllForManager = (accessToken, params) => {
  const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  return axiosPrivate.get(`${base}/manager/all`, { params, headers }).then((r) => r.data);
};

// Manager: update rating status (visible/hidden) - requires manager auth
const updateStatusForManager = (accessToken, id, status) => {
  const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  return axiosPrivate
    .patch(`${base}/manager/${id}/status`, { status }, { headers })
    .then((r) => r.data);
};

export default {
  create,
  getAll,
  getOrderRatings,
  getByDish,
  getDishAverage,
  checkUserRating,
  update,
  remove,
  getAllForManager,
  updateStatusForManager,
};