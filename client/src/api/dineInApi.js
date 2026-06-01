import { axiosPublic } from "./axios";

const dineInApi = {
  scanQr: async (qrToken) => {
    const response = await axiosPublic.get(`/api/dine-in/scan/${qrToken}`);
    return response.data;
  },

  createSession: async (qrToken, guestInfo = {}) => {
    const response = await axiosPublic.post("/api/dine-in/sessions", {
      qr_token: qrToken,
      guest_info: guestInfo,
    });
    return response.data;
  },

  getSession: async (sessionToken) => {
    const response = await axiosPublic.get(
      `/api/dine-in/sessions/${sessionToken}`,
    );
    return response.data;
  },

  updateCart: async (sessionToken, cartItems) => {
    const response = await axiosPublic.put(
      `/api/dine-in/sessions/${sessionToken}/cart`,
      { cart_items: cartItems },
    );
    return response.data;
  },

  createOrder: async ({ sessionToken, sessionId, tableId, items, notes = "" }) => {
    const response = await axiosPublic.post("/api/orders", {
      order_channel: "dine_in_qr",
      order_type: "dine_in",
      dine_in_session_token: sessionToken,
      dine_in_session_id: sessionId,
      table_id: tableId,
      payment_method: "cod",
      shipping_fee: 0,
      notes,
      items: items.map((item) => ({
        dish_id: item.dish_id,
        quantity: item.quantity,
        variant: item.variant || {},
      })),
    });
    return response.data;
  },
};

export default dineInApi;
