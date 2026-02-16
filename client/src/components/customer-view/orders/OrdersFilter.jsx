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
} from "lucide-react";

const OrdersFilter = ({ filter, orderStats, onFilterChange }) => {
  const filterTabs = [
    {
      key: "all",
      label: "Tất cả",
      count: orderStats.total,
      Icon: Package,
    },
    {
      key: "pending",
      label: "Chờ xác nhận",
      count: orderStats.pending,
      Icon: Clock,
    },
    {
      key: "confirmed",
      label: "Đã xác nhận",
      count: orderStats.confirmed,
      Icon: CheckCircle,
    },
    {
      key: "processing",
      label: "Đang xử lý",
      count: orderStats.processing,
      Icon: ShoppingCart,
    },
    {
      key: "shipped",
      label: "Đang giao",
      count: orderStats.shipped,
      Icon: Truck,
    },
    {
      key: "delivered",
      label: "Đã giao",
      count: orderStats.delivered,
      Icon: CheckCheck,
    },
    {
      key: "completed",
      label: "Hoàn thành",
      count: orderStats.completed,
      Icon: CheckCheck,
    },
    {
      key: "cancel_request",
      label: "Yêu cầu hủy",
      count: orderStats.cancel_request,
      Icon: AlertTriangle,
    },
    {
      key: "cancelled",
      label: "Đã hủy",
      count: orderStats.cancelled,
      Icon: XCircle,
    },
  ];

  return (
    <section className="mx-28">
      <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Lọc theo trạng thái
        </h3>
        <div className="flex flex-wrap gap-3">
          {filterTabs.map((tab) => {
            const IconComponent = tab.Icon;
            return (
              <button
                key={tab.key}
                onClick={() => onFilterChange(tab.key)}
                className={`px-5 py-3 rounded-xl font-medium transition-all transform hover:scale-105 flex items-center gap-2 cursor-pointer ${
                  filter === tab.key
                    ? "bg-green-600 text-white shadow-lg"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <IconComponent className="w-5 h-5" />
                <span>{tab.label}</span>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-bold ${
                    filter === tab.key
                      ? "bg-white text-green-600"
                      : "bg-gray-300 text-gray-600"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default OrdersFilter;
