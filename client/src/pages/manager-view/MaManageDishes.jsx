import React, { useEffect, useState, useMemo } from "react";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import branchApi from "@/api/branchApi";
import categoryApi from "@/api/categoryApi";
import { RotateCcw } from "lucide-react";
import TableSkeleton from "@/components/manager-view/TableSkeleton";

const MaManageDishes = () => {
  const accessToken = useSelector((state) => state.auth.accessToken);
  const user = useSelector((state) => state.auth.user);
  const branchId = user?.branch_id;

  const PAGE_SIZE = 10;

  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [branch, setBranch] = useState(null);
  const [dishes, setDishes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); // all, available, unavailable
  const [filterCategory, setFilterCategory] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInfo, setPageInfo] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    pageSize: PAGE_SIZE,
  });

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch branch info and categories (once)
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!branchId) {
        toast.error("Bạn chưa được gán chi nhánh");
        setInitialLoading(false);
        return;
      }

      try {
        setInitialLoading(true);

        // Fetch branch info
        const branchRes = await branchApi.getById(branchId);
        setBranch(branchRes.data);

        // Fetch categories
        const categoriesRes = await categoryApi.getAll();
        setCategories(categoriesRes.data || []);
      } catch (error) {
        console.error("Error fetching initial data:", error);
        toast.error("Lỗi tải dữ liệu");
      } finally {
        setInitialLoading(false);
      }
    };

    fetchInitialData();
  }, [branchId]);

  // Calculate page numbers for pagination
  const pageNumbers = useMemo(() => {
    const total = pageInfo.totalPages;
    if (total <= 5) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    const pages = new Set();
    pages.add(1);
    pages.add(total);

    if (currentPage <= 3) {
      pages.add(2);
      pages.add(3);
      pages.add(4);
    } else if (currentPage >= total - 2) {
      pages.add(total - 1);
      pages.add(total - 2);
      pages.add(total - 3);
    } else {
      pages.add(currentPage - 1);
      pages.add(currentPage);
      pages.add(currentPage + 1);
    }

    return Array.from(pages)
      .filter((page) => page >= 1 && page <= total)
      .sort((a, b) => a - b);
  }, [pageInfo.totalPages, currentPage]);

  // Fetch dishes with filters (debounced)
  useEffect(() => {
    const fetchDishes = async () => {
      if (!branchId) return;

      try {
        setLoading(true);

        // Build params for backend filtering
        const params = {
          page: currentPage,
          limit: PAGE_SIZE,
          q: debouncedSearchTerm || undefined,
          category: filterCategory !== "all" ? filterCategory : undefined,
          isAvailable:
            filterStatus === "available"
              ? true
              : filterStatus === "unavailable"
              ? false
              : undefined,
        };

        // Remove undefined params
        Object.keys(params).forEach(
          (key) => params[key] === undefined && delete params[key]
        );

        // Fetch dishes with status
        const dishesRes = await branchApi.getBranchDishes(branchId, params);
        const payload = dishesRes?.data || dishesRes;

        if (payload) {
          const fetchedDishes = Array.isArray(payload)
            ? payload
            : payload.dishes || [];
          setDishes(fetchedDishes);

          // Handle pagination if available
          if (payload.pagination) {
            setPageInfo({
              currentPage: payload.pagination.currentPage ?? currentPage,
              totalPages: payload.pagination.totalPages ?? 1,
              totalItems: payload.pagination.totalItems ?? fetchedDishes.length,
              pageSize: payload.pagination.pageSize ?? PAGE_SIZE,
            });
          } else {
            setPageInfo({
              currentPage: 1,
              totalPages: 1,
              totalItems: fetchedDishes.length,
              pageSize: PAGE_SIZE,
            });
          }
        }
      } catch (error) {
        console.error("Error fetching dishes:", error);
        toast.error("Lỗi tải danh sách món ăn");
      } finally {
        setLoading(false);
      }
    };

    fetchDishes();
  }, [
    branchId,
    debouncedSearchTerm,
    filterCategory,
    filterStatus,
    currentPage,
  ]);

  // No client-side filtering - backend handles it via API

  // Toggle dish status
  const handleToggleStatus = async (dishId, currentStatus, dishName) => {
    const newStatus = !currentStatus;
    const actionText = newStatus ? "bật" : "tắt";

    // Show confirmation dialog
    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn ${actionText} món "${dishName}" tại chi nhánh này?`
    );

    if (!confirmed) {
      return;
    }

    try {
      await branchApi.updateDishStatus(
        accessToken,
        branchId,
        dishId,
        newStatus
      );

      // Update local state
      setDishes((prev) =>
        prev.map((dish) =>
          dish._id === dishId
            ? { ...dish, isAvailableAtBranch: newStatus }
            : dish
        )
      );

      toast.success(`Đã ${actionText} món "${dishName}" tại chi nhánh này`);
    } catch (error) {
      console.error("Error updating dish status:", error);
      toast.error("Lỗi cập nhật trạng thái món ăn");
    }
  };

  if (!branchId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Bạn chưa được gán chi nhánh nào</p>
        </div>
      </div>
    );
  }

  return (
    <main className="bg-gray-50 min-h-screen p-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Quản lý thực đơn - {branch?.name}
            </h1>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Tìm kiếm món ăn
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Nhập tên món ăn..."
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Lọc theo danh mục
            </label>
            <select
              value={filterCategory}
              onChange={(e) => {
                setFilterCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 cursor-pointer"
            >
              <option value="all">Tất cả danh mục</option>
              {categories.map((category) => (
                <option key={category._id} value={category._id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Lọc theo trạng thái
            </label>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 cursor-pointer"
            >
              <option value="all">Tất cả</option>
              <option value="available">Còn hàng</option>
              <option value="unavailable">Hết hàng</option>
            </select>
          </div>
        </div>

        {/* Clear Filters Button & Summary */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            {(loading || searchTerm !== debouncedSearchTerm) && (
              <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
            )}
            <span>
              {searchTerm !== debouncedSearchTerm && (
                <span className="text-gray-500 ml-1">(đang gõ...)</span>
              )}
            </span>
          </div>
          {(searchTerm ||
            filterCategory !== "all" ||
            filterStatus !== "all") && (
            <Button
              onClick={() => {
                setSearchTerm("");
                setFilterCategory("all");
                setFilterStatus("all");
                setCurrentPage(1);
              }}
              variant="outline"
              className="cursor-pointer flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> Xóa bộ lọc
            </Button>
          )}
        </div>
      </div>

      {/* Dishes Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-300 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  #
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Hình ảnh
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Tên món
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Danh mục
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Giá
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Trạng thái
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {initialLoading || loading ? (
                <tr>
                  <td colSpan="6" className="p-0">
                    <TableSkeleton rows={5} columns={6} />
                  </td>
                </tr>
              ) : dishes.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center">
                    <p className="text-gray-500">Không tìm thấy món ăn nào</p>
                  </td>
                </tr>
              ) : (
                dishes.map((dish, index) => (
                  <tr key={dish._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {(pageInfo.currentPage - 1) * pageInfo.pageSize +
                        index +
                        1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <img
                        src={
                          dish.imageUrls[dish.defaultImageIndex] ||
                          "/placeholder-dish.png"
                        }
                        alt={dish.name}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="font-medium">{dish.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {dish.category?.name || dish.category || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      {dish.price?.toLocaleString("vi-VN")}đ
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={dish.isAvailableAtBranch}
                          onCheckedChange={() =>
                            handleToggleStatus(
                              dish._id,
                              dish.isAvailableAtBranch,
                              dish.name
                            )
                          }
                          className="data-[state=checked]:bg-green-600 cursor-pointer"
                        />
                        <span
                          className={`text-sm font-medium${
                            dish.isAvailableAtBranch
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {dish.isAvailableAtBranch ? "Còn hàng" : "Hết hàng"}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pageInfo.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              Trang {pageInfo.currentPage} / {pageInfo.totalPages}
              {pageInfo.totalItems > 0 && (
                <span className="ml-2">
                  · Hiển thị{" "}
                  {Math.min(
                    (pageInfo.currentPage - 1) * pageInfo.pageSize + 1,
                    pageInfo.totalItems
                  )}
                  –
                  {Math.min(
                    pageInfo.currentPage * pageInfo.pageSize,
                    pageInfo.totalItems
                  )}
                  / {pageInfo.totalItems}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                aria-label="Trang trước"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1 || loading}
                className="cursor-pointer"
              >
                ←
              </Button>
              <div className="flex items-center gap-1">
                {pageNumbers.map((page, idx) => {
                  const previousPage = pageNumbers[idx - 1];
                  const needsEllipsis = idx > 0 && page - previousPage > 1;
                  return (
                    <React.Fragment key={page}>
                      {needsEllipsis && (
                        <span className="px-2 text-sm text-gray-500">...</span>
                      )}
                      <button
                        onClick={() => setCurrentPage(page)}
                        disabled={page === currentPage}
                        className={`px-3 py-1 rounded-lg text-sm transition border ${
                          page === currentPage
                            ? "bg-gray-800 text-white border-gray-800"
                            : "bg-white text-gray-700 hover:bg-gray-50 border-gray-200 cursor-pointer"
                        }`}
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                aria-label="Trang kế tiếp"
                onClick={() =>
                  setCurrentPage((prev) =>
                    Math.min(pageInfo.totalPages, prev + 1)
                  )
                }
                disabled={currentPage === pageInfo.totalPages || loading}
                className="cursor-pointer"
              >
                →
              </Button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default MaManageDishes;
