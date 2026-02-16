import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { useSelector } from "react-redux";
import OrdersTable from "@/components/admin-view/tables/OrdersTable";
import OrderModal from "@/components/admin-view/modals/OrderModal";
import orderApi from "@/api/orderApi";
import branchApi from "@/api/branchApi";

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
        status: qStatus !== "all" ? qStatus : undefined,
        branch_id: qBranch !== "all" ? qBranch : undefined,
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
  }, [isAuthenticated, user, page, debouncedQSearch, qStatus, qBranch]);

  const handleRowClick = (order) => {
    setSelectedOrder(order);
    setIsOpen(true);
  };

  const handleResetFilters = () => {
    setQSearch("");
    setQStatus("all");
    setQBranch("all");
    setPage(1);
  };

  return (
    <main className="bg-gray-50 min-h-screen">
      <section className="w-full px-4 pt-8">
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex items-center justify-between">
          <div className="text-lg font-medium">Quản lý đơn hàng</div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-4">
              <input
                type="text"
                placeholder="Tìm theo mã đơn, tên, SĐT..."
                value={qSearch}
                onChange={(e) => {
                  setQSearch(e.target.value);
                  setPage(1);
                }}
                className="border rounded-lg px-3 py-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 transition w-64"
              />

              <select
                value={qBranch}
                onChange={(e) => {
                  setQBranch(e.target.value);
                  setPage(1);
                }}
                className="border rounded-lg px-3 py-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 transition cursor-pointer"
              >
                <option value="all">Tất cả chi nhánh</option>
                {branches.map((branch) => (
                  <option key={branch._id} value={branch._id}>
                    {branch.name}
                  </option>
                ))}
              </select>

              <select
                value={qStatus}
                onChange={(e) => {
                  setQStatus(e.target.value);
                  setPage(1);
                }}
                className="border rounded-lg px-3 py-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 transition cursor-pointer"
              >
                <option value="all">Tất cả</option>
                <option value="pending">Chờ xác nhận</option>
                <option value="confirmed">Đã xác nhận</option>
                <option value="processing">Đang xử lý</option>
                <option value="shipped">Đang giao</option>
                <option value="delivered">Đã giao</option>
                <option value="completed">Hoàn thành</option>
                <option value="cancel_request">Yêu cầu hủy</option>
                <option value="cancelled">Đã hủy</option>
              </select>

              <button
                onClick={handleResetFilters}
                className="px-3 py-2 bg-gray-100 rounded-lg transition hover:bg-gray-200 cursor-pointer"
              >
                Đặt lại
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-16 w-full px-4">
        <OrdersTable
          orders={orders}
          isLoading={isLoading}
          onRowClick={handleRowClick}
        />

        {/* Footer showing counts */}
        <div className="mt-3 text-xs text-gray-600 flex items-center justify-between">
          <div>
            Hiển thị {orders.length} / {totalOrders} đơn hàng
          </div>
          <div>
            Trang {page} / {totalPages}
          </div>
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center mt-4 gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className={`px-3 py-1 rounded ${
                page === 1
                  ? "bg-gray-200 text-gray-400"
                  : "bg-gray-800 text-white cursor-pointer"
              }`}
            >
              {"<"}
            </button>

            {(() => {
              const pages = [];
              const showEllipsis = totalPages > 5;

              if (!showEllipsis) {
                // Show all pages if 5 or fewer
                for (let i = 1; i <= totalPages; i++) {
                  pages.push(i);
                }
              } else {
                // Always show first page
                pages.push(1);

                if (page <= 2) {
                  // Near start: show 1,2,3,...,last
                  pages.push(2, 3, "...", totalPages);
                } else if (page >= totalPages - 1) {
                  // Near end: show 1,...,last-2,last-1,last
                  pages.push(
                    "...",
                    totalPages - 2,
                    totalPages - 1,
                    totalPages
                  );
                } else {
                  // Middle: show 1,...,current-1,current,current+1,...,last
                  pages.push("...", page - 1, page, page + 1, "...", totalPages);
                }
              }

              return pages.map((p, idx) => {
                if (p === "...") {
                  return (
                    <span key={`ellipsis-${idx}`} className="px-2 text-gray-400">
                      ...
                    </span>
                  );
                }
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`px-3 py-1 rounded ${
                      page === p
                        ? "bg-gray-800 text-white"
                        : "bg-gray-200 cursor-pointer hover:bg-gray-300"
                    }`}
                  >
                    {p}
                  </button>
                );
              });
            })()}

            <button
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
              className={`px-3 py-1 rounded ${
                page === totalPages
                  ? "bg-gray-200 text-gray-400"
                  : "bg-gray-800 text-white cursor-pointer"
              }`}
            >
              {">"}
            </button>
          </div>
        )}
      </section>

      <OrderModal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        order={selectedOrder}
      />
    </main>
  );
};

export default AdminOrders;
