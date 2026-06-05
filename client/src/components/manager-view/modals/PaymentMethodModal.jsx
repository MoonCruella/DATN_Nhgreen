import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Banknote,
  Clock3,
  Copy,
  CreditCard,
  QrCode,
  Smartphone,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { assets } from "@/assets/assets";

const formatCurrency = (value = 0) =>
  new Intl.NumberFormat("vi-VN").format(value || 0);

const formatMoneyInput = (value = 0) => `${formatCurrency(value)} VND`;

const parseMoneyInput = (value) =>
  Number(String(value).replace(/\D/g, "")) || 0;

const getDishPrice = (dish) => dish?.sale_price || dish?.price || 0;

const getDishName = (dish) => dish?.name || dish?.dish_name || "Sản phẩm";

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
  const date = order?.created_at ? new Date(order.created_at) : new Date();

  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
};

const getOrderDateTime = (order) => {
  const date = order?.created_at ? new Date(order.created_at) : new Date();

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
};

const getTextValue = (value) =>
  typeof value === "string" ? value.trim() : value;

const getDineInCustomer = (order, selectedCustomer) => {
  if (selectedCustomer?._id) return selectedCustomer;

  const customer = order?.customer_id;
  return customer && typeof customer === "object" ? customer : null;
};

const PAYMENT_METHODS = [
  { value: "cod", label: "Tiền mặt", icon: Banknote },
  { value: "momo", label: "QR-Momo", icon: QrCode },
  { value: "zalopay", label: "ZaloPay", icon: Smartphone },
  { value: "vnpay", label: "Pay by link", icon: CreditCard },
];

const getPaymentTabClass = (methodValue, active) => {
  if (!active) {
    if (methodValue === "momo") {
      return "bg-white text-[#a50064] hover:bg-[#fff5fb]";
    }
    if (methodValue === "zalopay") {
      return "bg-white text-[#0068ff] hover:bg-[#f3f8ff]";
    }
    if (methodValue === "vnpay") {
      return "bg-white text-[#25358f] hover:bg-blue-50";
    }
    return "bg-white text-green-600 hover:bg-green-50";
  }

  if (methodValue === "momo") return "bg-[#a50064] text-white";
  if (methodValue === "zalopay") return "bg-[#0068ff] text-white";
  if (methodValue === "vnpay") return "bg-[#25358f] text-white";
  return "bg-[#34ad54] text-white";
};

const CASH_PRESETS = [50000, 100000, 200000, 500000, 1000000];
const QR_TTL_MS = 15 * 60 * 1000;

const formatCountdown = (milliseconds = 0) => {
  const totalSeconds = Math.max(Math.ceil(milliseconds / 1000), 0);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
};

const PaymentMethodModal = ({
  open,
  table,
  order,
  selectedCustomer = null,
  items = [],
  totalQuantity = 0,
  totalAmount = 0,
  onBack,
  onConfirm,
  momoQrUrl = "",
  momoQrCreatedAt = null,
  momoLoading = false,
  momoError = "",
  onRequestMomoPayment,
  zalopayQrUrl = "",
  zalopayQrCreatedAt = null,
  zalopayLoading = false,
  zalopayError = "",
  onRequestZalopayPayment,
  vnpayPaymentUrl = "",
  vnpayLoading = false,
  vnpayError = "",
  onRequestVnpayPayment,
}) => {
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [cashReceived, setCashReceived] = useState(totalAmount);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!open) return;
    setPaymentMethod("cod");
    setCashReceived(totalAmount);
  }, [open, totalAmount]);

  useEffect(() => {
    if (!open || paymentMethod !== "momo") return;
    onRequestMomoPayment?.();
  }, [open, paymentMethod, onRequestMomoPayment]);

  useEffect(() => {
    if (!open || paymentMethod !== "zalopay") return;
    onRequestZalopayPayment?.();
  }, [open, paymentMethod, onRequestZalopayPayment]);

  useEffect(() => {
    if (!open || paymentMethod !== "vnpay") return;
    onRequestVnpayPayment?.();
  }, [open, paymentMethod, onRequestVnpayPayment]);

  useEffect(() => {
    if (!open || !["momo", "zalopay"].includes(paymentMethod)) return undefined;

    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [open, paymentMethod, momoQrCreatedAt, zalopayQrCreatedAt]);

  const isGatewayPayment = ["momo", "zalopay"].includes(paymentMethod);
  const isAutoPayment = ["momo", "zalopay", "vnpay"].includes(paymentMethod);
  const cashChange = Math.max(cashReceived - totalAmount, 0);
  const orderCode = getOrderCode(order);
  const tableName = table?.name || order?.table_info?.name || "Bàn";
  const dineInCustomer = getDineInCustomer(order, selectedCustomer);
  const customerName =
    getTextValue(dineInCustomer?.name) ||
    "Khách vãng lai";
  const customerPhone =
    getTextValue(dineInCustomer?.phone) || "";
  const gatewayQrUrl = paymentMethod === "momo" ? momoQrUrl : zalopayQrUrl;
  const gatewayQrCreatedAt =
    paymentMethod === "momo" ? momoQrCreatedAt : zalopayQrCreatedAt;
  const gatewayLoading =
    (paymentMethod === "momo" && momoLoading) ||
    (paymentMethod === "zalopay" && zalopayLoading);
  const gatewayError = paymentMethod === "momo" ? momoError : zalopayError;
  const gatewayQrFrameClass =
    paymentMethod === "momo"
      ? "border-[#a50064]"
      : "border-[#0068ff]";
  const gatewayLogo =
    paymentMethod === "momo" ? assets.momo_icon : assets.zalo_pay;
  const gatewayRemainingMs = gatewayQrCreatedAt
    ? Math.max(QR_TTL_MS - (now - Number(gatewayQrCreatedAt)), 0)
    : 0;
  const gatewayQrExpired = Boolean(
    gatewayQrUrl && gatewayQrCreatedAt && gatewayRemainingMs <= 0,
  );
  const handleRefreshGatewayQr = () => {
    if (paymentMethod === "momo") {
      onRequestMomoPayment?.(true);
      return;
    }

    if (paymentMethod === "zalopay") {
      onRequestZalopayPayment?.(true);
    }
  };

  const vnpayQrUrl = vnpayPaymentUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&data=${encodeURIComponent(
        vnpayPaymentUrl,
      )}`
    : "";

  const handleRefreshVnpayLink = () => {
    onRequestVnpayPayment?.(true);
  };

  const handleCopyVnpayLink = async () => {
    if (!vnpayPaymentUrl) return;

    try {
      await navigator.clipboard.writeText(vnpayPaymentUrl);
    } catch {
      const input = document.createElement("input");
      input.value = vnpayPaymentUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed bottom-0 left-[280px] right-0 top-[65px] z-[80] overflow-y-auto bg-[#f7f7f8] px-6 py-4 text-slate-950">
      <button
        type="button"
        onClick={onBack}
        className="mb-5 inline-flex items-center gap-3 text-xl font-bold text-slate-950 transition hover:text-[#34ad54]"
      >
        <ArrowLeft className="h-7 w-7" />
        Quay lại
      </button>

      <div className="mx-auto grid max-w-[1360px] grid-cols-1 justify-center gap-12 xl:grid-cols-[minmax(0,760px)_360px] xl:gap-16 2xl:gap-28">
        <section className="min-w-0">
          <div className="grid overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm md:grid-cols-4">
            {PAYMENT_METHODS.map((method) => {
              const Icon = method.icon;
              const active = paymentMethod === method.value;

              return (
                <button
                  key={method.value}
                  type="button"
                  onClick={() => setPaymentMethod(method.value)}
                  className={`flex h-14 items-center justify-center gap-2 border-gray-200 text-base font-bold transition md:border-r md:last:border-r-0 ${getPaymentTabClass(
                    method.value,
                    active,
                  )}`}
                >
                  <Icon className="h-4 w-4" />
                  {method.label}
                </button>
              );
            })}
          </div>

          {isGatewayPayment && (
            <div className="mt-7 p-5">
              <div className="flex flex-col items-center">
                {gatewayLoading ? (
                  <div className="flex h-56 w-56 items-center justify-center rounded-xl border border-gray-200 bg-white p-2 text-sm font-bold text-gray-500">
                    Đang tạo QR...
                  </div>
                ) : gatewayQrExpired ? (
                  <div className="flex h-56 w-56 items-center justify-center rounded-xl border border-red-200 bg-red-50 p-3 text-center text-sm font-bold text-red-500">
                    QR đã hết hạn
                  </div>
                ) : gatewayQrUrl ? (
                  <div
                    className={`relative rounded-2xl border-[3px] bg-white p-3 ${gatewayQrFrameClass}`}
                  >
                    <img
                      src={gatewayQrUrl}
                      alt={`${paymentMethod} QR`}
                      className="h-56 w-56 rounded-lg bg-white"
                    />
                    <div className="absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-lg bg-white p-1 shadow-sm">
                      <img
                        src={gatewayLogo}
                        alt=""
                        className="h-full w-full object-contain"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex h-56 w-56 items-center justify-center rounded-xl border border-gray-200 bg-white p-3 text-center text-sm font-bold text-gray-500">
                    {gatewayError || "Chưa có QR"}
                  </div>
                )}

                {gatewayQrUrl && gatewayQrCreatedAt && (
                  <div
                    className={`mt-4 text-sm font-black ${
                      gatewayQrExpired ? "text-red-500" : "text-slate-800"
                    }`}
                  >
                    {gatewayQrExpired
                      ? "QR đã hết hạn"
                      : `Còn hiệu lực ${formatCountdown(gatewayRemainingMs)}`}
                  </div>
                )}

                {gatewayError && (
                  <div className="mt-3 text-center text-sm font-bold text-red-500">
                    {gatewayError}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleRefreshGatewayQr}
                  disabled={gatewayLoading}
                  className="mt-4 h-10 rounded-lg border border-[#34ad54] bg-white px-5 text-sm font-bold text-[#34ad54] hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Tạo QR mới
                </button>
              </div>
            </div>
          )}

          {paymentMethod === "vnpay" && (
            <div className="mt-7 p-5">
              <div className="flex flex-col items-center">
                {vnpayLoading ? (
                  <div className="flex h-56 w-56 items-center justify-center rounded-xl border border-gray-200 bg-white p-2 text-sm font-bold text-gray-500">
                    Đang tạo link...
                  </div>
                ) : vnpayQrUrl ? (
                  <div className="relative rounded-2xl border-[3px] border-[#25358f] bg-white p-3">
                    <img
                      src={vnpayQrUrl}
                      alt="VNPay payment link QR"
                      className="h-56 w-56 rounded-lg bg-white"
                    />
                    <div className="absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-lg bg-white p-1 shadow-sm">
                      <img
                        src={assets.vnpay_icon}
                        alt=""
                        className="h-full w-full object-contain"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex h-56 w-56 items-center justify-center rounded-xl border border-gray-200 bg-white p-3 text-center text-sm font-bold text-gray-500">
                    {vnpayError || "Chưa có link VNPay"}
                  </div>
                )}

                {vnpayError && (
                  <div className="mt-3 text-center text-sm font-bold text-red-500">
                    {vnpayError}
                  </div>
                )}

                <div className="mt-5 flex w-full max-w-[560px] items-center gap-3 rounded-xl border-[6px] border-[#25358f] bg-white p-2">
                  <div className="min-w-0 flex-1 truncate px-4 text-sm font-semibold text-slate-700">
                    {vnpayPaymentUrl || "Đang chờ link thanh toán..."}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyVnpayLink}
                    disabled={!vnpayPaymentUrl}
                    className="flex h-11 shrink-0 items-center gap-2 rounded-lg bg-[#25358f] px-4 text-sm font-bold text-white hover:bg-[#1f2c79] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Copy className="h-4 w-4" />
                    Sao chép
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleRefreshVnpayLink}
                  disabled={vnpayLoading}
                  className="mt-4 h-10 rounded-lg border border-[#25358f] bg-white px-5 text-sm font-bold text-[#25358f] hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Tạo link mới
                </button>
              </div>
            </div>
          )}

          <div className="relative mt-8 rounded-2xl bg-white px-12 py-8 shadow-md">
            <div className="pointer-events-none absolute -left-6 top-1/2 h-12 w-12 -translate-y-1/2 rounded-full bg-[#f7f7f8]" />
            <div className="pointer-events-none absolute -right-6 top-1/2 h-12 w-12 -translate-y-1/2 rounded-full bg-[#f7f7f8]" />

            <div className="space-y-5 text-lg font-bold">
              <div className="flex items-center justify-between gap-5">
                <span>Mã hóa đơn:</span>
                <span>{orderCode}</span>
              </div>
              <div className="flex items-center justify-between gap-5">
                <span>Vị trí</span>
                <span>{tableName}</span>
              </div>
              <div className="flex items-center justify-between gap-5">
                <span>Khách hàng:</span>
                <span>{customerName}</span>
              </div>
              {customerPhone && (
                <div className="flex items-center justify-between gap-5">
                  <span>SĐT:</span>
                  <span>{customerPhone}</span>
                </div>
              )}
              <div className="flex items-center justify-between gap-5">
                <span>Thời gian tạo đơn:</span>
                <span className="inline-flex items-center justify-center rounded-full border border-sky-300 bg-sky-50 px-3 py-1.5 text-sm font-bold text-sky-500">
                  <Clock3 className="mr-2 h-4 w-4" />
                  {getOrderDateTime(order)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-5">
                <span>Điểm:</span>
                <span>{formatCurrency(Math.floor(totalAmount / 10))}</span>
              </div>
              <div className="flex items-center justify-between gap-5">
                <span>Thành tiền:</span>
                <span>{formatMoneyInput(totalAmount)}</span>
              </div>
            </div>

            <div className="my-8 border-t border-dashed border-gray-400" />

            <div className="flex items-center justify-between text-xl font-bold">
              <span>Tổng cộng</span>
              <span className="text-3xl text-[#34ad54]">
                {formatMoneyInput(totalAmount)}
              </span>
            </div>
          </div>

          {paymentMethod === "cod" && (
            <>
              <div className="mt-7 grid grid-cols-1 gap-5 md:grid-cols-2">
                <label className="block">
                  <span className="text-base font-bold">Số tiền nhận</span>
                  <div className="mt-2 flex h-12 items-center rounded-lg border border-gray-200 bg-white px-4 shadow-sm">
                    <input
                      value={formatMoneyInput(cashReceived)}
                      onChange={(event) =>
                        setCashReceived(parseMoneyInput(event.target.value))
                      }
                      className="min-w-0 flex-1 bg-transparent text-base font-medium outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setCashReceived(0)}
                      className="ml-3 rounded-full bg-gray-100 p-1 text-gray-700 hover:bg-gray-200"
                      title="Xóa"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </label>

                <label className="block">
                  <span className="text-base font-bold">
                    Tiền thừa trả khách
                  </span>
                  <div className="mt-2 flex h-12 items-center rounded-lg bg-gray-200 px-5 text-base font-bold text-slate-400">
                    {formatMoneyInput(cashChange)}
                  </div>
                </label>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                {CASH_PRESETS.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => setCashReceived(amount)}
                    className="h-10 rounded-full border border-[#34ad54] px-6 text-base font-bold text-[#34ad54] transition hover:bg-[#34ad54] hover:text-white"
                  >
                    {formatCurrency(amount)}
                  </button>
                ))}
              </div>
            </>
          )}

          {!isAutoPayment && (
            <Button
              type="button"
              onClick={() => onConfirm?.(paymentMethod)}
              disabled={
                totalQuantity === 0 ||
                (paymentMethod === "cod" && cashReceived < totalAmount)
              }
              className="mt-8 h-14 w-full rounded-lg bg-[#34ad54] text-lg font-bold text-white hover:bg-[#2f9b45] disabled:cursor-not-allowed disabled:bg-[#bbf7d0]"
            >
              Xác nhận thanh toán
            </Button>
          )}
        </section>

        <aside>
          <div className="rounded-2xl bg-white px-6 py-6 shadow-md">
            <h3 className="text-center text-lg font-black">NHGREEN</h3>
            <p className="mt-4 text-xs font-medium">
              Địa chỉ Công ty/ Doanh nghiệp: tỉnh Sơn La, Việt Nam
            </p>

            <h4 className="mt-7 text-center text-xl font-black">
              HÓA ĐƠN BÁN HÀNG
            </h4>

            <div className="mt-6 grid grid-cols-2 gap-y-3 text-xs font-bold">
              <span>Mã hóa đơn:</span>
              <span className="text-right">{orderCode}</span>
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
              <span>Trạng thái hóa đơn:</span>
              <span className="text-right">Chưa thanh toán</span>
            </div>

            <div className="mt-6 grid grid-cols-[36px_1.2fr_52px_72px_82px] border-b border-gray-400 pb-3 text-xs font-bold">
              <div>STT</div>
              <div>Tên sản phẩm</div>
              <div className="text-center">Số lượng</div>
              <div className="text-right">Đơn giá</div>
              <div className="text-right">Thành tiền</div>
            </div>

            <div className="max-h-48 overflow-y-auto">
              {items.map((item, index) => {
                const price = getDishPrice(item);

                return (
                  <div
                    key={item._id || index}
                    className="grid grid-cols-[36px_1.2fr_52px_72px_82px] py-4 text-xs font-medium"
                  >
                    <div>{index + 1}</div>
                    <div className="font-bold">{getDishName(item)}</div>
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
        </aside>
      </div>
    </div>
  );
};

export default PaymentMethodModal;
