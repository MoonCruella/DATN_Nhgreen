import React, { useEffect, useState } from "react";
import CheckoutSummary from "@/components/customer-view/checkout/CheckoutSummary";
import CheckoutInfo from "@/components/customer-view/checkout/CheckoutInfo";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { assets } from "@/assets/assets";
import { useCartContext } from "@/context/CartContext";
import { useAddressContext } from "@/context/AddressContext";
import { toast } from "sonner";

const CustomerCheckout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedAddress, paymentMethod } = useAddressContext();
  const { items: allCartItems = [], getSelectedItems } = useCartContext();

  // Lấy selected items từ navigation state hoặc context
  const [selectedItems, setSelectedItems] = useState([]);
  const [shouldCheckEmpty, setShouldCheckEmpty] = useState(true);

  useEffect(() => {
    const query = new URLSearchParams(location.search);

    // Nếu quay về từ gateway (VNPay / ZaloPay) — không redirect về cart ngay
    // (CheckoutSummary sẽ xử lý callback và lưu đơn / xoá giỏ hàng)
    if (
      query.get("success") !== null ||
      query.get("apptransid") !== null ||
      query.get("orderId") !== null
    ) {
      setShouldCheckEmpty(false); // Không check empty khi quay về từ gateway
      // Quay về từ VNPay / ZaloPay
      const pendingIds = JSON.parse(
        localStorage.getItem("pendingCartItems") || "[]"
      );
      let restored = [];
      if (
        Array.isArray(pendingIds) &&
        pendingIds.length > 0 &&
        Array.isArray(allCartItems) &&
        allCartItems.length > 0
      ) {
        const pendingItems = allCartItems.filter((it) =>
          pendingIds.includes(it._id)
        );
        if (pendingItems.length > 0) {
          restored = pendingItems;
        }
      }
      // Nếu không khớp được với cart hiện tại (direct buy / mua lại đã xoá khỏi context) -> phục hồi từ pendingOrderData
      if (restored.length === 0) {
        const pendingOrderData = JSON.parse(
          localStorage.getItem("pendingOrderData") || "null"
        );
        if (pendingOrderData?.items && Array.isArray(pendingOrderData.items)) {
          restored = pendingOrderData.items.map((it, idx) => ({
            _id: `virtual-${it.dish_id}-${idx}`,
            quantity: it.quantity,
            dish_id: {
              _id: it.dish_id,
              name: it.name || "Sản phẩm",
              imageUrls: it.imageUrls || [],
              price: it.sale_price || it.price || 0,
              sale_price: it.sale_price || it.price || 0,
            },
          }));
        }
      }
      if (restored.length > 0) {
        setSelectedItems(restored);
      }
      // Không redirect; CheckoutSummary sẽ xử lý callback.
      return;
    }

    // 0) Kiểm tra xem có phải "Mua lại" không (từ order history)
    const fromReorder = location.state?.fromReorder;
    if (fromReorder && location.state?.items) {
      console.log("✅ CusCheckout - Reorder items:", location.state.items);
      setSelectedItems(location.state.items);
      setShouldCheckEmpty(false);
      return;
    }

    // 1) Kiểm tra xem có phải "Mua ngay" không
    const directBuyItem = location.state?.directBuyItem;
    const fromProductDetail = location.state?.fromProductDetail;

    if (fromProductDetail) {
      // Kiểm tra xem có nhiều items hay chỉ 1 item (từ "Mua ngay")
      const navSelected = location.state?.selectedItems;
      if (Array.isArray(navSelected) && navSelected.length > 0) {
        // Nhiều items
        setSelectedItems(navSelected);
        setShouldCheckEmpty(false);
        return;
      } else if (directBuyItem) {
        // 1 item từ "Mua ngay"
        setSelectedItems([directBuyItem]);
        setShouldCheckEmpty(false);
        return;
      }
    }

    // 2) ưu tiên items được truyền khi navigate từ Cart
    const navSelected = location.state?.selectedItems;
    if (Array.isArray(navSelected) && navSelected.length > 0) {
      console.log("✅ CusCheckout - Received selected items from Cart:", {
        count: navSelected.length,
        ids: navSelected.map((i) => i._id),
      });
      setSelectedItems(navSelected);
      setShouldCheckEmpty(false);
      return;
    }

    // 3) dùng selected items từ CartContext (nếu có)
    const ctxSelected =
      typeof getSelectedItems === "function" ? getSelectedItems() : [];
    if (Array.isArray(ctxSelected) && ctxSelected.length > 0) {
      setSelectedItems(ctxSelected);
      setShouldCheckEmpty(false);
      return;
    }

    // 4) fallback: nếu trong cart còn items -> dùng toàn bộ cart
    if (Array.isArray(allCartItems) && allCartItems.length > 0) {
      setSelectedItems(allCartItems);
      setShouldCheckEmpty(false);
      return;
    }

    // 5) Không tìm thấy items nào và cần check empty
    // Điều này chỉ xảy ra khi user truy cập trực tiếp /checkout mà không có items
    if (shouldCheckEmpty) {
      console.log("⚠️ No items found, redirecting to cart");
      toast.error("Vui lòng chọn sản phẩm trước khi thanh toán");
      navigate("/my-cart");
    }
  }, [location, allCartItems, getSelectedItems, navigate, shouldCheckEmpty]);

  //Calculate subtotal from selected items only
  const subtotal = Array.isArray(selectedItems)
    ? selectedItems.reduce((total, item) => {
        const dish = item.dish_id || item.product_id;

        // Check Flash Sale info
        const flashSaleInfo = item.flashSale || null;
        const hasFlashSale = flashSaleInfo && flashSaleInfo.remaining > 0;

        // Priority: Flash Sale price > Sale price > Regular price
        const price = hasFlashSale
          ? Number(flashSaleInfo.salePrice) || 0
          : Number(dish?.sale_price || dish?.price) || 0;

        const quantity = Number(item.quantity) || 0;
        return total + price * quantity;
      }, 0)
    : 0;

  // Show loading if no items yet
  const gatewayReturn = (() => {
    const q = new URLSearchParams(location.search);
    return (
      q.get("success") !== null ||
      q.get("apptransid") !== null ||
      q.get("orderId") !== null
    );
  })();

  // Nếu quay về từ gateway nhưng chưa phục hồi được items, vẫn hiển thị trang để CheckoutSummary xử lý callback.

  if (selectedItems.length === 0 && !gatewayReturn) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải thông tin đơn hàng...</p>
        </div>
      </div>
    );
  }

  // Trường hợp gatewayReturn và selectedItems rỗng -> vẫn render CheckoutSummary với mảng rỗng (Summary sẽ tự xử lý callback & tạo đơn)
  return (
    <main className="bg-gray-50 min-h-screen">
      <div className="bg-white border-b border-gray-200 py-3">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between">
            <Link
              to="/my-cart"
              className="text-sm text-green-600 hover:text-green-700 font-medium"
            >
              ← Quay lại giỏ hàng
            </Link>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 flex justify-center py-10">
        <div className="w-full max-w-7xl flex flex-col md:flex-row gap-5 px-4">
          {/* Form bên trái */}
          <div className="flex-1 border rounded-2xl shadow bg-white p-6">
            <CheckoutInfo cartItems={selectedItems} />
          </div>

          {/* Cart bên phải */}
          <div className="flex-1 border rounded-2xl shadow bg-white p-6">
            <CheckoutSummary
              cartItems={selectedItems}
              subtotal={subtotal}
              selectedAddress={selectedAddress}
              paymentMethod={paymentMethod}
            />
            {selectedItems.length === 0 && gatewayReturn && (
              <p className="mt-4 text-sm text-gray-500">
                Đang xử lý kết quả thanh toán... Vui lòng đợi trong giây lát.
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
};

export default CustomerCheckout;
