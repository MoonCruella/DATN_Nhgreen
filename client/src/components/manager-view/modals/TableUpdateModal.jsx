import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

const TableUpdateModal = ({ table, onClose, onDelete, onUpdate }) => {
  const [name, setName] = useState("");

  useEffect(() => {
    setName(table?.name || "");
  }, [table]);

  if (!table) return null;

  const canSubmit = name.trim().length > 0;

  const submit = (event) => {
    event.preventDefault();
    if (!canSubmit) return;
    onUpdate(table, { name: name.trim() });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-[520px] rounded-[18px] bg-white px-8 py-7 shadow-xl"
      >
        <div className="mb-7 grid grid-cols-[1fr_auto_1fr] items-center">
          <span />
          <h2 className="text-center text-xl font-bold text-black">
            Cập nhật thông tin bàn
          </h2>
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
          <span className="mb-2 block text-lg font-bold text-black">
            Tên bàn<span className="text-red-500">*</span>
          </span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="h-12 w-full rounded-lg border border-gray-200 px-4 text-lg font-medium text-slate-900 outline-none focus:border-[#26338d]"
            required
          />
        </label>

        <div className="grid grid-cols-2 gap-5">
          <Button
            type="button"
            variant="outline"
            onClick={() => onDelete(table)}
            className="h-12 rounded-lg border-cyan-400 text-lg font-bold text-cyan-500 hover:bg-cyan-50 hover:text-cyan-600"
          >
            Xóa
          </Button>
          <Button
            type="submit"
            disabled={!canSubmit}
            className="h-12 rounded-lg bg-[#26338d] text-lg font-bold text-white hover:bg-[#1d2874]"
          >
            Cập nhật
          </Button>
        </div>
      </form>
    </div>
  );
};

export default TableUpdateModal;
