import React, { useEffect } from "react";
import { X, Utensils } from "lucide-react";

const UnavailableItemsModal = ({
  isOpen,
  onClose,
  unavailableItems,
  onRemoveItems,
  onChangeBranch,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-1/2 mx-6 bg-white dark:bg-slate-800 rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b dark:border-slate-700">
          <div>
            <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <span></span> Món ăn tạm hết hàng
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Một số món ăn trong giỏ hàng tạm hết hàng tại chi nhánh bạn đã
              chọn. Bạn làm ơn thông cảm nhé!
            </p>
          </div>
          <button
            onClick={onClose}
            className="absolute top-3 right-3 mr-2 text-gray-500 hover:text-gray-700 text-xl"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-4 max-h-[70vh] overflow-y-auto custom-scrollbar space-y-4">
          <section>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                Các món ăn không có sẵn tại chi nhánh này
              </h4>
              <span className="text-xs text-gray-500">
                {unavailableItems.length} món
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-4 px-4">
              {unavailableItems.map((item) => {
                // item từ cartItems có cấu trúc: { _id, dish_id: {}, quantity, ... }
                const dish = item.dish_id || item.product_id || item || {};

                // Lấy image URL - ưu tiên imageUrls array với defaultImageIndex
                let imageUrl = "";
                if (dish.imageUrls && Array.isArray(dish.imageUrls)) {
                  const defaultIndex = dish.defaultImageIndex || 0;
                  imageUrl =
                    dish.imageUrls[defaultIndex] || dish.imageUrls[0] || "";
                } else {
                  imageUrl =
                    dish.image_url || dish.imageUrl || dish.image || "";
                }

                const name = dish.name || "Món ăn";
                const price = dish.sale_price || dish.price || 0;
                const quantity = item.quantity || 1;

                return (
                  <div
                    key={item._id}
                    className="flex items-center gap-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg"
                  >
                    {/* Image */}
                    <div className="w-20 h-20 flex-shrink-0 bg-white rounded-lg overflow-hidden">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-200">
                          <Utensils className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                        {name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Số lượng: {quantity}
                      </p>
                      <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                        {price.toLocaleString("vi-VN")} đ
                      </p>
                    </div>

                    {/* Badge */}
                    <div className="flex-shrink-0">
                      <span className="inline-block px-3 py-1 bg-yellow-600 text-white text-xs font-medium rounded-full">
                        Hết hàng
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t dark:border-slate-700">
          <button
            onClick={onChangeBranch}
            className="px-5 py-2 text-sm  font-semibold bg-green-600 text-white rounded-xl hover:bg-green-700 transition cursor-pointer"
          >
            Chọn chi nhánh khác
          </button>
          <button
            onClick={onRemoveItems}
            className="px-5 py-2 text-sm font-semibold bg-red-600 text-white rounded-xl hover:bg-red-700 transition cursor-pointer"
          >
            Xóa các món hết hàng
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnavailableItemsModal;
