import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  PackageOpen,
  Search,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import branchApi from "@/api/branchApi";
import categoryApi from "@/api/categoryApi";
import FilterSelect from "@/components/common/FilterSelect";

const formatCurrency = (value = 0) =>
  new Intl.NumberFormat("vi-VN").format(value || 0);

const dishStatusOptions = [
  { value: "all", label: "Tất cả" },
  { value: "available", label: "Còn hàng" },
  { value: "unavailable", label: "Hết hàng" },
];

const MaManageDishes = () => {
  const accessToken = useSelector((state) => state.auth.accessToken);
  const user = useSelector((state) => state.auth.user);
  const branchId = user?.branch_id;

  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [branch, setBranch] = useState(null);
  const [dishes, setDishes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [appliedStatus, setAppliedStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [appliedCategory, setAppliedCategory] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pageInfo, setPageInfo] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    pageSize: 10,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setAppliedSearch(searchTerm.trim());
      setCurrentPage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    const fetchInitialData = async () => {
      if (!branchId) {
        toast.error("Bạn chưa được gán chi nhánh");
        setInitialLoading(false);
        return;
      }

      try {
        setInitialLoading(true);
        const [branchRes, categoriesRes] = await Promise.all([
          branchApi.getById(branchId),
          categoryApi.getAll(),
        ]);
        setBranch(branchRes.data);
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

  useEffect(() => {
    const fetchDishes = async () => {
      if (!branchId) return;

      try {
        setLoading(true);

        const params = {
          page: currentPage,
          limit: pageSize,
          q: appliedSearch || undefined,
          category: appliedCategory !== "all" ? appliedCategory : undefined,
          isAvailable:
            appliedStatus === "available"
              ? true
              : appliedStatus === "unavailable"
              ? false
              : undefined,
        };

        Object.keys(params).forEach(
          (key) => params[key] === undefined && delete params[key],
        );

        const dishesRes = await branchApi.getBranchDishes(branchId, params);
        const payload = dishesRes?.data || dishesRes;
        const fetchedDishes = Array.isArray(payload)
          ? payload
          : payload?.dishes || [];

        setDishes(fetchedDishes);
        setPageInfo({
          currentPage: payload?.pagination?.currentPage ?? currentPage,
          totalPages: payload?.pagination?.totalPages ?? 1,
          totalItems: payload?.pagination?.totalItems ?? fetchedDishes.length,
          pageSize: payload?.pagination?.pageSize ?? pageSize,
        });
      } catch (error) {
        console.error("Error fetching dishes:", error);
        toast.error("Lỗi tải danh sách món ăn");
      } finally {
        setLoading(false);
      }
    };

    fetchDishes();
  }, [branchId, appliedSearch, appliedCategory, appliedStatus, currentPage, pageSize]);

  const totalPages = Math.max(1, pageInfo.totalPages || 1);
  const startIndex =
    pageInfo.totalItems === 0
      ? 0
      : (pageInfo.currentPage - 1) * pageInfo.pageSize + 1;
  const endIndex = Math.min(
    pageInfo.currentPage * pageInfo.pageSize,
    pageInfo.totalItems,
  );
  const hasActiveFilters =
    Boolean(appliedSearch.trim()) ||
    appliedStatus !== "all" ||
    appliedCategory !== "all";

  const selectedCategoryName = useMemo(() => {
    if (appliedCategory === "all") return "Tất cả danh mục";
    return (
      categories.find((category) => category._id === appliedCategory)?.name ||
      "Danh mục"
    );
  }, [categories, appliedCategory]);

  const applyFilters = () => {
    setAppliedCategory(filterCategory);
    setAppliedStatus(filterStatus);
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setSearchTerm("");
    setAppliedSearch("");
    setFilterCategory("all");
    setAppliedCategory("all");
    setFilterStatus("all");
    setAppliedStatus("all");
    setCurrentPage(1);
  };

  const changePage = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  const handleToggleStatus = async (dishId, currentStatus, dishName) => {
    const newStatus = !currentStatus;
    const actionText = newStatus ? "bật" : "tắt";

    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn ${actionText} món "${dishName}" tại chi nhánh này?`,
    );

    if (!confirmed) return;

    try {
      await branchApi.updateDishStatus(
        accessToken,
        branchId,
        dishId,
        newStatus,
      );

      setDishes((prev) =>
        prev.map((dish) =>
          dish._id === dishId
            ? { ...dish, isAvailableAtBranch: newStatus }
            : dish,
        ),
      );

      toast.success(`Đã ${actionText} món "${dishName}" tại chi nhánh này`);
    } catch (error) {
      console.error("Error updating dish status:", error);
      toast.error("Lỗi cập nhật trạng thái món ăn");
    }
  };

  if (!branchId) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-600">Bạn chưa được gán chi nhánh nào</p>
      </div>
    );
  }

  return (
    <section className="min-h-[calc(100vh-92px)] bg-[#f7f7f8] px-3 py-3">
      <header className="mb-5 flex items-center gap-2 text-lg font-bold">
        <div className="flex items-center gap-2 text-gray-900">
          <Store className="h-5 w-5" strokeWidth={1.8} />
          Quản lý bán hàng
        </div>
        <ChevronRight className="h-5 w-5 text-gray-500" />
        <div className="text-[#34ad54]">Quản lý thực đơn</div>
      </header>

      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative w-full lg:w-[300px]">
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="h-12 w-full rounded-lg border border-gray-200 bg-white px-4 pr-11 text-base font-medium text-gray-800 outline-none placeholder:text-slate-300 focus:border-[#34ad54]"
              placeholder="Tên món ăn"
            />
            <Search className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          </div>

          <div className="text-base font-bold text-gray-500">Lọc bởi:</div>

          <FilterSelect
            label="Danh mục"
            value={filterCategory}
            onChange={setFilterCategory}
            options={[
              { value: "all", label: "Tất cả danh mục" },
              ...categories.map((category) => ({
                value: category._id,
                label: category.name,
              })),
            ]}
            className="lg:w-[220px]"
          />

          <FilterSelect
            label="Trạng thái"
            value={filterStatus}
            onChange={setFilterStatus}
            options={dishStatusOptions}
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
        </div>

        <div className="flex gap-3">
          <Button
            type="button"
            onClick={applyFilters}
            className="h-12 min-w-[110px] rounded-lg bg-[#34ad54] text-base font-bold text-white hover:bg-[#2f9b45]"
          >
            Áp dụng
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-gray-100">
        <div className="grid grid-cols-[70px_90px_1.45fr_1fr_0.9fr_1fr] items-center border-b border-gray-200 px-5 py-3 text-base font-bold text-slate-600">
          <div>STT</div>
          <div>Hình ảnh</div>
          <div>Tên món</div>
          <div>Danh mục</div>
          <div>Giá</div>
          <div>Trạng thái</div>
        </div>

        {initialLoading || loading ? (
          <div className="px-5 py-9 text-center text-base font-bold text-gray-500">
            Đang tải thực đơn...
          </div>
        ) : dishes.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-5 py-12 text-gray-600">
            <PackageOpen className="h-16 w-16 text-green-100" strokeWidth={1.2} />
            <div className="mt-3 text-base font-bold">
              Không có dữ liệu món ăn
            </div>
          </div>
        ) : (
          dishes.map((dish, index) => (
            <div
              key={dish._id}
              className="grid min-h-16 grid-cols-[70px_90px_1.45fr_1fr_0.9fr_1fr] items-center border-b border-gray-100 px-5 text-base font-medium text-[#444] last:border-b-0"
            >
              <div>
                {(pageInfo.currentPage - 1) * pageInfo.pageSize + index + 1}
              </div>
              <div>
                <img
                  src={
                    dish.imageUrls?.[dish.defaultImageIndex] ||
                    dish.imageUrls?.[0] ||
                    "/placeholder-dish.png"
                  }
                  alt={dish.name}
                  className="h-12 w-12 rounded-lg object-cover"
                />
              </div>
              <div className="truncate font-bold text-gray-800">{dish.name}</div>
              <div>{dish.category?.name || dish.category || selectedCategoryName}</div>
              <div>{formatCurrency(dish.price)} VND</div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={dish.isAvailableAtBranch}
                  onCheckedChange={() =>
                    handleToggleStatus(
                      dish._id,
                      dish.isAvailableAtBranch,
                      dish.name,
                    )
                  }
                  className="data-[state=checked]:bg-green-600"
                />
                <span
                  className={`text-sm font-bold ${
                    dish.isAvailableAtBranch
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {dish.isAvailableAtBranch ? "Còn hàng" : "Hết hàng"}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {pageInfo.totalItems > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm font-bold text-gray-500">
            Hiển thị {startIndex}-{endIndex} trên{" "}
            {formatCurrency(pageInfo.totalItems)} món ăn
          </p>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => changePage(1)}
                disabled={currentPage === 1}
                className="rounded-md border border-gray-200 px-3 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                «
              </button>
              <button
                type="button"
                onClick={() => changePage(currentPage - 1)}
                disabled={currentPage === 1}
                className="rounded-md border border-gray-200 px-3 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="min-w-[30px] px-2 text-center text-sm font-bold text-gray-700">
                {currentPage}
              </div>

              <button
                type="button"
                onClick={() => changePage(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="rounded-md border border-gray-200 px-3 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => changePage(totalPages)}
                disabled={currentPage >= totalPages}
                className="rounded-md border border-gray-200 px-3 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                »
              </button>
            </div>

            <div className="relative">
              <select
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setCurrentPage(1);
                }}
                className="appearance-none rounded-md border border-gray-200 bg-white px-4 py-2 pr-8 text-sm font-bold text-gray-700 hover:border-gray-300 focus:border-[#34ad54] focus:outline-none"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-700" />
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default MaManageDishes;
