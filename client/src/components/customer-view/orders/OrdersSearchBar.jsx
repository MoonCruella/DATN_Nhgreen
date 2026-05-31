import React from "react";
import { Search, X } from "lucide-react";

const OrdersSearchBar = ({
  searchTerm,
  onSearchChange,
  onClearSearch,
  searchInputRef,
  resultsCount,
}) => {
  return (
    <section className="mx-28 -mt-8 relative z-10">
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
              <Search className="w-5 h-5" />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={onSearchChange}
              placeholder="Tìm kiếm theo tên sản phẩm hoặc mã đơn hàng..."
              className="w-full pl-12 pr-12 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition"
            />
            {searchTerm && (
              <button
                onClick={onClearSearch}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-100 px-4 py-3 rounded-xl">
            <span className="font-semibold">{resultsCount}</span>
            <span>kết quả</span>
          </div>
        </div>

        {/* Search results info */}
        {searchTerm && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 flex items-center gap-2">
            <Search className="w-4 h-4" />
            <span>
              Tìm kiếm: "<strong>{searchTerm}</strong>" - Tìm thấy{" "}
              <strong>{resultsCount}</strong> đơn hàng
            </span>
          </div>
        )}
      </div>
    </section>
  );
};

export default OrdersSearchBar;
