import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import dishApi from "@/api/dishApi";
import categoryApi from "@/api/categoryApi";
import { ChevronRight, PackageOpen, Search, Store } from "lucide-react";
import FilterSelect from "@/components/common/FilterSelect";
import AdminPagination from "@/components/admin-view/AdminPagination";

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
  const [appliedCategoryFilter, setAppliedCategoryFilter] = useState("all");
  const [appliedStatusFilter, setAppliedStatusFilter] = useState("all");

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
        category:
          appliedCategoryFilter !== "all" ? appliedCategoryFilter : undefined,
        status: appliedStatusFilter !== "all" ? appliedStatusFilter : undefined,
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
    appliedCategoryFilter,
    appliedStatusFilter,
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

  // Reset filters
  const resetFilters = () => {
    setSearchTerm("");
    setCategoryFilter("all");
    setStatusFilter("all");
    setAppliedCategoryFilter("all");
    setAppliedStatusFilter("all");
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
  const hasActiveFilters =
    Boolean(searchTerm.trim()) ||
    categoryFilter !== "all" ||
    statusFilter !== "all" ||
    appliedCategoryFilter !== "all" ||
    appliedStatusFilter !== "all";
  const applyFilters = () => {
    setAppliedCategoryFilter(categoryFilter);
    setAppliedStatusFilter(statusFilter);
    setCurrentPage(1);
  };
  const changePage = (nextPage) => {
    if (
      nextPage < 1 ||
      nextPage > pageInfo.totalPages ||
      nextPage === currentPage
    ) {
      return;
    }
    setCurrentPage(nextPage);
  };

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
    <section className="min-h-[calc(100vh-92px)] bg-[#f7f7f8] px-3 py-3">
      <header className="mb-5 flex items-center gap-2 text-lg font-bold">
        <div className="flex items-center gap-2 text-gray-900">
          <Store className="h-5 w-5" strokeWidth={1.8} />
          Quản trị hệ thống
        </div>
        <ChevronRight className="h-5 w-5 text-gray-500" />
        <div className="text-[#34ad54]">Món ăn</div>
      </header>

      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center xl:flex-1">
          <div className="relative w-full lg:w-[300px]">
            <input
              type="text"
              placeholder="Tên món ăn"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-12 w-full rounded-lg border border-gray-200 bg-white px-4 pr-11 text-base font-medium text-gray-800 outline-none placeholder:text-slate-300 focus:border-[#34ad54]"
            />
            <Search className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          </div>

          <div className="text-base font-bold text-gray-500">Lọc bởi:</div>

          <FilterSelect
            label="Danh mục"
            value={categoryFilter}
            onChange={(value) => {
              setCategoryFilter(value);
            }}
            options={[
              { value: "all", label: "Tất cả danh mục" },
              ...categoryOptions.map((cat) => ({
                value: cat._id,
                label: cat.name,
              })),
            ]}
            className="lg:w-[220px]"
          />

          <FilterSelect
            label="Trạng thái"
            value={statusFilter}
            onChange={(value) => {
              setStatusFilter(value);
            }}
            options={[
              { value: "all", label: "Tất cả trạng thái" },
              { value: "active", label: "Hoạt động" },
              { value: "inactive", label: "Ngừng bán" },
            ]}
            className="lg:w-[220px]"
          />

          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="whitespace-nowrap text-base font-bold text-[#34ad54] underline underline-offset-4 hover:text-[#2f9b45]"
            >
              Chọn mặc định
            </button>
          )}

          <Button
            type="button"
            onClick={applyFilters}
            className="h-12 min-w-[110px] rounded-lg bg-[#34ad54] text-base font-bold text-white hover:bg-[#2f9b45] lg:ml-auto"
          >
            Áp dụng
          </Button>
        </div>

        <Button
          type="button"
          onClick={() => navigate("/admin/dishes/create")}
          className="h-12 rounded-lg bg-[#34ad54] px-5 text-base font-bold text-white hover:bg-[#2f9b45]"
        >
          + Thêm món mới
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-gray-100">
        {loading ? (
          <div className="px-5 py-9 text-center text-base font-bold text-gray-500">
            Đang tải món ăn...
          </div>
        ) : (
          <table className="w-full">
            <thead className="border-b border-gray-200 bg-white">
              <tr>
                <th className="px-5 py-3 text-left text-base font-bold text-slate-600">
                  #
                </th>
                <th className="px-5 py-3 text-left text-base font-bold text-slate-600">
                  Ảnh
                </th>
                <th className="px-5 py-3 text-left text-base font-bold text-slate-600">
                  Tên món
                </th>
                <th className="px-5 py-3 text-left text-base font-bold text-slate-600">
                  Danh mục
                </th>
                <th className="px-5 py-3 text-left text-base font-bold text-slate-600">
                  Giá
                </th>
                <th className="px-5 py-3 text-left text-base font-bold text-slate-600">
                  Kcal
                </th>
                <th className="px-5 py-3 text-left text-base font-bold text-slate-600">
                  Đã bán
                </th>
                <th className="px-5 py-3 text-left text-base font-bold text-slate-600">
                  Trạng thái
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredDishes.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-5 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-600">
                      <PackageOpen
                        className="h-16 w-16 text-green-100"
                        strokeWidth={1.2}
                      />
                      <div className="mt-3 text-base font-bold">
                        {dishes.length === 0
                          ? "Chưa có món ăn nào"
                          : "Không tìm thấy món ăn phù hợp"}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredDishes.map((dish, index) => (
                  <tr
                    key={dish._id}
                    className="cursor-pointer border-b border-gray-100 text-base font-medium text-[#444] transition hover:bg-gray-50 last:border-b-0"
                    onClick={() => navigate(`/admin/dishes/${dish._id}`)}
                  >
                    <td className="px-5 py-3 text-gray-900">
                      {(pageInfo.currentPage - 1) * pageInfo.pageSize +
                        index +
                        1}
                    </td>
                    <td className="px-5 py-3">
                      {dish.imageUrls && dish.imageUrls.length > 0 ? (
                        <img
                          src={
                            dish.imageUrls[dish.defaultImageIndex || 0] ||
                            dish.imageUrls[0]
                          }
                          alt={dish.name}
                          className="h-12 w-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 text-sm">
                          -
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3 font-bold text-gray-800">
                      {dish.name}
                    </td>
                    <td className="px-5 py-3 text-gray-700">
                      {dish.category?.name || "-"}
                    </td>
                    <td className="px-5 py-3 text-gray-700">
                      {dish.price?.toLocaleString("vi-VN")}đ
                    </td>
                    <td className="px-5 py-3 text-gray-700">
                      {dish.totalEnergyKcal != null
                        ? Math.round(dish.totalEnergyKcal)
                        : "-"}
                    </td>
                    <td className="px-5 py-3 text-gray-700">
                      {dish.soldCount || 0}
                    </td>
                    <td className="px-5 py-3">{getStatusBadge(dish.status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      <AdminPagination
        currentPage={currentPage}
        totalPages={pageInfo.totalPages}
        totalItems={pageInfo.totalItems}
        pageSize={pageInfo.pageSize}
        itemLabel="món ăn"
        onPageChange={changePage}
        disabled={loading}
      />
    </section>
  );
};

export default AdminDishes;


