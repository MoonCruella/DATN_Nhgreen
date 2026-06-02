import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Search,
  SlidersHorizontal,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import orderApi from "@/api/orderApi";
import DineInOrderDetailModal from "@/components/manager-view/modals/DineInOrderDetailModal";
import CreateOrderModal from "@/components/manager-view/modals/CreateOrderModal";
import FilterSelect from "@/components/common/FilterSelect";

const formatCurrency = (value = 0) =>
  new Intl.NumberFormat("vi-VN").format(value || 0);

const formatDateTime = (value) => {
  if (!value) return "--";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
};

const compactOrderCode = (orderNumber = "") =>
  orderNumber.replace(/^[A-Z]+/i, "").slice(0, 6) || orderNumber;

const statusConfig = {
  processing: {
    label: "Đang xử lý",
    className: "bg-[#dcfce7] text-[#34ad54]",
    dot: "bg-[#34ad54]",
  },
  completed: {
    label: "Hoàn thành",
    className: "bg-[#34ad54] text-white",
    dot: "bg-white",
  },
};

const statusOptions = [
  { value: "all", label: "Tất cả" },
  { value: "processing", label: "Đang xử lý" },
  { value: "completed", label: "Hoàn thành" },
];

const MaDineInOrders = () => {
  const accessToken = useSelector((state) => state.auth.accessToken);
  const user = useSelector((state) => state.auth.user);
  const branchId = user?.branch_id;

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("all");
  const [appliedStatus, setAppliedStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [createOrderOpen, setCreateOrderOpen] = useState(false);
  const [selectedOrderTable, setSelectedOrderTable] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);

  const fetchOrders = async () => {
    if (!accessToken || !branchId) return;

    try {
      setLoading(true);
      const response = await orderApi.getOrdersByBranch(accessToken, branchId, {
        status: appliedStatus,
        date: "all",
        order_type: "dine_in",
        limit: 100,
      });
      setOrders(response?.data?.orders || []);
      setCurrentPage(1);
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Không thể tải đơn hàng tại quán",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [accessToken, branchId, appliedStatus]);

  const filteredOrders = useMemo(() => {
    const keyword = appliedSearch.trim().toLowerCase();
    if (!keyword) return orders;

    return orders.filter((order) =>
      [order.order_number, compactOrderCode(order.order_number)]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(keyword)),
    );
  }, [orders, appliedSearch]);

  const totalPages = Math.ceil(filteredOrders.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

  const applyFilters = () => {
    setAppliedSearch(searchTerm);
    setAppliedStatus(status);
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setSearchTerm("");
    setAppliedSearch("");
    setStatus("all");
    setAppliedStatus("all");
    setCurrentPage(1);
  };

  const hasActiveFilters =
    Boolean(appliedSearch.trim()) || appliedStatus !== "all";

  const handlePayment = () => {
    if (selectedOrder) {
      setEditingOrder(selectedOrder);
      setSelectedOrderTable({
        _id: selectedOrder.table_id?._id || selectedOrder.table_id,
        name:
          selectedOrder.table_info?.name ||
          selectedOrder.table_id?.name ||
          "Bàn",
      });
      setSelectedOrder(null);
      setCreateOrderOpen(true);
    }
  };

  return (
    <section className="min-h-[calc(100vh-92px)] bg-[#f7f7f8] px-3 py-3">
      <header className="mb-5 flex items-center gap-2 text-lg font-bold">
        <div className="flex items-center gap-2 text-gray-900">
          <Store className="h-5 w-5" strokeWidth={1.8} />
          Quản lý bán hàng
        </div>
        <ChevronRight className="h-5 w-5 text-gray-500" />
        <div className="text-[#34ad54]">Danh sách đơn hàng</div>
      </header>

      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative w-full lg:w-[300px]">
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") applyFilters();
              }}
              className="h-12 w-full rounded-lg border border-gray-200 bg-white px-4 pr-11 text-base font-medium text-gray-800 outline-none placeholder:text-slate-300 focus:border-[#34ad54]"
              placeholder="Nhập mã hóa đơn"
            />
            <Search className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          </div>

          <div className="text-base font-bold text-gray-500">Lọc bởi:</div>

          <FilterSelect
            label="Trạng thái"
            value={status}
            onChange={setStatus}
            options={statusOptions}
            className="lg:w-[220px]"
          />

          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-base font-bold text-[#00bff3] underline underline-offset-4 hover:text-[#00a8d6]"
            >
              Chọn mặc định
            </button>
          )}
        </div>

        <div className="flex gap-3">
          <Button
            type="button"
            onClick={applyFilters}
            className="h-12 min-w-[110px] rounded-lg bg-[#34ad54] text-base font-bold text-white hover:bg-[#2f9b45]"
          >
            Áp dụng
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-gray-100">
        <div className="grid grid-cols-[70px_1fr_1.3fr_1.1fr_1.05fr_1fr_56px] items-center border-b border-gray-200 px-5 py-3 text-base font-bold text-slate-600">
          <div>STT</div>
          <div>Mã hóa đơn</div>
          <div>Thời gian</div>
          <div>Trạng thái</div>
          <div>Tổng tiền</div>
          <div>Hành động</div>
          <div className="flex justify-end">
            <SlidersHorizontal className="h-5 w-5" />
          </div>
        </div>

        {loading ? (
          <div className="px-5 py-9 text-center text-base font-bold text-gray-500">
            Đang tải đơn hàng...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="px-5 py-9 text-center text-base font-bold text-gray-500">
            Chưa có đơn hàng tại quán
          </div>
        ) : (
          paginatedOrders.map((order, index) => {
            const config =
              statusConfig[order.status] || statusConfig.processing;

            return (
              <div
                key={order._id}
                className="grid min-h-14 grid-cols-[70px_1fr_1.3fr_1.1fr_1.05fr_1fr_56px] items-center border-b border-gray-100 px-5 text-base font-medium text-[#444] last:border-b-0"
              >
                <div>{startIndex + index + 1}</div>
                <div>{compactOrderCode(order.order_number)}</div>
                <div>{formatDateTime(order.created_at)}</div>
                <div>
                  <span
                    className={`inline-flex h-8 items-center gap-2 rounded-full px-3 text-sm font-bold ${config.className}`}
                  >
                    <span className={`h-2 w-2 rounded-full ${config.dot}`} />
                    {config.label}
                  </span>
                </div>
                <div>{formatCurrency(order.total_amount)} VND</div>
                <div className="flex items-center gap-5 text-gray-400">
                  <button
                    type="button"
                    onClick={() => setSelectedOrder(order)}
                    className="transition hover:text-[#34ad54]"
                    title="Xem chi tiết"
                  >
                    <Eye className="h-5 w-5" strokeWidth={2.2} />
                  </button>
                </div>
                <div />
              </div>
            );
          })
        )}
      </div>

      {filteredOrders.length > 0 && (
        <div className="mt-4 flex items-center justify-end gap-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="rounded-md border border-gray-200 px-3 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              ⟨⟨
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded-md border border-gray-200 px-3 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="text-sm font-bold text-gray-700 px-2 min-w-[30px] text-center">
              {currentPage}
            </div>

            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="rounded-md border border-gray-200 px-3 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="rounded-md border border-gray-200 px-3 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              ⟩⟩
            </button>
          </div>

          <div className="relative">
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="appearance-none rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 pr-8 hover:border-gray-300 focus:border-[#34ad54] focus:outline-none"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-700" />
          </div>
        </div>
      )}

      <DineInOrderDetailModal
        open={Boolean(selectedOrder)}
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onPrint={() => window.print()}
        onPayment={handlePayment}
      />
      <CreateOrderModal
        table={selectedOrderTable}
        branchId={branchId}
        accessToken={accessToken}
        open={createOrderOpen}
        onOrderCreated={() => {
          setCreateOrderOpen(false);
          setSelectedOrderTable(null);
          setEditingOrder(null);
          fetchOrders();
        }}
        onClose={() => {
          setCreateOrderOpen(false);
          setSelectedOrderTable(null);
          setEditingOrder(null);
        }}
        initialOrder={editingOrder}
      />
    </section>
  );
};

export default MaDineInOrders;


