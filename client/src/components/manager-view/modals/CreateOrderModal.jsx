import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronRight,
  Minus,
  Search,
  ShoppingCart,
  Store,
  X,
} from "lucide-react";
import { toast } from "sonner";
import branchApi from "@/api/branchApi";
import momoApi from "@/api/momoApi";
import orderApi from "@/api/orderApi";
import vnpayApi from "@/api/vnpayApi";
import zalopayApi from "@/api/zalopayApi";
import { Button } from "@/components/ui/button";
import { assets } from "@/assets/assets";
import OrderDetailModal from "./OrderDetailModal";

const formatCurrency = (value = 0) =>
  new Intl.NumberFormat("vi-VN").format(value || 0);

const getDishImage = (dish) =>
  dish?.imageUrls?.[dish.defaultImageIndex || 0] ||
  dish?.imageUrls?.[0] ||
  assets.add_icon;

const getDishPrice = (dish) => dish?.sale_price || dish?.price || 0;

const showRewardToast = (reward) => {
  if (!reward) return;
  if (reward.awarded && reward.coins > 0) {
    toast.success(`Đã cộng ${reward.coins.toLocaleString("vi-VN")} xu cho khách hàng`);
    return;
  }
  if (
    ["customer_not_found", "reward_target_not_found", "user_not_found"].includes(
      reward.reason,
    )
  ) {
    toast.info("Không tìm thấy khách hàng để cộng xu");
  }
};

const CreateOrderModal = ({
  table,
  branchId,
  accessToken,
  onClose,
  onOrderCreated,
  initialOrder,
  open,
}) => {
  const navigate = useNavigate();
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [quantities, setQuantities] = useState({});
  const [initialQuantities, setInitialQuantities] = useState({});
  const [showOrderDetail, setShowOrderDetail] = useState(false);
  const [orderStatus, setOrderStatus] = useState("selecting");
  const [createdOrder, setCreatedOrder] = useState(null);
  const [momoPaymentUrl, setMomoPaymentUrl] = useState("");
  const [momoQrUrl, setMomoQrUrl] = useState("");
  const [momoQrCreatedAt, setMomoQrCreatedAt] = useState(null);
  const [momoLoading, setMomoLoading] = useState(false);
  const [momoError, setMomoError] = useState("");
  const [zalopayPaymentUrl, setZalopayPaymentUrl] = useState("");
  const [zalopayQrUrl, setZalopayQrUrl] = useState("");
  const [zalopayAppTransId, setZalopayAppTransId] = useState("");
  const [zalopayQrCreatedAt, setZalopayQrCreatedAt] = useState(null);
  const [zalopayLoading, setZalopayLoading] = useState(false);
  const [zalopayError, setZalopayError] = useState("");
  const [vnpayPaymentUrl, setVnpayPaymentUrl] = useState("");
  const [vnpayLoading, setVnpayLoading] = useState(false);
  const [vnpayError, setVnpayError] = useState("");

  const navigateToBill = useCallback(
    (order) => {
      const billOrderId = order?._id || createdOrder?._id;
      if (!billOrderId) return;

      setShowOrderDetail(false);
      onClose?.();
      navigate(`/manager/tables/bill/${billOrderId}`);
    },
    [createdOrder?._id, navigate, onClose],
  );

  useEffect(() => {
    if (!table || !branchId) return;

    const fetchDishes = async () => {
      try {
        setLoading(true);
        const response = await branchApi.getBranchDishes(branchId, {
          limit: 100,
          isAvailable: true,
        });
        setDishes(response?.data?.dishes || []);
      } catch (error) {
        toast.error(
          error?.response?.data?.message || "Không thể tải danh sách sản phẩm",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDishes();
    setSearchTerm("");
    setShowOrderDetail(false);
    setMomoPaymentUrl("");
    setMomoQrUrl("");
    setMomoQrCreatedAt(null);
    setMomoLoading(false);
    setMomoError("");
    setZalopayPaymentUrl("");
    setZalopayQrUrl("");
    setZalopayAppTransId("");
    setZalopayQrCreatedAt(null);
    setZalopayLoading(false);
    setZalopayError("");
    setVnpayPaymentUrl("");
    setVnpayLoading(false);
    setVnpayError("");

    // Nếu có initialOrder, điền thông tin vào form
    if (initialOrder) {
      const initialQtys = {};
      initialOrder.items?.forEach((item) => {
        // Xử lý cả trường hợp dish_id là string hoặc object
        const dishId =
          typeof item.dish_id === "object" ? item.dish_id?._id : item.dish_id;
        if (dishId) {
          initialQtys[dishId] = item.quantity;
        }
      });
      setInitialQuantities(initialQtys);
      setQuantities(initialQtys);
      setCreatedOrder(initialOrder);

      // Set status dựa vào trạng thái order
      if (
        initialOrder.status === "completed" ||
        initialOrder.payment_status === "paid"
      ) {
        setOrderStatus("completed");
      } else {
        setOrderStatus("processing");
      }
    } else {
      setInitialQuantities({});
      setQuantities({});
      setCreatedOrder(null);
      setOrderStatus("selecting");
    }
  }, [table, branchId, initialOrder]);

  useEffect(() => {
    if (
      (!momoPaymentUrl &&
        !momoQrUrl &&
        !zalopayQrUrl &&
        !zalopayAppTransId &&
        !vnpayPaymentUrl) ||
      !createdOrder?._id ||
      orderStatus === "completed"
    ) {
      return undefined;
    }

    const timer = setInterval(async () => {
      try {
        if (zalopayAppTransId) {
          await zalopayApi.queryStatus(accessToken, zalopayAppTransId);
        }

        const response = await orderApi.getOrderById(
          accessToken,
          createdOrder._id,
        );
        const latestOrder = response?.data?.order;

        if (
          latestOrder?.payment_status === "paid" ||
          latestOrder?.status === "completed"
        ) {
          setCreatedOrder(latestOrder);
          setOrderStatus("completed");
          setMomoPaymentUrl("");
          setMomoQrUrl("");
          setMomoQrCreatedAt(null);
          setZalopayPaymentUrl("");
          setZalopayQrUrl("");
          setZalopayAppTransId("");
          setZalopayQrCreatedAt(null);
          setVnpayPaymentUrl("");
          toast.success("Thanh toán thành công");
          showRewardToast(
            latestOrder?.reward ||
              (latestOrder?.reward_coin_awarded_at
                ? {
                    awarded: true,
                    coins: latestOrder.reward_coin_earned || 0,
                  }
                : null),
          );
          onOrderCreated?.(latestOrder);
          navigateToBill(latestOrder);
        }
      } catch (error) {
        console.error("Poll QR dine-in order error:", error);
      }
    }, 3000);

    return () => clearInterval(timer);
  }, [
    accessToken,
    createdOrder?._id,
    momoPaymentUrl,
    momoQrUrl,
    navigateToBill,
    onOrderCreated,
    orderStatus,
    vnpayPaymentUrl,
    zalopayAppTransId,
    zalopayQrUrl,
  ]);

  const filteredDishes = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return dishes;

    return dishes.filter((dish) => dish.name?.toLowerCase().includes(keyword));
  }, [dishes, searchTerm]);

  const selectedItems = useMemo(
    () =>
      dishes
        .filter((dish) => (quantities[dish._id] || 0) > 0)
        .map((dish) => ({
          ...dish,
          quantity: quantities[dish._id],
        })),
    [dishes, quantities],
  );

  const totalQuantity = selectedItems.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
  const totalAmount = selectedItems.reduce(
    (sum, item) => sum + getDishPrice(item) * item.quantity,
    0,
  );
  const confirmedItems = useMemo(() => {
    if (!createdOrder?.items?.length) return [];

    return createdOrder.items.map((item) => ({
      ...item,
      _id: item._id || item.dish_id,
      name: item.dish_name || item.name,
      quantity: item.quantity || 0,
    }));
  }, [createdOrder?.items]);
  const confirmedTotalQuantity = confirmedItems.reduce(
    (sum, item) => sum + (item.quantity || 0),
    0,
  );
  const confirmedTotalAmount =
    createdOrder?.total_amount ||
    confirmedItems.reduce(
      (sum, item) => sum + getDishPrice(item) * (item.quantity || 0),
      0,
    );
  const hasUnconfirmedChanges =
    orderStatus === "processing" &&
    selectedItems.some(
      (item) => (item.quantity || 0) > (initialQuantities[item._id] || 0),
    );
  const payableItems =
    orderStatus === "processing" && confirmedItems.length > 0
      ? confirmedItems
      : selectedItems;
  const payableTotalQuantity =
    orderStatus === "processing" && confirmedItems.length > 0
      ? confirmedTotalQuantity
      : totalQuantity;
  const payableTotalAmount =
    orderStatus === "processing" && confirmedItems.length > 0
      ? confirmedTotalAmount
      : totalAmount;

  const handleRequestMomoPayment = useCallback(async (force = false) => {
    if (!createdOrder?._id || (!force && momoQrUrl) || momoLoading) return;

    try {
      setMomoLoading(true);
      setMomoError("");
      if (force) {
        setMomoPaymentUrl("");
        setMomoQrUrl("");
        setMomoQrCreatedAt(null);
      }
      const result = await momoApi.createPayment(
        accessToken,
        createdOrder._id,
        payableTotalAmount,
        `Thanh toan hoa don ${createdOrder.order_number || createdOrder._id}`,
      );

      if (!result.success) {
        throw new Error(result.message || "Không thể tạo QR MoMo");
      }

      const data = result.data || {};
      const isImageUrl = (value = "") =>
        value.startsWith("data:image/") || /^https?:\/\//i.test(value);
      const qrUrl =
        data.qrDataUrl || (isImageUrl(data.qrCodeUrl || "") ? data.qrCodeUrl : "");
      const paymentUrl = data.deeplink || data.payUrl || data.paymentUrl || "";

      if (!qrUrl) {
        throw new Error(
          "MoMo không trả về dữ liệu QR thanh toán. Kiểm tra requestType=captureWallet và tài khoản UAT.",
        );
      }

      setMomoQrUrl(qrUrl || data.qrDataUrl || "");
      setMomoPaymentUrl(paymentUrl);
      setMomoQrCreatedAt(Date.now());
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Không thể tạo QR MoMo";
      setMomoError(message);
      toast.error(message);
    } finally {
      setMomoLoading(false);
    }
  }, [
    accessToken,
    createdOrder?._id,
    createdOrder?.order_number,
    momoLoading,
    momoQrUrl,
    payableTotalAmount,
  ]);

  const handleRequestZalopayPayment = useCallback(async (force = false) => {
    if (!createdOrder?._id || (!force && zalopayQrUrl) || zalopayLoading) return;

    try {
      setZalopayLoading(true);
      setZalopayError("");
      setZalopayPaymentUrl("");
      setZalopayQrUrl("");
      setZalopayAppTransId("");
      setZalopayQrCreatedAt(null);
      const result = await zalopayApi.createPayment(
        accessToken,
        createdOrder._id,
        payableTotalAmount,
        `Thanh toan hoa don ${createdOrder.order_number || createdOrder._id}`,
      );

      if (!result.success) {
        throw new Error(result.message || "Khong the tao QR ZaloPay");
      }

      const data = result.data || {};
      const qrUrl = data.qrDataUrl || "";

      if (!qrUrl) {
        throw new Error(
          "ZaloPay khong tra ve QR thanh toan. Kiem tra sandbox va cau hinh callback.",
        );
      }

      setZalopayQrUrl(qrUrl);
      setZalopayPaymentUrl(data.orderUrl || data.paymentUrl || "");
      setZalopayAppTransId(data.appTransId || "");
      setZalopayQrCreatedAt(Date.now());
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Khong the tao QR ZaloPay";
      setZalopayError(message);
      toast.error(message);
    } finally {
      setZalopayLoading(false);
    }
  }, [
    accessToken,
    createdOrder?._id,
    createdOrder?.order_number,
    payableTotalAmount,
    zalopayLoading,
    zalopayQrUrl,
  ]);

  const handleRequestVnpayPayment = useCallback(async (force = false) => {
    if (!createdOrder?._id || (!force && vnpayPaymentUrl) || vnpayLoading) return;

    try {
      setVnpayLoading(true);
      setVnpayError("");
      if (force) {
        setVnpayPaymentUrl("");
      }

      const result = await vnpayApi.createPayment(
        accessToken,
        createdOrder._id,
        payableTotalAmount,
      );

      if (!result.success || !result.url) {
        throw new Error(result.message || "Không thể tạo link VNPay");
      }

      setVnpayPaymentUrl(result.url);
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Không thể tạo link VNPay";
      setVnpayError(message);
      toast.error(message);
    } finally {
      setVnpayLoading(false);
    }
  }, [
    accessToken,
    createdOrder?._id,
    payableTotalAmount,
    vnpayLoading,
    vnpayPaymentUrl,
  ]);

  if (!table || open === false) return null;

  const updateQuantity = (dishId, delta) => {
    // Khi completed, không cho phép thay đổi
    if (orderStatus === "completed") return;

    setQuantities((current) => {
      const currentQuantity = current[dishId] || 0;
      let nextQuantity = currentQuantity + delta;

      // Khi đang xử lý (processing), không cho phép giảm những món đã có trong initialQuantities
      if (orderStatus === "processing") {
        const initialQty = initialQuantities[dishId] || 0;

        // Nếu delta âm (giảm), kiểm tra xem có phải đang giảm những món từ initialOrder không
        if (delta < 0) {
          // Không cho phép giảm dưới số lượng ban đầu
          nextQuantity = Math.max(nextQuantity, initialQty);

          // Nếu không thay đổi gì, trả về current quantities
          if (nextQuantity === currentQuantity) return current;
        }
      } else if (orderStatus === "selecting") {
        // Khi selecting, cho phép giảm xuống 0
        nextQuantity = Math.max(nextQuantity, 0);
      }

      return {
        ...current,
        [dishId]: nextQuantity,
      };
    });
  };

  const validateSelectedItems = () => {
    if (totalQuantity === 0) {
      toast.error("Vui lòng chọn ít nhất một sản phẩm");
      return false;
    }

    return true;
  };

  const handleConfirmOrder = async (selectedCustomer = null) => {
    if (!validateSelectedItems() || submitting) return;

    // Nếu đã có order, chuyển sang xác nhận (move to processing status)
    if (createdOrder) {
      try {
        setSubmitting(true);
        const response = await orderApi.updateDineInOrderItems(
          accessToken,
          createdOrder._id,
          selectedItems.map((item) => ({
            dish_id: item._id,
            quantity: item.quantity,
            variant: item.variant || {},
          })),
        );
        const updatedOrder = response?.data?.order || createdOrder;
        const nextInitialQuantities = {};
        updatedOrder.items?.forEach((item) => {
          const dishId =
            typeof item.dish_id === "object" ? item.dish_id?._id : item.dish_id;
          if (dishId) nextInitialQuantities[dishId] = item.quantity;
        });
        setCreatedOrder(updatedOrder);
        setInitialQuantities(nextInitialQuantities);
        setQuantities(nextInitialQuantities);
        setOrderStatus("processing");
        setMomoPaymentUrl("");
        setMomoQrUrl("");
        setMomoQrCreatedAt(null);
        setZalopayPaymentUrl("");
        setZalopayQrUrl("");
        setZalopayAppTransId("");
        setZalopayQrCreatedAt(null);
        setVnpayPaymentUrl("");
        toast.success("Đã xác nhận thêm món");
        onOrderCreated?.(updatedOrder);
      } catch (error) {
        toast.error(
          error?.response?.data?.message ||
            error?.message ||
            "Không thể xác nhận thêm món",
        );
      } finally {
        setSubmitting(false);
      }
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        branch_id: branchId,
        table_id: table._id,
        order_type: "dine_in",
        order_channel: "dine_in",
        payment_method: "cod",
        shipping_fee: 0,
        customer_id: selectedCustomer?._id || undefined,
        items: selectedItems.map((item) => ({
          dish_id: item._id,
          quantity: item.quantity,
          variant: item.variant || {},
        })),
      };

      const response = await orderApi.createOrder(accessToken, payload);
      const order = response?.data?.order;
      const nextInitialQuantities = {};
      order?.items?.forEach((item) => {
        const dishId =
          typeof item.dish_id === "object" ? item.dish_id?._id : item.dish_id;
        if (dishId) nextInitialQuantities[dishId] = item.quantity;
      });
      setCreatedOrder(order || null);
      setInitialQuantities(nextInitialQuantities);
      setQuantities(nextInitialQuantities);
      setOrderStatus("processing");
      toast.success("Đơn hàng đã được xác nhận và đang xử lý");
      onOrderCreated?.(order);
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Không thể xác nhận đơn hàng",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayment = async (paymentMethod = "cod") => {
    if (payableTotalQuantity === 0 || submitting) {
      toast.error("Chưa có món đã xác nhận để thanh toán");
      return;
    }

    if (!createdOrder?._id) {
      toast.error("Vui lòng xác nhận đơn hàng trước khi thanh toán");
      return;
    }

    if (paymentMethod === "momo") {
      toast.info("Vui lòng quét QR MoMo để thanh toán");
      return;
    }

    if (paymentMethod === "zalopay") {
      toast.info("Vui lòng quét QR ZaloPay để thanh toán");
      return;
    }

    if (paymentMethod === "vnpay") {
      toast.info("Vui lòng thanh toán bằng link VNPay");
      return;
    }

    try {
      setSubmitting(true);
      const response = await orderApi.completeDineInOrder(
        accessToken,
        createdOrder._id,
        paymentMethod,
      );
      const completedOrder = response?.data?.order || createdOrder;
      const reward = response?.data?.reward;
      setCreatedOrder(completedOrder);
      setOrderStatus("completed");
      toast.success("Đơn hàng đã hoàn thành");
      showRewardToast(reward);
      onOrderCreated?.(completedOrder);
      navigateToBill(completedOrder);
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Không thể thanh toán đơn hàng",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateOrderCustomer = async (selectedCustomer) => {
    if (!selectedCustomer?._id || !createdOrder?._id) return;

    const response = await orderApi.updateDineInOrderCustomer(
      accessToken,
      createdOrder._id,
      selectedCustomer._id,
    );
    const updatedOrder = response?.data?.order;
    if (updatedOrder) {
      setCreatedOrder(updatedOrder);
      onOrderCreated?.(updatedOrder);
    }
  };

  const primaryActionLabel =
    orderStatus === "selecting"
      ? "Xác nhận đơn hàng"
      : orderStatus === "processing"
        ? "Thanh toán"
        : "Hoàn thành";
  const secondaryActionLabel =
    orderStatus === "processing" && hasUnconfirmedChanges ? "Xác nhận" : "";

  const handlePrimaryAction = () => {
    if (orderStatus === "selecting") {
      handleConfirmOrder();
      return;
    }

    if (orderStatus === "processing") {
      if (!validateSelectedItems()) return;
      setShowOrderDetail(true);
      return;
    }

    setShowOrderDetail(false);
  };

  const handleOrderDetailPrimaryAction = (paymentMethod, selectedCustomer) => {
    if (orderStatus === "selecting") {
      handleConfirmOrder(selectedCustomer);
      return;
    }

    if (orderStatus === "processing") {
      handlePayment(paymentMethod);
      return;
    }

    setShowOrderDetail(false);
  };

  const handleOrderDetailSecondaryAction = (selectedCustomer) => {
    handleConfirmOrder(selectedCustomer);
  };

  return (
    <div className="fixed bottom-0 right-0 left-[280px] top-[65px] z-50 bg-[#f7f7f8]">
      <div className="flex h-full flex-col">
        <header className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3 text-lg font-bold lg:text-xl">
            <div className="flex items-center gap-2 text-gray-900">
              <Store className="h-6 w-6" strokeWidth={1.7} />
              Quản lý bán hàng
            </div>
            <ChevronRight className="h-6 w-6 text-gray-500" />
            <div className="text-[#34ad54]">Danh sách sản phẩm</div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-slate-900 hover:bg-gray-200"
            title="Đóng"
          >
            <X className="h-6 w-6" />
          </button>
        </header>

        <div className="flex items-center gap-4 px-6 pb-5">
          <div className="flex h-14 min-w-32 items-center justify-center rounded-xl border border-[#34ad54] bg-white px-5 text-lg font-bold text-gray-800">
            {table.name || "Bàn"}
          </div>

          <div className="relative flex-1">
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="h-14 w-full rounded-xl bg-white px-5 pr-12 text-base font-medium text-gray-800 shadow-md outline-none placeholder:text-slate-300 focus:ring-2 focus:ring-[#34ad54]/30"
              placeholder="Tìm kiếm (nhập tên món)"
            />
            <Search className="absolute right-4 top-1/2 h-6 w-6 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        <main className="flex-1 overflow-y-auto px-6 pb-28">
          {loading ? (
            <div className="grid grid-cols-1 justify-items-center gap-y-8 gap-x-12 xl:grid-cols-2 2xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-44 w-full max-w-[420px] animate-pulse rounded-xl bg-white shadow-md"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 justify-items-center gap-y-8 gap-x-12 xl:grid-cols-2 2xl:grid-cols-3">
              {filteredDishes.map((dish) => {
                const quantity = quantities[dish._id] || 0;

                return (
                  <article
                    key={dish._id}
                    className="grid min-h-40 w-full max-w-[420px] grid-cols-[112px_1fr] gap-4 rounded-xl bg-white p-4 shadow-md"
                  >
                    <img
                      src={getDishImage(dish)}
                      alt={dish.name}
                      className="h-28 w-28 rounded-lg bg-green-50 object-cover"
                    />

                    <div className="flex min-w-0 flex-col">
                      <h3 className="line-clamp-2 text-lg font-bold text-gray-900">
                        {dish.name}
                      </h3>
                      <div className="mt-1 text-lg font-bold text-[#34ad54]">
                        {formatCurrency(getDishPrice(dish))} VND
                      </div>

                      <div className="mt-auto flex items-center gap-4">
                        <button
                          type="button"
                          onClick={() => updateQuantity(dish._id, -1)}
                          className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900 text-white disabled:opacity-40"
                          disabled={
                            quantity === 0 ||
                            orderStatus === "completed" ||
                            (orderStatus === "processing" &&
                              quantity <= (initialQuantities[dish._id] || 0))
                          }
                          title="Giảm số lượng"
                        >
                          <Minus className="h-5 w-5" />
                        </button>
                        <span className="min-w-7 text-center text-xl font-bold text-gray-800">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(dish._id, 1)}
                          className="flex h-9 w-9 items-center justify-center rounded-full bg-[#34ad54] text-white disabled:opacity-40"
                          disabled={orderStatus === "completed"}
                          title="Tăng số lượng"
                        >
                          <span className="text-2xl font-medium leading-none">
                            +
                          </span>
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </main>

        <footer className="absolute bottom-0 left-0 right-0 bg-[#f7f7f8] px-6 py-4">
          <div className="flex items-center justify-between gap-4 rounded-xl bg-white px-5 py-4 shadow-md">
            <button
              type="button"
              onClick={() => setShowOrderDetail(true)}
              className="flex min-w-0 items-center gap-4 rounded-lg text-left transition hover:bg-gray-50"
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-[#34ad54] text-white">
                <ShoppingCart className="h-7 w-7" />
              </div>
              <div className="min-w-0">
                <div className="text-lg font-bold text-gray-900">
                  Chi tiết đơn hàng
                </div>
                <div className="truncate text-xl font-bold text-gray-900">
                  Bạn đã thêm {totalQuantity} phần
                </div>
              </div>
            </button>

            <div className="flex shrink-0 items-center gap-3">
              {secondaryActionLabel && (
                <Button
                  type="button"
                  onClick={() => handleConfirmOrder()}
                  disabled={submitting}
                  className="h-14 min-w-40 rounded-lg bg-sky-600 text-lg font-bold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-200"
                >
                  {submitting ? "Đang xác nhận..." : secondaryActionLabel}
                </Button>
              )}
              <Button
                type="button"
                onClick={handlePrimaryAction}
                disabled={
                  (orderStatus === "selecting" ? totalQuantity : payableTotalQuantity) ===
                    0 || submitting
                }
                className="h-14 min-w-56 rounded-lg bg-[#34ad54] text-lg font-bold text-white hover:bg-[#2f9b45] disabled:cursor-not-allowed disabled:bg-[#bbf7d0] disabled:hover:bg-[#bbf7d0]"
              >
                {submitting ? "Đang xác nhận..." : primaryActionLabel}
              </Button>
            </div>
          </div>
        </footer>
      </div>

      <OrderDetailModal
        open={showOrderDetail}
        table={table}
        items={selectedItems}
        paymentItems={payableItems}
        order={createdOrder}
        totalQuantity={totalQuantity}
        totalAmount={totalAmount}
        paymentTotalQuantity={payableTotalQuantity}
        paymentTotalAmount={payableTotalAmount}
        primaryActionLabel={
          submitting ? "Đang xác nhận..." : primaryActionLabel
        }
        secondaryActionLabel={
          submitting ? "Đang xác nhận..." : secondaryActionLabel
        }
        onClose={() => setShowOrderDetail(false)}
        onAddMore={() => setShowOrderDetail(false)}
        onPrimaryAction={handleOrderDetailPrimaryAction}
        onSecondaryAction={handleOrderDetailSecondaryAction}
        onCustomerSelected={handleUpdateOrderCustomer}
        momoPaymentUrl={momoPaymentUrl}
        momoQrUrl={momoQrUrl}
        momoQrCreatedAt={momoQrCreatedAt}
        momoLoading={momoLoading}
        momoError={momoError}
        onRequestMomoPayment={handleRequestMomoPayment}
        zalopayPaymentUrl={zalopayPaymentUrl}
        zalopayQrUrl={zalopayQrUrl}
        zalopayQrCreatedAt={zalopayQrCreatedAt}
        zalopayLoading={zalopayLoading}
        zalopayError={zalopayError}
        onRequestZalopayPayment={handleRequestZalopayPayment}
        vnpayPaymentUrl={vnpayPaymentUrl}
        vnpayLoading={vnpayLoading}
        vnpayError={vnpayError}
        onRequestVnpayPayment={handleRequestVnpayPayment}
      />

    </div>
  );
};

export default CreateOrderModal;


