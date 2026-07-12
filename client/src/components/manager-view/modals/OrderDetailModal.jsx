import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import PaymentMethodModal from "./PaymentMethodModal";

const formatCurrency = (value = 0) =>
  new Intl.NumberFormat("vi-VN").format(value || 0);

const getDishPrice = (dish) => dish?.sale_price || dish?.price || 0;

const getDishName = (dish) => dish?.name || dish?.dish_name || "Sản phẩm";


const normalizeText = (value = "") =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const OrderDetailModal = ({
  open,
  table,
  order,
  items = [],
  paymentItems = items,
  totalQuantity = 0,
  totalAmount = 0,
  paymentTotalQuantity = totalQuantity,
  paymentTotalAmount = totalAmount,
  primaryActionLabel = "Thanh toán",
  secondaryActionLabel = "",
  onClose,
  onAddMore,
  onPrimaryAction,
  onSecondaryAction,
  momoPaymentUrl = "",
  momoQrUrl = "",
  momoQrCreatedAt = null,
  momoLoading = false,
  momoError = "",
  onRequestMomoPayment,
  zalopayPaymentUrl = "",
  zalopayQrUrl = "",
  zalopayQrCreatedAt = null,
  zalopayLoading = false,
  zalopayError = "",
  onRequestZalopayPayment,
  vnpayPaymentUrl = "",
  vnpayLoading = false,
  vnpayError = "",
  onRequestVnpayPayment,
}) => {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [openingPaymentModal, setOpeningPaymentModal] = useState(false);
  const paymentOpenTimerRef = useRef(null);

  useEffect(() => {
    if (!open) {
      setShowPaymentModal(false);
      setOpeningPaymentModal(false);
    }

    return () => {
      if (paymentOpenTimerRef.current) {
        clearTimeout(paymentOpenTimerRef.current);
        paymentOpenTimerRef.current = null;
      }
    };
  }, [open]);

  if (!open) return null;

  const tableName = table?.name || order?.table_info?.name || "Bàn";
  const isPaymentAction =
    normalizeText(primaryActionLabel).includes("thanh toan");
  const displayItems = isPaymentAction ? paymentItems : items;
  const displayTotalQuantity = isPaymentAction
    ? paymentTotalQuantity
    : totalQuantity;
  const displayTotalAmount = isPaymentAction ? paymentTotalAmount : totalAmount;

  const handlePrimaryAction = () => {
    if (isPaymentAction) {
      if (openingPaymentModal) return;
      setOpeningPaymentModal(true);
      paymentOpenTimerRef.current = setTimeout(() => {
        setShowPaymentModal(true);
        setOpeningPaymentModal(false);
        paymentOpenTimerRef.current = null;
      }, 350);
      return;
    }

    onPrimaryAction?.();
  };

  const handleAddMore = () => {
    setShowPaymentModal(false);
    onAddMore?.();
  };

  const handleConfirmPayment = (paymentMethod) => {
    onPrimaryAction?.(paymentMethod);
  };

  const handlePaymentBack = () => {
    setShowPaymentModal(false);
    onClose?.();
  };

  return (
    <>
      {!showPaymentModal && (
        <div
          className={`fixed inset-0 z-[70] flex items-center justify-center bg-black/40 px-6 py-5 transition-opacity duration-300 ${
            openingPaymentModal
              ? "pointer-events-none opacity-0"
              : "opacity-100"
          }`}
        >
          <div
            className={`relative flex max-h-full w-full max-w-[1180px] flex-col rounded-[20px] bg-white px-12 py-10 shadow-xl transition-all duration-300 ${
              openingPaymentModal
                ? "translate-y-2 scale-[0.98] opacity-0"
                : "translate-y-0 scale-100 opacity-100"
            }`}
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute right-6 top-6 rounded-md p-1 text-slate-900 hover:bg-gray-100"
              title="Đóng"
            >
              <X className="h-7 w-7" />
            </button>

            <h2 className="mb-8 text-center text-2xl font-bold text-black">
              <span className="text-[#34ad54]">({displayTotalQuantity})</span>{" "}
              {tableName}
            </h2>

            <div className="min-h-0 flex-1">
              <div className="grid grid-cols-[80px_1.8fr_1fr_1fr_1fr] gap-x-6 px-2 text-lg font-bold text-black">
                <div>STT</div>
                <div>Tên sản phẩm</div>
                <div className="text-center">Số lượng</div>
                <div className="text-right">Đơn giá</div>
                <div className="text-right">Thành tiền</div>
              </div>

              <div className="mt-7 max-h-[260px] space-y-8 overflow-y-auto pr-2">
                {displayItems.length > 0 ? (
                  displayItems.map((item, index) => {
                    const price = getDishPrice(item);

                    return (
                      <div
                        key={item._id || index}
                        className="grid grid-cols-[80px_1.8fr_1fr_1fr_1fr] gap-x-6 px-2 text-lg font-medium text-slate-950"
                      >
                        <div>{index + 1}</div>
                        <div>{getDishName(item)}</div>

                        <div className="text-center">{item.quantity}</div>
                        <div className="text-right">
                          {formatCurrency(price)} VND
                        </div>
                        <div className="text-right">
                          {formatCurrency(price * item.quantity)} VND
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-10 text-center text-lg font-medium text-gray-500">
                    Chưa chọn món
                  </div>
                )}
              </div>

              <div className="mt-12 border-t border-dashed border-gray-200 pt-5">
                <div className="flex items-center justify-between px-2 text-lg font-bold">
                  <span className="text-gray-500">Thành tiền</span>
                  <span className="text-slate-950">
                    {formatCurrency(displayTotalAmount)} VND
                  </span>
                </div>
              </div>

              <div className="mt-8 border-t border-gray-200 pt-6">
                <div className="mb-6 flex items-center justify-between">
                  <span className="text-lg font-bold text-black">
                    Tổng thanh toán (đã bao gồm VAT)
                  </span>
                  <span className="text-3xl font-bold text-black">
                    {formatCurrency(displayTotalAmount)} VND
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddMore}
                    className="h-14 rounded-lg border-green-500 text-lg font-bold text-green-600 hover:bg-green-50 hover:text-green-700"
                  >
                    Thêm món
                  </Button>
                  <div className="grid grid-cols-2 gap-3">
                    {secondaryActionLabel && (
                      <Button
                        type="button"
                        onClick={() => onSecondaryAction?.()}
                        disabled={totalQuantity === 0}
                        className="h-14 rounded-lg bg-sky-600 text-lg font-bold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-200"
                      >
                        {secondaryActionLabel}
                      </Button>
                    )}
                    <Button
                      type="button"
                      onClick={handlePrimaryAction}
                      disabled={
                        openingPaymentModal ||
                        (isPaymentAction
                          ? paymentTotalQuantity === 0
                          : totalQuantity === 0)
                      }
                      className={`h-14 rounded-lg bg-[#34ad54] text-lg font-bold text-white hover:bg-[#2f9b45] disabled:cursor-not-allowed disabled:bg-[#bbf7d0] disabled:hover:bg-[#bbf7d0] ${
                        secondaryActionLabel ? "" : "col-span-2"
                      }`}
                    >
                      {openingPaymentModal
                        ? "Đang mở thanh toán..."
                        : primaryActionLabel}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <PaymentMethodModal
        open={showPaymentModal}
        table={table}
        order={order}
        items={paymentItems}
        totalQuantity={paymentTotalQuantity}
        totalAmount={paymentTotalAmount}
        onBack={handlePaymentBack}
        onConfirm={handleConfirmPayment}
        momoPaymentUrl={momoPaymentUrl}
        momoQrUrl={momoQrUrl}
        momoQrCreatedAt={momoQrCreatedAt}
        momoLoading={momoLoading}
        momoError={momoError}
        onRequestMomoPayment={onRequestMomoPayment}
        zalopayPaymentUrl={zalopayPaymentUrl}
        zalopayQrUrl={zalopayQrUrl}
        zalopayQrCreatedAt={zalopayQrCreatedAt}
        zalopayLoading={zalopayLoading}
        zalopayError={zalopayError}
        onRequestZalopayPayment={onRequestZalopayPayment}
        vnpayPaymentUrl={vnpayPaymentUrl}
        vnpayLoading={vnpayLoading}
        vnpayError={vnpayError}
        onRequestVnpayPayment={onRequestVnpayPayment}
      />
    </>
  );
};

export default OrderDetailModal;
