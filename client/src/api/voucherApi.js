// src/api/voucherApi.js
import { axiosPrivate } from "./axios";
const base = "/api/vouchers";
const voucherApi = {
  // 📌 1. Lấy danh sách voucher (Admin, có filter + phân trang)
  getAll: async (
    accessToken,
    { active, type, code, startDate, endDate, page = 1, limit = 10 } = {}
  ) => {
    const params = new URLSearchParams();

    if (active && active !== "all") params.append("active", active);
    if (type && type !== "all") params.append("type", type);
    if (code !== "") params.append("code", code);
    if (startDate != "") params.append("startDate", startDate);
    if (endDate != "") params.append("endDate", endDate);

    params.append("page", page);
    params.append("limit", limit);

    const url = `${base}?${params.toString()}`;
    const res = await axiosPrivate.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return res.data; // { totalItems, totalPages, currentPage, limit, vouchers }
  },

  // 📌 2. Tạo voucher (Admin)
  create: async (accessToken, voucherData) => {
    const res = await axiosPrivate.post(`${base}`, voucherData, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });
    return res.data;
  },

  // 📌 3. Cập nhật voucher (Admin)
  update: async (accessToken, id, voucherData) => {
    const res = await axiosPrivate.put(`${base}/${id}`, voucherData, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });
    return res.data;
  },

  // 📌 4. Xóa voucher (Admin)
  remove: async (accessToken, id) => {
    const res = await axiosPrivate.delete(`${base}/${id}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return res.data;
  },

  // 📌 5. Áp dụng voucher (User)
  apply: async (accessToken, code, orderValue, shippingFee) => {
    const res = await axiosPrivate.post(
      `${base}/apply`,
      {
        code,
        orderValue,
        shippingFee,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );
    return res.data;
  },

  // 📌 6. Áp dụng voucher freeship tự động (User)
  applyAutoFreeship: async (accessToken, orderValue, shippingFee) => {
    const res = await axiosPrivate.post(
      `${base}/apply/freeship`,
      {
        orderValue,
        shippingFee,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );
    return res.data;
  },

  // 📌 7. Lấy danh sách voucher cho user (không phân trang)
  getAvailable: async (accessToken) => {
    const res = await axiosPrivate.get(`${base}/get-all`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return res.data;
  },
};

export default voucherApi;
