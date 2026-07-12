import dotenv from "dotenv";
import crypto from "crypto";
import axios from "axios";
import Order from "../models/order-model.js";
import Dish from "../models/dish-model.js";
import { getIO } from "../config/socket.js";

dotenv.config();

// Format ngày theo VNPay (YYYYMMDDHHmmss)
function formatDate(date) {
  const YYYY = date.getFullYear();
  const MM = String(date.getMonth() + 1).padStart(2, "0");
  const DD = String(date.getDate()).padStart(2, "0");
  const HH = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${YYYY}${MM}${DD}${HH}${mm}${ss}`;
}

// Encode params theo chuẩn VNPay (space = +)
function encodeParams(obj) {
  return Object.keys(obj)
    .map((key) => `${key}=${encodeURIComponent(obj[key]).replace(/%20/g, "+")}`)
    .join("&");
}

function sortParams(params) {
  return Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .reduce((acc, [k, v]) => {
      acc[k] = v;
      return acc;
    }, {});
}

// =======================
// API Tạo URL Thanh toán
// =======================
export const createPaymentUrl = async (req, res) => {
  try {
    const { orderId, amount, bankCode, language } = req.body;
    if (!orderId || !amount) {
      return res
        .status(400)
        .json({ success: false, message: "orderId và amount là bắt buộc" });
    }

    const existingOrder = await Order.findById(orderId).catch(() => null);
    const isDineInOrder = existingOrder?.order_type === "dine_in";
    const txnRef = isDineInOrder ? `${orderId}_${Date.now()}` : orderId;
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const vnpCreateDate = formatDate(now);

    // Log để debug
    console.log("🔔 VNPay Payment Request:", {
      orderId,
      amount,
      vnp_TmnCode: process.env.VNP_TMN_CODE,
      vnp_ReturnUrl: process.env.VNP_RETURN_URL,
      vnp_Url: process.env.VNP_URL,
    });

    let vnp_Params = {
      vnp_Version: "2.1.0",
      vnp_Command: "pay",
      vnp_TmnCode: process.env.VNP_TMN_CODE,
      vnp_Amount: amount * 100, // VNPay yêu cầu nhân 100
      vnp_CurrCode: "VND",
      vnp_TxnRef: txnRef,
      vnp_OrderInfo: `Thanh toan don hang ${orderId}`,
      vnp_OrderType: "other",
      vnp_Locale: language || "vn",
      vnp_ReturnUrl: process.env.VNP_RETURN_URL,
      vnp_IpAddr: req.ip || "127.0.0.1",
      vnp_CreateDate: vnpCreateDate,
      vnp_ExpireDate: formatDate(tomorrow),
    };

    // Thêm bankCode nếu có
    if (bankCode) {
      vnp_Params["vnp_BankCode"] = bankCode;
    }

    // Sắp xếp key
    vnp_Params = sortParams(vnp_Params);

    // Encode params
    const signData = encodeParams(vnp_Params);

    // Ký SHA512
    const hmac = crypto.createHmac("sha512", process.env.VNP_HASH_SECRET);
    const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

    // URL thanh toán
    const paymentUrl = `${process.env.VNP_URL}?${signData}&vnp_SecureHash=${signed}`;

    try {
      const order = existingOrder || (await Order.findById(orderId));
      if (order) {
        order.payment_method = "vnpay";
        order.payment_status = "pending";
        order.vnpay_txn_ref = txnRef;
        order.vnpay_create_date = vnpCreateDate;
        order.vnpay_amount = amount * 100;
        order.payment_gateway_ref = {
          gateway: "vnpay",
          transaction_id: txnRef,
          response_code: "pending",
        };
        await order.save();
      }
    } catch (orderUpdateError) {
      console.error("VNPay pending order update error:", orderUpdateError);
    }

    return res
      .status(201)
      .json({
        success: true,
        data: { orderId, amount, paymentUrl, vnpCreateDate, vnpTxnRef: txnRef },
      });
  } catch (err) {
    console.error("VNPay createPaymentUrl error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =======================
// API Callback VNPay
// =======================
export const vnpayReturn = async (req, res) => {
  try {
    let vnpData = { ...req.query };
    const secureHash = vnpData.vnp_SecureHash;

    delete vnpData.vnp_SecureHash;
    delete vnpData.vnp_SecureHashType;

    // Sắp xếp key theo alphabet
    vnpData = sortParams(vnpData);

    // Ghép chuỗi dữ liệu theo đúng chuẩn VNPay
    const signData = encodeParams(vnpData);

    const signed = crypto
      .createHmac("sha512", process.env.VNP_HASH_SECRET)
      .update(Buffer.from(signData, "utf-8"))
      .digest("hex");

    let success = false;
    let message = "";

    if (secureHash.toLowerCase() !== signed.toLowerCase()) {
      success = false;
      message = "Sai chữ ký VNPay";
    } else if (vnpData.vnp_ResponseCode === "00") {
      success = true;
      message = "Thanh toán thành công";
    } else {
      success = false;
      message = "Thanh toán thất bại hoặc bị hủy";
    }
    const orderId = vnpData.vnp_TxnRef || "";
    const vnpTransactionNo = vnpData.vnp_TransactionNo || "";
    const vnpPayDate = vnpData.vnp_PayDate || "";
    const vnpAmount = vnpData.vnp_Amount || "";

    if (success && orderId) {
      try {
        const fallbackOrderId = String(orderId).split("_")[0];
        const order =
          (await Order.findOne({ vnpay_txn_ref: orderId })) ||
          (await Order.findById(fallbackOrderId).catch(() => null));
        if (order && order.payment_status !== "paid") {
          const now = new Date();
          order.payment_method = "vnpay";
          order.payment_status = "paid";
          order.payment_date = now;
          order.vnpay_txn_ref = orderId;
          order.vnpay_transaction_no = vnpTransactionNo;
          order.vnpay_pay_date = vnpPayDate;
          order.vnpay_amount = Number(vnpAmount || order.total_amount * 100);
          order.payment_gateway_ref = {
            gateway: "vnpay",
            transaction_id: vnpTransactionNo,
            response_code: vnpData.vnp_ResponseCode,
            raw: req.query,
          };

          if (order.order_type === "dine_in") {
            order.status = "completed";
            order.completed_at = now;
            order.history = order.history || [];
            order.history.push({
              status: "completed",
              date: now,
              note: "Thanh toán VNPay thành công",
            });

            for (const item of order.items || []) {
              await Dish.findByIdAndUpdate(item.dish_id, {
                $inc: { sold_quantity: item.quantity },
              });
            }
          }

          await order.save();

          try {
            const io = getIO();
            io.to(`branch:${order.branch_id}`).emit("dine_in_order_paid", {
              order_id: order._id,
              order_number: order.order_number,
              branch_id: order.branch_id,
              table_id: order.table_id,
              payment_method: order.payment_method,
              payment_status: order.payment_status,
              status: order.status,
            });
          } catch (socketError) {
            console.error("VNPay socket emit error:", socketError);
          }
        }
      } catch (orderUpdateError) {
        console.error("VNPay paid order update error:", orderUpdateError);
      }
    }

    // 🔹 Redirect về checkout trên frontend
    const redirectBase = process.env.VNP_FE_REDIRECT_URL;
    if (!redirectBase) {
      throw new Error("VNP_FE_REDIRECT_URL chưa được cấu hình");
    }
    return res.redirect(
      `${redirectBase}?success=${success}&message=${encodeURIComponent(
        message
      )}&orderId=${orderId}&vnp_TransactionNo=${encodeURIComponent(
        vnpTransactionNo
      )}&vnp_PayDate=${encodeURIComponent(
        vnpPayDate
      )}&vnp_Amount=${encodeURIComponent(vnpAmount)}`
    );
  } catch (err) {
    console.error("VNPay return error:", err);
    const redirectBase = process.env.VNP_FE_REDIRECT_URL;
    if (!redirectBase) {
      return res.status(500).json({
        success: false,
        message: "VNP_FE_REDIRECT_URL chưa được cấu hình",
      });
    }
    return res.redirect(
      `${redirectBase}?success=false&message=${encodeURIComponent(
        err.message
      )}`
    );
  }
};

// =======================
// API Refund VNPay (Internal Use)
// =======================
export const requestVnpayRefund = async ({
  txnRef,
  amount,
  transactionNo,
  transactionDate,
  ipAddr,
  orderInfo,
  createBy = "admin",
}) => {
  const refundUrl =
    process.env.VNP_API_URL || process.env.VNP_REFUND_URL || "";

  if (!refundUrl) {
    throw new Error("VNP_API_URL chưa được cấu hình");
  }

  const missingFields = [];
  if (!txnRef) missingFields.push("txnRef");
  if (!transactionNo) missingFields.push("transactionNo");
  if (!transactionDate) missingFields.push("transactionDate");
  if (!amount) missingFields.push("amount");
  if (missingFields.length > 0) {
    throw new Error(
      `Thiếu thông tin giao dịch VNPay để hoàn tiền: ${missingFields.join(
        ", "
      )}`
    );
  }
  const normalizedAmount = String(Math.round(Number(amount)));
  const normalizedTransactionDate = String(transactionDate || "").trim();
  if (!/^\d{14}$/.test(normalizedTransactionDate)) {
    throw new Error("vnp_TransactionDate phai co dinh dang yyyyMMddHHmmss tu vnp_PayDate");
  }

  const now = new Date();
  const requestId = `${Date.now()}`;
  const version = "2.1.0";
  const command = "refund";
  const tmnCode = process.env.VNP_TMN_CODE;
  const transactionType = "02";
  const refundAmount = normalizedAmount;
  const refundOrderInfo = orderInfo || `Hoan tien giao dich ${txnRef}`;
  const refundTransactionNo = transactionNo;
  const refundTransactionDate = normalizedTransactionDate;
  const createDate = formatDate(now);
  const refundIpAddr = String(ipAddr || "127.0.0.1").replace(/^::ffff:/, "");

  const vnp_Params = {
    vnp_RequestId: requestId,
    vnp_Version: version,
    vnp_Command: command,
    vnp_TmnCode: tmnCode,
    vnp_TransactionType: transactionType,
    vnp_TxnRef: txnRef,
    vnp_Amount: refundAmount,
    vnp_OrderInfo: refundOrderInfo,
    vnp_TransactionNo: refundTransactionNo,
    vnp_TransactionDate: refundTransactionDate,
    vnp_CreateDate: createDate,
    vnp_CreateBy: createBy,
    vnp_IpAddr: refundIpAddr,
  };

  // Build pipe-separated signature string as required by VNPay 2.1.0 Refund API
  const signData = [
    requestId,
    version,
    command,
    tmnCode,
    transactionType,
    txnRef,
    refundAmount,
    refundTransactionNo,
    refundTransactionDate,
    createBy,
    createDate,
    refundIpAddr,
    refundOrderInfo,
  ].join("|");

  const secureHash = crypto
    .createHmac("sha512", process.env.VNP_HASH_SECRET)
    .update(Buffer.from(signData, "utf-8"))
    .digest("hex");

  const payload = {
    ...vnp_Params,
    vnp_SecureHash: secureHash,
  };
  console.log("[VNPay refund] Request:", {
    requestId,
    txnRef,
    amount: refundAmount,
    transactionNo: refundTransactionNo,
    transactionDate: refundTransactionDate,
    createDate,
    createBy,
    ipAddr: refundIpAddr,
    refundUrl,
    hasTmnCode: Boolean(tmnCode),
    hasHashSecret: Boolean(process.env.VNP_HASH_SECRET),
    payload: vnp_Params,
  });

  const response = await axios.post(refundUrl, payload, {
    headers: { "Content-Type": "application/json" },
  });

  const data = response.data || {};
  const success = data.vnp_ResponseCode === "00";
  console.log("[VNPay refund] Response:", {
    requestId,
    txnRef,
    success,
    responseCode: data.vnp_ResponseCode,
    message: data.vnp_Message,
    transactionNo: data.vnp_TransactionNo,
    raw: data,
  });

  return {
    success,
    data,
    message: data.vnp_Message || data.vnp_ResponseCode || "",
  };
};
