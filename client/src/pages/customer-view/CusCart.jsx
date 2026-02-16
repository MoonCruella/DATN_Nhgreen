import React, { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { assets } from "@/assets/assets";
import { useCartContext } from "@/context/CartContext";
import CartTable from "@/components/customer-view/cart/CartTable";
import CartTotals from "@/components/customer-view/cart/CartTotals";
import { Trash2 } from "lucide-react";

const CustomerCart = () => {
  const {
    items: cartItems = [],
    updateQuantity,
    removeFromCart,
    clearCart,
    selectedItems,
    toggleSelectItem,
    selectAllItems,
    deselectAllItems,
    isAllSelected,
    getSelectedItems,
    getSelectedTotal,
    loadCart,
  } = useCartContext();

  const location = useLocation();
  // cuộn lên đầu mỗi khi route thay đổi (đảm bảo khi navigate tới trang Cart luôn ở đầu)
  useEffect(() => {
    loadCart();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [location.pathname]);

  // Calculate total for SELECTED items only
  const selectedTotal = getSelectedTotal();
  const selectedItemsCount = selectedItems.length;

  // Check if any selected item is inactive
  const selectedItemsDetails = getSelectedItems();
  const hasInactiveItems = selectedItemsDetails.some(
    (item) => item.dish_id?.status === "inactive"
  );

  return (
    <main className="bg-gray-50 min-h-screen ">
      {/* Cart Section */}
      <section className="py-16 container mx-auto px-4 grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 flex flex-col">
          {/*  Selection Summary Bar */}
          {cartItems.length > 0 && (
            <div className="bg-white shadow-sm border border-gray-100 rounded-xl p-4 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={() => {
                      if (isAllSelected) {
                        deselectAllItems();
                      } else {
                        selectAllItems();
                      }
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-5 h-5 border-2 border-gray-300 rounded-md peer-checked:bg-green-600 peer-checked:border-green-600 transition-all duration-200 flex items-center justify-center group-hover:border-green-500">
                    <svg
                      className={`w-3.5 h-3.5 text-white transition-all duration-200 ${
                        isAllSelected
                          ? "scale-100 opacity-100"
                          : "scale-0 opacity-0"
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
                <label
                  onClick={() => {
                    if (isAllSelected) {
                      deselectAllItems();
                    } else {
                      selectAllItems();
                    }
                  }}
                  className="font-medium text-gray-700 cursor-pointer select-none"
                >
                  Chọn tất cả ({cartItems.length} sản phẩm)
                </label>
              </div>

              {selectedItemsCount > 0 && (
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600">
                    Đã chọn:{" "}
                    <span className="font-semibold text-green-700">
                      {selectedItemsCount}
                    </span>{" "}
                    sản phẩm
                  </span>
                  {isAllSelected && (
                    <button
                      onClick={() => {
                        if (
                          window.confirm(
                            "Bạn có chắc chắn muốn xóa toàn bộ giỏ hàng?"
                          )
                        ) {
                          clearCart();
                        }
                      }}
                      className="text-sm text-red-600 hover:text-red-700 font-medium cursor-pointer flex items-center gap-1"
                    >
                      <Trash2 className="w-4 h-4" />
                      Xóa tất cả
                    </button>
                  )}
                </div>
              )}

              {/* Clear All Button removed - now integrated with selection info */}
            </div>
          )}

          {/* Cart Table */}
          <CartTable
            cartItems={cartItems}
            updateQuantity={updateQuantity}
            removeFromCart={removeFromCart}
            selectedItems={selectedItems}
            toggleSelectItem={toggleSelectItem}
          />

          <div className="mt-5 flex justify-end">
            <Link
              to="/products"
              className="hover:underline font-medium text-primary cursor-pointer"
            >
              Tiếp tục mua sắm
            </Link>
          </div>
        </div>

        <CartTotals
          subtotal={selectedTotal}
          cartItems={getSelectedItems()}
          selectedCount={selectedItemsCount}
          totalCount={cartItems.length}
          hasInactiveItems={hasInactiveItems}
        />
      </section>
    </main>
  );
};

export default CustomerCart;
