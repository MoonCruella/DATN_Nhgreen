import React from "react";
import { assets } from "@/assets/assets";

const ItemRow = ({ item }) => {
  // Cart API trả về dish_id, fallback product_id nếu có
  const dish = item.dish_id || item.product_id;

  // Check Flash Sale info
  const flashSaleInfo = item.flashSale || null;
  const hasFlashSale = flashSaleInfo && flashSaleInfo.remaining > 0;

  const quantity = Number(item.quantity) || 0;
  const price = Number(dish?.price) || 0;
  const salePrice = Number(dish?.sale_price) || 0;

  // Priority: Flash Sale price > Sale price > Regular price
  const displayPrice = hasFlashSale
    ? flashSaleInfo.salePrice
    : salePrice || price;
  const originalPrice = hasFlashSale
    ? flashSaleInfo.originalPrice
    : salePrice
    ? price
    : 0;

  const name = dish?.name || "Unknown Product";

  // Lấy ảnh từ imageUrls + defaultImageIndex
  const getImage = () => {
    if (!dish) return assets.placeholder;

    const imageUrls = dish.imageUrls || [];
    const defaultIndex = dish.defaultImageIndex || 0;

    if (imageUrls.length > 0) {
      return imageUrls[defaultIndex] || imageUrls[0];
    }

    return assets.placeholder;
  };

  const image = getImage();

  return (
    <tr className="border-t hover:bg-gray-50 transition">
      {/* Product info */}
      <td className="py-4 px-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <img
              src={image}
              alt={name}
              className="w-16 h-16 object-cover rounded"
            />
          </div>
          <div className="flex-1">
            <h4 className="font-medium">{name}</h4>

            {/* Price display */}
            <p className="text-sm mt-1">
              {hasFlashSale ? (
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
                  <span className="line-through text-gray-400 text-xs">
                    {price.toLocaleString("vi-VN")}₫
                  </span>
                </>
              ) : (
                // Regular price
                <span className="text-gray-700 font-medium">
                  {price.toLocaleString("vi-VN")}₫
                </span>
              )}
            </p>
          </div>
        </div>
      </td>

      {/* Quantity */}
      <td className="py-4 px-4">
        <div className="flex items-center ">
          <h4 className="font-semibold p-1">X{quantity}</h4>
        </div>
      </td>

      {/* Subtotal */}
      <td className="py-4 px-4 text-right font-medium">
        <span className={hasFlashSale ? "text-green-700 font-bold" : ""}>
          {(displayPrice * quantity).toLocaleString("vi-VN")}₫
        </span>
      </td>
    </tr>
  );
};

export default ItemRow;
