import React, { useState } from "react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import {
  X,
  Store,
  MapPin,
  User,
  Phone,
  Package,
  CreditCard,
  CheckCircle,
} from "lucide-react";

const OrderModal = ({ open, onClose, order }) => {
  if (!open || !order) return null;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { text: "Chờ xác nhận", color: "bg-yellow-100 text-yellow-800" },
      confirmed: { text: "Đã xác nhận", color: "bg-green-100 text-green-800" },
      processing: {
        text: "Đang xử lý",
        color: "bg-purple-100 text-purple-800",
      },
      shipped: { text: "Đang giao", color: "bg-indigo-100 text-indigo-800" },
      delivered: { text: "Đã giao", color: "bg-green-100 text-green-800" },
      completed: { text: "Hoàn thành", color: "bg-teal-100 text-teal-800" },
      cancelled: { text: "Đã hủy", color: "bg-red-100 text-red-800" },
      cancel_request: {
        text: "Yêu cầu hủy",
        color: "bg-orange-100 text-orange-800",
      },
    };
    const badge = statusMap[status] || {
      text: status,
      color: "bg-gray-100 text-gray-800",
    };
    return (
      <span
        className={`px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}
      >
        {badge.text}
      </span>
    );
  };

  const getPaymentMethodText = (method) => {
    const methodMap = {
      cod: "Thanh toán khi nhận hàng",
      vnpay: "VNPay",
      zalopay: "ZaloPay",
    };
    return methodMap[method] || method;
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-20">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">
              Chi tiết đơn hàng #{order.order_number || order._id?.slice(-8)}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Đặt lúc:{" "}
              {order.created_at
                ? format(new Date(order.created_at), "dd/MM/yyyy HH:mm", {
                    locale: vi,
                  })
                : "N/A"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Single Panel - All Information */}
          <div className="space-y-4 px-2 relative">
            {/* Paid stamp for completed orders */}
            {order.status === "completed" && (
              <div className="absolute top-0 right-0 pointer-events-none z-10">
                <img 
                  src="/paidVi.svg" 
                  alt="Đã thanh toán" 
                  className="w-44 h-auto opacity-40"
                />
              </div>
            )}
            
            {/* Content */}
            <div className="relative z-0">
            {/* Products Section */}
            <div>
              <h3 className="font-medium text-gray-800 text-sm mb-3 flex items-center gap-2">
                <Package className="w-5 h-5" />
                Sản phẩm ({order.items?.length || 0})
              </h3>
              <div className="space-y-2">
                {order.items?.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 rounded-lg"
                  >
                    {item.dish_image && (
                      <img
                        src={item.dish_image}
                        alt={item.dish_name}
                        className="w-14 h-14 object-cover rounded"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 text-sm">
                        {item.dish_name || "N/A"}
                      </p>
                      <div className="text-xs text-gray-500">
                        {item.sale_price && item.sale_price < item.price ? (
                          <>
                            <span className="line-through text-gray-400">
                              {formatCurrency(item.price)}
                            </span>
                            <span className="text-green-600 font-semibold ml-1">
                              {formatCurrency(item.sale_price)}
                            </span>
                            <span> x {item.quantity}</span>
                          </>
                        ) : (
                          <span>{formatCurrency(item.price)} x {item.quantity}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-800 text-sm">
                        {formatCurrency(
                          item.quantity * (item.sale_price || item.price)
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Note Section */}
              {order.notes && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="bg-yellow-50 p-2 rounded">
                    <p className="text-xs text-gray-600 font-medium mb-1">Ghi chú:</p>
                    <p className="text-sm text-gray-700 italic">{order.notes}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-gray-300 my-4"></div>

            {/* Payment Summary */}
            <div>
              <h4 className="font-medium text-gray-700 text-sm mb-2 flex items-center gap-1">
                <CreditCard className="w-4 h-4" />
                Thanh toán
              </h4>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-gray-700">
                  <span>Phương thức:</span>
                  <span className="font-medium">{getPaymentMethodText(order.payment_method)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Trạng thái:</span>
                  <span>
                    {order.payment_status === "paid" ? (
                      <span className="text-green-600">Đã thanh toán</span>
                    ) : (
                      <span className="text-yellow-600">Chưa thanh toán</span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Tạm tính:</span>
                  <span>{formatCurrency(order.subtotal || 0)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Phí vận chuyển:</span>
                  <span>{formatCurrency(order.shipping_fee || 0)}</span>
                </div>
                {order.freeship_value > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Miễn phí vận chuyển:</span>
                    <span>-{formatCurrency(order.freeship_value)}</span>
                  </div>
                )}
                {order.discount_value > 0 && (
                  <div className="flex justify-between text-orange-600">
                    <span>Giảm giá:</span>
                    <span>-{formatCurrency(order.discount_value)}</span>
                  </div>
                )}
                {order.coin_discount > 0 && (
                  <div className="flex justify-between text-yellow-600">
                    <span>Sử dụng xu:</span>
                    <span>-{formatCurrency(order.coin_discount)}</span>
                  </div>
                )}
                <div className="border-t pt-2 flex justify-between items-center font-semibold text-gray-800">
                  <span>TỔNG CỘNG:</span>
                  <span className="text-red-600 text-lg">{formatCurrency(order.total_amount || 0)}</span>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-300 my-4"></div>

            {/* Customer & Branch Info */}
            <div>
              <h4 className="font-medium text-gray-700 text-md mb-2 flex items-center gap-1">
                <User className="w-4 h-4" />
                Thông tin giao hàng
              </h4>
              <div className="space-y-1 text-sm">
                {order.shipping_info && (
                  <>
                    <p className="text-gray-800">
                      <span className="text-gray-700 text-sm font-bold">Người nhận: </span>
                      <span className="font-medium">{order.shipping_info.name}</span>
                      <span className="text-gray-500 mx-2">•</span>
                      <span>{order.shipping_info.phone}</span>
                    </p>
                    <p className="text-gray-700">
                      <span className="text-gray-700 text-sm font-bold">Địa chỉ: </span>
                      {order.shipping_info.address}
                    </p>
                  </>
                )}
                {order.branch_info && (
                  <p className="text-gray-700">
                    <span className="text-gray-700 text-sm font-bold">Chi nhánh: </span>
                    <span className="font-medium">{order.branch_info.name}</span>
                  </p>
                )}
              </div>
            </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end gap-3 z-20">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderModal;


