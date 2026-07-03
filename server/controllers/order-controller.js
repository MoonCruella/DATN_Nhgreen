import Order from "../models/order-model.js";
import "../models/dinein-customer-model.js";
import Branch from "../models/branch-model.js";
import Dish from "../models/dish-model.js";
import User from "../models/user-model.js";
import Voucher from "../models/voucher-model.js";
import FlashSale from "../models/flashsale-model.js";
import StoreTable from "../models/store-table-model.js";
import DineInSession from "../models/dinein-session-model.js";
import OrderCounter from "../models/order-counter-model.js";
import mongoose from "mongoose";
import response from "../helpers/response.js";
import * as notificationService from "../services/notification-service.js";
import * as orderSchedulerService from "../services/order-scheduler-service.js";
import { awardOrderRewardCoins } from "../services/reward-service.js";
import CartItem from "../models/cart-model.js";
import Rating from "../models/rating-model.js";
import { getIO } from "../config/socket.js";
import { requestVnpayRefund } from "./vnpay-controller.js";
import { requestZalopayRefund } from "./zalopay-controller.js";
import { requestMomoRefund } from "./momo-controller.js";
import {
  createGhnShippingOrder,
  getGhnShippingOrderDetail,
} from "../services/ghn-service.js";
import {
  createFuzzyMongoQuery,
  sortByRelevance,
  removeVietnameseTones,
  createVietnameseRegex,
} from "../utils/fuzzySearch.js";

const calculateOrderStats = (orders) => {
  return {
    total: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    confirmed: orders.filter((o) => o.status === "confirmed").length,
    processing: orders.filter((o) => o.status === "processing").length,
    shipped: orders.filter((o) => o.status === "shipped").length,
    delivered: orders.filter((o) => o.status === "delivered").length,
    completed: orders.filter((o) => o.status === "completed").length,
    cancel_request: orders.filter((o) => o.status === "cancel_request").length,
    cancelled: orders.filter((o) => o.status === "cancelled").length,
    totalAmount: orders.reduce((sum, o) => sum + (o.total_amount || 0), 0),
  };
};

const checkOrderRatingStatus = async (orderId, userId) => {
  try {
    const order = await Order.findById(orderId);
    if (!order) return { all_rated: false, rated_count: 0, total_items: 0 };

    const dishIds = order.items.map((item) => item.dish_id);
    const totalItems = dishIds.length;

    const ratings = await Rating.find({
      dish_id: { $in: dishIds },
      user_id: userId,
      order_id: orderId,
    });

    const ratedCount = ratings.length;
    const allRated = ratedCount === totalItems && totalItems > 0;

    return {
      all_rated: allRated,
      rated_count: ratedCount,
      total_items: totalItems,
    };
  } catch (error) {
    console.error("Error checking rating status:", error);
    return { all_rated: false, rated_count: 0, total_items: 0 };
  }
};

const getVnpayRefundMissingFields = (order) => {
  const missing = [];
  if (!order.vnpay_txn_ref) missing.push("vnpay_txn_ref");
  if (!order.vnpay_transaction_no || order.vnpay_transaction_no === "0") {
    missing.push("vnpay_transaction_no");
  }
  const transactionDate = order.vnpay_create_date || order.vnpay_pay_date;
  if (!transactionDate || String(transactionDate).length !== 14) {
    missing.push("vnpay_create_date");
  }
  const amountValue = Number(order.vnpay_amount || 0);
  if (amountValue <= 0 && !order.total_amount) missing.push("amount");
  return missing;
};

const getZalopayRefundTransId = (order = {}) =>
  order.zalopay_zp_trans_id ||
  (order.payment_gateway_ref?.gateway === "zalopay"
    ? order.payment_gateway_ref?.transaction_id
    : "");

const getZalopayRefundMissingFields = (order) => {
  const missing = [];
  if (!getZalopayRefundTransId(order)) missing.push("zalopay_zp_trans_id");
  const amountValue = Number(order.zalopay_amount || order.total_amount || 0);
  if (amountValue <= 0) missing.push("amount");
  return missing;
};

const getMomoRefundMissingFields = (order) => {
  const missing = [];
  if (!order.momo_trans_id) missing.push("momo_trans_id");
  const amountValue = Number(order.momo_amount || order.total_amount || 0);
  if (amountValue <= 0) missing.push("amount");
  return missing;
};

const resolveGatewayPaymentMethod = ({
  payment_method,
  vnpay_txn_ref,
  vnpay_transaction_no,
  momo_request_id,
  momo_trans_id,
  zalopay_app_trans_id,
  zalopay_zp_trans_id,
} = {}) => {
  if (zalopay_zp_trans_id || zalopay_app_trans_id) return "zalopay";
  if (momo_trans_id || momo_request_id) return "momo";
  if (vnpay_transaction_no || vnpay_txn_ref) return "vnpay";
  return payment_method;
};

const getRefundPaymentMethod = (order = {}) => {
  if (getZalopayRefundTransId(order) || order.zalopay_app_trans_id) {
    return "zalopay";
  }
  if (order.momo_trans_id || order.momo_request_id) return "momo";
  if (order.vnpay_transaction_no || order.vnpay_txn_ref) return "vnpay";

  const gateway = order.payment_gateway_ref?.gateway;
  if (["zalopay", "momo", "vnpay"].includes(gateway)) return gateway;
  return order.payment_method;
};

const getManagerBranchId = async (userId) => {
  const manager = await User.findById(userId).select("branch_id").lean();
  return manager?.branch_id || null;
};

const getAddressRegion = (value, codeType = "number") => {
  if (!value) return {};
  if (typeof value === "object") {
    const hasCode = value.code !== "" && value.code != null;
    const code =
      codeType === "string"
        ? hasCode
          ? String(value.code)
          : undefined
        : hasCode
        ? Number(value.code)
        : undefined;
    return {
      code:
        codeType === "string" || Number.isFinite(code) ? code : undefined,
      name: value.name || "",
    };
  }
  return { name: String(value) };
};

const normalizeShippingInfo = (shippingInfo = {}) => {
  const ward = getAddressRegion(shippingInfo.ward, "string");
  const district = getAddressRegion(shippingInfo.district);
  const province = getAddressRegion(shippingInfo.province);
  const fullAddress =
    shippingInfo.full_address ||
    shippingInfo.address ||
    [shippingInfo.street, ward.name, district.name, province.name]
      .filter(Boolean)
      .join(", ");

  return {
    name: shippingInfo.name || shippingInfo.full_name || "",
    phone: shippingInfo.phone || "",
    address: fullAddress,
    full_name: shippingInfo.full_name || shippingInfo.name || "",
    street: shippingInfo.street || "",
    full_address: fullAddress,
    ward,
    district,
    province,
    coordinates: shippingInfo.coordinates || {},
  };
};

const getOrderNumberPrefix = (orderType) =>
  orderType === "dine_in" ? "IN" : "ON";

const generateOrderNumber = async (orderType) => {
  const counterKey = orderType === "dine_in" ? "offline" : "online";
  const prefix = getOrderNumberPrefix(orderType);

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const counter = await OrderCounter.findOneAndUpdate(
      { key: counterKey },
      { $inc: { seq: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();
    const orderNumber = `${prefix}${counter.seq}`;
    const existed = await Order.exists({ order_number: orderNumber });

    if (!existed) return orderNumber;
  }

  throw new Error("Không thể tạo mã đơn hàng");
};

const GHN_TO_ORDER_STATUS = {
  delivered: "delivered",
  cancel: "cancelled",
};

const getOrderStatusFromGhnStatus = (ghnStatus, currentStatus) => {
  if (!ghnStatus) return currentStatus;
  if (GHN_TO_ORDER_STATUS[ghnStatus]) return GHN_TO_ORDER_STATUS[ghnStatus];
  if (["pending", "confirmed", "processing"].includes(currentStatus)) {
    return "shipped";
  }
  return currentStatus;
};

const getGhnWebhookValue = (payload, ...keys) => {
  for (const key of keys) {
    if (payload?.[key] != null && payload[key] !== "") return payload[key];
  }
  return undefined;
};

const getOrderGhnShopId = (order) =>
  order?.branch_info?.shop_id || order?.branch_id?.shop_id;

const getEntityId = (value) => value?._id || value;

const emitOrderStatusUpdated = (order) => {
  try {
    const io = getIO();
    if (!io) return;
    const branchId = getEntityId(order.branch_id);
    const userId = getEntityId(order.user_id);

    const payload = {
      order_id: order._id,
      order_number: order.order_number,
      status: order.status,
      branch_id: branchId,
      updates: {
        shipped_at: order.shipped_at,
        delivered_at: order.delivered_at,
        cancelled_at: order.cancelled_at,
        tracking_number: order.tracking_number,
        shipping_order_code: order.shipping_order_code,
        shipping_status: order.shipping_status,
      },
    };

    if (branchId) {
      io.to(`branch:${branchId}`).emit("order_status_updated", payload);
      if (order.status === "cancelled" && order.shipping_provider === "ghn") {
        io.to(`branch:${branchId}`).emit("ghn_order_cancelled", {
          order_id: order._id,
          order_number: order.order_number,
          branch_id: branchId,
          tracking_number: order.tracking_number,
          shipping_order_code: order.shipping_order_code,
          shipping_status: order.shipping_status,
          cancel_reason: order.cancel_reason,
          cancelled_at: order.cancelled_at,
        });
      }
    }
    if (userId) {
      io.to(`user:${userId.toString()}`).emit("order_status_updated", payload);
    }
  } catch (socketError) {
    console.error("Socket GHN status update error:", socketError);
  }
};

const applyGhnStatusToOrder = async (order, ghnPayload = {}) => {
  const rawStatus = getGhnWebhookValue(
    ghnPayload,
    "Status",
    "status",
    "status_id",
    "OrderStatus",
    "order_status",
  );
  const ghnStatus = rawStatus ? String(rawStatus).trim() : "";
  if (!ghnStatus) return { order, statusChanged: false };

  const previousStatus = order.status;
  const nextStatus = getOrderStatusFromGhnStatus(ghnStatus, order.status);
  const now = new Date();
  const description =
    getGhnWebhookValue(ghnPayload, "Description", "description") ||
    `GHN cập nhật trạng thái ${ghnStatus}`;

  order.shipping_provider = "ghn";
  order.shipping_status = ghnStatus;
  order.shipping_raw_response = ghnPayload;

  if (nextStatus !== order.status) {
    order.status = nextStatus;
    if (nextStatus === "shipped" && !order.shipped_at) order.shipped_at = now;
    if (nextStatus === "delivered" && !order.delivered_at) order.delivered_at = now;
    if (nextStatus === "cancelled") {
      if (!order.cancelled_at) order.cancelled_at = now;
      order.cancel_reason =
        order.cancel_reason || description || "GHN hủy vận đơn";
    }

    order.history = order.history || [];
    order.history.push({
      status: nextStatus,
      date: now,
      note: description,
    });
  }

  await order.save();

  if (nextStatus !== previousStatus) {
    try {
      await notificationService.notifyOrderStatusUpdate(order, previousStatus);
      if (nextStatus === "cancelled") {
        await notificationService.notifyOrderCancelledManagers(order);
      }
    } catch (notifyError) {
      console.error("Không thể gửi thông báo cập nhật GHN:", notifyError);
    }
    emitOrderStatusUpdated(order);
  }

  return { order, statusChanged: nextStatus !== previousStatus };
};

//Get user orders with filter and pagination
export const getUserOrders = async (req, res) => {
  try {
    const userId = req.user?.userId || null;
    const {
      status = "all",
      page = 1,
      limit = 10,
      sort = "created_at",
      order = "desc",
    } = req.query;

    // Build filter object
    const filter = { user_id: userId };
    if (status && status !== "all") {
      filter.status = status;
    }

    // Build sort object
    const sortObj = {};
    sortObj[sort] = order === "desc" ? -1 : 1;

    // Calculate skip value for pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    //  Get orders without populating dish_id - use hardcoded data
    const orders = await Order.find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    //  Enrich items with dish existence check
    const enrichedOrders = await Promise.all(
      orders.map(async (order) => {
        const ratingStatus = await checkOrderRatingStatus(order._id, userId);

        const enrichedItems = await Promise.all(
          order.items.map(async (item) => {
            const dishExists = await Dish.exists({
              _id: item.dish_id,
            });
            return {
              ...item,
              dish_exists: !!dishExists,
              dish_deleted: !dishExists,
            };
          })
        );
        return {
          ...order,
          rating_status: ratingStatus,
          items: enrichedItems,
        };
      })
    );

    // Get total count for pagination
    const totalOrders = await Order.countDocuments(filter);
    const totalPages = Math.ceil(totalOrders / parseInt(limit));

    // Calculate order statistics
    const allUserOrders = await Order.find({ user_id: userId }).lean();
    const orderStats = {
      total: allUserOrders.length,
      pending: allUserOrders.filter((order) => order.status === "pending")
        .length,
      confirmed: allUserOrders.filter((order) => order.status === "confirmed")
        .length,
      processing: allUserOrders.filter((order) => order.status === "processing")
        .length,
      shipped: allUserOrders.filter((order) => order.status === "shipped")
        .length,
      delivered: allUserOrders.filter((order) => order.status === "delivered")
        .length,
      cancel_request: allUserOrders.filter((o) => o.status === "cancel_request")
        .length,
      cancelled: allUserOrders.filter((order) => order.status === "cancelled")
        .length,
      totalAmount: allUserOrders.reduce(
        (sum, order) => sum + (order.total_amount || 0),
        0
      ),
    };

    const data = {
      orders: enrichedOrders,
      pagination: {
        current_page: parseInt(page),
        total_pages: totalPages,
        total_orders: totalOrders,
        per_page: parseInt(limit),
        has_next: parseInt(page) < totalPages,
        has_prev: parseInt(page) > 1,
      },
      stats: orderStats,
      filter: {
        status,
        sort,
        order,
      },
    };

    return response.sendSuccess(
      res,
      data,
      "Lấy danh sách đơn hàng thành công",
      200
    );
  } catch (error) {
    console.error("Get user orders error:", error);
    return response.sendError(
      res,
      "Có lỗi xảy ra khi lấy danh sách đơn hàng",
      500,
      error.message
    );
  }
};

export const getUserOrdersByAdmin = async (req, res) => {
  try {
    const userId = req.params?.userId ?? req.query?.userId ?? null;
    const {
      status = "all",
      page = 1,
      limit = 10,
      sort = "created_at",
      order = "desc",
    } = req.query;

    // validate userId
    if (!userId || !mongoose.Types.ObjectId.isValid(String(userId))) {
      return response.sendError(res, "ID người dùng không hợp lệ", 400);
    }

    // Build filter object
    const filter = { user_id: userId };
    if (status && status !== "all") {
      filter.status = status;
    }

    // Build sort object
    const sortObj = {};
    sortObj[sort] = order === "desc" ? -1 : 1;

    // Calculate skip value for pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get orders without populating dish_id - use hardcoded data
    const orders = await Order.find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Enrich items with dish existence check
    const enrichedOrders = await Promise.all(
      orders.map(async (order) => {
        const enrichedItems = await Promise.all(
          order.items.map(async (item) => {
            const dishExists = await Dish.exists({
              _id: item.dish_id,
            });
            return {
              ...item,
              dish_exists: !!dishExists,
              dish_deleted: !dishExists,
            };
          })
        );
        return {
          ...order,
          items: enrichedItems,
        };
      })
    );

    // Get total count for pagination
    const totalOrders = await Order.countDocuments(filter);
    const totalPages = Math.ceil(totalOrders / parseInt(limit));

    // Calculate order statistics
    const allUserOrders = await Order.find({ user_id: userId }).lean();
    const orderStats = {
      total: allUserOrders.length,
      pending: allUserOrders.filter((order) => order.status === "pending")
        .length,
      confirmed: allUserOrders.filter((order) => order.status === "confirmed")
        .length,
      processing: allUserOrders.filter((order) => order.status === "processing")
        .length,
      shipped: allUserOrders.filter((order) => order.status === "shipped")
        .length,
      delivered: allUserOrders.filter((order) => order.status === "delivered")
        .length,
      cancel_request: allUserOrders.filter((o) => o.status === "cancel_request")
        .length,
      cancelled: allUserOrders.filter((order) => order.status === "cancelled")
        .length,
      totalAmount: allUserOrders.reduce(
        (sum, order) => sum + (order.total_amount || 0),
        0
      ),
    };

    const data = {
      orders: enrichedOrders,
      pagination: {
        current_page: parseInt(page),
        total_pages: totalPages,
        total_orders: totalOrders,
        per_page: parseInt(limit),
        has_next: parseInt(page) < totalPages,
        has_prev: parseInt(page) > 1,
      },
      stats: orderStats,
      filter: {
        status,
        sort,
        order,
      },
    };

    return response.sendSuccess(
      res,
      data,
      "Lấy danh sách đơn hàng thành công",
      200
    );
  } catch (error) {
    console.error("Get user orders error:", error);
    return response.sendError(
      res,
      "Có lỗi xảy ra khi lấy danh sách đơn hàng",
      500,
      error.message
    );
  }
};

// Get order by ID
export const getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Validate orderId format
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return response.sendError(res, "ID đơn hàng không hợp lệ", 400);
    }

    //  Build query based on role
    let query = { _id: orderId };

    // Role-based access control
    if (userRole === "manager") {
      // Manager: chỉ xem đơn hàng thuộc chi nhánh của mình
      const manager = await User.findById(userId).select("branch_id");
      if (!manager?.branch_id) {
        return response.sendError(
          res,
          "Tài khoản manager chưa được gán chi nhánh",
          403
        );
      }
      query.branch_id = manager.branch_id;
    } else if (userRole !== "admin" && userRole !== "seller") {
      // Customer: chỉ xem đơn hàng của chính mình
      query.user_id = userId;
    }
    // Admin/Seller: xem tất cả đơn hàng

    //  Find order - KHÔNG populate dish_id nữa, dùng hardcoded data
    const order = await Order.findOne(query)
      .populate({
        path: "user_id",
        select: "name email phone",
      })
      .populate({
        path: "customer_id",
        select: "name phone address linked_user_id",
      })
      .populate({
        path: "branch_id",
        select: "name phone address code",
      })
      .lean();

    if (!order) {
      return response.sendError(
        res,
        "Không tìm thấy đơn hàng hoặc bạn không có quyền truy cập",
        404
      );
    }

    // Enrich items with dish existence check (optional)
    const enrichedItems = await Promise.all(
      order.items.map(async (item) => {
        const dishExists = await Dish.exists({ _id: item.dish_id });
        return {
          ...item,
          dish_exists: !!dishExists,
          dish_deleted: !dishExists,
        };
      })
    );

    //  Add order timeline
    const timeline = [
      {
        status: "pending",
        label: "Đơn hàng mới",
        date: order.created_at,
        completed: true,
        description: "Đơn hàng đã được tạo",
      },
      {
        status: "confirmed",
        label: "Đã xác nhận",
        date: order.confirmed_at,
        completed: ["confirmed", "processing", "shipped", "delivered"].includes(
          order.status
        ),
        description: "Đơn hàng đã được xác nhận",
      },
      {
        status: "processing",
        label: "Đang chuẩn bị",
        date: order.processing_at,
        completed: ["processing", "shipped", "delivered"].includes(
          order.status
        ),
        description: "Shop đang chuẩn bị hàng",
      },
      {
        status: "shipped",
        label: "Đang giao hàng",
        date: order.shipped_at,
        completed: ["shipped", "delivered"].includes(order.status),
        description: "Đơn hàng đang được giao",
      },
      {
        status: "delivered",
        label: "Đã giao thành công",
        date: order.delivered_at,
        completed: order.status === "delivered",
        description: "Đơn hàng đã giao thành công",
      },
    ];

    //  Add cancelled step if applicable
    if (order.status === "cancelled" || order.cancelled_at) {
      timeline.push({
        status: "cancelled",
        label: "Đã hủy",
        date: order.cancelled_at,
        completed: order.status === "cancelled",
        description: order.cancel_reason || "Đơn hàng đã bị hủy",
      });
    }

    //  Add cancel request step if applicable
    if (order.status === "cancel_request" || order.cancel_requested_at) {
      timeline.push({
        status: "cancel_request",
        label: "Yêu cầu hủy",
        date: order.cancel_requested_at,
        completed: order.status === "cancel_request",
        description: order.cancel_reason || "Đang chờ shop xác nhận hủy",
      });
    }

    const data = {
      order: {
        ...order,
        items: enrichedItems, //  Use enriched items with dish existence flag
        timeline,
      },
    };

    return response.sendSuccess(
      res,
      data,
      "Lấy thông tin đơn hàng thành công",
      200
    );
  } catch (error) {
    console.error("Get order by ID error:", error);
    return response.sendError(
      res,
      "Có lỗi xảy ra khi lấy thông tin đơn hàng",
      500,
      error.message
    );
  }
};

//  Cancel order
export const cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.userId;
    const { reason = "" } = req.body;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return response.sendError(res, "ID đơn hàng không hợp lệ", 400);
    }

    const order = await Order.findOne({ _id: orderId, user_id: userId });

    if (!order) {
      return response.sendError(res, "Không tìm thấy đơn hàng", 404);
    }

    const now = new Date();
    const refundPaymentMethod = getRefundPaymentMethod(order);

    // Logic:
    // 1. Pending/Confirmed: Cho phép hủy trực tiếp
    // 2. Processing: Gửi yêu cầu hủy (cancel_request)
    // 3. Các trạng thái khác: không cho phép hủy

    if (["pending", "confirmed"].includes(order.status)) {
      if (refundPaymentMethod === "vnpay" && order.payment_status === "paid") {
        const missingFields = getVnpayRefundMissingFields(order);
        if (missingFields.length > 0) {
          return response.sendError(
            res,
            `Thiếu thông tin giao dịch VNPay để hoàn tiền: ${missingFields.join(
              ", "
            )}`,
            400,
            missingFields.join(", ")
          );
        }
        try {
          const refundResult = await requestVnpayRefund({
            txnRef: order.vnpay_txn_ref,
            amount: order.vnpay_amount || order.total_amount * 100,
            transactionNo: order.vnpay_transaction_no,
            transactionDate: order.vnpay_create_date || order.vnpay_pay_date,
            ipAddr: req.ip,
            orderInfo: `Hoan tien don hang ${order.order_number}`,
          });

          if (!refundResult.success) {
            return response.sendError(
              res,
              `Hoàn tiền VNPay thất bại: ${refundResult.message}`,
              400,
              refundResult.message
            );
          }

          order.payment_status = "refunded";
          order.refund_status = "success";
          order.refund_amount = order.total_amount;
          order.refund_date = now;
          order.refund_response_code = refundResult.data?.vnp_ResponseCode;
          order.refund_message = refundResult.data?.vnp_Message;

          order.history = order.history || [];
          order.history.push({
            status: "hoan_tien",
            date: now,
            note: "Hoàn tiền VNPay thành công",
          });
        } catch (refundError) {
          return response.sendError(
            res,
            `Không thể hoàn tiền VNPay: ${refundError.message}`,
            400,
            refundError.message
          );
        }
      }

      if (
        refundPaymentMethod === "momo" &&
        order.payment_status === "paid"
      ) {
        const missingFields = getMomoRefundMissingFields(order);
        if (missingFields.length > 0) {
          return response.sendError(
            res,
            `Thiếu thông tin giao dịch MoMo để hoàn tiền: ${missingFields.join(
              ", "
            )}`,
            400,
            missingFields.join(", ")
          );
        }
        try {
          const refundResult = await requestMomoRefund({
            transId: order.momo_trans_id,
            amount: order.momo_amount || order.total_amount,
            description: `Hoan tien don hang ${order.order_number}`,
          });

          if (!refundResult.success) {
            return response.sendError(
              res,
              `Hoàn tiền MoMo thất bại: ${refundResult.message}`,
              400,
              refundResult.message
            );
          }

          order.payment_status = "refunded";
          order.refund_status = "success";
          order.refund_amount = order.total_amount;
          order.refund_date = now;
          order.refund_response_code = refundResult.data?.resultCode;
          order.refund_message = refundResult.data?.message;

          order.history = order.history || [];
          order.history.push({
            status: "hoan_tien",
            date: now,
            note: "Hoàn tiền MoMo thành công",
          });
        } catch (refundError) {
          return response.sendError(
            res,
            `Không thể hoàn tiền MoMo: ${refundError.message}`,
            400,
            refundError.message
          );
        }
      }

      if (
        refundPaymentMethod === "zalopay" &&
        order.payment_status === "paid"
      ) {
        const missingFields = getZalopayRefundMissingFields(order);
        if (missingFields.length > 0) {
          return response.sendError(
            res,
            `Thiếu thông tin giao dịch ZaloPay để hoàn tiền: ${missingFields.join(
              ", "
            )}`,
            400,
            missingFields.join(", ")
          );
        }
        try {
          const refundResult = await requestZalopayRefund({
            zpTransId: getZalopayRefundTransId(order),
            amount: order.zalopay_amount || order.total_amount,
            description: `Hoan tien don hang ${order.order_number}`,
          });

          if (!refundResult.success) {
            return response.sendError(
              res,
              `Hoàn tiền ZaloPay thất bại: ${refundResult.message}`,
              400,
              refundResult.message
            );
          }

          order.payment_status = "refunded";
          order.refund_status = "success";
          order.refund_amount = order.total_amount;
          order.refund_date = now;
          order.refund_response_code =
            refundResult.data?.return_code || refundResult.data?.sub_return_code;
          order.refund_message =
            refundResult.data?.return_message ||
            refundResult.data?.sub_return_message;

          order.history = order.history || [];
          order.history.push({
            status: "hoan_tien",
            date: now,
            note: "Hoàn tiền ZaloPay thành công",
          });
        } catch (refundError) {
          return response.sendError(
            res,
            `Không thể hoàn tiền ZaloPay: ${refundError.message}`,
            400,
            refundError.message
          );
        }
      }

      // Hủy trực tiếp cho pending/confirmed
      order.status = "cancelled";
      order.cancelled_at = now;
      order.cancel_reason = reason;

      order.history = order.history || [];
      order.history.push({
        status: "cancelled",
        date: now,
        note: reason || "Khách hàng hủy đơn hàng",
      });

      await order.save();

      // Xử lý hủy đơn trong user model (tăng cancel count)
      let userBanned = false;
      let bannedUntil = null;
      try {
        const user = await User.findById(userId);
        if (user) {
          await user.handleCancelOrder();
          // Check if user just got banned
          if (user.ban_info && user.ban_info.status === "banned_order") {
            userBanned = true;
            bannedUntil = user.ban_info.banned_until;
          }
        }
      } catch (userError) {
        console.error("Error handling cancel order for user:", userError);
      }

      try {
        // Thông báo cho user
        await notificationService.notifyOrderCancelled(order);
        // Thông báo cho tất cả managers của chi nhánh
        await notificationService.notifyOrderCancelledManagers(order);
      } catch (notifyError) {
        console.error("Error sending cancellation notification:", notifyError);
      }

      // Emit socket event to manager (branch room)
      try {
        const io = getIO();
        if (io && order.branch_id) {
          io.to(`branch:${order.branch_id}`).emit("order_status_updated", {
            order_id: order._id,
            order_number: order.order_number,
            status: "cancelled",
            branch_id: order.branch_id,
            updates: {
              cancelled_at: now,
              cancel_reason: reason,
            },
          });

          // Emit to user room for real-time update
          if (order.user_id) {
            const userId = order.user_id._id || order.user_id;
            const userRoom = `user:${userId.toString()}`;

            io.to(userRoom).emit("order_status_updated", {
              order_id: order._id,
              order_number: order.order_number,
              status: "cancelled",
              branch_id: order.branch_id,
              updates: {
                cancelled_at: now,
                cancel_reason: reason,
              },
            });
          }
        }
      } catch (socketError) {
        console.error("Error emitting socket event:", socketError);
      }

      const responseData = { order };
      if (userBanned) {
        responseData.user_banned = true;
        responseData.banned_until = bannedUntil;
      }

      return response.sendSuccess(
        res,
        responseData,
        "Hủy đơn hàng thành công",
        200
      );
    } else if (order.status === "processing") {
      // Gửi yêu cầu hủy cho đơn hàng đang chuẩn bị
      order.status = "cancel_request";
      order.cancel_reason = reason;
      order.cancel_requested_at = now;

      order.history = order.history || [];
      order.history.push({
        status: "cancel_request",
        date: now,
        note: reason || "Yêu cầu hủy đơn hàng",
      });

      await order.save();

      try {
        await notificationService.notifyCancelRequest(order);
      } catch (notifyError) {
        console.error(
          "Error sending cancel request notification:",
          notifyError
        );
      }

      // Emit socket event to manager (branch room)
      try {
        const io = getIO();
        if (io && order.branch_id) {
          io.to(`branch:${order.branch_id}`).emit("order_status_updated", {
            order_id: order._id,
            order_number: order.order_number,
            status: "cancel_request",
            branch_id: order.branch_id,
            updates: {
              cancel_requested_at: now,
              cancel_reason: reason,
            },
          });

          // Emit to user room for real-time update
          if (order.user_id) {
            const userId = order.user_id._id || order.user_id;
            const userRoom = `user:${userId.toString()}`;

            io.to(userRoom).emit("order_status_updated", {
              order_id: order._id,
              order_number: order.order_number,
              status: "cancel_request",
              branch_id: order.branch_id,
              updates: {
                cancel_requested_at: now,
                cancel_reason: reason,
              },
            });
          }
        }
      } catch (socketError) {
        console.error("Error emitting socket event:", socketError);
      }

      return response.sendSuccess(
        res,
        { order },
        "Đã gửi yêu cầu hủy đơn hàng đến shop",
        200
      );
    } else {
      // Các trạng thái khác (shipped, delivered, completed, cancelled) không thể hủy
      return response.sendError(
        res,
        `Không thể hủy đơn hàng ở trạng thái "${order.status}". Vui lòng liên hệ shop để được hỗ trợ.`,
        400
      );
    }
  } catch (error) {
    return response.sendError(
      res,
      "Có lỗi xảy ra khi hủy đơn hàng",
      500,
      error.message
    );
  }
};

//   Reorder - Add items to cart again
export const reorder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.userId;

    // Validate orderId
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return response.sendError(res, "ID đơn hàng không hợp lệ", 400);
    }

    // Find order
    const order = await Order.findOne({
      _id: orderId,
      user_id: userId,
    }).lean();

    if (!order) {
      return response.sendError(
        res,
        "Không tìm thấy đơn hàng hoặc bạn không có quyền truy cập",
        404
      );
    }

    const unavailableItems = [];
    let addedCount = 0;

    //  Process each order item
    for (const item of order.items) {
      const dishId = item.dish_id.toString();

      // Fetch dish
      const dish = await Dish.findById(dishId).lean();

      if (!dish) {
        unavailableItems.push({
          name: "Món ăn không tồn tại",
          reason: "Món ăn đã bị xóa",
        });
        continue;
      }

      // Check status
      if (dish.status === "inactive") {
        unavailableItems.push({
          name: dish.name,
          reason: "Sản phẩm không còn bán",
        });
        continue;
      }

      // Check stock
      if (dish.stock < item.quantity) {
        unavailableItems.push({
          name: dish.name,
          reason: `Chỉ còn ${dish.stock} sản phẩm`,
        });
        continue;
      }

      // Check if already in cart
      let cartItem = await CartItem.findOne({
        user_id: userId,
        dish_id: dishId,
      });

      if (cartItem) {
        // Update quantity
        const newQuantity = cartItem.quantity + item.quantity;
        cartItem.quantity = newQuantity;
        await cartItem.save();
      } else {
        // Create new cart item
        cartItem = new CartItem({
          user_id: userId,
          dish_id: dishId,
          quantity: item.quantity,
        });

        await cartItem.save();
        console.log(
          "➕ Added new cart item:",
          dish.name,
          "qty:",
          item.quantity
        );
      }

      addedCount++;
    }

    //  Get all cart items for response
    const cartItems = await CartItem.find({ user_id: userId })
      .populate("dish_id", "name images price sale_price stock status")
      .sort({ updated_at: -1 });

    const data = {
      cart: { items: cartItems },
      unavailable_items: unavailableItems,
      total_added: addedCount,
      total_unavailable: unavailableItems.length,
    };

    const message =
      unavailableItems.length > 0
        ? `Đã thêm ${addedCount} sản phẩm vào giỏ hàng. ${unavailableItems.length} sản phẩm không khả dụng.`
        : `Đã thêm ${addedCount} sản phẩm vào giỏ hàng`;

    return response.sendSuccess(res, data, message, 200);
  } catch (error) {
    console.error("❌ Reorder error:", error);
    return response.sendError(
      res,
      "Có lỗi xảy ra khi đặt lại đơn hàng",
      500,
      error.message
    );
  }
};

// Create new order
export const createOrder = async (req, res) => {
  try {
    const userId = req.user?.userId || null;
    const {
      items,
      shipping_info,
      payment_method,
      notes = "",
      voucherCodes = {},
      shipping_fee,
      freeship_value,
      discount_value,
      coin_discount,
      branch_id,
      order_channel = "delivery",
      order_type,
      table_id,
      dine_in_session_id,
      dine_in_session_token,
      vnpay_txn_ref,
      vnpay_transaction_no,
      vnpay_create_date,
      vnpay_pay_date,
      vnpay_amount,
      momo_request_id,
      momo_trans_id,
      momo_amount,
      zalopay_app_trans_id,
      zalopay_zp_trans_id,
      zalopay_amount,
    } = req.body;
    const { freeship, discount } = voucherCodes;
    const normalizedOrderChannel =
      order_channel === "dine_in_qr" || order_channel === "dine_in"
        ? order_channel
        : "delivery";
    const normalizedOrderType =
      order_type === "dine_in" ||
      normalizedOrderChannel === "dine_in" ||
      normalizedOrderChannel === "dine_in_qr"
        ? "dine_in"
        : "online";
    const isDineInQr = order_channel === "dine_in_qr";
    const isDineIn = normalizedOrderType === "dine_in";
    const resolvedPaymentMethod = resolveGatewayPaymentMethod({
      payment_method,
      vnpay_txn_ref,
      vnpay_transaction_no,
      momo_request_id,
      momo_trans_id,
      zalopay_app_trans_id,
      zalopay_zp_trans_id,
    });
    const normalizedShippingInfo = isDineIn
      ? undefined
      : normalizeShippingInfo(shipping_info);

    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      return response.sendError(
        res,
        "Danh sách sản phẩm không được để trống",
        400
      );
    }

    if (!["delivery", "dine_in", "dine_in_qr"].includes(order_channel)) {
      return response.sendError(res, "Kênh đặt hàng không hợp lệ", 400);
    }

    if (!isDineIn && !userId) {
      return response.sendError(res, "Vui lòng đăng nhập để đặt hàng", 401);
    }

    if (
      !isDineIn &&
      (!normalizedShippingInfo ||
        !normalizedShippingInfo.name ||
        !normalizedShippingInfo.phone ||
        !normalizedShippingInfo.address)
    ) {
      return response.sendError(res, "Thông tin giao hàng không đầy đủ", 400);
    }

    if (!resolvedPaymentMethod) {
      return response.sendError(
        res,
        "Phương thức thanh toán không được để trống",
        400
      );
    }

    let selectedBranchId = branch_id;
    let selectedTable = null;
    let dineInSession = null;

    if (isDineInQr) {
      if (
        (!dine_in_session_id ||
          !mongoose.Types.ObjectId.isValid(dine_in_session_id)) &&
        !dine_in_session_token
      ) {
        return response.sendError(res, "Phiên gọi món không hợp lệ", 400);
      }

      const dineInSessionFilter = mongoose.Types.ObjectId.isValid(
        dine_in_session_id
      )
        ? { _id: dine_in_session_id }
        : { session_token: dine_in_session_token };

      dineInSession = await DineInSession.findOne({
        ...dineInSessionFilter,
        status: "active",
        expires_at: { $gt: new Date() },
      }).lean();

      if (!dineInSession) {
        return response.sendError(
          res,
          "Phiên gọi món không tồn tại hoặc đã hết hạn",
          404
        );
      }

      if (table_id && table_id.toString() !== dineInSession.table_id.toString()) {
        return response.sendError(res, "Bàn không khớp với phiên gọi món", 400);
      }

      selectedTable = await StoreTable.findById(dineInSession.table_id).lean();
      if (!selectedTable || !selectedTable.active) {
        return response.sendError(
          res,
          "Bàn không tồn tại hoặc đã ngừng hoạt động",
          400
        );
      }

      selectedBranchId = dineInSession.branch_id;
    } else if (normalizedOrderChannel === "dine_in") {
      if (!table_id || !mongoose.Types.ObjectId.isValid(table_id)) {
        return response.sendError(res, "Bàn không hợp lệ", 400);
      }

      selectedTable = await StoreTable.findById(table_id).lean();
      if (!selectedTable || !selectedTable.active) {
        return response.sendError(
          res,
          "Bàn không tồn tại hoặc đã ngừng hoạt động",
          400
        );
      }

      if (
        selectedBranchId &&
        selectedTable.branch_id.toString() !== selectedBranchId.toString()
      ) {
        return response.sendError(res, "Bàn không thuộc chi nhánh đã chọn", 400);
      }

      selectedBranchId = selectedTable.branch_id;
    }

    // Validate branch selection
    if (!selectedBranchId || !mongoose.Types.ObjectId.isValid(selectedBranchId)) {
      return response.sendError(
        res,
        "Chi nhánh không hợp lệ hoặc chưa chọn",
        400
      );
    }

    const branch = await Branch.findById(selectedBranchId).lean();
    if (!branch || !branch.active) {
      return response.sendError(
        res,
        "Chi nhánh không tồn tại hoặc không hoạt động",
        400
      );
    }

    if (normalizedOrderChannel === "dine_in") {
      const userRole = req.user?.role;
      if (!["admin", "manager"].includes(userRole)) {
        return response.sendError(
          res,
          "Vui long dang nhap bang tai khoan quan ly de tao don tai ban",
          403
        );
      }

      if (userRole === "manager") {
        const managerBranchId = await getManagerBranchId(req.user?.userId);
        if (
          !managerBranchId ||
          managerBranchId.toString() !== branch._id.toString()
        ) {
          return response.sendError(
            res,
            "Ban khong co quyen tao don tai ban cho chi nhanh nay",
            403
          );
        }
      }
    }

    const orderNumber = await generateOrderNumber(normalizedOrderType);

    let subtotal = 0; // Tổng tiền sản phẩm
    const orderItems = [];

    // Process each item with hardcoded data
    for (const item of items) {
      if (!mongoose.Types.ObjectId.isValid(item.dish_id)) {
        return response.sendError(
          res,
          `ID sản phẩm ${item.dish_id} không hợp lệ`,
          400
        );
      }

      // Populate full dish data
      const dish = await Dish.findById(item.dish_id)
        .populate("category", "name")
        .lean();

      if (!dish) {
        return response.sendError(
          res,
          `Món ăn với ID ${item.dish_id} không tồn tại`,
          400
        );
      }

      if (dish.status !== "active") {
        return response.sendError(
          res,
          `Sản phẩm ${dish.name} không còn bán`,
          400
        );
      }

      if (!item.quantity || item.quantity < 1) {
        return response.sendError(
          res,
          `Số lượng sản phẩm ${dish.name} không hợp lệ`,
          400
        );
      }

      // Validate Flash Sale if item has flashSaleId
      let finalPrice = dish.sale_price || dish.price;
      let isFlashSale = false;

      if (item.flashSaleId) {
        const now = new Date();
        const flashSale = await FlashSale.findOne({
          _id: item.flashSaleId,
          startTime: { $lte: now },
          endTime: { $gte: now },
        });

        if (!flashSale) {
          return response.sendError(
            res,
            `Flash Sale đã kết thúc cho sản phẩm ${dish.name}`,
            400
          );
        }

        const flashSaleDish = flashSale.dishes.find(
          (fd) => fd.dish_id.toString() === item.dish_id.toString()
        );

        if (!flashSaleDish) {
          return response.sendError(
            res,
            `Sản phẩm ${dish.name} không có trong Flash Sale`,
            400
          );
        }

        const remaining = flashSaleDish.stock - flashSaleDish.sold;
        if (item.quantity > remaining) {
          return response.sendError(
            res,
            `Flash Sale cho ${dish.name} chỉ còn ${remaining} sản phẩm`,
            400
          );
        }

        // Final atomic validation and increment sold
        const updatedFlashSale = await FlashSale.findOneAndUpdate(
          {
            _id: item.flashSaleId,
            "dishes.dish_id": item.dish_id,
            $expr: {
              $gte: [
                {
                  $subtract: [
                    {
                      $arrayElemAt: [
                        {
                          $map: {
                            input: {
                              $filter: {
                                input: "$dishes",
                                cond: {
                                  $eq: ["$$this.dish_id", dish._id],
                                },
                              },
                            },
                            in: "$$this.stock",
                          },
                        },
                        0,
                      ],
                    },
                    {
                      $arrayElemAt: [
                        {
                          $map: {
                            input: {
                              $filter: {
                                input: "$dishes",
                                cond: {
                                  $eq: ["$$this.dish_id", dish._id],
                                },
                              },
                            },
                            in: "$$this.sold",
                          },
                        },
                        0,
                      ],
                    },
                  ],
                },
                item.quantity,
              ],
            },
          },
          {
            $inc: { "dishes.$[elem].sold": item.quantity },
          },
          {
            arrayFilters: [{ "elem.dish_id": dish._id }],
            new: true,
          }
        );

        if (!updatedFlashSale) {
          return response.sendError(
            res,
            `Flash Sale cho ${dish.name} đã hết hàng. Vui lòng thử lại!`,
            400
          );
        }

        finalPrice = flashSaleDish.salePrice;
        isFlashSale = true;
      }

      //  Get primary image from new structure
      const dishImage =
        dish.imageUrls?.[dish.defaultImageIndex || 0] ||
        dish.imageUrls?.[0] ||
        "";

      // Calculate prices (finalPrice already set above if Flash Sale)
      const itemTotal = finalPrice * item.quantity;
      const discountAmount = dish.price - finalPrice;
      const discountPercent =
        discountAmount > 0
          ? Math.round((discountAmount / dish.price) * 100)
          : 0;

      subtotal += itemTotal;

      // Create order item with hardcoded data
      orderItems.push({
        dish_id: dish._id,
        // Hardcoded dish info
        dish_name: dish.name,
        dish_slug: dish.slug,
        dish_image: dishImage,
        dish_description: dish.description || dish.short_description || "",
        category_name: dish.category?.name || "",
        category_id: dish.category?._id,
        // Pricing
        quantity: item.quantity,
        price: dish.price, // Giá gốc
        sale_price: finalPrice, // Giá sau khi giảm (Flash Sale hoặc Sale thường)
        original_price: dish.price, // Giá gốc (duplicate for clarity)
        total: itemTotal,
        // Additional info
        sku: dish.sku,
        weight: dish.weight,
        unit: dish.unit || "sản phẩm",
        // Variant
        variant: item.variant || {},
        // Discount
        discount_percent: discountPercent,
        discount_amount: discountAmount,
        // Product status
        was_on_sale:
          isFlashSale || (dish.sale_price > 0 && dish.sale_price < dish.price),
        was_featured: dish.featured || false,
        // Flash Sale info
        is_flash_sale: isFlashSale,
        flash_sale_id: item.flashSaleId || null,
        // Hometown
        hometown_origin: dish.hometown_origin || {},
        created_at: new Date(),
      });
    }

    // Sử dụng shipping_fee từ frontend, fallback về 30000 nếu không có
    const shippingFeeFromFrontend = isDineIn ? 0 : shipping_fee || 30000;
    const coinDiscount = isDineIn ? 0 : coin_discount || 0;

    // Tính total_amount = subtotal + shipping_fee - discount - freeship - coin_discount
    const totalAmount =
      subtotal +
      shippingFeeFromFrontend -
      (discount_value || 0) -
      (freeship_value || 0) -
      coinDiscount;

    if (isDineInQr) {
      const activeDineInOrder = await Order.findOne({
        table_id: selectedTable._id,
        branch_id: branch._id,
        order_type: "dine_in",
        status: { $in: ["pending", "confirmed", "processing"] },
        payment_status: { $ne: "paid" },
      }).sort({ created_at: -1 });

      if (activeDineInOrder) {
        const itemKey = (item) =>
          `${item.dish_id?.toString() || ""}:${JSON.stringify(item.variant || {})}`;
        const itemMap = new Map();

        for (const item of activeDineInOrder.items || []) {
          itemMap.set(itemKey(item), item);
        }

        for (const newItem of orderItems) {
          const key = itemKey(newItem);
          const existingItem = itemMap.get(key);

          if (existingItem) {
            existingItem.quantity += newItem.quantity;
            existingItem.total =
              (existingItem.sale_price || existingItem.price || 0) *
              existingItem.quantity;
          } else {
            activeDineInOrder.items.push(newItem);
            itemMap.set(
              key,
              activeDineInOrder.items[activeDineInOrder.items.length - 1]
            );
          }
        }

        activeDineInOrder.subtotal = (activeDineInOrder.items || []).reduce(
          (sum, item) => sum + (item.total || 0),
          0
        );
        activeDineInOrder.total_amount =
          activeDineInOrder.subtotal +
          (activeDineInOrder.shipping_fee || 0) -
          (activeDineInOrder.discount_value || 0) -
          (activeDineInOrder.freeship_value || 0) -
          0;
        activeDineInOrder.notes = [activeDineInOrder.notes, notes]
          .filter(Boolean)
          .join("\n");
        activeDineInOrder.history = activeDineInOrder.history || [];
        activeDineInOrder.history.push({
          status: activeDineInOrder.status,
          date: new Date(),
          note: "KhÃ¡ch gá»i thÃªm mÃ³n tá»« E-menu",
        });

        await activeDineInOrder.save();

        await DineInSession.findByIdAndUpdate(dineInSession._id, {
          last_order_id: activeDineInOrder._id,
          cart_items: [],
        });

        const updatedOrder = await Order.findById(activeDineInOrder._id)
          .populate("user_id", "name email phone")
          .populate("customer_id", "name phone address linked_user_id")
          .populate("branch_id", "name phone address code")
          .lean();

        try {
          const io = getIO();
          io.to(`branch:${branch._id}`).emit("order_status_updated", {
            order_id: updatedOrder._id,
            order_number: updatedOrder.order_number,
            branch_id: branch._id,
            status: updatedOrder.status,
            updates: {
              items: updatedOrder.items,
              subtotal: updatedOrder.subtotal,
              total_amount: updatedOrder.total_amount,
            },
          });
        } catch (socketError) {
          console.error("Socket dine-in QR add items error:", socketError);
        }

        return response.sendSuccess(
          res,
          { order: updatedOrder },
          "ÄÃ£ thÃªm mÃ³n vÃ o Ä‘Æ¡n Ä‘ang má»Ÿ",
          200
        );
      }
    }

    // Deduct coins from user if coin_discount is used
    if (coinDiscount > 0) {
      if (!userId) {
        return response.sendError(res, "Vui lòng đăng nhập để sử dụng xu", 401);
      }

      const user = await User.findById(userId);
      if (!user) {
        return response.sendError(res, "Người dùng không tồn tại", 404);
      }
      if (user.coin < coinDiscount) {
        return response.sendError(res, "Số xu không đủ để thanh toán", 400);
      }
      await User.findByIdAndUpdate(userId, {
        $inc: { coin: -coinDiscount },
      });
    }

    // Tạo đơn với hardcoded items
    const initialStatus = isDineIn ? "processing" : "pending";
    const now = new Date();
    const newOrder = new Order({
      user_id: userId,
      order_channel: normalizedOrderChannel,
      order_type: normalizedOrderType,
      table_id: isDineIn ? selectedTable._id : null,
      table_info: isDineIn
        ? {
            name: selectedTable.name,
            code: selectedTable.code,
          }
        : undefined,
      customer_id: null,
      dine_in_session_id: isDineInQr ? dineInSession._id : null,
      branch_id: branch._id,
      branch_info: {
        name: branch.name,
        phone: branch.phone,
        shop_id: branch.shop_id,
        address: {
          full_address: branch.address?.full_address || "",
          street: branch.address?.street || "",
          ward: branch.address?.ward || {},
          district: branch.address?.district || {},
          province: branch.address?.province || {},
          coordinates: branch.address?.coordinates || {},
        },
      },
      order_number: orderNumber,
      items: orderItems,
      subtotal: subtotal,
      total_amount: totalAmount,
      shipping_fee: shippingFeeFromFrontend,
      freeship_value: freeship_value || 0,
      discount_value: discount_value || 0,
      coin_discount: coinDiscount,
      payment_method: resolvedPaymentMethod,
      payment_status: ["vnpay", "momo", "zalopay"].includes(resolvedPaymentMethod)
        ? "paid"
        : "pending",
      payment_date: ["vnpay", "momo", "zalopay"].includes(resolvedPaymentMethod)
        ? now
        : undefined,
      vnpay_txn_ref: resolvedPaymentMethod === "vnpay" ? vnpay_txn_ref : undefined,
      vnpay_transaction_no:
        resolvedPaymentMethod === "vnpay" ? vnpay_transaction_no : undefined,
      vnpay_create_date:
        resolvedPaymentMethod === "vnpay" ? vnpay_create_date : undefined,
      vnpay_pay_date: resolvedPaymentMethod === "vnpay" ? vnpay_pay_date : undefined,
      vnpay_amount: resolvedPaymentMethod === "vnpay" ? vnpay_amount : undefined,
      momo_request_id:
        resolvedPaymentMethod === "momo" ? momo_request_id : undefined,
      momo_trans_id: resolvedPaymentMethod === "momo" ? momo_trans_id : undefined,
      momo_amount: resolvedPaymentMethod === "momo" ? momo_amount : undefined,
      zalopay_app_trans_id:
        resolvedPaymentMethod === "zalopay" ? zalopay_app_trans_id : undefined,
      zalopay_zp_trans_id:
        resolvedPaymentMethod === "zalopay" ? zalopay_zp_trans_id : undefined,
      zalopay_amount:
        resolvedPaymentMethod === "zalopay" ? zalopay_amount : undefined,
      shipping_info: normalizedShippingInfo,
      notes,
      status: initialStatus,
      processing_at: isDineIn ? now : undefined,
      history: [
        {
          status: initialStatus,
          date: now,
          note: isDineIn
            ? "Đơn ăn tại quán được xác nhận"
            : "Đơn hàng được tạo",
        },
        ...(["vnpay", "momo", "zalopay"].includes(resolvedPaymentMethod)
          ? [
              {
                status: "payment",
                date: now,
                note:
                  resolvedPaymentMethod === "vnpay"
                    ? "Thanh toán VNPay thành công"
                    : resolvedPaymentMethod === "momo"
                    ? "Thanh toán MoMo thành công"
                    : "Thanh toán ZaloPay thành công",
              },
            ]
          : []),
      ],
    });

    await newOrder.save();

    if (!isDineIn && newOrder.payment_status === "paid") {
      await awardOrderRewardCoins(newOrder);
    }

    if (isDineInQr) {
      await DineInSession.findByIdAndUpdate(dineInSession._id, {
        last_order_id: newOrder._id,
        cart_items: [],
      });
    }

    // Frontend sẽ chỉ xóa các items đã checkout (selected items)
    // để giữ lại các items khác trong giỏ hàng
    // await CartItem.deleteMany({ user_id: userId }); // COMMENTED OUT

    // Tăng usedCount cho voucher freeship nếu có
    if (freeship) {
      await Voucher.findOneAndUpdate(
        { code: freeship },
        { $inc: { usedCount: 1 } }
      );
    }

    // Tăng usedCount cho voucher discount nếu có
    if (discount) {
      await Voucher.findOneAndUpdate(
        { code: discount },
        { $inc: { usedCount: 1 } }
      );
    }

    // Không populate nữa, dùng hardcoded data
    const createdOrder = await Order.findById(newOrder._id)
      .populate("user_id", "name email phone")
      .populate("customer_id", "name phone address linked_user_id")
      .populate("branch_id", "name phone address code")
      .lean();

    const data = {
      order: createdOrder,
    };

    // Send socket notification to branch
    try {
      const io = getIO();
      io.to(`branch:${branch._id}`).emit("new_order", createdOrder);
      console.log(`📦 New order notification sent to branch:${branch._id}`);
    } catch (socketError) {
      console.error("Socket notification error:", socketError);
    }

    // Send notification
    try {
      await notificationService.notifyNewOrder(newOrder);
    } catch (notifyError) {
      console.error("Error sending notification:", notifyError);
    }

    return response.sendSuccess(res, data, "Đặt hàng thành công", 201);
  } catch (error) {
    console.error("Create order error:", error);
    return response.sendError(
      res,
      "Có lỗi xảy ra khi tạo đơn hàng",
      500,
      error.message
    );
  }
};

// Get order statistics
export const getOrderStats = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Validate userId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return response.sendError(res, "ID người dùng không hợp lệ", 400);
    }

    const stats = await Order.aggregate([
      { $match: { user_id: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          total_amount: { $sum: "$total_amount" },
        },
      },
    ]);

    const formattedStats = {
      total: 0,
      pending: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
      total_amount: 0,
    };

    stats.forEach((stat) => {
      formattedStats[stat._id] = stat.count;
      formattedStats.total += stat.count;
      formattedStats.total_amount += stat.total_amount;
    });

    const data = {
      stats: formattedStats,
    };

    return response.sendSuccess(
      res,
      data,
      "Lấy thống kê đơn hàng thành công",
      200
    );
  } catch (error) {
    console.error("Get order stats error:", error);
    return response.sendError(
      res,
      "Có lỗi xảy ra khi lấy thống kê đơn hàng",
      500,
      error.message
    );
  }
};

// Admin cập nhật thông tin vận chuyển đơn hàng
export const updateShippingInfo = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { carrier, tracking_number, shipping_status, note = "" } = req.body;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return response.sendError(res, "ID đơn hàng không hợp lệ", 400);
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return response.sendError(res, "Không tìm thấy đơn hàng", 404);
    }

    // Không cho phép cập nhật nếu đã hủy
    if (order.status === "cancelled") {
      return response.sendError(
        res,
        "Đơn hàng đã hủy, không thể cập nhật vận chuyển",
        400
      );
    }

    // Lưu trạng thái trước khi cập nhật để thông báo
    const previousStatus = order.status;

    //   Trường hợp đặc biệt: xử lý yêu cầu hủy (cancel_request)
    if (order.status === "cancel_request") {
      // Manager chấp nhận hủy: cancel_request → cancelled
      if (shipping_status === "cancelled") {
        const now = new Date();
        const refundPaymentMethod = getRefundPaymentMethod(order);

        if (refundPaymentMethod === "vnpay" && order.payment_status === "paid") {
          const missingFields = getVnpayRefundMissingFields(order);
          if (missingFields.length > 0) {
            return response.sendError(
              res,
              `Thiếu thông tin giao dịch VNPay để hoàn tiền: ${missingFields.join(
                ", "
              )}`,
              400,
              missingFields.join(", ")
            );
          }
          try {
            const refundResult = await requestVnpayRefund({
              txnRef: order.vnpay_txn_ref,
              amount: order.vnpay_amount || order.total_amount * 100,
              transactionNo: order.vnpay_transaction_no,
              transactionDate: order.vnpay_create_date || order.vnpay_pay_date,
              ipAddr: req.ip,
              orderInfo: `Hoan tien don hang ${order.order_number}`,
            });

            if (!refundResult.success) {
              return response.sendError(
                res,
                `Hoàn tiền VNPay thất bại: ${refundResult.message}`,
                400,
                refundResult.message
              );
            }

            order.payment_status = "refunded";
            order.refund_status = "success";
            order.refund_amount = order.total_amount;
            order.refund_date = now;
            order.refund_response_code = refundResult.data?.vnp_ResponseCode;
            order.refund_message = refundResult.data?.vnp_Message;

            order.history = order.history || [];
            order.history.push({
              status: "hoan_tien",
              date: now,
              note: "Hoàn tiền VNPay thành công",
            });
          } catch (refundError) {
            return response.sendError(
              res,
              `Không thể hoàn tiền VNPay: ${refundError.message}`,
              400,
              refundError.message
            );
          }
        }

        if (
          refundPaymentMethod === "momo" &&
          order.payment_status === "paid"
        ) {
          const missingFields = getMomoRefundMissingFields(order);
          if (missingFields.length > 0) {
            return response.sendError(
              res,
              `Thiếu thông tin giao dịch MoMo để hoàn tiền: ${missingFields.join(
                ", "
              )}`,
              400,
              missingFields.join(", ")
            );
          }
          try {
            const refundResult = await requestMomoRefund({
              transId: order.momo_trans_id,
              amount: order.momo_amount || order.total_amount,
              description: `Hoan tien don hang ${order.order_number}`,
            });

            if (!refundResult.success) {
              return response.sendError(
                res,
                `Hoàn tiền MoMo thất bại: ${refundResult.message}`,
                400,
                refundResult.message
              );
            }

            order.payment_status = "refunded";
            order.refund_status = "success";
            order.refund_amount = order.total_amount;
            order.refund_date = now;
            order.refund_response_code = refundResult.data?.resultCode;
            order.refund_message = refundResult.data?.message;

            order.history = order.history || [];
            order.history.push({
              status: "hoan_tien",
              date: now,
              note: "Hoàn tiền MoMo thành công",
            });
          } catch (refundError) {
            return response.sendError(
              res,
              `Không thể hoàn tiền MoMo: ${refundError.message}`,
              400,
              refundError.message
            );
          }
        }

        if (
          refundPaymentMethod === "zalopay" &&
          order.payment_status === "paid"
        ) {
          const missingFields = getZalopayRefundMissingFields(order);
          if (missingFields.length > 0) {
            return response.sendError(
              res,
              `Thiếu thông tin giao dịch ZaloPay để hoàn tiền: ${missingFields.join(
                ", "
              )}`,
              400,
              missingFields.join(", ")
            );
          }
          try {
            const refundResult = await requestZalopayRefund({
              zpTransId: getZalopayRefundTransId(order),
              amount: order.zalopay_amount || order.total_amount,
              description: `Hoan tien don hang ${order.order_number}`,
            });

            if (!refundResult.success) {
              return response.sendError(
                res,
                `Hoàn tiền ZaloPay thất bại: ${refundResult.message}`,
                400,
                refundResult.message
              );
            }

            order.payment_status = "refunded";
            order.refund_status = "success";
            order.refund_amount = order.total_amount;
            order.refund_date = now;
            order.refund_response_code =
              refundResult.data?.return_code ||
              refundResult.data?.sub_return_code;
            order.refund_message =
              refundResult.data?.return_message ||
              refundResult.data?.sub_return_message;

            order.history = order.history || [];
            order.history.push({
              status: "hoan_tien",
              date: now,
              note: "Hoàn tiền ZaloPay thành công",
            });
          } catch (refundError) {
            return response.sendError(
              res,
              `Không thể hoàn tiền ZaloPay: ${refundError.message}`,
              400,
              refundError.message
            );
          }
        }

        order.status = "cancelled";
        order.cancelled_at = now;
        order.history = order.history || [];
        order.history.push({
          status: "cancelled",
          date: now,
          note: note || "Shop đã chấp nhận yêu cầu hủy đơn",
        });
        await order.save();

        // Gửi thông báo khi đơn hàng bị hủy
        try {
          await notificationService.notifyOrderStatusUpdate(
            order,
            previousStatus
          );
          // Thông báo cho managers khi duyệt yêu cầu hủy
          await notificationService.notifyOrderCancelledManagers(order);
        } catch (notifyError) {
          console.error(
            "Không thể gửi thông báo cập nhật đơn hàng:",
            notifyError
          );
        }

        // Emit socket event to user room for real-time update
        try {
          const io = getIO();
          if (io && order.user_id) {
            const userId = order.user_id._id || order.user_id;
            const userRoom = `user:${userId.toString()}`;

            io.to(userRoom).emit("order_status_updated", {
              order_id: order._id,
              order_number: order.order_number,
              status: "cancelled",
              branch_id: order.branch_id,
              updates: {
                cancelled_at: order.cancelled_at,
                cancel_reason: order.cancel_reason,
              },
            });
          }
        } catch (socketError) {
          console.error("Error emitting socket event to user:", socketError);
        }

        return response.sendSuccess(
          res,
          { shipping: order },
          "Đã chấp nhận hủy đơn hàng",
          200
        );
      }
      // Manager từ chối hủy: cancel_request → processing (quay lại trạng thái trước đó)
      else if (shipping_status === "processing") {
        order.status = "processing";
        order.cancel_reason = undefined; // Xóa lý do hủy
        order.cancel_requested_at = undefined; // Xóa thời gian yêu cầu hủy
        order.cancel_request_rejected = true; // Đánh dấu yêu cầu hủy đã bị từ chối
        order.history = order.history || [];
        order.history.push({
          status: "processing",
          date: new Date(),
          note: note || "Shop đã từ chối yêu cầu hủy đơn",
        });
        await order.save();

        // Gửi thông báo khi từ chối hủy
        try {
          await notificationService.notifyOrderStatusUpdate(
            order,
            previousStatus
          );
        } catch (notifyError) {
          console.error(
            "Không thể gửi thông báo cập nhật đơn hàng:",
            notifyError
          );
        }

        // Emit socket event to user room for real-time update
        try {
          const io = getIO();
          if (io && order.user_id) {
            const userId = order.user_id._id || order.user_id;
            const userRoom = `user:${userId.toString()}`;

            io.to(userRoom).emit("order_status_updated", {
              order_id: order._id,
              order_number: order.order_number,
              status: "processing",
              branch_id: order.branch_id,
              updates: {
                processing_at: order.processing_at,
                cancel_request_rejected: true,
                cancel_reason: undefined,
                cancel_requested_at: undefined,
              },
            });
          }
        } catch (socketError) {
          console.error("Error emitting socket event to user:", socketError);
        }

        return response.sendSuccess(
          res,
          { shipping: order },
          "Đã từ chối yêu cầu hủy đơn hàng",
          200
        );
      } else if (shipping_status) {
        return response.sendError(
          res,
          "Chỉ có thể chấp nhận hủy (cancelled) hoặc từ chối (processing)",
          400
        );
      }
      // Nếu không gửi shipping_status mà chỉ cập nhật carrier / tracking_number thì cũng không hợp lệ
      return response.sendError(
        res,
        "Đơn đang yêu cầu hủy, vui lòng chọn chấp nhận hoặc từ chối",
        400
      );
    }

    const allowedStatusTransitions = {
      pending: ["processing"],
      confirmed: ["processing"], // Legacy orders created before the new manager flow
      processing: ["shipped"],
      shipped: [],
      delivered: [],
      completed: [],
      cancelled: [],
      cancel_request: [],
    };
    const validStatuses = Object.keys(allowedStatusTransitions);

    if (shipping_status && !validStatuses.includes(shipping_status)) {
      return response.sendError(res, "Trạng thái không hợp lệ", 400);
    }

    // Biến để theo dõi xem trạng thái có thay đổi không
    let statusChanged = false;

    const isAllowedTransition =
      shipping_status === order.status ||
      allowedStatusTransitions[order.status]?.includes(shipping_status);

    // Chỉ cho phép chuyển sang trạng thái tiếp theo trong luồng nghiệp vụ
    if (
      shipping_status &&
      isAllowedTransition
    ) {
      let ghnResult = null;
      if (
        shipping_status === "shipped" &&
        order.status !== "shipped" &&
        order.order_type !== "dine_in" &&
        !order.shipping_order_code
      ) {
        const orderForGhn = await Order.findById(order._id).populate(
          "branch_id",
          "name phone address shop_id"
        );
        ghnResult = await createGhnShippingOrder(orderForGhn);
        order.carrier = "GHN";
        order.shipping_provider = "ghn";
        order.shipping_order_code = ghnResult.orderCode;
        order.tracking_number = ghnResult.orderCode;
        order.shipping_status = "ready_to_pick";
        order.shipping_raw_response = ghnResult.raw;
        if (ghnResult.fee) {
          order.shipping_fee = ghnResult.fee;
        }
        if (ghnResult.expectedDeliveryTime) {
          order.shipping_expected_delivery_time = new Date(
            ghnResult.expectedDeliveryTime
          );
        }
      }

      statusChanged = shipping_status !== order.status;
      order.status = shipping_status;

      // Ghi nhận thời gian cho từng trạng thái
      if (shipping_status === "confirmed") order.confirmed_at = new Date();
      if (shipping_status === "processing") order.processing_at = new Date();
      if (shipping_status === "shipped") order.shipped_at = new Date();
      if (shipping_status === "delivered") order.delivered_at = new Date();
      if (
        shipping_status === "delivered" &&
        order.shipping_provider === "ghn" &&
        order.shipping_order_code
      ) {
        order.shipping_status = "delivered";
      }
      // Chỉ tăng soldCount khi completed
      if (shipping_status === "completed") {
        try {
          for (const item of order.items) {
            await Dish.findByIdAndUpdate(
              item.dish_id,
              {
                $inc: {
                  sold_quantity: item.quantity,
                },
              },
              { new: true }
            );
          }
        } catch (updateError) {
          console.error("Lỗi khi cập nhật số lượng đã bán:", updateError);
        }
      }
      order.history = order.history || [];
      order.history.push({
        status: shipping_status,
        date: new Date(),
        note:
          note ||
          (ghnResult?.orderCode
            ? `Đã tạo vận đơn GHN ${ghnResult.orderCode}`
            : ""),
      });
    } else if (shipping_status) {
      return response.sendError(
        res,
        "Không thể chuyển trạng thái theo luồng hiện tại",
        400
      );
    }

    // Kiểm tra xem có cập nhật carrier hoặc tracking number không
    const carrierChanged = carrier && carrier !== order.carrier;
    const trackingChanged =
      tracking_number && tracking_number !== order.tracking_number;

    if (carrier) order.carrier = carrier;
    if (tracking_number) order.tracking_number = tracking_number;

    await order.save();

    // Gửi thông báo nếu có thay đổi trạng thái hoặc thông tin vận chuyển quan trọng
    if (
      statusChanged ||
      (order.status === "shipped" && (carrierChanged || trackingChanged))
    ) {
      try {
        await notificationService.notifyOrderStatusUpdate(
          order,
          previousStatus
        );
      } catch (notifyError) {
        console.error(
          "Không thể gửi thông báo cập nhật đơn hàng:",
          notifyError
        );
      }

      // Emit socket event to user room for real-time update
      try {
        const io = getIO();
        if (io && order.user_id) {
          const userId = order.user_id._id || order.user_id;
          const userRoom = `user:${userId.toString()}`;

          io.to(userRoom).emit("order_status_updated", {
            order_id: order._id,
            order_number: order.order_number,
            status: order.status,
            branch_id: order.branch_id,
            updates: {
              confirmed_at: order.confirmed_at,
              processing_at: order.processing_at,
              shipped_at: order.shipped_at,
              delivered_at: order.delivered_at,
              carrier: order.carrier,
              tracking_number: order.tracking_number,
              shipping_order_code: order.shipping_order_code,
              shipping_status: order.shipping_status,
            },
          });
        }
      } catch (socketError) {
        console.error("Error emitting socket event to user:", socketError);
      }
    }

    return response.sendSuccess(
      res,
      { shipping: order },
      "Cập nhật thông tin vận chuyển thành công",
      200
    );
  } catch (error) {
    console.error("Update shipping info error:", error);
    return response.sendError(
      res,
      "Có lỗi xảy ra khi cập nhật vận chuyển",
      500,
      error.message
    );
  }
};

export const completeDineInOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const allowedPaymentMethods = ["cod", "momo", "vnpay", "zalopay"];
    const paymentMethod = req.body?.payment_method || "cod";

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return response.sendError(res, "ID đơn hàng không hợp lệ", 400);
    }

    if (!allowedPaymentMethods.includes(paymentMethod)) {
      return response.sendError(res, "Phương thức thanh toán không hợp lệ", 400);
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return response.sendError(res, "Không tìm thấy đơn hàng", 404);
    }

    if (order.order_type !== "dine_in") {
      return response.sendError(res, "Chỉ áp dụng cho đơn ăn tại quán", 400);
    }

    if (["completed", "cancelled"].includes(order.status)) {
      return response.sendError(
        res,
        "Đơn hàng đã hoàn thành hoặc đã hủy",
        400
      );
    }

    const userRole = req.user?.role;
    if (userRole === "manager") {
      const managerBranchId = await getManagerBranchId(req.user?.userId);
      if (
        !managerBranchId ||
        managerBranchId.toString() !== order.branch_id.toString()
      ) {
        return response.sendError(
          res,
          "Ban khong co quyen cap nhat don hang cua chi nhanh nay",
          403
        );
      }
    }
    const now = new Date();

    try {
      for (const item of order.items) {
        await Dish.findByIdAndUpdate(
          item.dish_id,
          {
            $inc: {
              sold_quantity: item.quantity,
            },
          },
          { new: true }
        );
      }
    } catch (updateError) {
      console.error("Lỗi khi cập nhật số lượng đã bán:", updateError);
    }

    order.status = "completed";
    order.completed_at = now;
    order.payment_method = paymentMethod;
    order.payment_status = "paid";
    order.payment_date = now;
    order.history = order.history || [];
    order.history.push({
      status: "completed",
      date: now,
      note: "Đơn ăn tại quán đã thanh toán",
      updated_by: req.user?.userId,
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
          payment_status: order.payment_status,
          payment_date: order.payment_date,
        },
      });
    } catch (socketError) {
      console.error("Socket notification error:", socketError);
    }

    return response.sendSuccess(
      res,
      { order },
      "Thanh toán đơn ăn tại quán thành công",
      200
    );
  } catch (error) {
    console.error("Complete dine-in order error:", error);
    return response.sendError(
      res,
      "Có lỗi xảy ra khi thanh toán đơn ăn tại quán",
      500,
      error.message
    );
  }
};

export const updateDineInOrderItems = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { items } = req.body;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return response.sendError(res, "ID đơn hàng không hợp lệ", 400);
    }

    if (!Array.isArray(items) || items.length === 0) {
      return response.sendError(res, "Danh sách món không hợp lệ", 400);
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return response.sendError(res, "Không tìm thấy đơn hàng", 404);
    }

    if (order.order_type !== "dine_in") {
      return response.sendError(res, "Chỉ áp dụng cho đơn ăn tại quán", 400);
    }

    if (["completed", "cancelled"].includes(order.status)) {
      return response.sendError(
        res,
        "Đơn hàng đã hoàn thành hoặc đã hủy",
        400
      );
    }

    const userRole = req.user?.role;
    if (userRole === "manager") {
      const managerBranchId = await getManagerBranchId(req.user?.userId);
      if (
        !managerBranchId ||
        managerBranchId.toString() !== order.branch_id.toString()
      ) {
        return response.sendError(
          res,
          "Ban khong co quyen cap nhat don hang cua chi nhanh nay",
          403
        );
      }
    }
    const currentQuantityByDish = (order.items || []).reduce((result, item) => {
      const dishId = item.dish_id?.toString();
      if (dishId) result[dishId] = (result[dishId] || 0) + item.quantity;
      return result;
    }, {});

    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      if (!mongoose.Types.ObjectId.isValid(item.dish_id)) {
        return response.sendError(
          res,
          `ID sản phẩm ${item.dish_id} không hợp lệ`,
          400
        );
      }

      const quantity = Number(item.quantity || 0);
      if (!quantity || quantity < 1) {
        return response.sendError(res, "Số lượng món ăn không hợp lệ", 400);
      }

      const dishId = item.dish_id.toString();
      if (quantity < (currentQuantityByDish[dishId] || 0)) {
        return response.sendError(
          res,
          "Không thể giảm món đã xác nhận trong đơn tại bàn",
          400
        );
      }

      const dish = await Dish.findById(item.dish_id)
        .populate("category", "name")
        .lean();

      if (!dish || dish.status !== "active") {
        return response.sendError(
          res,
          `Món ăn với ID ${item.dish_id} không tồn tại hoặc không còn bán`,
          400
        );
      }

      const finalPrice = dish.sale_price || dish.price || 0;
      const itemTotal = finalPrice * quantity;
      const discountAmount = Math.max((dish.price || 0) - finalPrice, 0);
      const discountPercent =
        discountAmount > 0 && dish.price
          ? Math.round((discountAmount / dish.price) * 100)
          : 0;
      const dishImage =
        dish.imageUrls?.[dish.defaultImageIndex || 0] ||
        dish.imageUrls?.[0] ||
        "";

      subtotal += itemTotal;
      orderItems.push({
        dish_id: dish._id,
        dish_name: dish.name,
        dish_slug: dish.slug,
        dish_image: dishImage,
        dish_description: dish.description || dish.short_description || "",
        category_name: dish.category?.name || "",
        category_id: dish.category?._id,
        quantity,
        price: dish.price,
        sale_price: finalPrice,
        original_price: dish.price,
        total: itemTotal,
        sku: dish.sku,
        weight: dish.weight,
        unit: dish.unit || "sản phẩm",
        variant: item.variant || {},
        discount_percent: discountPercent,
        discount_amount: discountAmount,
        was_on_sale: dish.sale_price > 0 && dish.sale_price < dish.price,
        was_featured: dish.featured || false,
        hometown_origin: dish.hometown_origin || {},
        created_at: new Date(),
      });
    }

    order.items = orderItems;
    order.subtotal = subtotal;
    order.total_amount =
      subtotal +
      (order.shipping_fee || 0) -
      (order.discount_value || 0) -
      (order.freeship_value || 0) -
      (order.coin_discount || 0);
    order.history = order.history || [];
    order.history.push({
      status: order.status,
      date: new Date(),
      note: "Cập nhật món đã xác nhận cho đơn tại bàn",
    });

    await order.save();

    const updatedOrder = await Order.findById(order._id)
      .populate("user_id", "name email phone")
      .populate("customer_id", "name phone address linked_user_id")
      .populate("branch_id", "name phone address code")
      .lean();

    try {
      const io = getIO();
      io.to(`branch:${order.branch_id}`).emit("order_status_updated", {
        order_id: order._id,
        order_number: order.order_number,
        branch_id: order.branch_id,
        status: order.status,
        updates: {
          items: order.items,
          total_amount: order.total_amount,
          subtotal: order.subtotal,
        },
      });
    } catch (socketError) {
      console.error("Socket dine-in items update error:", socketError);
    }

    return response.sendSuccess(
      res,
      { order: updatedOrder },
      "Xác nhận thêm món thành công",
      200
    );
  } catch (error) {
    console.error("Update dine-in order items error:", error);
    return response.sendError(
      res,
      "Có lỗi xảy ra khi xác nhận thêm món",
      500,
      error.message
    );
  }
};

export const getAllOrders = async (req, res) => {
  try {
    const {
      status = "all",
      page = 1,
      limit = 10,
      sort = "created_at",
      order = "desc",
      branch_id,
      search,
      startDate,
      endDate,
    } = req.query;

    const filter = {};

    if (status && status !== "all") {
      filter.status = status;
    }

    if (branch_id && branch_id !== "all") {
      if (!mongoose.Types.ObjectId.isValid(branch_id)) {
        return response.sendError(res, "ID chi nhánh không hợp lệ", 400);
      }
      filter.branch_id = branch_id;
    }

    if (search) {
      filter.$or = [
        { order_number: { $regex: search, $options: "i" } },
        { "shipping_info.name": { $regex: search, $options: "i" } },
        { "shipping_info.phone": { $regex: search, $options: "i" } },
      ];
    }

    if (startDate || endDate) {
      filter.created_at = {};
      if (startDate) filter.created_at.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.created_at.$lte = end;
      }
    }

    const sortObj = { [sort]: order === "desc" ? -1 : 1 };
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const orders = await Order.find(filter)
      .populate("user_id", "name email phone")
      .populate("branch_id", "name phone address code")
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const totalOrders = await Order.countDocuments(filter);
    const totalPages = Math.ceil(totalOrders / parseInt(limit));

    const allFilteredOrders = await Order.find(filter).lean();
    const stats = calculateOrderStats(allFilteredOrders);

    return response.sendSuccess(
      res,
      {
        orders,
        pagination: {
          current_page: parseInt(page),
          total_pages: totalPages,
          total_orders: totalOrders,
          per_page: parseInt(limit),
        },
        stats,
        filter: {
          status,
          branch_id: branch_id || null,
          search: search || null,
          sort,
          order,
          startDate: startDate || null,
          endDate: endDate || null,
        },
      },
      "Lấy danh sách đơn hàng thành công",
      200
    );
  } catch (error) {
    return response.sendError(
      res,
      "Có lỗi xảy ra khi lấy danh sách đơn hàng",
      500,
      error.message
    );
  }
};

export const ghnWebhook = async (req, res) => {
  try {
    const webhookSecret = process.env.GHN_WEBHOOK_SECRET || "";
    if (webhookSecret) {
      const receivedSecret =
        req.headers["x-ghn-webhook-secret"] ||
        req.headers["x-webhook-secret"] ||
        req.query?.secret;
      if (String(receivedSecret || "") !== webhookSecret) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }
    }

    const payload = req.body || {};
    const orderCode = getGhnWebhookValue(
      payload,
      "OrderCode",
      "order_code",
      "orderCode",
      "TrackingCode",
      "tracking_code",
    );
    const clientOrderCode = getGhnWebhookValue(
      payload,
      "ClientOrderCode",
      "client_order_code",
      "clientOrderCode",
    );

    if (!orderCode && !clientOrderCode) {
      return res.status(200).json({
        success: true,
        message: "Missing GHN order code, ignored",
      });
    }

    const order = await Order.findOne({
      $or: [
        ...(orderCode
          ? [
              { shipping_order_code: orderCode },
              { tracking_number: orderCode },
            ]
          : []),
        ...(clientOrderCode ? [{ order_number: clientOrderCode }] : []),
      ],
    });

    if (!order) {
      return res.status(200).json({
        success: true,
        message: "Order not found, ignored",
      });
    }

    if (orderCode) {
      order.shipping_order_code = order.shipping_order_code || orderCode;
      order.tracking_number = order.tracking_number || orderCode;
    }

    await applyGhnStatusToOrder(order, payload);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("GHN webhook error:", error);
    return res.status(200).json({
      success: false,
      message: error.message,
    });
  }
};

export const syncGhnShippingStatus = async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return response.sendError(res, "ID đơn hàng không hợp lệ", 400);
    }

    const order = await Order.findById(orderId).populate(
      "branch_id",
      "shop_id"
    );
    if (!order) {
      return response.sendError(res, "Không tìm thấy đơn hàng", 404);
    }

    const orderCode = order.shipping_order_code || order.tracking_number;
    if (!orderCode) {
      return response.sendError(res, "Đơn hàng chưa có mã vận đơn GHN", 400);
    }

    const ghnShopId = getOrderGhnShopId(order);
    const ghnDetail = await getGhnShippingOrderDetail(orderCode, ghnShopId);
    const result = await applyGhnStatusToOrder(order, ghnDetail);

    return response.sendSuccess(
      res,
      {
        order: result.order,
        ghn: ghnDetail,
      },
      "Đồng bộ trạng thái GHN thành công",
      200,
    );
  } catch (error) {
    console.error("Sync GHN shipping status error:", error);
    return response.sendError(
      res,
      "Có lỗi xảy ra khi đồng bộ trạng thái GHN",
      500,
      error.message,
    );
  }
};

export const syncPendingGhnOrders = async () => {
  const orders = await Order.find({
    shipping_provider: "ghn",
    shipping_order_code: { $exists: true, $ne: "" },
    status: { $nin: ["delivered", "completed", "cancelled"] },
  })
    .populate("branch_id", "shop_id")
    .sort({ updated_at: 1 })
    .limit(Number(process.env.GHN_AUTO_SYNC_LIMIT || 50));

  if (orders.length === 0) return { checked: 0, updated: 0 };

  let updated = 0;
  for (const order of orders) {
    try {
      const orderCode = order.shipping_order_code || order.tracking_number;
      if (!orderCode) continue;

      const ghnShopId = getOrderGhnShopId(order);
      const ghnDetail = await getGhnShippingOrderDetail(orderCode, ghnShopId);
      const result = await applyGhnStatusToOrder(order, ghnDetail);
      if (result.statusChanged) updated += 1;
    } catch (error) {
      console.error(
        `Không thể tự đồng bộ GHN cho đơn ${order.order_number}:`,
        error.message,
      );
    }
  }

  return { checked: orders.length, updated };
};

// Manager: Get orders by branch
export const getOrdersByBranch = async (req, res) => {
  try {
    const { branchId } = req.params;
    const {
      status,
      date = "today",
      search,
      page = 1,
      limit = 50,
      order_type,
    } = req.query;

    // Verify branch exists and manager has access
    const branch = await Branch.findById(branchId);
    if (!branch) {
      return response.sendError(res, "Chi nhánh không tồn tại", 404);
    }

    // If user is manager, verify they manage this branch
    if (req.user.role === "manager") {
      const managerBranchId = await getManagerBranchId(req.user.userId);
      if (!managerBranchId || managerBranchId.toString() !== branchId) {
        return response.sendError(
          res,
          "Ban khong co quyen truy cap chi nhanh nay",
          403
        );
      }
    }
    const filter = { branch_id: branchId };

    if (order_type === "dine_in") {
      filter.order_type = "dine_in";
    } else if (order_type === "online") {
      filter.$or = [{ order_type: "online" }, { order_type: { $exists: false } }];
    }

    // Status filter
    if (status && status !== "all") {
      filter.status = status;
    }

    // Date filter
    const now = new Date();
    let startDate;

    switch (date) {
      case "today":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        filter.created_at = { $gte: startDate };
        break;
      case "yesterday":
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        startDate = new Date(
          yesterday.getFullYear(),
          yesterday.getMonth(),
          yesterday.getDate()
        );
        const endDate = new Date(startDate);
        endDate.setHours(23, 59, 59, 999);
        filter.created_at = { $gte: startDate, $lte: endDate };
        break;
      case "week":
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        filter.created_at = { $gte: startDate };
        break;
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        filter.created_at = { $gte: startDate };
        break;
      // 'all' - no date filter
    }

    // Search filter
    if (search) {
      const searchConditions = [
        { order_number: { $regex: search, $options: "i" } },
        {
          "shipping_info.name": { $regex: search, $options: "i" },
        },
        { "shipping_info.phone": { $regex: search, $options: "i" } },
      ];

      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: searchConditions }];
        delete filter.$or;
      } else {
        filter.$or = searchConditions;
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const orders = await Order.find(filter)
      .populate("user_id", "name email phone")
      .populate("customer_id", "name phone address linked_user_id")
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const totalOrders = await Order.countDocuments(filter);

    return response.sendSuccess(
      res,
      {
        orders,
        pagination: {
          current_page: parseInt(page),
          total_orders: totalOrders,
          per_page: parseInt(limit),
        },
      },
      "Lấy danh sách đơn hàng thành công",
      200
    );
  } catch (error) {
    console.error("Get orders by branch error:", error);
    return response.sendError(
      res,
      "Có lỗi xảy ra khi lấy danh sách đơn hàng",
      500,
      error.message
    );
  }
};

// Customer: Confirm received order
export const confirmReceived = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return response.sendError(res, "ID đơn hàng không hợp lệ", 400);
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return response.sendError(res, "Không tìm thấy đơn hàng", 404);
    }

    // Verify order belongs to user
    if (order.user_id.toString() !== userId) {
      return response.sendError(
        res,
        "Bạn không có quyền xác nhận đơn hàng này",
        403
      );
    }

    // Only allow confirmation for delivered orders
    if (order.status !== "delivered") {
      return response.sendError(
        res,
        "Chỉ có thể xác nhận đơn hàng đã được giao",
        400
      );
    }

    // Chỉ tăng soldCount khi chuyển sang completed
    if (order.status !== "completed") {
      try {
        for (const item of order.items) {
          await Dish.findByIdAndUpdate(
            item.dish_id,
            {
              $inc: {
                sold_quantity: item.quantity,
              },
            },
            { new: true }
          );
        }
      } catch (updateError) {
        console.error("Lỗi khi cập nhật số lượng đã bán:", updateError);
      }
    }
    // Update order status
    order.status = "completed";
    order.completed_at = new Date();
    order.customer_confirmed = true;
    order.auto_completed = false;

    // Hủy auto-complete schedule nếu có
    orderSchedulerService.cancelAutoComplete(orderId);

    // Cập nhật payment_status thành paid khi đơn hàng hoàn thành
    if (order.payment_status !== "paid") {
      order.payment_status = "paid";
      order.payment_date = new Date();
    }

    // Add to history
    order.history = order.history || [];
    order.history.push({
      status: "completed",
      date: new Date(),
      note: "Khách hàng xác nhận đã nhận hàng",
    });

    await order.save();

    // Reset cancel order streak khi đơn hàng hoàn thành thành công
    await awardOrderRewardCoins(order);

    try {
      const user = await User.findById(userId);
      if (user) {
        await user.resetCancelOrderStreak();
      }
    } catch (userError) {
      console.error("Error resetting cancel order streak:", userError);
    }

    // Send socket notification to branch
    try {
      const io = getIO();
      io.to(`branch:${order.branch_id}`).emit("order_confirmed_by_customer", {
        order_id: order._id,
        order_number: order.order_number,
        branch_id: order.branch_id,
        status: "completed",
      });

      // Emit to user room for real-time update
      if (order.user_id) {
        const userId = order.user_id._id || order.user_id;
        const userRoom = `user:${userId.toString()}`;
        console.log(`📤 Emitting confirmed to user room: ${userRoom}`);

        io.to(userRoom).emit("order_status_updated", {
          order_id: order._id,
          order_number: order.order_number,
          branch_id: order.branch_id,
          status: "completed",
          updates: {
            completed_at: order.completed_at,
            customer_confirmed: true,
          },
        });
        console.log(`✅ Socket emitted: order confirmed to user:${userId}`);
      }
    } catch (socketError) {
      console.error("Socket notification error:", socketError);
    }

    // Send notification
    try {
      await notificationService.notifyOrderStatusUpdate(order, "delivered");
    } catch (notifyError) {
      console.error("Notification error:", notifyError);
    }

    return response.sendSuccess(
      res,
      { order },
      "Xác nhận đã nhận hàng thành công",
      200
    );
  } catch (error) {
    console.error("Confirm received error:", error);
    return response.sendError(
      res,
      "Có lỗi xảy ra khi xác nhận đơn hàng",
      500,
      error.message
    );
  }
};

// Customer reports not received for delivered orders
export const reportNotReceived = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return response.sendError(res, "ID đơn hàng không hợp lệ", 400);
    }

    const order = await Order.findById(orderId).populate("branch_id");
    if (!order) {
      return response.sendError(res, "Không tìm thấy đơn hàng", 404);
    }

    // Verify order belongs to user
    if (order.user_id.toString() !== userId) {
      return response.sendError(
        res,
        "Bạn không có quyền báo cáo đơn hàng này",
        403
      );
    }

    // Only allow reporting for delivered orders
    if (order.status !== "delivered") {
      return response.sendError(
        res,
        "Chỉ có thể báo cáo đơn hàng đã được giao",
        400
      );
    }

    // Update order status
    order.status = "completed";
    order.completed_at = new Date();
    order.customer_confirmed = false;
    order.not_received = true;
    order.not_received_at = new Date();

    // Cancel auto-complete schedule
    orderSchedulerService.cancelAutoComplete(orderId);

    // Add to history
    order.history = order.history || [];
    order.history.push({
      status: "completed",
      date: new Date(),
      note: "Khách hàng báo cáo CHƯA nhận được hàng",
    });

    await order.save();

    // Send socket notification to branch about not received report
    try {
      const io = getIO();
      io.to(`branch:${order.branch_id._id}`).emit("order_not_received_report", {
        order_id: order._id,
        order_number: order.order_number,
        branch_id: order.branch_id._id,
        branch_name: order.branch_id.name,
        reported_at: order.not_received_at,
        customer_name: order.customer_name,
      });

      // Emit to user room for real-time update
      if (order.user_id) {
        const userId = order.user_id._id || order.user_id;
        const userRoom = `user:${userId.toString()}`;
        io.to(userRoom).emit("order_status_updated", {
          order_id: order._id,
          order_number: order.order_number,
          status: "completed",
          not_received: true,
        });
      }
    } catch (socketError) {
      console.error("Socket notification error:", socketError);
    }

    // Send notification to branch managers
    try {
      const branchId = order.branch_id._id || order.branch_id;

      await notificationService.notifyBranchManagers(branchId, {
        type: "not_received_report",
        title: "Báo cáo chưa nhận hàng",
        message: `Khách hàng ${order.shipping_info.name} báo cáo CHƯA nhận được đơn hàng #${order.order_number}. Vui lòng kiểm tra và xử lý ngay.`,
        reference_id: order._id,
        reference_model: "Order",
        sender_id: order.user_id,
      });

      console.log(`✅ Not-received notification sent successfully`);
    } catch (notifyError) {
      console.error("❌ Notification error:", notifyError);
    }

    return response.sendSuccess(
      res,
      { order },
      "Đã ghi nhận báo cáo của bạn. Chúng tôi sẽ xử lý trong thời gian sớm nhất",
      200
    );
  } catch (error) {
    console.error("Report not received error:", error);
    return response.sendError(
      res,
      "Có lỗi xảy ra khi gửi báo cáo",
      500,
      error.message
    );
  }
};

// Schedule auto-completion for delivered orders (called internally or via cron)
export const scheduleAutoComplete = async (orderId) => {
  try {
    const order = await Order.findById(orderId);
    if (!order || order.status !== "delivered") {
      return;
    }

    // Set auto-complete time to 1 hour from now
    const autoCompleteTime = new Date();
    autoCompleteTime.setHours(autoCompleteTime.getHours() + 1);

    order.auto_complete_scheduled_at = autoCompleteTime;
    await order.save();

    // Schedule the auto-complete
    setTimeout(async () => {
      await autoCompleteOrder(orderId);
    }, 60 * 60 * 1000); // 1 hour in milliseconds

    console.log(
      `Auto-complete scheduled for order ${order.order_number} at ${autoCompleteTime}`
    );
  } catch (error) {
    console.error("Schedule auto-complete error:", error);
  }
};

// Auto-complete order after 1 hour
export const autoCompleteOrder = async (orderId) => {
  try {
    const order = await Order.findById(orderId);
    if (!order) {
      console.log(`Order ${orderId} not found for auto-completion`);
      return;
    }

    // Only auto-complete if still in delivered status
    if (order.status !== "delivered") {
      console.log(
        `Order ${order.order_number} is not in delivered status, skipping auto-completion`
      );
      return;
    }

    // Update order status
    order.status = "completed";
    order.completed_at = new Date();
    order.customer_confirmed = false;
    order.auto_completed = true;

    // Add to history
    order.history = order.history || [];
    order.history.push({
      status: "completed",
      date: new Date(),
      note: "Tự động hoàn thành sau 1 giờ",
    });

    await order.save();

    await awardOrderRewardCoins(order);

    // Send socket notification
    try {
      const io = getIO();
      io.to(`branch:${order.branch_id}`).emit("order_status_updated", {
        order_id: order._id,
        order_number: order.order_number,
        branch_id: order.branch_id,
        status: "completed",
        updates: {
          completed_at: order.completed_at,
          auto_completed: true,
        },
      });

      // Emit to user room for real-time update
      if (order.user_id) {
        const userId = order.user_id._id || order.user_id;
        const userRoom = `user:${userId.toString()}`;
        console.log(`📤 Emitting auto-completed to user room: ${userRoom}`);

        io.to(userRoom).emit("order_status_updated", {
          order_id: order._id,
          order_number: order.order_number,
          branch_id: order.branch_id,
          status: "completed",
          updates: {
            completed_at: order.completed_at,
            auto_completed: true,
          },
        });
        console.log(
          `✅ Socket emitted: order auto-completed to user:${userId}`
        );
      }
    } catch (socketError) {
      console.error("Socket notification error:", socketError);
    }

    console.log(`Order ${order.order_number} auto-completed successfully`);
  } catch (error) {
    console.error("Auto-complete order error:", error);
  }
};

export const searchOrders = async (req, res) => {
  try {
    const {
      q,
      status,
      branch_id,
      page = 1,
      limit = 10,
      sort = "created_at",
      order = "desc",
      startDate,
      endDate,
    } = req.query;

    if (!q || q.trim() === "") {
      return response.sendError(res, "Vui lòng nhập từ khóa tìm kiếm", 400);
    }

    const normalizedQuery = removeVietnameseTones(q.toLowerCase());
    const words = normalizedQuery.split(/\s+/).filter(Boolean);

    const filter = {};

    if (req.user.role === "user") {
      filter.user_id = req.user.userId;
    }

    if (status && status !== "all") {
      filter.status = status;
    }

    if (branch_id && branch_id !== "all") {
      if (!mongoose.Types.ObjectId.isValid(branch_id)) {
        return response.sendError(res, "ID chi nhánh không hợp lệ", 400);
      }
      filter.branch_id = branch_id;
    }

    if (startDate || endDate) {
      filter.created_at = {};
      if (startDate) filter.created_at.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.created_at.$lte = end;
      }
    }

    const dishSearchConditions = words.flatMap((word) => [
      { name: { $regex: word, $options: "i" } },
      { name: createVietnameseRegex(word) },
    ]);

    const matchingDishes = await Dish.find({
      $or: dishSearchConditions,
    })
      .select("_id name")
      .lean();

    const matchingDishIds = matchingDishes.map((d) => d._id);

    const orderNumberConditions = words.flatMap((word) => [
      { order_number: { $regex: word, $options: "i" } },
      { order_number: createVietnameseRegex(word) },
    ]);

    const searchConditions = [];
    if (orderNumberConditions.length > 0) {
      searchConditions.push({ $or: orderNumberConditions });
    }
    if (matchingDishIds.length > 0) {
      searchConditions.push({ "items.dish_id": { $in: matchingDishIds } });
    }

    if (searchConditions.length === 0) {
      return response.sendSuccess(
        res,
        {
          orders: [],
          pagination: {
            current_page: parseInt(page),
            total_pages: 0,
            total_orders: 0,
            per_page: parseInt(limit),
          },
          search_query: q,
        },
        "Không tìm thấy đơn hàng nào",
        200
      );
    }

    filter.$or = searchConditions;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const orders = await Order.find(filter)
      .populate("items.dish_id", "name images price")
      .populate("user_id", "name email phone")
      .populate("branch_id", "name phone address")
      .sort({ [sort]: order === "desc" ? -1 : 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const totalOrders = await Order.countDocuments(filter);
    const totalPages = Math.ceil(totalOrders / parseInt(limit));

    const sortedResults = sortByRelevance(orders, q, [
      "order_number",
      "items.dish_id.name",
    ]);

    const ordersWithScores = sortedResults.map((result) => ({
      ...result.item,
      relevance_score: result.score.toFixed(2),
    }));

    return response.sendSuccess(
      res,
      {
        orders: ordersWithScores,
        pagination: {
          current_page: parseInt(page),
          total_pages: totalPages,
          total_orders: totalOrders,
          per_page: parseInt(limit),
          has_next: parseInt(page) < totalPages,
          has_prev: parseInt(page) > 1,
        },
        search_query: q,
        filter: {
          status,
          branch_id: branch_id || null,
          sort,
          order,
          startDate: startDate || null,
          endDate: endDate || null,
        },
      },
      `Tìm thấy ${totalOrders} đơn hàng phù hợp`,
      200
    );
  } catch (error) {
    console.error("Search orders error:", error);
    return response.sendError(
      res,
      "Có lỗi xảy ra khi tìm kiếm đơn hàng",
      500,
      error.message
    );
  }
};
