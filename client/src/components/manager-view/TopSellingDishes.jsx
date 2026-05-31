import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { dashboardApi } from "@/api/dashboardApi";
import { toast } from "react-toastify";

const TopSellingDishes = () => {
  const accessToken = useSelector((state) => state.auth.accessToken);
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current_page: 1,
    total_pages: 1,
    total_items: 0,
    per_page: 10,
  });
  const [filters, setFilters] = useState({
    period: "today",
    sortBy: "quantity",
    order: "desc",
    page: 1,
    limit: 10,
  });

  // Fetch dishes data
  const fetchDishes = async () => {
    try {
      setLoading(true);
      const res = await dashboardApi.getTopSellingDishes(accessToken, filters);

      if (res.success) {
        setDishes(res.data.dishes);
        setPagination(res.data.pagination);
      }
    } catch (error) {
      console.error("Error fetching top dishes:", error);
      toast.error("Lỗi tải dữ liệu sản phẩm");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDishes();
  }, [filters]);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("vi-VN").format(amount) + " ₫";
  };

  // Handle filter change
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: key !== "page" ? 1 : value, // Reset to page 1 when changing filters
    }));
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.total_pages) {
      handleFilterChange("page", newPage);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Sản phẩm bán chạy</CardTitle>
            <div className="text-sm text-gray-500 mt-1">
              Danh sách sản phẩm theo số lượng và doanh thu
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3">
            {/* Period Filter */}
            <Select
              value={filters.period}
              onValueChange={(value) => handleFilterChange("period", value)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hôm nay</SelectItem>
                <SelectItem value="week">Tuần này</SelectItem>
                <SelectItem value="month">Tháng này</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort By */}
            <Select
              value={filters.sortBy}
              onValueChange={(value) => handleFilterChange("sortBy", value)}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="quantity">Theo số lượng</SelectItem>
                <SelectItem value="revenue">Theo doanh thu</SelectItem>
              </SelectContent>
            </Select>

            {/* Order */}
            <Select
              value={filters.order}
              onValueChange={(value) => handleFilterChange("order", value)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Cao đến thấp</SelectItem>
                <SelectItem value="asc">Thấp đến cao</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50 rounded-t-lg border-b font-medium text-sm text-gray-600">
              <div className="col-span-1">#</div>
              <div className="col-span-4">Tên món</div>
              <div className="col-span-2 text-center">Phân loại</div>
              <div className="col-span-2 text-center">Giá</div>
              <div className="col-span-2 text-center">Số lượng</div>
              <div className="col-span-1 text-right">Doanh thu</div>
            </div>

            {/* Table Body */}
            <div className="space-y-2 mt-2">
              {dishes.length > 0 ? (
                dishes.map((dish, index) => (
                  <div
                    key={dish.dish_id}
                    className="grid grid-cols-12 gap-4 px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors border-b last:border-0"
                  >
                    {/* Index */}
                    <div className="col-span-1 flex items-center">
                      <span className="text-gray-600 font-medium">
                        {(pagination.current_page - 1) * pagination.per_page +
                          index +
                          1}
                      </span>
                    </div>

                    {/* Product Info */}
                    <div className="col-span-4 flex items-center gap-3">
                      <img
                        src={dish.dish_image || "/placeholder.png"}
                        alt={dish.dish_name}
                        className="w-12 h-12 object-cover rounded"
                      />
                      <span className="font-medium text-gray-800 truncate">
                        {dish.dish_name}
                      </span>
                    </div>

                    {/* Category */}
                    <div className="col-span-2 flex items-center justify-center">
                      <span className="text-sm text-gray-600 px-2 py-1 bg-blue-50 rounded">
                        {dish.category_name}
                      </span>
                    </div>

                    {/* Price */}
                    <div className="col-span-2 flex items-center justify-center">
                      <span className="text-gray-700 font-medium">
                        {formatCurrency(dish.dish_price)}
                      </span>
                    </div>

                    {/* Quantity */}
                    <div className="col-span-2 flex items-center justify-center">
                      <span className="text-gray-700 font-semibold">
                        {dish.total_quantity}
                      </span>
                    </div>

                    {/* Revenue */}
                    <div className="col-span-1 flex items-center justify-end">
                      <span className="text-gray-800 font-semibold">
                        {formatCurrency(dish.total_revenue)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Chưa có dữ liệu sản phẩm
                </div>
              )}
            </div>

            {/* Pagination */}
            {pagination.total_pages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t">
                <div className="text-sm text-gray-600">
                  Hiển thị{" "}
                  {(pagination.current_page - 1) * pagination.per_page + 1} -{" "}
                  {Math.min(
                    pagination.current_page * pagination.per_page,
                    pagination.total_items
                  )}{" "}
                  / {pagination.total_items} sản phẩm
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      handlePageChange(pagination.current_page - 1)
                    }
                    disabled={!pagination.has_prev}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Trước
                  </Button>

                  <div className="flex items-center gap-1">
                    {Array.from(
                      { length: Math.min(5, pagination.total_pages) },
                      (_, i) => {
                        let pageNum;
                        if (pagination.total_pages <= 5) {
                          pageNum = i + 1;
                        } else if (pagination.current_page <= 3) {
                          pageNum = i + 1;
                        } else if (
                          pagination.current_page >=
                          pagination.total_pages - 2
                        ) {
                          pageNum = pagination.total_pages - 4 + i;
                        } else {
                          pageNum = pagination.current_page - 2 + i;
                        }

                        return (
                          <Button
                            key={pageNum}
                            size="sm"
                            variant={
                              pagination.current_page === pageNum
                                ? "default"
                                : "outline"
                            }
                            onClick={() => handlePageChange(pageNum)}
                            className={
                              pagination.current_page === pageNum
                                ? "bg-green-600 hover:bg-green-700"
                                : ""
                            }
                          >
                            {pageNum}
                          </Button>
                        );
                      }
                    )}
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      handlePageChange(pagination.current_page + 1)
                    }
                    disabled={!pagination.has_next}
                  >
                    Sau
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default TopSellingDishes;
