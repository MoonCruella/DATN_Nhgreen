import CartItem from "../models/cart-model.js";
import Dish from "../models/dish-model.js";
import FlashSale from "../models/flashsale-model.js";

// 1. Lấy giỏ hàng của user
export const getCart = async (req, res) => {
  try {
    const userId = req.user.userId;
    const cartItems = await CartItem.find({ user_id: userId })
      .populate(
        "dish_id",
        "name price sale_price imageUrls defaultImageIndex status"
      )
      .sort({ updated_at: -1 }) // món ăn vừa thêm hoặc update lên đầu
      .lean();

    // Kiểm tra Flash Sale cho từng item
    const now = new Date();
    const activeFlashSale = await FlashSale.findOne({
      startTime: { $lte: now },
      endTime: { $gte: now },
    }).lean();

    const cartItemsWithFlashSale = cartItems.map((item) => {
      // Nếu item có flashSaleId, kiểm tra xem Flash Sale còn active không
      if (
        item.flashSaleId &&
        activeFlashSale &&
        activeFlashSale._id.toString() === item.flashSaleId.toString()
      ) {
        const flashSaleDish = activeFlashSale.dishes.find(
          (fd) => fd.dish_id.toString() === item.dish_id._id.toString()
        );

        if (flashSaleDish && flashSaleDish.sold < flashSaleDish.stock) {
          return {
            ...item,
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
        } else {
          // Flash Sale hết hàng hoặc kết thúc, xóa flashSaleId
          CartItem.findByIdAndUpdate(item._id, {
            $unset: { flashSaleId: 1 },
          }).exec();
        }
      }
      return item;
    });

    res.json({
      success: true,
      data: cartItemsWithFlashSale,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 2. Thêm món ăn vào giỏ
export const addToCart = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { dish_id, quantity, flashSaleId } = req.body;

    // Import User model if not already imported
    const User = (await import("../models/user-model.js")).default;
    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Check ban status
    const banStatus = user.isBanned();
    if (banStatus.isBanned) {
      return res.status(403).json({
        success: false,
        message: banStatus.message,
        banned: true,
        banned_until: banStatus.banned_until,
      });
    }

    // Kiểm tra món ăn có tồn tại không
    const dish = await Dish.findById(dish_id);
    if (!dish) {
      return res
        .status(404)
        .json({ success: false, message: "Dish not found" });
    }

    const requestedQty = quantity || 1;

    // Nếu có flashSaleId, validate Flash Sale với atomic operation
    if (flashSaleId) {
      const now = new Date();
      const flashSale = await FlashSale.findOne({
        _id: flashSaleId,
        startTime: { $lte: now },
        endTime: { $gte: now },
      });

      if (!flashSale) {
        return res.status(400).json({
          success: false,
          message: "Flash Sale đã kết thúc hoặc không tồn tại",
        });
      }

      const flashSaleDish = flashSale.dishes.find(
        (fd) => fd.dish_id.toString() === dish_id.toString()
      );

      if (!flashSaleDish) {
        return res.status(400).json({
          success: false,
          message: "Sản phẩm không có trong Flash Sale",
        });
      }

      const remaining = flashSaleDish.stock - flashSaleDish.sold;
      if (remaining <= 0) {
        return res.status(400).json({
          success: false,
          message: "Sản phẩm Flash Sale đã hết hàng",
        });
      }

      // Kiểm tra số lượng user đang có trong giỏ
      const existingCartItem = await CartItem.findOne({
        user_id: userId,
        dish_id,
        flashSaleId,
      });
      const currentQtyInCart = existingCartItem?.quantity || 0;
      const totalRequestedQty = currentQtyInCart + requestedQty;

      if (totalRequestedQty > remaining) {
        return res.status(400).json({
          success: false,
          message: `Chỉ còn ${remaining} sản phẩm trong Flash Sale. Bạn đã có ${currentQtyInCart} trong giỏ.`,
        });
      }

      // ⚠️ CRITICAL: Reserve stock atomically để tránh race condition
      // Sử dụng findOneAndUpdate với điều kiện kiểm tra stock
      const updatedFlashSale = await FlashSale.findOneAndUpdate(
        {
          _id: flashSaleId,
          "dishes.dish_id": dish_id,
          $expr: {
            $gte: [
              {
                $subtract: [
                  {
                    $arrayElemAt: [
                      {
                        $map: {
                          input: {
                            $filter: {
                              input: "$dishes",
                              cond: { $eq: ["$$this.dish_id", dish._id] },
                            },
                          },
                          in: "$$this.stock",
                        },
                      },
                      0,
                    ],
                  },
                  {
                    $arrayElemAt: [
                      {
                        $map: {
                          input: {
                            $filter: {
                              input: "$dishes",
                              cond: { $eq: ["$$this.dish_id", dish._id] },
                            },
                          },
                          in: "$$this.sold",
                        },
                      },
                      0,
                    ],
                  },
                ],
              },
              requestedQty,
            ],
          },
        },
        {
          $inc: { "dishes.$[elem].sold": requestedQty },
        },
        {
          arrayFilters: [{ "elem.dish_id": dish_id }],
          new: true,
        }
      );

      if (!updatedFlashSale) {
        return res.status(400).json({
          success: false,
          message:
            "Sản phẩm Flash Sale đã hết hàng hoặc không đủ số lượng. Vui lòng thử lại!",
        });
      }
    }

    // Kiểm tra đã có trong giỏ chưa
    let cartItem = await CartItem.findOne({ user_id: userId, dish_id });

    if (cartItem) {
      // Nếu đã có, cập nhật quantity và flashSaleId
      cartItem.quantity += requestedQty;
      if (flashSaleId) {
        cartItem.flashSaleId = flashSaleId;
      }
    } else {
      // Tạo mới
      cartItem = new CartItem({
        user_id: userId,
        dish_id,
        quantity: requestedQty,
        flashSaleId: flashSaleId || null,
      });
    }

    await cartItem.save();
    cartItem = await cartItem.populate(
      "dish_id",
      "name price sale_price imageUrls defaultImageIndex status"
    );
    res.json({ success: true, data: cartItem });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 3. Cập nhật số lượng (theo cartItem _id)
export const updateCartItem = async (req, res) => {
  try {
    const { id } = req.params; // cartItem _id
    const { quantity } = req.body;

    const cartItem = await CartItem.findById(id);
    if (!cartItem) {
      return res
        .status(404)
        .json({ success: false, message: "Item not found" });
    }

    const oldQuantity = cartItem.quantity;
    const quantityDiff = quantity - oldQuantity;

    // Nếu giảm số lượng hoặc xóa (quantity <= 0)
    if (quantity <= 0) {
      // Release reserved stock nếu có flashSaleId
      if (cartItem.flashSaleId) {
        await FlashSale.findOneAndUpdate(
          {
            _id: cartItem.flashSaleId,
            "dishes.dish_id": cartItem.dish_id,
          },
          {
            $inc: { "dishes.$[elem].sold": -oldQuantity },
          },
          {
            arrayFilters: [{ "elem.dish_id": cartItem.dish_id }],
          }
        );
      }

      await cartItem.deleteOne();
      return res.json({ success: true, message: "Item removed" });
    }

    // Nếu tăng số lượng và có flashSaleId
    if (quantityDiff > 0 && cartItem.flashSaleId) {
      const now = new Date();
      const flashSale = await FlashSale.findOne({
        _id: cartItem.flashSaleId,
        startTime: { $lte: now },
        endTime: { $gte: now },
      });

      if (!flashSale) {
        return res.status(400).json({
          success: false,
          message: "Flash Sale đã kết thúc",
        });
      }

      const flashSaleDish = flashSale.dishes.find(
        (fd) => fd.dish_id.toString() === cartItem.dish_id.toString()
      );

      if (!flashSaleDish) {
        return res.status(400).json({
          success: false,
          message: "Sản phẩm không có trong Flash Sale",
        });
      }

      const remaining = flashSaleDish.stock - flashSaleDish.sold;
      if (quantityDiff > remaining) {
        return res.status(400).json({
          success: false,
          message: `Chỉ còn ${remaining} sản phẩm trong Flash Sale`,
        });
      }

      // Reserve thêm stock atomically
      const updatedFlashSale = await FlashSale.findOneAndUpdate(
        {
          _id: cartItem.flashSaleId,
          "dishes.dish_id": cartItem.dish_id,
          $expr: {
            $gte: [
              {
                $subtract: [
                  {
                    $arrayElemAt: [
                      {
                        $map: {
                          input: {
                            $filter: {
                              input: "$dishes",
                              cond: {
                                $eq: ["$$this.dish_id", cartItem.dish_id],
                              },
                            },
                          },
                          in: "$$this.stock",
                        },
                      },
                      0,
                    ],
                  },
                  {
                    $arrayElemAt: [
                      {
                        $map: {
                          input: {
                            $filter: {
                              input: "$dishes",
                              cond: {
                                $eq: ["$$this.dish_id", cartItem.dish_id],
                              },
                            },
                          },
                          in: "$$this.sold",
                        },
                      },
                      0,
                    ],
                  },
                ],
              },
              quantityDiff,
            ],
          },
        },
        {
          $inc: { "dishes.$[elem].sold": quantityDiff },
        },
        {
          arrayFilters: [{ "elem.dish_id": cartItem.dish_id }],
          new: true,
        }
      );

      if (!updatedFlashSale) {
        return res.status(400).json({
          success: false,
          message: "Không đủ số lượng trong Flash Sale. Vui lòng thử lại!",
        });
      }
    }

    // Nếu giảm số lượng và có flashSaleId
    if (quantityDiff < 0 && cartItem.flashSaleId) {
      await FlashSale.findOneAndUpdate(
        {
          _id: cartItem.flashSaleId,
          "dishes.dish_id": cartItem.dish_id,
        },
        {
          $inc: { "dishes.$[elem].sold": quantityDiff }, // quantityDiff là số âm
        },
        {
          arrayFilters: [{ "elem.dish_id": cartItem.dish_id }],
        }
      );
    }

    cartItem.quantity = quantity;
    await cartItem.save();

    res.json({ success: true, data: cartItem });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 4. Xóa 1 món ăn khỏi giỏ (theo cartItem _id)
export const removeFromCart = async (req, res) => {
  try {
    const { id } = req.params; // cartItem _id

    const cartItem = await CartItem.findById(id);
    if (!cartItem) {
      return res
        .status(404)
        .json({ success: false, message: "Item not found" });
    }

    // Release reserved stock nếu có flashSaleId
    if (cartItem.flashSaleId) {
      await FlashSale.findOneAndUpdate(
        {
          _id: cartItem.flashSaleId,
          "dishes.dish_id": cartItem.dish_id,
        },
        {
          $inc: { "dishes.$[elem].sold": -cartItem.quantity },
        },
        {
          arrayFilters: [{ "elem.dish_id": cartItem.dish_id }],
        }
      );
    }

    await cartItem.deleteOne();
    res.json({ success: true, message: "Item removed" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 5. Xóa toàn bộ giỏ vẫn dựa vào user_id
export const clearCart = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Lấy tất cả cart items trước khi xóa để release stock
    const cartItems = await CartItem.find({ user_id: userId });

    // Release stock cho các Flash Sale items
    for (const item of cartItems) {
      if (item.flashSaleId) {
        await FlashSale.findOneAndUpdate(
          {
            _id: item.flashSaleId,
            "dishes.dish_id": item.dish_id,
          },
          {
            $inc: { "dishes.$[elem].sold": -item.quantity },
          },
          {
            arrayFilters: [{ "elem.dish_id": item.dish_id }],
          }
        );
      }
    }

    await CartItem.deleteMany({ user_id: userId });

    res.json({ success: true, message: "Cart cleared" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
export const removeMultipleItems = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { itemIds } = req.body;

    // Validate input
    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "itemIds must be a non-empty array",
      });
    }

    // Lấy các items trước khi xóa để release stock
    const cartItems = await CartItem.find({
      user_id: userId,
      _id: { $in: itemIds },
    });

    // Release stock cho các Flash Sale items
    for (const item of cartItems) {
      if (item.flashSaleId) {
        await FlashSale.findOneAndUpdate(
          {
            _id: item.flashSaleId,
            "dishes.dish_id": item.dish_id,
          },
          {
            $inc: { "dishes.$[elem].sold": -item.quantity },
          },
          {
            arrayFilters: [{ "elem.dish_id": item.dish_id }],
          }
        );
      }
    }

    // Xóa các items
    const result = await CartItem.deleteMany({
      user_id: userId,
      _id: { $in: itemIds },
    });

    // Lấy lại giỏ hàng còn lại
    const remainingItems = await CartItem.find({ user_id: userId })
      .populate(
        "dish_id",
        "name price sale_price imageUrls defaultImageIndex status"
      )
      .sort({ updated_at: -1 });

    res.json({
      success: true,
      message: `${result.deletedCount} items removed successfully`,
      data: {
        deletedCount: result.deletedCount,
        items: remainingItems,
      },
    });
  } catch (err) {
    console.error("❌ Remove multiple items error:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
