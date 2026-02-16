import { axiosPrivate } from "./axios";

const vnpayApi = {
  // Tạo thanh toán VNPay
  createPayment: async (accessToken, orderId, amount) => {
    try {
      const response = await axiosPrivate.post(
        "/api/vnpay/payment",
        { orderId, amount },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (response.data?.data?.paymentUrl) {
        return { success: true, url: response.data.data.paymentUrl };
      } else {
        throw new Error("Không nhận được URL thanh toán từ VNPay");
      }
    } catch (error) {
      console.error("VNPay createPayment error:", error);
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Lỗi thanh toán VNPay",
      };
    }
  },
};

export default vnpayApi;
