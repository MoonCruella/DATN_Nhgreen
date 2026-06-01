import response from "../helpers/response.js";
import DineInCustomer from "../models/dinein-customer-model.js";
import User from "../models/user-model.js";

const normalizePhone = (phone = "") => String(phone).replace(/\D/g, "");

const isValidPhone = (phone = "") => {
  const normalizedPhone = normalizePhone(phone);
  return normalizedPhone.length >= 9 && normalizedPhone.length <= 11;
};

const findOnlineUserByPhone = async (normalizedPhone) => {
  const users = await User.find({ role: "customer" })
    .select("_id name email phone coin")
    .lean();

  return users.find((user) => normalizePhone(user.phone) === normalizedPhone) || null;
};

const serializeCustomer = (customer, linkedUser = null) => {
  if (!customer && !linkedUser) return null;

  return {
    _id: customer?._id || linkedUser?._id,
    name: customer?.name || linkedUser?.name || "",
    phone: customer?.phone || linkedUser?.phone || "",
    normalized_phone:
      customer?.normalized_phone || normalizePhone(linkedUser?.phone || ""),
    address: customer?.address || {},
    linked_user_id:
      customer?.linked_user_id?._id || customer?.linked_user_id || linkedUser?._id || null,
    online_user: linkedUser
      ? {
          _id: linkedUser._id,
          name: linkedUser.name,
          email: linkedUser.email,
          phone: linkedUser.phone,
          coin: linkedUser.coin || 0,
        }
      : null,
    reward_points: linkedUser?.coin || 0,
    source: customer ? "dine_in_customer" : "online_user",
    created_at: customer?.created_at || linkedUser?.createdAt,
  };
};

export const getDineInCustomerByPhone = async (req, res) => {
  try {
    const normalizedPhone = normalizePhone(req.params.phone);

    if (!isValidPhone(normalizedPhone)) {
      return response.sendError(res, "Số điện thoại không hợp lệ", 400);
    }

    const [dineInCustomer, linkedUser] = await Promise.all([
      DineInCustomer.findOne({ normalized_phone: normalizedPhone, active: true })
        .populate("linked_user_id", "_id name email phone coin")
        .lean(),
      findOnlineUserByPhone(normalizedPhone),
    ]);

    const customer = serializeCustomer(
      dineInCustomer,
      dineInCustomer?.linked_user_id || linkedUser
    );

    return response.sendSuccess(
      res,
      { customer },
      customer ? "Tìm khách hàng thành công" : "Số điện thoại chưa được sử dụng",
      200
    );
  } catch (error) {
    console.error("Get dine-in customer by phone error:", error);
    return response.sendError(
      res,
      "Có lỗi xảy ra khi tìm khách hàng",
      500,
      error.message
    );
  }
};

export const createDineInCustomer = async (req, res) => {
  try {
    const { name, phone, address = {}, note = "" } = req.body;
    const normalizedPhone = normalizePhone(phone);

    if (!name || !name.trim()) {
      return response.sendError(res, "Tên khách hàng không được để trống", 400);
    }

    if (!isValidPhone(normalizedPhone)) {
      return response.sendError(res, "Số điện thoại không hợp lệ", 400);
    }

    const existedCustomer = await DineInCustomer.findOne({
      normalized_phone: normalizedPhone,
      active: true,
    })
      .populate("linked_user_id", "_id name email phone coin")
      .lean();

    if (existedCustomer) {
      return response.sendError(res, "Số điện thoại đã có khách hàng", 409);
    }

    const linkedUser = await findOnlineUserByPhone(normalizedPhone);
    const customer = await DineInCustomer.create({
      name: name.trim(),
      phone: String(phone).trim(),
      normalized_phone: normalizedPhone,
      linked_user_id: linkedUser?._id || null,
      address: {
        province: address.province || "",
        ward: address.ward || "",
        detail: address.detail || "",
      },
      note,
    });

    return response.sendSuccess(
      res,
      {
        customer: serializeCustomer(customer.toObject(), linkedUser),
        existed: false,
      },
      "Tạo khách hàng tại quán thành công",
      201
    );
  } catch (error) {
    if (error.code === 11000) {
      return response.sendError(res, "Số điện thoại đã tồn tại", 409);
    }

    console.error("Create dine-in customer error:", error);
    return response.sendError(
      res,
      "Có lỗi xảy ra khi tạo khách hàng tại quán",
      500,
      error.message
    );
  }
};
