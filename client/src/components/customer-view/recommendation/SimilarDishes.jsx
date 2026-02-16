import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import recommendationApi from "@/api/recommendationApi";
import DishMainCard from "../dish/DishMainCard";

const SimilarDishes = ({ dishId, limit = 8 }) => {
  const navigate = useNavigate();
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!dishId) return;
    loadSimilarDishes();
  }, [dishId]);

  const loadSimilarDishes = async () => {
    try {
      setLoading(true);
      const response = await recommendationApi.getSimilarDishes(dishId, {
        limit,
      });

      if (response.success) {
        setDishes(response.data || []);
      }
    } catch (error) {
      console.error("Error loading similar dishes:", error);
    } finally {
      setLoading(false);
    }
  };

  // Không hiển thị nếu không có món tương tự
  if (!loading && dishes.length === 0) {
    return null;
  }

  return (
    <section className="py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            Món ăn tương tự
          </h2>
          <p className="text-gray-600">Những món có thể bạn cũng thích</p>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {dishes.map((dish) => (
              <DishMainCard key={dish._id} product={dish} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default SimilarDishes;
