import response from "../helpers/response.js";
import User from "../models/user-model.js";
import Order from "../models/order-model.js";
import DineInCustomer from "../models/dinein-customer-model.js";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import cloudinary from "../config/cloudinary.js";
import fs from "fs";
import { createVietnameseSearchQuery } from "../utils/fuzzySearch.js";

const normalizePhone = (phone = "") => {
  let normalizedPhone = String(phone || "").replace(/\D/g, "");
  if (normalizedPhone.startsWith("84") && normalizedPhone.length >= 11) {
    normalizedPhone = `0${normalizedPhone.slice(2)}`;
  }
  return normalizedPhone;
};

const makeCustomerCode = (value, index) => {
  if (!value) return `KH${String(index + 1).padStart(5, "0")}`;
  return `KH${String(value).slice(-6).toUpperCase()}`;
};

// Get current user profile (from req.user)
export const getMyProfile = async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id || req.user.id;

    const user = await User.findById(userId).select(
      "-password -refresh_tokens"
    );

    if (!user) {
      return response.sendError(res, "User không tồn tại", 404);
    }

    return response.sendSuccess(
      res,
      user,
      "Lấy thông tin cá nhân thành công",
      200
    );
  } catch (error) {
    console.error("Get my profile error:", error);
    return response.sendError(
      res,
      "Lấy thông tin cá nhân thất bại",
      500,
      error.message
    );
  }
};

// Update current user profile (from req.user)
export const updateMyProfile = async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id || req.user.id;
    const { name, phone, gender, date_of_birth } = req.body;

    if (name && !name.trim()) {
      return response.sendError(res, "Tên không được để trống", 400);
    }

    if (phone && phone.trim()) {
      const phoneRegex = /^(0|\+84)[0-9]{9,10}$/;
      if (!phoneRegex.test(phone.trim())) {
        return response.sendError(
          res,
          "Số điện thoại không hợp lệ (10-11 số)",
          400
        );
      }
    }

    if (date_of_birth) {
      const birthDate = new Date(date_of_birth);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();

      if (birthDate > today || age > 120) {
        return response.sendError(res, "Ngày sinh không hợp lệ", 400);
      }
    }

    if (gender && !["male", "female", "other"].includes(gender)) {
      return response.sendError(res, "Giới tính không hợp lệ", 400);
    }

    const updateData = {};
    if (name) updateData.name = name.trim();
    if (phone) updateData.phone = phone.trim();
    if (gender) updateData.gender = gender;
    if (date_of_birth) updateData.date_of_birth = date_of_birth;

    if (req.file) {
      try {
        const user = await User.findById(userId);

        if (user.avatar_public_id) {
          await cloudinary.uploader.destroy(user.avatar_public_id);
        }

        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: "avatars",
          resource_type: "auto",
        });

        console.log("Upload success - URL:", result.secure_url);

        updateData.avatar = result.secure_url;
        updateData.avatar_public_id = result.public_id;

        fs.unlinkSync(req.file.path);
        console.log("Temp file deleted");
      } catch (uploadError) {
        console.error("Avatar upload error:", uploadError);
        if (req.file.path && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return response.sendError(
          res,
          "Lỗi upload ảnh đại diện",
          500,
          uploadError.message
        );
      }
    }

    console.log("Update data:", updateData);

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
      select: "-password -refresh_tokens",
    });

    if (!updatedUser) {
      return response.sendError(res, "User không tồn tại", 404);
    }

    return response.sendSuccess(
      res,
      updatedUser,
      "Cập nhật thông tin thành công",
      200
    );
  } catch (error) {
    console.error("Update my profile error:", error);

    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return response.sendError(res, "Lỗi validation", 400, errors);
    }

    return response.sendError(res, "Lỗi server", 500, error.message);
  }
};

// Update user password
export const updatePassword = async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id || req.user.id;
    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword) {
      return response.sendError(
        res,
        "Mật khẩu hiện tại và mật khẩu mới là bắt buộc",
        400
      );
    }

    if (newPassword.length < 6) {
      return response.sendError(
        res,
        "Mật khẩu mới phải có ít nhất 6 ký tự",
        400
      );
    }

    // Get user with password
    const user = await User.findById(userId).select("+password");
    if (!user) {
      return response.sendError(res, "User không tồn tại", 404);
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!isValidPassword) {
      return response.sendError(res, "Mật khẩu hiện tại không đúng", 400);
    }

    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password in database
    await User.findByIdAndUpdate(userId, {
      password: hashedNewPassword,
    });

    return response.sendSuccess(res, {}, "Đổi mật khẩu thành công", 200);
  } catch (error) {
    console.error("Update password error:", error);
    return response.sendError(res, "Lỗi đổi mật khẩu", 500, error.message);
  }
};

// Admin functions...
export const getUsers = async (req, res, next) => {
  try {
    const users = await User.find().select("-password -refresh_tokens");
    return response.sendSuccess(
      res,
      { users },
      "Lấy danh sách user thành công",
      200
    );
  } catch (err) {
    next(err);
  }
};

export const getUserByEmail = async (req, res, next) => {
  try {
    const { email } = req.params;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return response.sendError(res, "Email không hợp lệ", 400);
    }

    const user = await User.findOne({ email })
      .select("-password -refresh_tokens")
      .lean()
      .exec();

    if (!user) {
      return response.sendError(res, "User không tồn tại", 404);
    }

    return response.sendSuccess(
      res,
      {
        _id: user._id,
        email: user.email,
        name: user.name,
        coin: user.coin || 0,
        phone: user.phone,
        role: user.role,
        active: user.active,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      "Tìm user thành công",
      200
    );
  } catch (err) {
    console.error("Get user by email error:", err);
    return response.sendError(res, "Lỗi tìm kiếm user", 500, err.message);
  }
};

export const getCustomerByPhone = async (req, res) => {
  try {
    const phone = normalizePhone(req.params.phone);

    if (!phone || phone.length < 9) {
      return response.sendError(res, "Số điện thoại không hợp lệ", 400);
    }

    const dineInCustomer = await DineInCustomer.findOne({
      normalized_phone: phone,
      active: true,
    })
      .populate("linked_user_id", "_id name email phone coin")
      .lean();

    if (dineInCustomer) {
      return response.sendSuccess(
        res,
        {
          customer: {
            _id: dineInCustomer._id,
            name: dineInCustomer.name,
            phone: dineInCustomer.phone,
            address: dineInCustomer.address || {},
            linked_user_id: dineInCustomer.linked_user_id?._id || null,
            online_user: null,
            reward_points: dineInCustomer.coin || 0,
            coin: dineInCustomer.coin || 0,
            source: "dine_in_customer",
          },
        },
        "Tìm khách hàng thành công",
        200
      );
    }

    const user = null;

    return response.sendSuccess(
      res,
      { customer: null },
      user ? "Tìm khách hàng thành công" : "Số điện thoại chưa được sử dụng",
      200
    );
  } catch (error) {
    console.error("Get customer by phone error:", error);
    return response.sendError(
      res,
      "Có lỗi xảy ra khi tìm khách hàng",
      500,
      error.message
    );
  }
};

export const createManagerDineInCustomer = async (req, res) => {
  try {
    const { name, phone, address = {}, note = "" } = req.body;
    const normalizedPhone = normalizePhone(phone);

    if (!name || !name.trim()) {
      return response.sendError(res, "Tên khách hàng không được để trống", 400);
    }

    if (!normalizedPhone || normalizedPhone.length < 9 || normalizedPhone.length > 11) {
      return response.sendError(res, "Số điện thoại không hợp lệ", 400);
    }

    const existedCustomer = await DineInCustomer.findOne({
      normalized_phone: normalizedPhone,
      active: true,
    })
      .populate("linked_user_id", "_id name email phone coin")
      .lean();

    if (existedCustomer) {
      return response.sendError(
        res,
        "Số điện thoại đã có khách hàng",
        409
      );
    }

    const linkedUser = null;

    const customer = await DineInCustomer.create({
      name: name.trim(),
      phone: String(phone).trim(),
      normalized_phone: normalizedPhone,
      linked_user_id: null,
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
        customer: {
          _id: customer._id,
          name: customer.name,
          phone: customer.phone,
          address: customer.address || {},
          linked_user_id: linkedUser?._id || null,
          online_user: linkedUser,
          reward_points: customer.coin || 0,
          coin: customer.coin || 0,
          source: "dine_in_customer",
        },
        existed: false,
      },
      "Tạo khách hàng tại quán thành công",
      201
    );
  } catch (error) {
    if (error.code === 11000) {
      return response.sendError(res, "Số điện thoại đã tồn tại", 409);
    }

    console.error("Create manager dine-in customer error:", error);
    return response.sendError(
      res,
      "Có lỗi xảy ra khi tạo khách hàng tại quán",
      500,
      error.message
    );
  }
};

export const getUserList = async (req, res) => {
  try {
    const { page = 1, limit = 10, role, status, search } = req.query;

    const filter = {};

    if (role && role !== "all") {
      filter.role = role;
    }

    if (status && status !== "all") {
      filter.active = status === "active";
    }

    if (search) {
      const searchQuery = createVietnameseSearchQuery(search, [
        "name",
        "email",
        "phone",
      ]);
      Object.assign(filter, searchQuery);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const users = await User.find(filter)
      .select("-password -refresh_tokens -verifyOtp -verifyOtpExpireAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const totalUsers = await User.countDocuments(filter);
    const totalPages = Math.ceil(totalUsers / parseInt(limit));

    return response.sendSuccess(
      res,
      {
        users,
        pagination: {
          current_page: parseInt(page),
          total_pages: totalPages,
          total_users: totalUsers,
          per_page: parseInt(limit),
        },
        filter: {
          role,
          status,
          search: search || null,
        },
      },
      "Lấy danh sách người dùng thành công",
      200
    );
  } catch (error) {
    console.error("Get user list error:", error);
    return response.sendError(
      res,
      "Có lỗi xảy ra khi lấy danh sách người dùng",
      500,
      error.message
    );
  }
};

export const getManagerCustomers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = "" } = req.query;
    const currentPage = Math.max(parseInt(page, 10) || 1, 1);
    const perPage = Math.max(parseInt(limit, 10) || 20, 1);
    const keyword = String(search || "").trim().toLowerCase();

    const [users, dineInCustomers, orders] = await Promise.all([
      User.find({ role: "customer" })
        .select("_id name email phone coin createdAt")
        .lean(),
      DineInCustomer.find({ active: true })
        .populate("linked_user_id", "_id name email phone coin")
        .lean(),
      Order.find({})
        .select(
          "user_id customer_id shipping_info total_amount status order_number created_at"
        )
        .populate("customer_id", "_id name phone")
        .lean(),
    ]);

    const customersByKey = new Map();
    const userKeyById = new Map();
    const dineInKeyById = new Map();

    users.forEach((user, index) => {
      const phone = normalizePhone(user.phone);
      const key = `user:${user._id}`;
      const rewardPoints = user.coin || 0;
      const customer = {
        _id: key,
        user_id: user._id,
        customer_code: makeCustomerCode(user._id, index),
        name: user.name || "Khách hàng",
        email: user.email || "",
        phone: user.phone || "",
        normalized_phone: phone,
        total_spent: 0,
        reward_points: rewardPoints,
        coin: rewardPoints,
        total_orders: 0,
        source: "online_account",
        created_at: user.createdAt,
      };

      customersByKey.set(key, customer);
      userKeyById.set(String(user._id), key);
    });

    dineInCustomers.forEach((dineInCustomer) => {
      const phone = normalizePhone(dineInCustomer.phone);
      const key = `dinein:${dineInCustomer._id}`;
      const rewardPoints = dineInCustomer.coin || 0;

      if (!customersByKey.has(key)) {
        customersByKey.set(key, {
          _id: key,
          user_id: null,
          dine_in_customer_id: dineInCustomer._id,
          customer_code: makeCustomerCode(phone, customersByKey.size),
          name: dineInCustomer.name || "Khách hàng",
          email: "",
          phone: dineInCustomer.phone || "",
          normalized_phone: phone,
          total_spent: 0,
          reward_points: rewardPoints,
          coin: rewardPoints,
          total_orders: 0,
          source: "dine_in_customer",
          created_at: dineInCustomer.created_at,
        });
      }

      dineInKeyById.set(String(dineInCustomer._id), key);
    });

    orders.forEach((order) => {
      const userId = order.user_id ? String(order.user_id) : "";
      const dineInCustomer = order.customer_id;
      const orderPhone =
        normalizePhone(order.shipping_info?.phone) ||
        normalizePhone(dineInCustomer?.phone);
      const orderName =
        order.shipping_info?.name || dineInCustomer?.name || "Khách vãng lai";

      let key = userKeyById.get(userId);
      if (!key && dineInCustomer?._id) {
        key = dineInKeyById.get(String(dineInCustomer._id));
      }
      if (!key && orderPhone) key = `phone:${orderPhone}`;
      if (!key) return;

      if (!customersByKey.has(key)) {
        customersByKey.set(key, {
          _id: key,
          user_id: null,
          customer_code: makeCustomerCode(orderPhone, customersByKey.size),
          name: orderName,
          email: "",
          phone: order.shipping_info?.phone || dineInCustomer?.phone || "",
          normalized_phone: orderPhone,
          total_spent: 0,
          reward_points: 0,
          coin: 0,
          total_orders: 0,
          source: "dine_in_guest",
          created_at: order.created_at,
        });
      }

      const customer = customersByKey.get(key);
      if (!customer.phone && orderPhone) {
        customer.phone = order.shipping_info?.phone || dineInCustomer?.phone;
        customer.normalized_phone = orderPhone;
      }
      if (customer.name === "Khách hàng" || customer.name === "Khách vãng lai") {
        customer.name = orderName || customer.name;
      }

      if (order.status !== "cancelled") {
        customer.total_orders += 1;
        customer.total_spent += order.total_amount || 0;
      }
    });

    let customers = Array.from(customersByKey.values()).sort((a, b) => {
      if (b.total_orders !== a.total_orders) return b.total_orders - a.total_orders;
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });

    if (keyword) {
      customers = customers.filter((customer) => {
        const haystack = [
          customer.customer_code,
          customer.name,
          customer.phone,
          customer.email,
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(keyword);
      });
    }

    customers = customers.map((customer, index) => {
      const rewardPoints = customer.reward_points ?? customer.coin ?? 0;

      return {
        ...customer,
        stt: index + 1,
        reward_points: rewardPoints,
        coin: rewardPoints,
        total_spent: customer.total_spent || 0,
        total_orders: customer.total_orders || 0,
      };
    });

    const totalCustomers = customers.length;
    const totalPages = Math.ceil(totalCustomers / perPage);
    const start = (currentPage - 1) * perPage;
    const pagedCustomers = customers.slice(start, start + perPage);

    return response.sendSuccess(
      res,
      {
        customers: pagedCustomers,
        pagination: {
          current_page: currentPage,
          total_pages: totalPages,
          total_customers: totalCustomers,
          per_page: perPage,
        },
        filter: {
          search: search || null,
        },
      },
      "Lấy danh sách khách hàng thành công",
      200
    );
  } catch (error) {
    console.error("Get manager customers error:", error);
    return response.sendError(
      res,
      "Có lỗi xảy ra khi lấy danh sách khách hàng",
      500,
      error.message
    );
  }
};

export const getUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return response.sendError(res, "ID user không hợp lệ", 400);
    }

    const user = await User.findById(userId).select(
      "-password -refresh_tokens"
    );

    if (!user) {
      return response.sendError(res, "User không tồn tại", 404);
    }

    return response.sendSuccess(
      res,
      { user },
      "Lấy thông tin user thành công",
      200
    );
  } catch (error) {
    console.error("Get user profile error:", error);
    return response.sendError(
      res,
      "Lấy thông tin user thất bại",
      500,
      error.message
    );
  }
};

export const updateUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const updateData = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return response.sendError(res, "ID user không hợp lệ", 400);
    }

    const { password, refresh_tokens, role, ...allowedUpdates } = updateData;

    if (allowedUpdates.name && !allowedUpdates.name.trim()) {
      return response.sendError(res, "Tên không được để trống", 400);
    }

    if (allowedUpdates.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(allowedUpdates.email)) {
        return response.sendError(res, "Định dạng email không hợp lệ", 400);
      }

      const existingUser = await User.findOne({
        email: allowedUpdates.email,
        _id: { $ne: userId },
      });

      if (existingUser) {
        return response.sendError(res, "Email đã tồn tại", 409);
      }
    }

    if (allowedUpdates.phone && allowedUpdates.phone.trim()) {
      const phoneRegex = /^(0|\+84)[0-9]{9,10}$/;
      if (!phoneRegex.test(allowedUpdates.phone.trim())) {
        return response.sendError(
          res,
          "Số điện thoại không hợp lệ (10-11 số)",
          400
        );
      }
    }

    if (allowedUpdates.date_of_birth) {
      const birthDate = new Date(allowedUpdates.date_of_birth);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();

      if (birthDate > today || age > 120) {
        return response.sendError(res, "Ngày sinh không hợp lệ", 400);
      }
    }

    const updatedUser = await User.findByIdAndUpdate(userId, allowedUpdates, {
      new: true,
      runValidators: true,
      select: "-password -refresh_tokens",
    });

    if (!updatedUser) {
      return response.sendError(res, "User không tồn tại", 404);
    }

    return response.sendSuccess(
      res,
      {
        user: updatedUser,
      },
      "Cập nhật thông tin thành công",
      200
    );
  } catch (error) {
    console.error("Update user profile error:", error);

    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return response.sendError(res, "Lỗi validation", 400, errors);
    }

    return response.sendError(res, "Lỗi server", 500, error.message);
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return response.sendError(res, "ID user không hợp lệ", 400);
    }

    const userToDelete = await User.findById(userId);
    if (!userToDelete) {
      return response.sendError(res, "User không tồn tại", 404);
    }

    if (userToDelete.role === "admin") {
      return response.sendError(res, "Không thể xóa tài khoản admin", 403);
    }

    await User.findByIdAndDelete(userId);

    return response.sendSuccess(res, {}, "Xóa user thành công", 200);
  } catch (error) {
    console.error("Delete user error:", error);
    return response.sendError(res, "Lỗi xóa user", 500, error.message);
  }
};

export const toggleUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return response.sendError(res, "ID user không hợp lệ", 400);
    }

    const user = await User.findById(userId).select(
      "-password -refresh_tokens"
    );
    if (!user) {
      return response.sendError(res, "User không tồn tại", 404);
    }

    const newActive = !Boolean(user.active);

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { active: newActive },
      {
        new: true,
        select: "-password -refresh_tokens",
      }
    );

    return response.sendSuccess(
      res,
      { user: updatedUser },
      `${newActive ? "Kích hoạt" : "Vô hiệu hóa"} user thành công`,
      200
    );
  } catch (error) {
    console.error("Toggle user status error:", error);
    return response.sendError(
      res,
      "Lỗi cập nhật trạng thái user",
      500,
      error.message
    );
  }
};

export const getUserStats = async (req, res) => {
  try {
    const [totalUsers, activeUsers, adminUsers, managerUsers, bannedUsers] =
      await Promise.all([
        User.countDocuments(),
        User.countDocuments({ active: true }),
        User.countDocuments({ role: "admin" }),
        User.countDocuments({ role: "manager" }),
        User.countDocuments({ "ban_info.status": { $ne: null } }),
      ]);

    const stats = {
      total: totalUsers,
      active: activeUsers,
      inactive: totalUsers - activeUsers,
      banned: bannedUsers,
      admins: adminUsers,
      managers: managerUsers,
      customers: totalUsers - adminUsers - managerUsers,
    };

    return response.sendSuccess(
      res,
      { stats },
      "Lấy thống kê user thành công",
      200
    );
  } catch (error) {
    console.error("Get user stats error:", error);
    return response.sendError(res, "Lỗi lấy thống kê user", 500, error.message);
  }
};

// Admin: Ban user
export const banUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason, duration } = req.body; // duration in hours

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return response.sendError(res, "ID user không hợp lệ", 400);
    }

    const user = await User.findById(userId);
    if (!user) {
      return response.sendError(res, "Không tìm thấy user", 404);
    }

    if (user.role === "admin") {
      return response.sendError(res, "Không thể khóa tài khoản admin", 403);
    }

    const now = new Date();
    const durationMs = (duration || 720) * 60 * 60 * 1000; // Default 30 days (720 hours)

    if (!user.ban_info) {
      user.ban_info = {
        status: null,
        failed_login_count: 0,
        cancel_order_count: 0,
        cancel_order_streak: 0,
        ban_level: 0,
      };
    }

    user.ban_info.status = "banned_order";
    user.ban_info.reason = "admin_ban";
    user.ban_info.banned_until = new Date(now.getTime() + durationMs);

    await user.save();

    return response.sendSuccess(
      res,
      { user: { _id: user._id, email: user.email, ban_info: user.ban_info } },
      `Đã khóa tài khoản ${user.email}`,
      200
    );
  } catch (error) {
    console.error("Ban user error:", error);
    return response.sendError(res, "Lỗi khóa tài khoản", 500, error.message);
  }
};

// Admin: Unban user
export const unbanUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return response.sendError(res, "ID user không hợp lệ", 400);
    }

    const user = await User.findById(userId);
    if (!user) {
      return response.sendError(res, "Không tìm thấy user", 404);
    }

    if (!user.ban_info) {
      user.ban_info = {
        status: null,
        failed_login_count: 0,
        cancel_order_count: 0,
        cancel_order_streak: 0,
        ban_level: 0,
      };
    }

    user.ban_info.status = null;
    user.ban_info.reason = null;
    user.ban_info.banned_until = null;
    user.ban_info.failed_login_count = 0;
    user.ban_info.cancel_order_streak = 0;
    user.ban_info.ban_level = 0;

    await user.save();

    return response.sendSuccess(
      res,
      { user: { _id: user._id, email: user.email } },
      `Đã mở khóa tài khoản ${user.email}`,
      200
    );
  } catch (error) {
    console.error("Unban user error:", error);
    return response.sendError(res, "Lỗi mở khóa tài khoản", 500, error.message);
  }
};
