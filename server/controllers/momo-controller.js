import crypto from "crypto";
import fetch from "node-fetch";
import QRCode from "qrcode";
import momoConfig from "../config/momo.js";
import Order from "../models/order-model.js";
import Dish from "../models/dish-model.js";
import { getIO } from "../config/socket.js";

function signHmacSha256(data, secret) {
  return crypto.createHmac("sha256", secret).update(data).digest("hex");
}

function buildCreateSignature(payload) {
  return [
    `accessKey=${payload.accessKey}`,
    `amount=${payload.amount}`,
    `extraData=${payload.extraData}`,
    `ipnUrl=${payload.ipnUrl}`,
    `orderId=${payload.orderId}`,
    `orderInfo=${payload.orderInfo}`,
    `partnerCode=${payload.partnerCode}`,
    `redirectUrl=${payload.redirectUrl}`,
    `requestId=${payload.requestId}`,
    `requestType=${payload.requestType}`,
  ].join("&");
}

function buildResponseSignature(payload, accessKey) {
  return [
    `accessKey=${accessKey}`,
    `amount=${payload.amount || ""}`,
    `extraData=${payload.extraData || ""}`,
    `message=${payload.message || ""}`,
    `orderId=${payload.orderId || ""}`,
    `orderInfo=${payload.orderInfo || ""}`,
    `orderType=${payload.orderType || ""}`,
    `partnerCode=${payload.partnerCode || ""}`,
    `payType=${payload.payType || ""}`,
    `requestId=${payload.requestId || ""}`,
    `responseTime=${payload.responseTime || ""}`,
    `resultCode=${payload.resultCode || ""}`,
    `transId=${payload.transId || ""}`,
  ].join("&");
}

function buildRefundSignature(payload) {
  return [
    `accessKey=${momoConfig.accessKey}`,
    `amount=${payload.amount}`,
    `description=${payload.description}`,
    `orderId=${payload.orderId}`,
    `partnerCode=${payload.partnerCode}`,
    `requestId=${payload.requestId}`,
    `transId=${payload.transId}`,
  ].join("&");
}
function buildRefundQuerySignature(payload) {
  return [
    `accessKey=${momoConfig.accessKey}`,
    `orderId=${payload.orderId}`,
    `partnerCode=${payload.partnerCode}`,
    `requestId=${payload.requestId}`,
  ].join("&");
}

const isObjectId = (value = "") => /^[0-9a-fA-F]{24}$/.test(String(value));

const buildMomoTxnId = (orderId) =>
  `${String(orderId)}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const getOrderIdFromMomoTxnId = (value = "") => {
  const [orderId] = String(value).split("_");
  return isObjectId(orderId) ? orderId : value;
};

const applyMomoPaymentToOrder = ({
  order,
  requestId,
  momoOrderId,
  transId,
  amount,
  raw,
}) => {
  const now = new Date();

  order.payment_method = "momo";
  order.payment_status = "paid";
  order.payment_date = order.payment_date || now;
  order.momo_request_id = requestId || order.momo_request_id;
  order.momo_trans_id = transId || order.momo_trans_id;
  order.momo_amount = Number(amount || order.momo_amount || order.total_amount);
  order.payment_gateway_ref = {
    gateway: "momo",
    transaction_id: transId || order.payment_gateway_ref?.transaction_id,
    app_trans_id: momoOrderId || order.payment_gateway_ref?.app_trans_id,
    response_code: "0",
    raw,
  };
};

const buildManagerRedirectUrl = ({
  success,
  message,
  orderId,
  resultCode = "",
  transId = "",
  requestId = "",
  amount = "",
}) => {
  const redirectBase =
    process.env.MOMO_MANAGER_REDIRECT_URL ||
    process.env.VNP_MANAGER_REDIRECT_URL ||
    process.env.CLIENT_URL;

  if (!redirectBase) {
    throw new Error("MOMO_MANAGER_REDIRECT_URL chua duoc cau hinh");
  }

  return `${redirectBase}?success=${success}&message=${encodeURIComponent(
    message,
  )}&orderId=${encodeURIComponent(orderId)}&payment_method=momo&context=dine_in&resultCode=${encodeURIComponent(
    resultCode,
  )}&transId=${encodeURIComponent(transId)}&requestId=${encodeURIComponent(
    requestId,
  )}&amount=${encodeURIComponent(amount)}`;
};

const completeDineInOrderByMomo = async ({
  order,
  requestId,
  momoOrderId,
  transId,
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
          { new: true },
        );
      }
    } catch (updateError) {
      console.error("Update dine-in sold quantity by MoMo error:", updateError);
    }
  }

  order.status = "completed";
  order.completed_at = order.completed_at || now;
  applyMomoPaymentToOrder({
    order,
    requestId,
    momoOrderId,
    transId,
    amount,
    raw,
  });
  order.history = order.history || [];
  order.history.push({
    status: "completed",
    date: now,
    note: "Don an tai quan da thanh toan MoMo",
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
    console.error("MoMo dine-in socket notification error:", socketError);
  }

  return order;
};
export const createPayment = async (req, res) => {
  try {
    const { orderId, amount, orderInfo, requestType } = req.body;
    if (!orderId || !amount) {
      return res
        .status(400)
        .json({ success: false, message: "orderId and amount are required" });
    }

    const allowedRequestTypes = ["captureWallet", "payWithMethod"];
    const resolvedRequestType = allowedRequestTypes.includes(requestType)
      ? requestType
      : momoConfig.requestType;

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

    const momoOrderId = buildMomoTxnId(orderId);
    const requestId = momoOrderId;
    const payload = {
      partnerCode: momoConfig.partnerCode,
      partnerName: momoConfig.partnerName || "Test",
      storeId: momoConfig.storeId || "MomoTestStore",
      accessKey: momoConfig.accessKey,
      requestId,
      amount: String(paymentAmount),
      orderId: momoOrderId,
      orderInfo: orderInfo || `Thanh toan don hang ${orderId}`,
      redirectUrl: momoConfig.redirectUrl,
      ipnUrl: momoConfig.ipnUrl,
      requestType: resolvedRequestType,
      autoCapture: true,
      orderGroupId: "",
      extraData: "",
      lang: "vi",
    };

    const rawSignature = buildCreateSignature(payload);
    const signature = signHmacSha256(rawSignature, momoConfig.secretKey);

    const response = await fetch(momoConfig.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, signature }),
    });
    const data = await response.json();
    console.log("MoMo create payment response:", {
      resultCode: data.resultCode,
      message: data.message,
      requestType: payload.requestType,
      hasQrCodeUrl: Boolean(data.qrCodeUrl),
      hasDeeplink: Boolean(data.deeplink),
      hasPayUrl: Boolean(data.payUrl),
    });

    if (!response.ok || data.resultCode !== 0) {
      return res.status(400).json({
        success: false,
        message: data.message || "MoMo create payment failed",
        data,
      });
    }

    const qrSource = data.qrCodeUrl || data.deeplink || data.payUrl || "";
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
      existingOrder.payment_method = "momo";
      existingOrder.payment_status = "pending";
      existingOrder.momo_request_id = payload.requestId;
      existingOrder.momo_amount = Number(paymentAmount);
      existingOrder.payment_gateway_ref = {
        gateway: "momo",
        app_trans_id: momoOrderId,
        raw: {
          momo_order_id: momoOrderId,
          order_id: String(orderId),
        },
      };
      await existingOrder.save();
    }

    return res.status(201).json({
      success: true,
      data: {
        orderId: String(orderId),
        momoOrderId: payload.orderId,
        amount: payload.amount,
        paymentUrl: data.payUrl || data.deeplink || data.qrCodeUrl,
        payUrl: data.payUrl,
        deeplink: data.deeplink,
        qrCodeUrl: data.qrCodeUrl,
        qrDataUrl,
        requestId: payload.requestId,
      },
    });
  } catch (err) {
    console.error("MoMo createPayment error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const ipn = async (req, res) => {
  try {
    const payload = req.body || {};
    const expectedSignature = signHmacSha256(
      buildResponseSignature(payload, momoConfig.accessKey),
      momoConfig.secretKey,
    );

    if (payload.signature !== expectedSignature) {
      return res.json({ resultCode: 1, message: "Invalid signature" });
    }

    const success = payload.resultCode === 0;
    const appOrderId = getOrderIdFromMomoTxnId(payload.orderId);
    if (success && isObjectId(appOrderId)) {
      const order = await Order.findById(appOrderId);
      if (order?.order_type === "dine_in") {
        await completeDineInOrderByMomo({
          order,
          requestId: payload.requestId,
          momoOrderId: payload.orderId,
          transId: payload.transId,
          amount: payload.amount,
          raw: payload,
        });
      } else if (order) {
        applyMomoPaymentToOrder({
          order,
          requestId: payload.requestId,
          momoOrderId: payload.orderId,
          transId: payload.transId,
          amount: payload.amount,
          raw: payload,
        });
        await order.save();
      }
    }

    return res.json({ resultCode: 0, message: "OK" });
  } catch (err) {
    console.error("MoMo IPN error:", err);
    return res.json({ resultCode: 99, message: err.message });
  }
};

export const momoReturn = async (req, res) => {
  try {
    const payload = { ...req.query };
    const expectedSignature = signHmacSha256(
      buildResponseSignature(payload, momoConfig.accessKey),
      momoConfig.secretKey,
    );

    const success =
      payload.signature === expectedSignature &&
      String(payload.resultCode) === "0";
    const message =
      payload.message || (success ? "Payment success" : "Payment failed");
    const momoOrderId = payload.orderId || "";
    const orderId = getOrderIdFromMomoTxnId(momoOrderId);
    const resultCode = payload.resultCode || "";
    const transId = payload.transId || "";
    const requestId = payload.requestId || "";
    const amount = payload.amount || "";
    const order = isObjectId(orderId) ? await Order.findById(orderId) : null;
    const isDineInOrder = order?.order_type === "dine_in";

    if (success && order) {
      if (isDineInOrder) {
        await completeDineInOrderByMomo({
          order,
          requestId,
          momoOrderId,
          transId,
          amount,
          raw: payload,
        });
      } else {
        applyMomoPaymentToOrder({
          order,
          requestId,
          momoOrderId,
          transId,
          amount,
          raw: payload,
        });
        await order.save();
      }
    }

    if (isDineInOrder) {
      return res.redirect(
        buildManagerRedirectUrl({
          success,
          message,
          orderId,
          resultCode,
          transId,
          requestId,
          amount,
        }),
      );
    }

    return res.redirect(
      `${momoConfig.frontendRedirectUrl}?success=${success}&message=${encodeURIComponent(
        message,
      )}&orderId=${encodeURIComponent(orderId)}&resultCode=${encodeURIComponent(
        resultCode,
      )}&transId=${encodeURIComponent(transId)}&requestId=${encodeURIComponent(
        requestId,
      )}&amount=${encodeURIComponent(amount)}`,
    );
  } catch (err) {
    console.error("MoMo return error:", err);
    return res.redirect(
      `${momoConfig.frontendRedirectUrl}?success=false&message=${encodeURIComponent(
        err.message,
      )}`,
    );
  }
};

export const requestMomoRefund = async ({ transId, amount, description }) => {
  const missingFields = [];
  if (!transId) missingFields.push("transId");
  if (!amount) missingFields.push("amount");
  if (missingFields.length > 0) {
    throw new Error(
      `Thiếu thông tin giao dịch MoMo để hoàn tiền: ${missingFields.join(
        ", ",
      )}`,
    );
  }

  const timestamp = Date.now();
  const refundOrderId = `refund_${timestamp}`;
  const requestId = `${refundOrderId}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  const payload = {
    partnerCode: momoConfig.partnerCode,
    orderId: refundOrderId,
    requestId,
    amount: Math.round(Number(amount)),
    transId: Number(transId),
    lang: "vi",
    description: description || `Hoàn tiền giao dịch MoMo ${transId}`,
  };

  const rawSignature = buildRefundSignature(payload);
  const signature = signHmacSha256(rawSignature, momoConfig.secretKey);

  console.log("[MoMo refund] Request:", {
    orderId: refundOrderId,
    requestId,
    amount: payload.amount,
    transId: payload.transId,
    endpoint: momoConfig.refundEndpoint,
    hasPartnerCode: Boolean(momoConfig.partnerCode),
    hasAccessKey: Boolean(momoConfig.accessKey),
    hasSecretKey: Boolean(momoConfig.secretKey),
  });

  const response = await fetch(momoConfig.refundEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, signature }),
  });
  const data = await response.json();
  const resultCode = Number(data.resultCode);
  const acceptedResultCodes = [0, 43, 7002];
  const isProcessing = false;
  const success = response.ok && acceptedResultCodes.includes(resultCode);

  console.log("[MoMo refund] Response:", {
    orderId: refundOrderId,
    requestId,
    success,
    isProcessing,
    resultCode: data.resultCode,
    message: data.message,
    raw: data,
  });

  return {
    success,
    isProcessing,
    data: {
      ...data,
      refund_order_id: refundOrderId,
      refund_request_id: requestId,
    },
    message: data.message || `resultCode=${data.resultCode || ""}`,
  };
};
export const requestMomoRefundQuery = async ({ orderId, requestId }) => {
  const missingFields = [];
  if (!orderId) missingFields.push("orderId");
  if (!requestId) missingFields.push("requestId");
  if (missingFields.length > 0) {
    throw new Error(
      `Thiếu thông tin truy vấn hoàn tiền MoMo: ${missingFields.join(", ")}`,
    );
  }

  const payload = {
    partnerCode: momoConfig.partnerCode,
    orderId,
    requestId,
    lang: "vi",
  };
  const rawSignature = buildRefundQuerySignature(payload);
  const signature = signHmacSha256(rawSignature, momoConfig.secretKey);

  console.log("[MoMo refund query] Request:", {
    orderId,
    requestId,
    endpoint: momoConfig.queryRefundEndpoint,
    hasPartnerCode: Boolean(momoConfig.partnerCode),
    hasAccessKey: Boolean(momoConfig.accessKey),
    hasSecretKey: Boolean(momoConfig.secretKey),
  });

  const response = await fetch(momoConfig.queryRefundEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, signature }),
  });
  const data = await response.json();
  const resultCode = Number(data.resultCode);
  const acceptedResultCodes = [0, 43, 7002];
  const isProcessing = false;
  const success = response.ok && acceptedResultCodes.includes(resultCode);

  console.log("[MoMo refund query] Response:", {
    orderId,
    requestId,
    success,
    isProcessing,
    resultCode: data.resultCode,
    message: data.message,
    raw: data,
  });

  return {
    success,
    isProcessing,
    data,
    message: data.message || `resultCode=${data.resultCode || ""}`,
  };
};
