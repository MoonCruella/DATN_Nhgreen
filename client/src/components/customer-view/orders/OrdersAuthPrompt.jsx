import React from "react";
import { Link } from "react-router-dom";

const OrdersAuthPrompt = () => {
  return (
    <div className="bg-[#fbfbf7] min-h-screen flex items-center justify-center py-20">
      <div className="bg-white rounded-2xl shadow-lg p-12 text-center max-w-md mx-4">
        <div className="text-6xl mb-6">🔒</div>
        <h2 className="text-3xl font-bold text-gray-800 mb-4">
          Vui lòng đăng nhập
        </h2>
        <p className="text-gray-600 mb-8 text-lg">
          Bạn cần đăng nhập để xem đơn hàng của mình
        </p>
        <Link
          to="/auth/login"
          className="inline-block bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 transition font-medium"
        >
          Đăng nhập ngay
        </Link>
      </div>
    </div>
  );
};

export default OrdersAuthPrompt;
