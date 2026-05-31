import React from "react";
import { useNavigate } from "react-router-dom";

const CartTotals = ({
  subtotal,
  cartItems = [],
  selectedItems = [], // Thêm prop selectedItems
  selectedCount = 0,
  totalCount = 0,
  hasInactiveItems = false,
}) => {
  const navigate = useNavigate();
  const discount = 0;
  const total = subtotal - discount; //  Bỏ shippingFee

  const hasSelection = selectedCount > 0;
  const isDisabled = !hasSelection || subtotal <= 0 || hasInactiveItems;

  const handleCheckout = () => {
    if (isDisabled) return;

    console.log("🛒 Checkout - Debug:", {
      totalCartItems: cartItems.length,
      selectedItemsCount: selectedItems.length,
      selectedItemIds: selectedItems.map((i) => i._id),
    });

    //  Pass selected items without shipping fee
    navigate("/checkout", {
      state: {
        selectedItems: selectedItems, // Sử dụng selectedItems thay vì cartItems
        subtotal,
        discount,
        total,
      },
    });
  };

  return (
    <div className="bg-white shadow rounded-xl p-6 h-fit sticky top-4">
      <h2 className="text-2xl font-bold mb-4">Tổng kết giỏ hàng</h2>

      {/* Price Breakdown */}
      <div className="space-y-3 border-t pt-4">
        <div className="flex justify-between text-gray-600">
          <span>Tổng tiền các sản phẩm </span>
          <span className="font-medium text-gray-800">
            {subtotal.toLocaleString("vi-VN")}₫
          </span>
        </div>

        {discount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Giảm giá</span>
            <span className="font-medium">
              -{discount.toLocaleString("vi-VN")}₫
            </span>
          </div>
        )}

        <div className="border-t pt-3 flex justify-between items-center">
          <span className="text-lg font-bold text-gray-800">Tổng cộng</span>
          <div className="text-right">
            <span className="text-2xl font-bold text-green-700">
              {hasSelection ? total.toLocaleString("vi-VN") : "0"}₫
            </span>
            {hasSelection && selectedCount > 1 && (
              <p className="text-xs text-gray-500 mt-1">
                ({selectedCount} sản phẩm)
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Checkout Button */}
      <button
        onClick={handleCheckout}
        disabled={isDisabled}
        className={`w-full mt-6 py-3 rounded-lg font-medium transition-all duration-200 ${
          isDisabled
            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
            : "bg-green-600 text-white hover:bg-green-700 active:scale-95 shadow-md hover:shadow-lg cursor-pointer"
        }`}
      >
        {hasSelection ? (
          <>
            Thanh toán
            {selectedCount > 1 && (
              <span className="text-xs ml-2 opacity-90">
                ({selectedCount} )
              </span>
            )}
          </>
        ) : (
          "Chọn sản phẩm để thanh toán"
        )}
      </button>

      {/* Warning/Info Messages */}
      {totalCount === 0 ? (
        <p className="text-red-500 text-sm mt-3 text-center">
          Giỏ hàng trống, không thể thanh toán
        </p>
      ) : hasInactiveItems ? (
        <p className="text-orange-600 text-sm mt-3 text-center font-medium">
          ⚠️ Giỏ hàng có sản phẩm ngừng bán. Vui lòng bỏ chọn hoặc xóa sản phẩm
          để tiếp tục.
        </p>
      ) : !hasSelection ? (
        <p className="text-amber-600 text-sm mt-3 text-center">
          * Chọn sản phẩm để tiếp tục
        </p>
      ) : (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-700 text-center">
            💡 Phí ship sẽ được tính ở trang thanh toán
          </p>
        </div>
      )}

      {/* Continue Shopping Link */}
      {totalCount > 0 && (
        <div className="mt-4 pt-4 border-t">
          <a
            href="/products"
            className="text-sm text-green-600 hover:text-green-700 font-medium flex items-center justify-center gap-1 hover:gap-2 transition-all cursor-pointer"
          >
            ← Tiếp tục mua sắm
          </a>
        </div>
      )}
    </div>
  );
};

export default CartTotals;
