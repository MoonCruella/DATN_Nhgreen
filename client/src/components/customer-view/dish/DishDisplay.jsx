import React, { useEffect, useState } from "react";
import Slider from "react-slick";
import ProductCard from "./DishMainCard";
import dishApi from "@/api/dishApi";
import flashsaleApi from "@/api/flashsaleApi";
import DishCard from "./DishCard";
import { assets } from "@/assets/assets";
// Custom Arrow Components
const NextArrow = ({ onClick }) => (
  <button
    onClick={onClick}
    className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white hover:bg-gray-50 rounded-full w-10 h-10 flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110 cursor-pointer"
    aria-label="Next"
  >
    <img src={assets.next} alt="Next" className="w-3 h-3" />
  </button>
);

const PrevArrow = ({ onClick }) => (
  <button
    onClick={onClick}
    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white hover:bg-gray-50 rounded-full w-10 h-10 flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110 cursor-pointer"
    aria-label="Previous"
  >
    <img src={assets.back} alt="Back" className="w-3 h-3" />
  </button>
);

const ProductDisplay = ({
  layout = "grid",
  type = "all",
  flashSale = null,
}) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        let data;
        if (type === "seller") {
          data = await dishApi.getTopSelling();
          console.log("Top selling products data:", data);
          if (data && data.success) {
            setProducts(normalizeProducts(data.data || []));
          }
        } else if (type === "discount") {
          // Lấy products từ Flash Sale nếu có
          if (flashSale && flashSale.dishes && flashSale.dishes.length > 0) {
            // Kiểm tra trạng thái Flash Sale
            const now = new Date();
            const startTime = new Date(flashSale.startTime);
            const endTime = new Date(flashSale.endTime);
            const isActive = now >= startTime && now <= endTime;

            // Map dishes từ Flash Sale thành format chuẩn
            const flashSaleProducts = flashSale.dishes
              .filter((p) => {
                if (!p.dish_id) return false;
                const dish = p.dish_id;
                // Chỉ hiển thị món đang hoạt động và còn hàng
                const remaining = p.stock - p.sold;
                return dish.status === "active" && remaining > 0;
              })
              .map((p) => {
                const prod = p.dish_id;
                return {
                  _id: prod._id,
                  name: prod.name,
                  price: prod.price,
                  sale_price: prod.sale_price,
                  primary_image:
                    (prod.imageUrls &&
                      prod.imageUrls[prod.defaultImageIndex || 0]) ||
                    prod.primary_image ||
                    null,
                  category: prod.category,
                  avgRating: prod.avgRating || 0,
                  // Gắn Flash Sale info - chỉ gửi flashSaleId nếu đang active
                  flashSale: {
                    flashSaleId: isActive ? flashSale._id : null,
                    salePrice: p.salePrice,
                    originalPrice: p.originalPrice,
                    stock: p.stock,
                    sold: p.sold,
                    remaining: p.stock - p.sold,
                    endTime: flashSale.endTime,
                    startTime: flashSale.startTime,
                    isActive: isActive,
                  },
                };
              });
            setProducts(flashSaleProducts);
          } else {
            // Fallback: fetch all products (backend sẽ tự gắn Flash Sale info nếu có)
            data = await dishApi.getAll();
            if (data && data.success) {
              const dishes = data.data?.dishes || data.data || [];
              setProducts(normalizeProducts(dishes));
            }
          }
        } else if (type === "newest") {
          data = await dishApi.getNewest();
          if (data && data.success)
            setProducts(normalizeProducts(data.data || []));
        } else if (type === "gym_meal") {
          // fetch dishes tagged with 'gym_meal', limit 3
          data = await dishApi.getByTag("gym_meal", { limit: 3 });
          console.log("Gym meal products data:", data);
          if (data && data.success)
            setProducts(normalizeProducts(data.data || []));
        } else {
          data = await dishApi.getAll();
          if (data && data.success) {
            const dishes = data.data?.dishes || data.data || [];
            setProducts(normalizeProducts(dishes));
          }
        }
      } catch (err) {
        console.error("Error fetching products:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [type, flashSale]);

  // helper to normalize product shapes to include primary_image and consistent fields
  const normalizeProducts = (arr) =>
    arr.map((p) => {
      // normalize primary image from various backend shapes
      let primary_image = null;
      if (Array.isArray(p.imageUrls) && p.imageUrls.length) {
        const idx =
          typeof p.defaultImageIndex === "number" ? p.defaultImageIndex : 0;
        primary_image = p.imageUrls[idx] || p.imageUrls[0];
      } else if (Array.isArray(p.images) && p.images.length) {
        const primary = p.images.find((img) => img.is_primary) || p.images[0];
        primary_image = primary?.image_url || primary?.url || null;
      } else if (p.imageUrl) {
        primary_image = p.imageUrl;
      } else if (p.primary_image) {
        primary_image = p.primary_image;
      }

      return {
        ...p,
        primary_image,
      };
    });

  const sliderSettings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 4,
    slidesToScroll: 4,
    arrows: true,
    nextArrow: <NextArrow />,
    prevArrow: <PrevArrow />,
    responsive: [
      { breakpoint: 1024, settings: { slidesToShow: 3, slidesToScroll: 3 } },
      { breakpoint: 768, settings: { slidesToShow: 2, slidesToScroll: 2 } },
      { breakpoint: 640, settings: { slidesToShow: 1, slidesToScroll: 1 } },
    ],
  };

  if (loading) return <p className="text-center">Đang tải sản phẩm...</p>;

  return (
    <div className="max-w-7xl mx-auto">
      {layout === "slider" ? (
        <div className="relative ">
          <Slider {...sliderSettings}>
            {products.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </Slider>
        </div>
      ) : layout === "minigrid" ? (
        // single-column stacked layout (show up to 6 items) for narrow sidebars
        <div className="grid grid-cols-1 gap-3">
          {products.slice(0, 6).map((product) => (
            <div key={product._id} className="p-1">
              <DishCard product={product} />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductDisplay;
