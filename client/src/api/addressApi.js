import { axiosPrivate } from "./axios";

const addressApi = {
  // Lấy danh sách địa chỉ
  getAddresses: async (accessToken) => {
    const response = await axiosPrivate.get("/api/addresses", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data;
  },

  // Thêm địa chỉ mới
  addAddress: async (accessToken, addressData) => {
    const response = await axiosPrivate.post("/api/addresses", addressData, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });
    return response.data;
  },

  // Cập nhật địa chỉ
  updateAddress: async (accessToken, addressId, addressData) => {
    const response = await axiosPrivate.put(
      `/api/addresses/${addressId}`,
      addressData,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  },

  // Xóa địa chỉ
  deleteAddress: async (accessToken, addressId) => {
    const response = await axiosPrivate.delete(`/api/addresses/${addressId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data;
  },

  // Đặt địa chỉ mặc định
  setDefaultAddress: async (accessToken, addressId) => {
    const response = await axiosPrivate.patch(
      `/api/addresses/${addressId}/default`,
      {},
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    return response.data;
  },
};

export default addressApi;
