import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    order_channel: {
      type: String,
      enum: ["delivery", "dine_in", "dine_in_qr"],
      default: "delivery",
      index: true,
    },
    order_type: {
      type: String,
      enum: ["online", "dine_in"],
      default: "online",
      index: true,
    },
    table_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StoreTable",
      default: null,
      index: true,
    },
    table_info: {
      name: String,
      code: String,
    },
    dine_in_session_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DineInSession",
      default: null,
      index: true,
    },
    payment_gateway_ref: {
      gateway: String,
      transaction_id: String,
      app_trans_id: String,
      response_code: String,
      raw: mongoose.Schema.Types.Mixed,
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
      shop_id: Number,
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
        total: {
          type: Number,
          required: true,
          min: 0,
        },
        // Additional dish info
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
        // Metadata
        created_at: {
          type: Date,
          default: Date.now,
        },
      },
    ],
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
    voucher_codes: {
      freeship: String,
      discount: String,
    },
    coin_discount: {
      type: Number,
      default: 0,
    },
    reward_coin_earned: {
      type: Number,
      default: 0,
    },
    reward_coin_awarded_at: Date,
    reward_coin_user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
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
    vnpay_txn_ref: String,
    vnpay_transaction_no: String,
    vnpay_create_date: String,
    vnpay_pay_date: String,
    vnpay_amount: Number,
    momo_request_id: String,
    momo_trans_id: String,
    momo_amount: Number,
    zalopay_app_trans_id: String,
    zalopay_zp_trans_id: String,
    zalopay_amount: Number,
    refund_status: {
      type: String,
      enum: ["none", "success", "failed"],
      default: "none",
    },
    refund_amount: Number,
    refund_date: Date,
    refund_response_code: String,
    refund_message: String,
    shipping_info: {
      name: String,
      phone: String,
      address: String,
      full_name: String,
      street: String,
      full_address: String,
      ward: {
        code: String,
        name: String,
      },
      district: {
        code: Number,
        name: String,
      },
      province: {
        code: Number,
        name: String,
      },
      coordinates: {
        latitude: { type: Number, default: null },
        longitude: { type: Number, default: null },
      },
    },
    notes: String,
    tracking_number: String,
    carrier: String,
    shipping_provider: String,
    shipping_order_code: String,
    shipping_status: String,
    shipping_raw_response: mongoose.Schema.Types.Mixed,
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
orderSchema.index({ branch_id: 1, order_type: 1, status: 1 });
orderSchema.index({ branch_id: 1, order_channel: 1, status: 1 });
orderSchema.index({ table_id: 1, status: 1 });
orderSchema.index({ order_number: 1 });
orderSchema.index({ created_at: -1 });
orderSchema.index({ status: 1, created_at: 1 });
orderSchema.index({ "items.dish_id": 1 });

const calculateOrderSubtotal = (items = []) =>
  (items || []).reduce((sum, item) => sum + (Number(item.total) || 0), 0);

orderSchema.virtual("subtotal").get(function () {
  return calculateOrderSubtotal(this.items);
});

orderSchema.set("toJSON", { virtuals: true });
orderSchema.set("toObject", { virtuals: true });

export default mongoose.model("Order", orderSchema);
