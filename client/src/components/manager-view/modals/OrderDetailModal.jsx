import { UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const formatCurrency = (value = 0) =>
  new Intl.NumberFormat("vi-VN").format(value || 0);

const getDishPrice = (dish) => dish?.sale_price || dish?.price || 0;

const getDishUnit = (dish) =>
  dish?.unit || dish?.unit_name || dish?.unitName || "Phần";

const OrderDetailModal = ({
  open,
  table,
  items = [],
  totalQuantity = 0,
  totalAmount = 0,
  primaryActionLabel = "Thanh toán",
  onClose,
  onAddMore,
  onPrimaryAction,
}) => {
  if (!open) return null;

  return (
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
          {table?.name || "Bàn"}
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
                    key={item._id}
                    className="grid grid-cols-[80px_1.5fr_1fr_1fr_1fr_1fr] gap-x-6 px-2 text-lg font-medium text-slate-950"
                  >
                    <div>{index + 1}</div>
                    <div>{item.name}</div>
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
              className="h-12 rounded-full bg-[#26338d] px-7 text-lg font-bold text-white hover:bg-[#1d2874]"
            >
              <UserPlus className="mr-2 h-5 w-5" />
              Thêm khách hàng
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
                onClick={onAddMore}
                className="h-14 rounded-lg border-cyan-400 text-lg font-bold text-cyan-500 hover:bg-cyan-50 hover:text-cyan-600"
              >
                Thêm món
              </Button>
              <Button
                type="button"
                onClick={onPrimaryAction}
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
  );
};

export default OrderDetailModal;
