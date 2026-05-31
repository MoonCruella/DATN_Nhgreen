import crypto from "crypto";
import mongoose from "mongoose";
import DineInSession from "../models/dinein-session-model.js";
import StoreTable from "../models/store-table-model.js";
import response from "../helpers/response.js";

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
