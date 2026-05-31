import React from "react";
import ProductDisplay from "../dish/DishDisplay";
import { assets } from "@/assets/assets";

const BestSeller = () => {
  return (
    <section className="py-8 sm:py-12 md:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center">
          <img
            src={assets.leaf}
            alt="leaf"
            className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-3 sm:mb-4"
          />
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-800">
            Best Sellers
          </h2>
          <p className="mt-3 sm:mt-4 text-sm sm:text-base text-gray-500 max-w-2xl mx-auto px-4">
            Các món ăn được khách hàng ưa chuộng nhất của chúng tôi.
          </p>
          <div className="mt-4 sm:mt-6">
            <a
              href="/products"
              className="inline-flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2 sm:py-2.5 rounded-full border border-[#34ad54] text-[#34ad54] hover:bg-[#34ad54] hover:text-white transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#34ad54] text-sm sm:text-base"
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
            </a>
          </div>
        </div>

        <div className="mt-8 sm:mt-10 md:mt-12">
          <ProductDisplay type="seller" layout="slider" />
        </div>
      </div>
    </section>
  );
};

export default BestSeller;
