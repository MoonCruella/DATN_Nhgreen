import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";

const DishSelectionModal = ({
  open,
  onClose,
  dishes,
  searchTerm,
  setSearchTerm,
  onSelectDishes,
  alreadySelectedDishes = [], // Array of dish IDs that are already selected in parent
  loading = false,
}) => {
  const [sortBy, setSortBy] = useState("soldCount-desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDishes, setSelectedDishes] = useState([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const itemsPerPage = 10;

  // Handle modal animation
  useEffect(() => {
    if (open) {
      setIsAnimating(true);
      setCurrentPage(1);
      setSelectedDishes([]);
    } else {
      const timer = setTimeout(() => setIsAnimating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Filter only active dishes (backend already filters by status, but double check)
  const activeDishes = dishes.filter((dish) => dish.status === "active");

  // No search filter needed - backend handles it via API

  // Apply sorting
  const sortedDishes = [...activeDishes].sort((a, b) => {
    switch (sortBy) {
      case "soldCount-desc":
        return (b.soldCount || 0) - (a.soldCount || 0);
      case "soldCount-asc":
        return (a.soldCount || 0) - (b.soldCount || 0);
      case "price-asc":
        return (a.price || 0) - (b.price || 0);
      case "price-desc":
        return (b.price || 0) - (a.price || 0);
      default:
        return 0;
    }
  });

  // Calculate pagination
  const totalPages = Math.ceil(sortedDishes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedDishes = sortedDishes.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Toggle dish selection
  const toggleDishSelection = (dish) => {
    setSelectedDishes((prev) => {
      const exists = prev.find((d) => d._id === dish._id);
      if (exists) {
        return prev.filter((d) => d._id !== dish._id);
      } else {
        return [...prev, dish];
      }
    });
  };

  // Check if dish is selected
  const isDishSelected = (dishId) => {
    return selectedDishes.some((d) => d._id === dishId);
  };

  // Check if dish is already selected in parent
  const isDishAlreadySelected = (dishId) => {
    return alreadySelectedDishes.includes(dishId);
  };

  // Add all selected dishes at once
  const handleAddSelectedDishes = () => {
    if (selectedDishes.length === 0) {
      return;
    }
    // Pass all selected dishes as an array
    onSelectDishes(selectedDishes);
    onClose();
  };

  if (!open && !isAnimating) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      {/* Sidebar */}
      <div
        className={`fixed right-0 top-0 h-full w-[600px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-green-50">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              Chọn sản phẩm cho Flash Sale
            </h2>
            {selectedDishes.length > 0 && (
              <p className="text-sm text-green-700 mt-1">
                Đã chọn {selectedDishes.length} sản phẩm
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-green-100 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Filters */}
          <div className="space-y-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium mb-2">Tìm kiếm</label>
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nhập tên sản phẩm..."
                className="w-full"
              />
            </div>

            {/* Sort */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Sắp xếp theo
              </label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="soldCount-desc">Bán chạy nhất</SelectItem>
                  <SelectItem value="soldCount-asc">Bán ít nhất</SelectItem>
                  <SelectItem value="price-asc">Giá thấp - cao</SelectItem>
                  <SelectItem value="price-desc">Giá cao - thấp</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Info */}
          <div className="flex items-center justify-between text-sm text-gray-600 py-2 border-y">
            <div className="flex items-center gap-2">
              {loading && (
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
              )}
              <p>
                Hiển thị {startIndex + 1}-
                {Math.min(endIndex, sortedDishes.length)} /{" "}
                {sortedDishes.length} sản phẩm
                {loading && (
                  <span className="text-gray-500 ml-1">(đang tải...)</span>
                )}
              </p>
            </div>
            <p className="text-xs text-gray-500">(Chỉ sản phẩm Active)</p>
          </div>

          {/* Products List */}
          <div className="space-y-3">
            {paginatedDishes.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <p className="text-center text-gray-500">
                  Không tìm thấy sản phẩm nào
                </p>
              </div>
            ) : (
              paginatedDishes.map((dish) => {
                const isSelected = isDishSelected(dish._id);
                const isAlreadySelected = isDishAlreadySelected(dish._id);
                const isDisabled = isAlreadySelected;

                return (
                  <div
                    key={dish._id}
                    className={`flex items-center gap-3 p-3 border rounded-lg transition-all ${
                      isDisabled
                        ? "bg-gray-100 border-gray-300 cursor-not-allowed opacity-60"
                        : isSelected
                        ? "bg-green-50 border-green-400 shadow-sm cursor-pointer"
                        : "hover:bg-gray-50 border-gray-200 cursor-pointer"
                    }`}
                    onClick={() => !isDisabled && toggleDishSelection(dish)}
                  >
                    {/* Checkbox */}
                    <div className="flex-shrink-0">
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                          isAlreadySelected
                            ? "bg-gray-400 border-gray-400"
                            : isSelected
                            ? "bg-green-600 border-green-600"
                            : "border-gray-300 bg-white"
                        }`}
                      >
                        {(isSelected || isAlreadySelected) && (
                          <svg
                            className="w-3 h-3 text-white"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="3"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path d="M5 13l4 4L19 7"></path>
                          </svg>
                        )}
                      </div>
                    </div>

                    <img
                      src={
                        dish.imageUrls?.[dish.defaultImageIndex || 0] ||
                        dish.imageUrls?.[0] ||
                        "/placeholder.png"
                      }
                      alt={dish.name}
                      className="w-16 h-16 object-cover rounded flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">
                          {dish.name}
                        </p>
                        {isAlreadySelected && (
                          <span className="px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded-full whitespace-nowrap">
                            Đã chọn
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
                        <span>{dish.price?.toLocaleString("vi-VN")}₫</span>
                        <span>Bán: {dish.soldCount || 0}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer - Actions & Pagination */}
        <div className="border-t bg-gray-50">
          {/* Action Buttons */}
          <div className="p-4 border-b flex items-center justify-between gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition cursor-pointer"
            >
              Hủy
            </button>
            <button
              onClick={handleAddSelectedDishes}
              disabled={selectedDishes.length === 0}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition ${
                selectedDishes.length > 0
                  ? "bg-green-600 text-white hover:bg-green-700 cursor-pointer"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              Thêm{" "}
              {selectedDishes.length > 0 ? `${selectedDishes.length} ` : ""}
              sản phẩm
            </button>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4">
              <div className="flex items-center justify-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  ← Trước
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <Button
                        key={pageNum}
                        size="sm"
                        variant={
                          currentPage === pageNum ? "default" : "outline"
                        }
                        onClick={() => handlePageChange(pageNum)}
                        className={
                          currentPage === pageNum
                            ? "bg-green-600 hover:bg-green-700"
                            : ""
                        }
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Sau →
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default DishSelectionModal;


