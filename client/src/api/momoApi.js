import { axiosPrivate } from "./axios";

const momoApi = {
  // Tao thanh toan MoMo
  createPayment: async (accessToken, orderId, amount, orderInfo, options = {}) => {
    try {
      const response = await axiosPrivate.post(
        "/api/momo/payment",
        { orderId, amount, orderInfo, ...options },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (response.data?.success && response.data?.data?.paymentUrl) {
        return { success: true, data: response.data.data };
      }
      throw new Error("Khong nhan duoc URL thanh toan tu MoMo");
    } catch (error) {
      console.error("MoMo createPayment error:", error);
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Loi thanh toan MoMo",
      };
    }
  },
};

export default momoApi;
