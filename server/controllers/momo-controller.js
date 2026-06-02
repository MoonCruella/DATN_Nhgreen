import crypto from "crypto";
import fetch from "node-fetch";
import momoConfig from "../config/momo.js";

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

export const createPayment = async (req, res) => {
  try {
    const { orderId, amount, orderInfo } = req.body;
    if (!orderId || !amount) {
      return res
        .status(400)
        .json({ success: false, message: "orderId and amount are required" });
    }

    const requestId = String(orderId);
    const payload = {
      partnerCode: momoConfig.partnerCode,
      partnerName: momoConfig.partnerName || "Test",
      storeId: momoConfig.storeId || "MomoTestStore",
      accessKey: momoConfig.accessKey,
      requestId,
      amount: String(amount),
      orderId: String(orderId),
      orderInfo: orderInfo || `Thanh toan don hang ${orderId}`,
      redirectUrl: momoConfig.redirectUrl,
      ipnUrl: momoConfig.ipnUrl,
      requestType: momoConfig.requestType,
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

    if (!response.ok || data.resultCode !== 0) {
      return res.status(400).json({
        success: false,
        message: data.message || "MoMo create payment failed",
        data,
      });
    }

    return res.status(201).json({
      success: true,
      data: {
        orderId: payload.orderId,
        amount: payload.amount,
        paymentUrl: data.payUrl || data.deeplink || data.qrCodeUrl,
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
      momoConfig.secretKey
    );

    if (payload.signature !== expectedSignature) {
      return res.json({ resultCode: 1, message: "Invalid signature" });
    }

    const success = payload.resultCode === 0;
    // TODO: update order status based on payload.orderId and success

    return res.json({ resultCode: 0, message: "OK" });
  } catch (err) {
    console.error("MoMo IPN error:", err);
    return res.json({ resultCode: 99, message: err.message });
  }
};

export const momoReturn = (req, res) => {
  try {
    const payload = { ...req.query };
    const expectedSignature = signHmacSha256(
      buildResponseSignature(payload, momoConfig.accessKey),
      momoConfig.secretKey
    );

    const success =
      payload.signature === expectedSignature &&
      String(payload.resultCode) === "0";
    const message = success ? "Payment success" : "Payment failed";
    const orderId = payload.orderId || "";

    return res.redirect(
      `${momoConfig.frontendRedirectUrl}?success=${success}&message=${encodeURIComponent(
        message
      )}&orderId=${encodeURIComponent(orderId)}`
    );
  } catch (err) {
    console.error("MoMo return error:", err);
    return res.redirect(
      `${momoConfig.frontendRedirectUrl}?success=false&message=${encodeURIComponent(
        err.message
      )}`
    );
  }
};
