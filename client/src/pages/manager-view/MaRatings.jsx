import React, { useState, useEffect } from "react";
import { Search, RotateCcw } from "lucide-react";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import ratingApi from "@/api/ratingApi";
import RatingsTable from "@/components/admin-view/tables/RatingsTable";
import RatingModal from "@/components/admin-view/modals/RatingModal";

const ManagerRating = () => {
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

  // Debounced filters
  const [debouncedFilters, setDebouncedFilters] = useState({
    searchUser: "",
    searchDish: "",
  });

  const { accessToken } = useSelector((state) => state.auth);

  // Debounce search filters
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilters({
        searchUser: filters.searchUser,
        searchDish: filters.searchDish,
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [filters.searchUser, filters.searchDish]);

  // Fetch ratings
  const fetchRatings = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...(debouncedFilters.searchUser && {
          searchUser: debouncedFilters.searchUser,
        }),
        ...(debouncedFilters.searchDish && {
          searchDish: debouncedFilters.searchDish,
        }),
      };

      const response = await ratingApi.getAllForManager(accessToken, params);

      let filteredRatings = response.data.ratings;

      // Apply rating filter on frontend
      if (filters.rating !== "all") {
        const ratingValue = parseInt(filters.rating);
        filteredRatings = filteredRatings.filter(
          (r) => r.rating === ratingValue
        );
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
  }, [
    pagination.page,
    debouncedFilters.searchUser,
    debouncedFilters.searchDish,
    filters.rating,
  ]);

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Handle view details
  const handleViewDetails = (rating) => {
    setSelectedRating(rating);
    setShowModal(true);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Quản lý đánh giá</h1>
        <p className="text-gray-600 mt-1">
          Tổng số: {pagination.total} đánh giá
          {(filters.searchUser !== debouncedFilters.searchUser ||
            filters.searchDish !== debouncedFilters.searchDish) && (
            <span className="text-gray-500 ml-2">(đang gõ...)</span>
          )}
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search User */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tìm theo người dùng
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Nhập tên người dùng..."
                value={filters.searchUser}
                onChange={(e) =>
                  handleFilterChange("searchUser", e.target.value)
                }
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
          </div>

          {/* Search Dish */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tìm theo món ăn
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Nhập tên món ăn..."
                value={filters.searchDish}
                onChange={(e) =>
                  handleFilterChange("searchDish", e.target.value)
                }
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
          </div>

          {/* Rating Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Đánh giá
            </label>
            <select
              value={filters.rating}
              onChange={(e) => handleFilterChange("rating", e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
            >
              <option value="all">Tất cả</option>
              <option value="5">5 sao</option>
              <option value="4">4 sao</option>
              <option value="3">3 sao</option>
              <option value="2">2 sao</option>
              <option value="1">1 sao</option>
            </select>
          </div>
        </div>

        {/* Clear Filters Button */}
        {(filters.searchUser || filters.searchDish || filters.rating !== "all") && (
          <div className="mt-4 flex justify-end">
            <Button
              onClick={() => {
                setFilters({
                  searchUser: "",
                  searchDish: "",
                  rating: "all",
                });
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              variant="outline"
              className="cursor-pointer flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> Xóa bộ lọc
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow">
        <RatingsTable
          ratings={ratings}
          isLoading={initialLoading || loading}
          onRowClick={handleViewDetails}
        />

        {/* Pagination */}
        {pagination.total_pages > 1 && (
          <div className="flex justify-center items-center gap-2 py-4 border-t">
            <button
              onClick={() =>
                setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
              }
              disabled={pagination.page === 1}
              className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
            >
              Trước
            </button>
            <span className="text-sm text-gray-600">
              Trang {pagination.page} / {pagination.total_pages}
            </span>
            <button
              onClick={() =>
                setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
              }
              disabled={pagination.page === pagination.total_pages}
              className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
            >
              Sau
            </button>
          </div>
        )}
      </div>

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
    </div>
  );
};

export default ManagerRating;
