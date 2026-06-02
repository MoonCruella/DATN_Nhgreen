import React, { useState, useEffect } from "react";
import { ChevronRight, Search, Store } from "lucide-react";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import ratingApi from "@/api/ratingApi";
import RatingsTable from "@/components/admin-view/tables/RatingsTable";
import RatingModal from "@/components/admin-view/modals/RatingModal";
import FilterSelect from "@/components/common/FilterSelect";
import AdminPagination from "@/components/admin-view/AdminPagination";
import { Button } from "@/components/ui/button";

const AdminRating = () => {
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [selectedRating, setSelectedRating] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    total_pages: 0,
  });

  // Filters
  const [filters, setFilters] = useState({
    searchUser: "",
    searchDish: "",
    rating: "all",
  });
  const [appliedRating, setAppliedRating] = useState("all");

  const { accessToken } = useSelector((state) => state.auth);

  // Fetch ratings
  const fetchRatings = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...(filters.searchUser && { searchUser: filters.searchUser }),
        ...(filters.searchDish && { searchDish: filters.searchDish }),
      };

      const response = await ratingApi.getAll(accessToken, params);
      
      let filteredRatings = response.data.ratings;
      console.log("Fetched ratings:", filteredRatings);
      
      // Apply rating filter on frontend
      if (appliedRating !== "all") {
        const ratingValue = parseInt(appliedRating);
        filteredRatings = filteredRatings.filter(r => r.rating === ratingValue);
      }

      setRatings(filteredRatings);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error("Error fetching ratings:", error);
      toast.error("Không thể tải danh sách đánh giá");
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    fetchRatings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, filters.searchUser, filters.searchDish, appliedRating]);

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };
  const resetFilters = () => {
    setFilters({
      searchUser: "",
      searchDish: "",
      rating: "all",
    });
    setAppliedRating("all");
    setPagination((prev) => ({ ...prev, page: 1 }));
  };
  const applyFilters = () => {
    setAppliedRating(filters.rating);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };
  const hasActiveFilters =
    Boolean(filters.searchUser.trim()) ||
    Boolean(filters.searchDish.trim()) ||
    filters.rating !== "all" ||
    appliedRating !== "all";

  // Handle view details
  const handleViewDetails = (rating) => {
    setSelectedRating(rating);
    setShowModal(true);
  };

  return (
    <section className="min-h-[calc(100vh-92px)] bg-[#f7f7f8] px-3 py-3">
      <header className="mb-5 flex items-center gap-2 text-lg font-bold">
        <div className="flex items-center gap-2 text-gray-900">
          <Store className="h-5 w-5" strokeWidth={1.8} />
          Quản trị hệ thống
        </div>
        <ChevronRight className="h-5 w-5 text-gray-500" />
        <div className="text-[#34ad54]">Quản lý đánh giá</div>
      </header>

      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center xl:flex-1">
          <div className="relative w-full lg:w-[260px]">
            <input
              type="text"
              placeholder="Người dùng"
              value={filters.searchUser}
              onChange={(e) => handleFilterChange("searchUser", e.target.value)}
              className="h-12 w-full rounded-lg border border-gray-200 bg-white px-4 pr-11 text-base font-medium text-gray-800 outline-none placeholder:text-slate-300 focus:border-[#34ad54]"
            />
            <Search className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          </div>

          <div className="relative w-full lg:w-[260px]">
            <input
              type="text"
              placeholder="Món ăn"
              value={filters.searchDish}
              onChange={(e) => handleFilterChange("searchDish", e.target.value)}
              className="h-12 w-full rounded-lg border border-gray-200 bg-white px-4 pr-11 text-base font-medium text-gray-800 outline-none placeholder:text-slate-300 focus:border-[#34ad54]"
            />
            <Search className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          </div>

          <div className="text-base font-bold text-gray-500">Lọc bởi:</div>

          <FilterSelect
            label="Đánh giá"
            value={filters.rating}
            onChange={(value) => handleFilterChange("rating", value)}
            options={[
              { value: "all", label: "Tất cả đánh giá" },
              { value: "5", label: "5 sao" },
              { value: "4", label: "4 sao" },
              { value: "3", label: "3 sao" },
              { value: "2", label: "2 sao" },
              { value: "1", label: "1 sao" },
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
      </div>

      <section className="pb-16 w-full">
        <RatingsTable
          ratings={ratings}
          isLoading={initialLoading}
          onRowClick={handleViewDetails}
        />

        <AdminPagination
          currentPage={pagination.page}
          totalPages={pagination.total_pages}
          totalItems={pagination.total}
          pageSize={pagination.limit}
          itemLabel="đánh giá"
          onPageChange={(page) =>
            setPagination((prev) => ({ ...prev, page }))
          }
          disabled={loading}
        />
      </section>

      {/* Rating Detail Modal */}
      {showModal && selectedRating && (
        <RatingModal
          rating={selectedRating}
          onClose={() => {
            setShowModal(false);
            setSelectedRating(null);
          }}
        />
      )}
    </section>
  );
};

export default AdminRating;


