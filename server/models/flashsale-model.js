import mongoose from "mongoose";

const flashSaleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true, // Ví dụ: "Flash Sale Cuối Tuần"
      trim: true,
    },

    // Thời gian bắt đầu và kết thúc
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },

    // Danh sách sản phẩm trong flash sale
    dishes: [
      {
        dish_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Dish", // Liên kết đến bảng Dish
          required: true,
        },
        salePrice: {
          type: Number,
          required: true, // Giá sale
        },
        originalPrice: {
          type: Number, // Giá gốc (nếu muốn lưu lại)
        },
        stock: {
          type: Number,
          required: true, // Số lượng dành riêng cho Flash Sale
          min: 0,
        },
        sold: {
          type: Number,
          default: 0, // Số lượng đã bán trong chương trình
        },
      },
    ],

    description: {
      type: String,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Admin tạo chương trình
    },
  },
  {
    timestamps: true, // Tự động thêm createdAt, updatedAt
  }
);

// Virtual để tính trạng thái dựa trên thời gian
flashSaleSchema.virtual("status").get(function () {
  const now = new Date();
  if (now < this.startTime) {
    return "upcoming";
  } else if (now >= this.startTime && now <= this.endTime) {
    return "active";
  } else {
    return "ended";
  }
});

// Đảm bảo virtuals được bao gồm khi chuyển đổi sang JSON
flashSaleSchema.set("toJSON", { virtuals: true });
flashSaleSchema.set("toObject", { virtuals: true });

export default mongoose.model("FlashSale", flashSaleSchema);
