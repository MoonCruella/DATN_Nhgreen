import Order from "../models/order-model.js";
import * as notificationService from "./notification-service.js";
import { getIO } from "../config/socket.js";

// Map để lưu các timeout đã schedule
const scheduledTimeouts = new Map();

/**
 * Schedule auto-complete cho đơn hàng sau khi delivered 30 phút
 * @param {string} orderId - ID của đơn hàng
 * @param {number} delayMinutes - Thời gian delay (phút), mặc định 30 phút
 */
export const scheduleAutoComplete = (orderId, delayMinutes = 30) => {
  try {
    // Hủy schedule cũ nếu có
    if (scheduledTimeouts.has(orderId)) {
      clearTimeout(scheduledTimeouts.get(orderId));
      console.log(
        `⏰ Cancelled previous auto-complete schedule for order: ${orderId}`
      );
    }

    const delayMs = delayMinutes * 60 * 1000; // Convert phút sang milliseconds

    console.log(
      `⏰ Scheduling auto-complete for order ${orderId} in ${delayMinutes} minutes`
    );

    const timeoutId = setTimeout(async () => {
      try {
        await autoCompleteOrder(orderId);
        scheduledTimeouts.delete(orderId);
      } catch (error) {
        console.error(`❌ Auto-complete failed for order ${orderId}:`, error);
        scheduledTimeouts.delete(orderId);
      }
    }, delayMs);

    scheduledTimeouts.set(orderId, timeoutId);

    // Lưu thông tin vào database
    Order.findByIdAndUpdate(
      orderId,
      {
        auto_complete_scheduled_at: new Date(Date.now() + delayMs),
      },
      { new: true }
    ).catch((err) => {
      console.error("Failed to update auto_complete_scheduled_at:", err);
    });
  } catch (error) {
    console.error("Error scheduling auto-complete:", error);
  }
};

/**
 * Hủy auto-complete đã schedule (khi user tự xác nhận)
 * @param {string} orderId - ID của đơn hàng
 */
export const cancelAutoComplete = (orderId) => {
  if (scheduledTimeouts.has(orderId)) {
    clearTimeout(scheduledTimeouts.get(orderId));
    scheduledTimeouts.delete(orderId);
    console.log(`✅ Cancelled auto-complete for order: ${orderId}`);

    // Xóa thông tin scheduled trong database
    Order.findByIdAndUpdate(
      orderId,
      {
        $unset: { auto_complete_scheduled_at: "" },
      },
      { new: true }
    ).catch((err) => {
      console.error("Failed to clear auto_complete_scheduled_at:", err);
    });
  }
};

/**
 * Tự động hoàn thành đơn hàng
 * @param {string} orderId - ID của đơn hàng
 */
const autoCompleteOrder = async (orderId) => {
  try {
    console.log(`🔄 Auto-completing order: ${orderId}`);

    const order = await Order.findById(orderId);

    if (!order) {
      console.error(`❌ Order not found: ${orderId}`);
      return;
    }

    // Chỉ auto-complete nếu vẫn ở trạng thái delivered
    if (order.status !== "delivered") {
      console.log(
        `⚠️ Order ${orderId} status is ${order.status}, skipping auto-complete`
      );
      return;
    }

    // Cập nhật trạng thái
    order.status = "completed";
    order.completed_at = new Date();
    order.auto_completed = true;
    order.customer_confirmed = false;

    // Cập nhật payment_status thành paid nếu chưa paid
    if (order.payment_status !== "paid") {
      order.payment_status = "paid";
      order.payment_date = new Date();
    }

    // Thêm vào history
    order.history = order.history || [];
    order.history.push({
      status: "completed",
      date: new Date(),
      note: "Tự động hoàn thành sau 30 phút giao hàng",
    });

    await order.save();

    console.log(`✅ Auto-completed order: ${orderId}`);

    // Gửi socket notification đến branch
    try {
      const io = getIO();
      io.to(`branch:${order.branch_id}`).emit("order_auto_completed", {
        order_id: order._id,
        order_number: order.order_number,
        branch_id: order.branch_id,
        status: "completed",
      });
    } catch (socketError) {
      console.error("Socket notification error:", socketError);
    }

    // Gửi notification (optional)
    try {
      await notificationService.notifyOrderStatusUpdate(order, "delivered");
    } catch (notifyError) {
      console.error("Notification error:", notifyError);
    }
  } catch (error) {
    console.error(`❌ Error auto-completing order ${orderId}:`, error);
    throw error;
  }
};

/**
 * Khôi phục các schedule từ database khi server restart
 */
export const restoreScheduledAutoCompletes = async () => {
  try {
    console.log("🔄 Restoring scheduled auto-completes...");

    const now = new Date();

    // Tìm các order delivered có schedule auto-complete trong tương lai
    const pendingOrders = await Order.find({
      status: "delivered",
      auto_complete_scheduled_at: { $exists: true, $gt: now },
    });

    console.log(
      `📋 Found ${pendingOrders.length} pending auto-complete schedules`
    );

    for (const order of pendingOrders) {
      const scheduledTime = new Date(order.auto_complete_scheduled_at);
      const remainingMs = scheduledTime.getTime() - now.getTime();

      if (remainingMs > 0) {
        const remainingMinutes = Math.ceil(remainingMs / 60000);
        scheduleAutoComplete(order._id.toString(), remainingMinutes / 60);
      } else {
        // Nếu đã quá thời gian, auto-complete ngay
        await autoCompleteOrder(order._id.toString());
      }
    }

    console.log("✅ Restored scheduled auto-completes");
  } catch (error) {
    console.error("❌ Error restoring scheduled auto-completes:", error);
  }
};

export default {
  scheduleAutoComplete,
  cancelAutoComplete,
  restoreScheduledAutoCompletes,
};
