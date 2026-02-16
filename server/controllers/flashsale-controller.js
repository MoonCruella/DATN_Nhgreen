import FlashSale from "../models/flashsale-model.js";
import mongoose from "mongoose";
import { createVietnameseSearchQuery } from "../utils/fuzzySearch.js";

// Helper: return total minutes since midnight in Vietnam timezone for a Date
const getVietnamTotalMinutes = (date) => {
  if (!date) return null;
  // Use Intl to get hour/minute in Asia/Ho_Chi_Minh
  const dtf = new Intl.DateTimeFormat("en-GB", {
    hour12: false,
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
  });
  const parts = dtf.formatToParts(date);
  const hourPart = parts.find((p) => p.type === "hour");
  const minutePart = parts.find((p) => p.type === "minute");
  const hour = parseInt(hourPart?.value || "0", 10);
  const minute = parseInt(minutePart?.value || "0", 10);
  return hour * 60 + minute;
};

// Validation: ensure times fall between 06:00 and 20:00 Vietnam time
const validateWithinAllowedWindow = (start, end) => {
  const MIN = 6 * 60; // 06:00
  const MAX = 20 * 60; // 20:00
  const s = getVietnamTotalMinutes(start);
  const e = getVietnamTotalMinutes(end);
  if (s == null || e == null) return { ok: false, message: "Invalid date(s)" };
  if (s < MIN || s > MAX)
    return {
      ok: false,
      message: "startTime must be between 06:00 and 20:00 Vietnam time",
    };
  if (e < MIN || e > MAX)
    return {
      ok: false,
      message: "endTime must be between 06:00 and 20:00 Vietnam time",
    };
  // ensure start < end in absolute terms
  if (start.getTime() >= end.getTime())
    return { ok: false, message: "startTime must be before endTime" };
  return { ok: true };
};

// Check overlap with existing flash sales
const hasOverlap = async (start, end, excludeId = null) => {
  const query = {
    $or: [
      {
        // existing.start < new.end AND existing.end > new.start => overlap
        startTime: { $lt: end },
        endTime: { $gt: start },
      },
    ],
  };
  if (excludeId) {
    if (mongoose.Types.ObjectId.isValid(excludeId))
      query._id = { $ne: excludeId };
  }

  const found = await FlashSale.findOne(query).lean();
  return !!found;
};

// Create a new flash sale
export const createFlashSale = async (req, res) => {
  try {
    const { title, startTime, endTime, dishes, description } = req.body;

    if (!title || !startTime || !endTime || !dishes) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    const s = new Date(startTime);
    const e = new Date(endTime);

    // validate time window
    const valid = validateWithinAllowedWindow(s, e);
    if (!valid.ok)
      return res.status(400).json({ success: false, message: valid.message });

    // ensure no overlap
    const overlap = await hasOverlap(s, e);
    if (overlap)
      return res.status(400).json({
        success: false,
        message: "Flash sale time overlaps with an existing program",
      });

    const flash = new FlashSale({
      title,
      startTime: s,
      endTime: e,
      dishes,
      description,
      createdBy: req.user?.id || req.user?._id,
    });

    await flash.save();
    return res.json({ success: true, data: flash });
  } catch (err) {
    console.error("createFlashSale error:", err);
    return res
      .status(500)
      .json({ success: false, error: err.message || "Server error" });
  }
};

// Update existing flash sale
export const updateFlashSale = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ success: false, message: "Invalid id" });

    const existing = await FlashSale.findById(id);
    if (!existing)
      return res
        .status(404)
        .json({ success: false, message: "Flash sale not found" });

    const { title, startTime, endTime, dishes, description } = req.body;

    const s = startTime ? new Date(startTime) : existing.startTime;
    const e = endTime ? new Date(endTime) : existing.endTime;

    const valid = validateWithinAllowedWindow(s, e);
    if (!valid.ok)
      return res.status(400).json({ success: false, message: valid.message });

    const overlap = await hasOverlap(s, e, id);
    if (overlap)
      return res.status(400).json({
        success: false,
        message: "Flash sale time overlaps with an existing program",
      });

    existing.title = title ?? existing.title;
    existing.startTime = s;
    existing.endTime = e;
    existing.dishes = dishes ?? existing.dishes;
    existing.description = description ?? existing.description;

    await existing.save();
    return res.json({ success: true, data: existing });
  } catch (err) {
    console.error("updateFlashSale error:", err);
    return res
      .status(500)
      .json({ success: false, error: err.message || "Server error" });
  }
};

// Delete a flash sale
export const deleteFlashSale = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ success: false, message: "Invalid id" });

    const removed = await FlashSale.findByIdAndDelete(id);
    if (!removed)
      return res
        .status(404)
        .json({ success: false, message: "Flash sale not found" });

    return res.json({ success: true, message: "Flash sale deleted" });
  } catch (err) {
    console.error("deleteFlashSale error:", err);
    return res
      .status(500)
      .json({ success: false, error: err.message || "Server error" });
  }
};

// Get single flash sale
export const getFlashSale = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ success: false, message: "Invalid id" });

    const flash = await FlashSale.findById(id).populate("dishes.dish_id");
    if (!flash)
      return res
        .status(404)
        .json({ success: false, message: "Flash sale not found" });

    return res.json({ success: true, data: flash });
  } catch (err) {
    console.error("getFlashSale error:", err);
    return res
      .status(500)
      .json({ success: false, error: err.message || "Server error" });
  }
};

// List all flash sales
export const listFlashSales = async (req, res) => {
  try {
    // Pagination
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));

    // Filters
    const { status, q, startAfter, startBefore, sortBy, sortDir } = req.query;
    const filter = {};

    // Status: map to time ranges dynamically
    if (status) {
      const now = new Date();
      if (status === "upcoming") {
        filter.startTime = { $gt: now };
      } else if (status === "active") {
        filter.startTime = { $lte: now };
        filter.endTime = { $gte: now };
      } else if (status === "ended") {
        filter.endTime = { $lt: now };
      } else {
        filter.status = status;
      }
    }

    if (q) {
      const searchQuery = createVietnameseSearchQuery(q, [
        "title",
        "description",
      ]);
      Object.assign(filter, searchQuery);
    }
    if (startAfter || startBefore) {
      filter.startTime = filter.startTime || {};
      if (startAfter) {
        const d = new Date(startAfter);
        if (!isNaN(d)) filter.startTime.$gte = d;
      }
      if (startBefore) {
        const d = new Date(startBefore);
        if (!isNaN(d)) filter.startTime.$lte = d;
      }
      if (Object.keys(filter.startTime).length === 0) delete filter.startTime;
    }

    // Sorting
    const sortField = sortBy || "startTime";
    const sortOrder = sortDir === "desc" ? -1 : 1;

    const total = await FlashSale.countDocuments(filter);
    const pages = Math.max(1, Math.ceil(total / limit));

    const list = await FlashSale.find(filter)
      .sort({ [sortField]: sortOrder })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("dishes.dish_id");

    return res.json({
      success: true,
      data: list,
      meta: { total, page, pages, limit },
    });
  } catch (err) {
    console.error("listFlashSales error:", err);
    return res
      .status(500)
      .json({ success: false, error: err.message || "Server error" });
  }
};

// Get currently active flash sale(s) based on server time in VN
export const getActiveFlashSales = async (req, res) => {
  try {
    const now = new Date();
    const active = await FlashSale.find({
      startTime: { $lte: now },
      endTime: { $gte: now },
    }).populate("dishes.dish_id");
    return res.json({ success: true, data: active });
  } catch (err) {
    console.error("getActiveFlashSales error:", err);
    return res
      .status(500)
      .json({ success: false, error: err.message || "Server error" });
  }
};

// Get the nearest flash sale: prefer an active one, otherwise earliest upcoming
export const getNearestFlashSale = async (req, res) => {
  try {
    const now = new Date();

    // Prefer any active sale (should be unique because overlaps are prevented)
    const active = await FlashSale.findOne({
      startTime: { $lte: now },
      endTime: { $gte: now },
    })
      .sort({ endTime: 1 })
      .populate("dishes.dish_id");

    if (active) return res.json({ success: true, data: active });

    // No active sale -> earliest upcoming
    const upcoming = await FlashSale.findOne({ startTime: { $gt: now } })
      .sort({ startTime: 1 })
      .populate("dishes.dish_id");

    if (upcoming) return res.json({ success: true, data: upcoming });

    return res.status(404).json({
      success: false,
      message: "No active or upcoming flash sale found",
    });
  } catch (err) {
    console.error("getNearestFlashSale error:", err);
    return res
      .status(500)
      .json({ success: false, error: err.message || "Server error" });
  }
};

// Get statistics for a specific flash sale
export const getFlashSaleStatistics = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ success: false, message: "Invalid id" });

    const flash = await FlashSale.findById(id).populate("dishes.dish_id");
    if (!flash)
      return res
        .status(404)
        .json({ success: false, message: "Flash sale not found" });

    // Calculate statistics
    const dishes = flash.dishes || [];

    // Total products
    const totalProducts = dishes.length;

    // Total stock (initial)
    const totalStock = dishes.reduce((sum, d) => sum + (d.stock || 0), 0);

    // Total sold
    const totalSold = dishes.reduce((sum, d) => sum + (d.sold || 0), 0);

    // Remaining stock
    const remainingStock = totalStock - totalSold;

    // Total revenue (from sold items)
    const totalRevenue = dishes.reduce(
      (sum, d) => sum + (d.salePrice || 0) * (d.sold || 0),
      0
    );

    // Total potential revenue (if all stock sold)
    const potentialRevenue = dishes.reduce(
      (sum, d) => sum + (d.salePrice || 0) * (d.stock || 0),
      0
    );

    // Total discount given (difference between original and sale price)
    const totalDiscount = dishes.reduce(
      (sum, d) =>
        sum + ((d.originalPrice || 0) - (d.salePrice || 0)) * (d.sold || 0),
      0
    );

    // Average discount percentage
    const averageDiscount =
      totalProducts > 0
        ? dishes.reduce((sum, d) => {
            const discount =
              d.originalPrice > 0
                ? ((d.originalPrice - d.salePrice) / d.originalPrice) * 100
                : 0;
            return sum + discount;
          }, 0) / totalProducts
        : 0;

    // Sales rate (percentage of stock sold)
    const salesRate = totalStock > 0 ? (totalSold / totalStock) * 100 : 0;

    // Product details with sold count
    const productDetails = dishes.map((d) => ({
      dish_id: d.dish_id?._id || d.dish_id,
      dishName: d.dish_id?.name || "Unknown",
      dishImage:
        d.dish_id?.imageUrls?.[d.dish_id?.defaultImageIndex || 0] ||
        d.dish_id?.imageUrls?.[0] ||
        null,
      originalPrice: d.originalPrice || 0,
      salePrice: d.salePrice || 0,
      stock: d.stock || 0,
      sold: d.sold || 0,
      remaining: (d.stock || 0) - (d.sold || 0),
      revenue: (d.salePrice || 0) * (d.sold || 0),
      discount: ((d.originalPrice || 0) - (d.salePrice || 0)) * (d.sold || 0),
      discountPercent:
        d.originalPrice > 0
          ? ((d.originalPrice - d.salePrice) / d.originalPrice) * 100
          : 0,
      salesRate: d.stock > 0 ? (d.sold / d.stock) * 100 : 0,
    }));

    // Sort products by sold count (best sellers first)
    productDetails.sort((a, b) => b.sold - a.sold);

    const statistics = {
      flashSaleInfo: {
        id: flash._id,
        title: flash.title,
        status: flash.status,
        startTime: flash.startTime,
        endTime: flash.endTime,
      },
      summary: {
        totalProducts,
        totalStock,
        totalSold,
        remainingStock,
        totalRevenue,
        potentialRevenue,
        totalDiscount,
        averageDiscount: Math.round(averageDiscount * 10) / 10,
        salesRate: Math.round(salesRate * 10) / 10,
      },
      products: productDetails,
    };

    return res.json({ success: true, data: statistics });
  } catch (err) {
    console.error("getFlashSaleStatistics error:", err);
    return res
      .status(500)
      .json({ success: false, error: err.message || "Server error" });
  }
};

// Update sold count for a product in flash sale (called when order is placed)
export const updateFlashSaleSold = async (req, res) => {
  try {
    const { id } = req.params; // flashsale id
    const { dish_id, quantity } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id))
      return res
        .status(400)
        .json({ success: false, message: "Invalid flash sale id" });

    if (!dish_id || !quantity || quantity <= 0)
      return res
        .status(400)
        .json({ success: false, message: "Invalid dish_id or quantity" });

    const flash = await FlashSale.findById(id);
    if (!flash)
      return res
        .status(404)
        .json({ success: false, message: "Flash sale not found" });

    // Find the dish in the flash sale
    const dishIndex = flash.dishes.findIndex(
      (d) => d.dish_id.toString() === dish_id.toString()
    );

    if (dishIndex === -1)
      return res
        .status(404)
        .json({ success: false, message: "Dish not found in flash sale" });

    const dish = flash.dishes[dishIndex];

    // Check if enough stock available
    const remaining = (dish.stock || 0) - (dish.sold || 0);
    if (remaining < quantity)
      return res.status(400).json({
        success: false,
        message: `Not enough stock. Only ${remaining} items remaining`,
      });

    // Update sold count
    flash.dishes[dishIndex].sold = (dish.sold || 0) + quantity;

    await flash.save();

    return res.json({
      success: true,
      message: "Flash sale sold count updated",
      data: {
        dish_id,
        previousSold: dish.sold || 0,
        newSold: flash.dishes[dishIndex].sold,
        remaining: (dish.stock || 0) - flash.dishes[dishIndex].sold,
      },
    });
  } catch (err) {
    console.error("updateFlashSaleSold error:", err);
    return res
      .status(500)
      .json({ success: false, error: err.message || "Server error" });
  }
};

export default {
  createFlashSale,
  updateFlashSale,
  deleteFlashSale,
  getFlashSale,
  listFlashSales,
  getActiveFlashSales,
  getNearestFlashSale,
  getFlashSaleStatistics,
  updateFlashSaleSold,
};
