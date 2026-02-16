import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    dish_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dish",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    flashSaleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FlashSale",
      default: null,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

// Đảm bảo 1 user không có 2 dòng cùng dish
cartItemSchema.index({ user_id: 1, dish_id: 1 }, { unique: true });

export default mongoose.model("CartItem", cartItemSchema);
