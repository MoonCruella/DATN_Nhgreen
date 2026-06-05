import { Clock3, Star, UserCircle, X } from "lucide-react";

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

const getItemPrice = (item) => item?.sale_price || item?.price || 0;

const getPaymentMethodText = (method) => {
  const methods = {
    cod: "Tiền mặt",
    bank_transfer: "Chuyển khoản",
    vnpay: "VNPay",
    momo: "MoMo",
    zalopay: "ZaloPay",
  };

  return methods[method] || "Tiền mặt";
};

const getTextValue = (value) =>
  typeof value === "string" ? value.trim() : value;

const getDineInCustomer = (order) => {
  const customer = order?.customer_id;
  return customer && typeof customer === "object" ? customer : null;
};

const getCustomerName = (order) => {
  const customer = getDineInCustomer(order);

  return (
    getTextValue(customer?.name) ||
    "Khách vãng lai"
  );
};

const getTableName = (order) =>
  order?.table_info?.name || order?.table_id?.name || "Bàn";

const DineInOrderDetailModal = ({
  open,
  order,
  onClose,
  onPrint,
  onPayment,
}) => {
  if (!open || !order) return null;

  const items = order.items || [];
  const totalAmount = order.total_amount || 0;
  const earnedPoint = Math.floor(totalAmount / 10);
  const isPaid =
    order.status === "completed" || order.payment_status === "paid";
  const isProcessing = order.status === "processing";

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 px-5 py-4">
      <div className="relative max-h-[calc(100vh-32px)] w-full max-w-[1100px] overflow-y-auto rounded-2xl bg-white px-14 pb-12 pt-12 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-md p-1 text-slate-900 hover:bg-gray-100"
          title="Đóng"
        >
          <X className="h-6 w-6" strokeWidth={2.5} />
        </button>

        {isPaid && (
          <div className="pointer-events-none absolute right-12 top-4 hidden h-40 w-40 rotate-[-16deg] items-center justify-center rounded-full border-[8px] border-[#34ad54]/45 text-[#34ad54]/45 md:flex">
            <div className="h-24 w-24 rounded-full border-[1px] border-[#34ad54]/45" />
            <div className="absolute rounded-lg border-1 border-[#34ad54]/45 px-4 py-2 text-lg font-black">
              Đã thanh toán
            </div>
          </div>
        )}

        <h2 className="mb-8 text-center text-2xl font-black text-[#06183a]">
          Chi tiết đơn hàng
        </h2>

        <div className="grid grid-cols-[50px_80px_1.2fr_1fr_1fr_1.1fr_1.1fr] items-center border-b border-gray-200 pb-4 text-base font-bold text-black">
          <div>STT</div>
          <div>Hình</div>
          <div>Tên sản phẩm</div>
          <div className="text-center">Đơn vị</div>
          <div className="text-center">Số lượng</div>
          <div className="text-right">Đơn giá</div>
          <div className="text-right">Thành tiền</div>
        </div>

        <div className="max-h-[225px] overflow-y-auto border-b border-dashed border-gray-200">
          {items.length > 0 ? (
            items.map((item, index) => {
              const price = getItemPrice(item);
              const image = item.dish_image || item.image || item.images?.[0];

              return (
                <div
                  key={item._id || item.dish_id || index}
                  className="grid min-h-[75px] grid-cols-[50px_80px_1.2fr_1fr_1fr_1.1fr_1.1fr] items-center text-base font-medium text-slate-950"
                >
                  <div>{index + 1}</div>
                  <div>
                    {image ? (
                      <img
                        src={image}
                        alt={item.dish_name || "Sản phẩm"}
                        className="h-12 w-12 rounded-md object-cover"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-md bg-gray-100" />
                    )}
                  </div>
                  <div className="font-bold">{item.dish_name}</div>
                  <div className="text-center">{item.unit || "Phần"}</div>
                  <div className="text-center">{item.quantity}</div>
                  <div className="text-right">{formatCurrency(price)} VND</div>
                  <div className="text-right">
                    {formatCurrency(price * item.quantity)} VND
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-10 text-center text-lg font-bold text-gray-500">
              Chưa có món trong đơn hàng
            </div>
          )}
        </div>

        <div className="mt-4 space-y-5 text-base font-bold">
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Điểm:</span>
            <span className="inline-flex items-center gap-2 text-[#06183a]">
              <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
              {formatCurrency(earnedPoint)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-gray-500">Thành tiền:</span>
            <span className="text-[#06183a]">
              {formatCurrency(totalAmount)} VND
            </span>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-xl border border-gray-100 shadow-sm">
          <div className="grid grid-cols-[1fr_auto] gap-y-6 px-8 py-6 text-base font-bold text-black">
            <div>Bàn:</div>
            <div className="text-right">{getTableName(order)}</div>

            <div>Khách hàng:</div>
            <div className="inline-flex items-center justify-center rounded-full bg-[#34ad54] px-4 py-1.5 text-sm font-bold text-white">
              <UserCircle className="mr-2 h-4 w-4" />
              {getCustomerName(order)}
            </div>

            <div>Thời gian tạo đơn:</div>
            <div className="inline-flex items-center justify-center rounded-full border border-sky-300 bg-sky-50 px-3 py-1.5 text-sm font-bold text-sky-500">
              <Clock3 className="mr-2 h-4 w-4" />
              {formatDateTime(order.created_at)}
            </div>
          </div>

          <div className="grid grid-cols-[1fr_auto] border-t border-dashed border-gray-200 px-8 py-4 text-base font-bold text-black">
            <div>Phương thức thanh toán:</div>
            <div>
              {isPaid ? getPaymentMethodText(order.payment_method) : "--"}
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onPrint}
            className="flex-1 h-11 rounded-lg border border-green-500 text-base font-bold text-green-600 transition hover:bg-green-50"
          >
            In đơn hàng
          </button>
          {isProcessing && (
            <button
              type="button"
              onClick={onPayment}
              className="flex-1 h-11 rounded-lg bg-[#34ad54] text-base font-bold text-white transition hover:bg-[#2f9b45]"
            >
              Thanh toán
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DineInOrderDetailModal;


