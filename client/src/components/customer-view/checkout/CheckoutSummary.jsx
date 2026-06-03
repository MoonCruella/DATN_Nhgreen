import React, { useState, useEffect } from "react";
import ItemRow from "./ItemRow";
import orderApi from "@/api/orderApi";
import { useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { useCartContext } from "@/context/CartContext";
import { useAddressContext } from "@/context/AddressContext";
import vnpayApi from "@/api/vnpayApi";
import zalopayApi from "@/api/zalopayApi";
import momoApi from "@/api/momoApi";
import flashsaleApi from "@/api/flashsaleApi";
import VoucherModal from "../voucher/VoucherModal";
import voucherApi from "@/api/voucherApi";
import branchApi from "@/api/branchApi";
import { assets } from "@/assets/assets";
import { toast } from "sonner";
import UnavailableItemsModal from "./UnavailableItemsModal";

const CheckoutSummary = ({
  cartItems,
  subtotal,
  selectedAddress,
  paymentMethod,
}) => {
  const accessToken = useSelector((state) => state.auth.accessToken);
  const user = useSelector((state) => state.auth.user);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [useCoin, setUseCoin] = useState(false);
  const [note, setNote] = useState("");
  const { removeMultipleItems, removeFromCart } = useCartContext();
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedBranch } = useAddressContext();

  // Kiểm tra xem có phải "Mua ngay" hoặc "Mua lại" không
  const isDirectBuy = location.state?.fromProductDetail || false;
  const isReorder = location.state?.fromReorder || false;

  // Unavailable items modal states
  const [showUnavailableModal, setShowUnavailableModal] = useState(false);
  const [unavailableItems, setUnavailableItems] = useState([]);

  // Voucher states
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [selectedFreeship, setSelectedFreeship] = useState(null);
  const [selectedDiscount, setSelectedDiscount] = useState(null);
  const [voucherPreviewDiscount, setVoucherPreviewDiscount] = useState(null);
  const [applyingVoucher, setApplyingVoucher] = useState(false);

  // Calculate distance between two coordinates using Haversine formula (returns km)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Calculate shipping fee based on distance
  // Under 3km: 20,000 VND flat rate
  // From 3km onwards: 500 VND per 100m
  const calculateShippingFee = (distanceKm) => {
    const baseRate = 20000; // 20k for under 3km
    const baseDistance = 3; // 3km
    const additionalRatePer100m = 500; // 500 VND per 100m

    if (distanceKm <= baseDistance) {
      return baseRate;
    }

    // Distance beyond 3km in meters
    const extraDistanceMeters = (distanceKm - baseDistance) * 1000;
    // Calculate additional fee (500 VND per 100m)
    const additionalFee =
      Math.ceil(extraDistanceMeters / 100) * additionalRatePer100m;

    return baseRate + additionalFee;
  };

  // Calculate base shipping fee based on distance
  const defaultShippingFee = (() => {
    // Check if both branch and delivery address have coordinates
    if (
      selectedBranch?.address?.coordinates?.latitude &&
      selectedBranch?.address?.coordinates?.longitude &&
      selectedAddress?.coordinates?.latitude &&
      selectedAddress?.coordinates?.longitude
    ) {
      const distance = calculateDistance(
        selectedBranch.address.coordinates.latitude,
        selectedBranch.address.coordinates.longitude,
        selectedAddress.coordinates.latitude,
        selectedAddress.coordinates.longitude
      );
      const fee = calculateShippingFee(distance);
      console.log(
        `📍 Khoảng cách: ${distance.toFixed(
          2
        )}km, Phí ship: ${fee.toLocaleString("vi-VN")}₫`
      );
      return fee;
    }
    // Default fallback if no coordinates
    return 30000;
  })();

  const shippingFee = (() => {
    if (!selectedFreeship) return defaultShippingFee;

    const cap =
      selectedFreeship.maxFreeship ??
      selectedFreeship.maxDiscount ??
      selectedFreeship.value ??
      selectedFreeship.discount ??
      defaultShippingFee;
    const freeshipAmount = Math.min(Number(cap) || 0, defaultShippingFee);
    return Math.max(0, defaultShippingFee - freeshipAmount);
  })();

  const freeshipAmount = Math.max(0, defaultShippingFee - shippingFee);
  const discountAmount = voucherPreviewDiscount?.discount ?? 0;
  const userCoin = user?.coin || 0;
  const beforeCoinTotal = Math.max(0, subtotal + shippingFee - discountAmount);
  const coinDiscount = useCoin ? Math.min(userCoin, beforeCoinTotal) : 0;
  const total = Math.max(0, beforeCoinTotal - coinDiscount);

  const selectedItemsCount = Array.isArray(cartItems) ? cartItems.length : 0;

  const getSelectedAddressText = () =>
    selectedAddress?.full_address ||
    [
      selectedAddress?.street,
      selectedAddress?.ward?.name,
      selectedAddress?.district?.name,
      selectedAddress?.province?.name,
    ]
      .filter(Boolean)
      .join(", ");

  // Helper: clear all temporary payment data stored in localStorage
  const clearTempPaymentData = () => {
    localStorage.removeItem("pendingOrderData");
    localStorage.removeItem("pendingCartItems");
    localStorage.removeItem("zaloAppTransId");
  };

  // Helper function to remove checked out items (chỉ khi không phải "Mua ngay" hoặc "Mua lại")
  const removeCheckedOutItems = async () => {
    // Nếu là "Mua ngay" hoặc "Mua lại", không xóa cart vì item không có trong cart
    if (isDirectBuy || isReorder) {
      return;
    }

    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      return;
    }

    const itemIdsToRemove = cartItems
      .filter((item) => !item._id.startsWith("temp-")) // Không xóa temp items
      .map((item) => item._id);

    if (itemIdsToRemove.length > 0) {
      await removeMultipleItems(itemIdsToRemove);
    }
  };

  // Helper function to update Flash Sale sold count after successful order
  const updateFlashSaleSoldCounts = async () => {
    if (!Array.isArray(cartItems) || cartItems.length === 0) return;

    try {
      // Lọc các items có Flash Sale
      const flashSaleItems = cartItems.filter((item) => item.flashSaleId);

      // Cập nhật sold count cho từng Flash Sale item
      for (const item of flashSaleItems) {
        const dishId = item.dish_id?._id || item.product_id?._id;
        const quantity = item.quantity || 1;

        if (dishId && item.flashSaleId) {
          try {
            await flashsaleApi.updateSold(
              accessToken,
              item.flashSaleId,
              dishId,
              quantity
            );
          } catch (error) {
            console.error(
              `Failed to update Flash Sale sold count for ${dishId}:`,
              error
            );
            // Không throw error để không ảnh hưởng đến flow chính
          }
        }
      }
    } catch (error) {
      console.error("Error updating Flash Sale sold counts:", error);
    }
  };

  // Unified gateway payment creation for VNPay / ZaloPay
  const createGatewayPayment = async (method, orderData, totalAmount) => {
    if (!accessToken) {
      toast.error("Vui lòng đăng nhập");
      return;
    }
    setLoading(true);
    const tempOrderId = Date.now();
    orderData.orderId = tempOrderId;

    // Persist order + cart snapshot for return flow
    localStorage.setItem("pendingOrderData", JSON.stringify(orderData));
    localStorage.setItem(
      "pendingCartItems",
      JSON.stringify(cartItems.map((i) => i._id))
    );

    try {
      if (method === "vnpay") {
        const { success, url, vnpCreateDate, message } =
          await vnpayApi.createPayment(
            accessToken,
            orderData.orderId,
            totalAmount
          );
        if (success) {
          if (vnpCreateDate) {
            const storedOrderData = {
              ...orderData,
              vnpay_create_date: vnpCreateDate,
            };
            localStorage.setItem(
              "pendingOrderData",
              JSON.stringify(storedOrderData)
            );
          }
          window.location.href = url;
        } else {
          toast.error("Tạo thanh toán VNPay thất bại: " + message);
          setLoading(false);
          localStorage.removeItem("pendingOrderData");
          localStorage.removeItem("pendingCartItems");
        }
        return;
      }
      if (method === "momo") {
        const { success, data, message } = await momoApi.createPayment(
          accessToken,
          orderData.orderId,
          totalAmount,
          "Thanh toan don hang qua MoMo"
        );
        if (success) {
          window.location.href = data.paymentUrl;
        } else {
          toast.error("Tạo thanh toán MoMo thất bại: " + message);
          setLoading(false);
          localStorage.removeItem("pendingOrderData");
          localStorage.removeItem("pendingCartItems");
        }
        return;
      }
      if (method === "zalopay") {
        const { success, data, message } = await zalopayApi.createPayment(
          accessToken,
          orderData.orderId,
          totalAmount,
          "Thanh toan don hang qua ZaloPay"
        );
        if (success) {
          localStorage.setItem("zaloAppTransId", data.appTransId);
          window.location.href = data.paymentUrl;
        } else {
          toast.error("Tạo thanh toán ZaloPay thất bại: " + message);
          setLoading(false);
          localStorage.removeItem("pendingOrderData");
          localStorage.removeItem("pendingCartItems");
        }
        return;
      }
      toast.error("Phương thức thanh toán không hợp lệ");
      setLoading(false);
    } catch (err) {
      console.error("Gateway payment error", err);
      toast.error("Tạo thanh toán thất bại. Vui lòng thử lại!");
      setLoading(false);
      localStorage.removeItem("pendingOrderData");
      localStorage.removeItem("pendingCartItems");
    }
  };

  // Unified callback handling for VNPay & ZaloPay
  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const success = query.get("success");
    const message = query.get("message");
    const orderId = query.get("orderId");
    const vnpTransactionNo = query.get("vnp_TransactionNo");
    const vnpPayDate = query.get("vnp_PayDate");
    const vnpAmount = query.get("vnp_Amount");
    const momoResultCode = query.get("resultCode");
    const momoTransId = query.get("transId");
    const momoRequestId = query.get("requestId");
    const momoAmount = query.get("amount");
    const appTransId =
      query.get("apptransid") || localStorage.getItem("zaloAppTransId");
    const pendingOrderData = JSON.parse(
      localStorage.getItem("pendingOrderData") || "null"
    );

    const paymentMethodFromStorage = pendingOrderData?.payment_method;

    const resolvedSuccess =
      success ??
      (paymentMethodFromStorage === "momo" && momoResultCode
        ? momoResultCode === "0"
          ? "true"
          : "false"
        : null);

    // Gateway return flow (VNPay / MoMo)
    if (
      (resolvedSuccess === "false" || resolvedSuccess === "true") &&
      ["vnpay", "momo"].includes(paymentMethodFromStorage)
    ) {
      if (resolvedSuccess === "false") {
        const failedLabel =
          paymentMethodFromStorage === "momo" ? "MoMo" : "VNPay";
        toast.error(
          message || `Thanh toán ${failedLabel} thất bại hoặc bị hủy!`
        );
        clearTempPaymentData();
        navigate("/checkout");
        return;
      }
      if (!orderId) {
        toast.error("Không nhận được mã giao dịch thanh toán");
        clearTempPaymentData();
        navigate("/checkout");
        return;
      }
      if (!accessToken || !pendingOrderData) return; // wait for token / data
      setLoading(true);
      const orderPayload =
        paymentMethodFromStorage === "vnpay"
          ? {
              ...pendingOrderData,
              vnpay_txn_ref: orderId,
              vnpay_transaction_no: vnpTransactionNo || undefined,
              vnpay_pay_date: vnpPayDate || undefined,
              vnpay_amount: vnpAmount ? Number(vnpAmount) : undefined,
            }
          : paymentMethodFromStorage === "momo"
          ? {
              ...pendingOrderData,
              momo_request_id: momoRequestId || orderId,
              momo_trans_id: momoTransId || undefined,
              momo_amount: momoAmount ? Number(momoAmount) : undefined,
            }
          : pendingOrderData;

      orderApi.createOrder(accessToken, orderPayload).then(async (res) => {
        if (res.success) {
          const successLabel =
            paymentMethodFromStorage === "momo" ? "MoMo" : "VNPay";
          toast.success(`Thanh toán ${successLabel} thành công!`);
          await updateFlashSaleSoldCounts();
          await removeCheckedOutItems();
          clearTempPaymentData();
          navigate("/my-account/orders");
        } else {
          toast.error("Lưu đơn hàng thất bại: " + res.message);
        }
        setLoading(false);
      });
      return;
    }

    // ZaloPay return flow
    if (appTransId && pendingOrderData) {
      if (!accessToken) return; // wait for token
      setLoading(true);
      zalopayApi
        .queryStatus(accessToken, appTransId)
        .then(async (statusRes) => {
          if (statusRes.success && statusRes.data?.return_code === 1) {
            const orderPayload = {
              ...pendingOrderData,
              zalopay_app_trans_id: appTransId,
              zalopay_zp_trans_id:
                statusRes.data?.zp_trans_id ||
                statusRes.data?.zpTransId ||
                undefined,
              zalopay_amount: statusRes.data?.amount
                ? Number(statusRes.data.amount)
                : undefined,
            };
            const res = await orderApi.createOrder(accessToken, orderPayload);
            if (res.success) {
              toast.success("Thanh toán ZaloPay thành công!");
              await updateFlashSaleSoldCounts();
              await removeCheckedOutItems();
              clearTempPaymentData();
              navigate("/my-account/orders");
            } else {
              toast.error("Thanh toán thành công nhưng lưu đơn thất bại!");
            }
          } else {
            toast.error("Thanh toán ZaloPay thất bại!");
            clearTempPaymentData();
          }
          setLoading(false);
        })
        .catch(() => {
          toast.error("Có lỗi xảy ra khi xử lý thanh toán!");
          clearTempPaymentData();
          setLoading(false);
        });
    }
  }, [location, navigate, accessToken]);

  const handleVoucherApplyFromModal = async (selection) => {
    if (!accessToken) {
      toast.error("Vui lòng đăng nhập");
      return;
    }

    setShowVoucherModal(false);
    const freeship = selection?.freeship ?? null;
    const discount = selection?.discount ?? null;

    setSelectedFreeship(freeship);
    setSelectedDiscount(discount);
    setVoucherPreviewDiscount(null);

    if (!discount || !discount.code) return;

    setApplyingVoucher(true);
    try {
      const res = await voucherApi.apply(
        accessToken,
        discount.code,
        subtotal,
        shippingFee
      );
      const payload = res || {};
      setVoucherPreviewDiscount({
        discount: payload.discount ?? payload.data?.discount ?? 0,
        finalAmount: payload.finalAmount ?? payload.data?.finalAmount ?? null,
      });
      toast.success("Áp dụng voucher thành công!");
    } catch (err) {
      console.error("Apply discount voucher failed", err);
      toast.error(
        err?.response?.data?.message || "Áp dụng voucher giảm giá thất bại"
      );
      setSelectedDiscount(null);
      setVoucherPreviewDiscount(null);
    } finally {
      setApplyingVoucher(false);
    }
  };

  const handlePayNow = async () => {
    if (!selectedAddress) {
      toast.error("Vui lòng chọn địa chỉ giao hàng");
      return;
    }
    if (!paymentMethod) {
      toast.error("Vui lòng chọn phương thức thanh toán");
      return;
    }
    if (selectedItemsCount === 0) {
      toast.error("Không có sản phẩm nào để thanh toán");
      return;
    }

    try {
      if (!selectedBranch || !selectedBranch._id) {
        toast.error("Vui lòng chọn chi nhánh gần bạn trước khi thanh toán");
        return;
      }

      // Kiểm tra lại availability trước khi thanh toán
      const dishIds = cartItems
        .map((item) => item.dish_id?._id || item.product_id?._id || item._id)
        .filter(Boolean);

      if (dishIds.length > 0) {
        try {
          const availabilityResponse = await branchApi.checkDishesAvailability(
            selectedBranch._id,
            dishIds
          );

          const unavailable = availabilityResponse.unavailableDishes || [];

          if (unavailable.length > 0) {
            // Tìm các item không có sẵn từ cartItems
            const unavailableCartItems = cartItems.filter((item) => {
              const itemDishId =
                item.dish_id?._id || item.product_id?._id || item._id;
              return unavailable.some((unavailableDish) => {
                // API trả về dish object với _id
                const unavailableDishId =
                  unavailableDish._id || unavailableDish.dishId;
                return unavailableDishId === itemDishId;
              });
            });

            console.log("Unavailable items found:", unavailableCartItems);
            setUnavailableItems(unavailableCartItems);
            setShowUnavailableModal(true);
            return; // Dừng thanh toán
          }
        } catch (error) {
          console.error("Error checking dish availability:", error);
          toast.error(
            "Không thể kiểm tra tình trạng món ăn. Vui lòng thử lại!"
          );
          return;
        }
      }

      const orderData = {
        items: cartItems.map((item) => {
          // Xử lý cả cart items thường và items từ "Mua lại"/"Mua ngay"
          const dish = item.dish_id || item.product_id || {};
          const dishId = dish._id;

          // Check Flash Sale info
          const flashSaleInfo = item.flashSale || null;
          const hasFlashSale = flashSaleInfo && flashSaleInfo.remaining > 0;
          const flashSaleId = hasFlashSale ? item.flashSaleId : null;

          // Priority: Flash Sale price > Sale price > Regular price
          const price = hasFlashSale
            ? flashSaleInfo.salePrice
            : dish.sale_price || dish.price || 0;

          return {
            dish_id: dishId,
            quantity: item.quantity,
            flashSaleId: flashSaleId, // Include flashSaleId for server validation
            // Lưu thêm thông tin để phục hồi hiển thị sau khi quay lại từ cổng thanh toán
            name: dish.name || dish.dish_name || "Sản phẩm",
            imageUrls: dish.imageUrls || dish.images || [],
            price: price,
            sale_price: price,
          };
        }),
        shipping_info: {
          name: selectedAddress.full_name,
          phone: selectedAddress.phone,
          address: getSelectedAddressText(),
          full_name: selectedAddress.full_name,
          street: selectedAddress.street || "",
          full_address: getSelectedAddressText(),
          ward: selectedAddress.ward || {},
          district: selectedAddress.district || {},
          province: selectedAddress.province || {},
          coordinates: selectedAddress.coordinates || {}, // Truyền coordinates để backend lưu
          district_id: selectedAddress.district?.code,
          ward_code:
            selectedAddress.ward?.code != null
              ? String(selectedAddress.ward.code)
              : undefined,
        },
        payment_method: paymentMethod,
        notes: note || "",
        voucherCodes: {
          freeship: selectedFreeship ? selectedFreeship.code : undefined,
          discount: selectedDiscount ? selectedDiscount.code : undefined,
        },
        shipping_fee: defaultShippingFee, // Truyền phí ship đã tính từ frontend
        freeship_value: freeshipAmount,
        discount_value: discountAmount,
        coin_discount: coinDiscount,
        branch_id: selectedBranch._id,
      };

      // Chuẩn bị orderData xong

      if (
        paymentMethod === "vnpay" ||
        paymentMethod === "momo" ||
        paymentMethod === "zalopay"
      ) {
        await createGatewayPayment(paymentMethod, orderData, total);
      } else {
        // COD -> create order directly
        if (!accessToken) {
          toast.error("Vui lòng đăng nhập");
          return;
        }

        setLoading(true);
        try {
          const res = await orderApi.createOrder(accessToken, orderData);
          if (res.success) {
            toast.success("Đặt hàng thành công!");
            await updateFlashSaleSoldCounts(); // Cập nhật Flash Sale sold count
            await removeCheckedOutItems();
            navigate("/my-account/orders");
          } else {
            toast.error("Đặt hàng thất bại: " + res.message);
          }
        } catch (error) {
          console.error("COD order error:", error);
          toast.error("Đặt hàng thất bại: " + error.message);
        } finally {
          setLoading(false);
        }
      }
    } catch (err) {
      console.error("Create order error:", err);
      toast.error("Đặt hàng thất bại: " + err.message);
      setLoading(false);
    }
  };

  return (
    <div>
      {loading && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow text-center">
            <div className="animate-spin border-4 border-green-600 border-t-transparent rounded-full w-10 h-10 mx-auto"></div>
            <p className="mt-3 text-gray-700 font-medium">
              Đang xử lý thanh toán...
            </p>
          </div>
        </div>
      )}

      <div>
        {/*     Header with item count */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Sản phẩm đã chọn</h3>
          <span className="text-sm text-gray-600 bg-green-50 px-3 py-1 rounded-full">
            {selectedItemsCount} sản phẩm
          </span>
        </div>

        <div className="overflow-y-auto max-h-[500px] shadow rounded-xl bg-white custom-scrollbar">
          <table className="w-full text-sm text-left">
            <thead className="bg-green-600 sticky top-0">
              <tr>
                <th className="py-3 px-4 text-white">Sản phẩm</th>
                <th className="py-3 px-4 text-white">Số lượng</th>
                <th className="py-3 px-6 text-right text-white">Đơn giá</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(cartItems) && cartItems.length > 0 ? (
                cartItems.map((item) => <ItemRow key={item._id} item={item} />)
              ) : (
                <tr>
                  <td
                    colSpan="3"
                    className="py-6 text-center text-gray-500 font-medium"
                  >
                    Chưa có sản phẩm nào được chọn
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Voucher selection */}
        <div
          onClick={() => setShowVoucherModal(true)}
          className="my-5 flex items-center justify-between border rounded-lg px-4 py-4 bg-white shadow-sm cursor-pointer hover:shadow-md transition"
        >
          <div className="flex items-center gap-2">
            <img
              src={assets.promo_code_icon}
              alt="Voucher"
              className="w-6 h-6"
            />
            <span className="font-bold text-sm text-gray-800">
              NHGreen Voucher
            </span>
          </div>
          <div className="flex items-center gap-2">
            {selectedFreeship || selectedDiscount ? (
              <>
                {selectedFreeship && (
                  <span className="px-3 py-1 text-sm font-semibold text-green-700 bg-green-100 rounded-2xl shadow-sm">
                    Miễn phí vận chuyển
                  </span>
                )}
                {selectedDiscount && (
                  <span className="px-3 py-1 text-sm font-semibold text-orange-700 bg-orange-100 rounded-2xl shadow-sm">
                    -
                    {(
                      voucherPreviewDiscount?.discount ??
                      selectedDiscount?.discount ??
                      selectedDiscount?.value ??
                      0
                    ).toLocaleString("vi-VN")}
                    ₫
                  </span>
                )}
              </>
            ) : (
              <span className="px-3 py-1 text-sm font-medium text-gray-600">
                Chọn voucher
              </span>
            )}
          </div>
        </div>

        {/* Price Summary */}
        <div className="space-y-3 text-sm border-t pt-4">
          <div className="flex justify-between">
            <span className="text-gray-600">Tổng tiền hàng</span>
            <span className="font-medium">
              {subtotal.toLocaleString("vi-VN")}₫
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-600">Phí vận chuyển</span>
            <span className="font-medium">
              {defaultShippingFee.toLocaleString("vi-VN")}₫
            </span>
          </div>

          {freeshipAmount > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">Giảm giá phí vận chuyển</span>
              <span className="text-green-600 font-medium">
                -{freeshipAmount.toLocaleString("vi-VN")}₫
              </span>
            </div>
          )}

          {discountAmount > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">Voucher giảm giá</span>
              <span className="text-orange-600 font-medium">
                -{discountAmount.toLocaleString("vi-VN")}₫
              </span>
            </div>
          )}

          {/* Coin Usage Switch */}
          <div className="flex justify-between items-center py-3 border-t">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" fill="#FFD700" />
                <circle cx="12" cy="12" r="8" fill="#FFA500" opacity="0.5" />
                <text
                  x="12"
                  y="16"
                  fontSize="12"
                  fontWeight="bold"
                  textAnchor="middle"
                  fill="#B8860B"
                >
                  ₫
                </text>
              </svg>
              <span className="text-gray-600">
                Sử dụng xu ({userCoin.toLocaleString("vi-VN")})
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={useCoin}
                onChange={(e) => setUseCoin(e.target.checked)}
                disabled={userCoin === 0 || beforeCoinTotal === 0}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-yellow-400 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
            </label>
          </div>

          {coinDiscount > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">Giảm giá từ xu</span>
              <span className="text-yellow-600 font-medium">
                -{coinDiscount.toLocaleString("vi-VN")}₫
              </span>
            </div>
          )}

          {/* Note Section */}
          <div className="pt-3 border-t">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ghi chú đơn hàng
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength="500"
              rows="3"
              placeholder="Nhập ghi chú cho đơn hàng (tùy chọn)"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              {note.length}/500 ký tự
            </p>
          </div>

          <div className="flex justify-between font-semibold text-lg pt-3 border-t">
            <span>Tổng thanh toán</span>
            <span className="text-green-700">
              {total.toLocaleString("vi-VN")}₫
            </span>
          </div>
        </div>
      </div>

      {/* Terms */}
      <div className="mt-6">
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="w-4 h-4 accent-green-600 focus:ring-0 cursor-pointer"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
          />
          <span className="ml-2 text-sm text-gray-600">
            Tôi đã đọc và đồng ý với Điều khoản và Chính sách.
          </span>
        </label>
      </div>

      {/* Pay Now */}
      <div className="flex justify-center mt-10">
        <button
          type="submit"
          onClick={handlePayNow}
          disabled={!termsAccepted || loading || selectedItemsCount === 0}
          className={`w-3/4 font-bold text-white py-3 rounded-xl transition ${
            termsAccepted && selectedItemsCount > 0
              ? "bg-green-600 hover:bg-green-700 active:scale-95"
              : "bg-gray-400 cursor-not-allowed"
          }`}
        >
          {loading
            ? "Đang xử lý..."
            : `Thanh toán ${selectedItemsCount} sản phẩm`}
        </button>
      </div>

      {/* Voucher Modal */}
      <VoucherModal
        isOpen={showVoucherModal}
        onClose={() => setShowVoucherModal(false)}
        onApply={handleVoucherApplyFromModal}
        options={{ active: "true", limit: 100 }}
        subtotal={subtotal}
      />

      {/* Unavailable Items Modal */}
      <UnavailableItemsModal
        isOpen={showUnavailableModal}
        onClose={() => {
          setShowUnavailableModal(false);
          setUnavailableItems([]);
        }}
        unavailableItems={unavailableItems}
        onRemoveItems={async () => {
          // Xóa các món không có sẵn khỏi giỏ hàng
          const itemIdsToRemove = unavailableItems
            .filter((item) => !item._id.startsWith("temp-"))
            .map((item) => item._id);

          if (itemIdsToRemove.length > 0) {
            await removeMultipleItems(itemIdsToRemove);
          }

          setShowUnavailableModal(false);
          setUnavailableItems([]);

          // Chuyển về trang giỏ hàng
          window.location.href = "/my-cart";
        }}
        onChangeBranch={() => {
          setShowUnavailableModal(false);
          setUnavailableItems([]);
          // Scroll lên phần chọn chi nhánh
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />
    </div>
  );
};

export default CheckoutSummary;
