import { axiosPrivate } from "./axios";

const zalopayApi = {
  // Tạo thanh toán ZaloPay
  createPayment: async (accessToken, orderId, amount, description) => {
    try {
      const response = await axiosPrivate.post(
        "/api/zalopay/payment",
        {
          orderId,
          amount,
          description,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (response.data?.success && response.data?.data) {
        return { success: true, data: response.data.data };
      } else {
        throw new Error("Không nhận được URL thanh toán từ ZaloPay");
      }
    } catch (error) {
      console.error("ZaloPay createPayment error:", error);
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Lỗi thanh toán ZaloPay",
      };
    }
  },

  // Truy vấn trạng thái thanh toán
  queryStatus: async (accessToken, appTransId) => {
    try {
      const response = await axiosPrivate.get("/api/zalopay/query", {
        params: { appTransId },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return { success: true, data: response.data.data };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Lỗi truy vấn ZaloPay",
      };
    }
  },
};

export default zalopayApi;
