import { axiosPrivate } from "./axios";

const base = "/api/support-chat";

// Start a new conversation (customer only, always with admin)
const startConversation = (accessToken) => {
  const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  return axiosPrivate
    .post(`${base}/conversation/start`, {}, { headers })
    .then((r) => r.data);
};

// Send a message
const sendMessage = (accessToken, payload) => {
  const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  return axiosPrivate
    .post(`${base}/message/send`, payload, { headers })
    .then((r) => r.data);
};

// Get messages for a conversation
const getMessages = (accessToken, conversationId, params) => {
  const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  return axiosPrivate
    .get(`${base}/conversation/${conversationId}/messages`, { params, headers })
    .then((r) => r.data);
};

// Get all conversations (user: only with admin, admin: only with customer)
const getConversations = (accessToken, params = {}) => {
  const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  const safeParams = { ...params };
  delete safeParams.userId;
  return axiosPrivate
    .get(`${base}/conversations`, { params: safeParams, headers })
    .then((r) => r.data);
};

// Close a conversation (admin/manager only)
const closeConversation = (accessToken, conversationId) => {
  const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  return axiosPrivate
    .patch(`${base}/conversation/${conversationId}/close`, {}, { headers })
    .then((r) => r.data);
};

// Get stats (admin/manager only)
const getStats = (accessToken) => {
  const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  return axiosPrivate.get(`${base}/stats`, { headers }).then((r) => r.data);
};

// Mark messages as read for admin
const markAsReadAdmin = (accessToken, conversationId) => {
  const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  return axiosPrivate
    .patch(`${base}/conversation/${conversationId}/mark-read-admin`, {}, { headers })
    .then((r) => r.data);
};

export default {
  startConversation,
  sendMessage,
  getMessages,
  getConversations,
  closeConversation,
  getStats,
  markAsReadAdmin,
};