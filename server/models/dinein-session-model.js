import mongoose from "mongoose";

const dineInSessionSchema = new mongoose.Schema(
  {
    session_token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    table_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StoreTable",
      required: true,
      index: true,
    },
    branch_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
      index: true,
    },
    cart_items: [
      {
        dish_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Dish",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
      },
    ],
    last_order_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
    status: {
      type: String,
      enum: ["active", "checked_out", "expired"],
      default: "active",
      index: true,
    },
    expires_at: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

export default mongoose.model("DineInSession", dineInSessionSchema);
