import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { useSelector } from "react-redux";
import OrdersTable from "@/components/admin-view/tables/OrdersTable";
import OrderModal from "@/components/admin-view/modals/OrderModal";
import orderApi from "@/api/orderApi";
import branchApi from "@/api/branchApi";
import { ChevronRight, Search, Store } from "lucide-react";
import FilterSelect from "@/components/common/FilterSelect";
import AdminPagination from "@/components/admin-view/AdminPagination";
import { Button } from "@/components/ui/button";

const AdminOrders = () => {
  const { user, isAuthenticated, accessToken } = useSelector((s) => s.auth);

  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [branches, setBranches] = useState([]);

  // filters
  const [qSearch, setQSearch] = useState("");
  const [debouncedQSearch, setDebouncedQSearch] = useState("");
  const [qStatus, setQStatus] = useState("all");
  const [qBranch, setQBranch] = useState("all");
  const [appliedStatus, setAppliedStatus] = useState("all");
  const [appliedBranch, setAppliedBranch] = useState("all");

  // pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);

  // modal
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const loadBranches = async () => {
    try {
      const res = await branchApi.getAll({
        page: 1,
        limit: 100,
        status: "active",
      });
      setBranches(res?.data || []);
    } catch (err) {
      console.error("Error loading branches", err);
    }
  };

  const loadOrders = async () => {
    try {
      setIsLoading(true);
      const params = {
        page,
        limit,
        status: appliedStatus !== "all" ? appliedStatus : undefined,
        branch_id: appliedBranch !== "all" ? appliedBranch : undefined,
        sort: "created_at",
        order: "desc",
      };

      if (debouncedQSearch) {
        params.search = debouncedQSearch;
      }

      console.log("Fetching orders with params:", params);
      const res = await orderApi.getAllOrders(accessToken, params);
      console.log("📥 Response:", res);

      // server returns body like { success, data, pagination }
      setOrders(res?.data?.orders || []);
      setTotalPages(res?.data?.pagination?.total_pages || 1);
      setTotalOrders(res?.data?.pagination?.total_orders || 0);
    } catch (err) {
      console.error("Error loading orders", err);
      toast.error("Lỗi tải danh sách đơn hàng");
    } finally {
      setIsLoading(false);
    }
  };

  // debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQSearch(qSearch.trim()), 300);
    return () => clearTimeout(t);
  }, [qSearch]);

  useEffect(() => {
    if (isAuthenticated && user?.role === "admin") {
      loadBranches();
    }
  }, [isAuthenticated, user]);

  // reload when auth, paging or filters change
  useEffect(() => {
    if (isAuthenticated && user?.role === "admin") loadOrders();
  }, [isAuthenticated, user, page, debouncedQSearch, appliedStatus, appliedBranch]);

  const handleRowClick = (order) => {
    setSelectedOrder(order);
    setIsOpen(true);
  };

  const handleResetFilters = () => {
    setQSearch("");
    setQStatus("all");
    setQBranch("all");
    setAppliedStatus("all");
    setAppliedBranch("all");
    setPage(1);
  };
  const applyFilters = () => {
    setAppliedStatus(qStatus);
    setAppliedBranch(qBranch);
    setPage(1);
  };
  const hasActiveFilters =
    Boolean(qSearch.trim()) ||
    qStatus !== "all" ||
    qBranch !== "all" ||
    appliedStatus !== "all" ||
    appliedBranch !== "all";

  return (
    <section className="min-h-[calc(100vh-92px)] bg-[#f7f7f8] px-3 py-3">
      <header className="mb-5 flex items-center gap-2 text-lg font-bold">
        <div className="flex items-center gap-2 text-gray-900">
          <Store className="h-5 w-5" strokeWidth={1.8} />
          Quản trị hệ thống
        </div>
        <ChevronRight className="h-5 w-5 text-gray-500" />
        <div className="text-[#34ad54]">Quản lý đơn hàng</div>
      </header>

      <div className="mb-4 flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-start">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
          <div className="relative w-full lg:w-[300px]">
            <input
              type="text"
              placeholder="Mã đơn, tên, SĐT"
              value={qSearch}
              onChange={(e) => {
                setQSearch(e.target.value);
                setPage(1);
              }}
              className="h-12 w-full rounded-lg border border-gray-200 bg-white px-4 pr-11 text-base font-medium text-gray-800 outline-none placeholder:text-slate-300 focus:border-[#34ad54]"
            />
            <Search className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          </div>

          <div className="text-base font-bold text-gray-500">Lọc bởi:</div>

          <FilterSelect
            label="Chi nhánh"
            value={qBranch}
            onChange={(value) => {
              setQBranch(value);
            }}
            options={[
              { value: "all", label: "Tất cả chi nhánh" },
              ...branches.map((branch) => ({
                value: branch._id,
                label: branch.name,
              })),
            ]}
            className="lg:w-[220px]"
          />

          <FilterSelect
            label="Trạng thái"
            value={qStatus}
            onChange={(value) => {
              setQStatus(value);
            }}
            options={[
              { value: "all", label: "Tất cả trạng thái" },
              { value: "pending", label: "Chờ xác nhận" },
              { value: "confirmed", label: "Đã xác nhận" },
              { value: "processing", label: "Đang xử lý" },
              { value: "shipped", label: "Đang giao" },
              { value: "delivered", label: "Đã giao" },
              { value: "completed", label: "Hoàn thành" },
              { value: "cancel_request", label: "Yêu cầu hủy" },
              { value: "cancelled", label: "Đã hủy" },
            ]}
            className="lg:w-[220px]"
          />

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
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
      </div>

      <section className="pb-16 w-full">
        <OrdersTable
          orders={orders}
          isLoading={isLoading}
          onRowClick={handleRowClick}
        />

        <AdminPagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalOrders}
          pageSize={limit}
          itemLabel="đơn hàng"
          onPageChange={setPage}
        />
      </section>

      <OrderModal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        order={selectedOrder}
      />
    </section>
  );
};

export default AdminOrders;


