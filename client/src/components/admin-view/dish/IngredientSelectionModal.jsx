import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ingredientApi from "@/api/ingredientApi";

// Ingredient type options
const INGREDIENT_TYPES = [
  { value: "all", label: "Tất cả phân loại" },
  { value: "tinh_bot", label: "Tinh bột" },
  { value: "protein_dong_vat", label: "Protein động vật" },
  { value: "protein_thuc_vat", label: "Protein thực vật" },
  { value: "rau_cu_qua", label: "Rau củ quả" },
  { value: "trai_cay", label: "Trái cây" },
  { value: "do_uong", label: "Đồ uống" },
  { value: "do_ngot", label: "Đồ ngọt" },
];

const IngredientSelectionModal = ({
  open,
  onClose,
  onSelectIngredients,
  alreadySelectedIngredients = [], // Array of ingredient IDs that are already selected
}) => {
  const accessToken = useSelector((state) => state.auth.accessToken);

  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name-asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedIngredients, setSelectedIngredients] = useState([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const itemsPerPage = 10;

  // Handle modal animation
  useEffect(() => {
    if (open) {
      setIsAnimating(true);
      setSelectedIngredients([]);
      setCurrentPage(1);
      fetchIngredients();
    } else {
      setTimeout(() => setIsAnimating(false), 300);
    }
  }, [open]);

  // Fetch ingredients when filters change
  useEffect(() => {
    if (open) {
      fetchIngredients();
    }
  }, [searchTerm, typeFilter, sortBy, currentPage]);

  // Fetch ingredients from API
  const fetchIngredients = async () => {
    try {
      setLoading(true);

      // Build params
      const params = {
        page: currentPage,
        limit: itemsPerPage,
      };

      if (searchTerm) {
        params.search = searchTerm;
      }

      if (typeFilter && typeFilter !== "all") {
        params.type = typeFilter;
      }

      // Only get available ingredients
      params.status = "available";

      // Handle sort
      const [field, order] = sortBy.split("-");
      params.sortBy = field;
      params.sortOrder = order;

      const res = await ingredientApi.getAll(accessToken, params);

      if (res?.data) {
        setIngredients(res.data);
        setTotalPages(res.pagination?.totalPages || 1);
        setTotalItems(res.pagination?.total || res.data.length);
      }
    } catch (error) {
      console.error("Error fetching ingredients:", error);
      toast.error("Lỗi tải danh sách nguyên liệu");
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Reset filters
  const handleResetFilters = () => {
    setSearchTerm("");
    setTypeFilter("all");
    setSortBy("name-asc");
    setCurrentPage(1);
  };

  // Toggle ingredient selection
  const toggleIngredientSelection = (ingredient) => {
    setSelectedIngredients((prev) => {
      const exists = prev.find((i) => i._id === ingredient._id);
      if (exists) {
        return prev.filter((i) => i._id !== ingredient._id);
      } else {
        return [...prev, { ...ingredient, quantityGram: 100 }];
      }
    });
  };

  // Check if ingredient is selected
  const isIngredientSelected = (ingredientId) => {
    return selectedIngredients.some((i) => i._id === ingredientId);
  };

  // Check if ingredient is already selected in parent
  const isIngredientAlreadySelected = (ingredientId) => {
    return alreadySelectedIngredients.includes(ingredientId);
  };

  // Add all selected ingredients at once
  const handleAddSelectedIngredients = () => {
    if (selectedIngredients.length === 0) {
      return;
    }
    onSelectIngredients(selectedIngredients);
    onClose();
  };

  if (!open && !isAnimating) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/50 z-[60] transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      {/* Sidebar */}
      <div
        className={`fixed right-0 top-0 h-full w-[600px] bg-white shadow-2xl z-[70] transform transition-transform duration-300 ease-in-out flex flex-col ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-green-50">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              Chọn nguyên liệu
            </h2>
            {selectedIngredients.length > 0 && (
              <p className="text-sm text-green-700 mt-1">
                Đã chọn {selectedIngredients.length} nguyên liệu
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
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1); // Reset to page 1 when searching
                }}
                placeholder="Nhập tên nguyên liệu..."
                className="w-full"
              />
            </div>

            {/* Type Filter */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Phân loại
              </label>
              <Select
                value={typeFilter}
                onValueChange={(value) => {
                  setTypeFilter(value);
                  setCurrentPage(1); // Reset to page 1 when filtering
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn phân loại" />
                </SelectTrigger>
                <SelectContent>
                  {INGREDIENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                  <SelectItem value="name-asc">Tên A-Z</SelectItem>
                  <SelectItem value="name-desc">Tên Z-A</SelectItem>
                  <SelectItem value="energyKcal-asc">
                    Kcal thấp - cao
                  </SelectItem>
                  <SelectItem value="energyKcal-desc">
                    Kcal cao - thấp
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Reset Filters Button */}
            {(searchTerm || typeFilter !== "all" || sortBy !== "name-asc") && (
              <Button
                variant="outline"
                onClick={handleResetFilters}
                className="w-full"
              >
                Đặt lại bộ lọc
              </Button>
            )}
          </div>

          {/* Info */}
          <div className="flex items-center justify-between text-sm text-gray-600 py-2 border-y">
            <p>
              Trang {currentPage} / {totalPages} - Tổng: {totalItems} nguyên
              liệu
            </p>
          </div>

          {/* Ingredients List */}
          <div className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600">Đang tải...</p>
                </div>
              </div>
            ) : ingredients.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <p className="text-center text-gray-500">
                  Không tìm thấy nguyên liệu nào
                </p>
              </div>
            ) : (
              ingredients.map((ingredient) => {
                const isSelected = isIngredientSelected(ingredient._id);
                const isAlreadySelected = isIngredientAlreadySelected(
                  ingredient._id
                );

                return (
                  <div
                    key={ingredient._id}
                    onClick={() => !isAlreadySelected && toggleIngredientSelection(ingredient)}
                    className={`border rounded-lg p-4 transition-all ${
                      isSelected
                        ? "border-green-500 bg-green-50 cursor-pointer"
                        : isAlreadySelected
                        ? "border-gray-300 bg-gray-50 opacity-50"
                        : "border-gray-200 hover:border-green-300 cursor-pointer"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={isAlreadySelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleIngredientSelection(ingredient);
                        }}
                        className="w-5 h-5 text-green-600 rounded cursor-pointer"
                      />
                      {/* Ingredient Image */}
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        {ingredient.imageUrl ? (
                          <img
                            src={ingredient.imageUrl}
                            alt={ingredient.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                            No image
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-800">
                          {ingredient.name}
                        </h3>
                      </div>
                      {isAlreadySelected && (
                        <span className="text-xs text-gray-500 font-medium">
                          Đã chọn
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t bg-gray-50">
          {/* Actions */}
          <div className="p-4 border-b flex items-center justify-between gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition cursor-pointer"
            >
              Hủy
            </button>
            <button
              onClick={handleAddSelectedIngredients}
              disabled={selectedIngredients.length === 0}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition ${
                selectedIngredients.length > 0
                  ? "bg-green-600 text-white hover:bg-green-700 cursor-pointer"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              Thêm{" "}
              {selectedIngredients.length > 0
                ? `${selectedIngredients.length} `
                : ""}
              nguyên liệu
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
                        key={i}
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

export default IngredientSelectionModal;
