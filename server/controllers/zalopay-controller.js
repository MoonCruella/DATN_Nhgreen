import crypto from "crypto";
import fetch from "node-fetch";
import zalopayConfig from "../config/zalopay.js";

// Helper to create HMAC SHA256
function hmacSHA256(data, key) {
  return crypto.createHmac("sha256", key).update(data).digest("hex");
}

function makeAppTransId(orderId) {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const suffix = String(orderId).replace(/\D/g, "").slice(-6).padStart(6, "0");
  return `${yy}${mm}${dd}_${suffix}`;
}

function makeRefundId() {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}${mm}${dd}_${zalopayConfig.app_id}_${Date.now()}`;
}

// Create payment via ZaloPay v2/create
export const createPayment = async (req, res) => {
  try {
    const { orderId, amount, description } = req.body;
    if (!orderId || !amount) {
      return res
        .status(400)
        .json({ success: false, message: "orderId và amount là bắt buộc" });
    }

    const app_id = Number(zalopayConfig.app_id); // ZP yêu cầu số
    const app_user = "user";
    const app_time = Date.now();

    const embed_data = JSON.stringify({
      redirecturl: `${zalopayConfig.frontendRedirectUrl}`,
      orderId,
    });
    const item = JSON.stringify([]);

    const callback_url = `${zalopayConfig.serverBaseUrl}/api/zalopay/callback`;
    const descriptionText =
      description || `Thanh toan don hang ${orderId} qua ZaloPay`;

    const payload = {
      app_id,
      app_user,
      app_time,
      amount: Number(amount),
      app_trans_id: makeAppTransId(orderId), // đảm bảo format yymmdd_xxxxxx và duy nhất trong ngày
      embed_data,
      item,
      bank_code: "",
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

    if (!response.ok || data.return_code !== 1) {
      return res.status(400).json({
        success: false,
        message:
          data.return_message || data.message || "Không tạo được đơn ZaloPay",
        data,
      });
    }

    return res.status(201).json({
      success: true,
      data: {
        orderId,
        amount: payload.amount,
        paymentUrl: data.order_url,
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
    const success = payload.return_code === 1;

    // TODO: cập nhật trạng thái đơn trong DB theo app_trans_id (success ? 'PAID' : 'FAILED')

    return res.json({ return_code: 1, return_message: "OK" });
  } catch (e) {
    console.error("ZaloPay callback error:", e);
    return res.json({ return_code: 0, return_message: e.message });
  }
};

export const queryStatus = async (req, res) => {
  try {
    const { appTransId } = req.query;
    if (!appTransId) {
      return res
        .status(400)
        .json({ success: false, message: "appTransId là bắt buộc" });
    }

    const app_id = Number(zalopayConfig.app_id);
    // MAC = HMAC_SHA256(app_id|app_trans_id|key1, key1)
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
