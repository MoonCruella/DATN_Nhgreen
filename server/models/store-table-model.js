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
    qr_token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

storeTableSchema.index({ branch_id: 1, name: 1 }, { unique: true });

storeTableSchema.pre("validate", function (next) {
  if (!this.qr_token) {
    this.qr_token = crypto.randomBytes(24).toString("hex");
  }
  next();
});

export default mongoose.model("StoreTable", storeTableSchema);
