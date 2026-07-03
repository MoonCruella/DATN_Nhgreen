import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import recommendationApi from "@/api/recommendationApi";
import DishMainCard from "../dish/DishMainCard";
import { assets } from "@/assets/assets";

const FamiliarDishes = ({ limit = 4 }) => {
  const { user, isAuthenticated, accessToken } = useSelector((s) => s.auth);
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadFamiliarDishes = async () => {
      if (!isAuthenticated || !user || !accessToken) {
        setDishes([]);
        return;
      }

      try {
        setLoading(true);
        const response = await recommendationApi.getFamiliarDishes(
          accessToken,
          {
            limit,
          },
        );

        if (response.success) {
          setDishes(response.data || []);
        }
      } catch (error) {
        console.error("Error loading familiar dishes:", error);
        setDishes([]);
      } finally {
        setLoading(false);
      }
    };

    loadFamiliarDishes();
  }, [accessToken, isAuthenticated, limit, user]);

  if (!isAuthenticated || !user) return null;
  if (!loading && dishes.length === 0) return null;

  return (
    <section className="py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-8 sm:mb-10">
          <img
            src={assets.leaf}
            alt="leaf"
            className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-3 sm:mb-4"
          />
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-800">
            Món quen thuộc của bạn
          </h2>
          <p className="mt-3 sm:mt-4 text-sm sm:text-base text-gray-500 max-w-2xl mx-auto px-4">
            Món quen của bạn, được đề xuất dựa trên lịch sử đặt món của bạn.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: limit }).map((_, index) => (
              <div
                key={index}
                className="h-[320px] rounded-lg bg-white shadow-sm animate-pulse"
              >
                <div className="h-48 rounded-t-lg bg-gray-200" />
                <div className="p-4 space-y-3">
                  <div className="h-4 w-3/4 rounded bg-gray-200" />
                  <div className="h-4 w-1/2 rounded bg-gray-200" />
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

export default FamiliarDishes;
