import React from "react";
import {
  Package,
  Clock,
  CheckCircle,
  ShoppingCart,
  Truck,
  CheckCheck,
  AlertTriangle,
  XCircle,
  BarChart3,
  TrendingUp,
  Check,
} from "lucide-react";

const OrdersSummary = ({ orderStats, currentFilter, onFilterChange }) => {
  const summaryItems = [
    {
      key: "total",
      label: "Tổng đơn hàng",
      count: orderStats.total || 0,
      Icon: Package,
      color: "bg-blue-50 text-blue-600 border-blue-200",
    },
    {
      key: "pending",
      label: "Chờ xác nhận",
      count: orderStats.pending || 0,
      Icon: Clock,
      color: "bg-yellow-50 text-yellow-600 border-yellow-200",
    },
    {
      key: "confirmed",
      label: "Đã xác nhận",
      count: orderStats.confirmed || 0,
      Icon: CheckCircle,
      color: "bg-green-50 text-green-600 border-green-200",
    },
    {
      key: "processing",
      label: "Đang xử lý",
      count: orderStats.processing || 0,
      Icon: ShoppingCart,
      color: "bg-purple-50 text-purple-600 border-purple-200",
    },
    {
      key: "shipped",
      label: "Đang giao",
      count: orderStats.shipped || 0,
      Icon: Truck,
      color: "bg-orange-50 text-orange-600 border-orange-200",
    },
    {
      key: "delivered",
      label: "Đã giao",
      count: orderStats.delivered || 0,
      Icon: CheckCheck,
      color: "bg-emerald-50 text-emerald-600 border-emerald-200",
    },
    {
      key: "completed",
      label: "Hoàn thành",
      count: orderStats.completed || 0,
      Icon: CheckCheck,
      color: "bg-teal-50 text-teal-600 border-teal-200",
    },
    {
      key: "cancel_request",
      label: "Yêu cầu hủy",
      count: orderStats.cancel_request || 0,
      Icon: AlertTriangle,
      color: "bg-gray-50 text-gray-600 border-gray-200",
    },
    {
      key: "cancelled",
      label: "Đã hủy",
      count: orderStats.cancelled || 0,
      Icon: XCircle,
      color: "bg-red-50 text-red-600 border-red-200",
    },
  ];

  return (
    <div className="space-y-3">
      {summaryItems.map((item) => {
        const IconComponent = item.Icon;
        return (
          <button
            key={item.key}
            onClick={() => onFilterChange(item.key)}
            className={`w-full p-4 rounded-xl border-2 transition-all hover:scale-105 text-left cursor-pointer ${
              currentFilter === item.key
                ? "ring-2 ring-green-500 border-green-500 shadow-lg"
                : item.color
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <IconComponent className="w-6 h-6" />
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {item.label}
                  </p>
                  <p className="text-2xl font-bold">{item.count}</p>
                </div>
              </div>
              {currentFilter === item.key && (
                <Check className="w-6 h-6 text-green-500" />
              )}
            </div>
          </button>
        );
      })}

      {/* Quick Stats */}
      <div className="mt-6 p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border-2 border-green-200">
        <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Thống kê nhanh
        </h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Đang xử lý:</span>
            <span className="font-semibold text-gray-800">
              {(orderStats.pending || 0) +
                (orderStats.confirmed || 0) +
                (orderStats.processing || 0) +
                (orderStats.shipped || 0)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Hoàn thành:</span>
            <span className="font-semibold text-green-600">
              {orderStats.delivered || 0}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Đã hủy:</span>
            <span className="font-semibold text-red-600">
              {orderStats.cancelled || 0}
            </span>
          </div>
          <div className="h-px bg-green-300 my-2"></div>
          <div className="flex justify-between text-base">
            <span className="font-semibold text-gray-700">Tổng cộng:</span>
            <span className="font-bold text-green-600">
              {orderStats.total || 0}
            </span>
          </div>
        </div>
      </div>

      {/* Success Rate */}
      {orderStats.total > 0 && (
        <div className="mt-4 p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border-2 border-blue-200">
          <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Tỷ lệ thành công
          </h4>
          <div className="relative pt-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-blue-600">
                {Math.round(
                  ((orderStats.delivered || 0) / orderStats.total) * 100
                )}
                %
              </span>
            </div>
            <div className="overflow-hidden h-3 text-xs flex rounded-full bg-blue-200">
              <div
                style={{
                  width: `${
                    ((orderStats.delivered || 0) / orderStats.total) * 100
                  }%`,
                }}
                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-600 transition-all duration-500"
              ></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersSummary;
