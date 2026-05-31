import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema(
  {
    order_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    invoice_number: {
      type: String,
      required: true,
      unique: true,
    },
    issue_date: {
      type: Date,
      default: Date.now,
    },
    due_date: {
      type: Date,
    },
    tax: {
      type: Number,
      default: 0,
      min: 0,
    },
    total_amount: {
      type: Number,
      required: true,
      min: 0,
    },
    payment_status: {
      type: String,
      enum: ["unpaid", "paid", "partial", "refunded"],
      default: "unpaid",
    },
    paid_at: {
      type: Date,
    },
    notes: {
      type: String,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

// Indexes giúp tối ưu truy vấn
invoiceSchema.index({ order_id: 1 });
invoiceSchema.index({ invoice_number: 1 }, { unique: true });
invoiceSchema.index({ payment_status: 1 });

export default mongoose.model("Invoice", invoiceSchema);
