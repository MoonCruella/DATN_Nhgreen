import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import userApi from "@/api/userApi";

const CustomerCreateModal = ({ open, onClose, onCreated, accessToken = null }) => {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    province: "",
    ward: "",
    detail: "",
    note: "",
  });
  const [creating, setCreating] = useState(false);

  if (!open) return null;

  const updateForm = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error("Vui lòng nhập tên khách hàng");
      return;
    }

    if (!form.phone.trim()) {
      toast.error("Vui lòng nhập số điện thoại");
      return;
    }

    try {
      setCreating(true);
      const res = await userApi.createManagerDineInCustomer(
        {
          name: form.name.trim(),
          phone: form.phone.trim(),
          address: {
            province: form.province,
            ward: form.ward,
            detail: form.detail,
          },
          note: form.note.trim(),
        },
        accessToken,
      );

      toast.success("Đã tạo khách hàng");
      setForm({
        name: "",
        phone: "",
        province: "",
        ward: "",
        detail: "",
        note: "",
      });
      onCreated?.(res?.data?.customer);
      onClose?.();
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Không thể tạo khách hàng",
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 px-4">
      <div className="relative max-h-[90vh] w-full max-w-[480px] overflow-y-auto rounded-xl bg-white px-6 py-6 shadow-xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-md p-1 text-gray-500 hover:bg-gray-100"
          title="Đóng"
        >
          <X className="h-5 w-5" />
        </button>

        <h3 className="mb-5 text-center text-lg font-bold text-black">
          Tạo khách hàng mới
        </h3>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-bold text-black">
              Tên khách hàng<span className="text-red-500">*</span>
            </label>
            <input
              value={form.name}
              onChange={(event) => updateForm("name", event.target.value)}
              placeholder="Nhập tên khách hàng"
              className="h-11 w-full rounded-lg border border-gray-200 px-4 text-sm font-medium text-black outline-none placeholder:text-gray-400 focus:border-green-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-black">
              Số điện thoại<span className="text-red-500">*</span>
            </label>
            <input
              value={form.phone}
              onChange={(event) => updateForm("phone", event.target.value)}
              placeholder="Nhập số điện thoại"
              className="h-11 w-full rounded-lg border border-gray-200 px-4 text-sm font-medium text-black outline-none placeholder:text-gray-400 focus:border-green-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-black">
              Địa chỉ
            </label>
            <select
              value={form.province}
              onChange={(event) => updateForm("province", event.target.value)}
              className="mb-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none focus:border-green-500"
            >
              <option value="">Tỉnh/Thành phố</option>
              <option value="Sơn La">Sơn La</option>
              <option value="Hà Nội">Hà Nội</option>
              <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
            </select>
            <select
              value={form.ward}
              onChange={(event) => updateForm("ward", event.target.value)}
              className="mb-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none focus:border-green-500"
            >
              <option value="">Phường/Xã</option>
              <option value="Phường Chiềng Lề">Phường Chiềng Lề</option>
              <option value="Phường Quyết Thắng">Phường Quyết Thắng</option>
              <option value="Xã Chiềng Ngần">Xã Chiềng Ngần</option>
            </select>
            <input
              value={form.detail}
              onChange={(event) => updateForm("detail", event.target.value)}
              placeholder="Địa chỉ cụ thể"
              className="h-11 w-full rounded-lg border border-gray-200 px-4 text-sm font-medium text-black outline-none placeholder:text-gray-400 focus:border-green-500"
            />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-10 rounded-lg border-green-500 text-sm font-bold text-green-600 hover:bg-green-50 hover:text-green-700"
          >
            Quay lại
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={creating}
            className="h-10 rounded-lg bg-[#34ad54] text-sm font-bold text-white hover:bg-[#2f9b45] disabled:bg-[#bbf7d0] disabled:hover:bg-[#bbf7d0]"
          >
            {creating ? "Đang tạo..." : "Tạo khách hàng"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CustomerCreateModal;
