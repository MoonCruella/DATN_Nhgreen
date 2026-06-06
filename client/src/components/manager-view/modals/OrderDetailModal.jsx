import { useEffect, useRef, useState } from "react";
import { CircleUserRound, Info, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import PaymentMethodModal from "./PaymentMethodModal";
import userApi from "@/api/userApi";
import { toast } from "sonner";

const formatCurrency = (value = 0) =>
  new Intl.NumberFormat("vi-VN").format(value || 0);

const getDishPrice = (dish) => dish?.sale_price || dish?.price || 0;

const getDishName = (dish) => dish?.name || dish?.dish_name || "Sản phẩm";

const getDishUnit = (dish) =>
  dish?.unit || dish?.unit_name || dish?.unitName || "Phần";

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
  onCustomerSelected,
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
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerPhone, setCustomerPhone] = useState("");
  const [foundCustomer, setFoundCustomer] = useState(null);
  const [hasSearchedCustomer, setHasSearchedCustomer] = useState(false);
  const [checkingCustomer, setCheckingCustomer] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCreateCustomerForm, setShowCreateCustomerForm] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerProvince, setNewCustomerProvince] = useState("");
  const [newCustomerWard, setNewCustomerWard] = useState("");
  const [newCustomerAddress, setNewCustomerAddress] = useState("");
  const paymentOpenTimerRef = useRef(null);

  useEffect(() => {
    if (!open) {
      setShowPaymentModal(false);
      setOpeningPaymentModal(false);
      setShowCustomerModal(false);
      setCustomerPhone("");
      setFoundCustomer(null);
      setHasSearchedCustomer(false);
      setSelectedCustomer(null);
      setShowCreateCustomerForm(false);
      setNewCustomerName("");
      setNewCustomerProvince("");
      setNewCustomerWard("");
      setNewCustomerAddress("");
    }

    return () => {
      if (paymentOpenTimerRef.current) {
        clearTimeout(paymentOpenTimerRef.current);
        paymentOpenTimerRef.current = null;
      }
    };
  }, [open]);

  useEffect(() => {
    if (!open || selectedCustomer) return;

    const orderCustomer = order?.customer_id;
    if (orderCustomer && typeof orderCustomer === "object") {
      setSelectedCustomer(orderCustomer);
    }
  }, [open, order?.customer_id, selectedCustomer]);

  useEffect(() => {
    const normalizedPhone = customerPhone.replace(/\D/g, "");

    setFoundCustomer(null);
    setHasSearchedCustomer(false);

    if (!showCustomerModal || normalizedPhone.length < 10) {
      setCheckingCustomer(false);
      return undefined;
    }

    const timer = setTimeout(async () => {
      try {
        setCheckingCustomer(true);
        const res = await userApi.getCustomerByPhone(normalizedPhone);
        setFoundCustomer(res?.data?.customer || null);
        setHasSearchedCustomer(true);
      } catch (error) {
        console.error("Find customer by phone error:", error);
        setFoundCustomer(null);
        setHasSearchedCustomer(true);
      } finally {
        setCheckingCustomer(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [customerPhone, showCustomerModal]);

  if (!open) return null;

  const tableName = table?.name || order?.table_info?.name || "Bàn";
  const isPaymentAction = normalizeText(primaryActionLabel).includes("thanh toan");
  const displayItems = isPaymentAction ? paymentItems : items;
  const displayTotalQuantity = isPaymentAction ? paymentTotalQuantity : totalQuantity;
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

    onPrimaryAction?.(undefined, selectedCustomer);
  };

  const handleAddMore = () => {
    setShowPaymentModal(false);
    onAddMore?.();
  };

  const handleConfirmPayment = (paymentMethod) => {
    onPrimaryAction?.(paymentMethod, selectedCustomer);
  };

  const handlePaymentBack = () => {
    setShowPaymentModal(false);
    onClose?.();
  };

  const handleOpenCustomerModal = () => {
    setShowCustomerModal(true);
  };

  const handleCloseCustomerModal = () => {
    setShowCustomerModal(false);
    setShowCreateCustomerForm(false);
  };

  const handleCustomerAction = () => {
    const normalizedPhone = customerPhone.replace(/\D/g, "");

    if (normalizedPhone.length < 10) {
      toast.error("Vui lòng nhập số điện thoại hợp lệ");
      return;
    }

    setNewCustomerName("");
    setNewCustomerProvince("");
    setNewCustomerWard("");
    setNewCustomerAddress("");
    setShowCreateCustomerForm(true);
  };

  const handleSelectFoundCustomer = async () => {
    if (!foundCustomer) return;

    try {
      setSelectedCustomer(foundCustomer);
      await onCustomerSelected?.(foundCustomer);
      setShowCustomerModal(false);
      setShowCreateCustomerForm(false);
      toast.success("Đã chọn khách hàng");
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Không thể lưu khách hàng vào đơn",
      );
    }
  };

  const handleCreateCustomerBack = () => {
    setShowCreateCustomerForm(false);
  };

  const handleCreateCustomerSubmit = async () => {
    if (!newCustomerName.trim()) {
      toast.error("Vui lòng nhập tên khách hàng");
      return;
    }

    try {
      const res = await userApi.createManagerDineInCustomer({
        name: newCustomerName.trim(),
        phone: customerPhone,
        address: {
          province: newCustomerProvince,
          ward: newCustomerWard,
          detail: newCustomerAddress,
        },
      });
      const newCustomer = res?.data?.customer;

      setSelectedCustomer(newCustomer);
      await onCustomerSelected?.(newCustomer);
      setFoundCustomer(newCustomer);
      setShowCreateCustomerForm(false);
      setShowCustomerModal(false);
      toast.success("Đã thêm khách hàng vào đơn");
    } catch (error) {
      console.error("Create dine-in customer error:", error);
      toast.error(
        error?.response?.data?.message || "Không thể tạo khách hàng tại quán"
      );
    }
  };

  const canCreateCustomer =
    newCustomerName.trim() && customerPhone.replace(/\D/g, "").length >= 10;

  return (
    <>
      {!showPaymentModal && (
        <div
          className={`fixed inset-0 z-[70] flex items-center justify-center bg-black/40 px-6 py-5 transition-opacity duration-300 ${
            openingPaymentModal ? "pointer-events-none opacity-0" : "opacity-100"
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
              <div className="grid grid-cols-[80px_1.5fr_1fr_1fr_1fr_1fr] gap-x-6 px-2 text-lg font-bold text-black">
                <div>STT</div>
                <div>Tên sản phẩm</div>
                <div className="text-center">Đơn vị</div>
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
                        className="grid grid-cols-[80px_1.5fr_1fr_1fr_1fr_1fr] gap-x-6 px-2 text-lg font-medium text-slate-950"
                      >
                        <div>{index + 1}</div>
                        <div>{getDishName(item)}</div>
                        <div className="text-center">{getDishUnit(item)}</div>
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

              <div className="mt-8 flex items-center justify-between px-2">
                <span className="text-lg font-medium text-gray-500">
                  Khách hàng
                </span>
                <Button
                  type="button"
                  onClick={handleOpenCustomerModal}
                  className="h-12 rounded-full bg-[#34ad54] px-7 text-lg font-bold text-white hover:bg-[#2f9b45]"
                >
                  <UserPlus className="mr-2 h-5 w-5" />
                  {selectedCustomer?.name || "Thêm khách hàng"}
                </Button>
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
                        onClick={() => onSecondaryAction?.(selectedCustomer)}
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

      {showCustomerModal && !showPaymentModal && !showCreateCustomerForm && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-[520px] rounded-[16px] bg-white px-8 py-8 shadow-2xl">
            <h3 className="mb-8 text-center text-xl font-black text-black">
              Nhập thông tin khách hàng
            </h3>

            <label className="mb-3 block text-lg font-black text-black">
              Số điện thoại
            </label>
            <input
              value={customerPhone}
              onChange={(event) => setCustomerPhone(event.target.value)}
              placeholder="Nhập số điện thoại"
              className="h-14 w-full border border-gray-200 px-6 text-lg font-medium text-black outline-none placeholder:text-gray-400 focus:border-green-500"
            />

            {checkingCustomer && (
              <div className="mt-6 text-center text-base font-semibold text-gray-500">
                Đang kiểm tra khách hàng...
              </div>
            )}

            {!checkingCustomer && hasSearchedCustomer && !foundCustomer && (
              <div className="mt-6 text-center">
                <div className="mx-auto mb-4 flex h-8 w-8 items-center justify-center rounded-full bg-gray-400 text-white">
                  <Info className="h-5 w-5" />
                </div>
                <p className="mx-auto max-w-[400px] text-lg leading-snug text-gray-500">
                  Số điện thoại{" "}
                  <span className="font-black text-black">"{customerPhone}"</span>{" "}
                  chưa được sử dụng.
                  <br />
                  Chọn{" "}
                  <span className="font-black text-black">"Tạo khách hàng"</span>{" "}
                  để thêm số điện thoại này.
                </p>
              </div>
            )}

            {!checkingCustomer && foundCustomer && (
              <div className="mt-6">
                <h4 className="mb-5 text-lg font-black text-black">
                  Thông tin khách hàng
                </h4>
                <button
                  type="button"
                  onClick={handleSelectFoundCustomer}
                  className="flex w-full items-center gap-5 rounded-2xl p-3 text-left transition hover:bg-gray-50"
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
                    <CircleUserRound className="h-10 w-10" />
                  </div>
                  <div>
                    <div className="text-xl font-black uppercase text-black">
                      {foundCustomer.name}
                    </div>
                    <div className="mt-1 text-lg font-medium text-black">
                      Khách hàng
                    </div>
                  </div>
                </button>
              </div>
            )}

            <div className="mt-8 grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseCustomerModal}
                className="h-12 rounded-lg border-green-500 text-base font-black text-green-600 hover:bg-green-50 hover:text-green-700"
              >
                Quay lại
              </Button>
              <Button
                type="button"
                onClick={handleCustomerAction}
                className="h-12 rounded-lg bg-[#34ad54] text-base font-black text-white hover:bg-[#2f9b45]"
              >
                Tạo khách hàng
              </Button>
            </div>
          </div>
        </div>
      )}

      {showCustomerModal && !showPaymentModal && showCreateCustomerForm && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-[560px] rounded-[16px] bg-white px-8 py-8 shadow-2xl">
            <h3 className="mb-8 text-center text-xl font-black text-black">
              Tạo khách hàng mới
            </h3>

            <div className="space-y-6">
              <div>
                <label className="mb-3 block text-lg font-black text-black">
                  Tên khách hàng<span className="text-red-500">*</span>
                </label>
                <input
                  value={newCustomerName}
                  onChange={(event) => setNewCustomerName(event.target.value)}
                  placeholder="Nhập tên khách hàng"
                  className="h-14 w-full rounded-xl border border-gray-200 px-6 text-lg font-medium text-black outline-none placeholder:text-gray-400 focus:border-green-500"
                />
              </div>

              <div>
                <label className="mb-3 block text-lg font-black text-black">
                  Số điện thoại<span className="text-red-500">*</span>
                </label>
                <input
                  value={customerPhone}
                  onChange={(event) => setCustomerPhone(event.target.value)}
                  className="h-14 w-full rounded-xl border border-gray-200 px-6 text-lg font-medium text-black outline-none focus:border-green-500"
                />
              </div>

              <div>
                <label className="mb-3 block text-lg font-black text-black">
                  Địa chỉ
                </label>
                <select
                  value={newCustomerProvince}
                  onChange={(event) => setNewCustomerProvince(event.target.value)}
                  className="mb-3 h-14 w-full rounded-xl border border-gray-200 bg-white px-6 text-lg font-medium text-slate-700 outline-none focus:border-green-500"
                >
                  <option value="">Tỉnh/Thành phố</option>
                  <option value="Sơn La">Sơn La</option>
                  <option value="Hà Nội">Hà Nội</option>
                  <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
                </select>
                <select
                  value={newCustomerWard}
                  onChange={(event) => setNewCustomerWard(event.target.value)}
                  className="mb-3 h-14 w-full rounded-xl border border-gray-200 bg-white px-6 text-lg font-medium text-slate-700 outline-none focus:border-green-500"
                >
                  <option value="">Phường/Xã</option>
                  <option value="Phường Chiềng Lề">Phường Chiềng Lề</option>
                  <option value="Phường Quyết Thắng">Phường Quyết Thắng</option>
                  <option value="Xã Chiềng Ngần">Xã Chiềng Ngần</option>
                </select>
                <input
                  value={newCustomerAddress}
                  onChange={(event) => setNewCustomerAddress(event.target.value)}
                  placeholder="Địa chỉ cụ thể"
                  className="h-14 w-full rounded-xl border border-gray-200 px-6 text-lg font-medium text-black outline-none placeholder:text-gray-400 focus:border-green-500"
                />
              </div>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleCreateCustomerBack}
                className="h-12 rounded-lg border-green-500 text-base font-black text-green-600 hover:bg-green-50 hover:text-green-700"
              >
                Quay lại
              </Button>
              <Button
                type="button"
                onClick={handleCreateCustomerSubmit}
                disabled={!canCreateCustomer}
                className="h-12 rounded-lg bg-[#34ad54] text-base font-black text-white hover:bg-[#2f9b45] disabled:bg-[#bbf7d0] disabled:hover:bg-[#bbf7d0]"
              >
                Tạo khách hàng
              </Button>
            </div>
          </div>
        </div>
      )}

      <PaymentMethodModal
        open={showPaymentModal}
        table={table}
        order={order}
        selectedCustomer={selectedCustomer}
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


