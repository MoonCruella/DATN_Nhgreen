import React, { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  PackageOpen,
  Search,
  Star,
  Store,
} from "lucide-react";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import ratingApi from "@/api/ratingApi";
import RatingModal from "@/components/admin-view/modals/RatingModal";
import FilterSelect from "@/components/common/FilterSelect";

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("vi-VN");
};

const StarRating = ({ rating }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((star) => (
      <Star
        key={star}
        className={`h-4 w-4 ${
          star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
        }`}
      />
    ))}
  </div>
);

const ratingOptions = [
  { value: "all", label: "Tất cả sao" },
  { value: "5", label: "5 sao" },
  { value: "4", label: "4 sao" },
  { value: "3", label: "3 sao" },
  { value: "2", label: "2 sao" },
  { value: "1", label: "1 sao" },
];

const ManagerRating = () => {
  const { accessToken } = useSelector((state) => state.auth);
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [selectedRating, setSelectedRating] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [filterRating, setFilterRating] = useState("all");
  const [appliedRating, setAppliedRating] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    total_pages: 0,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setAppliedSearch(searchTerm.trim());
      setCurrentPage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    const fetchRatings = async () => {
      if (!accessToken) return;

      setLoading(true);
      try {
        const params = {
          page: currentPage,
          limit: pageSize,
          ...(appliedSearch && { search: appliedSearch }),
        };

        const response = await ratingApi.getAllForManager(accessToken, params);
        let nextRatings = response.data.ratings || [];

        if (appliedRating !== "all") {
          const ratingValue = Number(appliedRating);
          nextRatings = nextRatings.filter((item) => item.rating === ratingValue);
        }

        setRatings(nextRatings);
        setPagination(response.data.pagination || {});
      } catch (error) {
        console.error("Error fetching ratings:", error);
        toast.error("Không thể tải danh sách đánh giá");
      } finally {
        setLoading(false);
        setInitialLoading(false);
      }
    };

    fetchRatings();
  }, [accessToken, appliedSearch, appliedRating, currentPage, pageSize]);

  const totalPages = useMemo(
    () => Math.max(1, pagination.total_pages || 1),
    [pagination.total_pages]
  );
  const totalItems = pagination.total || 0;
  const startIndex = totalItems ? (currentPage - 1) * pageSize + 1 : 0;
  const endIndex = Math.min(currentPage * pageSize, totalItems);
  const hasActiveFilters =
    Boolean(appliedSearch.trim()) || appliedRating !== "all";

  const changePage = (page) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    setCurrentPage(page);
  };

  const applyFilters = () => {
    setAppliedRating(filterRating);
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setSearchTerm("");
    setAppliedSearch("");
    setFilterRating("all");
    setAppliedRating("all");
    setCurrentPage(1);
  };

  return (
    <section className="min-h-[calc(100vh-92px)] bg-[#f7f7f8] px-3 py-3">
      <header className="mb-5 flex items-center gap-2 text-lg font-bold">
        <div className="flex items-center gap-2 text-gray-900">
          <Store className="h-5 w-5" strokeWidth={1.8} />
          Quản lý bán hàng
        </div>
        <ChevronRight className="h-5 w-5 text-gray-500" />
        <div className="text-[#34ad54]">Quản lý đánh giá</div>
      </header>

      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative w-full lg:w-[300px]">
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Người đánh giá, món ăn"
              className="h-12 w-full rounded-lg border border-gray-200 bg-white px-4 pr-11 text-base font-medium text-gray-800 outline-none placeholder:text-slate-300 focus:border-[#34ad54]"
            />
            <Search className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          </div>

          <div className="text-base font-bold text-gray-500">Lọc bởi:</div>

          <FilterSelect
            label="Đánh giá"
            value={filterRating}
            onChange={setFilterRating}
            options={ratingOptions}
            className="lg:w-[220px]"
          />

          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-base font-bold text-[#34ad54] underline underline-offset-4 transition hover:text-[#2f9b45]"
            >
              Chọn mặc định
            </button>
          )}
        </div>

        <Button
          type="button"
          onClick={applyFilters}
          className="h-12 min-w-[110px] rounded-lg bg-[#34ad54] text-base font-bold text-white hover:bg-[#2f9b45]"
        >
          Áp dụng
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-gray-100">
        <div className="grid min-w-[1120px] grid-cols-[70px_1.3fr_1.15fr_0.8fr_1.55fr_1fr_0.75fr] items-center border-b border-gray-200 px-5 py-3 text-base font-bold text-slate-600">
          <div>STT</div>
          <div>Sản phẩm</div>
          <div>Người đánh giá</div>
          <div>Đánh giá</div>
          <div>Nội dung</div>
          <div>Ngày tạo</div>
          <div>Hành động</div>
        </div>

        <div className="overflow-x-auto">
          {initialLoading || loading ? (
            <div className="flex min-h-[360px] min-w-[1120px] items-center justify-center text-base font-medium text-slate-500">
              Đang tải danh sách đánh giá...
            </div>
          ) : ratings.length === 0 ? (
            <div className="flex min-h-[360px] min-w-[1120px] flex-col items-center justify-center gap-3 text-slate-500">
              <PackageOpen className="h-12 w-12 text-slate-300" />
              <p className="text-base font-medium">Không có đánh giá phù hợp</p>
            </div>
          ) : (
            <div className="min-w-[1120px]">
              {ratings.map((rating, index) => {
                const imageUrl =
                  rating.dish_id?.imageUrls?.[
                    rating.dish_id?.defaultImageIndex || 0
                  ] || "/placeholder.png";

                return (
                  <div
                    key={rating._id}
                    className="grid min-h-16 grid-cols-[70px_1.3fr_1.15fr_0.8fr_1.55fr_1fr_0.75fr] items-center border-b border-gray-100 px-5 text-base font-medium text-[#444] last:border-b-0"
                  >
                    <div>{startIndex + index}</div>
                    <div className="flex min-w-0 items-center gap-3">
                      <img
                        src={imageUrl}
                        alt={rating.dishName || "Món ăn"}
                        className="h-12 w-12 shrink-0 rounded-md object-cover"
                      />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-800">
                          {rating.dishName || ""}
                        </p>
                        <p className="truncate text-sm text-slate-400">
                          {rating.dish_id?._id ? `#${rating.dish_id._id.slice(-6)}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-800">
                        {rating.userName || ""}
                      </p>
                      <p className="truncate text-sm text-slate-400">
                        {rating.userEmail || "-"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StarRating rating={rating.rating} />
                      <span className="font-semibold text-slate-700">
                        {rating.rating}/5
                      </span>
                    </div>
                    <div className="truncate pr-4 text-slate-600">
                      {rating.content || "-"}
                    </div>
                    <div>{formatDate(rating.created_at)}</div>
                    <div>
                      <button
                        type="button"
                        onClick={() => setSelectedRating(rating)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 transition hover:bg-[#34ad54]/10 hover:text-[#34ad54]"
                        aria-label="Xem chi tiết đánh giá"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {totalItems > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm font-bold text-gray-500">
            Hiển thị {startIndex}-{endIndex} trên {totalItems} đánh giá
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

      {selectedRating && (
        <RatingModal
          rating={selectedRating}
          onClose={() => setSelectedRating(null)}
        />
      )}
    </section>
  );
};

export default ManagerRating;
