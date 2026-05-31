import React, { useEffect, useState, useCallback, useRef } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { io } from "socket.io-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import orderApi from "@/api/orderApi";
import branchApi from "@/api/branchApi";
import {
  Package,
  RefreshCw,
  Search,
  Clock,
  User,
  MapPin,
  UtensilsCrossed,
  MailOpen,
} from "lucide-react";

const MaManageOrder = () => {
  const navigate = useNavigate();
  const accessToken = useSelector((state) => state.auth.accessToken);
  const user = useSelector((state) => state.auth.user);
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const branchId = user?.branch_id;
  console.log("user:", user);

  console.log("🔍 MaManageOrder - User info:", {
    hasAccessToken: !!accessToken,
    isAuthenticated,
    userId: user?._id,
    userRole: user?.role,
    branchId: branchId,
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      toast.error("Vui lòng đăng nhập để tiếp tục");
      navigate("/auth/login");
      return;
    }

    if (user?.role !== "manager") {
      toast.error("Bạn không có quyền truy cập trang này");
      navigate("/");
      return;
    }

    if (!branchId) {
      toast.error("Tài khoản manager chưa được gán chi nhánh");
      setLoading(false);
      return;
    }
  }, [isAuthenticated, accessToken, user, branchId, navigate]);

  // Fetch branch name
  useEffect(() => {
    const fetchBranchName = async () => {
      if (branchId) {
        try {
          const response = await branchApi.getById(branchId);
          if (response.success) {
            setBranchName(response.data.name);
          }
        } catch (error) {
          console.error("Error fetching branch name:", error);
        }
      }
    };
    fetchBranchName();
  }, [branchId]);

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [socket, setSocket] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [branchName, setBranchName] = useState("");

  // Pagination states
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const observerRef = useRef(null);
  const loadMoreRef = useRef(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("today");

  // Stats
  const [stats, setStats] = useState({
    all: 0,
    pending: 0,
    confirmed: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
    completed: 0,
    cancelled: 0,
    cancel_request: 0,
  });

  // Fetch full stats separately (without pagination)
  const fetchStats = useCallback(async () => {
    if (!accessToken || !branchId || !isAuthenticated) {
      return;
    }

    try {
      console.log("🔍 Fetching stats for branch:", branchId);
      const response = await orderApi.getOrdersByBranch(accessToken, branchId, {
        date: dateFilter,
        search: searchQuery,
        order_type: "online",
        // No page/limit to get all orders for counting
        limit: 10000, // Set high limit to get all
      });

      if (response.success) {
        const allOrders = response.data.orders || [];
        const newStats = {
          all: allOrders.length,
          pending: allOrders.filter((o) => o.status === "pending").length,
          confirmed: allOrders.filter((o) => o.status === "confirmed").length,
          processing: allOrders.filter((o) => o.status === "processing").length,
          shipped: allOrders.filter((o) => o.status === "shipped").length,
          delivered: allOrders.filter((o) => o.status === "delivered").length,
          completed: allOrders.filter((o) => o.status === "completed").length,
          cancelled: allOrders.filter((o) => o.status === "cancelled").length,
          cancel_request: allOrders.filter((o) => o.status === "cancel_request").length,
        };
        setStats(newStats);
        console.log("✅ Stats updated:", newStats);
      }
    } catch (error) {
      console.error("❌ Error fetching stats:", error);
    }
  }, [accessToken, branchId, isAuthenticated, dateFilter, searchQuery]);

  // Initialize Socket.IO
  useEffect(() => {
    if (!accessToken || !branchId) return;

    const newSocket = io(
      import.meta.env.VITE_API_BASE_URL || "http://localhost:3000",
      {
        auth: { token: accessToken },
        transports: ["websocket", "polling"],
      }
    );

    newSocket.on("connect", () => {
      console.log("✅ Socket connected");
      // Join branch-specific room
      newSocket.emit("join_branch_room", branchId);
    });

    newSocket.on("connect_error", (error) => {
      console.error("❌ Socket connection error:", error);
    });

    // Listen for new orders
    newSocket.on("new_order", (order) => {
      console.log("📦 New order received:", order);

      // Extract branch ID (could be string or populated object)
      const orderBranchId =
        typeof order.branch_id === "object"
          ? order.branch_id?._id
          : order.branch_id;

      console.log("🔍 Branch comparison:", {
        orderBranchId,
        orderBranchIdType: typeof order.branch_id,
        currentBranchId: branchId,
        match: orderBranchId?.toString() === branchId?.toString(),
      });

      if (orderBranchId?.toString() === branchId?.toString()) {
        setOrders((prev) => {
          const updated = [order, ...prev];
          return updated;
        });
        fetchStats(); // Refresh stats
        playNotificationSound();
        toast.success(`Đơn hàng mới #${order.order_number}`);
      } else {
        console.log("⚠️ Order branch mismatch - not adding to list");
      }
    });

    // Listen for order status updates
    newSocket.on("order_status_updated", (data) => {
      console.log("🔄 Order status updated:", data);

      // Extract branch ID (could be string or populated object)
      const dataBranchId =
        typeof data.branch_id === "object"
          ? data.branch_id?._id
          : data.branch_id;

      if (dataBranchId?.toString() === branchId?.toString()) {
        setOrders((prev) => {
          const updated = prev.map((order) =>
            order._id === data.order_id
              ? { ...order, status: data.status, ...data.updates }
              : order
          );
          return updated;
        });
        fetchStats(); // Refresh stats

        // Show toast notification for cancelled orders
        if (data.status === "cancelled") {
          playNotificationSound();
          toast.error(`Đơn hàng #${data.order_number} đã bị hủy`, {
            description:
              data.updates?.cancel_reason || "Khách hàng đã hủy đơn hàng",
          });
        } else if (data.status === "cancel_request") {
          playNotificationSound();
          toast.warning(`Yêu cầu hủy đơn #${data.order_number}`, {
            description:
              data.updates?.cancel_reason || "Khách hàng yêu cầu hủy đơn hàng",
          });
        }
      }
    });

    // Listen for order confirmed by customer
    newSocket.on("order_confirmed_by_customer", (data) => {
      console.log("✅ Order confirmed by customer:", data);

      // Extract branch ID (could be string or populated object)
      const dataBranchId =
        typeof data.branch_id === "object"
          ? data.branch_id?._id
          : data.branch_id;

      if (dataBranchId?.toString() === branchId?.toString()) {
        setOrders((prev) => {
          const updated = prev.map((order) =>
            order._id === data.order_id
              ? { ...order, status: "completed", completed_at: new Date() }
              : order
          );
          return updated;
        });
        fetchStats(); // Refresh stats
        toast.success(`Đơn #${data.order_number} đã được xác nhận hoàn thành`);
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [accessToken, branchId]);

  // Fetch orders
  const fetchOrders = useCallback(async (pageNum = 1, append = false) => {
    // Only fetch if authenticated and has branch
    if (!accessToken || !branchId || !isAuthenticated) {
      console.log("⏸️ Skipping fetch - not ready:", {
        hasAccessToken: !!accessToken,
        hasBranchId: !!branchId,
        isAuthenticated,
      });
      setLoading(false);
      return;
    }

    try {
      if (!append) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      
      const limit = 10;
      console.log("🔍 Fetching orders for branch:", branchId, "page:", pageNum);
      const response = await orderApi.getOrdersByBranch(accessToken, branchId, {
        date: dateFilter,
        search: searchQuery,
        order_type: "online",
        page: pageNum,
        limit: limit,
      });

      console.log("✅ Orders response:", response);
      if (response.success) {
        const newOrders = response.data.orders || [];
        
        if (append) {
          setOrders(prev => [...prev, ...newOrders]);
        } else {
          setOrders(newOrders);
        }
        
        setHasMore(newOrders.length === limit);
      }
    } catch (error) {
      console.error("❌ Error fetching orders:", error);
      console.error("Error details:", error.response?.data || error.message);
      toast.error(
        `Lỗi tải danh sách đơn hàng: ${
          error.response?.data?.message || error.message
        }`
      );
    } finally {
      setLoading(false);
      setInitialLoading(false);
      setLoadingMore(false);
    }
  }, [
    accessToken,
    branchId,
    isAuthenticated,
    dateFilter,
    searchQuery,
    orders,
  ]);

  // Load more orders
  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchOrders(nextPage, true);
    }
  }, [loadingMore, hasMore, page, fetchOrders]);

  // Reset and fetch when filters change
  useEffect(() => {
    setPage(1);
    setOrders([]);
    setHasMore(true);
    fetchOrders(1, false);
    fetchStats(); // Fetch stats separately
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter, searchQuery]);

  // Set up Intersection Observer for infinite scroll
  useEffect(() => {
    if (loading || loadingMore || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    observerRef.current = observer;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loading, loadingMore, hasMore, loadMore]);

  // Play notification sound
  const playNotificationSound = () => {
    const audio = new Audio("/notification.mp3");
    audio.play().catch((e) => console.log("Cannot play sound:", e));
  };

  // Update order status
  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      setUpdatingStatus(true);
      const response = await orderApi.updateOrderStatus(
        accessToken,
        orderId,
        newStatus
      );

      if (response.success) {
        toast.success("Cập nhật trạng thái thành công");
        setOrders((prev) =>
          prev.map((order) =>
            order._id === orderId
              ? { ...order, status: newStatus, [`${newStatus}_at`]: new Date() }
              : order
          )
        );
        fetchStats(); // Refresh stats
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error(error.message || "Lỗi cập nhật trạng thái");
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Get status badge
  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: {
        label: "Chờ xác nhận",
        className: "bg-yellow-100 text-yellow-800",
      },
      confirmed: {
        label: "Đã xác nhận",
        className: "bg-blue-100 text-blue-800",
      },
      processing: {
        label: "Đang chuẩn bị",
        className: "bg-blue-100 text-blue-800",
      },
      shipped: {
        label: "Đang giao",
        className: "bg-orange-100 text-orange-800",
      },
      delivered: {
        label: "Đã giao hàng",
        className: "bg-purple-100 text-purple-800",
      },
      completed: {
        label: "Hoàn thành",
        className: "bg-green-100 text-green-800",
      },
      cancelled: { label: "Đã hủy", className: "bg-red-100 text-red-800" },
      cancel_request: {
        label: "Yêu cầu hủy",
        className: "bg-orange-100 text-orange-800 animate-pulse",
      },
    };

    const config = statusConfig[status] || statusConfig.pending;
    return (
      <Badge className={`${config.className} font-medium`}>
        {config.label}
      </Badge>
    );
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  // Format date time
  const formatDateTime = (date) => {
    return new Date(date).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get next status actions
  const getAvailableActions = (status) => {
    switch (status) {
      case "pending":
        return [
          { label: "Xác nhận đơn", status: "confirmed", variant: "default" },
        ];
      case "confirmed":
        return [
          {
            label: "Bắt đầu chuẩn bị",
            status: "processing",
            variant: "default",
          },
        ];
      case "processing":
        return [
          { label: "Sẵn sàng giao", status: "shipped", variant: "default" },
        ];
      case "shipped":
        return [
          { label: "Đã giao hàng", status: "delivered", variant: "default" },
        ];
      default:
        return [];
    }
  };

  // Filter orders
  const filteredOrders = orders.filter((order) => {
    // Status filter
    if (statusFilter !== "all" && order.status !== statusFilter) return false;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        order.order_number.toLowerCase().includes(query) ||
        order.shipping_address?.recipient_name?.toLowerCase().includes(query) ||
        order.shipping_address?.phone?.includes(query)
      );
    }

    return true;
  });

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Package className="w-6 h-6" />
              Quản lý đơn hàng
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Chi nhánh: {branchName || "Đang tải..."}
            </p>
          </div>
          <Button
            onClick={fetchOrders}
            variant="outline"
            className="cursor-pointer flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Làm mới
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2 mb-4">
          <button
            onClick={() => setStatusFilter("all")}
            className={`p-2 rounded-lg text-center transition-all ${
              statusFilter === "all"
                ? "bg-gray-700 text-white shadow-md"
                : "bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 cursor-pointer"
            }`}
          >
            <div className="text-sm font-bold">{stats.all}</div>
            <div className="text-xs mt-0.5">Tất cả</div>
          </button>
          <button
            onClick={() => setStatusFilter("pending")}
            className={`p-2 rounded-lg text-center transition-all ${
              statusFilter === "pending"
                ? "bg-gray-700 text-white shadow-md"
                : "bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 cursor-pointer"
            }`}
          >
            <div className="text-sm font-bold">{stats.pending}</div>
            <div className="text-xs mt-0.5">Chờ xác nhận</div>
          </button>
          <button
            onClick={() => setStatusFilter("confirmed")}
            className={`p-2 rounded-lg text-center transition-all ${
              statusFilter === "confirmed"
                ? "bg-gray-700 text-white shadow-md"
                : "bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 cursor-pointer"
            }`}
          >
            <div className="text-sm font-bold">{stats.confirmed}</div>
            <div className="text-xs mt-0.5">Đã xác nhận</div>
          </button>
          <button
            onClick={() => setStatusFilter("processing")}
            className={`p-2 rounded-lg text-center transition-all ${
              statusFilter === "processing"
                ? "bg-gray-700 text-white shadow-md"
                : "bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 cursor-pointer"
            }`}
          >
            <div className="text-sm font-bold">{stats.processing}</div>
            <div className="text-xs mt-0.5">Đang chuẩn bị</div>
          </button>
          <button
            onClick={() => setStatusFilter("shipped")}
            className={`p-2 rounded-lg text-center transition-all ${
              statusFilter === "shipped"
                ? "bg-gray-700 text-white shadow-md"
                : "bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 cursor-pointer"
            }`}
          >
            <div className="text-sm font-bold">{stats.shipped}</div>
            <div className="text-xs mt-0.5">Đang giao</div>
          </button>
          <button
            onClick={() => setStatusFilter("delivered")}
            className={`p-2 rounded-lg text-center transition-all ${
              statusFilter === "delivered"
                ? "bg-gray-700 text-white shadow-md"
                : "bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 cursor-pointer"
            }`}
          >
            <div className="text-sm font-bold">{stats.delivered}</div>
            <div className="text-xs mt-0.5">Đã giao hàng</div>
          </button>
          <button
            onClick={() => setStatusFilter("completed")}
            className={`p-2 rounded-lg text-center transition-all ${
              statusFilter === "completed"
                ? "bg-green-600 text-white shadow-md"
                : "bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 cursor-pointer"
            }`}
          >
            <div className="text-sm font-bold">{stats.completed}</div>
            <div className="text-xs mt-0.5">Hoàn thành</div>
          </button>
          <button
            onClick={() => setStatusFilter("cancelled")}
            className={`p-2 rounded-lg text-center transition-all ${
              statusFilter === "cancelled"
                ? "bg-red-600 text-white shadow-md"
                : "bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 cursor-pointer"
            }`}
          >
            <div className="text-sm font-bold">{stats.cancelled}</div>
            <div className="text-xs mt-0.5">Đã hủy</div>
          </button>
          <button
            onClick={() => setStatusFilter("cancel_request")}
            className={`p-2 rounded-lg text-center transition-all ${
              statusFilter === "cancel_request"
                ? "bg-gray-700 text-white shadow-md"
                : "bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 cursor-pointer"
            }`}
          >
            <div className="text-sm font-bold">{stats.cancel_request}</div>
            <div className="text-xs mt-0.5">Yêu cầu hủy</div>
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm theo mã đơn, tên khách hàng, SĐT..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
          </div>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 cursor-pointer"
          >
            <option value="today">Hôm nay</option>
            <option value="yesterday">Hôm qua</option>
            <option value="week">7 ngày qua</option>
            <option value="month">Tháng này</option>
            <option value="all">Tất cả</option>
          </select>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center">
            <MailOpen className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 text-lg">Không có đơn hàng nào</p>
          </div>
        ) : (
          filteredOrders.map((order) => (
            <div
              key={order._id}
              className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-all"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                {/* Order Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-lg">#{order.order_number}</h3>
                    {getStatusBadge(order.status)}
                    {order.status === "delivered" && (
                      <Badge className="bg-purple-100 text-purple-800 animate-pulse">
                        ⏳ Chờ xác nhận
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {formatDateTime(order.created_at)}
                    </p>
                    <p className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      {order.shipping_info?.recipient_name ||
                        order.shipping_info?.name}{" "}
                      - {order.shipping_info?.phone}
                    </p>
                    <p className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      {order.shipping_info?.address?.street ||
                        order.shipping_info?.address}
                      ,{" "}
                      {order.shipping_info?.address?.ward?.name ||
                        order.shipping_info?.address?.ward}
                      ,{" "}
                      {order.shipping_info?.address?.district?.name ||
                        order.shipping_info?.address?.district}
                    </p>
                    <p className="flex items-center gap-2">
                      <UtensilsCrossed className="w-4 h-4" />
                      {order.items?.length || 0} món -{" "}
                      <span className="font-bold text-gray-900">
                        {formatCurrency(order.total_amount)}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={() => navigate(`/manager/orders/${order._id}`)}
                    variant="outline"
                    className="w-full md:w-auto cursor-pointer"
                  >
                    Xem chi tiết
                  </Button>
                  {getAvailableActions(order.status).map((action) => (
                    <Button
                      key={action.status}
                      onClick={() =>
                        handleUpdateStatus(order._id, action.status)
                      }
                      disabled={updatingStatus}
                      variant={action.variant}
                      className="w-full md:w-auto cursor-pointer bg-gray-800 hover:bg-gray-900 text-white"
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}

        {/* Load More Indicator */}
        {hasMore && !loading && filteredOrders.length > 0 && (
          <div ref={loadMoreRef} className="flex justify-center py-8">
            {loadingMore ? (
              <div className="text-gray-600 text-sm">
                Đang tải thêm...
              </div>
            ) : (
              <div className="text-gray-400 text-sm">Cuộn xuống để tải thêm</div>
            )}
          </div>
        )}

        {/* End of list */}
        {!hasMore && filteredOrders.length > 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">
            Đã hiển thị tất cả đơn hàng
          </div>
        )}
      </div>
    </div>
  );
};

export default MaManageOrder;
