import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Banknote,
  CreditCard,
  QrCode,
  Smartphone,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

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

const PAYMENT_METHODS = [
  { value: "cod", label: "Tiền mặt", icon: Banknote },
  { value: "momo", label: "QR-Momo", icon: QrCode },
  { value: "vnpay", label: "VPPay", icon: CreditCard },
  { value: "zalopay", label: "ZaloPay", icon: Smartphone },
];

const CASH_PRESETS = [50000, 100000, 200000, 500000, 1000000];

const PaymentMethodModal = ({
  open,
  table,
  order,
  items = [],
  totalQuantity = 0,
  totalAmount = 0,
  onBack,
  onConfirm,
}) => {
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [cashReceived, setCashReceived] = useState(totalAmount);

  useEffect(() => {
    if (!open) return;
    setPaymentMethod("cod");
    setCashReceived(totalAmount);
  }, [open, totalAmount]);

  const cashChange = Math.max(cashReceived - totalAmount, 0);
  const orderCode = getOrderCode(order);
  const tableName = table?.name || order?.table_info?.name || "Bàn";
  const selectedMethod = PAYMENT_METHODS.find(
    (method) => method.value === paymentMethod,
  );

  const qrUrl = useMemo(
    () =>
      `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=12&data=${encodeURIComponent(
        `${paymentMethod.toUpperCase()}|${orderCode}|${totalAmount}`,
      )}`,
    [orderCode, paymentMethod, totalAmount],
  );

  if (!open) return null;

  return (
    <div className="fixed bottom-0 right-0 left-[280px] top-[65px] z-[80] overflow-y-auto bg-[#f7f7f8] px-6 py-4 text-slate-950">
      <button
        type="button"
        onClick={onBack}
        className="mb-5 inline-flex items-center gap-3 text-xl font-bold text-slate-950 transition hover:text-[#26338d]"
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
                  className={`flex h-14 items-center justify-center gap-2 border-gray-200 text-base font-bold transition md:border-r md:last:border-r-0 ${
                    active
                      ? "bg-[#26338d] text-white"
                      : "bg-white text-cyan-500 hover:bg-cyan-50"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {method.label}
                </button>
              );
            })}
          </div>

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
                <span>Thời gian tạo đơn:</span>
                <span className="rounded-full border border-sky-300 bg-sky-50 px-3 py-1.5 text-sm text-sky-500">
                  {getOrderTime(order)}
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
              <span className="text-3xl text-[#26338d]">
                {formatMoneyInput(totalAmount)}
              </span>
            </div>
          </div>

          {paymentMethod === "cod" ? (
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
                    className="h-10 rounded-full border border-[#26338d] px-6 text-base font-bold text-[#26338d] transition hover:bg-[#26338d] hover:text-white"
                  >
                    {formatCurrency(amount)}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="mt-7 rounded-2xl bg-white p-6 shadow-sm">
              <div className="flex flex-col items-center gap-4 text-center">
                <img
                  src={qrUrl}
                  alt={`${paymentMethod} QR`}
                  className="h-40 w-40 rounded-xl border border-gray-200 bg-white p-2"
                />
                <div>
                  <div className="text-lg font-bold">
                    Quét mã để thanh toán bằng {selectedMethod?.label || "QR"}
                  </div>
                  <div className="mt-2 text-sm font-medium text-gray-500">
                    Sau khi khách thanh toán thành công, nhấn xác nhận thanh
                    toán.
                  </div>
                </div>
              </div>
            </div>
          )}

          <Button
            type="button"
            onClick={() => onConfirm?.(paymentMethod)}
            disabled={
              totalQuantity === 0 ||
              (paymentMethod === "cod" && cashReceived < totalAmount)
            }
            className="mt-8 h-14 w-full rounded-lg bg-[#26338d] text-lg font-bold text-white hover:bg-[#1d2874] disabled:cursor-not-allowed disabled:bg-[#a8afd0]"
          >
            Xác nhận thanh toán
          </Button>
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
              <span>Ngày:</span>
              <span className="text-right">{getOrderDate(order)}</span>
              <span>Bàn:</span>
              <span className="text-right">{tableName}</span>
              <span>Thời gian:</span>
              <span className="text-right">{getOrderTime(order)}</span>
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

          <Button
            type="button"
            className="mx-auto mt-7 flex h-12 w-72 rounded-lg bg-[#26338d] text-base font-bold text-white hover:bg-[#1d2874]"
          >
            In đơn để thanh toán
          </Button>
        </aside>
      </div>
    </div>
  );
};

export default PaymentMethodModal;
