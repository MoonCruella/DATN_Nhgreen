import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Branch (store both reference and snapshot at order time)
    branch_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
    },
    branch_info: {
      name: String,
      phone: String,
      address: {
        full_address: String,
        street: String,
        ward: {
          code: String,
          name: String,
        },
        district: {
          code: String,
          name: String,
        },
        province: {
          code: String,
          name: String,
        },
        coordinates: {
          latitude: Number,
          longitude: Number,
        },
      },
    },
    order_number: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "completed",
        "cancelled",
        "cancel_request",
      ],
      default: "pending",
    },
    items: [
      {
        dish_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Dish",
          required: true,
        },
        // Hardcoded dish data - Lưu thông tin sản phẩm tại thời điểm đặt hàng
        dish_name: {
          type: String,
          required: true,
        },
        dish_slug: {
          type: String,
        },
        dish_image: {
          type: String, // URL ảnh chính
        },
        dish_description: {
          type: String,
        },
        category_name: {
          type: String,
        },
        category_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Category",
        },
        // Pricing info
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        price: {
          type: Number,
          required: true,
          min: 0,
        },
        sale_price: {
          type: Number,
          default: 0,
          min: 0,
        },
        original_price: {
          type: Number, // Giá gốc trước khi giảm
        },
        total: {
          type: Number,
          required: true,
          min: 0,
        },
        // Additional dish info
        sku: {
          type: String,
        },
        weight: {
          type: Number, // Khối lượng (gram)
        },
        unit: {
          type: String, // Đơn vị: kg, gói, hộp...
        },
        // Variant info (nếu có)
        variant: {
          size: String,
          color: String,
          other_attributes: mongoose.Schema.Types.Mixed,
        },
        // Discount info
        discount_percent: {
          type: Number,
          default: 0,
        },
        discount_amount: {
          type: Number,
          default: 0,
        },
        // dish status at order time
        was_on_sale: {
          type: Boolean,
          default: false,
        },
        was_featured: {
          type: Boolean,
          default: false,
        },
        // Metadata
        created_at: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    subtotal: {
      type: Number,
      required: true,
    },
    total_amount: {
      type: Number,
      required: true,
    },
    shipping_fee: {
      type: Number,
      default: 0,
    },
    freeship_value: {
      type: Number,
      default: 0,
    },
    discount_value: {
      type: Number,
      default: 0,
    },
    coin_discount: {
      type: Number,
      default: 0,
    },
    payment_method: {
      type: String,
      enum: ["cod", "bank_transfer", "vnpay", "momo", "zalopay"],
    },
    payment_status: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    shipping_info: {
      name: String,
      phone: String,
      address: String,
      province: String,
      district: String,
      ward: String,
    },
    notes: String,
    tracking_number: String,
    cancel_reason: String,
    cancel_requested_at: Date,
    cancel_request_rejected: {
      type: Boolean,
      default: false,
    },

    history: [
      {
        status: String,
        date: Date,
        note: String,
        updated_by: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      },
    ],

    confirmed_at: Date,
    processing_at: Date,
    shipped_at: Date,
    delivered_at: Date,
    cancelled_at: Date,
    completed_at: Date,
    payment_date: Date,
    customer_confirmed: {
      type: Boolean,
      default: false,
    },
    not_received: {
      type: Boolean,
      default: false,
    },
    not_received_at: Date,
    auto_completed: {
      type: Boolean,
      default: false,
    },
    auto_complete_scheduled_at: Date,
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

// Indexes
orderSchema.index({ user_id: 1, status: 1 });
orderSchema.index({ branch_id: 1, status: 1 });
orderSchema.index({ order_number: 1 });
orderSchema.index({ created_at: -1 });
orderSchema.index({ status: 1, created_at: 1 });
orderSchema.index({ "items.dish_id": 1 });

// Virtual để check xem dish còn tồn tại không
orderSchema.virtual("items.dish_exists").get(function () {
  return this.items.map(async (item) => {
    const Dish = mongoose.model("Dish");
    return await Dish.exists({ _id: item.dish_id });
  });
});

export default mongoose.model("Order", orderSchema);
