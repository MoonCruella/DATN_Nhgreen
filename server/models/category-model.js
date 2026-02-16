import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
      default: "",
    },
    imageUrl: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["available", "suspended"],
      default: "available",
    },
  },
  {
    timestamps: true, // tự động thêm createdAt và updatedAt
  }
);

export default mongoose.model("Category", categorySchema);
