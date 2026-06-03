import { axiosPrivate } from "./axios";

const orderApi = {
  // Tạo đơn hàng mới
  createOrder: async (accessToken, orderData) => {
    const response = await axiosPrivate.post("/api/orders", orderData, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });
    if (response.data.success) {
      return {
        success: true,
        data: response.data.data,
        message: response.data.message || "Đặt hàng thành công",
      };
    } else {
      throw new Error(response.data.message || "Không thể tạo đơn hàng");
    }
  },

  // Lấy danh sách đơn hàng của user (có filter & pagination)
  getUserOrders: async (accessToken, params = {}) => {
    const {
      status = "all",
      page = 1,
      limit = 10,
      sort = "created_at",
      order = "desc",
    } = params;

    const response = await axiosPrivate.get("/api/orders/user", {
      params: { status, page, limit, sort, order },
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (response.data.success) {
      return {
        success: true,
        data: response.data.data,
        message: response.data.message,
      };
    } else {
      throw new Error(
        response.data.message || "Không thể lấy danh sách đơn hàng"
      );
    }
  },

  // Lấy chi tiết đơn hàng
  getOrderById: async (accessToken, orderId) => {
    const response = await axiosPrivate.get(`/api/orders/${orderId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (response.data.success) {
      return {
        success: true,
        data: response.data.data,
        message: response.data.message,
      };
    } else {
      throw new Error(
        response.data.message || "Không thể lấy thông tin đơn hàng"
      );
    }
  },

  // Lấy thống kê đơn hàng
  getOrderStats: async (accessToken) => {
    const response = await axiosPrivate.get("/api/orders/stats", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data;
  },

  // Hủy đơn hàng
  cancelOrder: async (accessToken, orderId, reason = "") => {
    const response = await axiosPrivate.put(
      `/api/orders/${orderId}/cancel`,
      { reason },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );
    if (response.data.success) {
      return {
        success: true,
        data: response.data.data,
        message: response.data.message,
      };
    } else {
      throw new Error(response.data.message || "Không thể hủy đơn hàng");
    }
  },

  // Xác nhận đã nhận hàng
  confirmReceived: async (accessToken, orderId) => {
    const response = await axiosPrivate.put(
      `/api/orders/${orderId}/confirm-received`,
      {},
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );
    if (response.data.success) {
      return {
        success: true,
        data: response.data.data,
        message: response.data.message,
      };
    } else {
      throw new Error(response.data.message || "Không thể xác nhận nhận hàng");
    }
  },

  // Báo cáo chưa nhận hàng
  reportNotReceived: async (accessToken, orderId) => {
    const response = await axiosPrivate.put(
      `/api/orders/${orderId}/report-not-received`,
      {},
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );
    if (response.data.success) {
      return {
        success: true,
        data: response.data.data,
        message: response.data.message,
      };
    } else {
      throw new Error(response.data.message || "Không thể gửi báo cáo");
    }
  },

  // Đặt lại đơn hàng (reorder)
  reorder: async (accessToken, orderId) => {
    const response = await axiosPrivate.post(
      `/api/orders/${orderId}/reorder`,
      {},
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    if (response.data.success) {
      return {
        success: true,
        data: response.data.data,
        message: response.data.message || "Đã thêm sản phẩm vào giỏ hàng",
      };
    } else {
      throw new Error(response.data.message || "Không thể đặt lại đơn hàng");
    }
  },

  // Admin: Lấy tất cả đơn hàng
  getAllOrders: async (accessToken, params = {}) => {
    const {
      status = "all",
      page = 1,
      limit = 10,
      branch_id,
      search,
      sort = "created_at",
      order = "desc",
    } = params;

    const response = await axiosPrivate.get("/api/orders/all", {
      params: { status, page, limit, branch_id, search, sort, order },
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data;
  },

  // Admin: Tìm kiếm đơn hàng
  searchOrders: async (accessToken, searchParams = {}) => {
    const response = await axiosPrivate.get("/api/orders/search", {
      params: searchParams,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (response.data.success) {
      return {
        success: true,
        data: response.data.data,
        message: response.data.message,
      };
    } else {
      throw new Error(response.data.message || "Không thể tìm kiếm đơn hàng");
    }
  },

  // Admin: Lấy đơn hàng của user cụ thể
  getUserOrdersByAdmin: async (accessToken, userId, params = {}) => {
    const {
      status = "all",
      page = 1,
      limit = 10,
      sort = "created_at",
      order = "desc",
    } = params;

    const response = await axiosPrivate.get(`/api/orders/user/${userId}`, {
      params: { status, page, limit, sort, order },
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data;
  },

  // Admin: Cập nhật thông tin vận chuyển
  updateShippingInfo: async (accessToken, orderId, shippingData) => {
    const response = await axiosPrivate.put(
      `/api/orders/${orderId}/shipping`,
      shippingData,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  },

  // Manager: Lấy đơn hàng theo chi nhánh
  getOrdersByBranch: async (accessToken, branchId, params = {}) => {
    const response = await axiosPrivate.get(`/api/orders/branch/${branchId}`, {
      params,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (response.data.success) {
      return {
        success: true,
        data: response.data.data,
        message: response.data.message,
      };
    } else {
      throw new Error(
        response.data.message || "Không thể lấy danh sách đơn hàng"
      );
    }
  },

  completeDineInOrder: async (accessToken, orderId, paymentMethod = "cod") => {
    const response = await axiosPrivate.put(
      `/api/orders/${orderId}/dine-in/complete`,
      { payment_method: paymentMethod },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );
    if (response.data.success) {
      return {
        success: true,
        data: response.data.data,
        message: response.data.message || "Thanh toán đơn hàng thành công",
      };
    } else {
      throw new Error(response.data.message || "Không thể thanh toán đơn hàng");
    }
  },

  // Manager: Cập nhật trạng thái đơn hàng
  updateOrderStatus: async (accessToken, orderId, status, note = "") => {
    const response = await axiosPrivate.put(
      `/api/orders/${orderId}/shipping`,
      { shipping_status: status, note },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );
    if (response.data.success) {
      return {
        success: true,
        data: response.data.data,
        message: response.data.message || "Cập nhật trạng thái thành công",
      };
    } else {
      throw new Error(
        response.data.message || "Không thể cập nhật trạng thái đơn hàng"
      );
    }
  },

  syncGhnShippingStatus: async (accessToken, orderId) => {
    const response = await axiosPrivate.put(
      `/api/orders/${orderId}/ghn-sync`,
      {},
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );
    if (response.data.success) {
      return {
        success: true,
        data: response.data.data,
        message: response.data.message || "Đồng bộ GHN thành công",
      };
    }
    throw new Error(response.data.message || "Không thể đồng bộ trạng thái GHN");
  },

  // Customer: Xác nhận đã nhận hàng
  confirmReceived: async (accessToken, orderId) => {
    const response = await axiosPrivate.put(
      `/api/orders/${orderId}/confirm-received`,
      {},
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    if (response.data.success) {
      return {
        success: true,
        data: response.data.data,
        message: response.data.message || "Xác nhận đã nhận hàng thành công",
      };
    } else {
      throw new Error(response.data.message || "Không thể xác nhận đơn hàng");
    }
  },
};

export default orderApi;
