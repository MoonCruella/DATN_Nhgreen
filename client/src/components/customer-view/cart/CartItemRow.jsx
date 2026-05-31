import React, { useState, useEffect } from "react";
import { assets } from "@/assets/assets";

const CartItemRow = ({
  item,
  updateQuantity,
  removeFromCart,
  isSelected = false,
  onToggleSelect,
}) => {
  // ✅ Check if dish exists
  const dishExists = item.dish_id && typeof item.dish_id === "object";
  const isDeleted = !dishExists || item.dish_id.deleted;
  const isInactive = dishExists && item.dish_id.status === "inactive";

  // ✅ Check Flash Sale info
  const flashSaleInfo = item.flashSale || null;
  const hasFlashSale = flashSaleInfo && flashSaleInfo.remaining > 0;

  const quantity = Number(item.quantity) || 0;
  const [inputValue, setInputValue] = useState(quantity.toString());

  useEffect(() => {
    setInputValue(quantity.toString());
  }, [quantity]);

  const price = dishExists ? Number(item.dish_id?.price) || 0 : 0;
  const salePrice = dishExists ? Number(item.dish_id?.sale_price) || 0 : 0;

  // Priority: Flash Sale price > Sale price > Regular price
  const displayPrice = hasFlashSale
    ? flashSaleInfo.salePrice
    : salePrice || price;
  const originalPrice = hasFlashSale
    ? flashSaleInfo.originalPrice
    : salePrice
    ? price
    : 0;

  const name = dishExists
    ? item.dish_id?.name || "Sản phẩm"
    : "Sản phẩm đã bị xóa";

  // ✅ Get image from imageUrls array using defaultImageIndex
  const getImage = () => {
    if (!dishExists) return assets.placeholder;

    const imageUrls = item.dish_id?.imageUrls || [];
    const defaultIndex = item.dish_id?.defaultImageIndex || 0;

    if (imageUrls.length > 0) {
      return imageUrls[defaultIndex] || imageUrls[0];
    }

    return assets.placeholder;
  };

  const image = getImage();

  // ✅ If dish is deleted or not exists
  if (isDeleted) {
    return (
      <tr className="border-t bg-red-50">
        <td className="py-4 px-4">
          <input
            type="checkbox"
            disabled
            className="w-5 h-5 text-gray-400 border-gray-300 rounded cursor-not-allowed opacity-50"
          />
        </td>

        <td className="py-4 px-4" colSpan="3">
          <div className="flex items-center gap-4">
            {/* dish Image - Grayed out */}
            <div className="relative">
              <img
                src={image}
                alt="Sản phẩm đã bị xóa"
                className="w-16 h-16 object-cover rounded opacity-40 grayscale"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl">❌</span>
              </div>
            </div>

            {/* dish Info */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-red-600 font-semibold">
                  Sản phẩm không tồn tại
                </span>
              </div>

              <button
                onClick={() => removeFromCart(item._id)}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition text-sm font-medium flex items-center gap-2 cursor-pointer"
              >
                <span>🗑️</span>
                Xóa khỏi giỏ hàng
              </button>
            </div>
          </div>
        </td>
      </tr>
    );
  }

  // ✅ Normal dish row
  return (
    <tr
      className={`border-t transition ${
        isInactive
          ? "bg-orange-50"
          : isSelected
          ? "bg-green-50"
          : "hover:bg-gray-50"
      }`}
    >
      <td className="py-4 px-4">
        <label className="relative inline-flex items-center cursor-pointer group">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            disabled={isInactive}
            className="sr-only peer"
          />
          <div
            className={`w-5 h-5 border-2 ${
              isInactive ? "border-gray-300 bg-gray-100" : "border-gray-300"
            } rounded-md peer-checked:bg-green-600 peer-checked:border-green-600 transition-all duration-200 flex items-center justify-center ${
              isInactive ? "" : "group-hover:border-green-500"
            } ${isInactive ? "cursor-not-allowed" : ""}`}
          >
            <svg
              className={`w-3.5 h-3.5 text-white transition-all duration-200 ${
                isSelected ? "scale-100 opacity-100" : "scale-0 opacity-0"
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
        </label>
      </td>

      {/* dish info */}
      <td className="py-4 px-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <img
              src={image}
              alt={name}
              className="w-16 h-16 object-cover rounded"
              onError={(e) => {
                e.target.src = assets.placeholder;
              }}
            />
          </div>
          <div>
            <h4 className="font-medium text-gray-800">{name}</h4>

            {/* Inactive Status Badge */}
            {isInactive && (
              <div className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 text-xs font-semibold px-2 py-1 rounded mb-1">
                <span>⚠️</span>
                <span>Sản phẩm ngừng bán</span>
              </div>
            )}

            {/* Flash Sale Badge inline */}
            {hasFlashSale && !isInactive && (
              <div className="inline-flex items-center gap-1 bg-red-50 text-red-600 text-xs font-semibold px-2 py-0.5 rounded mb-1">
                <span>⚡</span>
                <span>FLASH SALE</span>
                <span className="text-[10px]">
                  -
                  {Math.round(
                    ((originalPrice - displayPrice) / originalPrice) * 100
                  )}
                  %
                </span>
              </div>
            )}

            <p className="text-sm text-gray-500">
              {isInactive ? (
                // Inactive product - show strikethrough price
                <span className="line-through text-gray-400">
                  {price.toLocaleString("vi-VN")}₫
                </span>
              ) : hasFlashSale ? (
                // Flash Sale price
                <>
                  <span className="text-green-700 font-bold">
                    {displayPrice.toLocaleString("vi-VN")}₫
                  </span>{" "}
                  <span className="line-through text-gray-400 text-xs">
                    {originalPrice.toLocaleString("vi-VN")}₫
                  </span>
                </>
              ) : salePrice ? (
                // Regular sale price
                <>
                  <span className="text-green-700 font-semibold">
                    {salePrice.toLocaleString("vi-VN")}₫
                  </span>{" "}
                  <span className="line-through text-gray-400">
                    {price.toLocaleString("vi-VN")}₫
                  </span>
                </>
              ) : (
                // Regular price
                <span className="text-green-700 font-semibold">
                  {price.toLocaleString("vi-VN")}₫
                </span>
              )}
            </p>
            <button
              onClick={() => removeFromCart(item._id)}
              className="text-xs text-red-600 font-semibold mt-1 cursor-pointer"
            >
              Xóa
            </button>
          </div>
        </div>
      </td>

      {/* Quantity */}
      <td className="py-4 px-4">
        <div className="flex items-center border rounded w-28">
          <button
            onClick={() => {
              if (quantity <= 1) removeFromCart(item._id);
              else updateQuantity(item._id, quantity - 1);
            }}
            disabled={isInactive}
            className={`w-8 h-8 flex items-center justify-center text-gray-600 transition ${
              isInactive
                ? "bg-gray-100 cursor-not-allowed opacity-50"
                : "hover:bg-gray-100 cursor-pointer"
            }`}
          >
            -
          </button>
          <input
            type="number"
            min="1"
            max="1000"
            value={inputValue}
            onChange={(e) => {
              const val = e.target.value;
              // Cho phép xóa hết (empty string)
              setInputValue(val);
              if (val === '') return;
              const numVal = parseInt(val);
              if (numVal >= 1 && numVal < 1000) {
                updateQuantity(item._id, numVal);
              }
            }}
            onBlur={(e) => {
              // Khi blur, nếu rỗng thì set về 1
              const val = e.target.value;
              if (val === '' || parseInt(val) < 1) {
                updateQuantity(item._id, 1);
                setInputValue('1');
              } else if (parseInt(val) >= 1000) {
                updateQuantity(item._id, 999);
                setInputValue('999');
              }
            }}
            disabled={isInactive}
            className={`w-12 text-center border-x text-gray-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
              isInactive ? "bg-gray-50 cursor-not-allowed" : "bg-white"
            }`}
          />
          <button
            onClick={() => updateQuantity(item._id, quantity + 1)}
            disabled={isInactive}
            className={`w-8 h-8 flex items-center justify-center text-gray-600 transition ${
              isInactive
                ? "bg-gray-100 cursor-not-allowed opacity-50"
                : "hover:bg-gray-100 cursor-pointer"
            }`}
          >
            +
          </button>
        </div>
      </td>

      {/* Subtotal */}
      <td className="py-4 px-4 text-right">
        <span
          className={`font-semibold ${
            isInactive
              ? "text-gray-400 line-through"
              : isSelected
              ? "text-green-700"
              : "text-gray-800"
          }`}
        >
          {(displayPrice * quantity).toLocaleString("vi-VN")}₫
        </span>
        {isInactive && (
          <div className="text-xs text-orange-600 font-medium mt-1">
            Không khả dụng
          </div>
        )}
      </td>
    </tr>
  );
};

export default CartItemRow;
