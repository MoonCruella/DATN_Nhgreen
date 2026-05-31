import React from "react";
import { Link } from "react-router-dom";
import ProductDisplay from "../dish/DishDisplay";

const BestSeller = () => {
  return (
    <div className="mt-8 sm:mt-10 md:mt-12 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 sm:mb-8 gap-4 max-w-7xl mx-auto">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-800">
          Món mới
        </h2>
        <Link
          to="/products"
          className="inline-flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2 rounded-full border border-[#34ad54] text-[#34ad54] hover:bg-[#34ad54] hover:text-white transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#34ad54] text-sm sm:text-base"
          aria-label="Xem tất cả sản phẩm"
        >
          <span className="font-medium">Xem tất cả</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-3 h-3 sm:w-4 sm:h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </Link>
      </div>
      <ProductDisplay type="newest" layout="grid" />
    </div>
  );
};

export default BestSeller;
