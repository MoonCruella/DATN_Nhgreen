import { useEffect, useState } from "react";
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
  totalQuantity = 0,
  totalAmount = 0,
  primaryActionLabel = "Thanh toán",
  onClose,
  onAddMore,
  onPrimaryAction,
}) => {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
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

  useEffect(() => {
    if (!open) {
      setShowPaymentModal(false);
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
  }, [open]);

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

  const handlePrimaryAction = () => {
    if (isPaymentAction) {
      setShowPaymentModal(true);
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

  const handleSelectFoundCustomer = () => {
    if (!foundCustomer) return;

    setSelectedCustomer(foundCustomer);
    setShowCustomerModal(false);
    setShowCreateCustomerForm(false);
    toast.success("Đã chọn khách hàng");
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
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 px-6 py-5">
          <div className="relative flex max-h-full w-full max-w-[1180px] flex-col rounded-[20px] bg-white px-12 py-10 shadow-xl">
            <button
              type="button"
              onClick={onClose}
              className="absolute right-6 top-6 rounded-md p-1 text-slate-900 hover:bg-gray-100"
              title="Đóng"
            >
              <X className="h-7 w-7" />
            </button>

            <h2 className="mb-12 text-center text-2xl font-bold text-black">
              <span className="text-[#26338d]">({totalQuantity})</span>{" "}
              {tableName}
            </h2>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="grid grid-cols-[80px_1.5fr_1fr_1fr_1fr_1fr] gap-x-6 px-2 text-lg font-bold text-black">
                <div>STT</div>
                <div>Tên sản phẩm</div>
                <div className="text-center">Đơn vị</div>
                <div className="text-center">Số lượng</div>
                <div className="text-right">Đơn giá</div>
                <div className="text-right">Thành tiền</div>
              </div>

              <div className="mt-7 max-h-[210px] space-y-8 overflow-y-auto pr-2">
                {items.length > 0 ? (
                  items.map((item, index) => {
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
                    {formatCurrency(totalAmount)} VND
                  </span>
                </div>
              </div>

              <div className="mt-12 flex items-center justify-between px-2">
                <span className="text-lg font-medium text-gray-500">
                  Khách hàng
                </span>
                <Button
                  type="button"
                  onClick={handleOpenCustomerModal}
                  className="h-12 rounded-full bg-[#26338d] px-7 text-lg font-bold text-white hover:bg-[#1d2874]"
                >
                  <UserPlus className="mr-2 h-5 w-5" />
                  {selectedCustomer?.name || "Thêm khách hàng"}
                </Button>
              </div>

              <div className="mt-10 border-t border-gray-200 pt-8">
                <div className="mb-6 flex items-center justify-between">
                  <span className="text-lg font-bold text-black">
                    Tổng thanh toán (đã bao gồm VAT)
                  </span>
                  <span className="text-3xl font-bold text-black">
                    {formatCurrency(totalAmount)} VND
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddMore}
                    className="h-14 rounded-lg border-cyan-400 text-lg font-bold text-cyan-500 hover:bg-cyan-50 hover:text-cyan-600"
                  >
                    Thêm món
                  </Button>
                  <Button
                    type="button"
                    onClick={handlePrimaryAction}
                    disabled={totalQuantity === 0}
                    className="h-14 rounded-lg bg-[#26338d] text-lg font-bold text-white hover:bg-[#1d2874] disabled:cursor-not-allowed disabled:bg-[#a8afd0] disabled:hover:bg-[#a8afd0]"
                  >
                    {primaryActionLabel}
                  </Button>
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
              className="h-14 w-full border border-gray-200 px-6 text-lg font-medium text-black outline-none placeholder:text-gray-400 focus:border-cyan-400"
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
                className="h-12 rounded-lg border-cyan-400 text-base font-black text-cyan-500 hover:bg-cyan-50 hover:text-cyan-600"
              >
                Quay lại
              </Button>
              <Button
                type="button"
                onClick={handleCustomerAction}
                className="h-12 rounded-lg bg-[#26338d] text-base font-black text-white hover:bg-[#1d2874]"
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
                  className="h-14 w-full rounded-xl border border-gray-200 px-6 text-lg font-medium text-black outline-none placeholder:text-gray-400 focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="mb-3 block text-lg font-black text-black">
                  Số điện thoại<span className="text-red-500">*</span>
                </label>
                <input
                  value={customerPhone}
                  onChange={(event) => setCustomerPhone(event.target.value)}
                  className="h-14 w-full rounded-xl border border-gray-200 px-6 text-lg font-medium text-black outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="mb-3 block text-lg font-black text-black">
                  Địa chỉ
                </label>
                <select
                  value={newCustomerProvince}
                  onChange={(event) => setNewCustomerProvince(event.target.value)}
                  className="mb-3 h-14 w-full rounded-xl border border-gray-200 bg-white px-6 text-lg font-medium text-slate-700 outline-none focus:border-cyan-400"
                >
                  <option value="">Tỉnh/Thành phố</option>
                  <option value="Sơn La">Sơn La</option>
                  <option value="Hà Nội">Hà Nội</option>
                  <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
                </select>
                <select
                  value={newCustomerWard}
                  onChange={(event) => setNewCustomerWard(event.target.value)}
                  className="mb-3 h-14 w-full rounded-xl border border-gray-200 bg-white px-6 text-lg font-medium text-slate-700 outline-none focus:border-cyan-400"
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
                  className="h-14 w-full rounded-xl border border-gray-200 px-6 text-lg font-medium text-black outline-none placeholder:text-gray-400 focus:border-cyan-400"
                />
              </div>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleCreateCustomerBack}
                className="h-12 rounded-lg border-cyan-400 text-base font-black text-cyan-500 hover:bg-cyan-50 hover:text-cyan-600"
              >
                Quay lại
              </Button>
              <Button
                type="button"
                onClick={handleCreateCustomerSubmit}
                disabled={!canCreateCustomer}
                className="h-12 rounded-lg bg-[#26338d] text-base font-black text-white hover:bg-[#1d2874] disabled:bg-[#a8afd0] disabled:hover:bg-[#a8afd0]"
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
        items={items}
        totalQuantity={totalQuantity}
        totalAmount={totalAmount}
        onBack={handlePaymentBack}
        onConfirm={handleConfirmPayment}
      />
    </>
  );
};

export default OrderDetailModal;
