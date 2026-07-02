import { useEffect, useMemo, useState } from "react";
import {
  Banknote,
  ChevronLeft,
  Copy,
  CreditCard,
  Edit3,
  Info,
  Menu,
  Minus,
  QrCode,
  RefreshCw,
  Search,
  ShoppingBag,
  Star,
  Smartphone,
  UserCircle,
  X,
} from "lucide-react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { assets } from "@/assets/assets";
import branchApi from "@/api/branchApi";
import dineInApi from "@/api/dineInApi";
import { Button } from "@/components/ui/button";

const formatCurrency = (value = 0) =>
  new Intl.NumberFormat("vi-VN").format(value || 0);

const getDishImage = (dish) =>
  dish?.imageUrls?.[dish.defaultImageIndex || 0] ||
  dish?.imageUrls?.[0] ||
  assets.add_icon;

const getDishPrice = (dish) => dish?.sale_price || dish?.price || 0;

const formatNutrition = (value = 0, suffix = "g") => {
  const number = Number(value) || 0;
  const formatted =
    suffix === "kcal" ? Math.round(number) : Math.round(number * 10) / 10;
  return `${formatted}${suffix === "kcal" ? " kcal" : suffix}`;
};

const getDishNutrition = (dish) => ({
  calories: dish?.totalEnergyKcal || 0,
  protein: dish?.totalProtein || 0,
  carbs: dish?.totalCarbs || 0,
  fat: dish?.totalFat || 0,
});

const getStoredSessionKey = (qrToken) => `nhgreen_dine_in_session_${qrToken}`;

const QR_TTL_MS = 15 * 60 * 1000;

const PAYMENT_METHODS = [
  { value: "cod", label: "Tiền mặt", icon: Banknote },
  { value: "momo", label: "MoMo", icon: QrCode },
  { value: "zalopay", label: "ZaloPay", icon: Smartphone },
  { value: "vnpay", label: "VNPay", icon: CreditCard },
];

const formatCountdown = (milliseconds = 0) => {
  const totalSeconds = Math.max(Math.ceil(milliseconds / 1000), 0);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
};

const getPaymentTabClass = (method, active) => {
  if (!active) {
    if (method === "momo") return "border-[#a50064]/20 text-[#a50064]";
    if (method === "zalopay") return "border-[#0068ff]/20 text-[#0068ff]";
    if (method === "vnpay") return "border-[#25358f]/20 text-[#25358f]";
    return "border-emerald-200 text-emerald-600";
  }

  if (method === "momo") return "border-[#a50064] bg-[#fff5fb] text-[#a50064]";
  if (method === "zalopay")
    return "border-[#0068ff] bg-[#f3f8ff] text-[#0068ff]";
  if (method === "vnpay") return "border-[#25358f] bg-blue-50 text-[#25358f]";
  return "border-emerald-600 bg-emerald-50 text-emerald-600";
};

const DineInMenu = () => {
  const { qrToken } = useParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [table, setTable] = useState(null);
  const [branch, setBranch] = useState(null);
  const [session, setSession] = useState(null);
  const [dishes, setDishes] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [showCart, setShowCart] = useState(false);
  const [showOrderDetail, setShowOrderDetail] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [showPaymentSuccessPopup, setShowPaymentSuccessPopup] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const [completedOrderId, setCompletedOrderId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [paymentLoading, setPaymentLoading] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [paymentData, setPaymentData] = useState({});
  const [selectedNutritionDish, setSelectedNutritionDish] = useState(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!qrToken) return;

    const initDineInMenu = async () => {
      try {
        setLoading(true);
        const scanResponse = await dineInApi.scanQr(qrToken);
        const scannedTable = scanResponse?.data?.table;
        const scannedBranch = scanResponse?.data?.branch;
        let activeSession = null;
        const storedToken = localStorage.getItem(getStoredSessionKey(qrToken));

        if (storedToken) {
          try {
            const sessionResponse = await dineInApi.getSession(storedToken);
            activeSession = sessionResponse?.data?.session;
          } catch {
            localStorage.removeItem(getStoredSessionKey(qrToken));
          }
        }

        if (!activeSession) {
          const sessionResponse = await dineInApi.createSession(qrToken);
          activeSession = sessionResponse?.data?.session;
          if (activeSession?.session_token) {
            localStorage.setItem(
              getStoredSessionKey(qrToken),
              activeSession.session_token,
            );
          }
        }

        let activeOrder = null;
        if (activeSession?.session_token) {
          try {
            const activeOrderResponse = await dineInApi.getActiveOrder(
              activeSession.session_token,
            );
            activeOrder = activeOrderResponse?.data?.order || null;
          } catch {
            activeOrder = null;
          }
        }

        const dishResponse = await branchApi.getBranchDishes(
          scannedBranch._id,
          {
            limit: 100,
            isAvailable: true,
          },
        );

        setTable(scannedTable);
        setBranch(scannedBranch);
        setSession(activeSession);
        setDishes(dishResponse?.data?.dishes || []);
        setQuantities(
          (activeSession?.cart_items || []).reduce((result, item) => {
            const dishId =
              typeof item.dish_id === "object"
                ? item.dish_id?._id
                : item.dish_id;
            if (dishId) result[dishId] = item.quantity;
            return result;
          }, {}),
        );
        setLastOrder(activeOrder);
        setPaymentMethod("cod");
        setPaymentData({});
        setPaymentError("");
      } catch (error) {
        toast.error(
          error?.response?.data?.message ||
            error?.message ||
            "Không thể mở thực đơn tại bàn",
        );
      } finally {
        setLoading(false);
      }
    };

    initDineInMenu();
  }, [qrToken]);

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

  const orderDetailItems = useMemo(() => {
    if (!lastOrder?.items?.length) return [];

    return lastOrder.items.map((item) => ({
      _id: item._id || item.dish_id,
      name: item.dish_name || item.name || "Món ăn",
      image: item.dish_image || item.image,
      quantity: item.quantity || 0,
      price: item.sale_price || item.price || 0,
      total: item.total || (item.sale_price || item.price || 0) * item.quantity,
    }));
  }, [lastOrder]);

  const orderDetailQuantity = orderDetailItems.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
  const orderDetailTotal =
    lastOrder?.total_amount ||
    orderDetailItems.reduce((sum, item) => sum + item.total, 0);

  const updateQuantity = async (dishId, delta) => {
    if (!session?.session_token) return;

    const nextQuantities = {
      ...quantities,
      [dishId]: Math.max((quantities[dishId] || 0) + delta, 0),
    };

    if (nextQuantities[dishId] === 0) {
      delete nextQuantities[dishId];
    }

    setQuantities(nextQuantities);

    try {
      await dineInApi.updateCart(
        session.session_token,
        Object.entries(nextQuantities).map(([id, quantity]) => ({
          dish_id: id,
          quantity,
        })),
      );
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Không thể cập nhật giỏ món",
      );
    }
  };

  const clearCart = async () => {
    if (!session?.session_token) return;

    setQuantities({});

    try {
      await dineInApi.updateCart(session.session_token, []);
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Không thể làm mới giỏ món",
      );
    }
  };

  const handleCreateOrder = async () => {
    if (selectedItems.length === 0 || !session?.session_token || submitting) {
      return;
    }

    try {
      setSubmitting(true);
      const response = await dineInApi.createOrder({
        sessionToken: session.session_token,
        sessionId: session._id,
        tableId: table?._id,
        items: selectedItems.map((item) => ({
          dish_id: item._id,
          quantity: item.quantity,
        })),
      });

      setLastOrder(response?.data?.order || null);
      setCompletedOrderId("");
      setPaymentMethod("cod");
      setPaymentData({});
      setPaymentError("");
      setQuantities({});
      setShowSuccessPopup(true);
      toast.success("Đã gửi đơn đến quầy");
    } catch (error) {
      toast.error(
        error?.response?.data?.message || error?.message || "Không thể gửi đơn",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackToMenu = () => {
    setShowSuccessPopup(false);
    setShowCart(false);
  };

  const handleBackAfterPayment = () => {
    setShowPaymentSuccessPopup(false);
    setShowOrderDetail(false);
    setShowCart(false);
    setLastOrder(null);
    setCompletedOrderId("");
    setPaymentMethod("cod");
    setPaymentData({});
    setPaymentError("");
  };

  const handleOpenOrderDetail = () => {
    if (lastOrder) {
      setShowOrderDetail(true);
      return;
    }

    if (selectedItems.length > 0) {
      setShowCart(true);
      return;
    }

    toast.error("Chưa có đơn hàng để kiểm tra");
  };

  useEffect(() => {
    if (!showOrderDetail || !["momo", "zalopay"].includes(paymentMethod)) {
      return undefined;
    }

    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [showOrderDetail, paymentMethod]);

  useEffect(() => {
    if (!selectedNutritionDish) return undefined;

    const scrollY = window.scrollY;
    const originalStyle = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
    };

    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";

    return () => {
      document.body.style.overflow = originalStyle.overflow;
      document.body.style.position = originalStyle.position;
      document.body.style.top = originalStyle.top;
      document.body.style.width = originalStyle.width;
      window.scrollTo(0, scrollY);
    };
  }, [selectedNutritionDish]);

  const requestGatewayPayment = async (method, force = false) => {
    if (!lastOrder?._id || paymentLoading) return;
    if (method === "cod") return;
    if (!force && paymentData[method]?.createdAt) return;

    try {
      setPaymentLoading(method);
      setPaymentError("");

      let response;
      if (method === "momo") {
        response = await dineInApi.createMomoPayment({
          orderId: lastOrder._id,
          amount: orderDetailTotal,
          orderInfo: `Thanh toan don tai ban ${table?.name || ""}`,
        });
      } else if (method === "zalopay") {
        response = await dineInApi.createZalopayPayment({
          orderId: lastOrder._id,
          amount: orderDetailTotal,
          description: `Thanh toan don tai ban ${table?.name || ""}`,
        });
      } else if (method === "vnpay") {
        response = await dineInApi.createVnpayPayment({
          orderId: lastOrder._id,
          amount: orderDetailTotal,
        });
      }

      if (!response?.success) {
        throw new Error(response?.message || "Không tạo được thanh toán");
      }

      setPaymentData((prev) => ({
        ...prev,
        [method]: {
          ...(response.data || {}),
          createdAt: Date.now(),
        },
      }));
    } catch (error) {
      setPaymentError(
        error?.response?.data?.message ||
          error?.message ||
          "Không tạo được thanh toán",
      );
    } finally {
      setPaymentLoading("");
    }
  };

  const handleSelectPaymentMethod = (method) => {
    setPaymentMethod(method);
    setPaymentError("");
    requestGatewayPayment(method);
  };

  const handleRequestPayment = async () => {
    if (!session?.session_token || !lastOrder?._id || paymentLoading) return;

    try {
      setPaymentLoading("cod");
      await dineInApi.requestCashPayment(session.session_token, lastOrder._id);
      toast.success("Đã gọi thanh toán. Nhân viên sẽ hỗ trợ bạn.");
      setShowOrderDetail(false);
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Không thể gọi thanh toán",
      );
    } finally {
      setPaymentLoading("");
    }
  };

  const handleCopyPaymentLink = async (value) => {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      toast.success("Đã sao chép link thanh toán");
    } catch {
      toast.error("Không thể sao chép link thanh toán");
    }
  };

  const activePayment = paymentData[paymentMethod] || {};
  const activeQrUrl = ["momo", "zalopay"].includes(paymentMethod)
    ? activePayment.qrDataUrl
    : "";
  const activePaymentUrl =
    activePayment.paymentUrl ||
    activePayment.payUrl ||
    activePayment.deeplink ||
    activePayment.orderUrl ||
    "";
  const activeLogo =
    paymentMethod === "momo"
      ? assets.momo_icon
      : paymentMethod === "zalopay"
        ? assets.zalo_pay
        : assets.vnpay_icon;
  const activeFrameClass =
    paymentMethod === "momo"
      ? "border-[#a50064]"
      : paymentMethod === "zalopay"
        ? "border-[#0068ff]"
        : "border-[#25358f]";
  const activeRemainingMs = activePayment.createdAt
    ? Math.max(QR_TTL_MS - (now - Number(activePayment.createdAt)), 0)
    : 0;
  const activeQrExpired = Boolean(
    ["momo", "zalopay"].includes(paymentMethod) &&
    activeQrUrl &&
    activePayment.createdAt &&
    activeRemainingMs <= 0,
  );
  const vnpayQrUrl = activePaymentUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&data=${encodeURIComponent(
        activePaymentUrl,
      )}`
    : "";
  const latestPaymentCreatedAt = Math.max(
    0,
    ...Object.values(paymentData).map((payment) =>
      Number(payment?.createdAt || 0),
    ),
  );

  useEffect(() => {
    if (
      !session?.session_token ||
      !lastOrder?._id ||
      !latestPaymentCreatedAt ||
      completedOrderId === lastOrder._id
    ) {
      return undefined;
    }

    let stopped = false;

    const checkOrderStatus = async () => {
      try {
        const response = await dineInApi.getOrderStatus(
          session.session_token,
          lastOrder._id,
        );
        const updatedOrder = response?.data?.order;
        if (!updatedOrder || stopped) return;

        setLastOrder((currentOrder) =>
          currentOrder?._id === updatedOrder._id ? updatedOrder : currentOrder,
        );

        if (
          updatedOrder.payment_status === "paid" ||
          updatedOrder.status === "completed"
        ) {
          setCompletedOrderId(updatedOrder._id);
          setPaymentData({});
          setPaymentError("");
          setPaymentMethod("cod");
          setShowOrderDetail(false);
          setShowCart(false);
          setShowPaymentSuccessPopup(true);
          toast.success("Thanh toán thành công");
        }
      } catch {
        // Cho phép lần poll tiếp theo thử lại, tránh làm gián đoạn khách đang thanh toán.
      }
    };

    checkOrderStatus();
    const timer = setInterval(checkOrderStatus, 3000);

    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [
    completedOrderId,
    lastOrder?._id,
    latestPaymentCreatedAt,
    session?.session_token,
  ]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f7f8] px-5 text-center">
        <div className="rounded-2xl bg-white px-6 py-5 text-base font-bold text-gray-700 shadow-sm">
          Đang mở thực đơn...
        </div>
      </div>
    );
  }

  if (!table || !branch || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f7f8] px-5 text-center">
        <div className="rounded-2xl bg-white px-6 py-5 shadow-sm">
          <div className="text-lg font-bold text-gray-900">QR không hợp lệ</div>
          <div className="mt-2 text-sm font-medium text-gray-500">
            Vui lòng quét lại mã QR tại bàn hoặc liên hệ nhân viên.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f7f8] pb-28 text-slate-950">
      <header className="sticky top-0 z-20 bg-[#f7f7f8]/95 px-4 pb-4 pt-3 backdrop-blur">
        <div className="mx-auto max-w-md">
          <div className="mb-3 flex items-center justify-between">
            <div className="w-8" />
            <h1 className="text-lg font-black">{table.name || "Bàn"}</h1>
            <div className="flex items-center gap-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-sm font-black text-yellow-300">
                ★
              </span>
              <Menu className="h-7 w-7" />
            </div>
          </div>

          <img
            src={assets.main_banner1}
            alt={branch.name || "NHGreen"}
            className="h-28 w-full rounded-xl object-cover"
          />

          <div className="relative -mt-5 px-3">
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Tìm kiếm"
              className="h-14 w-full rounded-2xl bg-white px-5 pr-12 text-base font-medium text-gray-800 shadow-md outline-none"
            />
            <Search className="absolute right-7 top-1/2 h-6 w-6 -translate-y-1/2 text-gray-600" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4">
        <button
          type="button"
          onClick={() => {
            if (!lastOrder) {
              toast.error("Vui lòng gọi món trước khi thanh toán");
              return;
            }
            setShowOrderDetail(true);
          }}
          className="mb-5 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-50 text-sm font-black text-emerald-600"
        >
          <Star className="h-5 w-5" />
          Gọi thanh toán
        </button>

        {lastOrder && (
          <div className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
            Đơn #{lastOrder.order_number} đã được gửi đến quầy.
          </div>
        )}

        <div className="space-y-3">
          {filteredDishes.map((dish) => {
            const quantity = quantities[dish._id] || 0;
            const price = getDishPrice(dish);

            return (
              <article
                key={dish._id}
                className="grid min-h-[136px] grid-cols-[120px_1fr] gap-4 rounded-2xl bg-white p-3 shadow-sm"
              >
                <img
                  src={getDishImage(dish)}
                  alt={dish.name}
                  className="h-28 w-28 rounded-xl object-cover"
                />
                <div className="flex min-w-0 flex-col">
                  <h2 className="line-clamp-2 text-base font-black text-gray-900">
                    {dish.name}
                  </h2>
                  <div className="mt-1 text-sm font-black text-red-500">
                    {formatCurrency(price)} VND
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <div className="flex h-9 shrink-0 items-center gap-3">
                      <button
                        type="button"
                        onClick={() => updateQuantity(dish._id, -1)}
                        disabled={quantity === 0}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white disabled:opacity-35"
                      >
                        <Minus className="h-5 w-5" />
                      </button>
                      <span className="min-w-6 text-center text-lg font-bold text-gray-600">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(dish._id, 1)}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-2xl font-medium leading-none text-white"
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedNutritionDish(dish)}
                      className="flex h-9 min-w-[104px] shrink-0 items-center justify-center gap-1 rounded-full bg-emerald-50 px-3 text-[11px] font-black leading-none text-emerald-600"
                      title="Dinh dưỡng"
                    >
                      <Info className="h-4 w-4 shrink-0" />
                      <span className="whitespace-nowrap">
                        Thông tin dinh dưỡng
                      </span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </main>

      {totalQuantity > 0 && (
        <div className="fixed bottom-3 left-0 right-0 z-30 px-3">
          <button
            type="button"
            onClick={() => setShowCart(true)}
            className="mx-auto flex h-16 w-full max-w-md items-center justify-between rounded-xl bg-emerald-600 px-5 text-left text-white shadow-xl"
          >
            <div className="flex items-center gap-3">
              <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white text-emerald-600">
                <ShoppingBag className="h-6 w-6" />
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-black text-white">
                  {totalQuantity}
                </span>
              </span>
              <span className="text-base font-black">
                Giỏ hàng: {totalQuantity} món
              </span>
            </div>
            <span className="text-lg font-black">
              {formatCurrency(totalAmount)} VND
            </span>
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={handleOpenOrderDetail}
        className={`fixed right-5 z-30 flex h-16 w-16 items-center justify-center rounded-full bg-black text-white shadow-lg ${
          totalQuantity > 0 ? "bottom-24" : "bottom-5"
        }`}
        title="Kiểm tra đơn hàng"
      >
        <ShoppingBag className="h-8 w-8" />
        {(orderDetailQuantity > 0 || totalQuantity > 0) && (
          <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-black">
            {orderDetailQuantity || totalQuantity}
          </span>
        )}
      </button>

      {selectedNutritionDish && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto overscroll-contain bg-black/70 px-4 py-6">
          <div className="relative max-h-[calc(100vh-48px)] w-full max-w-md overflow-y-auto overscroll-contain rounded-2xl bg-white p-5 shadow-2xl">
            <button
              type="button"
              onClick={() => setSelectedNutritionDish(null)}
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-700"
              title="Đóng"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="grid grid-cols-[84px_minmax(0,1fr)] gap-3 pr-10">
              <img
                src={getDishImage(selectedNutritionDish)}
                alt={selectedNutritionDish.name}
                className="h-20 w-20 rounded-xl object-cover"
              />
              <div className="min-w-0">
                <h3 className="line-clamp-2 text-lg font-black leading-snug text-gray-950">
                  {selectedNutritionDish.name}
                </h3>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              {(() => {
                const nutrition = getDishNutrition(selectedNutritionDish);
                const values = [
                  {
                    label: "Calo",
                    value: formatNutrition(nutrition.calories, "kcal"),
                    className: "bg-orange-50 text-orange-600",
                  },
                  {
                    label: "Protein",
                    value: formatNutrition(nutrition.protein),
                    className: "bg-sky-50 text-sky-600",
                  },
                  {
                    label: "Carb",
                    value: formatNutrition(nutrition.carbs),
                    className: "bg-emerald-50 text-emerald-600",
                  },
                  {
                    label: "Chất béo",
                    value: formatNutrition(nutrition.fat),
                    className: "bg-rose-50 text-rose-600",
                  },
                ];

                return values.map((item) => (
                  <div
                    key={item.label}
                    className={`rounded-xl px-4 py-3 ${item.className}`}
                  >
                    <div className="text-sm font-bold opacity-80">
                      {item.label}
                    </div>
                    <div className="mt-1 text-2xl font-black">{item.value}</div>
                  </div>
                ));
              })()}
            </div>

            <button
              type="button"
              onClick={() => setSelectedNutritionDish(null)}
              className="mt-5 h-12 w-full rounded-xl bg-emerald-600 text-base font-black text-white"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {showPaymentSuccessPopup && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/75 px-3">
          <div className="w-full max-w-md rounded-lg bg-white px-7 py-11 text-center shadow-2xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white">
              <span className="text-4xl font-black leading-none">✓</span>
            </div>
            <h3 className="mt-9 text-2xl font-black text-black">
              Thanh toán thành công
            </h3>
            <p className="mt-3 text-sm font-bold text-gray-500">
              Đơn hàng đã được cập nhật. Cảm ơn bạn đã dùng bữa tại NHGREEN.
            </p>
            <Button
              type="button"
              onClick={handleBackAfterPayment}
              className="mt-9 h-14 w-full rounded-lg bg-emerald-600 text-base font-black text-white hover:bg-emerald-700"
            >
              Trở về màn hình chính
            </Button>
          </div>
        </div>
      )}

      {showCart && (
        <div className="fixed inset-0 z-40 bg-[#f7f7f8] text-slate-950">
          <div className="mx-auto flex h-full max-w-md flex-col">
            <header className="rounded-b-3xl bg-white px-4 pb-6 pt-7 shadow-sm">
              <div className="flex items-start justify-between">
                <button
                  type="button"
                  onClick={clearCart}
                  className="rounded-full p-1 text-gray-700 hover:bg-gray-100"
                  title="Làm mới giỏ"
                >
                  <RefreshCw className="h-6 w-6" />
                </button>
                <div className="text-center">
                  <h2 className="text-2xl font-black">
                    Giỏ hàng ({totalQuantity})
                  </h2>
                  <div className="mt-1 text-sm font-bold text-gray-500">
                    {table.name || "Bàn"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCart(false)}
                  className="rounded-full p-1 text-red-500 hover:bg-red-50"
                  title="Đóng"
                >
                  <X className="h-7 w-7" />
                </button>
              </div>
            </header>

            <main className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-9">
              <button
                type="button"
                onClick={() => setShowCart(false)}
                className="mb-5 ml-auto block text-base font-black text-emerald-600"
              >
                Thêm món
              </button>

              <div className="space-y-3">
                {selectedItems.length > 0 ? (
                  selectedItems.map((item) => {
                    const price = getDishPrice(item);

                    return (
                      <article
                        key={item._id}
                        className="rounded-2xl bg-white px-4 py-4 shadow-sm"
                      >
                        <div className="grid grid-cols-[64px_1fr] gap-4">
                          <img
                            src={getDishImage(item)}
                            alt={item.name}
                            className="h-14 w-14 rounded-lg object-cover"
                          />
                          <div className="min-w-0">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h3 className="line-clamp-2 text-xl font-black text-black">
                                  {item.name}
                                </h3>
                                <div className="mt-1 text-base font-black text-emerald-600">
                                  {item.quantity} phần
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => setShowCart(false)}
                                className="shrink-0 text-sm font-bold text-sky-500"
                              >
                                <Edit3 className="mr-1 inline h-4 w-4" />
                                Chỉnh sửa
                              </button>
                            </div>
                            <div className="mt-1 text-right text-base font-black text-black">
                              {formatCurrency(price)} VND
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 flex items-center justify-between border-t border-dashed border-gray-200 pt-3">
                          <span className="text-sm font-bold text-gray-500">
                            Thành tiền:
                          </span>
                          <span className="text-xl font-black text-red-500">
                            {formatCurrency(price * item.quantity)} VND
                          </span>
                        </div>
                      </article>
                    );
                  })
                ) : (
                  <div className="py-16 text-center text-sm font-bold text-gray-500">
                    Chưa chọn món
                  </div>
                )}
              </div>
            </main>

            <footer className="bg-white px-4 pb-4 pt-4 shadow-[0_-8px_20px_rgba(15,23,42,0.06)]">
              <div className="mb-3 flex h-16 items-center justify-between rounded-xl bg-gray-100 px-4">
                <div className="flex items-center gap-3">
                  <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white">
                    <ShoppingBag className="h-6 w-6" />
                    {totalQuantity > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-black text-white">
                        {totalQuantity}
                      </span>
                    )}
                  </span>
                  <span className="text-base font-black text-gray-800">
                    Giỏ hàng: {totalQuantity} món
                  </span>
                </div>
                <span className="text-lg font-black text-gray-900">
                  {formatCurrency(totalAmount)} VND
                </span>
              </div>

              <Button
                type="button"
                onClick={handleCreateOrder}
                disabled={selectedItems.length === 0 || submitting}
                className="h-14 w-full rounded-lg bg-emerald-600 text-base font-black text-white hover:bg-emerald-700 disabled:bg-gray-300"
              >
                {submitting ? "Đang gửi đơn..." : "Gọi món"}
              </Button>
            </footer>
          </div>

          {showSuccessPopup && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/75 px-3">
              <div className="w-full max-w-md rounded-lg bg-white px-7 py-11 text-center shadow-2xl">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white">
                  <span className="text-4xl font-black leading-none">✓</span>
                </div>
                <h3 className="mt-9 text-2xl font-black text-black">
                  Gọi món thành công
                </h3>
                <Button
                  type="button"
                  onClick={handleBackToMenu}
                  className="mt-9 h-14 w-full rounded-lg bg-emerald-600 text-base font-black text-white hover:bg-emerald-700"
                >
                  Trở về màn hình chính
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {showOrderDetail && (
        <div className="fixed inset-0 z-40 bg-[#f7f7f8] text-slate-950">
          <div className="mx-auto flex h-full max-w-md flex-col">
            <header className="rounded-b-3xl bg-white px-4 pb-6 pt-7 shadow-sm">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowOrderDetail(false)}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-gray-700"
                  title="Quay lại"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <h2 className="text-xl font-black">Chi tiết đơn hàng - Bàn</h2>
                <button
                  type="button"
                  onClick={() => toast.info("Đơn hàng đang được cập nhật")}
                  className="flex h-11 w-11 items-center justify-center rounded-full text-gray-700 hover:bg-gray-100"
                  title="Làm mới"
                >
                  <RefreshCw className="h-6 w-6" />
                </button>
              </div>
            </header>

            <main className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-9">
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-xl font-black text-black">
                  Tóm tắt đơn hàng
                </h3>
                <button
                  type="button"
                  onClick={() => setShowOrderDetail(false)}
                  className="text-base font-black text-red-500"
                >
                  Thêm món
                </button>
              </div>

              <div className="space-y-3">
                {orderDetailItems.length > 0 ? (
                  orderDetailItems.map((item) => (
                    <article
                      key={item._id}
                      className="rounded-2xl bg-white px-4 py-4 shadow-sm"
                    >
                      <div className="grid grid-cols-[64px_1fr] gap-4">
                        <img
                          src={item.image || assets.add_icon}
                          alt={item.name}
                          className="h-14 w-14 rounded-lg object-cover"
                        />
                        <div className="min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h4 className="line-clamp-2 text-lg font-black text-black">
                                {item.name}
                              </h4>
                              <div className="mt-1 text-sm font-black text-emerald-600">
                                {item.quantity} phần
                              </div>
                            </div>
                            <div className="shrink-0 text-right text-sm font-black text-black">
                              {formatCurrency(item.price)} VND
                            </div>
                          </div>

                          <div className="mt-4 flex items-center justify-between border-t border-dashed border-gray-200 pt-3">
                            <span className="text-sm font-medium text-gray-500">
                              Thành tiền:
                            </span>
                            <span className="text-lg font-black text-red-500">
                              {formatCurrency(item.total)} VND
                            </span>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="rounded-2xl bg-white px-5 py-10 text-center text-sm font-bold text-gray-500 shadow-sm">
                    Chưa có món nào trong đơn hàng.
                  </div>
                )}
              </div>
            </main>

            <footer className="space-y-4 bg-[#f7f7f8] px-4 pb-5 pt-4 shadow-[0_-8px_24px_rgba(15,23,42,0.04)]">
              <div className="grid grid-cols-4 gap-2">
                {PAYMENT_METHODS.map((method) => {
                  const Icon = method.icon;
                  const active = paymentMethod === method.value;

                  return (
                    <button
                      key={method.value}
                      type="button"
                      onClick={() => handleSelectPaymentMethod(method.value)}
                      disabled={orderDetailItems.length === 0}
                      className={`flex h-11 items-center justify-center gap-1 rounded-lg border bg-white px-1 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${getPaymentTabClass(
                        method.value,
                        active,
                      )}`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{method.label}</span>
                    </button>
                  );
                })}
              </div>

              {paymentMethod === "cod" && (
                <div className="rounded-xl border border-emerald-100 bg-white px-4 py-3 text-sm font-bold text-gray-600">
                  Thanh toán tiền mặt tại quầy hoặc gọi nhân viên đến bàn.
                </div>
              )}

              {["momo", "zalopay"].includes(paymentMethod) && (
                <div className="rounded-xl bg-white px-4 py-4">
                  <div className="flex flex-col items-center">
                    {paymentLoading === paymentMethod ? (
                      <div className="flex h-56 w-56 items-center justify-center rounded-xl border border-gray-200 text-sm font-bold text-gray-500">
                        Đang tạo QR...
                      </div>
                    ) : activeQrExpired ? (
                      <div className="flex h-56 w-56 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 text-center text-sm font-bold text-red-500">
                        QR đã hết hiệu lực
                      </div>
                    ) : activeQrUrl ? (
                      <div
                        className={`relative rounded-2xl border-[3px] bg-white p-2 ${activeFrameClass}`}
                      >
                        <img
                          src={activeQrUrl}
                          alt={`${paymentMethod} QR`}
                          className="h-52 w-52 rounded-lg bg-white"
                        />
                        <div className="absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-lg bg-white p-1 shadow-sm">
                          <img
                            src={activeLogo}
                            alt=""
                            className="h-full w-full object-contain"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex h-56 w-56 items-center justify-center rounded-xl border border-gray-200 px-4 text-center text-sm font-bold text-gray-500">
                        {paymentError || "Chưa có QR"}
                      </div>
                    )}

                    {activeQrUrl && activePayment.createdAt && (
                      <div
                        className={`mt-3 text-sm font-black ${
                          activeQrExpired ? "text-red-500" : "text-gray-800"
                        }`}
                      >
                        {activeQrExpired
                          ? "QR đã hết hiệu lực"
                          : `Còn hiệu lực ${formatCountdown(activeRemainingMs)}`}
                      </div>
                    )}

                    {paymentError && (
                      <div className="mt-3 text-center text-sm font-bold text-red-500">
                        {paymentError}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => requestGatewayPayment(paymentMethod, true)}
                      disabled={paymentLoading === paymentMethod}
                      className="mt-4 h-10 rounded-lg border border-emerald-500 px-5 text-sm font-black text-emerald-600 disabled:opacity-60"
                    >
                      Tạo QR mới
                    </button>
                  </div>
                </div>
              )}

              {paymentMethod === "vnpay" && (
                <div className="rounded-xl bg-white px-4 py-4">
                  <div className="flex flex-col items-center">
                    {paymentLoading === "vnpay" ? (
                      <div className="flex h-56 w-56 items-center justify-center rounded-xl border border-gray-200 text-sm font-bold text-gray-500">
                        Đang tạo link...
                      </div>
                    ) : vnpayQrUrl ? (
                      <div
                        className={`relative rounded-2xl border-[3px] bg-white p-2 ${activeFrameClass}`}
                      >
                        <img
                          src={vnpayQrUrl}
                          alt="VNPay QR"
                          className="h-52 w-52 rounded-lg bg-white"
                        />
                        <div className="absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-lg bg-white p-1 shadow-sm">
                          <img
                            src={activeLogo}
                            alt=""
                            className="h-full w-full object-contain"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex h-56 w-56 items-center justify-center rounded-xl border border-gray-200 px-4 text-center text-sm font-bold text-gray-500">
                        {paymentError || "Chưa có link VNPay"}
                      </div>
                    )}

                    {paymentError && (
                      <div className="mt-3 text-center text-sm font-bold text-red-500">
                        {paymentError}
                      </div>
                    )}

                    <div className="mt-4 flex w-full items-center gap-2 rounded-xl border-[4px] border-[#25358f] bg-white p-2">
                      <div className="min-w-0 flex-1 truncate px-2 text-xs font-semibold text-gray-700">
                        {activePaymentUrl || "Đang chờ link thanh toán..."}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyPaymentLink(activePaymentUrl)}
                        disabled={!activePaymentUrl}
                        className="flex h-10 shrink-0 items-center gap-1 rounded-lg bg-[#25358f] px-3 text-xs font-black text-white disabled:opacity-60"
                      >
                        <Copy className="h-4 w-4" />
                        Sao chép
                      </button>
                    </div>

                    {activePaymentUrl && (
                      <a
                        href={activePaymentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 text-sm font-black text-[#25358f]"
                      >
                        Mở link thanh toán
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => requestGatewayPayment("vnpay", true)}
                      disabled={paymentLoading === "vnpay"}
                      className="mt-3 h-10 rounded-lg border border-[#25358f] px-5 text-sm font-black text-[#25358f] disabled:opacity-60"
                    >
                      Tạo link mới
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-[48px_1fr_auto] items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white">
                  <ShoppingBag className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-500">
                    Tổng cộng {orderDetailQuantity} món
                  </div>
                  <div className="text-xl font-black text-gray-900">
                    {formatCurrency(orderDetailTotal)} VND
                  </div>
                </div>
                {paymentMethod === "cod" && (
                  <Button
                    type="button"
                    onClick={handleRequestPayment}
                    disabled={
                      orderDetailItems.length === 0 || paymentLoading === "cod"
                    }
                    className="h-14 rounded-lg bg-emerald-600 px-5 text-base font-black text-white hover:bg-emerald-700 disabled:bg-gray-300"
                  >
                    {paymentLoading === "cod"
                      ? "Đang gọi..."
                      : "Gọi thanh toán"}
                  </Button>
                )}
              </div>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};

export default DineInMenu;
