import mongoose from "mongoose";

const ingredientSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    origin: {
      type: String,
      default: "",
    },
    protein: {
      type: Number,
      required: true,
      min: 0,
    },
    fat: {
      type: Number,
      required: true,
      min: 0,
    },
    carbs: {
      type: Number,
      required: true,
      min: 0,
    },
    type: {
      type: String,
      enum: [
        "tinh_bot", // Gạo, khoai, yến mạch, bánh mì...
        "protein_dong_vat", // Thịt, cá, trứng,...
        "protein_thuc_vat", // Đậu, hạt,...
        "rau_cu_qua", // Rau, củ, quả...
        "trai_cay", // Táo, chuối, cam...
        "do_uong", // Nước ép, sữa, sinh tố...
        "do_ngot", // Bánh, kẹo, chocolate...
      ],
      required: true,
    },

    status: {
      type: String,
      enum: ["available", "discontinued"],
      default: "available",
    },
    imageUrl: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// Tự động tính năng lượng chuẩn trên 100g
ingredientSchema.virtual("energyKcal").get(function () {
  return this.protein * 4 + this.fat * 9 + this.carbs * 4;
});

export default mongoose.model("Ingredient", ingredientSchema);
