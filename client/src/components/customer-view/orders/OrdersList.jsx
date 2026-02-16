import React from "react";
import { Loader2 } from "lucide-react";
import OrdersTable from "./OrdersTable";

const OrdersList = ({
  orders,
  isLoading,
  orderStats,
  filter,
  onCancelOrder,
  onReorder,
  onViewDetail,
  onRateOrder,
  onViewRatings,
  onConfirmReceived,
}) => {
  return (
    <section className="pb-10">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="lg:col-span-2">
          {isLoading ? (
            <div className="bg-white rounded-2xl shadow-md p-12 text-center">
              <Loader2 className="w-16 h-16 text-green-500 animate-spin mx-auto mb-6" />
              <p className="text-gray-600 text-lg font-medium">
                Đang tải đơn hàng...
              </p>
            </div>
          ) : (
            <div>
              <OrdersTable
                orders={orders}
                onCancelOrder={onCancelOrder}
                onReorder={onReorder}
                onViewDetail={onViewDetail}
                onRateOrder={onRateOrder}
                onViewRatings={onViewRatings}
                onConfirmReceived={onConfirmReceived}
                isLoading={isLoading}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default OrdersList;
