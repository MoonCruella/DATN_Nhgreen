import { axiosPrivate } from "./axios";

const base = "/api/cart";

// Get current user's cart (requires accessToken)
const getCart = (accessToken, params) => {
  const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  return axiosPrivate.get(base, { params, headers }).then((r) => r.data);
};

// Add to cart (requires accessToken)
const addToCart = (accessToken, dish_id, quantity, flashSaleId = null) => {
  const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  const payload = { dish_id, quantity };
  if (flashSaleId) {
    payload.flashSaleId = flashSaleId;
  }
  return axiosPrivate.post(base, payload, { headers }).then((r) => r.data);
};

// Update cart item quantity
const updateCartItem = (accessToken, id, quantity) => {
  const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  return axiosPrivate
    .put(`${base}/${id}`, { quantity }, { headers })
    .then((r) => r.data);
};

// Remove single item
const removeFromCart = (accessToken, id) => {
  const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  return axiosPrivate.delete(`${base}/${id}`, { headers }).then((r) => r.data);
};

// Clear cart
const clearCart = (accessToken) => {
  const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  return axiosPrivate.delete(base, { headers }).then((r) => r.data);
};

// Remove multiple items in batch
const removeMultipleItems = (accessToken, itemIds) => {
  const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  return axiosPrivate
    .delete(`${base}/items/batch`, { headers, data: { itemIds } })
    .then((r) => r.data);
};

export default {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  removeMultipleItems,
};
