import axios from "axios";
import Dish from "../models/dish-model.js";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8001";
const AI_API_KEY = process.env.AI_API_KEY;

/**
 * Gọi AI service để lấy gợi ý món ăn cho user
 * GET /api/recommendations/user/:userId hoặc /api/recommendations/user/me
 */
export const getRecommendationsForUser = async (req, res) => {
  try {
    let { userId } = req.params;

    // Nếu userId là 'me', lấy từ req.user (đã được xác thực)
    if (userId === "me") {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Vui lòng đăng nhập",
        });
      }
      // JWT payload chứa userId, không phải id hay _id
      userId = req.user.userId;
      console.log(`[Recommendations] User ID from token: ${userId}`);
    }

    const { limit = 10, excludeDishIds } = req.query;

    // Parse excludeDishIds nếu có (array hoặc comma-separated string)
    let exclude = [];
    if (excludeDishIds) {
      exclude = Array.isArray(excludeDishIds)
        ? excludeDishIds
        : excludeDishIds.split(",");
    }

    // Gọi AI service
    const aiResponse = await axios.get(
      `${AI_SERVICE_URL}/recommendations/${userId}`,
      {
        params: {
          limit: parseInt(limit),
          exclude_dish_ids: exclude,
        },
        headers: {
          "x-api-key": AI_API_KEY,
        },
      }
    );

    const recommendations = aiResponse.data.recommendations || [];

    // Lấy dish_ids từ AI
    const dishIds = recommendations.map((r) => r.dish_id);

    if (dishIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        message: "Chưa có đủ dữ liệu để gợi ý món ăn",
      });
    }

    // Query MongoDB để lấy thông tin món ăn
    const dishes = await Dish.find({
      _id: { $in: dishIds },
      status: "active",
    })
      .populate("category", "name")
      .lean();

    // Merge thông tin món với score từ AI
    const dishMap = new Map(dishes.map((d) => [d._id.toString(), d]));
    const result = recommendations
      .map((rec) => {
        const dish = dishMap.get(rec.dish_id);
        if (!dish) return null;
        return {
          ...dish,
          recommendationScore: rec.score,
          primary_image: dish.imageUrls?.[dish.defaultImageIndex || 0] || null,
        };
      })
      .filter(Boolean); // Loại bỏ null

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error fetching recommendations:", error.message);
    res.status(500).json({
      success: false,
      message: "Không thể lấy gợi ý món ăn",
      error: error.message,
    });
  }
};

/**
 * Gọi AI service để lấy món tương tự
 * GET /api/recommendations/similar/:dishId
 */
export const getSimilarDishes = async (req, res) => {
  try {
    const { dishId } = req.params;
    const { limit = 10 } = req.query;

    // Gọi AI service
    const aiResponse = await axios.get(
      `${AI_SERVICE_URL}/similar-dishes/${dishId}`,
      {
        params: {
          limit: parseInt(limit),
        },
        headers: {
          "x-api-key": AI_API_KEY,
        },
      }
    );

    const similarItems = aiResponse.data.similar_items || [];
    const dishIds = similarItems.map((item) => item.dish_id);

    if (dishIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
      });
    }

    // Query MongoDB
    const dishes = await Dish.find({
      _id: { $in: dishIds },
      status: "active",
    })
      .populate("category", "name")
      .lean();

    // Merge với similarity score
    const dishMap = new Map(dishes.map((d) => [d._id.toString(), d]));
    const result = similarItems
      .map((item) => {
        const dish = dishMap.get(item.dish_id);
        if (!dish) return null;
        return {
          ...dish,
          similarityScore: item.score,
          primary_image: dish.imageUrls?.[dish.defaultImageIndex || 0] || null,
        };
      })
      .filter(Boolean);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error fetching similar dishes:", error.message);
    res.status(500).json({
      success: false,
      message: "Không thể lấy món tương tự",
      error: error.message,
    });
  }
};

/**
 * Trigger retrain AI model (Admin only)
 * POST /api/recommendations/retrain
 */
export const retrainModel = async (req, res) => {
  try {
    const aiResponse = await axios.post(
      `${AI_SERVICE_URL}/retrain`,
      {},
      {
        headers: {
          "x-api-key": AI_API_KEY,
        },
      }
    );

    res.status(200).json({
      success: true,
      message: "Model đã được train lại thành công",
      stats: aiResponse.data.stats,
    });
  } catch (error) {
    console.error("Error retraining model:", error.message);
    res.status(500).json({
      success: false,
      message: "Không thể train lại model",
      error: error.message,
    });
  }
};
