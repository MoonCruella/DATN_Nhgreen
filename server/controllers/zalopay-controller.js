import crypto from "crypto";
import fetch from "node-fetch";
import QRCode from "qrcode";
import zalopayConfig from "../config/zalopay.js";
import Order from "../models/order-model.js";
import Dish from "../models/dish-model.js";
import { getIO } from "../config/socket.js";

// Helper to create HMAC SHA256
function hmacSHA256(data, key) {
  return crypto.createHmac("sha256", key).update(data).digest("hex");
}

function makeAppTransId(orderId) {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const suffix = `${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
  return `${yy}${mm}${dd}_${suffix}`;
}

function makeRefundId() {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}${mm}${dd}_${zalopayConfig.app_id}_${Date.now()}`;
}

const isObjectId = (value = "") => /^[0-9a-fA-F]{24}$/.test(String(value));

const completeDineInOrderByZalopay = async ({
  order,
  appTransId,
  zpTransId,
  amount,
  raw,
}) => {
  const now = new Date();

  if (order.status !== "completed") {
    try {
      for (const item of order.items || []) {
        await Dish.findByIdAndUpdate(
          item.dish_id,
          { $inc: { sold_quantity: item.quantity } },
          { new: true }
        );
      }
    } catch (updateError) {
      console.error("Update dine-in sold quantity by ZaloPay error:", updateError);
    }
  }

  order.status = "completed";
  order.completed_at = order.completed_at || now;
  order.payment_method = "zalopay";
  order.payment_status = "paid";
  order.payment_date = order.payment_date || now;
  order.zalopay_app_trans_id = appTransId || order.zalopay_app_trans_id;
  order.zalopay_zp_trans_id = zpTransId || order.zalopay_zp_trans_id;
  order.zalopay_amount = Number(
    amount || order.zalopay_amount || order.total_amount
  );
  order.payment_gateway_ref = {
    gateway: "zalopay",
    transaction_id: zpTransId,
    app_trans_id: appTransId,
    response_code: "1",
    raw,
  };
  order.history = order.history || [];
  order.history.push({
    status: "completed",
    date: now,
    note: "Don an tai quan da thanh toan ZaloPay",
  });

  await order.save();

  try {
    const io = getIO();
    io.to(`branch:${order.branch_id}`).emit("order_status_updated", {
      order_id: order._id,
      order_number: order.order_number,
      branch_id: order.branch_id,
      status: "completed",
      updates: {
        completed_at: order.completed_at,
        payment_method: order.payment_method,
        payment_status: order.payment_status,
        payment_date: order.payment_date,
      },
    });
  } catch (socketError) {
    console.error("ZaloPay dine-in socket notification error:", socketError);
  }

  return order;
};

// Create payment via ZaloPay v2/create
export const createPayment = async (req, res) => {
  try {
    const { orderId, amount, description } = req.body;
    if (!orderId || !amount) {
      return res
        .status(400)
        .json({ success: false, message: "orderId và amount là bắt buộc" });
    }

    const existingOrder = isObjectId(orderId)
      ? await Order.findById(orderId)
      : null;
    const isDineInOrder = existingOrder?.order_type === "dine_in";
    const paymentAmount = isDineInOrder ? existingOrder.total_amount : amount;

    if (
      isDineInOrder &&
      ["completed", "cancelled"].includes(existingOrder.status)
    ) {
      return res.status(400).json({
        success: false,
        message: "Don tai quan da hoan thanh hoac da huy",
      });
    }

    const app_id = Number(zalopayConfig.app_id); // ZP yêu cầu số
    const app_user = "user";
    const app_time = Date.now();

    const embed_data = JSON.stringify({
      redirecturl: `${zalopayConfig.frontendRedirectUrl}`,
      orderId,
      context: isDineInOrder ? "dine_in" : "checkout",
    });
    const item = JSON.stringify([]);

    const callback_url = `${zalopayConfig.serverBaseUrl}/api/zalopay/callback`;
    const descriptionText =
      description || `Thanh toan don hang ${orderId} qua ZaloPay`;

    const payload = {
      app_id,
      app_user,
      app_time,
      amount: Number(paymentAmount),
      app_trans_id: makeAppTransId(orderId), // đảm bảo format yymmdd_xxxxxx và duy nhất trong ngày
      embed_data,
      item,
      bank_code: isDineInOrder ? "zalopayapp" : "",
      description: descriptionText,
      callback_url,
    };

    // MAC = HMAC_SHA256(app_id|app_trans_id|app_user|amount|app_time|embed_data|item, key1)
    const dataToSign = [
      payload.app_id,
      payload.app_trans_id,
      payload.app_user,
      payload.amount,
      payload.app_time,
      payload.embed_data,
      payload.item,
    ].join("|");
    const mac = hmacSHA256(dataToSign, zalopayConfig.key1);

    // Gửi sang ZP dạng x-www-form-urlencoded
    const formBody = new URLSearchParams();
    Object.entries({ ...payload, mac }).forEach(([k, v]) =>
      formBody.append(k, typeof v === "number" ? String(v) : v)
    );

    const response = await fetch(zalopayConfig.createEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formBody.toString(),
    });
    const data = await response.json();
    console.log("ZaloPay create payment response:", {
      return_code: data.return_code,
      return_message: data.return_message,
      hasQrCode: Boolean(data.qr_code),
      hasOrderUrl: Boolean(data.order_url),
      hasOrderToken: Boolean(data.order_token),
    });

    if (!response.ok || data.return_code !== 1) {
      return res.status(400).json({
        success: false,
        message:
          data.return_message || data.message || "Không tạo được đơn ZaloPay",
        data,
      });
    }

    const qrSource = data.order_url || data.qr_code || data.order_token || "";
    const qrDataUrl = qrSource
      ? await QRCode.toDataURL(qrSource, {
          errorCorrectionLevel: "M",
          margin: 2,
          width: 280,
          color: {
            dark: "#000000",
            light: "#ffffff",
          },
        })
      : "";

    if (isDineInOrder) {
      existingOrder.payment_method = "zalopay";
      existingOrder.payment_status = "pending";
      existingOrder.zalopay_app_trans_id = payload.app_trans_id;
      existingOrder.zalopay_amount = Number(paymentAmount);
      existingOrder.payment_gateway_ref = {
        gateway: "zalopay",
        app_trans_id: payload.app_trans_id,
        raw: {
          app_trans_id: payload.app_trans_id,
          order_id: String(orderId),
        },
      };
      await existingOrder.save();
    }

    return res.status(201).json({
      success: true,
      data: {
        orderId,
        amount: payload.amount,
        paymentUrl: data.order_url,
        orderUrl: data.order_url,
        qrCode: data.qr_code,
        orderToken: data.order_token,
        qrSource,
        qrDataUrl,
        zpTransToken: data.zp_trans_token,
        appTransId: payload.app_trans_id,
      },
    });
  } catch (err) {
    console.error("ZaloPay createPayment error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const callback = async (req, res) => {
  try {
    const { data: dataStr, mac } = req.body || {};
    if (!dataStr || !mac) {
      return res.json({ return_code: -1, return_message: "Missing params" });
    }

    const expectedMac = hmacSHA256(dataStr, zalopayConfig.key2);
    if (expectedMac !== mac) {
      return res.json({ return_code: -1, return_message: "Invalid MAC" });
    }

    const payload = JSON.parse(dataStr);
    const app_trans_id = payload.app_trans_id;
    const zp_trans_id = payload.zp_trans_id;
    const amount = payload.amount;

    const order = await Order.findOne({ zalopay_app_trans_id: app_trans_id });
    if (order?.order_type === "dine_in") {
      await completeDineInOrderByZalopay({
        order,
        appTransId: app_trans_id,
        zpTransId: zp_trans_id,
        amount,
        raw: payload,
      });
    }

    return res.json({ return_code: 1, return_message: "OK" });
  } catch (e) {
    console.error("ZaloPay callback error:", e);
    return res.json({ return_code: 0, return_message: e.message });
  }
};

export const syncZalopayOrderStatus = async (appTransId) => {
  if (!appTransId) {
    throw new Error("appTransId là bắt buộc");
  }

  const app_id = Number(zalopayConfig.app_id);
  const dataToSign = [app_id, appTransId, zalopayConfig.key1].join("|");
  const mac = hmacSHA256(dataToSign, zalopayConfig.key1);

  const formBody = new URLSearchParams();
  formBody.append("app_id", String(app_id));
  formBody.append("app_trans_id", appTransId);
  formBody.append("mac", mac);

  const response = await fetch(zalopayConfig.queryEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formBody.toString(),
  });
  const data = await response.json();

  if (Number(data.return_code) === 1) {
    const order = await Order.findOne({ zalopay_app_trans_id: appTransId });
    if (order?.order_type === "dine_in" && order.payment_status !== "paid") {
      await completeDineInOrderByZalopay({
        order,
        appTransId,
        zpTransId: data.zp_trans_id,
        amount: data.amount || order.zalopay_amount,
        raw: data,
      });
    }
  }

  return data;
};

export const queryStatus = async (req, res) => {
  try {
    const { appTransId } = req.query;
    if (!appTransId) {
      return res
        .status(400)
        .json({ success: false, message: "appTransId là bắt buộc" });
    }

    const data = await syncZalopayOrderStatus(appTransId);

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("ZaloPay queryStatus error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const requestZalopayRefund = async ({
  zpTransId,
  amount,
  description,
}) => {
  const missingFields = [];
  if (!zpTransId) missingFields.push("zpTransId");
  if (!amount) missingFields.push("amount");
  if (missingFields.length > 0) {
    throw new Error(
      `Thiếu thông tin giao dịch ZaloPay để hoàn tiền: ${missingFields.join(
        ", "
      )}`
    );
  }

  const appId = Number(zalopayConfig.app_id);
  const refundAmount = Math.round(Number(amount));
  const refundDescription =
    description || `Hoan tien giao dich ZaloPay ${zpTransId}`;
  const timestamp = Date.now();
  const mRefundId = makeRefundId();

  const macData = [
    appId,
    zpTransId,
    refundAmount,
    refundDescription,
    timestamp,
  ].join("|");
  const mac = hmacSHA256(macData, zalopayConfig.key1);

  const formBody = new URLSearchParams();
  formBody.append("app_id", String(appId));
  formBody.append("m_refund_id", mRefundId);
  formBody.append("zp_trans_id", String(zpTransId));
  formBody.append("amount", String(refundAmount));
  formBody.append("timestamp", String(timestamp));
  formBody.append("description", refundDescription);
  formBody.append("mac", mac);

  const response = await fetch(zalopayConfig.refundEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formBody.toString(),
  });
  const data = await response.json();
  const returnCode = Number(data.return_code);
  const success = response.ok && [1, 3].includes(returnCode);
  const message =
    data.return_message ||
    data.sub_return_message ||
    `return_code=${data.return_code || ""}`;

  return {
    success,
    data: {
      ...data,
      m_refund_id: mRefundId,
    },
    message,
  };
};
