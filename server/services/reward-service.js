import Order from "../models/order-model.js";
import User from "../models/user-model.js";

export const calculateRewardCoins = (totalAmount = 0) =>
  Math.max(Math.floor((Number(totalAmount) || 0) / 100), 0);

const getId = (value) => value?._id || value || null;

export const awardOrderRewardCoins = async (orderOrId) => {
  const order =
    typeof orderOrId === "object"
      ? orderOrId
      : await Order.findById(orderOrId);

  if (!order || order.reward_coin_awarded_at) {
    return { awarded: false, coins: 0, reason: "already_awarded_or_missing" };
  }

  if (order.payment_status !== "paid") {
    return { awarded: false, coins: 0, reason: "payment_not_paid" };
  }

  const isDineInOrder =
    order.order_type === "dine_in" ||
    order.order_channel === "dine-in" ||
    order.order_channel === "dine_in" ||
    Boolean(order.table_id);

  if (isDineInOrder) {
    return { awarded: false, coins: 0, reason: "dine_in_reward_disabled" };
  }

  const coins = calculateRewardCoins(order.total_amount);
  if (coins <= 0) {
    return { awarded: false, coins: 0, reason: "no_reward" };
  }

  const userId = getId(order.user_id);
  if (!userId) {
    return { awarded: false, coins, reason: "reward_target_not_found" };
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { $inc: { coin: coins } },
    { new: true }
  ).select("_id coin");

  if (!user) {
    return { awarded: false, coins, reason: "user_not_found" };
  }

  order.reward_coin_earned = coins;
  order.reward_coin_awarded_at = new Date();
  order.reward_coin_user_id = user._id;
  await order.save();

  return { awarded: true, coins, userId: user._id, userCoin: user.coin || 0 };
};
