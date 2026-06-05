import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import orderApi from "@/api/orderApi";

const formatCurrency = (value = 0) =>
  new Intl.NumberFormat("vi-VN").format(value || 0);

const formatMoneyInput = (value = 0) => `${formatCurrency(value)} VND`;

const getOrderCode = (order) =>
  order?.order_number ||
  order?.code ||
  order?._id?.slice(-6)?.toUpperCase() ||
  "----";

const getOrderDate = (order) => {
  const date = order?.created_at ? new Date(order.created_at) : new Date();

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

const getOrderTime = (order) => {
  const date = order?.completed_at || order?.payment_date || order?.created_at
    ? new Date(order.completed_at || order.payment_date || order.created_at)
    : new Date();

  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
};

const getOrderDateTime = (order) => {
  const date = order?.completed_at || order?.payment_date || order?.created_at
    ? new Date(order.completed_at || order.payment_date || order.created_at)
    : new Date();

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
};

const getPaymentMethodLabel = (method) => {
  if (method === "momo") return "MoMo";
  if (method === "zalopay") return "ZaloPay";
  if (method === "vnpay") return "VNPay";
  if (method === "bank_transfer") return "Chuyển khoản";
  return "Tiền mặt";
};

const getItemPrice = (item) => item?.sale_price || item?.price || 0;

const getItemName = (item) => item?.dish_name || item?.name || "Sản phẩm";

const getTextValue = (value) =>
  typeof value === "string" ? value.trim() : value;

const getDineInCustomer = (order) => {
  const customer = order?.customer_id;
  return customer && typeof customer === "object" ? customer : null;
};

const MaDineInBill = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const accessToken = useSelector((state) => state.auth.accessToken);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken || !orderId) return;

    const fetchOrder = async () => {
      try {
        setLoading(true);
        const response = await orderApi.getOrderById(accessToken, orderId);
        setOrder(response?.data?.order || null);
      } catch (error) {
        toast.error(
          error?.response?.data?.message || "Không thể tải hóa đơn",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [accessToken, orderId]);

  const totalAmount = order?.total_amount || 0;
  const tableName = order?.table_info?.name || "Bàn";
  const dineInCustomer = getDineInCustomer(order);
  const customerName =
    getTextValue(dineInCustomer?.name) ||
    "Khách vãng lai";
  const customerPhone =
    getTextValue(dineInCustomer?.phone) || "";
  const items = useMemo(() => order?.items || [], [order?.items]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <section className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-base font-bold text-gray-500">Đang tải hóa đơn...</div>
      </section>
    );
  }

  if (!order) {
    return (
      <section className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50">
        <div className="text-lg font-bold text-gray-700">Không tìm thấy hóa đơn</div>
        <Button
          type="button"
          onClick={() => navigate("/manager/tables")}
          className="bg-[#34ad54] text-white hover:bg-[#2f9b45]"
        >
          Trở về màn hình chính
        </Button>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-gray-50 px-4 py-8">
      <style>
        {`
          @media print {
            body * {
              visibility: hidden !important;
            }
            .bill-print-area,
            .bill-print-area * {
              visibility: visible !important;
            }
            .bill-print-area {
              position: fixed !important;
              inset: 0 auto auto 0 !important;
              width: 100% !important;
              max-width: none !important;
              box-shadow: none !important;
              border-radius: 0 !important;
              padding: 24px !important;
            }
            .print-hidden {
              display: none !important;
            }
          }
        `}
      </style>

      <div className="mx-auto w-full max-w-[440px]">
        <div className="bill-print-area rounded-2xl bg-white px-6 py-6 text-slate-950 shadow-xl">
          <h3 className="text-center text-lg font-black">NHGREEN</h3>
          <p className="mt-4 text-xs font-medium">
            Địa chỉ Công ty/ Doanh nghiệp: tỉnh Sơn La, Việt Nam
          </p>

          <h4 className="mt-7 text-center text-xl font-black">
            HÓA ĐƠN BÁN HÀNG
          </h4>

          <div className="mt-6 grid grid-cols-2 gap-y-3 text-xs font-bold">
            <span>Mã hóa đơn:</span>
            <span className="text-right">{getOrderCode(order)}</span>
            <span>Bàn:</span>
            <span className="text-right">{tableName}</span>
            <span>Khách hàng:</span>
            <span className="text-right">{customerName}</span>
            {customerPhone && (
              <>
                <span>SĐT:</span>
                <span className="text-right">{customerPhone}</span>
              </>
            )}
            <span>Thời gian:</span>
            <span className="text-right">{getOrderDateTime(order)}</span>
            <span>Thanh toán:</span>
            <span className="text-right">
              {getPaymentMethodLabel(order.payment_method)}
            </span>
            <span>Trạng thái:</span>
            <span className="text-right">Đã thanh toán</span>
          </div>

          <div className="mt-6 grid grid-cols-[36px_1.2fr_52px_72px_82px] border-b border-gray-400 pb-3 text-xs font-bold">
            <div>STT</div>
            <div>Tên sản phẩm</div>
            <div className="text-center">SL</div>
            <div className="text-right">Đơn giá</div>
            <div className="text-right">Thành tiền</div>
          </div>

          <div>
            {items.map((item, index) => {
              const price = getItemPrice(item);

              return (
                <div
                  key={item._id || index}
                  className="grid grid-cols-[36px_1.2fr_52px_72px_82px] py-4 text-xs font-medium"
                >
                  <div>{index + 1}</div>
                  <div className="font-bold">{getItemName(item)}</div>
                  <div className="text-center">{item.quantity}</div>
                  <div className="text-right">{formatCurrency(price)}</div>
                  <div className="text-right">
                    {formatCurrency(price * item.quantity)}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-3 border-t border-dashed border-gray-300 pt-5">
            <div className="flex items-center justify-between text-sm font-bold">
              <span>Tổng cộng:</span>
              <span>{formatMoneyInput(totalAmount)}</span>
            </div>
          </div>

          <div className="mt-6 border-t border-dashed border-gray-300 pt-6">
            <div className="flex items-center justify-between text-xl font-black">
              <span>Tổng tiền:</span>
              <span>{formatMoneyInput(totalAmount)}</span>
            </div>
            <p className="mt-7 text-center text-sm font-bold italic">
              NHGREEN xin chân thành cảm ơn!
            </p>
          </div>
        </div>

        <div className="print-hidden mt-6 grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/manager/tables")}
            className="h-12 rounded-lg border-[#34ad54] text-sm font-bold text-[#34ad54] hover:bg-green-50"
          >
            Trở về màn hình chính
          </Button>
          <Button
            type="button"
            onClick={handlePrint}
            className="h-12 rounded-lg bg-[#34ad54] text-sm font-bold text-white hover:bg-[#2f9b45]"
          >
            In đơn
          </Button>
        </div>
      </div>
    </section>
  );
};

export default MaDineInBill;
