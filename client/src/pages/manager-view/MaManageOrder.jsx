import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Search,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import orderApi from "@/api/orderApi";
import FilterSelect from "@/components/common/FilterSelect";

const getEntityId = (value) =>
  value && typeof value === "object" ? value._id || value.id : value;

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
  orderNumber || "--";

const getTextValue = (value) =>
  typeof value === "string" ? value.trim() : value;

const getDineInCustomer = (order) => {
  const customer = order?.customer_id;
  return customer && typeof customer === "object" ? customer : null;
};

const getCustomerName = (order) => {
  const dineInCustomer = getDineInCustomer(order);

  return (
    getTextValue(order.shipping_info?.recipient_name) ||
    getTextValue(order.shipping_info?.name) ||
    getTextValue(dineInCustomer?.name) ||
    "--"
  );
};

const getCustomerPhone = (order) => {
  const dineInCustomer = getDineInCustomer(order);

  return (
    getTextValue(order.shipping_info?.phone) ||
    getTextValue(dineInCustomer?.phone) ||
    "--"
  );
};

const getItemCount = (order) =>
  order.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;

const statusConfig = {
  pending: {
    label: "Chờ xác nhận",
    className: "bg-yellow-100 text-yellow-800",
    dot: "bg-yellow-500",
  },
  confirmed: {
    label: "Đã xác nhận",
    className: "bg-green-100 text-green-800",
    dot: "bg-green-600",
  },
  processing: {
    label: "Đang chuẩn bị",
    className: "bg-green-100 text-green-800",
    dot: "bg-green-600",
  },
  shipped: {
    label: "Delivering",
    className: "bg-orange-100 text-orange-800",
    dot: "bg-orange-500",
  },
  delivered: {
    label: "Đã giao",
    className: "bg-purple-100 text-purple-800",
    dot: "bg-purple-500",
  },
  completed: {
    label: "Hoàn thành",
    className: "bg-[#34ad54] text-white",
    dot: "bg-white",
  },
  cancelled: {
    label: "Đã hủy",
    className: "bg-red-100 text-red-800",
    dot: "bg-red-500",
  },
  cancel_request: {
    label: "Yêu cầu hủy",
    className: "bg-orange-100 text-orange-800",
    dot: "bg-orange-500",
  },
};

const statusOptions = [
  { value: "all", label: "Tất cả" },
  { value: "pending", label: "Chờ xác nhận" },
  { value: "processing", label: "Đang chuẩn bị" },
  { value: "shipped", label: "Delivering" },
  { value: "delivered", label: "Đã giao" },
  { value: "completed", label: "Hoàn thành" },
  { value: "cancelled", label: "Đã hủy" },
  { value: "cancel_request", label: "Yêu cầu hủy" },
];

const dateOptions = [
  { value: "today", label: "Hôm nay" },
  { value: "yesterday", label: "Hôm qua" },
  { value: "week", label: "7 ngày qua" },
  { value: "month", label: "Tháng này" },
  { value: "all", label: "Tất cả" },
];

const getNextAction = (status) => {
  switch (status) {
    case "pending":
      return { label: "Xác nhận", status: "processing" };
    case "confirmed":
      return { label: "Xác nhận", status: "processing" };
    case "processing":
      return { label: "Sẵn sàng giao", status: "shipped" };
    default:
      return null;
  }
};

const MaManageOrder = () => {
  const navigate = useNavigate();
  const accessToken = useSelector((state) => state.auth.accessToken);
  const user = useSelector((state) => state.auth.user);
  const branchId = getEntityId(user?.branch_id);

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [status, setStatus] = useState("all");
  const [appliedStatus, setAppliedStatus] = useState("all");
  const [dateFilter, setDateFilter] = useState("today");
  const [appliedDate, setAppliedDate] = useState("today");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchOrders = async () => {
    if (!accessToken || !branchId) return;

    try {
      setLoading(true);
      const response = await orderApi.getOrdersByBranch(accessToken, branchId, {
        status: appliedStatus,
        date: appliedDate,
        order_type: "online",
        limit: 1000,
      });
      setOrders(response?.data?.orders || []);
      setCurrentPage(1);
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Không thể tải đơn hàng online",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [accessToken, branchId, appliedStatus, appliedDate]);

  useEffect(() => {
    if (!accessToken || !branchId) return;

    const socket = io(import.meta.env.VITE_API_BASE_URL, {
      auth: { token: accessToken },
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      socket.emit("join_branch_room", branchId);
    });

    const handleOrderStatusUpdated = (data) => {
      if (String(data.branch_id) !== String(branchId)) return;

      setOrders((prev) =>
        prev.map((order) =>
          String(order._id) === String(data.order_id)
            ? { ...order, status: data.status, ...(data.updates || {}) }
            : order,
        ),
      );
    };

    socket.on("order_status_updated", handleOrderStatusUpdated);

    return () => {
      socket.off("order_status_updated", handleOrderStatusUpdated);
      socket.emit("leave_branch_room", branchId);
      socket.disconnect();
    };
  }, [accessToken, branchId]);

  const filteredOrders = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return orders;

    return orders.filter((order) =>
      [
        order.order_number,
        compactOrderCode(order.order_number),
        getCustomerName(order),
        getCustomerPhone(order),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword)),
    );
  }, [orders, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + pageSize);
  const hasActiveFilters =
    Boolean(searchTerm.trim()) ||
    appliedStatus !== "all" ||
    appliedDate !== "today";

  const applyFilters = () => {
    setAppliedStatus(status);
    setAppliedDate(dateFilter);
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setSearchTerm("");
    setStatus("all");
    setAppliedStatus("all");
    setDateFilter("today");
    setAppliedDate("today");
    setCurrentPage(1);
  };

  const updateStatus = async (order, nextStatus) => {
    try {
      setUpdatingOrderId(order._id);
      const result = await orderApi.updateOrderStatus(
        accessToken,
        order._id,
        nextStatus,
      );
      const updatedOrder = result?.data?.shipping || null;
      const ghnOrderCode =
        updatedOrder?.shipping_order_code || updatedOrder?.tracking_number || "";
      toast.success(
        ghnOrderCode
          ? `Đã tạo vận đơn GHN ${ghnOrderCode}`
          : "Cập nhật trạng thái thành công",
      );
      setOrders((prev) =>
        prev.map((item) =>
          item._id === order._id
            ? { ...item, ...(updatedOrder || {}), status: nextStatus }
            : item,
        ),
      );
    } catch (error) {
      toast.error(error?.message || "Không thể cập nhật trạng thái");
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const syncGhnStatus = async (order) => {
    try {
      setUpdatingOrderId(order._id);
      const result = await orderApi.syncGhnShippingStatus(accessToken, order._id);
      const updatedOrder = result?.data?.order || null;
      toast.success(
        updatedOrder?.status === "delivered"
          ? "GHN đã giao hàng thành công"
          : "Đã đồng bộ trạng thái GHN",
      );
      if (updatedOrder) {
        setOrders((prev) =>
          prev.map((item) => (item._id === updatedOrder._id ? updatedOrder : item)),
        );
      }
    } catch (error) {
      console.error("Sync GHN status error:", error);
      toast.error(error.message || "Không thể đồng bộ trạng thái GHN");
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const getGhnStatusLabel = (status) => {
    const statusMap = {
      ready_to_pick: "Chờ GHN lấy hàng",
      picking: "GHN đang lấy hàng",
      picked: "GHN đã lấy hàng",
      storing: "Đang lưu kho",
      transporting: "Đang vận chuyển",
      sorting: "Đang phân loại",
      delivering: "Đang giao",
      delivered: "Đã giao",
      delivery_fail: "Giao thất bại",
      waiting_to_return: "Chờ hoàn hàng",
      return: "Đang hoàn hàng",
      returned: "Đã hoàn hàng",
      cancel: "Đã hủy",
    };
    return statusMap[status] || status;
  };

  return (
    <section className="min-h-[calc(100vh-92px)] bg-[#f7f7f8] px-3 py-3">
      <header className="mb-5 flex items-center gap-2 text-lg font-bold">
        <div className="flex items-center gap-2 text-gray-900">
          <Store className="h-5 w-5" strokeWidth={1.8} />
          Quản lý bán hàng
        </div>
        <ChevronRight className="h-5 w-5 text-gray-500" />
        <div className="text-[#34ad54]">Đơn hàng online</div>
      </header>

      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative w-full lg:w-[300px]">
            <input
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setCurrentPage(1);
              }}
              className="h-12 w-full rounded-lg border border-gray-200 bg-white px-4 pr-11 text-base font-medium text-gray-800 outline-none placeholder:text-slate-300 focus:border-[#34ad54]"
              placeholder="Mã đơn, khách hàng, SĐT"
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

          <FilterSelect
            label="Thời gian"
            value={dateFilter}
            onChange={setDateFilter}
            options={dateOptions}
            className="lg:w-[220px]"
          />

          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-base font-bold text-[#34ad54] underline underline-offset-4 hover:text-[#2f9b45]"
            >
              Chọn mặc định
            </button>
          )}
        </div>

        <Button
          type="button"
          onClick={applyFilters}
          className="h-12 min-w-[110px] rounded-lg bg-[#34ad54] text-base font-bold text-white hover:bg-[#2f9b45]"
        >
          Áp dụng
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-gray-100">
        <div className="grid grid-cols-[64px_0.9fr_1.15fr_1.2fr_1.05fr_0.85fr_minmax(230px,1.45fr)] items-center border-b border-gray-200 px-5 py-3 text-base font-bold text-slate-600">
          <div>STT</div>
          <div>Mã đơn</div>
          <div>Thời gian</div>
          <div>Khách hàng</div>
          <div>Trạng thái</div>
          <div>Tổng tiền</div>
          <div>Hành động</div>
        </div>

        {loading ? (
          <div className="px-5 py-9 text-center text-base font-bold text-gray-500">
            Đang tải đơn hàng...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="px-5 py-9 text-center text-base font-bold text-gray-500">
            Không có đơn hàng online
          </div>
        ) : (
          paginatedOrders.map((order, index) => {
            const config = statusConfig[order.status] || statusConfig.pending;
            const nextAction = getNextAction(order.status);
            const hasGhnTracking =
              order.shipping_order_code || order.tracking_number;
            const canSyncGhn =
              hasGhnTracking &&
              !["delivered", "completed", "cancelled"].includes(order.status) &&
              !["delivered", "cancel", "returned"].includes(
                order.shipping_status,
              );

            return (
              <div
                key={order._id}
                className="grid min-h-14 grid-cols-[64px_0.9fr_1.15fr_1.2fr_1.05fr_0.85fr_minmax(230px,1.45fr)] items-center border-b border-gray-100 px-5 text-base font-medium text-[#444] last:border-b-0"
              >
                <div>{startIndex + index + 1}</div>
                <div>{compactOrderCode(order.order_number)}</div>
                <div>{formatDateTime(order.created_at)}</div>
                <div>
                  <div className="font-bold text-gray-800">
                    {getCustomerName(order)}
                  </div>
                  <div className="text-sm text-gray-500">
                    {getCustomerPhone(order)} · {getItemCount(order)} món
                  </div>
                </div>
                <div>
                  <span
                    className={`inline-flex h-8 items-center gap-2 rounded-full px-3 text-sm font-bold ${config.className}`}
                  >
                    <span className={`h-2 w-2 rounded-full ${config.dot}`} />
                    {config.label}
                  </span>
                  {hasGhnTracking && (
                    <div className="mt-1 text-xs font-bold text-gray-500">
                      GHN: {order.shipping_order_code || order.tracking_number}
                      {order.shipping_status && (
                        <span className="ml-2 text-[#34ad54]">
                          {getGhnStatusLabel(order.shipping_status)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div>{formatCurrency(order.total_amount)} VND</div>
                <div className="flex min-w-0 items-center justify-start gap-2 text-gray-400">
                  <button
                    type="button"
                    onClick={() => navigate(`/manager/orders/${order._id}`)}
                    className="transition hover:text-[#34ad54] cursor-pointer"
                    title="Xem chi tiết"
                  >
                    <Eye className="h-5 w-5" strokeWidth={2.2} />
                  </button>
                  {nextAction && (
                    <button
                      type="button"
                      onClick={() => updateStatus(order, nextAction.status)}
                      disabled={updatingOrderId === order._id}
                      className="whitespace-nowrap rounded-md bg-[#34ad54] px-3 py-1.5 text-sm font-bold text-white hover:bg-[#2f9b45] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                    >
                      {updatingOrderId === order._id
                        ? "..."
                        : nextAction.label}
                    </button>
                  )}
                  {canSyncGhn && (
                    <button
                      type="button"
                      onClick={() => syncGhnStatus(order)}
                      disabled={updatingOrderId === order._id}
                      className="whitespace-nowrap rounded-md border border-[#34ad54] px-3 py-1.5 text-sm font-bold text-[#34ad54] hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                    >
                      {updatingOrderId === order._id ? "..." : "Đồng bộ GHN"}
                    </button>
                  )}
                </div>
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
              «
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded-md border border-gray-200 px-3 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="min-w-[30px] px-2 text-center text-sm font-bold text-gray-700">
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
              »
            </button>
          </div>

          <div className="relative">
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setCurrentPage(1);
              }}
              className="appearance-none rounded-md border border-gray-200 bg-white px-4 py-2 pr-8 text-sm font-bold text-gray-700 hover:border-gray-300 focus:border-[#34ad54] focus:outline-none"
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
    </section>
  );
};

export default MaManageOrder;
