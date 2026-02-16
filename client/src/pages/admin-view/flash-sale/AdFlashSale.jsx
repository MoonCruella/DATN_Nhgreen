import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import flashsaleApi from "@/api/flashsaleApi";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import TableSkeleton from "@/components/admin-view/TableSkeleton";

const AdminFlashSale = () => {
  const navigate = useNavigate();
  const accessToken = useSelector((state) => state.auth.accessToken);
  const [flashSales, setFlashSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [filtering, setFiltering] = useState(false);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch all flash sales
  const fetchFlashSales = async () => {
    try {
      setLoading(true);
      const params = {
        limit: 100,
        status: statusFilter !== "all" ? statusFilter : undefined,
        q: debouncedSearchTerm || undefined,
      };
      Object.keys(params).forEach(
        (key) => params[key] === undefined && delete params[key]
      );
      const res = await flashsaleApi.getAll(params);
      if (res.success) {
        setFlashSales(res.data.flashsales || res.data || []);
      }
    } catch (error) {
      console.error("Error fetching flash sales:", error);
      toast.error("Lỗi tải danh sách Flash Sale");
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    fetchFlashSales();
  }, [debouncedSearchTerm, statusFilter]);

  const getStatusBadge = (status) => {
    const badges = {
      upcoming: "bg-blue-100 text-blue-800",
      active: "bg-green-100 text-green-800",
      ended: "bg-gray-100 text-gray-800",
    };
    const labels = {
      upcoming: "Sắp diễn ra",
      active: "Đang diễn ra",
      ended: "Đã kết thúc",
    };
    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-medium ${badges[status]}`}
      >
        {labels[status]}
      </span>
    );
  };

  // Client-side date filtering (backend doesn't support date filters)
  const [filteredFlashSales, setFilteredFlashSales] = useState([]);

  useEffect(() => {
    const filtered = flashSales.filter((fs) => {
      // Filter by start date
      if (startDateFilter) {
        const fsStartDate = new Date(fs.startTime).setHours(0, 0, 0, 0);
        const filterStartDate = new Date(startDateFilter).setHours(0, 0, 0, 0);
        if (fsStartDate < filterStartDate) return false;
      }

      // Filter by end date
      if (endDateFilter) {
        const fsEndDate = new Date(fs.endTime).setHours(0, 0, 0, 0);
        const filterEndDate = new Date(endDateFilter).setHours(0, 0, 0, 0);
        if (fsEndDate > filterEndDate) return false;
      }

      return true;
    });

    setFilteredFlashSales(filtered);
  }, [flashSales, startDateFilter, endDateFilter]);

  // Reset filters
  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setStartDateFilter("");
    setEndDateFilter("");
  };

  return (
    <main className="bg-gray-50 min-h-screen">
      <section className="w-full px-4 pt-8">
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex items-center justify-between">
          <div className="text-lg font-medium">Quản lý Flash Sale</div>
          <button
            onClick={() => navigate("/admin/flash-sale/create")}
            className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-900 transition cursor-pointer"
          >
            + Tạo Flash Sale
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search by name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tìm kiếm theo tên
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nhập tên chương trình..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400 transition"
              />
            </div>

            {/* Status filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Trạng thái
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400 transition cursor-pointer"
              >
                <option value="all">Tất cả</option>
                <option value="upcoming">Sắp diễn ra</option>
                <option value="active">Đang diễn ra</option>
                <option value="ended">Đã kết thúc</option>
              </select>
            </div>

            {/* Start date filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Từ ngày bắt đầu
              </label>
              <input
                type="date"
                value={startDateFilter}
                onChange={(e) => setStartDateFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400 transition cursor-pointer"
              />
            </div>

            {/* End date filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Đến ngày kết thúc
              </label>
              <input
                type="date"
                value={endDateFilter}
                onChange={(e) => setEndDateFilter(e.target.value)}
                disabled={!startDateFilter}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400 transition cursor-pointer disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            {/* Reset button */}
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
                  {filteredFlashSales.length}
                </span>{" "}
                / {flashSales.length} Flash Sale
                {searchTerm !== debouncedSearchTerm && (
                  <span className="text-gray-500 ml-2">(đang gõ...)</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-16 w-full px-4">
        {/* Flash Sales Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {initialLoading ? (
            <TableSkeleton rows={8} columns={5} />
          ) : (
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-base font-bold text-gray-700">
                    Tên chương trình
                  </th>
                  <th className="px-6 py-3 text-left text-base font-bold text-gray-700">
                    Thời gian bắt đầu
                  </th>
                  <th className="px-6 py-3 text-left text-base font-bold text-gray-700">
                    Thời gian kết thúc
                  </th>
                  <th className="px-6 py-3 text-left text-base font-bold text-gray-700">
                    Sản phẩm
                  </th>
                  <th className="px-6 py-3 text-left text-base font-bold text-gray-700">
                    Trạng thái
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredFlashSales.length === 0 ? (
                  <tr>
                    <td
                      colSpan="5"
                      className="px-6 py-12 text-center text-gray-500"
                    >
                      {flashSales.length === 0
                        ? "Chưa có Flash Sale nào"
                        : "Không tìm thấy Flash Sale phù hợp"}
                    </td>
                  </tr>
                ) : (
                  filteredFlashSales.map((fs) => (
                    <tr
                      key={fs._id}
                      className="hover:bg-gray-50 cursor-pointer transition"
                      onClick={() => navigate(`/admin/flash-sale/${fs._id}`)}
                    >
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {fs.title}
                      </td>
                      <td className="px-6 py-4  text-gray-900">
                        {new Date(fs.startTime).toLocaleString("vi-VN")}
                      </td>
                      <td className="px-6 py-4  text-gray-900">
                        {new Date(fs.endTime).toLocaleString("vi-VN")}
                      </td>
                      <td className="px-6 py-4  text-gray-900">
                        {fs.dishes?.length || 0} SP
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(fs.status)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </main>
  );
};

export default AdminFlashSale;
