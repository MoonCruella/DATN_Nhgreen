import React from "react";

const PrintableBill = React.forwardRef(
  ({ order, formatCurrency, formatDateTime }, ref) => {
    return (
      <div ref={ref} className="hidden">
        <div className="header">
          <h2>HÓA ĐƠN BÁN HÀNG</h2>
          <p>{order.branch_info?.name || "NHÀ HÀNG"}</p>
          <p>
            {order.branch_info?.address?.full_address ||
              order.branch_info?.phone ||
              ""}
          </p>
        </div>

        <div className="info">
          <div className="info-row">
            <span>Mã đơn:</span>
            <strong>#{order.order_number}</strong>
          </div>
          <div className="info-row">
            <span>Ngày:</span>
            <span>{formatDateTime(order.created_at)}</span>
          </div>
          <div className="info-row">
            <span>Khách:</span>
            <span>{order.shipping_info?.name}</span>
          </div>
          <div className="info-row">
            <span>SĐT:</span>
            <span>{order.shipping_info?.phone}</span>
          </div>
        </div>

        <div className="divider"></div>

        <div style={{ margin: "8px 0", fontSize: "10px" }}>
          <div style={{ fontWeight: "bold", marginBottom: "3px" }}>
            ĐỊA CHỈ GIAO HÀNG:
          </div>
          <div>
            {order.shipping_info?.address}
            {order.shipping_info?.ward && `, ${order.shipping_info.ward}`}
            {order.shipping_info?.district &&
              `, ${order.shipping_info.district}`}
            {order.shipping_info?.province &&
              `, ${order.shipping_info.province}`}
          </div>
        </div>

        <div className="divider"></div>

        <table>
          <thead>
            <tr>
              <th className="item-name">Món</th>
              <th className="item-qty">SL</th>
              <th className="item-price">Giá</th>
            </tr>
          </thead>
          <tbody>
            {order.items?.map((item, index) => (
              <tr key={index}>
                <td className="item-name">
                  {item.dish_name}
                  <br />
                  <small style={{ fontSize: "9px", color: "#666" }}>
                    {item.sale_price && item.sale_price < item.price ? (
                      // Hiển thị giá gốc gạch đi và giá sale
                      <>
                        <span
                          style={{
                            textDecoration: "line-through",
                            marginRight: "4px",
                          }}
                        >
                          {formatCurrency(item.price)}
                        </span>
                        <span style={{ color: "#16a34a", fontWeight: "600" }}>
                          {formatCurrency(item.sale_price)}
                        </span>
                      </>
                    ) : (
                      // Hiển thị giá thường
                      formatCurrency(item.price)
                    )}
                  </small>
                </td>
                <td className="item-qty">{item.quantity}</td>
                <td className="item-price">
                  <strong>
                    {formatCurrency(
                      (item.sale_price || item.price) * item.quantity
                    )}
                  </strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="summary">
          <div className="summary-row">
            <span>Tạm tính:</span>
            <span>{formatCurrency(order.subtotal)}</span>
          </div>
          <div className="summary-row">
            <span>Phí giao hàng:</span>
            <span>{formatCurrency(order.shipping_fee)}</span>
          </div>
          {order.freeship_value > 0 && (
            <div className="summary-row">
              <span>Giảm ship:</span>
              <span>-{formatCurrency(order.freeship_value)}</span>
            </div>
          )}
          {order.discount_value > 0 && (
            <div className="summary-row">
              <span>Giảm giá:</span>
              <span>-{formatCurrency(order.discount_value)}</span>
            </div>
          )}
          <div className="summary-row total">
            <span>TỔNG CỘNG:</span>
            <span>{formatCurrency(order.total_amount)}</span>
          </div>
          <div className="summary-row">
            <span>Thanh toán:</span>
            <span>
              {order.payment_method === "vnpay"
                ? "VNPay"
                : order.payment_method === "zalopay"
                ? "ZaloPay"
                : "COD"}
            </span>
          </div>
          <div className="summary-row">
            <span>Trạng thái:</span>
            <span>
              {order.payment_status === "paid"
                ? "Đã thanh toán"
                : "Chưa thanh toán"}
            </span>
          </div>
        </div>

        {order.notes && (
          <div
            style={{ margin: "10px 0", fontSize: "9px", fontStyle: "italic" }}
          >
            <strong>Ghi chú:</strong> {order.notes}
          </div>
        )}

        <div className="footer">
          <p>*** CẢM ƠN QUÝ KHÁCH ***</p>
          <p>Hẹn gặp lại!</p>
        </div>
      </div>
    );
  }
);

PrintableBill.displayName = "PrintableBill";

export default PrintableBill;
