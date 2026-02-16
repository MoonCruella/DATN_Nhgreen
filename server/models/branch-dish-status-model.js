import mongoose from "mongoose";

const BranchDishStatusSchema = new mongoose.Schema(
  {
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
    },
    dishId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dish",
      required: true,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure unique branch-dish combination
BranchDishStatusSchema.index({ branchId: 1, dishId: 1 }, { unique: true });

export default mongoose.model("BranchDishStatus", BranchDishStatusSchema);
