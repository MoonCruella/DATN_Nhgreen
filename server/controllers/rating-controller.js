import Rating from "../models/rating-model.js";
import Order from "../models/order-model.js";
import User from "../models/user-model.js";
import Dish from "../models/dish-model.js";
import mongoose from "mongoose";
import response from "../helpers/response.js";
import * as notificationService from "../services/notification-service.js";
import {
  removeVietnameseTones,
  createVietnameseRegex,
} from "../utils/fuzzySearch.js";

export const createRating = async (req, res) => {
  try {
    const { dish_id, order_id, content, rating } = req.body;
    const user_id = req.user.userId;

    const user = await User.findById(user_id);
    if (!user || !user.active) {
      return response.sendError(
        res,
        "Tài khoản của bạn đã bị khóa. Không thể đánh giá món ăn!",
        403
      );
    }

    // Check ban status
    const banStatus = user.isBanned();
    if (banStatus.isBanned) {
      return response.sendError(res, banStatus.message, 403, null, {
        banned: true,
        banned_until: banStatus.banned_until,
      });
    }

    const order = await Order.findOne({
      _id: order_id,
      user_id: new mongoose.Types.ObjectId(user_id),
      status: "completed",
    });

    if (!order) {
      return response.sendError(
        res,
        "Đơn hàng không tồn tại hoặc chưa được giao",
        404
      );
    }

    // Check if within 7 days after order completion
    if (!order.completed_at) {
      return response.sendError(
        res,
        "Không xác định được thời gian hoàn thành đơn hàng",
        400
      );
    }
    const now = new Date();
    const completedAt = new Date(order.completed_at);
    const diffDays = (now - completedAt) / (1000 * 60 * 60 * 24);
    if (diffDays > 7) {
      return response.sendError(
        res,
        "Bạn chỉ có thể đánh giá sản phẩm trong vòng 7 ngày sau khi đơn hàng hoàn thành",
        400
      );
    }

    const dishInOrder = order.items.find(
      (item) => item.dish_id.toString() === dish_id
    );

    if (!dishInOrder) {
      return response.sendError(
        res,
        "Sản phẩm không có trong đơn hàng này",
        400
      );
    }

    const existingRating = await Rating.findOne({
      dish_id,
      user_id,
      order_id,
    });

    if (existingRating) {
      return response.sendError(
        res,
        "Bạn đã đánh giá sản phẩm này trong đơn hàng này rồi",
        400
      );
    }

    const newRating = await Rating.create({
      dish_id,
      user_id,
      order_id,
      content,
      rating,
    });

    const populatedRating = await newRating.populate(
      "user_id",
      "name email avatar active"
    );

    // Award 200 coins to user for rating
    await User.findByIdAndUpdate(
      user_id,
      { $inc: { coin: 200 } },
      { new: true }
    );

    await notificationService.notifyNewRating(newRating);
    await Dish.updateDishRating(dish_id);

    return response.sendSuccess(
      res,
      { rating: populatedRating, coinsAwarded: 200 },
      "Tạo đánh giá thành công! Bạn được cộng 200 xu",
      201
    );
  } catch (error) {
    console.error("Create rating error:", error);
    return response.sendError(
      res,
      "Có lỗi xảy ra khi tạo đánh giá",
      500,
      error.message
    );
  }
};

export const checkUserRatingForDish = async (req, res) => {
  try {
    const { dishId } = req.params;
    const { order_id } = req.query;
    const userId = req.user.userId;

    const user = await User.findById(userId);
    if (!user || !user.active) {
      return response.sendError(res, "Tài khoản của bạn đã bị khóa", 403);
    }

    const query = {
      dish_id: dishId,
      user_id: userId,
      order_id: order_id,
    };

    if (order_id) {
      query.order_id = order_id;
    }

    const existingRating = await Rating.findOne(query)
      .populate("user_id", "name email avatar active")
      .populate("dish_id", "name imageUrls defaultImageIndex");

    const order = await Order.findOne({
      _id: order_id,
      user_id: userId,
      status: "completed",
    });

    let hasPurchased = false;
    if (order) {
      hasPurchased = order.items.some(
        (item) =>
          String(item.dish_id) === String(dishId) ||
          String(item.dish_id?._id) === String(dishId)
      );
    }

    console.log("Final result:", {
      hasPurchased,
      hasRated: !!existingRating,
    });

    return response.sendSuccess(
      res,
      {
        hasPurchased,
        hasRated: !!existingRating,
        rating: existingRating || null,
      },
      "Kiểm tra trạng thái đánh giá thành công",
      200
    );
  } catch (error) {
    console.error("Check user rating error:", error);
    return response.sendError(
      res,
      "Có lỗi xảy ra khi kiểm tra đánh giá",
      500,
      error.message
    );
  }
};

export const getRatingsByDish = async (req, res) => {
  try {
    const { dishId } = req.params;
    const { page = 1, limit = 5 } = req.query;

    const ratingsAggregation = await Rating.aggregate([
      {
        $match: {
          dish_id: new mongoose.Types.ObjectId(dishId),
          status: "visible",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "user_id",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user",
      },
      {
        $match: {
          "user.active": true,
        },
      },
      {
        $project: {
          dish_id: 1,
          user_id: 1,
          order_id: 1,
          content: 1,
          rating: 1,
          status: 1,
          created_at: 1,
          updated_at: 1,
          "user._id": 1,
          "user.name": 1,
          "user.email": 1,
          "user.avatar": 1,
          "user.active": 1,
        },
      },
      {
        $sort: { created_at: -1 },
      },
      {
        $facet: {
          ratings: [
            { $skip: (page - 1) * parseInt(limit) },
            { $limit: parseInt(limit) },
          ],
          totalCount: [{ $count: "count" }],
        },
      },
    ]);

    const ratings = ratingsAggregation[0].ratings.map((r) => ({
      ...r,
      user_id: r.user,
    }));

    const total = ratingsAggregation[0].totalCount[0]?.count || 0;

    const avgRating = await Rating.aggregate([
      {
        $match: {
          dish_id: new mongoose.Types.ObjectId(dishId),
          status: "visible",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "user_id",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user",
      },
      {
        $match: {
          "user.active": true,
        },
      },
      {
        $group: {
          _id: null,
          avgRating: { $avg: "$rating" },
          totalRatings: { $sum: 1 },
        },
      },
    ]);

    return response.sendSuccess(
      res,
      {
        ratings,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          total_pages: Math.ceil(total / parseInt(limit)),
        },
        averageRating: avgRating[0]?.avgRating || 0,
        totalRatings: avgRating[0]?.totalRatings || 0,
      },
      "Lấy danh sách đánh giá thành công",
      200
    );
  } catch (error) {
    console.error("Get ratings error:", error);
    return response.sendError(
      res,
      "Có lỗi xảy ra khi lấy danh sách đánh giá",
      500,
      error.message
    );
  }
};

export const deleteRating = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const isAdmin = req.user.role === "admin";

    const rating = await Rating.findById(id);
    if (!rating) {
      return response.sendError(res, "Không tìm thấy đánh giá", 404);
    }

    if (!isAdmin && rating.user_id.toString() !== userId.toString()) {
      return response.sendError(
        res,
        "Bạn không có quyền xóa đánh giá này",
        403
      );
    }

    const dishId = rating.dish_id;
    await rating.deleteOne();
    await Dish.updateDishRating(dishId);

    return response.sendSuccess(res, null, "Xóa đánh giá thành công", 200);
  } catch (error) {
    console.error("Delete rating error:", error);
    return response.sendError(
      res,
      "Có lỗi xảy ra khi xóa đánh giá",
      500,
      error.message
    );
  }
};

export const updateRating = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, rating, status } = req.body;
    const userId = req.user.userId;
    const isAdmin = req.user.role === "admin";

    const existingRating = await Rating.findById(id).populate(
      "user_id",
      "active"
    );

    if (!existingRating) {
      return response.sendError(res, "Không tìm thấy đánh giá", 404);
    }

    if (
      !isAdmin &&
      existingRating.user_id._id.toString() !== userId.toString()
    ) {
      return response.sendError(
        res,
        "Bạn không có quyền cập nhật đánh giá này",
        403
      );
    }

    if (!isAdmin && !existingRating.user_id.active) {
      return response.sendError(
        res,
        "Tài khoản của bạn đã bị khóa. Không thể cập nhật đánh giá!",
        403
      );
    }

    if (!isAdmin) {
      const order = await Order.findOne({
        _id: existingRating.order_id,
        user_id: userId,
        status: "completed",
      });

      if (!order) {
        return response.sendError(
          res,
          "Không thể chỉnh sửa đánh giá do đơn hàng đã thay đổi trạng thái",
          400
        );
      }

      // Check if within 3 days of rating creation
      if (!existingRating.created_at) {
        return response.sendError(
          res,
          "Không xác định được thời gian tạo đánh giá",
          400
        );
      }
      const now = new Date();
      const createdAt = new Date(existingRating.created_at);
      const diffDays = (now - createdAt) / (1000 * 60 * 60 * 24);
      if (diffDays > 3) {
        return response.sendError(
          res,
          "Bạn chỉ có thể chỉnh sửa đánh giá trong vòng 3 ngày kể từ khi tạo đánh giá",
          400
        );
      }
    }

    if (content !== undefined) existingRating.content = content;
    if (rating !== undefined) existingRating.rating = rating;
    if (status !== undefined && isAdmin) existingRating.status = status;

    await existingRating.save();

    const updatedRating = await existingRating.populate(
      "user_id",
      "name email avatar active"
    );

    if (rating !== undefined || status !== undefined) {
      await Dish.updateDishRating(existingRating.dish_id);
    }

    return response.sendSuccess(
      res,
      { rating: updatedRating },
      "Cập nhật đánh giá thành công",
      200
    );
  } catch (error) {
    console.error("Update rating error:", error);
    return response.sendError(
      res,
      "Có lỗi xảy ra khi cập nhật đánh giá",
      500,
      error.message
    );
  }
};

export const getDishAverageRating = async (req, res) => {
  try {
    const { dishId } = req.params;

    const result = await Rating.aggregate([
      {
        $match: {
          dish_id: new mongoose.Types.ObjectId(dishId),
          status: "visible",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "user_id",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user",
      },
      {
        $match: {
          "user.active": true,
        },
      },
      {
        $group: {
          _id: null,
          avgRating: { $avg: "$rating" },
          totalRatings: { $sum: 1 },
          ratingDistribution: {
            $push: "$rating",
          },
        },
      },
    ]);

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    if (result[0]?.ratingDistribution) {
      result[0].ratingDistribution.forEach((rating) => {
        distribution[rating] = (distribution[rating] || 0) + 1;
      });
    }

    return response.sendSuccess(
      res,
      {
        averageRating: result[0]?.avgRating || 0,
        totalRatings: result[0]?.totalRatings || 0,
        distribution,
      },
      "Lấy rating trung bình thành công",
      200
    );
  } catch (error) {
    console.error("Get average rating error:", error);
    return response.sendError(
      res,
      "Có lỗi xảy ra khi tính rating trung bình",
      500,
      error.message
    );
  }
};

export const getAllRatings = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, searchUser, searchDish } = req.query;
    const skip = (page - 1) * limit;

    const filter = {};

    if (status && status !== "all") {
      filter.status = status;
    }

    const ratingsAggregation = await Rating.aggregate([
      {
        $match: filter,
      },
      {
        $lookup: {
          from: "users",
          localField: "user_id",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $lookup: {
          from: "dishes",
          localField: "dish_id",
          foreignField: "_id",
          as: "dish",
        },
      },
      {
        $lookup: {
          from: "orders",
          localField: "order_id",
          foreignField: "_id",
          as: "order",
        },
      },
      {
        $unwind: "$user",
      },
      {
        $unwind: "$dish",
      },
      {
        $unwind: {
          path: "$order",
        },
      },
      {
        $match: {
          ...(searchUser && {
            $or: [
              {
                "user.name": {
                  $regex: removeVietnameseTones(searchUser),
                  $options: "i",
                },
              },
              {
                "user.email": {
                  $regex: removeVietnameseTones(searchUser),
                  $options: "i",
                },
              },
            ],
          }),
          ...(searchDish && {
            "dish.name": {
              $regex: removeVietnameseTones(searchDish),
              $options: "i",
            },
          }),
        },
      },
      {
        $sort: { created_at: -1 },
      },
      {
        $facet: {
          ratings: [{ $skip: skip }, { $limit: parseInt(limit) }],
          totalCount: [{ $count: "count" }],
        },
      },
    ]);

    const ratings = ratingsAggregation[0].ratings;
    const total = ratingsAggregation[0].totalCount[0]?.count || 0;

    return response.sendSuccess(
      res,
      {
        ratings: ratings.map((r) => ({
          _id: r._id,
          user_id: r.user?._id,
          userName: r.user?.name || "Không rõ",
          userEmail: r.user?.email,
          userActive: r.user?.active,
          dish_id: {
            _id: r.dish?._id,
            name: r.dish?.name,
            imageUrls: r.dish?.imageUrls,
            defaultImageIndex: r.dish?.defaultImageIndex,
          },
          dishName: r.dish?.name || "Không rõ",
          order_id: {
            _id: r.order?._id || r.order_id,
            order_number: r.order?.order_number,
          },
          content: r.content,
          rating: r.rating,
          status: r.status,
          created_at: r.created_at,
          updated_at: r.updated_at,
          isVisible: r.status === "visible" && r.user?.active === true,
        })),
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          total_pages: Math.ceil(total / parseInt(limit)),
        },
      },
      "Lấy danh sách đánh giá thành công",
      200
    );
  } catch (error) {
    console.error("Get all ratings error:", error);
    return response.sendError(
      res,
      "Có lỗi xảy ra khi lấy danh sách đánh giá",
      500,
      error.message
    );
  }
};

export const getOrderRatings = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.userId;

    const order = await Order.findOne({
      _id: orderId,
      user_id: userId,
    });

    if (!order) {
      return response.sendError(res, "Đơn hàng không tồn tại", 404);
    }

    const ratings = await Rating.find({
      order_id: orderId,
      user_id: userId,
    })
      .populate("dish_id", "name imageUrls defaultImageIndex")
      .populate("user_id", "name email avatar active");

    return response.sendSuccess(
      res,
      { ratings },
      "Lấy danh sách đánh giá thành công",
      200
    );
  } catch (error) {
    console.error("Get order ratings error:", error);
    return response.sendError(
      res,
      "Có lỗi xảy ra khi lấy danh sách đánh giá",
      500,
      error.message
    );
  }
};

// Manager: Get all ratings with filters
export const getAllRatingsForManager = async (req, res) => {
  try {
    const { page = 1, limit = 10, searchUser, searchDish } = req.query;
    const skip = (page - 1) * limit;
    const managerBranchId = req.user.branch_id;

    // Manager phải có branch_id
    if (!managerBranchId) {
      return response.sendError(res, "Manager chưa được gán chi nhánh", 403);
    }

    const ratingsAggregation = await Rating.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "user_id",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $lookup: {
          from: "dishes",
          localField: "dish_id",
          foreignField: "_id",
          as: "dish",
        },
      },
      {
        $lookup: {
          from: "orders",
          localField: "order_id",
          foreignField: "_id",
          as: "order",
        },
      },
      {
        $unwind: "$user",
      },
      {
        $unwind: "$dish",
      },
      {
        $unwind: {
          path: "$order",
        },
      },
      {
        $match: {
          "order.branch_id": new mongoose.Types.ObjectId(managerBranchId),
          ...(searchUser && {
            "user.name": createVietnameseRegex(
              removeVietnameseTones(searchUser)
            ),
          }),
          ...(searchDish && {
            "dish.name": createVietnameseRegex(
              removeVietnameseTones(searchDish)
            ),
          }),
        },
      },
      {
        $sort: { created_at: -1 },
      },
      {
        $facet: {
          ratings: [{ $skip: skip }, { $limit: parseInt(limit) }],
          totalCount: [{ $count: "count" }],
        },
      },
    ]);

    const ratings = ratingsAggregation[0].ratings;
    const total = ratingsAggregation[0].totalCount[0]?.count || 0;

    return response.sendSuccess(
      res,
      {
        ratings: ratings.map((r) => ({
          _id: r._id,
          user_id: r.user?._id,
          userName: r.user?.name || "Không rõ",
          userEmail: r.user?.email,
          userActive: r.user?.active,
          dish_id: {
            _id: r.dish?._id,
            name: r.dish?.name,
            imageUrls: r.dish?.imageUrls,
            defaultImageIndex: r.dish?.defaultImageIndex,
          },
          dishName: r.dish?.name || "Không rõ",
          order_id: {
            _id: r.order?._id || r.order_id,
            order_number: r.order?.order_number,
          },
          content: r.content,
          rating: r.rating,
          status: r.status,
          created_at: r.created_at,
          updated_at: r.updated_at,
          isVisible: r.status === "visible" && r.user?.active === true,
        })),
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          total_pages: Math.ceil(total / parseInt(limit)),
        },
      },
      "Lấy danh sách đánh giá thành công",
      200
    );
  } catch (error) {
    console.error("Get all ratings for manager error:", error);
    return response.sendError(
      res,
      "Có lỗi xảy ra khi lấy danh sách đánh giá",
      500,
      error.message
    );
  }
};
