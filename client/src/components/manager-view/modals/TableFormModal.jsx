import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

const TableFormModal = ({ open, onClose, onSubmit, branchId }) => {
  const [form, setForm] = useState({ name: "" });

  useEffect(() => {
    if (open) setForm({ name: "" });
  }, [open]);

  if (!open) return null;

  const canSubmit = form.name.trim().length > 0;

  const submit = (event) => {
    event.preventDefault();
    if (!canSubmit) return;
    onSubmit({ branch_id: branchId, name: form.name.trim() });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-[520px] rounded-[18px] bg-white px-8 py-7 shadow-xl"
      >
        <div className="mb-7 grid grid-cols-[1fr_auto_1fr] items-center">
          <span />
          <h2 className="text-center text-xl font-bold text-black">Thêm bàn</h2>
          <button
            type="button"
            onClick={onClose}
            className="justify-self-end rounded-md p-1 text-slate-900 hover:bg-gray-100"
            title="Đóng"
          >
            <X className="h-7 w-7" strokeWidth={2.2} />
          </button>
        </div>

        <label className="mb-8 block">
          <span className="mb-2 block text-lg font-bold text-slate-900">
            Tên bàn
          </span>
          <input
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            className="h-12 w-full rounded-lg border border-gray-200 px-4 text-lg font-medium text-slate-900 outline-none placeholder:text-slate-300 focus:border-[#26338d]"
            placeholder="Nhập tên bàn"
            required
          />
        </label>

        <Button
          type="submit"
          disabled={!canSubmit}
          className={`h-12 w-full rounded-lg text-lg font-bold text-white ${
            canSubmit
              ? "bg-[#26338d] hover:bg-[#1d2874]"
              : "cursor-not-allowed bg-[#a8afd0] hover:bg-[#a8afd0]"
          }`}
        >
          Lưu
        </Button>
      </form>
    </div>
  );
};

export default TableFormModal;
