import mongoose from "mongoose";
import Dish from "../models/dish-model.js";
import Order from "../models/order-model.js";

export const getFamiliarDishesForCurrentUser = async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({
        success: false,
        message: "Vui l?ng ??ng nh?p",
      });
    }

    const { limit = 4 } = req.query;
    const maxLimit = Math.min(Math.max(parseInt(limit, 10) || 4, 1), 12);

    const frequentlyBought = await Order.aggregate([
      {
        $match: {
          user_id: new mongoose.Types.ObjectId(userId),
          order_type: "online",
          status: { $nin: ["cancelled", "cancel_request"] },
        },
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.dish_id",
          purchaseCount: { $sum: "$items.quantity" },
          lastPurchasedAt: { $max: "$created_at" },
        },
      },
      { $sort: { purchaseCount: -1, lastPurchasedAt: -1 } },
      { $limit: maxLimit },
    ]);

    const dishIds = frequentlyBought.map((item) => item._id);

    if (dishIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        message: "Ch?a c? d? li?u m?n quen thu?c",
      });
    }

    const dishes = await Dish.find({
      _id: { $in: dishIds },
      status: "active",
    })
      .populate("category", "name")
      .lean();

    const dishMap = new Map(dishes.map((dish) => [dish._id.toString(), dish]));
    const result = frequentlyBought
      .map((item) => {
        const dish = dishMap.get(item._id.toString());
        if (!dish) return null;

        return {
          ...dish,
          purchaseCount: item.purchaseCount,
          lastPurchasedAt: item.lastPurchasedAt,
          primary_image: dish.imageUrls?.[dish.defaultImageIndex || 0] || null,
        };
      })
      .filter(Boolean);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error fetching familiar dishes:", error.message);
    return res.status(500).json({
      success: false,
      message: "Kh?ng th? l?y m?n quen thu?c",
      error: error.message,
    });
  }
};
