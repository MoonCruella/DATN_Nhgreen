import React from "react";

const formatMoney = (value = 0) =>
  `${new Intl.NumberFormat("vi-VN").format(value || 0)} VND`;

const getTextValue = (value) =>
  typeof value === "string" ? value.trim() : value;

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

const getOrderCode = (order) =>
  order?.order_number ||
  order?.code ||
  order?._id?.slice(-6)?.toUpperCase() ||
  "----";

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

const getPaymentStatusLabel = (status) => {
  if (status === "paid") return "Đã thanh toán";
  if (status === "refunded") return "Đã hoàn tiền";
  if (status === "failed") return "Thanh toán lỗi";
  return "Chưa thanh toán";
};

const getItemPrice = (item) => item?.sale_price || item?.price || 0;

const getItemName = (item) => item?.dish_name || item?.name || "Sản phẩm";

const PrintableBill = React.forwardRef(({ order }, ref) => {
  const dineInCustomer =
    order.customer_id && typeof order.customer_id === "object"
      ? order.customer_id
      : null;
  const customerName =
    getTextValue(order.shipping_info?.name) ||
    getTextValue(dineInCustomer?.name) ||
    "Khách vãng lai";
  const customerPhone =
    getTextValue(order.shipping_info?.phone) ||
    getTextValue(dineInCustomer?.phone) ||
    "";
  const tableName = order?.table_info?.name || order?.table_id?.name || "";
  const shippingAddress = getShippingAddress(order.shipping_info);
  const isDineIn = order.order_type === "dine_in" || Boolean(tableName);
  const items = order.items || [];

  return (
    <div ref={ref} className="hidden">
      <div className="bill-card">
        <h3 className="bill-brand">NHGREEN</h3>
        <p className="bill-company">
          Địa chỉ Công ty/ Doanh nghiệp: tỉnh Sơn La, Việt Nam
        </p>

        <h4 className="bill-title">HÓA ĐƠN BÁN HÀNG</h4>

        <div className="bill-info-grid">
          <span>Mã hóa đơn:</span>
          <span className="bill-right">{getOrderCode(order)}</span>
          {isDineIn && (
            <>
              <span>Bàn:</span>
              <span className="bill-right">{tableName || "Bàn"}</span>
            </>
          )}
          <span>Khách hàng:</span>
          <span className="bill-right">{customerName}</span>
          {customerPhone && (
            <>
              <span>SĐT:</span>
              <span className="bill-right">{customerPhone}</span>
            </>
          )}
          <span>Thời gian:</span>
          <span className="bill-right">{getOrderDateTime(order)}</span>
          <span>Thanh toán:</span>
          <span className="bill-right">
            {getPaymentMethodLabel(order.payment_method)}
          </span>
          <span>Trạng thái:</span>
          <span className="bill-right">
            {getPaymentStatusLabel(order.payment_status)}
          </span>
        </div>

        {!isDineIn && shippingAddress && (
          <div className="bill-address">
            <div>Địa chỉ giao hàng:</div>
            <p>{shippingAddress}</p>
          </div>
        )}

        <div className="bill-items-header">
          <div>STT</div>
          <div>Tên sản phẩm</div>
          <div className="bill-center">SL</div>
          <div className="bill-right">Đơn giá</div>
          <div className="bill-right">Thành tiền</div>
        </div>

        <div>
          {items.map((item, index) => {
            const price = getItemPrice(item);

            return (
              <div key={item._id || index} className="bill-item-row">
                <div>{index + 1}</div>
                <div className="bill-item-name">{getItemName(item)}</div>
                <div className="bill-center">{item.quantity}</div>
                <div className="bill-right">{formatMoney(price)}</div>
                <div className="bill-right">
                  {formatMoney(price * item.quantity)}
                </div>
              </div>
            );
          })}
        </div>

        <div className="bill-subtotal">
          <div className="bill-summary-row">
            <span>Tổng cộng:</span>
            <span>{formatMoney(order.total_amount)}</span>
          </div>
          {!isDineIn && Number(order.shipping_fee || 0) > 0 && (
            <div className="bill-summary-row">
              <span>Phí giao hàng:</span>
              <span>{formatMoney(order.shipping_fee)}</span>
            </div>
          )}
          {Number(order.freeship_value || 0) > 0 && (
            <div className="bill-summary-row">
              <span>Giảm ship:</span>
              <span>-{formatMoney(order.freeship_value)}</span>
            </div>
          )}
          {Number(order.discount_value || 0) > 0 && (
            <div className="bill-summary-row">
              <span>Giảm giá:</span>
              <span>-{formatMoney(order.discount_value)}</span>
            </div>
          )}
          {Number(order.coin_discount || 0) > 0 && (
            <div className="bill-summary-row">
              <span>Sử dụng xu:</span>
              <span>-{formatMoney(order.coin_discount)}</span>
            </div>
          )}
        </div>

        <div className="bill-total">
          <span>Tổng tiền:</span>
          <span>{formatMoney(order.total_amount)}</span>
        </div>

        {order.notes && (
          <div className="bill-note">
            <span>Ghi chú:</span> {order.notes}
          </div>
        )}

        <p className="bill-thanks">NHGREEN xin chân thành cảm ơn!</p>
      </div>
    </div>
  );
});

PrintableBill.displayName = "PrintableBill";

export default PrintableBill;
