import React from "react";
import { assets } from "@/assets/assets";
import ProductDisplay from "../dish/DishDisplay";
import { Link } from "react-router-dom";

const Feature = ({ children }) => (
  <div className="flex items-center gap-3">
    <div className="w-6 h-6 flex items-center justify-center bg-green-50 rounded-full">
      <img src={assets.starIcon} alt="icon" className="w-4 h-4" />
    </div>
    <div className="text-sx font-semibold text-white">{children}</div>
  </div>
);

const DishForGym = () => {
  return (
    <section className="py-12 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {/* Left: background image with text overlay (spans 2 columns on lg) */}
          <div className="lg:col-span-2">
            <div className="relative rounded-md overflow-hidden h-full">
              <img
                src={assets.gymfood}
                alt="gym-banner"
                className="absolute inset-0 w-full h-full object-cover"
              />

              {/* dark gradient overlay for readability */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />

              <div className="relative z-10 p-6 md:p-12">
                <h2 className="text-4xl md:text-5xl font-extrabold text-white leading-tight">
                  Menu dành riêng
                  <br />
                  cho người tập Gym
                </h2>

                <p className="mt-4 text-white/90 max-w-xl">
                  Các món ăn được thiết kế đặc biệt để cung cấp đầy đủ dinh
                  dưỡng, hỗ trợ quá trình tập luyện và phục hồi cơ bắp hiệu quả.
                </p>

                <div className="mt-8 space-y-3 ">
                  <Feature>Nhiều Protein</Feature>
                  <Feature>Ít Carb</Feature>
                  <Feature>Hỗ trợ phục hồi cơ bắp</Feature>
                </div>

                <div className="mt-8">
                  <Link
                    to="/products/tags?tag=gym_meal"
                    className="inline-flex items-center gap-2 px-6 py-2 btn-primary transition rounded text-white font-medium"
                  >
                    Xem thêm
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Right: heading + DishDisplay (gym_meal, minigrid) */}
          <div className="lg:col-span-1 overflow-hidden">
            <h3 className="text-2xl font-extrabold text-slate-800 mb-3">
              Gym Diet
            </h3>
            <div className="mb-6 h-1 w-23 bg-green-200"></div>

            <ProductDisplay type="gym_meal" layout="minigrid" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default DishForGym;
