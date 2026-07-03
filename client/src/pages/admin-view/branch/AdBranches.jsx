import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import branchApi from "@/api/branchApi";
import BranchTable from "@/components/admin-view/tables/BranchTable";
import { ChevronRight, Search, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import FilterSelect from "@/components/common/FilterSelect";

const AdminBranches = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, accessToken } = useSelector((s) => s.auth);

  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [filtering, setFiltering] = useState(false);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [appliedStatusFilter, setAppliedStatusFilter] = useState("all");

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch all branches
  const fetchBranches = async () => {
    try {
      setLoading(true);
      const params = {
        page: 1,
        limit: 1000,
        active:
          appliedStatusFilter !== "all" ? appliedStatusFilter : undefined,
        q: debouncedSearchTerm || undefined,
      };
      Object.keys(params).forEach(
        (key) => params[key] === undefined && delete params[key]
      );
      const res = await branchApi.getAll(params);
      if (res?.data) {
        setBranches(res.data);
      }
    } catch (error) {
      console.error("Error fetching branches:", error);
      toast.error("Lỗi tải danh sách chi nhánh");
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "admin") return;
    fetchBranches();
  }, [isAuthenticated, user, debouncedSearchTerm, appliedStatusFilter]);

  const getStatusBadge = (active) => {
    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-medium ${
          active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
        }`}
      >
        {active ? "Hoạt động" : "Ngừng hoạt động"}
      </span>
    );
  };

  // No need for client-side filtering anymore - API handles it
  const filteredBranches = branches;

  // Reset filters
  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setAppliedStatusFilter("all");
  };
  const applyFilters = () => {
    setAppliedStatusFilter(statusFilter);
  };
  const hasActiveFilters =
    Boolean(searchTerm.trim()) ||
    statusFilter !== "all" ||
    appliedStatusFilter !== "all";

  return (
    <section className="min-h-[calc(100vh-92px)] bg-[#f7f7f8] px-3 py-3">
      <header className="mb-5 flex items-center gap-2 text-lg font-bold">
        <div className="flex items-center gap-2 text-gray-900">
          <Store className="h-5 w-5" strokeWidth={1.8} />
          Quản trị hệ thống
        </div>
        <ChevronRight className="h-5 w-5 text-gray-500" />
        <div className="text-[#34ad54]">Quản lý chi nhánh</div>
      </header>

      <div className="mb-4 flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-start">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
          <div className="relative w-full lg:w-[300px]">
            <input
              type="text"
              placeholder="Tên, địa chỉ hoặc mã"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-12 w-full rounded-lg border border-gray-200 bg-white px-4 pr-11 text-base font-medium text-gray-800 outline-none placeholder:text-slate-300 focus:border-[#34ad54]"
            />
            <Search className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          </div>

          <div className="text-base font-bold text-gray-500">Lọc bởi:</div>

          <FilterSelect
            label="Trạng thái"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: "all", label: "Tất cả trạng thái" },
              { value: "active", label: "Hoạt động" },
              { value: "inactive", label: "Ngừng hoạt động" },
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
          onClick={() => navigate("/admin/branches/create")}
          className="h-12 rounded-lg bg-[#34ad54] px-5 text-base font-bold text-white hover:bg-[#2f9b45]"
        >
          + Thêm chi nhánh
        </Button>
      </div>

      <section className="pb-16 w-full">
        <BranchTable
          branches={branches}
          isLoading={initialLoading}
          onRowClick={(branch) => navigate(`/admin/branches/${branch._id}`)}
        />
        <div className="mt-4 text-sm font-bold text-gray-500">
          Hiển thị {branches.length} chi nhánh
          {searchTerm !== debouncedSearchTerm && (
            <span className="ml-2 text-gray-400">(đang gõ...)</span>
          )}
        </div>
      </section>
    </section>
  );
};

export default AdminBranches;


