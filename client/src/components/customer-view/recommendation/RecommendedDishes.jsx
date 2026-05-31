import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import recommendationApi from "@/api/recommendationApi";
import DishMainCard from "../dish/DishMainCard";
import { assets } from "@/assets/assets";

const RecommendedDishes = ({ excludeDishIds = [], limit = 8 }) => {
  const { user, isAuthenticated, accessToken } = useSelector((s) => s.auth);
  const navigate = useNavigate();

  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    loadRecommendations();
  }, [isAuthenticated, user]);

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      const response = await recommendationApi.getRecommendations(accessToken, {
        limit,
        excludeDishIds,
      });

      if (response.success) {
        setDishes(response.data || []);
      }
    } catch (error) {
      console.error("Error loading recommendations:", error);
      // Không hiển thị toast error để tránh làm phiền user
    } finally {
      setLoading(false);
    }
  };

  // Không hiển thị gì nếu chưa đăng nhập
  if (!isAuthenticated || !user) {
    return null;
  }

  // Không hiển thị nếu không có gợi ý
  if (!loading && dishes.length === 0) {
    return null;
  }

  return (
    <section className="py-12">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <img
            src={assets.leaf}
            alt="leaf"
            className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-3 sm:mb-4"
          />
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-800">
            Có thể bạn sẽ thích
          </h2>
          <p className="mt-3 sm:mt-4 text-sm sm:text-base text-gray-500 max-w-2xl mx-auto px-4">
            Các món ăn được gợi ý dựa trên sở thích và lịch sử đặt món của bạn.
          </p>
          <div className="mt-4 sm:mt-6">
            <a
              href="/products"
              className="inline-flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2 sm:py-2.5 rounded-full border border-[#34ad54] text-[#34ad54] hover:bg-[#34ad54] hover:text-white transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#34ad54] text-sm sm:text-base"
              aria-label="Xem tất cả sản phẩm"
            >
              <span className="font-medium">Xem thêm</span>
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

        {/* Loading state */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-lg overflow-hidden shadow animate-pulse"
              >
                <div className="h-48 bg-gray-200"></div>
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Dish Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {dishes.map((dish) => (
                <DishMainCard key={dish._id} product={dish} />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default RecommendedDishes;
