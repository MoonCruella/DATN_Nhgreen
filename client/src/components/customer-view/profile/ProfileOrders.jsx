import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { useSelector, useDispatch } from "react-redux";
import { useParams, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import orderApi from "@/api/orderApi";
import { toast } from "sonner";
import OrdersList from "@/components/customer-view/orders/OrdersList";
import OrderDetailPanel from "@/components/customer-view/orders/OrderDetailPanel";
import RatingDialog from "@/components/customer-view/ratings/RatingDialog";
import ViewRatingsDialog from "@/components/customer-view/ratings/ViewRatingDialog";
import CancelOrderDialog from "@/components/customer-view/orders/CancelOrderDialog";
import BanDialog from "@/components/common/BanDialog";
import { logoutUser } from "@/store/auth-slice";

const ProfileOrders = () => {
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const accessToken = useSelector((state) => state.auth.accessToken);
  const { orderId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [socket, setSocket] = useState(null);

  const searchInputRef = useRef(null);
  const observerTarget = useRef(null);

  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [viewRatingsDialogOpen, setViewRatingsDialogOpen] = useState(false);
  const [editingRating, setEditingRating] = useState(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState(null);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [banInfo, setBanInfo] = useState(null);

  const searchedOrders = useMemo(() => {
    if (!searchTerm.trim()) {
      return orders;
    }

    const searchLower = searchTerm.toLowerCase().trim();

    return orders.filter((order) => {
      const hasMatchingProduct = order.items?.some((item) =>
        item.product_id?.name?.toLowerCase().includes(searchLower)
      );

      const matchesOrderNumber = order.order_number
        ?.toLowerCase()
        .includes(searchLower);

      return hasMatchingProduct || matchesOrderNumber;
    });
  }, [orders, searchTerm]);

  const loadOrders = useCallback(
    async (pageNum = 1, append = false) => {
      if (!accessToken) return;

      try {
        if (append) {
          setIsLoadingMore(true);
        } else {
          setIsLoading(true);
        }

        const params = {
          status: filter === "all" ? undefined : filter,
          page: pageNum,
          limit: 10,
          sort: "created_at",
          order: "desc",
        };

        const response = await orderApi.getUserOrders(accessToken, params);

        if (response.success) {
          const fetchedOrders = response.data.orders || [];
          const totalPages = response.data.pagination?.total_pages || 1;

          if (append) {
            setOrders((prev) => [...prev, ...fetchedOrders]);
          } else {
            setOrders(fetchedOrders);
          }

          setHasMore(pageNum < totalPages);
        } else {
          toast.error(response.message || "Không thể tải danh sách đơn hàng");
        }
      } catch (error) {
        console.error("Load orders error:", error);
        toast.error(error.message || "Có lỗi xảy ra khi tải đơn hàng");
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [accessToken, filter]
  );

  // Initialize Socket.IO for real-time order updates
  useEffect(() => {
    if (!accessToken || !user?._id) return;

    const newSocket = io(
      import.meta.env.VITE_API_BASE_URL,
      {
        auth: { token: accessToken },
        transports: ["websocket", "polling"],
      }
    );

    newSocket.on("connect", () => {
      // Socket connected
    });

    newSocket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
    });

    // Listen for order status updates
    newSocket.on("order_status_updated", (data) => {
      setOrders((prev) => {
        const updated = prev.map((order) => {
          if (order._id === data.order_id) {
            return { ...order, status: data.status, ...data.updates };
          }
          return order;
        });
        return updated;
      });

      // Show toast notification based on status
      const statusMessages = {
        confirmed: `Đơn hàng #${data.order_number} đã được xác nhận`,
        processing: `Đơn hàng #${data.order_number} đang được chuẩn bị`,
        shipped: `Đơn hàng #${data.order_number} đang được giao`,
        delivered: `Đơn hàng #${data.order_number} đã được giao đến bạn`,
        completed: `Đơn hàng #${data.order_number} đã hoàn thành`,
        cancelled: `Đơn hàng #${data.order_number} đã bị hủy`,
      };

      if (statusMessages[data.status]) {
        toast.info(statusMessages[data.status]);
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.off("order_status_updated");
      newSocket.disconnect();
    };
  }, [accessToken, user?._id]);

  // Reset and load first page when filter/search changes
  useEffect(() => {
    if (!orderId && isAuthenticated && user && accessToken) {
      setPage(1);
      setOrders([]);
      setSearchTerm("");
      setHasMore(true);
      loadOrders(1, false);
    }
  }, [orderId, isAuthenticated, user, accessToken, filter, loadOrders]);

  // Infinite scroll observer
  useEffect(() => {
    if (orderId) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasMore &&
          !isLoading &&
          !isLoadingMore
        ) {
          const nextPage = page + 1;
          setPage(nextPage);
          loadOrders(nextPage, true);
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, isLoading, isLoadingMore, page, loadOrders]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setSearchTerm("");
    setPage(1);
    setOrders([]);
  };

  const handleCancelOrder = async (orderId, isRequest = false) => {
    const order = orders.find((o) => o._id === orderId);
    if (!order) return;

    // Nếu là hủy trực tiếp (pending/confirmed)
    if (!isRequest && ["pending", "confirmed"].includes(order.status)) {
      // Hủy trực tiếp không cần dialog
      try {
        const response = await orderApi.cancelOrder(
          accessToken,
          orderId,
          "Khách hàng hủy đơn hàng"
        );

        if (response.success) {
          // Check if user got banned after canceling
          if (response.data?.user_banned) {
            setBanInfo({
              banned_until: response.data.banned_until,
              reason: "cancel_order",
            });
            setBanDialogOpen(true);
            return;
          }

          toast.success("Đã hủy đơn hàng thành công");
          setPage(1);
          setOrders([]);
          loadOrders(1, false);
        } else {
          toast.error(response.message || "Không thể hủy đơn hàng");
        }
      } catch (error) {
        console.error("Cancel order error:", error);

        // Check if error response contains ban info
        if (error.response?.data?.user_banned) {
          setBanInfo({
            banned_until: error.response.data.banned_until,
            reason: "cancel_order",
          });
          setBanDialogOpen(true);
          return;
        }

        toast.error(
          error?.response?.data?.message ||
            error?.message ||
            "Có lỗi xảy ra khi hủy đơn hàng"
        );
      }
      return;
    }

    // Nếu là yêu cầu hủy (processing) - mở dialog chọn lý do
    if (isRequest && order.status === "processing") {
      // Kiểm tra xem yêu cầu hủy đã bị từ chối trước đó chưa
      if (order.cancel_request_rejected) {
        toast.error(
          "Yêu cầu hủy đơn hàng của bạn đã bị từ chối. Vui lòng liên hệ shop để được hỗ trợ."
        );
        return;
      }

      setOrderToCancel(order);
      setCancelDialogOpen(true);
      return;
    }

    toast.error("Đơn hàng này không thể hủy");
  };

  const handleConfirmCancel = async (orderId, reason) => {
    try {
      const response = await orderApi.cancelOrder(accessToken, orderId, reason);

      if (response.success) {
        // Check if user got banned after canceling
        if (response.data?.user_banned) {
          setBanInfo({
            banned_until: response.data.banned_until,
            reason: "cancel_order",
          });
          setBanDialogOpen(true);
          return;
        }

        toast.success("Yêu cầu hủy đơn hàng đã được gửi");
        setPage(1);
        setOrders([]);
        loadOrders(1, false);
      } else {
        toast.error(response.message || "Không thể gửi yêu cầu hủy đơn hàng");
      }
    } catch (error) {
      console.error("Cancel order error:", error);

      // Check if error response contains ban info
      if (error.response?.data?.user_banned) {
        setBanInfo({
          banned_until: error.response.data.banned_until,
          reason: "cancel_order",
        });
        setBanDialogOpen(true);
        return;
      }

      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Có lỗi xảy ra khi gửi yêu cầu hủy đơn hàng"
      );
    }
  };

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate("/auth/login");
  };

  const handleCloseCancelDialog = () => {
    setCancelDialogOpen(false);
    setOrderToCancel(null);
  };

  const handleConfirmReceived = async (orderId) => {
    if (!window.confirm("Bạn xác nhận đã nhận được hàng?")) {
      return;
    }

    try {
      const response = await orderApi.confirmReceived(accessToken, orderId);

      if (response.success) {
        toast.success("Xác nhận nhận hàng thành công");
        setPage(1);
        setOrders([]);
        loadOrders(1, false);
      } else {
        toast.error(response.message || "Không thể xác nhận nhận hàng");
      }
    } catch (error) {
      console.error("Confirm received error:", error);
      toast.error(error.message || "Có lỗi xảy ra khi xác nhận nhận hàng");
    }
  };

  const handleReportNotReceived = async (orderId) => {
    if (
      !window.confirm(
        "Bạn xác nhận CHƯA nhận được hàng? Chúng tôi sẽ thông báo cho cửa hàng để xử lý."
      )
    ) {
      return;
    }

    try {
      const response = await orderApi.reportNotReceived(accessToken, orderId);

      if (response.success) {
        toast.success("Đã ghi nhận và thông báo cho cửa hàng");
        setPage(1);
        setOrders([]);
        loadOrders(1, false);
      } else {
        toast.error(response.message || "Không thể gửi báo cáo");
      }
    } catch (error) {
      console.error("Report not received error:", error);
      toast.error(error.message || "Có lỗi xảy ra khi gửi báo cáo");
    }
  };

  const handleReorder = async (orderId) => {
    try {
      // Tìm order trong danh sách hiện tại
      const order = orders.find((o) => o._id === orderId);

      if (!order) {
        toast.error("Không tìm thấy đơn hàng");
        return;
      }

      // Chuẩn bị dữ liệu items để checkout với cấu trúc giống cart item
      const checkoutItems = order.items.map((item) => {
        // Lấy thông tin từ item (order items có cấu trúc: dish_id, dish_name, dish_image, price, quantity)
        const dishId = item.dish_id?._id || item.dish_id;
        const itemName = item.dish_name || item.name;
        const itemPrice = item.price;
        const itemImage = item.dish_image || item.image;

        return {
          _id: `reorder_${dishId}_${Date.now()}_${Math.random()}`, // Tạo ID tạm duy nhất
          dish_id: {
            _id: dishId,
            name: itemName,
            price: itemPrice,
            sale_price: itemPrice,
            imageUrls: itemImage ? [itemImage] : [],
            defaultImageIndex: 0,
          },
          quantity: item.quantity,
          note: item.note || "",
        };
      });

      // Chuyển đến trang checkout với state
      navigate("/checkout", {
        state: {
          fromReorder: true,
          items: checkoutItems,
          branch_id: order.branch_id._id || order.branch_id,
        },
      });

      toast.success("Đang chuyển đến trang thanh toán");
    } catch (error) {
      console.error("Reorder error:", error);
      toast.error(error.message || "Có lỗi xảy ra khi đặt lại đơn hàng");
    }
  };

  const handleViewDetail = (id) => {
    navigate(`/my-account/orders/${id}`);
  };

  const handleCloseDetail = () => {
    navigate("/my-account/orders");
  };

  const handleRateOrder = (order) => {
    setEditingRating(null);
    setSelectedOrder(order);
    setRatingDialogOpen(true);
  };

  const handleViewRatings = (order) => {
    setSelectedOrder(order);
    setViewRatingsDialogOpen(true);
  };

  const handleEditRating = (order, rating) => {
    setEditingRating(rating);
    setSelectedOrder(order);
    setRatingDialogOpen(true);
  };

  const handleRatingSubmitted = () => {
    setPage(1);
    setOrders([]);
    loadOrders(1, false);
    setEditingRating(null);
  };

  const handleCloseRatingDialog = () => {
    setRatingDialogOpen(false);
    setSelectedOrder(null);
    setEditingRating(null);
  };

  const handleCloseViewRatings = () => {
    setViewRatingsDialogOpen(false);
    setSelectedOrder(null);
    setEditingRating(null);
  };

  if (orderId) {
    return (
      <div className="bg-white rounded-2xl shadow-md overflow-hidden">
        <OrderDetailPanel orderId={orderId} onClose={handleCloseDetail} />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-md p-8">
      <div className="mb-6 pb-6 border-b">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Đơn Hàng Của Tôi
        </h2>
        <p className="text-gray-600">Quản lý và theo dõi đơn hàng của bạn</p>
      </div>

      <div className="mb-6">
        <div className="relative">
          <input
            ref={searchInputRef}
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Tìm kiếm theo mã đơn hàng hoặc tên sản phẩm..."
            className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
          />
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          {searchTerm && (
            <button
              onClick={handleClearSearch}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
        {searchTerm && (
          <p className="text-sm text-gray-500 mt-2">
            Tìm thấy {searchedOrders.length} đơn hàng
          </p>
        )}
      </div>

      <div className="mb-6 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          <button
            onClick={() => handleFilterChange("all")}
            className={`px-6 py-2.5 rounded-lg font-medium transition whitespace-nowrap cursor-pointer ${
              filter === "all"
                ? "bg-green-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Tất cả
          </button>
          <button
            onClick={() => handleFilterChange("pending")}
            className={`px-6 py-2.5 rounded-lg font-medium transition whitespace-nowrap cursor-pointer ${
              filter === "pending"
                ? "bg-yellow-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Chờ xác nhận
          </button>
          <button
            onClick={() => handleFilterChange("confirmed")}
            className={`px-6 py-2.5 rounded-lg font-medium transition whitespace-nowrap cursor-pointer ${
              filter === "confirmed"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Đã xác nhận
          </button>
          <button
            onClick={() => handleFilterChange("processing")}
            className={`px-6 py-2.5 rounded-lg font-medium transition whitespace-nowrap cursor-pointer ${
              filter === "processing"
                ? "bg-purple-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Đang xử lý
          </button>
          <button
            onClick={() => handleFilterChange("shipped")}
            className={`px-6 py-2.5 rounded-lg font-medium transition whitespace-nowrap cursor-pointer ${
              filter === "shipped"
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Đang giao
          </button>
          <button
            onClick={() => handleFilterChange("delivered")}
            className={`px-6 py-2.5 rounded-lg font-medium transition whitespace-nowrap cursor-pointer ${
              filter === "delivered"
                ? "bg-green-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Đã giao
          </button>
          <button
            onClick={() => handleFilterChange("completed")}
            className={`px-6 py-2.5 rounded-lg font-medium transition whitespace-nowrap cursor-pointer ${
              filter === "completed"
                ? "bg-teal-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Hoàn thành
          </button>
          <button
            onClick={() => handleFilterChange("cancel_request")}
            className={`px-6 py-2.5 rounded-lg font-medium transition whitespace-nowrap cursor-pointer ${
              filter === "cancel_request"
                ? "bg-orange-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Yêu cầu hủy
          </button>
          <button
            onClick={() => handleFilterChange("cancelled")}
            className={`px-6 py-2.5 rounded-lg font-medium transition whitespace-nowrap cursor-pointer ${
              filter === "cancelled"
                ? "bg-red-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Đã hủy
          </button>
        </div>
      </div>

      <OrdersList
        orders={searchedOrders}
        isLoading={isLoading}
        filter={filter}
        onCancelOrder={handleCancelOrder}
        onReorder={handleReorder}
        onViewDetail={handleViewDetail}
        onRateOrder={handleRateOrder}
        onViewRatings={handleViewRatings}
        onConfirmReceived={handleConfirmReceived}
        onReportNotReceived={handleReportNotReceived}
      />

      {/* Loading More Indicator */}
      {isLoadingMore && (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {/* Intersection Observer Target */}
      {hasMore && !isLoading && !isLoadingMore && searchedOrders.length > 0 && (
        <div ref={observerTarget} className="h-10" />
      )}

      {/* End of list message */}
      {!hasMore && searchedOrders.length > 0 && (
        <div className="text-center py-6 text-gray-500 text-sm">
          Đã hiển thị tất cả đơn hàng
        </div>
      )}

      {!isLoading && searchedOrders.length === 0 && (
        <div className="text-center py-16">
          <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
            <svg
              className="w-12 h-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">
            Chưa có đơn hàng nào
          </h3>
          <p className="text-gray-600">
            {searchTerm
              ? "Không tìm thấy đơn hàng nào phù hợp"
              : "Bạn chưa có đơn hàng nào"}
          </p>
        </div>
      )}

      <RatingDialog
        open={ratingDialogOpen}
        onClose={handleCloseRatingDialog}
        order={selectedOrder}
        accessToken={accessToken}
        onRatingSubmitted={handleRatingSubmitted}
        editingRating={editingRating}
        onEditRating={handleEditRating}
      />

      <ViewRatingsDialog
        open={viewRatingsDialogOpen}
        onClose={handleCloseViewRatings}
        order={selectedOrder}
        accessToken={accessToken}
        onEditRating={handleEditRating}
      />

      <CancelOrderDialog
        open={cancelDialogOpen}
        onClose={handleCloseCancelDialog}
        order={orderToCancel}
        onConfirm={handleConfirmCancel}
      />

      <BanDialog
        open={banDialogOpen}
        onClose={() => setBanDialogOpen(false)}
        banInfo={banInfo}
        onLogout={handleLogout}
      />
    </div>
  );
};

export default ProfileOrders;
