import mongoose from "mongoose";

const dineInCustomerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    normalized_phone: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    linked_user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    address: {
      province: String,
      ward: String,
      detail: String,
    },
    note: String,
    coin: {
      type: Number,
      default: 0,
      min: 0,
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

export default mongoose.model("DineInCustomer", dineInCustomerSchema);
