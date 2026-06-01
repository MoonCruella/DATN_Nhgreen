import { useEffect, useMemo, useState } from "react";
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
import orderApi from "@/api/orderApi";
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

const CreateOrderModal = ({
  table,
  branchId,
  accessToken,
  onClose,
  onOrderCreated,
  initialOrder,
  open,
}) => {
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [quantities, setQuantities] = useState({});
  const [initialQuantities, setInitialQuantities] = useState({});
  const [showOrderDetail, setShowOrderDetail] = useState(false);
  const [orderStatus, setOrderStatus] = useState("selecting");
  const [createdOrder, setCreatedOrder] = useState(null);

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

  const handleConfirmOrder = async () => {
    if (!validateSelectedItems() || submitting) return;

    // Nếu đã có order, chuyển sang xác nhận (move to processing status)
    if (createdOrder) {
      setOrderStatus("processing");
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
        items: selectedItems.map((item) => ({
          dish_id: item._id,
          quantity: item.quantity,
          variant: item.variant || {},
        })),
      };

      const response = await orderApi.createOrder(accessToken, payload);
      const order = response?.data?.order;
      setCreatedOrder(order || null);
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
    if (!validateSelectedItems() || submitting) return;

    if (!createdOrder?._id) {
      toast.error("Vui lòng xác nhận đơn hàng trước khi thanh toán");
      return;
    }

    try {
      setSubmitting(true);
      const response = await orderApi.completeDineInOrder(
        accessToken,
        createdOrder._id,
        paymentMethod,
      );
      setCreatedOrder(response?.data?.order || createdOrder);
      setOrderStatus("completed");
      toast.success("Đơn hàng đã hoàn thành");
      onOrderCreated?.(response?.data?.order || createdOrder);
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

  const primaryActionLabel =
    orderStatus === "selecting"
      ? "Xác nhận đơn hàng"
      : orderStatus === "processing"
        ? "Thanh toán"
        : "Hoàn thành";

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

  const handleOrderDetailPrimaryAction = (paymentMethod) => {
    if (orderStatus === "selecting") {
      handleConfirmOrder();
      return;
    }

    if (orderStatus === "processing") {
      handlePayment(paymentMethod);
      return;
    }

    setShowOrderDetail(false);
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
            <div className="text-[#26338d]">Danh sách sản phẩm</div>
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
          <div className="flex h-14 min-w-32 items-center justify-center rounded-xl border border-[#26338d] bg-white px-5 text-lg font-bold text-gray-800">
            {table.name || "Bàn"}
          </div>

          <div className="relative flex-1">
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="h-14 w-full rounded-xl bg-white px-5 pr-12 text-base font-medium text-gray-800 shadow-md outline-none placeholder:text-slate-300 focus:ring-2 focus:ring-[#26338d]/30"
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
                      className="h-28 w-28 rounded-lg bg-blue-50 object-cover"
                    />

                    <div className="flex min-w-0 flex-col">
                      <h3 className="line-clamp-2 text-lg font-bold text-gray-900">
                        {dish.name}
                      </h3>
                      <div className="mt-1 text-lg font-bold text-[#26338d]">
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
                          className="flex h-9 w-9 items-center justify-center rounded-full bg-[#26338d] text-white disabled:opacity-40"
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
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-[#26338d] text-white">
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

            <Button
              type="button"
              onClick={handlePrimaryAction}
              disabled={totalQuantity === 0 || submitting}
              className="h-14 min-w-56 shrink-0 rounded-lg bg-[#26338d] text-lg font-bold text-white hover:bg-[#1d2874] disabled:cursor-not-allowed disabled:bg-[#a8afd0] disabled:hover:bg-[#a8afd0]"
            >
              {submitting ? "Đang xác nhận..." : primaryActionLabel}
            </Button>
          </div>
        </footer>
      </div>

      <OrderDetailModal
        open={showOrderDetail}
        table={table}
        items={selectedItems}
        order={createdOrder}
        totalQuantity={totalQuantity}
        totalAmount={totalAmount}
        primaryActionLabel={
          submitting ? "Đang xác nhận..." : primaryActionLabel
        }
        onClose={() => setShowOrderDetail(false)}
        onAddMore={() => setShowOrderDetail(false)}
        onPrimaryAction={handleOrderDetailPrimaryAction}
      />
    </div>
  );
};

export default CreateOrderModal;
