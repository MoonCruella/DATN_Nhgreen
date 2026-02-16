import Ingredient from "../models/ingredient-model.js";
import { createVietnameseSearchQuery } from "../utils/fuzzySearch.js";

// Tạo nguyên liệu mới
export const createIngredient = async (req, res) => {
  try {
    const ingredient = new Ingredient(req.body);
    await ingredient.save();
    res.status(201).json({ success: true, data: ingredient });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Lấy danh sách nguyên liệu (có phân trang)
export const getIngredients = async (req, res) => {
  try {
    let {
      page = 1,
      limit = 10,
      name,
      search,
      status,
      type,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    if (Number.isNaN(page) || page < 1) {
      page = 1;
    }

    if (Number.isNaN(limit) || limit < 1) {
      limit = 10;
    }

    // Build filter object
    const filter = {};

    // Search in name (use 'search' param or fallback to 'name')
    const searchTerm = search || name;
    if (typeof searchTerm === "string" && searchTerm.trim() !== "") {
      const searchQuery = createVietnameseSearchQuery(searchTerm.trim(), [
        "name",
      ]);
      Object.assign(filter, searchQuery);
    }

    if (typeof status === "string" && status.trim() !== "") {
      filter.status = status.trim();
    }

    // Filter by ingredient type if provided
    if (typeof type === "string" && type.trim() !== "") {
      filter.type = type.trim();
    }

    const totalItems = await Ingredient.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));

    // Build sort object
    const sortObj = {};
    const validSortFields = ["name", "createdAt", "protein", "fat", "carbs"];
    let sortField = validSortFields.includes(sortBy) ? sortBy : "createdAt";

    // If sorting by energyKcal, use protein as proxy (since energyKcal is virtual)
    // We'll need to sort by total energy approximation: protein*4 + fat*9 + carbs*4
    // For simplicity, sort by protein (main energy contributor)
    if (sortBy === "energyKcal") {
      sortField = "protein"; // Approximate sort
    }

    const direction = sortOrder === "asc" ? 1 : -1;
    sortObj[sortField] = direction;
    // Add deterministic secondary sort to avoid duplicate/missing records across pages
    if (sortField !== "_id") {
      sortObj._id = direction;
    }

    const ingredients = await Ingredient.find(filter)
      .sort(sortObj)
      .skip((page - 1) * limit)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: ingredients,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        pageSize: limit,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Lấy chi tiết 1 nguyên liệu
export const getIngredientById = async (req, res) => {
  try {
    const ingredient = await Ingredient.findById(req.params.id);
    if (!ingredient) {
      return res
        .status(404)
        .json({ success: false, message: "Ingredient not found" });
    }
    res.json({ success: true, data: ingredient });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Cập nhật nguyên liệu
export const updateIngredient = async (req, res) => {
  try {
    const ingredient = await Ingredient.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!ingredient) {
      return res
        .status(404)
        .json({ success: false, message: "Ingredient not found" });
    }
    res.json({ success: true, data: ingredient });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Xóa nguyên liệu
export const deleteIngredient = async (req, res) => {
  try {
    const ingredient = await Ingredient.findByIdAndDelete(req.params.id);
    if (!ingredient) {
      return res
        .status(404)
        .json({ success: false, message: "Ingredient not found" });
    }
    res.json({ success: true, message: "Ingredient deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
