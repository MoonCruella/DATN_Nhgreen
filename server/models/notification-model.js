import mongoose from "mongoose";
const { Schema } = mongoose;

const notificationSchema = new Schema({
  recipient_id: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  sender_id: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  type: {
    type: String,
    enum: [
      "new_order",
      "dine_in_items_added",
      "cash_payment_requested",
      "order_status",
      "order_confirmed",
      "order_cancelled",
      "cancel_request",
      "order_cancelled_branch", // Thông báo hủy đơn cho manager
      "not_received_report", // Báo cáo chưa nhận hàng
      "new_rating",
      "new_product",
      "new_comment",
      "system",
    ],
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  reference_id: {
    type: Schema.Types.ObjectId,
    refPath: "reference_model",
  },
  reference_model: {
    type: String,
    enum: ["Order", "Dish", "Rating"],
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {},
  },
  is_read: {
    type: Boolean,
    default: false,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

// Static method để lấy thông báo của một user
notificationSchema.statics.getByUser = async function (
  userId,
  page = 1,
  limit = 10
) {
  const skip = (page - 1) * limit;

  const notifications = await this.find({ recipient_id: userId })
    .sort({ created_at: -1 })
    .skip(skip)
    .limit(limit)
    .populate("sender_id", "name avatar")
    .populate({
      path: "reference_id",
      select:
        "order_number order_type order_channel table_id table_info total_amount status payment_status",
    });

  const total = await this.countDocuments({ recipient_id: userId });

  return {
    notifications,
    pagination: {
      total,
      currentPage: page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// Static method để đánh dấu thông báo đã đọc
notificationSchema.statics.markAsRead = async function (
  notificationId,
  userId
) {
  return this.findOneAndUpdate(
    { _id: notificationId, recipient_id: userId },
    { is_read: true },
    { new: true }
  );
};

// Static method để đánh dấu tất cả thông báo đã đọc
notificationSchema.statics.markAllAsRead = async function (userId) {
  return this.updateMany(
    { recipient_id: userId, is_read: false },
    { is_read: true }
  );
};

// Static method để đếm số thông báo chưa đọc
notificationSchema.statics.countUnread = async function (userId) {
  return this.countDocuments({ recipient_id: userId, is_read: false });
};

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
