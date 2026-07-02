import { useEffect, useState } from "react";
import { FaShoppingCart } from "react-icons/fa";
import { useParams, useNavigate } from "react-router-dom";
import Slider from "react-slick";
import { assets } from "@/assets/assets";
import { toast } from "sonner";
import productService from "../../api/dishApi.js";
import ProductCard from "@/components/customer-view/dish/DishMainCard.jsx";
import categoryService from "../../api/categoryApi.js";
import flashsaleApi from "../../api/flashsaleApi.js";
import { useCartContext } from "@/context/CartContext";
import { useSelector } from "react-redux";
import ratingService from "@/api/ratingApi.js";

const StarRating = ({ rating }) => {
  return (
    <div className="flex items-center space-x-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={`text-lg ${
            i < rating ? "text-yellow-400" : "text-gray-300"
          }`}
        >
          ★
        </span>
      ))}
    </div>
  );
};

const ProductDetails = () => {
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCartContext();

  // Khi mở trang chi tiết hoặc chuyển sang sản phẩm khác, cuộn lên đầu trang
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [id]);

  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [thumbnail, setThumbnail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [categoryName, setCategoryName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [ratings, setRatings] = useState([]);
  const [loadingRatings, setLoadingRatings] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(5); // số rating mỗi trang
  const [total, setTotal] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [totalRatings, setTotalRatings] = useState(0);
  const [flashSaleInfo, setFlashSaleInfo] = useState(null);
  const [upcomingFlashSale, setUpcomingFlashSale] = useState(null);

  const formatCurrency = (value) =>
    value?.toLocaleString("vi-VN", { style: "currency", currency: "VND" });

  // Xử lý thêm vào giỏ
  const handleAddToCart = async () => {
    try {
      // Kiểm tra cả isAuthenticated và user
      if (!isAuthenticated || !user) {
        toast.info("Vui lòng đăng nhập!");
        return;
      }

      // Kiểm tra Flash Sale còn hàng không
      if (flashSaleInfo && flashSaleInfo.remaining <= 0) {
        toast.error("Sản phẩm Flash Sale đã hết hàng!");
        return;
      }

      // Kiểm tra số lượng không vượt quá Flash Sale stock
      if (flashSaleInfo && quantity > flashSaleInfo.remaining) {
        toast.error(
          `Chỉ còn ${flashSaleInfo.remaining} sản phẩm trong Flash Sale!`,
        );
        return;
      }

      await addToCart(
        product._id,
        quantity,
        flashSaleInfo?.flashSaleId || null,
      );
      toast.success(`${product.name} đã được thêm vào giỏ hàng!`);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Thêm vào giỏ hàng thất bại!");
    }
  };

  // Xử lý mua ngay - chuyển thẳng đến checkout
  const handleBuyNow = () => {
    // Kiểm tra đăng nhập
    if (!isAuthenticated || !user) {
      toast.info("Vui lòng đăng nhập để mua hàng!");
      return;
    }

    // Kiểm tra Flash Sale còn hàng không
    if (flashSaleInfo && flashSaleInfo.remaining <= 0) {
      toast.error("Sản phẩm Flash Sale đã hết hàng!");
      return;
    }

    if (flashSaleInfo && quantity > flashSaleInfo.remaining) {
      toast.error(
        `Chỉ còn ${flashSaleInfo.remaining} sản phẩm trong Flash Sale!`,
      );
      return;
    }

    // Tạo item tạm thời để truyền qua checkout
    const tempCartItem = {
      _id: `temp-${product._id}`,
      dish_id: {
        _id: product._id,
        name: product.name,
        price: flashSaleInfo ? flashSaleInfo.originalPrice : product.price,
        sale_price: flashSaleInfo
          ? flashSaleInfo.salePrice
          : product.sale_price,
        imageUrls:
          product.images?.map((img) => img.image_url) ||
          product.imageUrls ||
          [],
        defaultImageIndex: product.defaultImageIndex || 0,
      },
      quantity: quantity,
      flashSaleId: flashSaleInfo?.flashSaleId, // Thêm flashSaleId để xử lý sau
    };

    // Chuyển đến checkout với state
    navigate("/checkout", {
      state: {
        directBuyItem: tempCartItem,
        fromProductDetail: true,
      },
    });
  };

  // Fetch product by id
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        // 1️ Fetch product by id
        const res = await productService.getById(id);
        if (!res.success) return;
        const prod = res.data;
        // Normalize images: server may return either `images` (array of objects)
        // or `imageUrls` (array of strings). Ensure `product.images` is an
        // array of objects with `image_url` so the UI can use a single shape.
        const normalizedImages =
          prod?.images && prod.images.length > 0
            ? prod.images
            : (prod?.imageUrls || []).map((url) => ({ image_url: url }));

        const prodWithImages = { ...prod, images: normalizedImages };
        setProduct(prodWithImages);

        // Lấy Flash Sale info từ product data (đã có sẵn từ backend)
        if (prod.flashSale) {
          setFlashSaleInfo(prod.flashSale);
        }

        const defaultIndex =
          typeof prod.defaultImageIndex === "number"
            ? prod.defaultImageIndex
            : 0;
        setThumbnail(
          normalizedImages[defaultIndex] || normalizedImages[0] || null,
        );

        // 2️ Fetch category dựa trên category_id
        if (prod.category._id) {
          const categoryRes = await categoryService.getById(prod.category._id);
          if (categoryRes.success) {
            setCategoryName(categoryRes.data.name);
          }
        }

        // 3️ Fetch related products using the public listing API filtered by category
        if (prod?.category._id) {
          try {
            const relatedRes = await productService.getAll({
              category: prod.category._id,
              limit: 8,
            });
            console.debug("relatedRes (raw):", relatedRes);
            // server returns { success, data: { dishes, pagination } }
            if (relatedRes && relatedRes.success) {
              const related =
                (relatedRes.data && relatedRes.data.dishes) ||
                relatedRes.data ||
                [];
              setRelatedProducts(Array.isArray(related) ? related : []);
            } else {
              console.warn("Related products API returned no data", relatedRes);
              setRelatedProducts([]);
            }
          } catch (e) {
            // If axios error, try to print response body for debugging
            if (e?.response) {
              console.warn(
                "Related products error response:",
                e.response.status,
                e.response.data,
              );
            } else {
              console.warn("Failed to fetch related products:", e);
            }
            setRelatedProducts([]);
          }
        }
      } catch (err) {
        console.error("Error fetching product:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  // Fetch upcoming Flash Sale nếu sản phẩm không có active Flash Sale
  useEffect(() => {
    const fetchUpcomingFlashSale = async () => {
      if (!product || flashSaleInfo) return; // Nếu đã có active Flash Sale thì không cần fetch upcoming

      try {
        const res = await flashsaleApi.getNearest();
        if (res && res.success && res.data) {
          console.debug("Upcoming Flash Sale response:", res);
          const upcomingProgram = res.data;
          const now = new Date();
          const startTime = new Date(upcomingProgram.startTime);

          // Chỉ hiển thị nếu là upcoming (chưa bắt đầu)
          if (startTime > now) {
            // Kiểm tra sản phẩm hiện tại có trong chương trình không
            const dishInProgram = upcomingProgram.dishes?.find(
              (d) => d.dish_id._id.toString() === product._id.toString(),
            );

            if (dishInProgram) {
              setUpcomingFlashSale({
                flashSaleId: upcomingProgram._id,
                name: upcomingProgram.name,
                startTime: upcomingProgram.startTime,
                endTime: upcomingProgram.endTime,
                salePrice: dishInProgram.salePrice,
                originalPrice: dishInProgram.originalPrice,
                stock: dishInProgram.stock,
              });
            }
          }
        }
      } catch (err) {
        console.error("Error fetching upcoming flash sale:", err);
      }
    };

    fetchUpcomingFlashSale();
  }, [product, flashSaleInfo]);

  // Fetch ratings
  useEffect(() => {
    const fetchRatings = async () => {
      try {
        setLoadingRatings(true);
        const res = await ratingService.getByDish(id, { page, limit });
        console.log("Ratings response:", res);
        if (res.success) {
          const visibleRatings = res.data.ratings.filter(
            (r) => r.status === "visible",
          );

          console.log("Visible ratings:", visibleRatings);

          setRatings(visibleRatings);
          setTotal(visibleRatings.length);
          setAverageRating(res.data.averageRating || 0);
          setTotalRatings(res.data.totalRatings || 0);
        }
      } catch (err) {
        console.error("Error fetching ratings:", err);
      } finally {
        setLoadingRatings(false);
      }
    };

    fetchRatings();
  }, [id, page, limit]);

  const sliderSettings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 4,
    slidesToScroll: 4,
    responsive: [
      { breakpoint: 1024, settings: { slidesToShow: 3, slidesToScroll: 3 } },
      { breakpoint: 768, settings: { slidesToShow: 2, slidesToScroll: 2 } },
      { breakpoint: 640, settings: { slidesToShow: 1, slidesToScroll: 1 } },
    ],
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [id]);

  if (loading) {
    return (
      <div className="w-full h-auto mb-10">
        {/* Loading skeleton — chỉ cho phần nội dung phía dưới (card/info) */}
        <div className="flex flex-col md:flex-row gap-6 md:gap-8 m-4 md:m-8">
          {/* ảnh chính placeholder */}
          <div className="flex-1">
            <div className="w-full h-[500px] bg-gray-200 rounded animate-pulse" />
          </div>

          {/* cột thông tin placeholder */}
          <div className="w-80 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="w-full h-6 bg-gray-200 rounded animate-pulse"
              />
            ))}
            <div className="w-full h-10 bg-gray-200 rounded mt-4 animate-pulse" />
            <div className="w-full h-10 bg-gray-200 rounded mt-2 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!product)
    return <p className="text-center mt-10">Không tìm thấy sản phẩm.</p>;

  return (
    <div className="w-full h-auto mb-10">
      {/* Product info */}
      <div className="flex flex-col lg:flex-row gap-8 md:gap-12 lg:gap-16 m-4 md:m-8 lg:m-28">
        {/* Thumbnails */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex flex-row sm:flex-col gap-3">
            {(product.images || []).map((imageObj, index) => (
              <div
                key={index}
                onClick={() => setThumbnail(imageObj)}
                className={`border rounded overflow-hidden cursor-pointer w-30 h-30 ${
                  thumbnail === imageObj
                    ? "border-green-700"
                    : "border-gray-300"
                }`}
              >
                <img
                  src={imageObj.image_url}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>

          <div className="flex flex-col">
            <div className="border border-gray-300 rounded overflow-hidden w-full sm:w-[350px] md:w-[400px] lg:w-[500px] h-[250px] sm:h-[350px] md:h-[400px] lg:h-[500px]">
              <img
                src={
                  thumbnail?.image_url ||
                  product.images?.[0]?.image_url ||
                  assets.logo
                }
                alt="Selected product"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>

        {/* Product details */}
        <div className="flex-1 mt-6 lg:mt-0">
          <p className="text-xl text-gray-500">{categoryName}</p>
          <h1 className="text-3xl font-bold mt-2">{product.name}</h1>

          {/* Rating summary */}
          <div className="flex flex-wrap items-center divide-x divide-gray-300">
            <div className="flex items-center gap-2 pr-4">
              <StarRating rating={Math.round(averageRating)} />
              <span className="text-gray-600">
                ({averageRating.toFixed(1)})
              </span>
            </div>

            <div className="flex items-center text-gray-700 px-4">
              <FaShoppingCart className="text-green-600 mr-1 inline-block" />
              <p className="text-sm">
                <span className="font-medium">{product.soldCount || 0}</span> đã
                bán
              </p>
            </div>
          </div>

          {/* Flash Sale Badge */}
          {flashSaleInfo && (
            <div className="mt-4 bg-gradient-to-r from-red-500 to-pink-500 text-white px-4 py-2 rounded-lg inline-flex items-center gap-2 ">
              <span className="text-xl">⚡</span>
              <span className="font-bold text-lg">FLASH SALE</span>
              <span className="bg-white text-red-600 px-2 py-1 rounded text-sm font-bold">
                -
                {Math.round(
                  ((flashSaleInfo.originalPrice - flashSaleInfo.salePrice) /
                    flashSaleInfo.originalPrice) *
                    100,
                )}
                %
              </span>
              <span className="text-sm">
                Còn lại:{" "}
                <span className="font-bold">{flashSaleInfo.remaining}</span> sản
                phẩm
              </span>
            </div>
          )}

          {/* Upcoming Flash Sale Info */}
          {!flashSaleInfo && upcomingFlashSale && (
            <div className="mt-4 bg-gradient-to-r from-orange-400 to-yellow-500 text-white px-4 py-3 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">⚡</span>
                <span className="font-bold text-lg">
                  FLASH SALE SẮP DIỄN RA
                </span>
              </div>
              <div className="text-sm space-y-1">
                <p>
                  <span className="font-semibold">Bắt đầu:</span>{" "}
                  {new Date(upcomingFlashSale.startTime).toLocaleString(
                    "vi-VN",
                    {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    },
                  )}
                </p>
                <p>
                  <span className="font-semibold">Giá Flash Sale:</span>{" "}
                  <span className="text-xl font-bold">
                    {formatCurrency(upcomingFlashSale.salePrice)}
                  </span>
                  <span className="line-through ml-2 text-sm opacity-80">
                    {formatCurrency(upcomingFlashSale.originalPrice)}
                  </span>
                  <span className="ml-2 bg-white text-orange-600 px-2 py-0.5 rounded text-xs font-bold">
                    -
                    {Math.round(
                      ((upcomingFlashSale.originalPrice -
                        upcomingFlashSale.salePrice) /
                        upcomingFlashSale.originalPrice) *
                        100,
                    )}
                    %
                  </span>
                </p>
              </div>
            </div>
          )}

          {/* Price info */}
          <div className="flex items-center gap-4 mt-4">
            {flashSaleInfo ? (
              <>
                {/* Flash Sale Price */}
                <p className="text-4xl font-bold text-red-600">
                  {formatCurrency(flashSaleInfo.salePrice)}
                </p>
                <p className="text-2xl text-gray-500 line-through">
                  {formatCurrency(flashSaleInfo.originalPrice)}
                </p>
                <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                  -
                  {Math.round(
                    ((flashSaleInfo.originalPrice - flashSaleInfo.salePrice) /
                      flashSaleInfo.originalPrice) *
                      100,
                  )}
                  %
                </span>
              </>
            ) : product.sale_price && product.sale_price > 0 ? (
              <>
                {/* Regular Sale Price */}
                <p className="text-4xl font-bold text-green-700">
                  {formatCurrency(product.sale_price)}
                </p>
                <p className="text-2xl text-gray-500 line-through">
                  {formatCurrency(product.price)}
                </p>
                <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                  -
                  {Math.round(
                    ((product.price - product.sale_price) / product.price) *
                      100,
                  )}
                  %
                </span>
              </>
            ) : (
              <>
                {/* Regular Price */}
                <p className="text-4xl font-bold text-green-700">
                  {formatCurrency(product.price)}
                </p>
              </>
            )}
          </div>

          <div className="flex items-center gap-4 mt-10">
            {/* Quantity */}
            <div className="flex items-center border rounded-lg overflow-hidden w-32 justify-between">
              <button
                onClick={() => setQuantity((prev) => Math.max(prev - 1, 1))}
                className="w-10 py-2 bg-gray-100 hover:bg-gray-200 text-lg font-semibold cursor-pointer"
              >
                -
              </button>
              <span className="flex-1 text-center text-lg font-medium">
                {quantity}
              </span>
              <button
                onClick={() =>
                  setQuantity((prev) => {
                    const maxQuantity = flashSaleInfo
                      ? flashSaleInfo.remaining
                      : Infinity;
                    return prev < maxQuantity ? prev + 1 : prev;
                  })
                }
                disabled={flashSaleInfo && quantity >= flashSaleInfo.remaining}
                className="w-10 py-2 bg-gray-100 hover:bg-gray-200 text-lg font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                +
              </button>
            </div>

            {flashSaleInfo && (
              <span className="text-sm text-gray-600">
                (Tối đa: {flashSaleInfo.remaining} sản phẩm)
              </span>
            )}

            {/* Add to Cart */}
            <button
              onClick={handleAddToCart}
              className="flex-1 py-3.5 font-medium bg-gray-100 text-gray-800 hover:bg-gray-200 transition rounded-lg shadow-sm cursor-pointer"
            >
              Thêm vào giỏ hàng
            </button>

            {/* Buy Now */}
            <button
              onClick={handleBuyNow}
              className="flex-1 py-3.5 font-medium bg-green-700 text-white hover:bg-green-800 transition rounded-lg shadow-sm cursor-pointer"
            >
              Mua ngay
            </button>
          </div>

          <div className="mt-6 text-sm text-gray-800">
            {/* Nutrition Info */}
            {product.totalEnergyKcal > 0 && (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="font-medium text-gray-700 mb-2">
                  <span>Phân loại:</span> {categoryName}
                </p>

                <p className="font-medium text-gray-700 mb-2">
                  <span>Tags:</span> {product.tags?.join(", ")}
                </p>
                <h3 className="font-semibold text-lg text-green-800 mb-3">
                  Thông tin dinh dưỡng
                </h3>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <img
                      src={assets.kcal_icon}
                      alt="Kcal Icon"
                      className="w-6 h-6"
                    />
                    <div>
                      <p className="text-xs text-gray-600">Năng lượng</p>
                      <p className="font-bold text-green-700">
                        {product.totalEnergyKcal} kcal
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <img
                      src={assets.protein_icon}
                      alt="Protein Icon"
                      className="w-6 h-6"
                    />
                    <div>
                      <p className="text-xs text-gray-600">Protein</p>
                      <p className="font-semibold text-gray-800">
                        {product.totalProtein || 0}g
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <img
                      src={assets.carb_icon}
                      alt="Carb Icon"
                      className="w-6 h-6"
                    />
                    <div>
                      <p className="text-xs text-gray-600">Carbs</p>
                      <p className="font-semibold text-gray-800">
                        {product.totalCarbs || 0}g
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <img
                      src={assets.fat_icon}
                      alt="Fat Icon"
                      className="w-6 h-6"
                    />
                    <div>
                      <p className="text-xs text-gray-600">Chất béo</p>
                      <p className="font-semibold text-gray-800">
                        {product.totalFat || 0}g
                      </p>
                    </div>
                  </div>
                </div>

                {/* Ingredients List */}
                {product.ingredients && product.ingredients.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-green-200">
                    <p className="font-medium text-gray-700 mb-2">
                      Nguyên liệu:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {product.ingredients.map((item, index) => (
                        <span
                          key={item._id || index}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-green-300 rounded-full text-xs text-gray-700 shadow-sm"
                        >
                          <span className="font-semibold text-gray-900">
                            {item.ingredient?.name || ""}
                          </span>
                          {item.ingredient?.origin?.trim() && (
                            <>
                              <span className="text-gray-400">•</span>
                              <span>{item.ingredient.origin}</span>
                            </>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            <p className="text-gray-700 mt-6">Mô tả: {product.description}</p>
          </div>
        </div>
      </div>

      {/* Ratings & Reviews */}
      <div className="m-16 px-20">
        <h2 className="text-3xl font-semibold mb-6">Đánh giá sản phẩm</h2>

        {/* Rating stats */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-4">
            <div className="text-4xl font-bold text-yellow-500">
              {averageRating.toFixed(1)}
            </div>
            <div>
              <StarRating rating={Math.round(averageRating)} />
              <p className="text-gray-600">{totalRatings} đánh giá</p>
            </div>
          </div>
        </div>

        {/* Danh sách ratings */}
        {loadingRatings ? (
          <p>Đang tải đánh giá...</p>
        ) : ratings.length === 0 ? (
          <p className="text-gray-500 ">Chưa có đánh giá nào.</p>
        ) : (
          <div className="space-y-4 ">
            {ratings.map((r) => (
              <div
                key={r._id.toString()}
                className="border rounded-lg p-4 bg-white shadow-sm"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <img
                      src={r.user_id?.avatar || assets.avatar}
                      alt="User Avatar"
                      className="w-6 h-6 rounded-full object-cover"
                    />
                    <p className="font-medium text-gray-800">
                      {r.user_id?.name || "Người dùng ẩn danh"}
                    </p>
                  </div>
                  <p className="text-xs text-gray-400">
                    {new Date(r.created_at || r.createdAt).toLocaleString(
                      "vi-VN",
                    )}
                  </p>
                </div>
                <StarRating rating={r.rating || 5} />
                <p className="text-gray-700 mt-2">{r.content}</p>
              </div>
            ))}

            {/* Nút phân trang */}
            <div className="flex justify-center mt-6 space-x-2">
              {Array.from({ length: Math.ceil(total / limit) }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  className={`px-3 py-1 rounded cursor-pointer ${
                    page === i + 1
                      ? "bg-green-700 text-white"
                      : "bg-gray-200 text-gray-700"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div className="m-16">
          <h2 className="text-3xl font-semibold mb-4 text-center gap-6">
            Sản phẩm khác
          </h2>
          <Slider {...sliderSettings}>
            {relatedProducts.map((product) => {
              const primary_image =
                product.images && product.images.length > 0
                  ? product.images.find((img) => img.is_primary)?.image_url ||
                    product.images[0].image_url
                  : product.imageUrls && product.imageUrls.length > 0
                    ? product.imageUrls[0]
                    : "";

              return (
                <ProductCard
                  key={product._id}
                  product={{ ...product, primary_image }}
                />
              );
            })}
          </Slider>
        </div>
      )}
      {/* <ScrollToTopButton /> */}
    </div>
  );
};

export default ProductDetails;
