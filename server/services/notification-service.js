import Notification from "../models/notification-model.js";
import User from "../models/user-model.js";
import Order from "../models/order-model.js";
import { getIO } from "../config/socket.js";

// Service để tạo và gửi thông báo
const createNotification = async (data) => {
  try {
    const {
      recipient_id,
      type,
      title,
      message,
      reference_id,
      reference_model,
      sender_id,
      metadata = {},
    } = data;

    const notification = await Notification.create({
      recipient_id,
      type,
      title,
      message,
      reference_id,
      reference_model,
      sender_id: sender_id || null,
      metadata,
    });

    const populatedNotification = await Notification.findById(notification._id)
      .populate("sender_id", "name avatar")
      .populate({
        path: "reference_id",
        select:
          "order_number order_type order_channel table_id table_info total_amount status payment_status",
      });

    const io = getIO();
    io.to(`user:${recipient_id}`).emit(
      "new_notification",
      populatedNotification,
    );

    const unreadCount = await Notification.countUnread(recipient_id);
    io.to(`user:${recipient_id}`).emit("notification_count", {
      count: unreadCount,
    });

    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
};

// Gửi thông báo cho managers của một chi nhánh
const notifyBranchManagers = async (branchId, data) => {
  try {
    const {
      type,
      title,
      message,
      reference_id,
      reference_model,
      sender_id,
      metadata,
    } = data;

    // Tìm tất cả managers của chi nhánh này
    // Convert to string to handle both ObjectId and string types
    const branchIdStr = branchId?.toString();
    const managers = await User.find({
      role: "manager",
      branch_id: branchIdStr,
    });

    console.log(
      `📨 Sending notification to ${managers.length} managers of branch ${branchIdStr}`,
    );
    console.log(
      `👥 Manager IDs:`,
      managers.map((m) => m._id.toString()),
    );

    const notifications = [];
    for (const manager of managers) {
      console.log(`📤 Creating notification for manager: ${manager._id}`);
      const notification = await createNotification({
        recipient_id: manager._id,
        type,
        title,
        message,
        reference_id,
        reference_model,
        sender_id,
        metadata,
      });
      notifications.push(notification);
      console.log(`✅ Notification created: ${notification._id}`);
    }

    return notifications;
  } catch (error) {
    console.error("Error notifying branch managers:", error);
    throw error;
  }
};

// Thông báo đơn hàng mới cho managers của chi nhánh
const notifyNewOrder = async (order) => {
  try {
    // Lấy branch_id từ order
    const branchId = order.branch_id?._id || order.branch_id;

    console.log(
      `🔔 Creating notification for new order #${order.order_number} at branch ${branchId}`,
    );
    console.log(`📦 Order details:`, {
      _id: order._id,
      order_number: order.order_number,
      branch_id: order.branch_id,
      extracted_branchId: branchId,
    });

    const isDineIn = order.order_type === "dine_in";
    const tableName = order.table_info?.name || "bàn";

    return notifyBranchManagers(branchId, {
      type: "new_order",
      title: isDineIn ? "Đơn tại bàn mới" : "Đơn online mới",
      message: isDineIn
        ? `Có đơn tại ${tableName} #${order.order_number} với giá trị ${order.total_amount.toLocaleString("vi-VN")}đ`
        : `Có đơn online mới #${order.order_number} với giá trị ${order.total_amount.toLocaleString("vi-VN")}đ`,
      reference_id: order._id,
      reference_model: "Order",
      sender_id: order.user_id,
      metadata: {
        order_id: order._id,
        order_number: order.order_number,
        order_type: order.order_type || "online",
        order_channel: order.order_channel || "delivery",
        table_id: order.table_id || null,
        table_name: order.table_info?.name || "",
      },
    });
  } catch (error) {
    console.error("Error in notifyNewOrder:", error);
    throw error;
  }
};

// Thông báo yêu cầu hủy đơn cho managers của chi nhánh
const notifyDineInItemsAdded = async (order, addedItems = []) => {
  try {
    const branchId = order.branch_id?._id || order.branch_id;
    const tableName = order.table_info?.name || "bàn";
    const addedQuantity = addedItems.reduce(
      (sum, item) => sum + (Number(item.quantity) || 0),
      0,
    );

    return notifyBranchManagers(branchId, {
      type: "dine_in_items_added",
      title: "Khách gọi thêm món",
      message: `${tableName} vừa gọi thêm món cho đơn #${order.order_number}.`,
      reference_id: order._id,
      reference_model: "Order",
      sender_id: order.user_id || null,
      metadata: {
        order_type: order.order_type || "dine_in",
        order_channel: order.order_channel || "dine_in_qr",
        table_id: order.table_id || null,
        table_name: tableName,
        added_items: addedItems.map((item) => ({
          dish_id: item.dish_id,
          dish_name: item.dish_name,
          quantity: item.quantity,
          total: item.total,
        })),
        added_quantity: addedQuantity,
      },
    });
  } catch (error) {
    console.error("Error in notifyDineInItemsAdded:", error);
    throw error;
  }
};
const notifyCancelRequest = async (order) => {
  try {
    const branchId = order.branch_id?._id || order.branch_id;

    return notifyBranchManagers(branchId, {
      type: "cancel_request",
      title: "Yêu cầu hủy đơn hàng",
      message: `Khách hàng yêu cầu hủy đơn #${order.order_number}. Lý do: ${
        order.cancel_reason || "Không có lý do"
      }`,
      reference_id: order._id,
      reference_model: "Order",
      sender_id: order.user_id,
    });
  } catch (error) {
    console.error("Error in notifyCancelRequest:", error);
    throw error;
  }
};

// Thông báo đơn hàng đã bị hủy cho user
const notifyOrderCancelled = async (order) => {
  try {
    const populatedOrder = await Order.findById(order._id).populate(
      "user_id",
      "name email",
    );

    const notification = await createNotification({
      recipient_id: populatedOrder.user_id._id,
      type: "order_cancelled",
      title: "Đơn hàng đã hủy",
      message: `Đơn hàng #${order.order_number} của bạn đã bị hủy${
        order.cancel_reason ? `. Lý do: ${order.cancel_reason}` : ""
      }`,
      reference_id: order._id,
      reference_model: "Order",
    });

    const io = getIO();
    io.to(`user:${populatedOrder.user_id._id}`).emit("order_cancelled", {
      order_id: order._id,
      order_number: order.order_number,
      cancel_reason: order.cancel_reason,
      cancelled_at: new Date(),
    });

    return notification;
  } catch (error) {
    console.error("Error notifying order cancellation:", error);
    throw error;
  }
};

// Thông báo đơn hàng bị hủy cho tất cả managers của chi nhánh (để họ nắm trạng thái)
const notifyOrderCancelledManagers = async (order) => {
  try {
    const branchId = order.branch_id?._id || order.branch_id;
    console.log(
      `🔔 notifyOrderCancelledManagers called for order #${order.order_number}`,
    );
    console.log(`🏪 Branch ID:`, branchId);
    console.log(`📦 Order details:`, {
      order_id: order._id,
      order_number: order.order_number,
      branch_id: order.branch_id,
      cancel_reason: order.cancel_reason,
    });

    if (!branchId) {
      console.error("❌ No branch_id found for order", order._id);
      return [];
    }

    return notifyBranchManagers(branchId, {
      type: "order_cancelled_branch",
      title: "Đơn hàng bị hủy",
      message: `Đơn hàng #${order.order_number} đã bị hủy${
        order.cancel_reason ? ` với lý do: ${order.cancel_reason}` : ""
      }`,
      reference_id: order._id,
      reference_model: "Order",
      sender_id: order.user_id,
    });
  } catch (error) {
    console.error(
      "❌ Error notifying managers about order cancellation:",
      error,
    );
    throw error;
  }
};

// Thông báo đơn hàng tự động xác nhận cho user
const notifyOrderAutoConfirmed = async (order) => {
  try {
    const populatedOrder = await Order.findById(order._id).populate(
      "user_id",
      "name email",
    );

    const notification = await createNotification({
      recipient_id: populatedOrder.user_id._id,
      type: "order_confirmed",
      title: "Đơn hàng đã xác nhận",
      message: `Đơn hàng #${order.order_number} của bạn đã được xác nhận tự động và đang chờ xử lý`,
      reference_id: order._id,
      reference_model: "Order",
    });

    const io = getIO();
    io.to(`user:${populatedOrder.user_id._id}`).emit("order_status_update", {
      order_id: order._id,
      order_number: order.order_number,
      previous_status: "pending",
      new_status: "confirmed",
      updated_at: new Date(),
      auto_confirmed: true,
    });

    return notification;
  } catch (error) {
    console.error("Error notifying auto-confirmation:", error);
    throw error;
  }
};

// Thông báo đánh giá mới cho seller
const notifyNewRating = async (rating) => {
  try {
    // Populate các thông tin cần thiết
    const populatedRating = await rating.populate([
      { path: "user_id", select: "name" },
      { path: "dish_id", select: "name" },
      { path: "order_id", select: "branch_id" },
    ]);

    const userName = populatedRating.user_id?.name || "Khách hàng";
    const dishName = populatedRating.dish_id?.name || "món ăn";
    const branchId = populatedRating.order_id?.branch_id;

    console.log(
      `🔔 Creating notification for new rating on dish "${dishName}" at branch ${branchId}`,
    );
    console.log(`⭐ Rating details:`, {
      _id: populatedRating._id,
      dish_name: dishName,
      rating_stars: populatedRating.rating,
      branch_id: branchId,
      user_id: populatedRating.user_id?._id,
    });

    if (!branchId) {
      console.error("❌ No branch_id found for rating", populatedRating._id);
      return [];
    }

    return notifyBranchManagers(branchId, {
      type: "new_rating",
      title: "Đánh giá mới",
      message: `${userName} đã đánh giá ${populatedRating.rating} sao cho món "${dishName}"`,
      reference_id: populatedRating._id,
      reference_model: "Rating",
      sender_id: populatedRating.user_id?._id,
    });
  } catch (error) {
    console.error("Error in notifyNewRating:", error);
    throw error;
  }
};

// Thông báo sản phẩm mới cho người dùng
const notifyNewProduct = async (product) => {
  try {
    const users = await User.find({ role: { $ne: "seller" } });

    const notifications = [];
    for (const user of users) {
      const notification = await createNotification({
        recipient_id: user._id,
        type: "new_product",
        title: "Sản phẩm mới",
        message: `Sản phẩm mới "${product.name}" đã được thêm vào cửa hàng`,
        reference_id: product._id,
        reference_model: "Product",
      });
      notifications.push(notification);
    }

    return notifications;
  } catch (error) {
    console.error("Error notifying new product:", error);
    throw error;
  }
};

// Thông báo bình luận mới cho seller
const notifyNewComment = async (comment, productId, productName) => {
  return notifySellers({
    type: "new_comment",
    title: "Bình luận mới",
    message: `Có bình luận mới cho sản phẩm "${productName}"`,
    reference_id: productId,
    reference_model: "Product",
    sender_id: comment.user_id,
  });
};

const notifyOrderStatusUpdate = async (order, previousStatus) => {
  try {
    const populatedOrder = await order.populate("user_id", "name email");

    let title, message;
    switch (order.status) {
      case "confirmed":
        title = "Đơn hàng đã xác nhận";
        message = `Đơn hàng #${order.order_number} của bạn đã được xác nhận và đang chờ xử lý`;
        break;
      case "processing":
        title = "Đơn hàng đang xử lý";
        message = `Đơn hàng #${order.order_number} của bạn đang được chuẩn bị`;
        break;
      case "shipped":
        title = "Đơn hàng đang giao";
        message = `Đơn hàng #${order.order_number} của bạn đang được giao${
          order.tracking_number ? `. Mã vận đơn: ${order.tracking_number}` : ""
        }`;
        break;
      case "delivered":
        title = "Đơn hàng đã giao thành công";
        message = `Đơn hàng #${order.order_number} của bạn đã được giao thành công. Cảm ơn bạn đã mua sắm!`;
        break;
      case "cancelled":
        title = "Đơn hàng đã hủy";
        message = `Đơn hàng #${order.order_number} của bạn đã bị hủy${
          order.cancel_reason ? ` với lý do: ${order.cancel_reason}` : ""
        }`;
        break;
      default:
        title = "Cập nhật đơn hàng";
        message = `Đơn hàng #${order.order_number} của bạn đã được cập nhật từ ${previousStatus} sang ${order.status}`;
    }

    const notification = await createNotification({
      recipient_id: order.user_id._id,
      type: "order_status",
      title: title,
      message: message,
      reference_id: order._id,
      reference_model: "Order",
    });

    const io = getIO();
    io.to(`user:${order.user_id._id}`).emit("order_status_update", {
      order_id: order._id,
      order_number: order.order_number,
      previous_status: previousStatus,
      new_status: order.status,
      updated_at: new Date(),
      tracking_number: order.tracking_number || null,
      carrier: order.carrier || null,
    });

    return notification;
  } catch (error) {
    console.error("Error sending order status notification:", error);
    throw error;
  }
};

export {
  createNotification,
  notifyBranchManagers,
  notifyNewOrder,
  notifyDineInItemsAdded,
  notifyNewRating,
  notifyNewProduct,
  notifyNewComment,
  notifyOrderStatusUpdate,
  notifyCancelRequest,
  notifyOrderCancelled,
  notifyOrderCancelledManagers,
  notifyOrderAutoConfirmed,
};
