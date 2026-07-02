import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import flashsaleApi from "@/api/flashsaleApi";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import TableSkeleton from "@/components/admin-view/TableSkeleton";
import { ChevronRight, Search, Store } from "lucide-react";
import FilterSelect from "@/components/common/FilterSelect";
import AdminPagination from "@/components/admin-view/AdminPagination";

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
  const [appliedStatusFilter, setAppliedStatusFilter] = useState("all");
  const [appliedStartDateFilter, setAppliedStartDateFilter] = useState("");
  const [appliedEndDateFilter, setAppliedEndDateFilter] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

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
        status:
          appliedStatusFilter !== "all" ? appliedStatusFilter : undefined,
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
  }, [debouncedSearchTerm, appliedStatusFilter]);

  const getStatusBadge = (status) => {
    const badges = {
      upcoming: "bg-green-100 text-green-800",
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
      if (appliedStartDateFilter) {
        const fsStartDate = new Date(fs.startTime).setHours(0, 0, 0, 0);
        const filterStartDate = new Date(appliedStartDateFilter).setHours(0, 0, 0, 0);
        if (fsStartDate < filterStartDate) return false;
      }

      // Filter by end date
      if (appliedEndDateFilter) {
        const fsEndDate = new Date(fs.endTime).setHours(0, 0, 0, 0);
        const filterEndDate = new Date(appliedEndDateFilter).setHours(0, 0, 0, 0);
        if (fsEndDate > filterEndDate) return false;
      }

      return true;
    });

    setFilteredFlashSales(filtered);
    setPage(1);
  }, [flashSales, appliedStartDateFilter, appliedEndDateFilter]);

  // Reset filters
  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setStartDateFilter("");
    setEndDateFilter("");
    setAppliedStatusFilter("all");
    setAppliedStartDateFilter("");
    setAppliedEndDateFilter("");
    setPage(1);
  };
  const applyFilters = () => {
    setAppliedStatusFilter(statusFilter);
    setAppliedStartDateFilter(startDateFilter);
    setAppliedEndDateFilter(endDateFilter);
    setPage(1);
  };
  const hasActiveFilters =
    Boolean(searchTerm.trim()) ||
    statusFilter !== "all" ||
    appliedStatusFilter !== "all" ||
    Boolean(startDateFilter) ||
    Boolean(endDateFilter) ||
    Boolean(appliedStartDateFilter) ||
    Boolean(appliedEndDateFilter);
  const paginatedFlashSales = filteredFlashSales.slice(
    (page - 1) * pageSize,
    page * pageSize
  );
  const totalPages = Math.max(1, Math.ceil(filteredFlashSales.length / pageSize));

  return (
    <section className="min-h-[calc(100vh-92px)] bg-[#f7f7f8] px-3 py-3">
      <header className="mb-5 flex items-center gap-2 text-lg font-bold">
        <div className="flex items-center gap-2 text-gray-900">
          <Store className="h-5 w-5" strokeWidth={1.8} />
          Quản trị hệ thống
        </div>
        <ChevronRight className="h-5 w-5 text-gray-500" />
        <div className="text-[#34ad54]">Quản lý Flash Sale</div>
      </header>

      <div className="mb-4 flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-start">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
          <div className="relative w-full lg:w-[300px]">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tên chương trình"
              className="h-12 w-full rounded-lg border border-gray-200 bg-white px-4 pr-11 text-base font-medium text-gray-800 outline-none placeholder:text-slate-300 focus:border-[#34ad54]"
            />
            <Search className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          </div>

          <div className="text-base font-bold text-gray-500">Lọc bởi:</div>

          <FilterSelect
            label="Trạng thái"
            value={statusFilter}
            onChange={(value) => {
              setStatusFilter(value);
            }}
            options={[
              { value: "all", label: "Tất cả trạng thái" },
              { value: "upcoming", label: "Sắp diễn ra" },
              { value: "active", label: "Đang diễn ra" },
              { value: "ended", label: "Đã kết thúc" },
            ]}
            className="lg:w-[220px]"
          />

          <input
            type="date"
            value={startDateFilter}
            onChange={(e) => {
              setStartDateFilter(e.target.value);
            }}
            className="h-12 rounded-lg border border-gray-200 bg-white px-4 text-base font-bold text-gray-800 outline-none focus:border-[#34ad54]"
          />
          <input
            type="date"
            value={endDateFilter}
            onChange={(e) => {
              setEndDateFilter(e.target.value);
            }}
            disabled={!startDateFilter}
            className="h-12 rounded-lg border border-gray-200 bg-white px-4 text-base font-bold text-gray-800 outline-none focus:border-[#34ad54] disabled:cursor-not-allowed disabled:bg-gray-100"
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

        <Button
          type="button"
          onClick={applyFilters}
          className="h-12 w-full min-w-[110px] shrink-0 rounded-lg bg-[#34ad54] px-5 text-base font-bold text-white hover:bg-[#2f9b45] sm:w-auto"
        >
          Áp dụng
        </Button>

        <Button
          type="button"
          onClick={() => navigate("/admin/flash-sale/create")}
          className="h-12 rounded-lg bg-[#34ad54] px-5 text-base font-bold text-white hover:bg-[#2f9b45]"
        >
          + Tạo Flash Sale
        </Button>
      </div>

      <section className="pb-16 w-full">
        {/* Flash Sales Table */}
        <div className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-gray-100">
          {initialLoading ? (
            <TableSkeleton rows={8} columns={5} />
          ) : (
            <table className="w-full">
              <thead className="border-b border-gray-200 bg-white">
                <tr>
                  <th className="px-5 py-3 text-left text-base font-bold text-slate-600">
                    Tên chương trình
                  </th>
                  <th className="px-5 py-3 text-left text-base font-bold text-slate-600">
                    Thời gian bắt đầu
                  </th>
                  <th className="px-5 py-3 text-left text-base font-bold text-slate-600">
                    Thời gian kết thúc
                  </th>
                  <th className="px-5 py-3 text-left text-base font-bold text-slate-600">
                    Sản phẩm
                  </th>
                  <th className="px-5 py-3 text-left text-base font-bold text-slate-600">
                    Trạng thái
                  </th>
                </tr>
              </thead>
              <tbody>
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
                  paginatedFlashSales.map((fs) => (
                    <tr
                      key={fs._id}
                      className="cursor-pointer border-b border-gray-100 text-base font-medium text-[#444] transition hover:bg-gray-50 last:border-b-0"
                      onClick={() => navigate(`/admin/flash-sale/${fs._id}`)}
                    >
                      <td className="px-5 py-3 font-bold text-gray-800">
                        {fs.title}
                      </td>
                      <td className="px-5 py-3 text-gray-700">
                        {new Date(fs.startTime).toLocaleString("vi-VN")}
                      </td>
                      <td className="px-5 py-3 text-gray-700">
                        {new Date(fs.endTime).toLocaleString("vi-VN")}
                      </td>
                      <td className="px-5 py-3 text-gray-700">
                        {fs.dishes?.length || 0} SP
                      </td>
                      <td className="px-5 py-3">{getStatusBadge(fs.status)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
        <AdminPagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={filteredFlashSales.length}
          pageSize={pageSize}
          itemLabel="Flash Sale"
          onPageChange={setPage}
          disabled={loading}
        />
      </section>
    </section>
  );
};

export default AdminFlashSale;


