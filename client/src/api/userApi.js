import { axiosPrivate } from "./axios";

const base = "/api/users";

// Current user methods
const getMyProfile = (accessToken) => {
  const headers = { Authorization: `Bearer ${accessToken}` };
  return axiosPrivate.get(`${base}/profile`, { headers }).then((r) => r.data);
};

const updateMyProfile = (accessToken, payload) => {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
  };

  // If payload is FormData, remove Content-Type to let browser set it with boundary
  if (payload instanceof FormData) {
    return axiosPrivate
      .put(`${base}/profile`, payload, {
        headers,
        transformRequest: [(data) => data], // Prevent axios from transforming FormData
      })
      .then((r) => r.data);
  }

  // For regular JSON data
  return axiosPrivate
    .put(`${base}/profile`, payload, { headers })
    .then((r) => r.data);
};
const changePassword = (accessToken, data) => {
  const headers = { Authorization: `Bearer ${accessToken}` };
  return axiosPrivate
    .put(`${base}/password`, data, { headers })
    .then((r) => r.data);
};

// Admin methods
const getUserList = (a, b) => {
  let accessToken = null;
  let params = {};

  if (typeof a === "string") {
    accessToken = a;
    params = b || {};
  } else {
    params = a || {};
  }

  const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  return axiosPrivate
    .get(`${base}/admin/list`, { params, headers })
    .then((r) => r.data);
};

const getUserStats = (accessToken) => {
  const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  return axiosPrivate
    .get(`${base}/admin/stats`, { headers })
    .then((r) => r.data);
};

const authHeaders = (accessToken) =>
  accessToken ? { Authorization: `Bearer ${accessToken}` } : {};

const getManagerCustomers = (params = {}, accessToken = null) => {
  return axiosPrivate
    .get(`${base}/manager/customers`, {
      params,
      headers: authHeaders(accessToken),
    })
    .then((r) => r.data);
};

const getCustomerByPhone = (phone, accessToken = null) => {
  return axiosPrivate
    .get(`${base}/manager/customers/phone/${phone}`, {
      headers: authHeaders(accessToken),
    })
    .then((r) => r.data);
};

const createManagerDineInCustomer = (payload, accessToken = null) => {
  return axiosPrivate
    .post(`${base}/manager/customers`, payload, {
      headers: authHeaders(accessToken),
    })
    .then((r) => r.data);
};

const getUserByEmail = (accessToken, email) => {
  const headers = { Authorization: `Bearer ${accessToken}` };
  return axiosPrivate
    .get(`${base}/admin/email/${email}`, { headers })
    .then((r) => r.data);
};

const toggleUserStatus = (accessToken, userId) => {
  const headers = { Authorization: `Bearer ${accessToken}` };
  return axiosPrivate
    .patch(`${base}/admin/toggle-status/${userId}`, {}, { headers })
    .then((r) => r.data);
};

const deleteUser = (accessToken, userId) => {
  const headers = { Authorization: `Bearer ${accessToken}` };
  return axiosPrivate
    .delete(`${base}/admin/${userId}`, { headers })
    .then((r) => r.data);
};

// Protected methods (owner or admin)
const getUserProfile = (accessToken, userId) => {
  const headers = { Authorization: `Bearer ${accessToken}` };
  return axiosPrivate
    .get(`${base}/profile/${userId}`, { headers })
    .then((r) => r.data);
};

const updateUserProfile = (accessToken, userId, payload) => {
  const headers = { Authorization: `Bearer ${accessToken}` };
  return axiosPrivate
    .put(`${base}/profile/${userId}`, payload, { headers })
    .then((r) => r.data);
};

// Ban/Unban methods
const banUser = (accessToken, userId, data) => {
  const headers = { Authorization: `Bearer ${accessToken}` };
  return axiosPrivate
    .post(`${base}/admin/ban/${userId}`, data, { headers })
    .then((r) => r.data);
};

const unbanUser = (accessToken, userId) => {
  const headers = { Authorization: `Bearer ${accessToken}` };
  return axiosPrivate
    .post(`${base}/admin/unban/${userId}`, {}, { headers })
    .then((r) => r.data);
};

const userApi = {
  getMyProfile,
  updateMyProfile,
  changePassword,
  getUserList,
  getManagerCustomers,
  getCustomerByPhone,
  createManagerDineInCustomer,
  getUserStats,
  getUserByEmail,
  toggleUserStatus,
  deleteUser,
  getUserProfile,
  updateUserProfile,
  banUser,
  unbanUser,
};

export default userApi;
