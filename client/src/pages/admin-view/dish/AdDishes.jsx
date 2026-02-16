import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import dishApi from "@/api/dishApi";
import categoryApi from "@/api/categoryApi";

const AdminDishes = () => {
  const navigate = useNavigate();
  const { accessToken, user, isAuthenticated } = useSelector(
    (s) => s.auth || {}
  );

  const PAGE_SIZE = 10;

  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInfo, setPageInfo] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    pageSize: PAGE_SIZE,
  });
  const [categories, setCategories] = useState([]);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    let isMounted = true;

    const fetchCategories = async () => {
      try {
        const res = await categoryApi.getAll({ limit: 1000 });
        const list = Array.isArray(res?.data) ? res.data : [];
        if (isMounted) {
          setCategories(list);
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };

    fetchCategories();

    return () => {
      isMounted = false;
    };
  }, []);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1);
    }, 500); // 500ms delay after user stops typing

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch all dishes with filters from API
  const fetchDishes = async () => {
    try {
      setLoading(true);
      const token = accessToken || null;

      // Build query params for API
      const params = {
        page: currentPage,
        limit: PAGE_SIZE,
        search: debouncedSearchTerm || undefined,
        category: categoryFilter !== "all" ? categoryFilter : undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
      };

      const cleanedParams = Object.fromEntries(
        Object.entries(params).filter(([, value]) => value !== undefined)
      );

      const res = token
        ? await dishApi.getAll(token, cleanedParams)
        : await dishApi.getAll(cleanedParams);

      if (res?.success === false) {
        toast.error(res.message || "Không thể tải danh sách món ăn");
        return;
      }

      const payload = res?.data ?? res;

      if (payload) {
        const { dishes: fetchedDishes = [], pagination } = payload;

        setDishes(fetchedDishes);

        if (pagination) {
          const normalized = {
            currentPage:
              pagination.currentPage ?? pagination.current_page ?? currentPage,
            totalPages: pagination.totalPages ?? pagination.total_pages ?? 1,
            totalItems:
              pagination.totalItems ??
              pagination.total_items ??
              fetchedDishes.length,
            pageSize:
              pagination.pageSize ?? pagination.items_per_page ?? PAGE_SIZE,
          };

          setPageInfo(normalized);

          if (normalized.currentPage !== currentPage) {
            setCurrentPage(normalized.currentPage);
          }
        } else {
          setPageInfo((prev) => ({
            ...prev,
            currentPage,
            totalPages: 1,
            totalItems: fetchedDishes.length,
            pageSize: PAGE_SIZE,
          }));
        }
      }
    } catch (error) {
      console.error("Error fetching dishes:", error);
      toast.error("Lỗi tải danh sách món ăn");
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "admin") return;
    fetchDishes();
  }, [
    isAuthenticated,
    user,
    debouncedSearchTerm,
    categoryFilter,
    statusFilter,
    currentPage,
  ]);

  const getStatusBadge = (status) => {
    const badges = {
      active: "bg-green-100 text-green-800",
      inactive: "bg-red-100 text-red-800",
    };
    const labels = {
      active: "Hoạt động",
      inactive: "Ngừng bán",
    };
    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-medium ${
          badges[status] || "bg-gray-100 text-gray-800"
        }`}
      >
        {labels[status] || status}
      </span>
    );
  };

  // No need for client-side filtering anymore - API handles it
  const filteredDishes = dishes;

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

  // Reset filters
  const resetFilters = () => {
    setSearchTerm("");
    setCategoryFilter("all");
    setStatusFilter("all");
    setCurrentPage(1);
  };

  const derivedCategories = useMemo(() => {
    return Array.from(
      new Set(
        dishes
          .filter((d) => d.category)
          .map((d) =>
            JSON.stringify({
              _id: d.category._id || d.category,
              name: d.category.name || "N/A",
            })
          )
      )
    ).map((str) => JSON.parse(str));
  }, [dishes]);

  const categoryOptions =
    categories.length > 0 ? categories : derivedCategories;

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="bg-gray-50 min-h-screen">
      <section className="w-full px-4 pt-8">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex items-center justify-between">
          <div className="text-lg font-medium">Quản lý món ăn</div>
          <button
            onClick={() => navigate("/admin/dishes/create")}
            className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-900 transition cursor-pointer"
          >
            + Thêm món mới
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tìm kiếm
              </label>
              <input
                type="text"
                placeholder="Nhập tên món..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400 transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Danh mục
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400 transition cursor-pointer"
              >
                <option value="all">Tất cả danh mục</option>
                {categoryOptions.map((cat) => (
                  <option key={cat._id} value={cat._id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Trạng thái
              </label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400 transition cursor-pointer"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="active">Hoạt động</option>
                <option value="inactive">Ngừng bán</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={resetFilters}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition cursor-pointer"
              >
                Đặt lại bộ lọc
              </button>
            </div>
          </div>

          {/* Filter summary */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2">
              {(loading || searchTerm !== debouncedSearchTerm) && (
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
              )}
              <p className="text-sm text-gray-600">
                Hiển thị{" "}
                <span className="font-semibold text-gray-900">
                  {pageInfo.totalItems}
                </span>{" "}
                món
                {searchTerm !== debouncedSearchTerm && (
                  <span className="text-gray-500 ml-2">(đang gõ...)</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-16 w-full px-4">
        {/* Dishes Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-gray-800 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Đang tải...</p>
              </div>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-base font-bold text-gray-700">
                    #
                  </th>
                  <th className="px-6 py-3 text-left text-base font-bold text-gray-700">
                    Ảnh
                  </th>
                  <th className="px-6 py-3 text-left text-base font-bold text-gray-700">
                    Tên món
                  </th>
                  <th className="px-6 py-3 text-left text-base font-bold text-gray-700">
                    Danh mục
                  </th>
                  <th className="px-6 py-3 text-left text-base font-bold text-gray-700">
                    Giá
                  </th>
                  <th className="px-6 py-3 text-left text-base font-bold text-gray-700">
                    Kcal
                  </th>
                  <th className="px-6 py-3 text-left text-base font-bold text-gray-700">
                    Đã bán
                  </th>
                  <th className="px-6 py-3 text-left text-base font-bold text-gray-700">
                    Trạng thái
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredDishes.length === 0 ? (
                  <tr>
                    <td
                      colSpan="8"
                      className="px-6 py-12 text-center text-gray-500"
                    >
                      {dishes.length === 0
                        ? "Chưa có món ăn nào"
                        : "Không tìm thấy món ăn phù hợp"}
                    </td>
                  </tr>
                ) : (
                  filteredDishes.map((dish, index) => (
                    <tr
                      key={dish._id}
                      className="hover:bg-gray-50 cursor-pointer transition"
                      onClick={() => navigate(`/admin/dishes/${dish._id}`)}
                    >
                      <td className="px-6 py-4 text-gray-900">{index + 1}</td>
                      <td className="px-6 py-4">
                        {dish.imageUrls && dish.imageUrls.length > 0 ? (
                          <img
                            src={
                              dish.imageUrls[dish.defaultImageIndex || 0] ||
                              dish.imageUrls[0]
                            }
                            alt={dish.name}
                            className="w-12 h-12 rounded object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                            🍽️
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {dish.name}
                      </td>
                      <td className="px-6 py-4 text-gray-900">
                        {dish.category?.name || "-"}
                      </td>
                      <td className="px-6 py-4 text-gray-900">
                        {dish.price?.toLocaleString("vi-VN")}₫
                      </td>
                      <td className="px-6 py-4 text-gray-900">
                        {dish.totalEnergyKcal != null
                          ? `${Math.round(dish.totalEnergyKcal)} `
                          : "-"}
                      </td>
                      <td className="px-6 py-4 text-gray-900">
                        {dish.soldCount || 0}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(dish.status)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
        {pageInfo.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 bg-white rounded-xl shadow-sm px-4 py-3">
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
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1 || loading}
                className="cursor-pointer"
              >
                ← Trước
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
                onClick={() =>
                  setCurrentPage((prev) =>
                    Math.min(pageInfo.totalPages, prev + 1)
                  )
                }
                disabled={currentPage === pageInfo.totalPages || loading}
                className="cursor-pointer"
              >
                Sau →
              </Button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
};

export default AdminDishes;
