import React from "react";
import { Link } from "react-router-dom";
import { formatCurrency, formatDate } from "@/lib/utils";

const OrdersTable = ({
  orders,
  onCancelOrder,
  onReorder,
  onViewDetail,
  onRateOrder,
  onViewRatings,
  onConfirmReceived,
}) => {
  // Status badge color mapping
  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: {
        bg: "bg-yellow-100",
        text: "text-yellow-800",
        label: "Chờ xác nhận",
      },
      confirmed: {
        bg: "bg-blue-100",
        text: "text-blue-800",
        label: "Đã xác nhận",
      },
      processing: {
        bg: "bg-purple-100",
        text: "text-purple-800",
        label: "Đang xử lý",
      },
      shipped: {
        bg: "bg-orange-100",
        text: "text-orange-800",
        label: "Đang giao",
      },
      delivered: {
        bg: "bg-green-100",
        text: "text-green-800",
        label: "Đã giao",
      },
      completed: {
        bg: "bg-teal-100",
        text: "text-teal-800",
        label: "Hoàn thành",
      },
      cancelled: { bg: "bg-red-100", text: "text-red-800", label: "Đã hủy" },
      cancel_request: {
        bg: "bg-gray-100",
        text: "text-gray-800",
        label: "Yêu cầu hủy",
      },
    };

    const config = statusConfig[status] || {
      bg: "bg-gray-100",
      text: "text-gray-800",
      label: status,
    };

    return (
      <span
        className={`${config.bg} ${config.text} px-3 py-1 rounded-full text-xs font-semibold`}
      >
        {config.label}
      </span>
    );
  };

  // Can cancel or request cancel check
  const canCancelOrder = (status) => {
    return ["pending", "confirmed"].includes(status);
  };

  const canRequestCancel = (order) => {
    // Không cho phép yêu cầu hủy nếu đã bị từ chối trước đó
    if (order.cancel_request_rejected) {
      return false;
    }
    return order.status === "processing";
  };

  return (
    <div className="space-y-4">
      {orders.map((order) => {
        const hasRatedAll = order.rating_status?.all_rated || false;
        const hasRatedSome = order.rating_status?.rated_count > 0;
        return (
          <div
            key={order._id}
            className="border border-gray-200 rounded-lg p-6 bg-white"
          >
            {/* Order Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-4 border-b">
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-sm text-gray-500">Mã đơn hàng</p>
                  <p className="font-semibold text-gray-800">
                    {order.order_number || order._id?.slice(-8)}
                  </p>
                </div>
                <div className="h-8 w-px bg-gray-300"></div>
                <div>
                  <p className="text-sm text-gray-500">Ngày đặt</p>
                  <p className="font-medium text-gray-800">
                    {formatDate
                      ? formatDate(order.created_at)
                      : new Date(order.created_at).toLocaleDateString("vi-VN")}
                  </p>
                </div>
              </div>
              <div>{getStatusBadge(order.status)}</div>
            </div>

            {/* Order Items */}
            <div className="space-y-3 mb-4">
              {order.items?.slice(0, 3).map((item, index) => (
                <div key={index} className="flex items-center gap-4">
                  <img
                    src={item.dish_image || "/placeholder-dish.jpg"}
                    alt={item.dish_name || "Sản phẩm"}
                    className="w-16 h-16 object-cover rounded-lg"
                    onError={(e) => {
                      e.target.src = "/placeholder-dish.jpg";
                    }}
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">
                      {item.dish_name || "Sản phẩm"}
                    </p>
                    <p className="text-sm text-gray-500">
                      Số lượng: {item.quantity}
                    </p>
                  </div>
                  <p className="font-semibold text-green-600">
                    {formatCurrency
                      ? formatCurrency(item.price * item.quantity)
                      : `${(item.price * item.quantity).toLocaleString(
                          "vi-VN"
                        )}đ`}
                  </p>
                </div>
              ))}
              {order.items?.length > 3 && (
                <p className="text-sm text-gray-500 text-center py-2">
                  + {order.items.length - 3} sản phẩm khác
                </p>
              )}
            </div>

            {/* Order Footer */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Tổng tiền:</span>
                <span className="text-2xl font-bold text-green-600">
                  {formatCurrency
                    ? formatCurrency(order.total_amount)
                    : `${order.total_amount?.toLocaleString("vi-VN")}đ`}
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => onViewDetail(order._id)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium text-sm cursor-pointer"
                >
                  Chi tiết
                </button>

                {canCancelOrder(order.status) && (
                  <button
                    onClick={() => onCancelOrder(order._id, false)}
                    className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition font-medium text-sm cursor-pointer"
                  >
                    Hủy đơn
                  </button>
                )}

                {canRequestCancel(order) && (
                  <button
                    onClick={() => onCancelOrder(order._id, true)}
                    className="px-4 py-2 bg-orange-100 text-orange-600 rounded-lg hover:bg-orange-200 transition font-medium text-sm cursor-pointer"
                  >
                    Yêu cầu hủy
                  </button>
                )}

                {order.status === "delivered" && (
                  <button
                    onClick={() => onConfirmReceived(order._id)}
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition font-medium text-sm cursor-pointer flex items-center gap-1"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Đã nhận hàng
                  </button>
                )}

                {order.status === "completed" &&
                  (() => {
                    // Ẩn nút đánh giá nếu quá 7 ngày sau khi hoàn thành đơn hàng
                    let showRatingBtn = true;
                    if (order.completed_at) {
                      const completedAt = new Date(order.completed_at);
                      const now = new Date();
                      const diffDays =
                        (now - completedAt) / (1000 * 60 * 60 * 24);
                      if (diffDays > 7) showRatingBtn = false;
                    }
                    if (!showRatingBtn)
                      return (
                        <button
                          onClick={() => onReorder(order._id)}
                          className="px-4 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition font-medium text-sm cursor-pointer"
                        >
                          Đặt lại
                        </button>
                      );
                    return (
                      <>
                        {hasRatedAll ? (
                          <button
                            onClick={() => onViewRatings(order)}
                            className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition font-medium text-sm cursor-pointer flex items-center gap-1"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            Xem đánh giá
                          </button>
                        ) : (
                          <button
                            onClick={() => onRateOrder(order)}
                            className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition font-medium text-sm cursor-pointer flex items-center gap-1"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            {hasRatedSome ? "Tiếp tục đánh giá" : "Đánh giá"}
                            <span className="ml-1 flex items-center gap-0.5 text-yellow-600">
                              <span className="text-xs">+200</span>
                              <svg
                                className="w-3.5 h-3.5"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                              >
                                <circle cx="12" cy="12" r="10" fill="#FFD700" />
                                <text
                                  x="12"
                                  y="16"
                                  fontSize="12"
                                  fontWeight="bold"
                                  textAnchor="middle"
                                  fill="#B8860B"
                                >
                                  ₫
                                </text>
                              </svg>
                            </span>
                          </button>
                        )}
                        <button
                          onClick={() => onReorder(order._id)}
                          className="px-4 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition font-medium text-sm cursor-pointer"
                        >
                          Đặt lại
                        </button>
                      </>
                    );
                  })()}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default OrdersTable;
