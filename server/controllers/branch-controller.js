import Branch from "../models/branch-model.js";
import BranchDishStatus from "../models/branch-dish-status-model.js";
import Dish from "../models/dish-model.js";
import User from "../models/user-model.js";
import bcrypt from "bcryptjs";
import sendMail from "../config/nodemailer.js";
import { createVietnameseSearchQuery } from "../utils/fuzzySearch.js";

// Tạo mới branch
export const createBranch = async (req, res) => {
  try {
    const { name, address, phone, active, status } = req.body;

    // accept `active` from client, but fall back to legacy `status` if provided
    const isActive =
      typeof active !== "undefined"
        ? active
        : typeof status !== "undefined"
        ? status
        : true;

    const branch = new Branch({
      name,
      address,
      phone,
      active: isActive,
    });

    console.log("createBranch: received body:", req.body);
    await branch.save();
    console.log("createBranch: saved branch:", branch);

    // Tự động tạo BranchDishStatus cho tất cả các món ăn active
    try {
      const activeDishes = await Dish.find({ status: "active" });
      const branchDishStatuses = activeDishes.map((dish) => ({
        branchId: branch._id,
        dishId: dish._id,
        isAvailable: true, // Mặc định có sẵn tại chi nhánh mới
      }));

      if (branchDishStatuses.length > 0) {
        await BranchDishStatus.insertMany(branchDishStatuses);
      }
    } catch (statusError) {
      console.error("Error creating branch dish statuses:", statusError);
      // Không throw error, vẫn trả về branch đã tạo thành công
    }

    res.status(201).json({
      success: true,
      message: "Branch created successfully",
      data: branch,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating branch",
      error: error.message,
    });
  }
};

// Lấy danh sách branch có phân trang
export const getBranches = async (req, res) => {
  try {
    let { page = 1, limit = 10, active, q } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    // build filter
    const filter = {};
    if (typeof active !== "undefined" && active !== "") {
      // accept 'true'/'false' or 'active'/'inactive'
      if (active === "true" || active === "active") filter.active = true;
      else if (active === "false" || active === "inactive")
        filter.active = false;
    }

    // unified q search: name, address fields, and code
    if (q) {
      const searchQuery = createVietnameseSearchQuery(q, [
        "name",
        "code",
        "address.full_address",
        "address.street",
      ]);
      Object.assign(filter, searchQuery);
    }

    const totalItems = await Branch.countDocuments(filter);
    const totalPages = Math.ceil(totalItems / limit);

    const branches = await Branch.find(filter)
      .sort({ createdAt: -1 }) // chú ý: field là createdAt, không phải created_at
      .skip((page - 1) * limit)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: branches,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        pageSize: limit,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching branches",
      error: error.message,
    });
  }
};

// Lấy chi tiết 1 branch theo ID
export const getBranchById = async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.id);
    if (!branch) {
      return res
        .status(404)
        .json({ success: false, message: "Branch not found" });
    }

    // Lấy thông tin manager của chi nhánh này
    const manager = await User.findOne({
      branch_id: req.params.id,
      role: "manager",
    }).select("-password -refresh_tokens");

    res.status(200).json({
      success: true,
      data: {
        ...branch.toObject(),
        manager,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching branch",
      error: error.message,
    });
  }
};

// Lấy danh sách manager của chi nhánh
export const getBranchManagers = async (req, res) => {
  try {
    const { id } = req.params;

    // Kiểm tra branch tồn tại
    const branch = await Branch.findById(id);
    if (!branch) {
      return res.status(404).json({
        success: false,
        message: "Chi nhánh không tồn tại",
      });
    }

    // Lấy danh sách manager của chi nhánh
    const managers = await User.find({
      branch_id: id,
      role: "manager",
    }).select("-password -refresh_tokens");

    res.status(200).json({
      success: true,
      data: managers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách quản lý",
      error: error.message,
    });
  }
};

// Cập nhật branch
export const updateBranch = async (req, res) => {
  try {
    const { name, address, phone, active, status } = req.body;

    const isActive =
      typeof active !== "undefined"
        ? active
        : typeof status !== "undefined"
        ? status
        : undefined;

    const updatePayload = { name, address, phone };
    if (typeof isActive !== "undefined") updatePayload.active = isActive;

    const branch = await Branch.findByIdAndUpdate(
      req.params.id,
      updatePayload,
      { new: true, runValidators: true }
    );
    console.log("updateBranch: updatePayload:", updatePayload);
    console.log("updateBranch: result:", branch);

    if (!branch) {
      return res
        .status(404)
        .json({ success: false, message: "Branch not found" });
    }

    res.status(200).json({
      success: true,
      message: "Branch updated successfully",
      data: branch,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating branch",
      error: error.message,
    });
  }
};

// Xóa branch
export const deleteBranch = async (req, res) => {
  try {
    const branch = await Branch.findByIdAndDelete(req.params.id);
    if (!branch) {
      return res
        .status(404)
        .json({ success: false, message: "Branch not found" });
    }

    // Xóa tất cả BranchDishStatus liên quan đến chi nhánh này
    try {
      await BranchDishStatus.deleteMany({ branchId: req.params.id });
    } catch (statusError) {
      console.error("Error deleting branch dish statuses:", statusError);
      // Không throw error, vẫn trả về thành công
    }

    res
      .status(200)
      .json({ success: true, message: "Branch deleted successfully" });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting branch",
      error: error.message,
    });
  }
};

// Lấy danh sách món ăn của chi nhánh với trạng thái availability
export const getBranchDishes = async (req, res) => {
  try {
    const { id } = req.params;
    const { q, category, isAvailable, page = 1, limit = 10 } = req.query;

    const currentPage = parseInt(page);
    const pageSize = parseInt(limit);
    const skip = (currentPage - 1) * pageSize;

    // Kiểm tra branch tồn tại
    const branch = await Branch.findById(id);
    if (!branch) {
      return res.status(404).json({
        success: false,
        message: "Branch not found",
      });
    }

    // Build dish query
    const dishQuery = { status: "active" };

    // Apply search query (fuzzy search)
    if (q) {
      const searchQuery = createVietnameseSearchQuery(q, [
        "name",
        "description",
      ]);
      Object.assign(dishQuery, searchQuery);
    }

    // Apply category filter
    if (category) {
      dishQuery.category = category;
    }

    // Lấy món ăn theo filters và populate category
    const dishes = await Dish.find(dishQuery)
      .select("_id name description price imageUrls defaultImageIndex category")
      .populate("category", "name");

    // Lấy trạng thái của các món tại chi nhánh này
    const dishStatuses = await BranchDishStatus.find({ branchId: id });
    const statusMap = {};
    dishStatuses.forEach((status) => {
      statusMap[status.dishId.toString()] = status.isAvailable;
    });

    // Kết hợp data: mặc định isAvailable = true nếu chưa có trong BranchDishStatus
    let dishesWithStatus = dishes.map((dish) => {
      return {
        _id: dish._id,
        name: dish.name,
        description: dish.description,
        price: dish.price,
        defaultImageIndex: dish.defaultImageIndex,
        imageUrls: dish.imageUrls || [],
        category: dish.category,
        isAvailableAtBranch:
          statusMap[dish._id.toString()] !== undefined
            ? statusMap[dish._id.toString()]
            : true,
      };
    });

    // Apply availability filter (client-side since it's based on BranchDishStatus)
    if (isAvailable !== undefined) {
      const availabilityFilter = isAvailable === "true" || isAvailable === true;
      dishesWithStatus = dishesWithStatus.filter(
        (dish) => dish.isAvailableAtBranch === availabilityFilter
      );
    }

    // Apply pagination
    const totalItems = dishesWithStatus.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const paginatedDishes = dishesWithStatus.slice(skip, skip + pageSize);

    res.status(200).json({
      success: true,
      data: {
        dishes: paginatedDishes,
        pagination: {
          currentPage: currentPage,
          totalPages: totalPages,
          totalItems: totalItems,
          pageSize: pageSize,
          hasPrevious: currentPage > 1,
          hasNext: currentPage < totalPages,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching branch dishes",
      error: error.message,
    });
  }
};

// Cập nhật trạng thái món ăn tại chi nhánh
export const updateBranchDishStatus = async (req, res) => {
  try {
    const { id, dishId } = req.params;
    const { isAvailable } = req.body;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Kiểm tra branch tồn tại
    const branch = await Branch.findById(id);
    if (!branch) {
      return res.status(404).json({
        success: false,
        message: "Branch not found",
      });
    }

    // Kiểm tra quyền: Manager chỉ được quản lý chi nhánh của mình
    if (userRole === "manager") {
      const User = (await import("../models/user-model.js")).default;
      const manager = await User.findById(userId).select("branch_id");
      if (!manager?.branch_id || manager.branch_id.toString() !== id) {
        return res.status(403).json({
          success: false,
          message: "Bạn không có quyền quản lý chi nhánh này",
        });
      }
    }

    const dish = await Dish.findById(dishId);
    if (!dish) {
      return res.status(404).json({
        success: false,
        message: "Dish not found",
      });
    }

    // Upsert trạng thái
    const status = await BranchDishStatus.findOneAndUpdate(
      { branchId: id, dishId: dishId },
      { isAvailable },
      { upsert: true, new: true }
    );

    res.status(200).json({
      success: true,
      message: "Dish status updated successfully",
      data: status,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating dish status",
      error: error.message,
    });
  }
};

// Kiểm tra tính khả dụng của các món trong giỏ hàng tại chi nhánh
export const checkDishesAvailability = async (req, res) => {
  try {
    const { id } = req.params; // branchId
    const { dishIds } = req.body; // array of dishIds

    if (!Array.isArray(dishIds) || dishIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "dishIds array is required",
      });
    }

    // Lấy trạng thái các món tại chi nhánh
    const statuses = await BranchDishStatus.find({
      branchId: id,
      dishId: { $in: dishIds },
    }).populate("dishId", "name imageUrl imageUrls defaultImageIndex price ");

    // Tạo map để tra cứu
    const statusMap = {};
    statuses.forEach((status) => {
      statusMap[status.dishId._id.toString()] = {
        isAvailable: status.isAvailable,
        dish: status.dishId,
      };
    });

    // Kiểm tra từng món: nếu không có trong BranchDishStatus thì mặc định available
    const unavailableDishes = [];
    dishIds.forEach((dishId) => {
      const dishIdStr = dishId.toString();
      if (statusMap[dishIdStr] && !statusMap[dishIdStr].isAvailable) {
        // Trả về dish object với đầy đủ thông tin
        const dish = statusMap[dishIdStr].dish;
        unavailableDishes.push({
          _id: dish._id,
          name: dish.name,
          image_url:
            dish.imageUrl ||
            (dish.imageUrls && dish.imageUrls[dish.defaultImageIndex || 0]),
          price: dish.sale_price || dish.price,
        });
      }
    });

    res.status(200).json({
      success: true,
      allAvailable: unavailableDishes.length === 0,
      unavailableDishes,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error checking dishes availability",
      error: error.message,
    });
  }
};

// Tạo tài khoản manager cho chi nhánh
export const createBranchManager = async (req, res) => {
  try {
    const { id } = req.params; // branchId
    const { name, email, password, phone } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Tên, email và mật khẩu là bắt buộc",
      });
    }

    // Check branch exists
    const branch = await Branch.findById(id);
    if (!branch) {
      return res.status(404).json({
        success: false,
        message: "Chi nhánh không tồn tại",
      });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email đã được sử dụng",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Email không hợp lệ",
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu phải có ít nhất 6 ký tự",
      });
    }

    // Validate phone if provided
    if (phone) {
      const phoneRegex = /^(0|\+84)[0-9]{9,10}$/;
      if (!phoneRegex.test(phone.trim())) {
        return res.status(400).json({
          success: false,
          message: "Số điện thoại không hợp lệ (10-11 số)",
        });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create manager user
    const manager = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      phone: phone ? phone.trim() : undefined,
      role: "manager",
      branch_id: id,
    });

    await manager.save();

    // Send email notification to manager
    try {
      const emailSubject =
        "Tài khoản quản lý chi nhánh - Hệ thống nhà hàng NHGreen";
      const emailText = `
Xin chào ${name},

Bạn đã được tạo tài khoản quản lý cho chi nhánh: ${branch.name}

Thông tin đăng nhập:
- Email: ${email}
- Mật khẩu: ${password}

Thông tin chi nhánh:
- Tên chi nhánh: ${branch.name}
- Địa chỉ: ${branch.address?.street || ""}, ${
        branch.address?.ward?.name || ""
      }, ${branch.address?.district?.name || ""}, ${
        branch.address?.province?.name || ""
      }
- Số điện thoại: ${branch.phone || "Chưa cập nhật"}

Trân trọng,
Hệ thống quản lý
      `;

      await sendMail(email, emailSubject, emailText);
      console.log(`Email sent to manager: ${email}`);
    } catch (emailError) {
      console.error("Error sending email to manager:", emailError);
      // Không throw error, vẫn trả về success vì tài khoản đã được tạo
    }

    // Return manager without password
    const managerData = manager.toObject();
    delete managerData.password;
    delete managerData.refresh_tokens;

    res.status(201).json({
      success: true,
      message: "Tạo tài khoản quản lý thành công",
      data: managerData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi tạo tài khoản quản lý",
      error: error.message,
    });
  }
};
