import Dish from "../models/dish-model.js";
import FlashSale from "../models/flashsale-model.js";
import BranchDishStatus from "../models/branch-dish-status-model.js";
import Branch from "../models/branch-model.js";
import { createVietnameseSearchQuery } from "../utils/fuzzySearch.js";

// Tạo món ăn mới
export const createDish = async (req, res) => {
  try {
    // Extract expected fields from body
    const {
      name,
      description = "",
      price,
      ingredients = [],
      category,
      status = "active",
      defaultImageIndex = 0,
      imageUrls = [],
      imagePublicIds = [],
      tags = [],
    } = req.body;

    // Basic validations
    if (!name || String(name).trim() === "") {
      return res
        .status(400)
        .json({ success: false, message: "Dish name is required" });
    }
    if (price === undefined || price === null || String(price).trim() === "") {
      return res
        .status(400)
        .json({ success: false, message: "Dish price is required" });
    }
    if (!category || String(category).trim() === "") {
      return res
        .status(400)
        .json({ success: false, message: "Dish category is required" });
    }

    // Validate & normalize ingredients array: [{ ingredient: id, quantityGram }]
    const normalizedIngredients = Array.isArray(ingredients)
      ? ingredients
          .map((it) => {
            if (!it) return null;
            const ingredientId =
              it.ingredient || it.ingredient_id || it.id || it._id;
            const qty =
              it.quantityGram !== undefined
                ? Number(it.quantityGram)
                : Number(it.qty) || 0;
            if (!ingredientId) return null;
            return {
              ingredient: ingredientId,
              quantityGram: Number.isNaN(qty) ? 0 : qty,
            };
          })
          .filter(Boolean)
      : [];

    const toCreate = {
      name: String(name).trim(),
      description: String(description || ""),
      price: Number(price) || 0,
      category,
      ingredients: normalizedIngredients,
      status,
      defaultImageIndex: Number(defaultImageIndex) || 0,
      imageUrls: Array.isArray(imageUrls) ? imageUrls : [],
      imagePublicIds: Array.isArray(imagePublicIds) ? imagePublicIds : [],
      tags: Array.isArray(tags) ? tags : [],
    };

    // check duplicate name (case-insensitive)
    const existingByName = await Dish.findOne({
      name: {
        $regex: `^${toCreate.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$$`,
        $options: "i",
      },
    });
    if (existingByName) {
      return res
        .status(409)
        .json({ success: false, message: "Dish name already exists" });
    }

    const dish = new Dish(toCreate);
    await dish.save();

    // Tự động tạo BranchDishStatus cho tất cả các chi nhánh
    try {
      const branches = await Branch.find({});
      const branchDishStatuses = branches.map((branch) => ({
        branchId: branch._id,
        dishId: dish._id,
        isAvailable: true, // Mặc định có sẵn tại tất cả chi nhánh
      }));

      if (branchDishStatuses.length > 0) {
        await BranchDishStatus.insertMany(branchDishStatuses);
      }
    } catch (statusError) {
      console.error("Error creating branch dish statuses:", statusError);
      // Không throw error, vẫn trả về dish đã tạo thành công
    }

    return res.status(201).json({
      success: true,
      message: "Dish created successfully",
      data: dish,
    });
  } catch (error) {
    console.error("createDish error:", error);
    // If mongoose validation/cast error, return 400 with message
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res
        .status(400)
        .json({ success: false, message: error.message, error: error.message });
    }
    return res.status(500).json({
      success: false,
      message: "Error creating dish",
      error: error.message,
    });
  }
};

// Lấy danh sách món ăn (có phân trang + populate category, ingredients)
// Lấy tất cả sản phẩm
export const getDishes = async (req, res) => {
  try {
    console.log(`\n🔍 getDishes called with query:`, req.query);

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Support both 'search' and 'q' params for compatibility
    const { category, minPrice, maxPrice, search, q, sort, status } = req.query;
    const searchTerm = search || q;
    console.log(`   → search param: "${searchTerm}"`);

    const filter = {};
    if (req.user && req.user.role === "admin") {
      if (status && status !== "") {
        filter.status = status;
      }
    } else {
      // USER/GUEST: only show active dishes
      filter.status = "active";
    }
    if (category) {
      // model uses `category` (ObjectId ref) not `category_id`
      filter.category = category;
    }

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }

    if (searchTerm) {
      console.log(`\n🔍 getDishes: Searching for "${searchTerm}"`);
      const searchQuery = createVietnameseSearchQuery(searchTerm, [
        "name",
        "description",
      ]);
      console.log(`   → searchQuery:`, JSON.stringify(searchQuery, null, 2));
      Object.assign(filter, searchQuery);
      console.log(`   → final filter:`, JSON.stringify(filter, null, 2));
    }

    // Build sort options với _id làm tiebreaker
    let sortOptions = {};
    switch (sort) {
      case "price_asc":
        sortOptions = { price: 1, _id: 1 };
        break;
      case "price_desc":
        sortOptions = { price: -1, _id: 1 };
        break;
      case "newest":
        sortOptions = { created_at: -1, _id: -1 };
        break;
      case "popular":
        sortOptions = { sold_quantity: -1, _id: 1 };
        break;
      case "rating":
        sortOptions = { avg_rating: -1, _id: 1 };
        break;
      default:
        sortOptions = { created_at: -1, _id: -1 };
    }
    //  Fetch dishes with pagination
    const dishes = await Dish.find(filter)
      // populate using the schema field name `category`
      .populate("category", "name slug")
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .lean();

    // Lấy Flash Sale đang active (nếu có)
    const now = new Date();
    const activeFlashSale = await FlashSale.findOne({
      startTime: { $lte: now },
      endTime: { $gte: now },
    }).lean();

    // Gắn thông tin Flash Sale vào từng dish (nếu có)
    const dishesWithFlashSale = dishes.map((dish) => {
      if (activeFlashSale && activeFlashSale.dishes) {
        const flashSaleDish = activeFlashSale.dishes.find(
          (fd) => fd.dish_id.toString() === dish._id.toString()
        );

        if (flashSaleDish && flashSaleDish.sold < flashSaleDish.stock) {
          // Dish này đang trong Flash Sale và còn hàng
          return {
            ...dish,
            flashSale: {
              flashSaleId: activeFlashSale._id,
              salePrice: flashSaleDish.salePrice,
              originalPrice: flashSaleDish.originalPrice,
              stock: flashSaleDish.stock,
              sold: flashSaleDish.sold,
              remaining: flashSaleDish.stock - flashSaleDish.sold,
              endTime: activeFlashSale.endTime,
            },
          };
        }
      }
      return dish;
    });

    const totalDishes = await Dish.countDocuments(filter);
    const totalPages = Math.ceil(totalDishes / limit);

    res.status(200).json({
      success: true,
      data: {
        dishes: dishesWithFlashSale,
        pagination: {
          current_page: page,
          total_pages: totalPages,
          total_items: totalDishes,
          items_per_page: limit,
          has_previous: page > 1,
          has_next: page < totalPages,
        },
      },
      message: "Lấy danh sách món ăn thành công",
    });
  } catch (err) {
    console.error("Error fetching all dishes:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

// Lấy chi tiết 1 món ăn
export const getDishById = async (req, res) => {
  try {
    const dish = await Dish.findById(req.params.id)
      .populate("category", "name status")
      .populate(
        "ingredients.ingredient",
        "name protein fat carbs imageUrl status"
      )
      .lean();

    if (!dish) {
      return res
        .status(404)
        .json({ success: false, message: "Dish not found" });
    }

    // Kiểm tra xem có Flash Sale active cho dish này không
    const now = new Date();
    const activeFlashSale = await FlashSale.findOne({
      startTime: { $lte: now },
      endTime: { $gte: now },
    }).lean();

    let dishWithFlashSale = dish;
    if (activeFlashSale && activeFlashSale.dishes) {
      const flashSaleDish = activeFlashSale.dishes.find(
        (fd) => fd.dish_id.toString() === dish._id.toString()
      );

      if (flashSaleDish && flashSaleDish.sold < flashSaleDish.stock) {
        dishWithFlashSale = {
          ...dish,
          flashSale: {
            flashSaleId: activeFlashSale._id,
            salePrice: flashSaleDish.salePrice,
            originalPrice: flashSaleDish.originalPrice,
            stock: flashSaleDish.stock,
            sold: flashSaleDish.sold,
            remaining: flashSaleDish.stock - flashSaleDish.sold,
            endTime: activeFlashSale.endTime,
          },
        };
      }
    }

    res.status(200).json({ success: true, data: dishWithFlashSale });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Lấy top-selling dishes (mặc định 8)
export const getTopSellingDishes = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 8;
    const dishes = await Dish.find({ status: "active" })
      .sort({ soldCount: -1 })
      .limit(limit)
      .populate("category", "name status")
      .populate("ingredients.ingredient", "name protein fat carbs")
      .lean();

    // Lấy Flash Sale đang active (nếu có)
    const now = new Date();
    const activeFlashSale = await FlashSale.findOne({
      startTime: { $lte: now },
      endTime: { $gte: now },
    }).lean();

    // Gắn thông tin Flash Sale vào từng dish (nếu có)
    const dishesWithFlashSale = dishes.map((dish) => {
      if (activeFlashSale && activeFlashSale.dishes) {
        const flashSaleDish = activeFlashSale.dishes.find(
          (fd) => fd.dish_id.toString() === dish._id.toString()
        );

        if (flashSaleDish && flashSaleDish.sold < flashSaleDish.stock) {
          return {
            ...dish,
            flashSale: {
              flashSaleId: activeFlashSale._id,
              salePrice: flashSaleDish.salePrice,
              originalPrice: flashSaleDish.originalPrice,
              stock: flashSaleDish.stock,
              sold: flashSaleDish.sold,
              remaining: flashSaleDish.stock - flashSaleDish.sold,
              endTime: activeFlashSale.endTime,
            },
          };
        }
      }
      return dish;
    });

    res.status(200).json({ success: true, data: dishesWithFlashSale });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Lấy newest dishes (mặc định 8)
export const getNewestDishes = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 8;
    const dishes = await Dish.find({ status: "active" })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("category", "name status")
      .populate("ingredients.ingredient", "name protein fat carbs")
      .lean();

    // Lấy Flash Sale đang active (nếu có)
    const now = new Date();
    const activeFlashSale = await FlashSale.findOne({
      startTime: { $lte: now },
      endTime: { $gte: now },
    }).lean();

    // Gắn thông tin Flash Sale vào từng dish (nếu có)
    const dishesWithFlashSale = dishes.map((dish) => {
      if (activeFlashSale && activeFlashSale.dishes) {
        const flashSaleDish = activeFlashSale.dishes.find(
          (fd) => fd.dish_id.toString() === dish._id.toString()
        );

        if (flashSaleDish && flashSaleDish.sold < flashSaleDish.stock) {
          return {
            ...dish,
            flashSale: {
              flashSaleId: activeFlashSale._id,
              salePrice: flashSaleDish.salePrice,
              originalPrice: flashSaleDish.originalPrice,
              stock: flashSaleDish.stock,
              sold: flashSaleDish.sold,
              remaining: flashSaleDish.stock - flashSaleDish.sold,
              endTime: activeFlashSale.endTime,
            },
          };
        }
      }
      return dish;
    });

    res.status(200).json({ success: true, data: dishesWithFlashSale });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Cập nhật món ăn
export const updateDish = async (req, res) => {
  try {
    const dish = await Dish.findById(req.params.id);
    if (!dish) {
      return res
        .status(404)
        .json({ success: false, message: "Dish not found" });
    }

    // If name is being changed, ensure it doesn't conflict with another dish
    if (
      req.body.name &&
      String(req.body.name).trim() !== String(dish.name).trim()
    ) {
      const newName = String(req.body.name).trim();
      const conflict = await Dish.findOne({
        _id: { $ne: dish._id },
        name: {
          $regex: `^${newName.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}$$`,
          $options: "i",
        },
      });
      if (conflict) {
        return res
          .status(409)
          .json({ success: false, message: "Dish name already exists" });
      }
    }

    // Lưu trạng thái cũ để so sánh
    const oldStatus = dish.status;

    Object.assign(dish, req.body); // cập nhật field mới
    await dish.save(); // chạy pre("save") để tính lại totalEnergyKcal và tags

    // Xử lý thay đổi status
    if (req.body.status && oldStatus !== req.body.status) {
      try {
        if (req.body.status === "active") {
          // Khi chuyển sang active: tạo BranchDishStatus cho tất cả chi nhánh (nếu chưa có)
          const branches = await Branch.find({});
          const existingStatuses = await BranchDishStatus.find({
            dishId: dish._id,
          }).select("branchId");

          const existingBranchIds = new Set(
            existingStatuses.map((s) => s.branchId.toString())
          );

          const newStatuses = branches
            .filter((branch) => !existingBranchIds.has(branch._id.toString()))
            .map((branch) => ({
              branchId: branch._id,
              dishId: dish._id,
              isAvailable: true,
            }));

          if (newStatuses.length > 0) {
            await BranchDishStatus.insertMany(newStatuses);
          }
        } else if (req.body.status === "inactive") {
          // Khi chuyển sang inactive: xóa tất cả BranchDishStatus
          await BranchDishStatus.deleteMany({ dishId: dish._id });
        }
      } catch (statusError) {
        console.error("Error updating branch dish statuses:", statusError);
        // Không throw error, vẫn trả về dish đã cập nhật thành công
      }
    }

    res.status(200).json({
      success: true,
      message: "Dish updated successfully",
      data: dish,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating dish",
      error: error.message,
    });
  }
};

// Xóa món ăn
export const deleteDish = async (req, res) => {
  try {
    const dish = await Dish.findByIdAndDelete(req.params.id);
    if (!dish) {
      return res
        .status(404)
        .json({ success: false, message: "Dish not found" });
    }

    // Xóa tất cả BranchDishStatus liên quan đến món này
    try {
      await BranchDishStatus.deleteMany({ dishId: req.params.id });
    } catch (statusError) {
      console.error("Error deleting branch dish statuses:", statusError);
      // Không throw error, vẫn trả về thành công
    }

    res
      .status(200)
      .json({ success: true, message: "Dish deleted successfully" });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting dish",
      error: error.message,
    });
  }
};

// Lấy dishes theo tag (query or param) với phân trang
export const getDishByTag = async (req, res) => {
  try {
    const rawTag = req.params.tag || req.query.tag;
    if (!rawTag) {
      return res
        .status(400)
        .json({ success: false, message: "Tag is required (param or query)" });
    }

    const tag = rawTag.trim();

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const status = req.query.status || "active"; // optional status filter

    // The tag is passed in normalized form (e.g. 'gym_meal').
    // Match the exact tag value inside the tags array.
    const filter = { tags: tag };
    if (status) filter.status = status;

    const [dishes, total] = await Promise.all([
      Dish.find(filter)
        .populate("category", "name status")
        .populate("ingredients.ingredient", "name protein fat carbs")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
      Dish.countDocuments(filter),
    ]);

    // Lấy Flash Sale đang active (nếu có)
    const now = new Date();
    const activeFlashSale = await FlashSale.findOne({
      startTime: { $lte: now },
      endTime: { $gte: now },
    }).lean();

    // Gắn thông tin Flash Sale vào từng dish (nếu có)
    const dishesWithFlashSale = dishes.map((dish) => {
      if (activeFlashSale && activeFlashSale.dishes) {
        const flashSaleDish = activeFlashSale.dishes.find(
          (fd) => fd.dish_id.toString() === dish._id.toString()
        );

        if (flashSaleDish && flashSaleDish.sold < flashSaleDish.stock) {
          return {
            ...dish,
            flashSale: {
              flashSaleId: activeFlashSale._id,
              salePrice: flashSaleDish.salePrice,
              originalPrice: flashSaleDish.originalPrice,
              stock: flashSaleDish.stock,
              sold: flashSaleDish.sold,
              remaining: flashSaleDish.stock - flashSaleDish.sold,
              endTime: activeFlashSale.endTime,
            },
          };
        }
      }
      return dish;
    });

    res.status(200).json({
      success: true,
      data: dishesWithFlashSale,
      pagination: { total, page, pages: Math.ceil(total / limit), limit },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
