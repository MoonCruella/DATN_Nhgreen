import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import ProductCard from "@/components/customer-view/dish/DishMainCard";
import dishApi from "@/api/dishApi";
import { assets } from "@/assets/assets";
import {
  Loader2,
  AlertCircle,
  ArrowLeft,
  Dumbbell,
  Salad,
  Leaf,
  Baby,
  Heart,
  Beef,
} from "lucide-react";

const TAG_INFO = {
  gym_meal: {
    name: "Menu cho người tập Gym",
    description:
      "Các món ăn giàu protein, ít carb, hỗ trợ tăng cơ và phục hồi sau tập luyện",
    color: "from-orange-500 to-red-500",
    icon: Dumbbell,
    bgImage: assets.bg_gym_meals,
  },
  lose_weight: {
    name: "Menu giảm cân",
    description:
      "Các món ăn ít calo, nhiều chất xơ, giúp giảm cân hiệu quả và an toàn",
    color: "from-green-500 to-teal-500",
    icon: Salad,
    bgImage: assets.lose_weight_meal,
  },
  balanced_meal: {
    name: "Bữa ăn cân bằng",
    description:
      "Các món ăn lành mạnh, cân bằng dinh dưỡng cho sức khỏe tối ưu",
    color: "from-blue-500 to-indigo-500",
    icon: Heart,
    bgImage: assets.vegetarian_meals,
  },
};

const CusProductsByTag = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tag = searchParams.get("tag") || "gym_meal";

  const [products, setProducts] = useState([]);
  const [displayedProducts, setDisplayedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterLoading, setFilterLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const observerTarget = useRef(null);
  const itemsPerPage = 12;
  const currentPage = useRef(1);

  const tagInfo = TAG_INFO[tag] || TAG_INFO.gym_meal;

  // Handle tag change with loading
  const handleTagChange = (newTag) => {
    if (newTag === tag) return;
    setFilterLoading(true);
    navigate(`/products/tags?tag=${newTag}`);
  };

  // Load products by tag
  useEffect(() => {
    const loadProducts = async () => {
      try {
        // Chỉ show full screen loading lần đầu, các lần sau dùng filterLoading
        if (products.length === 0 && !filterLoading) {
          setLoading(true);
        }
        setError(null);

        const res = await dishApi.getByTag(tag);

        if (res && res.success) {
          const dishes = res.data || [];

          // Normalize products
          const normalizedProducts = dishes
            .filter((dish) => dish && dish._id && dish.status === "active")
            .map((dish) => {
              const primary_image =
                dish.imageUrls?.[dish.defaultImageIndex || 0] ||
                dish.imageUrls?.[0] ||
                dish.image_url ||
                "";

              return {
                ...dish,
                primary_image,
              };
            });

          setProducts(normalizedProducts);
          setDisplayedProducts(normalizedProducts.slice(0, itemsPerPage));
          currentPage.current = 1;
        } else {
          setProducts([]);
          setDisplayedProducts([]);
        }
      } catch (err) {
        console.error("Failed to load products by tag", err);
        setError("Không thể tải danh sách sản phẩm");
      } finally {
        setLoading(false);
        setFilterLoading(false);
      }
    };

    loadProducts();
  }, [tag]);

  // Load more products (lazy loading)
  const loadMore = useCallback(() => {
    if (loadingMore || displayedProducts.length >= products.length) return;

    setLoadingMore(true);
    setTimeout(() => {
      const nextPage = currentPage.current + 1;
      const startIndex = 0;
      const endIndex = nextPage * itemsPerPage;
      setDisplayedProducts(products.slice(startIndex, endIndex));
      currentPage.current = nextPage;
      setLoadingMore(false);
    }, 500);
  }, [loadingMore, displayedProducts.length, products]);

  // Intersection Observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [loadMore, loadingMore]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-gray-600">Đang tải sản phẩm...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Có lỗi xảy ra
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate("/")}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            Về trang chủ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fbfbf7] py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div
          className={`bg-gradient-to-r ${tagInfo.color} rounded-2xl p-12 md:p-16 mb-8 shadow-lg relative overflow-hidden min-h-[300px] md:min-h-[400px] transition-opacity duration-300 ${
            filterLoading ? 'opacity-50' : 'opacity-100'
          }`}
          style={{
            backgroundImage: `linear-gradient(rgba(0, 0, 0, ${filterLoading ? '0.7' : '0.5'}), rgba(0, 0, 0, ${filterLoading ? '0.7' : '0.5'})), url(${tagInfo.bgImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {filterLoading && (
            <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/20">
              <Loader2 className="w-16 h-16 animate-spin text-white" />
            </div>
          )}
          <div className="flex flex-col justify-center items-center md:items-start gap-4 relative z-10 h-full">
            <div className="text-center md:text-left">
              <div className="flex items-center gap-4 mb-4">
                <tagInfo.icon className="w-14 h-14 md:w-16 md:h-16 text-white" />
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white drop-shadow-lg">
                  {tagInfo.name}
                </h1>
              </div>
              <p className="text-white/90 text-base md:text-lg lg:text-xl max-w-3xl drop-shadow-md">
                {tagInfo.description}
              </p>
            </div>
          </div>
        </div>

        {/* Tag Filter Pills */}
        <div className="mb-8 flex flex-wrap gap-3">
          {Object.entries(TAG_INFO).map(([tagKey, info]) => {
            const Icon = info.icon;
            return (
              <button
                key={tagKey}
                onClick={() => handleTagChange(tagKey)}
                disabled={filterLoading}
                className={`px-4 py-2 rounded-full font-medium transition flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                  tag === tagKey
                    ? "bg-green-600 text-white"
                    : "bg-white text-gray-700 hover:bg-green-50 border border-gray-200"
                }`}
              >
                <Icon className="w-5 h-5" />
                {info.name}
              </button>
            );
          })}
        </div>

        {/* Products Count and Back Button */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800">
            Tất cả sản phẩm ({products.length})
          </h2>
          <button
            onClick={() => navigate("/")}
            className="text-green-600 hover:text-green-700 font-medium flex items-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
            Về trang chủ
          </button>
        </div>

        {/* Products Grid */}
        {filterLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, index) => (
              <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
                <div className="w-full h-48 bg-gray-200"></div>
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-8 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : displayedProducts.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {displayedProducts.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>

            {/* Loading More Indicator */}
            {displayedProducts.length < products.length && (
              <div
                ref={observerTarget}
                className="flex justify-center items-center py-8"
              >
                {loadingMore && (
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto mb-2" />
                    <p className="text-gray-600 text-sm">Đang tải thêm...</p>
                  </div>
                )}
              </div>
            )}

            {/* End Message */}
            {displayedProducts.length >= products.length &&
              products.length > itemsPerPage && (
                <div className="text-center py-8">
                  <p className="text-gray-500">Đã hiển thị tất cả sản phẩm</p>
                </div>
              )}
          </>
        ) : (
          <div className="text-center py-16">
            <tagInfo.icon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-xl text-gray-600 mb-2">
              Chưa có sản phẩm nào trong danh mục này
            </p>
            <p className="text-gray-500 mb-6">
              Hãy quay lại sau để khám phá các món ăn mới!
            </p>
            <button
              onClick={() => navigate("/products")}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              Xem tất cả sản phẩm
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CusProductsByTag;
