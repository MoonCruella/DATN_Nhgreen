import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import branchApi from "@/api/branchApi";
import BranchTable from "@/components/admin-view/tables/BranchTable";

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
        active: statusFilter !== "all" ? statusFilter : undefined,
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
  }, [isAuthenticated, user, debouncedSearchTerm, statusFilter]);

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
  };

  return (
    <main className="bg-gray-50 min-h-screen">
      <section className="w-full px-4 pt-8">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex items-center justify-between">
          <div className="text-lg font-medium">Quản lý chi nhánh</div>
          <button
            onClick={() => navigate("/admin/branches/create")}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition cursor-pointer"
          >
            + Thêm chi nhánh
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tìm kiếm
              </label>
              <input
                type="text"
                placeholder="Tìm theo tên, địa chỉ hoặc mã..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400 transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Trạng thái
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400 transition cursor-pointer"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="active">Hoạt động</option>
                <option value="inactive">Ngừng hoạt động</option>
              </select>
            </div>

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
                  {branches.length}
                </span>{" "}
                chi nhánh
                {searchTerm !== debouncedSearchTerm && (
                  <span className="text-gray-500 ml-2">(đang gõ...)</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-16 w-full px-4">
        <BranchTable
          branches={branches}
          isLoading={initialLoading}
          onRowClick={(branch) => navigate(`/admin/branches/${branch._id}`)}
        />
      </section>
    </main>
  );
};

export default AdminBranches;


