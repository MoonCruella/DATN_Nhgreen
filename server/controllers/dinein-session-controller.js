import crypto from "crypto";
import mongoose from "mongoose";
import DineInSession from "../models/dinein-session-model.js";
import StoreTable from "../models/store-table-model.js";
import Order from "../models/order-model.js";
import response from "../helpers/response.js";
import { syncZalopayOrderStatus } from "./zalopay-controller.js";
import { getIO } from "../config/socket.js";

const SESSION_TTL_HOURS = 12;

const createSessionToken = () => crypto.randomBytes(32).toString("hex");

const getExpiresAt = () => {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + SESSION_TTL_HOURS);
  return expiresAt;
};

const getActiveTableByQrToken = async (qrToken) => {
  return StoreTable.findOne({ qr_token: qrToken, active: true })
    .populate("branch_id", "name phone address code active")
    .lean();
};

export const scanDineInQr = async (req, res) => {
  try {
    const { qrToken } = req.params;

    if (!qrToken) {
      return response.sendError(res, "QR không hợp lệ", 400);
    }

    const table = await getActiveTableByQrToken(qrToken);
    if (!table || !table.branch_id?.active) {
      return response.sendError(
        res,
        "Bàn không tồn tại hoặc chi nhánh không hoạt động",
        404
      );
    }

    return response.sendSuccess(
      res,
      {
        table: {
          _id: table._id,
          name: table.name,
          code: table.code,
        },
        branch: table.branch_id,
      },
      "Quét QR thành công",
      200
    );
  } catch (error) {
    return response.sendError(
      res,
      "Có lỗi xảy ra khi quét QR",
      500,
      error.message
    );
  }
};

export const createDineInSession = async (req, res) => {
  try {
    const { qr_token, guest_info = {} } = req.body;

    if (!qr_token) {
      return response.sendError(res, "QR không hợp lệ", 400);
    }

    const table = await getActiveTableByQrToken(qr_token);
    if (!table || !table.branch_id?.active) {
      return response.sendError(
        res,
        "Bàn không tồn tại hoặc chi nhánh không hoạt động",
        404
      );
    }

    const existingSession = await DineInSession.findOne({
      table_id: table._id,
      branch_id: table.branch_id._id,
      status: "active",
      expires_at: { $gt: new Date() },
    }).lean();

    if (existingSession) {
      return response.sendSuccess(
        res,
        {
          session: {
            _id: existingSession._id,
            session_token: existingSession.session_token,
            table_id: {
              _id: table._id,
              name: table.name,
              code: table.code,
            },
            branch_id: table.branch_id,
            status: existingSession.status,
            expires_at: existingSession.expires_at,
            guest_info: existingSession.guest_info,
          },
          table: {
            _id: table._id,
            name: table.name,
            code: table.code,
          },
          branch: table.branch_id,
        },
        "Láº¥y phiÃªn gá»i mÃ³n Ä‘ang má»Ÿ thÃ nh cÃ´ng",
        200
      );
    }

    const session = new DineInSession({
      session_token: createSessionToken(),
      table_id: table._id,
      branch_id: table.branch_id._id,
      guest_info: {
        name: guest_info.name || "",
        phone: guest_info.phone || "",
      },
      cart_items: [],
      expires_at: getExpiresAt(),
    });

    await session.save();

    return response.sendSuccess(
      res,
      {
        session: {
          _id: session._id,
          session_token: session.session_token,
          table_id: {
            _id: table._id,
            name: table.name,
            code: table.code,
          },
          branch_id: table.branch_id,
          status: session.status,
          expires_at: session.expires_at,
          guest_info: session.guest_info,
        },
        table: {
          _id: table._id,
          name: table.name,
          code: table.code,
        },
        branch: table.branch_id,
      },
      "Tạo phiên gọi món thành công",
      201
    );
  } catch (error) {
    return response.sendError(
      res,
      "Có lỗi xảy ra khi tạo phiên gọi món",
      500,
      error.message
    );
  }
};

export const getDineInSession = async (req, res) => {
  try {
    const { sessionToken } = req.params;

    const session = await DineInSession.findOne({
      session_token: sessionToken,
      status: "active",
      expires_at: { $gt: new Date() },
    })
      .populate("table_id", "name code active")
      .populate("branch_id", "name phone address code active")
      .populate("cart_items.dish_id", "name price sale_price imageUrls status")
      .lean();

    if (!session || !session.table_id?.active || !session.branch_id?.active) {
      return response.sendError(
        res,
        "Phiên gọi món không tồn tại hoặc đã hết hạn",
        404
      );
    }

    return response.sendSuccess(
      res,
      { session },
      "Lấy phiên gọi món thành công",
      200
    );
  } catch (error) {
    return response.sendError(
      res,
      "Có lỗi xảy ra khi lấy phiên gọi món",
      500,
      error.message
    );
  }
};

export const getDineInActiveOrder = async (req, res) => {
  try {
    const { sessionToken } = req.params;

    const session = await DineInSession.findOne({
      session_token: sessionToken,
      status: "active",
      expires_at: { $gt: new Date() },
    })
      .select("table_id branch_id")
      .lean();

    if (!session?.table_id || !session?.branch_id) {
      return response.sendError(
        res,
        "Phiên gọi món không tồn tại hoặc đã hết hạn",
        404
      );
    }

    const order = await Order.findOne({
      table_id: session.table_id,
      branch_id: session.branch_id,
      order_type: "dine_in",
      status: { $in: ["pending", "confirmed", "processing"] },
      payment_status: { $ne: "paid" },
    })
      .populate("customer_id", "name phone address linked_user_id")
      .populate("branch_id", "name phone address code")
      .populate("table_id", "name code active")
      .sort({ created_at: -1 })
      .lean();

    return response.sendSuccess(
      res,
      { order: order || null },
      "Lấy đơn đang mở của bàn thành công",
      200
    );
  } catch (error) {
    return response.sendError(
      res,
      "Có lỗi xảy ra khi lấy đơn đang mở của bàn",
      500,
      error.message
    );
  }
};

export const getDineInOrderStatus = async (req, res) => {
  try {
    const { sessionToken, orderId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return response.sendError(res, "ID đơn hàng không hợp lệ", 400);
    }

    const session = await DineInSession.findOne({
      session_token: sessionToken,
      status: "active",
      expires_at: { $gt: new Date() },
    })
      .select("table_id branch_id")
      .lean();

    if (!session?.table_id || !session?.branch_id) {
      return response.sendError(
        res,
        "Phiên gọi món không tồn tại hoặc đã hết hạn",
        404
      );
    }

    let order = await Order.findOne({
      _id: orderId,
      table_id: session.table_id,
      branch_id: session.branch_id,
      order_type: "dine_in",
    })
      .select(
        "_id order_number status payment_method payment_status payment_date completed_at total_amount items created_at zalopay_app_trans_id"
      )
      .lean();

    if (!order) {
      return response.sendError(res, "Không tìm thấy đơn hàng của bàn này", 404);
    }

    if (
      order.payment_method === "zalopay" &&
      order.payment_status !== "paid" &&
      order.zalopay_app_trans_id
    ) {
      try {
        await syncZalopayOrderStatus(order.zalopay_app_trans_id);
        order = await Order.findById(order._id)
          .select(
            "_id order_number status payment_method payment_status payment_date completed_at total_amount items created_at zalopay_app_trans_id"
          )
          .lean();
      } catch (syncError) {
        console.error("Sync ZaloPay dine-in order status error:", syncError);
      }
    }

    return response.sendSuccess(
      res,
      { order },
      "Lấy trạng thái đơn hàng thành công",
      200
    );
  } catch (error) {
    return response.sendError(
      res,
      "Có lỗi xảy ra khi lấy trạng thái đơn hàng",
      500,
      error.message
    );
  }
};

export const requestDineInCashPayment = async (req, res) => {
  try {
    const { sessionToken, orderId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return response.sendError(res, "ID đơn hàng không hợp lệ", 400);
    }

    const session = await DineInSession.findOne({
      session_token: sessionToken,
      status: "active",
      expires_at: { $gt: new Date() },
    })
      .select("table_id branch_id")
      .lean();

    if (!session?.table_id || !session?.branch_id) {
      return response.sendError(
        res,
        "Phiên gọi món không tồn tại hoặc đã hết hạn",
        404
      );
    }

    const order = await Order.findOne({
      _id: orderId,
      table_id: session.table_id,
      branch_id: session.branch_id,
      order_type: "dine_in",
      payment_method: "cod",
      payment_status: { $ne: "paid" },
    })
      .select("_id order_number total_amount created_at payment_method payment_status branch_id table_id table_info order_type order_channel")
      .populate("table_id", "name code active")
      .lean();

    if (!order) {
      return response.sendError(
        res,
        "Không tìm thấy đơn tiền mặt đang chờ thanh toán của bàn này",
        404
      );
    }

    try {
      const io = getIO();
      io.to(`branch:${order.branch_id}`).emit("dine_in_cash_payment_requested", {
        order_id: order._id,
        order_number: order.order_number,
        order_type: order.order_type,
        order_channel: order.order_channel,
        payment_method: order.payment_method,
        payment_status: order.payment_status,
        total_amount: order.total_amount,
        table_id: order.table_id?._id || order.table_id,
        table_info: {
          name: order.table_info?.name || order.table_id?.name || "bàn",
          code: order.table_info?.code || order.table_id?.code || "",
        },
        created_at: new Date().toISOString(),
      });
    } catch (socketError) {
      console.error("Dine-in cash payment socket error:", socketError);
    }

    return response.sendSuccess(
      res,
      { requested: true },
      "Đã gửi yêu cầu thanh toán tiền mặt",
      200
    );
  } catch (error) {
    return response.sendError(
      res,
      "Có lỗi xảy ra khi gọi thanh toán",
      500,
      error.message
    );
  }
};

export const updateDineInSessionCart = async (req, res) => {
  try {
    const { sessionToken } = req.params;
    const { cart_items } = req.body;

    if (!Array.isArray(cart_items)) {
      return response.sendError(res, "Giỏ món không hợp lệ", 400);
    }

    for (const item of cart_items) {
      if (!mongoose.Types.ObjectId.isValid(item.dish_id)) {
        return response.sendError(res, "ID món ăn không hợp lệ", 400);
      }

      if (!item.quantity || item.quantity < 1) {
        return response.sendError(res, "Số lượng món ăn không hợp lệ", 400);
      }
    }

    const session = await DineInSession.findOne({
      session_token: sessionToken,
      status: "active",
      expires_at: { $gt: new Date() },
    });

    if (!session) {
      return response.sendError(
        res,
        "Phiên gọi món không tồn tại hoặc đã hết hạn",
        404
      );
    }

    session.cart_items = cart_items.map((item) => ({
      dish_id: item.dish_id,
      quantity: item.quantity,
    }));
    session.expires_at = getExpiresAt();

    await session.save();

    return response.sendSuccess(
      res,
      {
        session: {
          session_token: session.session_token,
          status: session.status,
          expires_at: session.expires_at,
          cart_items: session.cart_items,
        },
      },
      "Cập nhật giỏ món thành công",
      200
    );
  } catch (error) {
    return response.sendError(
      res,
      "Có lỗi xảy ra khi cập nhật giỏ món",
      500,
      error.message
    );
  }
};
