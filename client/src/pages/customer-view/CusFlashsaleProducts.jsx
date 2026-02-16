import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import ProductCard from "@/components/customer-view/dish/DishMainCard";
import flashsaleApi from "@/api/flashsaleApi";
import { assets } from "@/assets/assets";
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";

const pad = (n) => String(n).padStart(2, "0");

const getTimeDiff = (target) => {
  const now = new Date();
  const t = new Date(target) - now;
  if (isNaN(t)) return null;
  if (t <= 0) return { total: 0, hours: 0, minutes: 0, seconds: 0 };
  const total = Math.floor(t / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return { total, hours, minutes, seconds };
};

const CountdownBlocks = ({ hours, minutes, seconds }) => (
  <div className="flex items-center gap-2">
    <div className="bg-black text-white px-3 py-1 rounded-md text-lg font-bold">
      {pad(hours)}
    </div>
    <div className="text-xl font-bold">:</div>
    <div className="bg-black text-white px-3 py-1 rounded-md text-lg font-bold">
      {pad(minutes)}
    </div>
    <div className="text-xl font-bold">:</div>
    <div className="bg-black text-white px-3 py-1 rounded-md text-lg font-bold">
      {pad(seconds)}
    </div>
  </div>
);

const CusFlashsaleProducts = () => {
  const navigate = useNavigate();
  const [flashSale, setFlashSale] = useState(null);
  const [products, setProducts] = useState([]);
  const [displayedProducts, setDisplayedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [statusLabel, setStatusLabel] = useState("");
  const [error, setError] = useState(null);

  const observerTarget = useRef(null);
  const itemsPerPage = 12;
  const currentPage = useRef(1);

  // Load flash sale data
  useEffect(() => {
    const loadFlashSale = async () => {
      try {
        setLoading(true);
        const res = await flashsaleApi.getNearest();

        if (res && res.success && res.data) {
          setFlashSale(res.data);

          // Extract and normalize products from flash sale
          const now = new Date();
          const start = new Date(res.data.startTime);
          const end = new Date(res.data.endTime);
          const isActive = now >= start && now <= end;

          if (res.data.dishes && res.data.dishes.length > 0) {
            const normalizedProducts = res.data.dishes
              .filter((item) => {
                const dish = item.dish_id;
                if (!dish || !dish._id) return false;

                const remaining = item.stock - item.sold;
                return remaining > 0 && dish.status === "active";
              })
              .map((item) => {
                const dish = item.dish_id;
                const remaining = item.stock - item.sold;

                // Get primary image from imageUrls array
                const primary_image =
                  dish.imageUrls?.[dish.defaultImageIndex || 0] ||
                  dish.imageUrls?.[0] ||
                  dish.image_url ||
                  "";

                return {
                  ...dish,
                  primary_image, // Add primary_image for ProductCard
                  flashSale: {
                    flashSaleId: res.data._id,
                    salePrice: item.salePrice,
                    originalPrice: dish.sale_price || dish.price,
                    stock: item.stock,
                    sold: item.sold,
                    remaining: remaining,
                    startTime: res.data.startTime,
                    endTime: res.data.endTime,
                    isActive: isActive,
                  },
                };
              });

            setProducts(normalizedProducts);
            setDisplayedProducts(normalizedProducts.slice(0, itemsPerPage));
            currentPage.current = 1;
          } else {
            setProducts([]);
            setDisplayedProducts([]);
          }
        } else {
          setError("Không tìm thấy chương trình Flash Sale");
        }
      } catch (err) {
        console.error("Failed to load flash sale", err);
        setError("Không thể tải chương trình Flash Sale");
      } finally {
        setLoading(false);
      }
    };

    loadFlashSale();
  }, []);

  // Countdown timer
  useEffect(() => {
    if (!flashSale) {
      setCountdown(null);
      setStatusLabel("");
      return;
    }

    const update = () => {
      const now = new Date();
      const start = new Date(flashSale.startTime);
      const end = new Date(flashSale.endTime);

      if (now < start) {
        const td = getTimeDiff(start);
        setCountdown(td);
        setStatusLabel("Sắp diễn ra");
      } else if (now >= start && now <= end) {
        const td = getTimeDiff(end);
        setCountdown(td);
        setStatusLabel("Đang diễn ra");
      } else {
        setCountdown(null);
        setStatusLabel("Đã kết thúc");
      }
    };

    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [flashSale]);

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
          <p className="text-gray-600">Đang tải chương trình Flash Sale...</p>
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
        <div className="bg-gradient-to-r from-red-500 to-orange-500  p-6 mb-8 shadow-lg">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-center md:text-left flex items-center gap-3">
              <img
                src={assets.thunder}
                alt="Flash Sale"
                className="w-10 h-10 md:w-12 md:h-12"
              />
              <div>
                <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2">
                  FLASH SALE
                </h1>
                <p className="text-white/90 text-sm font-semibold md:text-base">
                  {flashSale?.title || "Chương trình khuyến mãi đặc biệt"}
                </p>
              </div>
            </div>

            {countdown && (
              <div className="bg-white/20 backdrop-blur-sm  p-4">
                <p className="text-white  font-semibold mb-2 text-center">
                  {statusLabel}
                </p>
                <CountdownBlocks
                  hours={countdown.hours}
                  minutes={countdown.minutes}
                  seconds={countdown.seconds}
                />
              </div>
            )}
          </div>
        </div>

        {/* Products Count */}
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
        {displayedProducts.length > 0 ? (
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
            <img
              src={assets.gift}
              alt="No products"
              className="w-24 h-24 mx-auto mb-4 opacity-50"
            />
            <p className="text-xl text-gray-600">
              Chưa có sản phẩm nào trong chương trình Flash Sale
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CusFlashsaleProducts;
