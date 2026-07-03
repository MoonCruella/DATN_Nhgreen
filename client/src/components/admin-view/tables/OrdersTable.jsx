import React from "react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import TableSkeleton from "../TableSkeleton";

const OrdersTable = ({ orders = [], onRowClick, isLoading }) => {
  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { text: "Chờ xác nhận", color: "bg-yellow-100 text-yellow-800" },
      confirmed: { text: "Đã xác nhận", color: "bg-green-100 text-green-800" },
      processing: { text: "Đang xử lý", color: "bg-purple-100 text-purple-800" },
      shipped: { text: "Đang giao", color: "bg-indigo-100 text-indigo-800" },
      delivered: { text: "Đã giao", color: "bg-green-100 text-green-800" },
      completed: { text: "Hoàn thành", color: "bg-teal-100 text-teal-800" },
      cancelled: { text: "Đã hủy", color: "bg-red-100 text-red-800" },
      cancel_request: { text: "Yêu cầu hủy", color: "bg-orange-100 text-orange-800" },
    };
    const badge = statusMap[status] || { text: status, color: "bg-gray-100 text-gray-800" };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-gray-100">
        <TableSkeleton rows={10} columns={6} />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg bg-white shadow-sm ring-1 ring-gray-100">
      <table className="w-full text-left">
        <thead className="border-b border-gray-200 bg-white">
          <tr>
            <th className="px-5 py-3 text-base font-bold text-slate-600">Mã đơn</th>
            <th className="px-5 py-3 text-base font-bold text-slate-600">Khách hàng</th>
            <th className="px-5 py-3 text-base font-bold text-slate-600">Ngày đặt</th>
            <th className="px-5 py-3 text-base font-bold text-slate-600">Chi nhánh</th>
            <th className="px-5 py-3 text-center text-base font-bold text-slate-600">Trạng thái</th>
            <th className="px-5 py-3 text-right text-base font-bold text-slate-600">Tổng tiền</th>
          </tr>
        </thead>
        <tbody className="bg-white">
          {orders.length > 0 ? (
            orders.map((order) => (
              <tr
                key={order._id}
                className="cursor-pointer border-b border-gray-100 text-base font-medium text-[#444] transition hover:bg-gray-50 last:border-b-0"
                onClick={() => onRowClick && onRowClick(order)}
              >
                <td className="px-5 py-3 font-bold text-gray-800">
                  #{order.order_number || order._id?.slice(-8)}
                </td>
                <td className="px-5 py-3 text-gray-700">
                  <div>
                    <div className="font-medium">{order.shipping_info?.name || ""}</div>
                    <div className="text-sm text-gray-500">{order.shipping_info?.phone || ""}</div>
                  </div>
                </td>
                <td className="px-5 py-3 text-gray-700">
                  {order.created_at
                    ? format(new Date(order.created_at), "dd/MM/yyyy HH:mm", { locale: vi })
                    : ""}
                </td>
                <td className="px-5 py-3 text-gray-700">
                  {order.branch_info?.name || ""}
                </td>
                <td className="px-5 py-3 text-center">
                  {getStatusBadge(order.status)}
                </td>
                <td className="px-5 py-3 text-right font-bold text-gray-800">
                  {formatCurrency(order.total_amount || 0)}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={6}
                className="py-12 text-center text-gray-500 bg-white"
              >
                <div className="flex flex-col items-center gap-4">
                  <div>
                    <p className="font-medium text-lg text-gray-800">
                      Chưa có đơn hàng nào
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      Đơn hàng sẽ hiển thị tại đây
                    </p>
                  </div>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default OrdersTable;


