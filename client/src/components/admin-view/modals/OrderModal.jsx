import { Clock3, CreditCard, MapPin, Phone, Star, Store, Truck, UserCircle, X } from "lucide-react";

const formatCurrency = (value = 0) =>
  new Intl.NumberFormat("vi-VN").format(value || 0);

const formatDateTime = (value) => {
  if (!value) return "--";

  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour12: false,
  }).format(new Date(value));
};

const getItemPrice = (item) => item?.sale_price || item?.price || 0;

const getItemName = (item) =>
  item?.dish_name || item?.name || item?.dish_id?.name || "Sản phẩm";

const getItemImage = (item) =>
  item?.dish_image ||
  item?.image ||
  item?.images?.[0] ||
  item?.dish_id?.image ||
  item?.dish_id?.images?.[0];

const getItemUnit = (item) =>
  item?.unit || item?.unit_name || item?.unitName || "sản phẩm";

const getPaymentMethodText = (method) => {
  const methodMap = {
    cod: "Tiền mặt",
    bank_transfer: "Chuyển khoản",
    vnpay: "VNPay",
    momo: "MoMo",
    zalopay: "ZaloPay",
  };

  return methodMap[method] || method || "--";
};

const getPaymentStatusStampText = (status) =>
  status === "refunded" ? "Đã hoàn tiền" : "Đã thanh toán";

const getPaymentStatusText = (status) => {
  const statusMap = {
    paid: "Đã thanh toán",
    refunded: "Đã hoàn tiền",
    pending: "Chờ thanh toán",
    unpaid: "Chưa thanh toán",
  };

  return statusMap[status] || "Chưa thanh toán";
};

const getOrderStatusText = (status) => {
  const statusMap = {
    pending: "Chờ xác nhận",
    confirmed: "Đã xác nhận",
    processing: "Đang xử lý",
    shipped: "Đang giao",
    delivered: "Đã giao",
    completed: "Hoàn thành",
    cancelled: "Đã hủy",
    cancel_request: "Yêu cầu hủy",
  };

  return statusMap[status] || status || "--";
};

const getStatusClass = (status) => {
  const classMap = {
    pending: "border-amber-300 bg-amber-50 text-amber-600",
    confirmed: "border-sky-300 bg-sky-50 text-sky-600",
    processing: "border-purple-300 bg-purple-50 text-purple-600",
    shipped: "border-indigo-300 bg-indigo-50 text-indigo-600",
    delivered: "border-green-300 bg-green-50 text-green-600",
    completed: "border-green-300 bg-green-50 text-green-600",
    cancelled: "border-red-300 bg-red-50 text-red-600",
    cancel_request: "border-orange-300 bg-orange-50 text-orange-600",
  };

  return classMap[status] || "border-gray-300 bg-gray-50 text-gray-600";
};

const getAddressPart = (value) =>
  value && typeof value === "object" ? value.name : value;

const getShippingAddress = (shippingInfo = {}) =>
  shippingInfo.full_address ||
  [
    shippingInfo.address,
    shippingInfo.street,
    getAddressPart(shippingInfo.ward),
    getAddressPart(shippingInfo.district),
    getAddressPart(shippingInfo.province),
  ]
    .filter(Boolean)
    .join(", ");

const getDineInCustomer = (order) => {
  const customer = order?.customer_id;
  return customer && typeof customer === "object" ? customer : null;
};

const getCustomerName = (order) =>
  getDineInCustomer(order)?.name ||
  order?.shipping_info?.name ||
  order?.user_id?.name ||
  "Khách vãng lai";

const getCustomerPhone = (order) =>
  getDineInCustomer(order)?.phone ||
  order?.shipping_info?.phone ||
  order?.user_id?.phone ||
  "";

const getTableName = (order) =>
  order?.table_info?.name || order?.table_id?.name || "--";

const OrderModal = ({ open, onClose, order }) => {
  if (!open || !order) return null;

  const items = order.items || [];
  const isDineIn = order.order_type === "dine_in" || order.order_channel === "dine-in";
  const isPaid =
    order.status === "completed" ||
    order.payment_status === "paid" ||
    order.payment_status === "refunded";
  const subtotal =
    order.subtotal ??
    items.reduce(
      (sum, item) => sum + getItemPrice(item) * (item.quantity || 0),
      0,
    );
  const totalAmount = order.total_amount || 0;
  const earnedPoint = Math.floor(totalAmount / 10);
  const customerName = getCustomerName(order);
  const customerPhone = getCustomerPhone(order);
  const shippingAddress = getShippingAddress(order.shipping_info);

  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-4"
      onClick={handleBackdropClick}
    >
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
          <div className="pointer-events-none absolute right-12 top-4 hidden h-40 w-40 rotate-[-16deg] items-center justify-center rounded-full border-[8px] border-[#34ad54]/45 text-[#34ad54]/55 md:flex">
            <div className="h-24 w-24 rounded-full border border-[#34ad54]/45" />
            <div className="absolute rounded-lg border border-[#34ad54]/45 px-4 py-2 text-lg font-black">
              {getPaymentStatusStampText(order.payment_status)}
            </div>
          </div>
        )}

        <h2 className="mb-8 text-center text-2xl font-black text-[#06183a]">
          Chi tiết đơn hàng
        </h2>

        <div className="grid grid-cols-[50px_80px_1.2fr_1fr_1fr_1.1fr_1.1fr] items-center border-b border-gray-200 pb-4 text-base font-black text-black">
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
              const image = getItemImage(item);

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
                        alt={getItemName(item)}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-gray-100" />
                    )}
                  </div>
                  <div className="max-w-[280px] font-black leading-snug">
                    {getItemName(item)}
                  </div>
                  <div className="text-center">{getItemUnit(item)}</div>
                  <div className="text-center">{item.quantity || 0}</div>
                  <div className="text-right">{formatCurrency(price)} VND</div>
                  <div className="text-right">
                    {formatCurrency(price * (item.quantity || 0))} VND
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

        <div className="mt-4 space-y-5 text-base font-black">
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Điểm:</span>
            <span className="inline-flex items-center gap-3 text-[#06183a]">
              <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
              {formatCurrency(earnedPoint)}
            </span>
          </div>

          {!isDineIn && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Tạm tính:</span>
                <span className="text-[#06183a]">
                  {formatCurrency(subtotal)} VND
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Phí vận chuyển:</span>
                <span className="text-[#06183a]">
                  {formatCurrency(order.shipping_fee || 0)} VND
                </span>
              </div>
              {(order.freeship_value || 0) > 0 && (
                <div className="flex items-center justify-between text-green-600">
                  <span>Giảm phí vận chuyển:</span>
                  <span>-{formatCurrency(order.freeship_value)} VND</span>
                </div>
              )}
              {(order.discount_value || 0) > 0 && (
                <div className="flex items-center justify-between text-orange-600">
                  <span>Voucher giảm giá:</span>
                  <span>-{formatCurrency(order.discount_value)} VND</span>
                </div>
              )}
              {(order.coin_discount || 0) > 0 && (
                <div className="flex items-center justify-between text-yellow-600">
                  <span>Giảm giá từ xu:</span>
                  <span>-{formatCurrency(order.coin_discount)} VND</span>
                </div>
              )}
            </>
          )}

          <div className="flex items-center justify-between">
            <span className="text-gray-500">Thành tiền:</span>
            <span className="text-[#06183a]">
              {formatCurrency(totalAmount)} VND
            </span>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-xl border border-gray-100 shadow-sm">
          <div className="grid grid-cols-[1fr_auto] gap-y-6 px-8 py-6 text-base font-black text-black">
            {isDineIn && (
              <>
                <div>Bàn:</div>
                <div className="text-right">{getTableName(order)}</div>
              </>
            )}

            <div>Khách hàng:</div>
            <div className="inline-flex items-center justify-center rounded-full bg-[#34ad54] px-4 py-1.5 text-sm font-black text-white">
              <UserCircle className="mr-2 h-4 w-4" />
              {customerName}
            </div>

            {customerPhone && (
              <>
                <div>Số điện thoại:</div>
                <div className="inline-flex items-center justify-center rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-sm font-black text-emerald-600">
                  <Phone className="mr-2 h-4 w-4" />
                  {customerPhone}
                </div>
              </>
            )}

            <div>Thời gian tạo đơn:</div>
            <div className="inline-flex items-center justify-center rounded-full border border-sky-300 bg-sky-50 px-3 py-1.5 text-sm font-black text-sky-500">
              <Clock3 className="mr-2 h-4 w-4" />
              {formatDateTime(order.created_at)}
            </div>

            {!isDineIn && (
              <>
                <div>Trạng thái đơn:</div>
                <div
                  className={`inline-flex items-center justify-center rounded-full border px-3 py-1.5 text-sm font-black ${getStatusClass(order.status)}`}
                >
                  {getOrderStatusText(order.status)}
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-2 border-t border-dashed border-gray-200 px-8 py-4 text-base font-black text-black">
            <div>Phương thức thanh toán:</div>
            <div className="justify-self-end text-right">
              {getPaymentMethodText(order.payment_method)}
            </div>
          </div>

          {!isDineIn && (
            <>
              <div className="grid grid-cols-2 gap-y-5 border-t border-dashed border-gray-200 px-8 py-5 text-base font-black text-black">
                <div className="inline-flex items-center">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Trạng thái thanh toán:
                </div>
                <div className="justify-self-end text-right">
                  {getPaymentStatusText(order.payment_status)}
                </div>

                <div className="inline-flex items-center">
                  <Store className="mr-2 h-4 w-4" />
                  Chi nhánh:
                </div>
                <div className="justify-self-end text-right">
                  {order.branch_info?.name || "--"}
                </div>

                <div className="inline-flex items-center">
                  <Truck className="mr-2 h-4 w-4" />
                  Đơn vị vận chuyển:
                </div>
                <div className="justify-self-end text-right">
                  {(order.shipping_provider || "GHN").toUpperCase()}
                </div>
              </div>

              <div className="border-t border-dashed border-gray-200 px-8 py-5">
                <div className="rounded-xl bg-gray-50 px-5 py-4 text-sm font-bold leading-relaxed text-gray-700">
                  <div className="mb-2 flex items-center font-black text-black">
                    <MapPin className="mr-2 h-4 w-4" />
                    Thông tin giao hàng
                  </div>
                  <div>
                    <span className="font-black">Người nhận: </span>
                    {order.shipping_info?.name || "--"}
                    {order.shipping_info?.phone ? ` - ${order.shipping_info.phone}` : ""}
                  </div>
                  <div className="mt-1">
                    <span className="font-black">Địa chỉ: </span>
                    {shippingAddress || "--"}
                  </div>
                  {order.tracking_number && (
                    <div className="mt-1">
                      <span className="font-black">Mã vận đơn: </span>
                      {order.tracking_number}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {order.notes && (
          <div className="mt-6 rounded-xl bg-yellow-50 px-5 py-4 text-sm text-gray-700">
            <span className="font-black text-black">Ghi chú: </span>
            <span className="italic">{order.notes}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderModal;
