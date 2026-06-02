import mongoose from "mongoose";
import QRCode from "qrcode";
import StoreTable from "../models/store-table-model.js";
import Branch from "../models/branch-model.js";
import User from "../models/user-model.js";
import Order from "../models/order-model.js";
import response from "../helpers/response.js";

const getQrUrl = (req, qrToken) => {
  const baseUrl =
    process.env.QR_CLIENT_BASE_URL ||
    process.env.CLIENT_URL;

  return `${baseUrl.replace(/\/$/, "")}/${qrToken}`;
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

  const manager = await User.findById(req.user.userId).select("branch_id").lean();
  return manager?.branch_id?.toString() === branchId.toString();
};

const parseBooleanFilter = (value) => {
  if (typeof value === "undefined" || value === "") return undefined;
  if (value === true || value === "true" || value === "active") return true;
  if (value === false || value === "false" || value === "inactive") return false;
  return undefined;
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
    const { branch_id, name, code, active = true, sort_order = 0 } = req.body;

    if (!branch_id || !mongoose.Types.ObjectId.isValid(branch_id)) {
      return response.sendError(res, "Chi nhánh không hợp lệ hoặc chưa chọn", 400);
    }

    if (!name || !name.trim()) {
      return response.sendError(res, "Tên bàn không được để trống", 400);
    }

    if (!(await canManageBranch(req, branch_id))) {
      return response.sendError(res, "Không có quyền quản lý chi nhánh này", 403);
    }

    const branch = await Branch.findById(branch_id).lean();
    if (!branch || !branch.active) {
      return response.sendError(
        res,
        "Chi nhánh không tồn tại hoặc không hoạt động",
        400
      );
    }

    const table = new StoreTable({
      branch_id,
      name,
      code,
      active,
      sort_order,
    });

    await table.save();

    return response.sendSuccess(
      res,
      { table: await serializeTable(req, table) },
      "Tạo bàn thành công",
      201
    );
  } catch (error) {
    if (error.code === 11000) {
      return response.sendError(res, "Mã bàn đã tồn tại trong chi nhánh", 409);
    }

    return response.sendError(
      res,
      "Có lỗi xảy ra khi tạo bàn",
      500,
      error.message
    );
  }
};

export const getStoreTables = async (req, res) => {
  try {
    const {
      branch_id,
      branchId,
      active,
      q,
      page = 1,
      limit = 50,
      sort = "sort_order",
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
      const manager = await User.findById(req.user.userId).select("branch_id").lean();
      const managerBranchId = req.user.branch_id || manager?.branch_id;
      if (!managerBranchId) {
        return response.sendError(
          res,
          "Tài khoản manager chưa được gán chi nhánh",
          403
        );
      }
      filter.branch_id = managerBranchId;
    }

    const activeFilter = parseBooleanFilter(active);
    if (typeof activeFilter !== "undefined") {
      filter.active = activeFilter;
    }

    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { code: { $regex: q, $options: "i" } },
      ];
    }

    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const limitNumber = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const sortObj = { [sort]: order === "desc" ? -1 : 1, created_at: 1 };

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
          tables.map((table) => serializeTable(req, table))
        ),
        pagination: {
          totalItems,
          totalPages: Math.ceil(totalItems / limitNumber),
          currentPage: pageNumber,
          pageSize: limitNumber,
        },
      },
      "Lấy danh sách bàn thành công",
      200
    );
  } catch (error) {
    return response.sendError(
      res,
      "Có lỗi xảy ra khi lấy danh sách bàn",
      500,
      error.message
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
      "name phone address code active"
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
      200
    );
  } catch (error) {
    return response.sendError(
      res,
      "Có lỗi xảy ra khi lấy thông tin bàn",
      500,
      error.message
    );
  }
};

export const updateStoreTable = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, active, sort_order } = req.body;

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
      table.name = name;
    }

    if (typeof code !== "undefined") table.code = code;
    if (typeof active !== "undefined") table.active = active;
    if (typeof sort_order !== "undefined") table.sort_order = sort_order;

    await table.save();
    await table.populate("branch_id", "name phone address code active");

    return response.sendSuccess(
      res,
      { table: await serializeTable(req, table) },
      "Cập nhật bàn thành công",
      200
    );
  } catch (error) {
    if (error.code === 11000) {
      return response.sendError(res, "Mã bàn đã tồn tại trong chi nhánh", 409);
    }

    return response.sendError(
      res,
      "Có lỗi xảy ra khi cập nhật bàn",
      500,
      error.message
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

    await StoreTable.deleteOne({ _id: table._id });

    return response.sendSuccess(
      res,
      { table_id: table._id },
      "Xóa bàn thành công",
      200
    );
  } catch (error) {
    return response.sendError(
      res,
      "Có lỗi xảy ra khi xóa bàn",
      500,
      error.message
    );
  }
};
