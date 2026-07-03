import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import orderApi from "@/api/orderApi";
import supportChatApi from "@/api/supportChatApi";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import {
  MapPin,
  Store,
  ArrowLeft,
  AlertTriangle,
  MessageCircle,
} from "lucide-react";

const OrderDetailPanel = ({ orderId, onClose }) => {
  const { accessToken, user } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [socket, setSocket] = useState(null);
  const [creatingChat, setCreatingChat] = useState(false);

  const getAddressPart = (value) =>
    value && typeof value === "object" ? value.name : value;

  const getShippingAddress = (shippingInfo = {}) =>
    shippingInfo.full_address ||
    [
      shippingInfo.address,
      getAddressPart(shippingInfo.ward),
      getAddressPart(shippingInfo.district),
      getAddressPart(shippingInfo.province),
    ]
      .filter(Boolean)
      .join(", ");

  const handleChatWithBranch = async () => {
    if (!order?.branch_info?.manager_id) {
      toast.error("Không tìm thấy quản lý chi nhánh");
      return;
    }

    try {
      setCreatingChat(true);
      const response = await supportChatApi.startConversation(accessToken, {
        userId: order.branch_info.manager_id,
      });

      if (response.success) {
        toast.success("Mở cuộc trò chuyện với chi nhánh");
        navigate(`/chat?conversation=${response.data.conversationId}`);
      }
    } catch (error) {
      console.error("Error creating chat:", error);
      toast.error("Không thể tạo cuộc trò chuyện");
    } finally {
      setCreatingChat(false);
    }
  };

  useEffect(() => {
    const loadOrderDetail = async () => {
      try {
        setIsLoading(true);
        const response = await orderApi.getOrderById(accessToken, orderId);
        if (response.success) {
          setOrder(response.data.order);
          console.log("Loaded order detail:", response.data.order);
        } else {
          toast.error("Không thể tải chi tiết đơn hàng");
        }
      } catch (error) {
        console.error("Load order detail error:", error);
        toast.error("Có lỗi xảy ra");
      } finally {
        setIsLoading(false);
      }
    };

    if (orderId && accessToken) {
      loadOrderDetail();
    }
  }, [orderId, accessToken]);

  // Socket.IO for real-time updates
  useEffect(() => {
    if (!accessToken || !user?._id || !orderId) return;

    const newSocket = io(
      import.meta.env.VITE_API_BASE_URL,
      {
        auth: { token: accessToken },
        transports: ["websocket", "polling"],
      }
    );

    newSocket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
    });

    // Listen for order status updates
    newSocket.on("order_status_updated", async (data) => {
      if (data.order_id === orderId) {
        // Reload order detail để lấy history mới
        try {
          const response = await orderApi.getOrderById(accessToken, orderId);
          if (response.success) {
            setOrder(response.data.order);
          }
        } catch (error) {
          console.error("Error reloading order:", error);
          // Fallback: update only status and updates
          setOrder((prev) => ({
            ...prev,
            status: data.status,
            ...data.updates,
          }));
        }

        // Show toast notification
        const statusMessages = {
          confirmed: "Đơn hàng đã được xác nhận",
          processing: "Đơn hàng đang được chuẩn bị",
          shipped: "Đơn hàng đang được giao",
          delivered: "Đơn hàng đã được giao đến bạn",
          completed: "Đơn hàng đã hoàn thành",
          cancelled: "Đơn hàng đã bị hủy",
        };

        if (statusMessages[data.status]) {
          toast.info(statusMessages[data.status]);
        }
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.off("order_status_updated");
      newSocket.disconnect();
    };
  }, [accessToken, user?._id, orderId]);

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: {
        bg: "bg-yellow-100",
        text: "text-yellow-800",
        label: "Chờ xác nhận",
      },
      payment: {
        bg: "bg-green-100",
        text: "text-green-800",
        label: "Đã thanh toán",
      },
      hoan_tien: {
        bg: "bg-purple-100",
        text: "text-purple-800",
        label: "Đã hoàn tiền",
      },
      confirmed: {
        bg: "bg-blue-100",
        text: "text-blue-800",
        label: "Đã xác nhận",
      },
      processing: {
        bg: "bg-purple-100",
        text: "text-purple-800",
        label: "Đang xử lý",
      },
      shipped: {
        bg: "bg-orange-100",
        text: "text-orange-800",
        label: "Đang giao",
      },
      delivered: {
        bg: "bg-green-100",
        text: "text-green-800",
        label: "Đã giao",
      },
      completed: {
        bg: "bg-teal-100",
        text: "text-teal-800",
        label: "Hoàn thành",
      },
      cancelled: { bg: "bg-red-100", text: "text-red-800", label: "Đã hủy" },
      cancel_request: {
        bg: "bg-gray-100",
        text: "text-gray-800",
        label: "Yêu cầu hủy",
      },
    };

    const normalizedStatus = status === "refund" ? "hoan_tien" : status;
    const config = statusConfig[normalizedStatus] || {
      bg: "bg-gray-100",
      text: "text-gray-800",
      label: status,
    };

    return (
      <span
        className={`${config.bg} ${config.text} px-4 py-2 rounded-full text-base font-semibold`}
      >
        {config.label}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-[600px] flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Đang tải chi tiết đơn hàng...</p>
        </div>
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="min-h-[600px]">
      <div className="bg-gradient-to-r from-green-600 to-green-500 text-white p-6 mb-6 rounded-t-xl">
        <button
          onClick={onClose}
          className="flex items-center gap-2 px-4 py-2 mb-4 bg-white/20 hover:bg-white/30 rounded-lg transition cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium cursor-pointer">Quay lại danh sách</span>
        </button>
        <div>
          <h2 className="text-2xl font-bold mb-2">Chi tiết đơn hàng</h2>
          <p className="text-green-100">
            Mã đơn hàng: #{order.order_number || order._id?.slice(-8)}
          </p>
        </div>
      </div>

      <div className="px-6 pb-6 space-y-6">
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl p-6 shadow-md border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-800">
              Trạng thái đơn hàng
            </h3>
            {getStatusBadge(order.status)}
          </div>

          {/* Cancel Rejected Alert */}
          {order.cancel_request_rejected && order.status === "processing" && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-red-800 mb-1">
                    Yêu cầu hủy đơn đã bị từ chối
                  </p>
                  <p className="text-sm text-red-600 mb-2">
                    Nhà hàng đã từ chối yêu cầu hủy của bạn và tiếp tục xử lý
                    đơn hàng. Bạn không thể yêu cầu hủy đơn này nữa.
                  </p>
                  {order.cancel_reason && (
                    <div className="mt-2 p-2 bg-white rounded border border-red-200">
                      <p className="text-xs text-gray-600 mb-1">
                        Lý do bạn đã yêu cầu hủy:
                      </p>
                      <p className="text-sm text-gray-800">
                        {order.cancel_reason}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Ngày đặt hàng</p>
              <p className="font-semibold text-gray-800">
                {formatDate(order.created_at)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">
                Phương thức thanh toán
              </p>
              <p className="font-semibold text-gray-800">
                {order.payment_method === "cod"
                  ? "Thanh toán khi nhận hàng (COD)"
                  : order.payment_method === "vnpay"
                  ? "VNPay"
                  : order.payment_method === "momo"
                  ? "MoMo"
                  : order.payment_method === "zalopay"
                  ? "ZaloPay"
                  : "Khác"}
              </p>
            </div>
          </div>

          {/* Timeline */}
          {order.history && order.history.length > 0 && (
            <div className="mt-6 border-t pt-6">
              <h3 className="font-semibold text-gray-800 mb-6">
                Lịch sử đơn hàng
              </h3>
              <div className="relative">
                {/* Horizontal line */}
                <div className="absolute top-6 left-0 right-0 h-0.5 bg-gray-200"></div>

                {/* Timeline items */}
                <div className="relative flex justify-between">
                  {order.history.map((item, index) => (
                    <div
                      key={index}
                      className="flex flex-col items-center"
                      style={{ flex: 1 }}
                    >
                      {/* Status dot */}
                      <div className="relative z-10 w-12 h-12 bg-green-600 rounded-full flex items-center justify-center mb-3 shadow-lg">
                        <span className="text-white font-bold">
                          {index + 1}
                        </span>
                      </div>

                      {/* Status info */}
                      <div className="text-center max-w-[150px]">
                        <div className="mb-2 flex justify-center">
                          {getStatusBadge(item.status)}
                        </div>
                        <p className="text-xs text-gray-600 font-medium">
                          {formatDate(item.date)}
                        </p>
                        {item.note && (
                          <p className="text-xs text-gray-500 mt-1 italic">
                            {item.note}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4">
            Thông tin giao hàng
          </h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-28 text-sm text-gray-500 font-medium">
                Người nhận:
              </div>
              <div className="flex-1 font-semibold text-gray-800">
                {order.shipping_info?.name}
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-28 text-sm text-gray-500 font-medium">
                Điện thoại:
              </div>
              <div className="flex-1 font-semibold text-gray-800">
                {order.shipping_info?.phone}
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-28 text-sm text-gray-500 font-medium">
                Địa chỉ:
              </div>
              <div className="flex-1 font-semibold text-gray-800">
                {getShippingAddress(order.shipping_info)}
              </div>
            </div>
            {order.note && (
              <div className="flex items-start gap-3 pt-3 border-t">
                <div className="w-28 text-sm text-gray-500 font-medium">
                  Ghi chú:
                </div>
                <div className="flex-1 italic text-gray-700 bg-yellow-50 p-3 rounded-lg">
                  {order.note}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4">
            Sản phẩm đã đặt ({order.items?.length || 0} món)
          </h3>
          {/* Branch info */}
          {order.branch_info && (
            <div className="mb-4 p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-start gap-3 mb-2">
                <Store className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-gray-800 mb-1">
                    {order.branch_info.name}
                  </p>
                  <div className="flex items-start gap-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <p>{order.branch_info.address?.street}, </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {order.items?.map((item, index) => (
              <div
                key={index}
                onClick={() => {
                  if (item.dish_id) {
                    navigate(`/products/${item.dish_id}`);
                  }
                }}
                className="flex gap-4 items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 hover:shadow-md transition cursor-pointer"
              >
                <img
                  src={item.dish_image || "/placeholder.jpg"}
                  alt={item.dish_name}
                  className="w-20 h-20 object-cover rounded-lg shadow-sm"
                  onError={(e) => {
                    e.target.src = "/placeholder.jpg";
                  }}
                />
                <div className="flex-1">
                  <p className="font-bold text-gray-800 mb-1 hover:text-green-600 transition">
                    {item.dish_name}
                  </p>
                  <div className="text-sm text-gray-600">
                    {item.sale_price && item.sale_price < item.price ? (
                      // Hiển thị giá gốc gạch đi và giá sale
                      <>
                        <span className="line-through text-gray-400 mr-2">
                          {formatCurrency(item.price)}
                        </span>
                        <span className="text-green-600 font-semibold">
                          {formatCurrency(item.sale_price)}
                        </span>
                        <span className="text-gray-600">
                          {" "}
                          × {item.quantity}
                        </span>
                      </>
                    ) : (
                      // Hiển thị giá thường
                      <span>
                        {formatCurrency(item.price)} × {item.quantity}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600 text-lg">
                    {formatCurrency(
                      (item.sale_price || item.price) * item.quantity
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Note Section */}
          {order.notes && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-start gap-3">
                <div className="text-sm text-gray-500 font-medium mt-3">
                  Ghi chú:
                </div>
                <div className="flex-1 text-sm text-gray-700 bg-yellow-50 p-3 rounded-lg italic">
                  {order.notes}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 shadow-md border border-green-200">
          <h3 className="text-lg font-bold text-gray-800 mb-4">
            Tổng kết đơn hàng
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center text-base">
              <span className="text-gray-700">Tạm tính:</span>
              <span className="font-semibold text-gray-800">
                {formatCurrency(order.subtotal || 0)}
              </span>
            </div>

            <div className="flex justify-between items-center text-base">
              <span className="text-gray-700">Phí vận chuyển:</span>
              <span className="font-semibold text-gray-800">
                {formatCurrency(order.shipping_fee || 0)}
              </span>
            </div>

            {order.freeship_value > 0 && (
              <div className="flex justify-between items-center text-base text-green-700">
                <span>Miễn phí vận chuyển:</span>
                <span className="font-semibold">
                  -{formatCurrency(order.freeship_value)}
                </span>
              </div>
            )}

            {order.discount_value > 0 && (
              <div className="flex justify-between items-center text-base text-green-700">
                <span>Giảm giá voucher:</span>
                <span className="font-semibold">
                  -{formatCurrency(order.discount_value)}
                </span>
              </div>
            )}

            {order.coin_discount > 0 && (
              <div className="flex justify-between items-center text-base text-yellow-700">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" fill="#FFD700" />
                    <circle
                      cx="12"
                      cy="12"
                      r="8"
                      fill="#FFA500"
                      opacity="0.5"
                    />
                    <text
                      x="12"
                      y="16"
                      fontSize="12"
                      fontWeight="bold"
                      textAnchor="middle"
                      fill="#B8860B"
                    >
                      ₫
                    </text>
                  </svg>
                  <span>Sử dụng xu:</span>
                </div>
                <span className="font-semibold">
                  -{formatCurrency(order.coin_discount)}
                </span>
              </div>
            )}

            <div className="border-t-2 border-green-300 pt-3 flex justify-between items-center">
              <span className="text-lg font-bold text-gray-800">
                Tổng cộng:
              </span>
              <span className="text-2xl font-bold text-green-600">
                {formatCurrency(order.total_amount)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailPanel;
