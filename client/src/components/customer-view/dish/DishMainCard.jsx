import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { assets } from "@/assets/assets";
import { useCartContext } from "@/context/CartContext";
import { useSelector } from "react-redux";

const ProductCard = ({ product }) => {
  const { addToCart } = useCartContext();
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  // Flash Sale info đã có sẵn trong product.flashSale từ backend
  const flashSaleInfo = product.flashSale || null;

  // Định dạng tiền tệ VNĐ
  const formatCurrency = (value) =>
    value?.toLocaleString("vi-VN", { style: "currency", currency: "VND" });

  // Xử lý thêm vào giỏ
  const handleAddToCart = async (e) => {
    e.preventDefault();

    // Kiểm tra đăng nhập
    if (!isAuthenticated || !user) {
      toast.info("Vui lòng đăng nhập để thêm vào giỏ hàng!");
      navigate("/auth/login");
      return;
    }

    // Kiểm tra Flash Sale stock nếu có
    if (flashSaleInfo && flashSaleInfo.remaining <= 0) {
      toast.error("Sản phẩm Flash Sale đã hết hàng!");
      return;
    }

    try {
      // Pass flashSaleId nếu có
      await addToCart(product._id, 1, flashSaleInfo?.flashSaleId || null);
      toast.success(`${product.name} đã được thêm vào giỏ hàng!`);
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast.error(
        error.response?.data?.message || "Không thể thêm vào giỏ hàng!"
      );
    }
  };

  return (
    <div
      onClick={() => navigate(`/products/${product._id}`)}
      className="group p-4 mx-4 my-2 bg-white border border-gray-200 overflow-hidden hover:shadow-lg transition duration-300 w-70 cursor-pointer"
    >
      {/* Thumbnail */}
      <div className="relative overflow-hidden ">
        {/* Flash Sale badge - ưu tiên hiển thị nếu có */}
        {flashSaleInfo ? (
          <div className="absolute z-10 bg-red-600 text-white text-sm font-bold px-3 py-1 rounded-sm flex items-center gap-1">
            <img src={assets.thunder} alt="Flash Sale" className="w-4 h-4" />
            <span>FLASH SALE</span>
            <span className="text-xs">
              -
              {Math.round(
                ((flashSaleInfo.originalPrice - flashSaleInfo.salePrice) /
                  flashSaleInfo.originalPrice) *
                  100
              )}
              %
            </span>
          </div>
        ) : (
          /* Discount percent tag (if product has price and sale_price) */
          product.price &&
          product.sale_price &&
          Number(product.price) > Number(product.sale_price) && (
            <div className="absolute z-10 bg-yellow-200 text-[#d44] text-sm font-semibold px-2 py-0.5 rounded-sm flex items-center">
              <img
                src={assets.thunder}
                alt="thunder"
                className="w-4 h-4 mr-1"
              />
              -
              {Math.round(
                ((Number(product.price) - Number(product.sale_price)) /
                  Number(product.price)) *
                  100
              )}
              %
            </div>
          )
        )}
        <img
          src={product.primary_image || assets.logo}
          alt={product.name}
          className="w-full h-56 object-contain transform transition-transform duration-500 group-hover:scale-105"
        />
        {product.isNew && (
          <div className="absolute top-2 left-2 bg-green-600 text-white text-xs font-medium px-2 py-1 rounded">
            New
          </div>
        )}

        {/* Hover action buttons: centered and visible only on hover */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="opacity-0 scale-95 group-hover:opacity-100 transform transition-all duration-300 flex gap-4 pointer-events-auto">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleAddToCart(e);
              }}
              aria-label="Add to cart"
              className="w-12 h-12 flex items-center justify-center rounded-full bg-green-500 text-white shadow-lg hover:bg-green-600 transition cursor-pointer"
            >
              {/* cart icon from assets */}
              <img src={assets.cart} alt="cart" className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Thông tin sản phẩm */}
      <div className="p-4 text-center">
        <h4 className="font-semibold text-gray-800 truncate">{product.name}</h4>

        {/* Star Rating */}
        <div className="flex items-center justify-center gap-1 mt-2">
          {Array.from({ length: 5 }).map((_, index) => {
            const rating = product.avgRating || 0;
            return (
              <span
                key={index}
                className={`text-lg ${
                  index < Math.floor(rating)
                    ? "text-yellow-400"
                    : "text-gray-300"
                }`}
              >
                ★
              </span>
            );
          })}
        </div>

        <p className="text-green-600 font-bold mt-2">
          {flashSaleInfo ? (
            /* Hiển thị giá Flash Sale */
            <>
              <span className="line-through text-gray-400 text-sm mr-2">
                {formatCurrency(flashSaleInfo.originalPrice)}
              </span>
              <span>{formatCurrency(flashSaleInfo.salePrice)}</span>
              {flashSaleInfo.isActive && (
                <div className="text-xs text-red-500 font-semibold mt-1">
                  🔥 Đang bán chạy
                </div>
              )}
            </>
          ) : product.sale_price ? (
            /* Giá sale thông thường */
            <>
              <span className="line-through text-gray-400 text-sm mr-2">
                {formatCurrency(product.price)}
              </span>
              {formatCurrency(product.sale_price)}
            </>
          ) : (
            /* Giá gốc */
            formatCurrency(product.price)
          )}
        </p>
      </div>
    </div>
  );
};

export default ProductCard;
