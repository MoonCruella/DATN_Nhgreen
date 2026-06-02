import React, { useEffect, useState, useRef } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import orderApi from "@/api/orderApi";
import {
  ArrowLeft,
  Printer,
  AlertTriangle,
  Clock,
  CheckCircle,
} from "lucide-react";
import PrintableBill from "@/components/manager-view/PrintableBill";

const MaOrderDetail = () => {
  const navigate = useNavigate();
  const { orderId } = useParams();
  const accessToken = useSelector((state) => state.auth.accessToken);
  const user = useSelector((state) => state.auth.user);
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const branchId = user?.branch_id;

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const printRef = useRef();

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

  // In hóa đơn kiểu bill nhiệt 80mm
  const handlePrintBill = () => {
    if (!printRef.current) return;

    // Tạo cửa sổ in mới
    const printWindow = window.open("", "_blank", "width=800,height=600");

    printWindow.document.write(`
      <html>
        <head>
          <title>Hóa đơn #${order.order_number}</title>
          <style>
            @media print {
              @page {
                size: 80mm auto;
                margin: 0;
              }
              body {
                margin: 0;
                padding: 0;
              }
            }
            
            body {
              font-family: 'Courier New', monospace;
              font-size: 11px;
              line-height: 1.4;
              color: #000;
              background: #fff;
              width: 80mm;
              margin: 0 auto;
              padding: 5mm;
            }
            
            .header {
              text-align: center;
              margin-bottom: 10px;
              border-bottom: 1px dashed #000;
              padding-bottom: 10px;
            }
            
            .header h2 {
              margin: 0 0 5px 0;
              font-size: 16px;
              font-weight: bold;
              text-transform: uppercase;
            }
            
            .header p {
              margin: 2px 0;
              font-size: 10px;
            }
            
            .info {
              margin: 10px 0;
              font-size: 10px;
            }
            
            .info-row {
              display: flex;
              justify-content: space-between;
              margin: 3px 0;
            }
            
            .divider {
              border-top: 1px dashed #000;
              margin: 10px 0;
            }
            
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 10px 0;
            }
            
            th {
              text-align: left;
              font-weight: bold;
              border-bottom: 1px solid #000;
              padding: 5px 0;
              font-size: 10px;
            }
            
            td {
              padding: 5px 0;
              font-size: 10px;
              vertical-align: top;
            }
            
            .item-name {
              width: 50%;
            }
            
            .item-qty {
              width: 15%;
              text-align: center;
            }
            
            .item-price {
              width: 35%;
              text-align: right;
            }
            
            .summary {
              margin-top: 10px;
              border-top: 1px solid #000;
              padding-top: 10px;
            }
            
            .summary-row {
              display: flex;
              justify-content: space-between;
              margin: 5px 0;
              font-size: 10px;
            }
            
            .summary-row.total {
              font-weight: bold;
              font-size: 12px;
              border-top: 1px solid #000;
              padding-top: 8px;
              margin-top: 8px;
            }
            
            .footer {
              text-align: center;
              margin-top: 15px;
              padding-top: 10px;
              border-top: 1px dashed #000;
              font-size: 10px;
            }
            
            .footer p {
              margin: 3px 0;
            }
          </style>
        </head>
        <body>
          ${printRef.current.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();

    // Đợi load xong rồi in
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    };
  };

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
  }, [isAuthenticated, accessToken, user, branchId, navigate]);

  // Fetch order detail
  useEffect(() => {
    const fetchOrderDetail = async () => {
      if (!accessToken || !orderId) return;

      try {
        setLoading(true);
        const response = await orderApi.getOrderById(accessToken, orderId);

        if (response.success) {
          console.log("Order data:", response.data);
          setOrder(response.data.order);
        }
      } catch (error) {
        console.error("Error fetching order detail:", error);
        const errorMessage =
          error.response?.data?.message ||
          error.message ||
          "Lỗi tải thông tin đơn hàng";
        toast.error(errorMessage);
        navigate("/manager/orders");
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetail();
  }, [accessToken, orderId, navigate]);

  // Update order status
  const handleUpdateStatus = async (newStatus) => {
    try {
      setUpdatingStatus(true);
      const response = await orderApi.updateOrderStatus(
        accessToken,
        orderId,
        newStatus
      );

      if (response.success) {
        toast.success("Cập nhật trạng thái thành công");

        // Reload order detail from server to get latest data
        const orderResponse = await orderApi.getOrderById(accessToken, orderId);
        if (orderResponse.success) {
          setOrder(orderResponse.data.order);
        }
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
      payment: {
        label: "Đã thanh toán",
        className: "bg-green-100 text-green-800",
      },
      confirmed: {
        label: "Đã xác nhận",
        className: "bg-green-100 text-green-800",
      },
      processing: {
        label: "Đang chuẩn bị",
        className: "bg-green-100 text-green-800",
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
      <Badge className={`${config.className} font-medium text-base px-3 py-1`}>
        {config.label}
      </Badge>
    );
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải thông tin đơn hàng...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Không tìm thấy đơn hàng</p>
          <Button
            onClick={() => navigate("/manager/orders")}
            className="mt-4 cursor-pointer"
          >
            Quay lại danh sách
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Button
            onClick={() => navigate("/manager/orders")}
            variant="ghost"
            className="cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-800">
              Chi tiết đơn hàng #{order.order_number}
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Đặt hàng lúc {formatDateTime(order.created_at)}
            </p>
          </div>
          {getStatusBadge(order.status)}
        </div>

        {/* Action Buttons và Nút in hóa đơn */}
        {getAvailableActions(order.status).length > 0 && (
          <div className="mb-4 ml-14 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                Cập nhật trạng thái
              </h3>
              <div className="flex gap-3">
                {getAvailableActions(order.status).map((action) => (
                  <Button
                    key={action.status}
                    onClick={() => handleUpdateStatus(action.status)}
                    disabled={updatingStatus}
                    className="cursor-pointer bg-green-600 hover:bg-green-700 text-white"
                  >
                    {updatingStatus ? "Đang cập nhật..." : action.label}
                  </Button>
                ))}
              </div>
            </div>
            <Button
              onClick={handlePrintBill}
              className="bg-green-700 hover:bg-green-800 text-white print:hidden cursor-pointer"
            >
              <Printer className="w-4 h-4 mr-2" />
              In hóa đơn
            </Button>
          </div>
        )}

        {/* Nút in hóa đơn khi không có action buttons */}
        {getAvailableActions(order.status).length === 0 && (
          <div className="flex justify-end mb-4">
            <Button
              onClick={handlePrintBill}
              className="bg-green-700 hover:bg-green-800 text-white print:hidden cursor-pointer"
            >
              <Printer className="w-4 h-4 mr-2" />
              In hóa đơn
            </Button>
          </div>
        )}

        {/* Cancel Request Alert */}
        {order.status === "cancel_request" && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-2 text-orange-800 mb-2">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
              <h3 className="font-semibold">Yêu cầu hủy đơn</h3>
            </div>
            {order.cancel_requested_at && (
              <p className="text-xs text-orange-600 mb-2">
                Yêu cầu lúc: {formatDateTime(order.cancel_requested_at)}
              </p>
            )}
            <p className="text-sm text-orange-700 mb-3">
              Khách hàng đã gửi yêu cầu hủy đơn hàng. Vui lòng xem xét và xử lý.
            </p>
            {order.cancel_reason && (
              <div className="mb-3 p-3 bg-white rounded-lg border border-orange-200">
                <p className="text-xs text-gray-600 mb-1 font-medium">
                  Lý do hủy:
                </p>
                <p className="text-sm text-gray-800">{order.cancel_reason}</p>
              </div>
            )}
            <div className="flex gap-2">
              <Button
                onClick={() => handleUpdateStatus("cancelled")}
                disabled={updatingStatus}
                className="flex-1 cursor-pointer bg-red-600 hover:bg-red-700 text-white"
              >
                {updatingStatus ? "Đang xử lý..." : "Chấp nhận hủy đơn"}
              </Button>
              <Button
                onClick={() => handleUpdateStatus("processing")}
                disabled={updatingStatus}
                variant="outline"
                className="flex-1 cursor-pointer border-orange-300 text-orange-700 hover:bg-orange-100"
              >
                {updatingStatus ? "Đang xử lý..." : "Từ chối (Tiếp tục xử lý)"}
              </Button>
            </div>
          </div>
        )}

        {/* Delivered Status Alert */}
        {order.status === "delivered" && (
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-2 text-purple-800 mb-2">
              <Clock className="w-5 h-5" />
              <h3 className="font-semibold">Chờ xác nhận</h3>
            </div>
            <p className="text-sm text-purple-700">
              Đơn hàng đang chờ khách hàng xác nhận đã nhận được hàng. Sau 1 giờ
              nếu không có phản hồi, đơn hàng sẽ tự động hoàn thành.
            </p>
          </div>
        )}

        {/* Completed Status Alert */}
        {order.status === "completed" && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-2 text-green-800 mb-2">
              <CheckCircle className="w-5 h-5" />
              <h3 className="font-semibold">Đơn hàng hoàn thành</h3>
            </div>
            <p className="text-sm text-green-700">
              Khách hàng đã xác nhận nhận được hàng. Đơn hàng đã hoàn thành.
            </p>
            {order.completed_at && (
              <p className="text-xs text-green-600 mt-2">
                Hoàn thành lúc: {formatDateTime(order.completed_at)}
              </p>
            )}
          </div>
        )}

        {/* Status Timeline */}
        {order.history && order.history.length > 0 && (
          <div className="mt-6 border-t pt-6">
            <h3 className="font-semibold mb-6">Lịch sử đơn hàng</h3>
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
                    <div className="relative z-10 w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center mb-3 shadow-lg">
                      <span className="text-white font-bold">{index + 1}</span>
                    </div>

                    {/* Status info */}
                    <div className="text-center max-w-[150px]">
                      <div className="mb-2 flex justify-center">
                        {getStatusBadge(item.status)}
                      </div>
                      <p className="text-xs text-gray-600 font-medium">
                        {formatDateTime(item.date)}
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

      {/* Bill printable area - Hidden on screen, only for print */}
      <PrintableBill
        ref={printRef}
        order={order}
        formatCurrency={formatCurrency}
        formatDateTime={formatDateTime}
      />

      {/* Main content - visible on screen */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Order Items */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-semibold text-lg mb-4">Chi tiết món ăn</h3>
            <div className="space-y-3">
              {order.items?.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg"
                >
                  {item.dish_image && (
                    <img
                      src={item.dish_image}
                      alt={item.dish_name}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-lg">{item.dish_name}</p>
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
                            x {item.quantity}
                          </span>
                        </>
                      ) : (
                        // Hiển thị giá thường
                        <span>
                          {formatCurrency(item.price)} x {item.quantity}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="font-bold text-lg">
                    {formatCurrency(
                      (item.sale_price || item.price) * item.quantity
                    )}
                  </p>
                </div>
              ))}
            </div>

            {/* Note Section */}
            {order.notes && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-start gap-3">
                  <span className="text-sm text-gray-500 font-medium mt-3">
                    Ghi chú:
                  </span>
                  <div className="flex-1 text-sm text-gray-700 bg-yellow-50 p-3 rounded-lg italic">
                    {order.notes}
                  </div>
                </div>
              </div>
            )}

            {/* Summary */}
            <div className="border-t mt-6 pt-6">
              <div className="space-y-3 text-base">
                <div className="flex justify-between">
                  <span className="text-gray-600">Tạm tính:</span>
                  <span className="font-medium">
                    {formatCurrency(order.subtotal)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Phí giao hàng:</span>
                  <span className="font-medium">
                    {formatCurrency(order.shipping_fee)}
                  </span>
                </div>
                {order.freeship_value > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Miễn phí vận chuyển:</span>
                    <span className="font-medium">
                      -{formatCurrency(order.freeship_value)}
                    </span>
                  </div>
                )}
                {order.discount_value > 0 && (
                  <div className="flex justify-between text-orange-600">
                    <span>Voucher giảm giá:</span>
                    <span className="font-medium">
                      -{formatCurrency(order.discount_value)}
                    </span>
                  </div>
                )}
                {order.coin_discount > 0 && (
                  <div className="flex justify-between text-yellow-600">
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
                    <span className="font-medium">
                      -{formatCurrency(order.coin_discount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-xl font-bold border-t pt-3">
                  <span>TỔNG CỘNG:</span>
                  <span className="text-gray-900">
                    {formatCurrency(order.total_amount)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Cancel Reason */}
          {(order.status === "cancelled" ||
            order.status === "cancel_request") &&
            order.cancel_reason && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="font-semibold text-lg mb-3 text-red-600">
                  {order.status === "cancelled"
                    ? "Lý do hủy"
                    : "Lý do yêu cầu hủy"}
                </h3>
                <p className="text-gray-700 bg-red-50 p-4 rounded-lg">
                  {order.cancel_reason}
                </p>
              </div>
            )}
        </div>

        {/* Right Column - Customer Info & Actions */}
        <div className="space-y-6">
          {/* Customer Info */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-semibold text-lg mb-4">Thông tin khách hàng</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Tên người nhận</p>
                <p className="font-medium">{order.shipping_info?.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Số điện thoại</p>
                <p className="font-medium">{order.shipping_info?.phone}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Địa chỉ giao hàng</p>
                <p className="font-medium">
                  {order.shipping_info?.address}
                  {order.shipping_info?.ward && `, ${order.shipping_info.ward}`}
                  {order.shipping_info?.district &&
                    `, ${order.shipping_info.district}`}
                  {order.shipping_info?.province &&
                    `, ${order.shipping_info.province}`}
                </p>
              </div>
            </div>
          </div>

          {/* Payment Info */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-semibold text-lg mb-4">Thông tin thanh toán</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Phương thức</p>
                <p className="font-medium">
                  {order.payment_method === "vnpay"
                    ? "VNPay"
                    : order.payment_method === "momo"
                    ? "MoMo"
                    : order.payment_method === "zalopay"
                    ? "ZaloPay"
                    : "Thanh toán khi nhận hàng (COD)"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Trạng thái thanh toán</p>
                <p className="font-medium">
                  {order.payment_status === "paid" ? (
                    <span className="text-green-600">✓ Đã thanh toán</span>
                  ) : (
                    <span className="text-yellow-600">⏳ Chưa thanh toán</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaOrderDetail;


