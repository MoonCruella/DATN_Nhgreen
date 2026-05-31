import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { dashboardApi } from "@/api/dashboardApi";
import { toast } from "react-toastify";
import {
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  TrendingUp,
  Package,
} from "lucide-react";

const TopSellingDishes = ({ branchId, branchName }) => {
  const accessToken = useSelector((state) => state.auth.accessToken);
  const navigate = useNavigate();
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);
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
  });

  const fetchTopDishes = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.current_page,
        limit: pagination.per_page,
        ...filters,
      };
      if (branchId) {
        params.branchId = branchId;
      }
      const res = await dashboardApi.getAdminTopSellingDishes(accessToken, params);

      if (res.success) {
        setDishes(res.data.dishes);
        setPagination(res.data.pagination);
      }
    } catch (error) {
      console.error("Error fetching top dishes:", error);
      toast.error("Lỗi tải danh sách sản phẩm");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopDishes();
  }, [pagination.current_page, filters, branchId]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("vi-VN").format(amount) + " ₫";
  };

  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, current_page: newPage }));
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, current_page: 1 }));
  };

  const toggleSort = () => {
    setFilters((prev) => ({
      ...prev,
      order: prev.order === "desc" ? "asc" : "desc",
    }));
  };

  const handleDishClick = (dishId) => {
    navigate(`/admin/dishes/${dishId}`);
  };

  if (loading && dishes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sản phẩm bán chạy</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>
            Sản phẩm bán chạy {branchName ? `(${branchName})` : "(Tất cả chi nhánh)"}
          </span>
          <span className="text-sm font-normal text-gray-500">
            {pagination.total_items} sản phẩm
          </span>
        </CardTitle>

        {/* Filters */}
        <div className="flex items-center gap-4 mt-4">
          {/* Period Filter */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={filters.period === "today" ? "default" : "outline"}
              onClick={() => handleFilterChange("period", "today")}
              className={
                filters.period === "today"
                  ? "bg-blue-600 hover:bg-blue-700"
                  : ""
              }
            >
              Hôm nay
            </Button>
            <Button
              size="sm"
              variant={filters.period === "week" ? "default" : "outline"}
              onClick={() => handleFilterChange("period", "week")}
              className={
                filters.period === "week" ? "bg-blue-600 hover:bg-blue-700" : ""
              }
            >
              Tuần
            </Button>
            <Button
              size="sm"
              variant={filters.period === "month" ? "default" : "outline"}
              onClick={() => handleFilterChange("period", "month")}
              className={
                filters.period === "month"
                  ? "bg-blue-600 hover:bg-blue-700"
                  : ""
              }
            >
              Tháng
            </Button>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-2 border-l pl-4">
            <Button
              size="sm"
              variant={filters.sortBy === "quantity" ? "default" : "outline"}
              onClick={() => handleFilterChange("sortBy", "quantity")}
              className="flex items-center gap-1"
            >
              <Package className="w-4 h-4" />
              Số lượng
            </Button>
            <Button
              size="sm"
              variant={filters.sortBy === "revenue" ? "default" : "outline"}
              onClick={() => handleFilterChange("sortBy", "revenue")}
              className="flex items-center gap-1"
            >
              <TrendingUp className="w-4 h-4" />
              Doanh thu
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={toggleSort}
              className="flex items-center gap-1"
            >
              <ArrowUpDown className="w-4 h-4" />
              {filters.order === "desc" ? "Cao → Thấp" : "Thấp → Cao"}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : dishes.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            Không có dữ liệu sản phẩm
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      STT
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sản phẩm
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Danh mục
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Giá
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trạng thái
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Số lượng bán
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Doanh thu
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {dishes.map((dish, index) => (
                    <tr
                      key={dish.dish_id}
                      onClick={() => handleDishClick(dish.dish_id)}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(pagination.current_page - 1) * pagination.per_page +
                          index +
                          1}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0">
                            <img
                              className="h-10 w-10 rounded-lg object-cover"
                              src={
                                dish.dish_image ||
                                "https://via.placeholder.com/40"
                              }
                              alt={dish.dish_name}
                            />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {dish.dish_name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {dish.category_name}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(dish.dish_price)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            dish.dish_status === "active"
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {dish.dish_status === "active"
                            ? "Hoạt động"
                            : "Ngừng bán"}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-center font-medium text-gray-900">
                        {dish.total_quantity}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-semibold text-blue-600">
                        {formatCurrency(dish.total_revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-700">
                Hiển thị{" "}
                <span className="font-medium">
                  {(pagination.current_page - 1) * pagination.per_page + 1}
                </span>{" "}
                đến{" "}
                <span className="font-medium">
                  {Math.min(
                    pagination.current_page * pagination.per_page,
                    pagination.total_items
                  )}
                </span>{" "}
                trong tổng số{" "}
                <span className="font-medium">{pagination.total_items}</span>{" "}
                sản phẩm
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handlePageChange(pagination.current_page - 1)}
                  disabled={!pagination.has_prev}
                  className="flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Trước
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: pagination.total_pages }, (_, i) => {
                    const page = i + 1;
                    if (
                      page === 1 ||
                      page === pagination.total_pages ||
                      Math.abs(page - pagination.current_page) <= 1
                    ) {
                      return (
                        <Button
                          key={page}
                          size="sm"
                          variant={
                            page === pagination.current_page
                              ? "default"
                              : "outline"
                          }
                          onClick={() => handlePageChange(page)}
                          className="w-8"
                        >
                          {page}
                        </Button>
                      );
                    } else if (
                      page === pagination.current_page - 2 ||
                      page === pagination.current_page + 2
                    ) {
                      return (
                        <span key={page} className="px-2 text-gray-400">
                          ...
                        </span>
                      );
                    }
                    return null;
                  })}
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handlePageChange(pagination.current_page + 1)}
                  disabled={!pagination.has_next}
                  className="flex items-center gap-1"
                >
                  Sau
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default TopSellingDishes;
