import React from "react";
import { Package, Clock, Truck, CheckCheck } from "lucide-react";

const OrdersStats = ({ orderStats }) => {
  const stats = [
    {
      Icon: Package,
      label: "Tổng đơn",
      count: orderStats.total,
      color: "bg-blue-500",
    },
    {
      Icon: Clock,
      label: "Chờ xác nhận",
      count: orderStats.pending,
      color: "bg-yellow-500",
    },
    {
      Icon: Truck,
      label: "Đang giao",
      count: orderStats.shipped,
      color: "bg-orange-500",
    },
    {
      Icon: CheckCheck,
      label: "Hoàn thành",
      count: orderStats.delivered,
      color: "bg-green-500",
    },
  ];

  return (
    <section className="mx-28 pt-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {stats.map((stat, index) => {
          const IconComponent = stat.Icon;
          return (
            <div
              key={index}
              className="bg-white rounded-xl shadow-md p-4 hover:shadow-lg transition transform hover:-translate-y-1"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`${stat.color} w-12 h-12 rounded-lg flex items-center justify-center text-white`}
                >
                  <IconComponent className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-800">
                    {stat.count}
                  </div>
                  <div className="text-xs text-gray-500">{stat.label}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default OrdersStats;
