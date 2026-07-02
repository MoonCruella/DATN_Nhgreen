import mongoose from "mongoose";
import crypto from "crypto";

const storeTableSchema = new mongoose.Schema(
  {
    branch_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      trim: true,
      uppercase: true,
    },
    qr_token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
    deleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deleted_at: {
      type: Date,
      default: null,
    },
    sort_order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

storeTableSchema.index(
  { branch_id: 1, code: 1 },
  {
    unique: true,
    partialFilterExpression: { deleted: false },
  }
);

storeTableSchema.pre("validate", function (next) {
  if (!this.qr_token) {
    this.qr_token = crypto.randomBytes(24).toString("hex");
  }
  if (!this.code && this.name) {
    this.code = this.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 24)
      .toUpperCase();
  }
  next();
});

export default mongoose.model("StoreTable", storeTableSchema);
