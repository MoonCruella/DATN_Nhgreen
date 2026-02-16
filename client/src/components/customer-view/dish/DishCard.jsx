import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { assets } from "@/assets/assets";

const DishCard = ({ product }) => {
  const navigate = useNavigate();

  const formatCurrency = (value) =>
    value?.toLocaleString("vi-VN", { style: "currency", currency: "VND" });

  const imgSrc = product?.primary_image || product?.imageUrl || assets.logo;

  const goToDetail = () => {
    if (product?._id) navigate(`/products/${product._id}`);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={goToDetail}
      onKeyDown={(e) => {
        if (e.key === "Enter") goToDetail();
      }}
      className="flex items-start gap-3 sm:gap-4 p-2 sm:p-3 cursor-pointer hover:bg-gray-50 rounded-lg transition"
    >
      <div className="flex-shrink-0">
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg border border-gray-200 bg-white flex items-center justify-center shadow-sm overflow-hidden">
          <img
            src={imgSrc}
            alt={product?.name}
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-sm sm:text-base text-gray-800 truncate">
          {product?.name}
        </h3>

        <div className="mt-2 sm:mt-3">
          <div className="h-px bg-gray-200 w-10 sm:w-14 mb-2 sm:mb-3" />
          <div className="text-green-600 font-extrabold text-base sm:text-lg">
            {product?.sale_price
              ? formatCurrency(product.sale_price)
              : formatCurrency(product.price)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DishCard;
