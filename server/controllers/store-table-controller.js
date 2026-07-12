import mongoose from "mongoose";
import QRCode from "qrcode";
import StoreTable from "../models/store-table-model.js";
import Branch from "../models/branch-model.js";
import User from "../models/user-model.js";
import Order from "../models/order-model.js";
import DineInSession from "../models/dinein-session-model.js";
import response from "../helpers/response.js";
import { getIO } from "../config/socket.js";

const getQrUrl = (req, qrToken) => {
  const baseUrl =
    process.env.QR_CLIENT_BASE_URL ||
    process.env.CLIENT_DINE_IN_URL ||
    req.protocol + "://" + req.get("host");

  const normalizedBaseUrl = baseUrl.replace(/\/$/, "");
  const dineInBaseUrl = normalizedBaseUrl.endsWith("/dine-in")
    ? normalizedBaseUrl
    : `${normalizedBaseUrl}/dine-in`;

  return `${dineInBaseUrl}/${qrToken}`;
};

const generateQrCodeDataUrl = async (value) => {
  return QRCode.toDataURL(value, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 256,
    color: {
      dark: "#111827",
      light: "#ffffff",
    },
  });
};

const canManageBranch = async (req, branchId) => {
  if (req.user.role === "admin") return true;

  if (req.user.role !== "manager") return false;

  const tokenBranchId = req.user.branch_id?.toString();
  if (tokenBranchId) return tokenBranchId === branchId.toString();

  const manager = await User.findById(req.user.userId)
    .select("branch_id")
    .lean();
  return manager?.branch_id?.toString() === branchId.toString();
};


let storeTableIndexCleanupPromise = null;

const isExpectedStoreTableUniqueIndex = (index) => {
  const key = index.key || {};
  const keyNames = Object.keys(key);

  if (index.name === "_id_" || key._id === 1) return true;
  if (keyNames.length === 1 && key.qr_token === 1) return true;
  if (keyNames.length === 2 && key.branch_id === 1 && key.name === 1) return true;

  return false;
};

const dropStaleStoreTableUniqueIndexes = async (force = false) => {
  if (force) storeTableIndexCleanupPromise = null;

  if (!storeTableIndexCleanupPromise) {
    storeTableIndexCleanupPromise = (async () => {
      try {
        const indexes = await StoreTable.collection.indexes();
        const staleUniqueIndexes = indexes.filter(
          (index) => index.unique === true && !isExpectedStoreTableUniqueIndex(index),
        );

        for (const index of staleUniqueIndexes) {
          if (!index.name || index.name === "_id_") continue;
          await StoreTable.collection.dropIndex(index.name);
          console.log(`Dropped stale StoreTable unique index: ${index.name}`);
        }
      } catch (error) {
        console.error("StoreTable stale index cleanup error:", error);
      }
    })();
  }

  return storeTableIndexCleanupPromise;
};

const getDuplicateStoreTableInfo = (error) => {
  const keyPattern = error?.keyPattern || {};
  const keyValue = error?.keyValue || {};
  const message = String(error?.message || "").toLowerCase();

  const hasQrToken =
    keyPattern.qr_token || keyValue.qr_token || message.includes("qr_token");
  const hasBranchNameIndex =
    (keyPattern.branch_id && keyPattern.name) ||
    message.includes("branch_id_1_name_1");
  const hasLegacyNameIndex =
    !hasBranchNameIndex &&
    ((keyPattern.name && !keyPattern.branch_id) ||
      message.includes("name_1") ||
      message.includes("name: 1"));
  const hasName = hasBranchNameIndex || hasLegacyNameIndex || keyValue.name;

  if (hasQrToken) {
    return {
      reason: "qr_token",
      message: "M\u00e3 QR b\u00e0n b\u1ecb tr\u00f9ng, vui l\u00f2ng th\u1eed t\u1ea1o l\u1ea1i",
    };
  }

  if (hasLegacyNameIndex) {
    return {
      reason: "legacy_name_index",
      message: "T\u00ean b\u00e0n \u0111ang b\u1ecb ch\u1eb7n b\u1edfi index c\u0169. H\u1ec7 th\u1ed1ng \u0111\u00e3 d\u1ecdn index, vui l\u00f2ng th\u1eed l\u1ea1i.",
    };
  }

  if (hasName) {
    return {
      reason: "name",
      message: "T\u00ean b\u00e0n \u0111\u00e3 t\u1ed3n t\u1ea1i trong chi nh\u00e1nh",
    };
  }

  return {
    reason: "unknown",
    message: "D\u1eef li\u1ec7u b\u00e0n b\u1ecb tr\u00f9ng do index c\u0169. H\u1ec7 th\u1ed1ng \u0111\u00e3 d\u1ecdn index, vui l\u00f2ng th\u1eed l\u1ea1i.",
  };
};

const getDuplicateStoreTableMessage = (error) =>
  getDuplicateStoreTableInfo(error).message;

const findNameConflict = async (branchId, name, excludeId = null) => {
  if (!branchId || !name) return null;

  const filter = {
    branch_id: branchId,
    name: String(name).trim(),
  };

  if (excludeId) {
    filter._id = { $ne: excludeId };
  }

  return StoreTable.findOne(filter).select("_id name").lean();
};

const serializeTable = async (req, table) => {
  const plainTable = table.toObject ? table.toObject() : table;
  const qrUrl = getQrUrl(req, plainTable.qr_token);
  const activeOrder = await Order.findOne({
    table_id: plainTable._id,
    order_type: "dine_in",
    status: { $in: ["pending", "confirmed", "processing"] },
  })
    .select("_id order_number status total_amount items.quantity created_at")
    .sort({ created_at: -1 })
    .lean();
  const currentItemCount =
    activeOrder?.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) ||
    0;

  return {
    ...plainTable,
    qr_url: qrUrl,
    qr_code_data_url: await generateQrCodeDataUrl(qrUrl),
    current_order_id: activeOrder?._id || null,
    current_order_status: activeOrder?.status || null,
    current_order_number: activeOrder?.order_number || null,
    current_total: activeOrder?.total_amount || 0,
    current_item_count: currentItemCount,
    has_current_order: Boolean(activeOrder),
  };
};

export const createStoreTable = async (req, res) => {
  try {
    const { branch_id, name } = req.body;

    if (!branch_id || !mongoose.Types.ObjectId.isValid(branch_id)) {
      return response.sendError(
        res,
        "Chi nhánh không hợp lệ hoặc chưa chọn",
        400,
      );
    }

    if (!name || !name.trim()) {
      return response.sendError(res, "Tên bàn không được để trống", 400);
    }

    if (!(await canManageBranch(req, branch_id))) {
      return response.sendError(
        res,
        "Không có quyền quản lý chi nhánh này",
        403,
      );
    }

    const branch = await Branch.findById(branch_id).lean();
    if (!branch || !branch.active) {
      return response.sendError(
        res,
        "Chi nhánh không tồn tại hoặc không hoạt động",
        400,
      );
    }

    await dropStaleStoreTableUniqueIndexes();

    const nameConflict = await findNameConflict(branch_id, name);
    if (nameConflict) {
      return response.sendError(res, "Tên bàn đã tồn tại trong chi nhánh", 409);
    }

    const table = new StoreTable({
      branch_id,
      name,
    });

    try {
      await table.save();
    } catch (saveError) {
      if (saveError.code !== 11000) throw saveError;

      const duplicateInfo = getDuplicateStoreTableInfo(saveError);
      if (["legacy_name_index", "unknown"].includes(duplicateInfo.reason)) {
        await dropStaleStoreTableUniqueIndexes(true);
        await table.save();
      } else if (duplicateInfo.reason === "qr_token") {
        table.qr_token = undefined;
        await table.validate();
        await table.save();
      } else {
        throw saveError;
      }
    }

    return response.sendSuccess(
      res,
      { table: await serializeTable(req, table) },
      "Tạo bàn thành công",
      201,
    );
  } catch (error) {
    if (error.code === 11000) {
      return response.sendError(res, getDuplicateStoreTableMessage(error), 409);
    }

    return response.sendError(
      res,
      "Có lỗi xảy ra khi tạo bàn",
      500,
      error.message,
    );
  }
};

export const getStoreTables = async (req, res) => {
  try {
    const {
      branch_id,
      branchId,
      q,
      page = 1,
      limit = 50,
      order = "asc",
    } = req.query;

    const selectedBranchId = branch_id || branchId;
    const filter = {};

    if (selectedBranchId) {
      if (!mongoose.Types.ObjectId.isValid(selectedBranchId)) {
        return response.sendError(res, "Chi nhánh không hợp lệ", 400);
      }

      if (!(await canManageBranch(req, selectedBranchId))) {
        return response.sendError(res, "Không có quyền xem chi nhánh này", 403);
      }

      filter.branch_id = selectedBranchId;
    } else if (req.user.role === "manager") {
      const manager = await User.findById(req.user.userId)
        .select("branch_id")
        .lean();
      const managerBranchId = req.user.branch_id || manager?.branch_id;
      if (!managerBranchId) {
        return response.sendError(
          res,
          "Tài khoản manager chưa được gán chi nhánh",
          403,
        );
      }
      filter.branch_id = managerBranchId;
    }


    if (q) {
      filter.$or = [{ name: { $regex: q, $options: "i" } }];
    }

    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const limitNumber = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const sortObj = { created_at: order === "desc" ? -1 : 1 };

    const [tables, totalItems] = await Promise.all([
      StoreTable.find(filter)
        .populate("branch_id", "name phone address code active")
        .sort(sortObj)
        .skip((pageNumber - 1) * limitNumber)
        .limit(limitNumber),
      StoreTable.countDocuments(filter),
    ]);

    return response.sendSuccess(
      res,
      {
        tables: await Promise.all(
          tables.map((table) => serializeTable(req, table)),
        ),
        pagination: {
          totalItems,
          totalPages: Math.ceil(totalItems / limitNumber),
          currentPage: pageNumber,
          pageSize: limitNumber,
        },
      },
      "Lấy danh sách bàn thành công",
      200,
    );
  } catch (error) {
    return response.sendError(
      res,
      "Có lỗi xảy ra khi lấy danh sách bàn",
      500,
      error.message,
    );
  }
};

export const getStoreTableById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.sendError(res, "ID bàn không hợp lệ", 400);
    }

    const table = await StoreTable.findById(id).populate(
      "branch_id",
      "name phone address code active",
    );

    if (!table) {
      return response.sendError(res, "Không tìm thấy bàn", 404);
    }

    const branchId = table.branch_id?._id || table.branch_id;
    if (!(await canManageBranch(req, branchId))) {
      return response.sendError(res, "Không có quyền xem bàn này", 403);
    }

    return response.sendSuccess(
      res,
      { table: await serializeTable(req, table) },
      "Lấy thông tin bàn thành công",
      200,
    );
  } catch (error) {
    return response.sendError(
      res,
      "Có lỗi xảy ra khi lấy thông tin bàn",
      500,
      error.message,
    );
  }
};

export const updateStoreTable = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.sendError(res, "ID bàn không hợp lệ", 400);
    }

    const table = await StoreTable.findById(id);
    if (!table) {
      return response.sendError(res, "Không tìm thấy bàn", 404);
    }

    if (!(await canManageBranch(req, table.branch_id))) {
      return response.sendError(res, "Không có quyền cập nhật bàn này", 403);
    }

    if (typeof name !== "undefined") {
      if (!name || !name.trim()) {
        return response.sendError(res, "Tên bàn không được để trống", 400);
      }
      await dropStaleStoreTableUniqueIndexes();

      const nameConflict = await findNameConflict(
        table.branch_id,
        name,
        table._id,
      );
      if (nameConflict) {
        return response.sendError(res, "Tên bàn đã tồn tại trong chi nhánh", 409);
      }
      table.name = name.trim();
    }


    await table.save();
    await table.populate("branch_id", "name phone address code active");

    return response.sendSuccess(
      res,
      { table: await serializeTable(req, table) },
      "Cập nhật bàn thành công",
      200,
    );
  } catch (error) {
    if (error.code === 11000) {
      return response.sendError(res, getDuplicateStoreTableMessage(error), 409);
    }

    return response.sendError(
      res,
      "Có lỗi xảy ra khi cập nhật bàn",
      500,
      error.message,
    );
  }
};

export const transferStoreTableOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { target_table_id } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.sendError(res, "ID bàn nguồn không hợp lệ", 400);
    }

    if (!target_table_id || !mongoose.Types.ObjectId.isValid(target_table_id)) {
      return response.sendError(res, "ID bàn chuyển đến không hợp lệ", 400);
    }

    if (id.toString() === target_table_id.toString()) {
      return response.sendError(
        res,
        "Bàn chuyển đến phải khác bàn hiện tại",
        400,
      );
    }

    const [sourceTable, targetTable] = await Promise.all([
      StoreTable.findById(id),
      StoreTable.findById(target_table_id),
    ]);

    if (!sourceTable) {
      return response.sendError(res, "Không tìm thấy bàn hiện tại", 404);
    }

    if (!targetTable) {
      return response.sendError(
        res,
        "Bàn chuyển đến không tồn tại hoặc đã ngừng hoạt động",
        404,
      );
    }

    if (sourceTable.branch_id.toString() !== targetTable.branch_id.toString()) {
      return response.sendError(
        res,
        "Chỉ có thể chuyển bàn trong cùng chi nhánh",
        400,
      );
    }

    if (!(await canManageBranch(req, sourceTable.branch_id))) {
      return response.sendError(
        res,
        "Không có quyền chuyển bàn trong chi nhánh này",
        403,
      );
    }

    const activeOrderFilter = {
      order_type: "dine_in",
      status: { $in: ["pending", "confirmed", "processing"] },
      payment_status: { $ne: "paid" },
    };

    const [sourceOrder, targetOrder] = await Promise.all([
      Order.findOne({
        ...activeOrderFilter,
        table_id: sourceTable._id,
        branch_id: sourceTable.branch_id,
      }).sort({ created_at: -1 }),
      Order.findOne({
        ...activeOrderFilter,
        table_id: targetTable._id,
        branch_id: targetTable.branch_id,
      }).lean(),
    ]);

    if (!sourceOrder) {
      return response.sendError(
        res,
        "Bàn hiện tại chưa có hóa đơn đang mở",
        400,
      );
    }

    if (targetOrder) {
      return response.sendError(res, "Bàn chuyển đến đang có hóa đơn", 409);
    }

    const now = new Date();

    await DineInSession.deleteMany({
      table_id: targetTable._id,
    });

    await DineInSession.updateMany(
      {
        table_id: sourceTable._id,
      },
      {
        $set: {
          table_id: targetTable._id,
        },
      },
    );

    await Order.updateMany(
      {
        ...activeOrderFilter,
        table_id: sourceTable._id,
        branch_id: sourceTable.branch_id,
      },
      {
        $set: {
          table_id: targetTable._id,
          table_info: {
            name: targetTable.name,
          },
        },
        $push: {
          history: {
            status: sourceOrder.status,
            date: now,
            note: `Chuyển bàn từ ${sourceTable.name} sang ${targetTable.name}`,
            updated_by: req.user.userId,
          },
        },
      },
    );

    const updatedOrder = await Order.findById(sourceOrder._id)
      .populate("user_id", "name email phone")
      .populate("branch_id", "name phone address code")
      .populate("table_id", "name")
      .lean();

    try {
      const io = getIO();
      io.to(`branch:${sourceTable.branch_id}`).emit("table_transferred", {
        branch_id: sourceTable.branch_id,
        from_table_id: sourceTable._id,
        to_table_id: targetTable._id,
        order_id: updatedOrder?._id,
      });
      io.to(`branch:${sourceTable.branch_id}`).emit("order_status_updated", {
        order_id: updatedOrder?._id,
        order_number: updatedOrder?.order_number,
        status: updatedOrder?.status,
        table_id: targetTable._id,
        table_info: updatedOrder?.table_info,
      });
    } catch (socketError) {
      console.error("Socket table transfer error:", socketError);
    }

    return response.sendSuccess(
      res,
      {
        order: updatedOrder,
        from_table: await serializeTable(req, sourceTable),
        to_table: await serializeTable(req, targetTable),
      },
      "Chuyển bàn thành công",
      200,
    );
  } catch (error) {
    return response.sendError(
      res,
      "Có lỗi xảy ra khi chuyển bàn",
      500,
      error.message,
    );
  }
};

export const deleteStoreTable = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.sendError(res, "ID bàn không hợp lệ", 400);
    }

    const table = await StoreTable.findById(id);
    if (!table) {
      return response.sendError(res, "Không tìm thấy bàn", 404);
    }

    if (!(await canManageBranch(req, table.branch_id))) {
      return response.sendError(res, "Không có quyền xóa bàn này", 403);
    }

    await table.deleteOne();

    return response.sendSuccess(
      res,
      { table_id: table._id },
      "Xóa bàn thành công",
      200,
    );
  } catch (error) {
    return response.sendError(
      res,
      "Có lỗi xảy ra khi xóa bàn",
      500,
      error.message,
    );
  }
};
