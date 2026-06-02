import React, { useEffect, useState, useRef } from "react";
import uploadApi from "@/api/uploadApi";
import { useSelector } from "react-redux";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

const IngredientModal = ({
  open,
  onClose,
  initialData,
  onSubmit,
  onDelete,
}) => {
  const [form, setForm] = useState({
    name: "",
    origin: "",
    type: "tinh_bot",
    protein: 0,
    fat: 0,
    carbs: 0,
    status: "available",
    imageUrl: "",
    imagePublicId: null,
  });
  const [initialSnapshot, setInitialSnapshot] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const { accessToken } = useSelector((s) => s.auth || {});

  useEffect(() => {
    // Khi modal được mở hoặc initialData thay đổi, hãy khởi tạo form.
    // Nếu đang ở chế độ tạo mới (initialData === null) thì reset hoàn toàn form
    // để tránh giữ lại dữ liệu cũ khi người dùng thêm liên tiếp.
    if (!open) return; // chỉ init khi modal mở

    if (initialData) {
      const snapshot = {
        name: initialData.name || "",
        origin: initialData.origin || "",
        type: initialData.type || "tinh_bot",
        protein: initialData.protein ?? 0,
        fat: initialData.fat ?? 0,
        carbs: initialData.carbs ?? 0,
        status: initialData.status || "available",
        imageUrl: initialData.imageUrl || "",
        imagePublicId: initialData.imagePublicId || null,
      };
      setForm(snapshot);
      setInitialSnapshot(snapshot);
    } else {
      const empty = {
        name: "",
        origin: "",
        type: "tinh_bot",
        protein: 0,
        fat: 0,
        carbs: 0,
        status: "available",
        imageUrl: "",
        imagePublicId: null,
      };
      setForm(empty);
      setInitialSnapshot(empty);
    }
  }, [initialData, open]);

  useEffect(() => {
    // Reset lại xác nhận xóa khi modal mở/đóng
    setShowDeleteConfirm(false);
    setDeleteConfirm("");
  }, [open, initialData]);

  if (!open) return null;

  const handleClose = async () => {
    // Xóa ảnh mới tải lên nhưng chưa lưu
    try {
      const token = accessToken || null;
      const currentPublicId = form.imagePublicId;
      const initialPublicId = initialSnapshot?.imagePublicId;
      if (currentPublicId && currentPublicId !== initialPublicId) {
        await uploadApi.deleteImage(currentPublicId, token);
      }
    } catch (err) {
      console.warn("Failed to cleanup orphan image on close", err);
    }
    onClose && onClose();
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      if (onSubmit) {
        const payload = {
          name: form.name,
          origin: form.origin,
          type: form.type,
          protein: Number(form.protein) || 0,
          fat: Number(form.fat) || 0,
          carbs: Number(form.carbs) || 0,
          status: form.status || "available",
          imageUrl: form.imageUrl || "",
        };
        const res = onSubmit(payload);
        if (res && res.then) await res;
      }
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = async (e) => {
    if (uploading || saving || deleting) return;
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    setUploading(true);
    try {
      const token = accessToken || null;
      const prevPublicId = form.imagePublicId;
      const res = await uploadApi.uploadImage(f, "product", token);
      const newUrl = res?.data?.url || res?.url || "";
      const newPublicId = res?.data?.publicId || res?.publicId || null;
      setForm((prev) => ({
        ...prev,
        imageUrl: newUrl || prev.imageUrl,
        imagePublicId: newPublicId,
      }));

      // xóa upload tạm trước đó (không xóa ảnh gốc đã lưu trong DB)
      if (prevPublicId && prevPublicId !== initialSnapshot?.imagePublicId) {
        try {
          await uploadApi.deleteImage(prevPublicId, token);
        } catch (err) {
          console.warn("Failed to delete previous uploaded image", err);
        }
      }
    } catch (err) {
      console.error("Upload failed", err);
      alert("Tải ảnh thất bại");
    } finally {
      setUploading(false);
      // xóa input để có thể chọn lại cùng 1 file
      if (fileInputRef.current) fileInputRef.current.value = null;
    }
  };

  const handleRemoveImage = async () => {
    // xóa ảnh đang chọn (gọi API xóa nếu publicId tồn tại)
    if (uploading || saving || deleting) return;
    const token = accessToken || null;
    const currentPublicId = form.imagePublicId;
    if (currentPublicId) {
      try {
        setUploading(true);
        await uploadApi.deleteImage(currentPublicId, token);
      } catch (err) {
        console.warn("Không xóa được ảnh", err);
      } finally {
        setUploading(false);
      }
    }
    setForm((prev) => ({ ...prev, imageUrl: "", imagePublicId: null }));
  };

  const isDirty = (() => {
    if (!initialSnapshot) return true;
    return (
      String(initialSnapshot.name) !== String(form.name) ||
      String(initialSnapshot.origin) !== String(form.origin) ||
      String(initialSnapshot.type) !== String(form.type) ||
      String(initialSnapshot.protein) !== String(form.protein) ||
      String(initialSnapshot.fat) !== String(form.fat) ||
      String(initialSnapshot.carbs) !== String(form.carbs) ||
      String(initialSnapshot.status) !== String(form.status) ||
      String(initialSnapshot.imageUrl) !== String(form.imageUrl)
    );
  })();

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 px-4 animate-fade-in"
      onClick={handleBackdropClick}
    >
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white px-6 py-6 shadow-xl animate-modal-pop">
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-4 top-4 rounded-md p-1 text-gray-500 hover:bg-gray-100"
          title="Đóng"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-5">
          <h3 className="text-center text-lg font-bold text-black">
            {initialData ? "Sửa nguyên liệu" : "Thêm nguyên liệu"}
          </h3>
        </div>

        <div className="space-y-4">
          <label className="flex flex-col">
            <span className="mb-2 text-sm font-bold text-black">
              Tên <span className="text-red-500">*</span>
            </span>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="h-11 rounded-lg border border-gray-200 px-4 text-sm font-medium text-black outline-none placeholder:text-gray-400 focus:border-green-500"
            />
          </label>

          <label className="flex flex-col">
            <span className="mb-2 text-sm font-bold text-black">Xuất xứ</span>
            <input
              value={form.origin}
              onChange={(e) => setForm({ ...form, origin: e.target.value })}
              className="h-11 rounded-lg border border-gray-200 px-4 text-sm font-medium text-black outline-none placeholder:text-gray-400 focus:border-green-500"
            />
          </label>

          <label className="flex flex-col">
            <span className="mb-2 text-sm font-bold text-black">Loại</span>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="h-11 cursor-pointer rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none focus:border-green-500"
            >
              <option value="tinh_bot">Tinh bột</option>
              <option value="protein_dong_vat">Protein động vật</option>
              <option value="protein_thuc_vat">Protein thực vật</option>
              <option value="rau_cu_qua">Rau, củ, quả</option>
              <option value="trai_cay">Trái cây</option>
              <option value="do_uong">Đồ uống</option>
              <option value="do_ngot">Đồ ngọt</option>
            </select>
          </label>

          <div className="grid grid-cols-3 gap-3">
            <label className="flex flex-col">
              <span className="mb-2 text-sm font-bold text-black">Protein/100g</span>
              <input
                type="number"
                value={form.protein}
                onChange={(e) =>
                  setForm({ ...form, protein: Number(e.target.value) })
                }
                className="h-11 rounded-lg border border-gray-200 px-4 text-sm font-medium text-black outline-none focus:border-green-500"
                min={0}
              />
            </label>

            <label className="flex flex-col">
              <span className="mb-2 text-sm font-bold text-black">Fat/100g</span>
              <input
                type="number"
                value={form.fat}
                onChange={(e) =>
                  setForm({ ...form, fat: Number(e.target.value) })
                }
                className="h-11 rounded-lg border border-gray-200 px-4 text-sm font-medium text-black outline-none focus:border-green-500"
                min={0}
              />
            </label>

            <label className="flex flex-col">
              <span className="mb-2 text-sm font-bold text-black">Carbs/100g</span>
              <input
                type="number"
                value={form.carbs}
                onChange={(e) =>
                  setForm({ ...form, carbs: Number(e.target.value) })
                }
                className="h-11 rounded-lg border border-gray-200 px-4 text-sm font-medium text-black outline-none focus:border-green-500"
                min={0}
              />
            </label>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-28 h-28 bg-gray-100 rounded flex items-center justify-center overflow-hidden">
              {form.imageUrl ? (
                <img
                  src={form.imageUrl}
                  alt={form.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-gray-400">No image</div>
              )}
            </div>

            <div className="flex-1">
              <label className="mb-2 block text-sm font-bold text-black">Hình</label>
              <div className="flex gap-2">
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleFileChange}
                />

                <button
                  type="button"
                  onClick={() =>
                    !(uploading || saving || deleting) &&
                    fileInputRef.current &&
                    fileInputRef.current.click()
                  }
                  disabled={uploading || saving || deleting}
                  className={`px-3 py-2 rounded transition transform ${
                    uploading || saving || deleting
                      ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                      : "bg-green-600 text-white hover:bg-green-700 hover:scale-105 cursor-pointer"
                  }`}
                >
                  {uploading ? "Đang tải..." : "Chọn ảnh"}
                </button>

                <button
                  type="button"
                  onClick={handleRemoveImage}
                  disabled={uploading || saving || deleting}
                  className={`px-3 py-2 rounded transition ${
                    uploading || saving || deleting
                      ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                      : "bg-gray-100 hover:bg-gray-200 cursor-pointer"
                  }`}
                >
                  Xóa
                </button>
              </div>
            </div>
          </div>

          <label className="flex flex-col">
            <span className="mb-2 text-sm font-bold text-black">Trạng thái</span>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="h-11 cursor-pointer rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none focus:border-green-500"
            >
              <option value="available">Có sẵn</option>
              <option value="discontinued">Ngừng bán</option>
            </select>
          </label>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          {/* Delete section for existing items */}
          {initialData && (
            <div>
              {!showDeleteConfirm ? (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Để xóa nguyên liệu, nhấn Xóa và xác nhận.
                  </div>
                  <button
                    onClick={() =>
                      !(uploading || saving || deleting) &&
                      setShowDeleteConfirm(true)
                    }
                    disabled={uploading || saving || deleting}
                    className={`px-4 py-2 rounded transition ${
                      uploading || saving || deleting
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-white border text-red-600 hover:bg-red-50 cursor-pointer"
                    }`}
                  >
                    Xóa
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-700 mb-2">
                    Để xóa nguyên liệu, nhập <strong>delete</strong> để xác
                    nhận.
                  </p>
                  <input
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    placeholder="gõ delete để xác nhận"
                    className="w-full border rounded px-3 py-2 mb-3"
                  />
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => {
                        setDeleteConfirm("");
                        setShowDeleteConfirm(false);
                      }}
                      className="px-4 py-2 bg-gray-100 rounded cursor-pointer"
                    >
                      Hủy
                    </button>
                    <button
                      onClick={async () => {
                        if (deleting || uploading || saving) return;
                        if (deleteConfirm !== "delete") return;
                        if (!onDelete) return;
                        setDeleting(true);
                        try {
                          const res = onDelete(initialData._id);
                          if (res && res.then) await res;
                        } finally {
                          setDeleting(false);
                        }
                      }}
                      disabled={
                        deleteConfirm !== "delete" ||
                        deleting ||
                        uploading ||
                        saving
                      }
                      className={`px-4 py-2 rounded ${
                        deleteConfirm === "delete"
                          ? deleting || uploading || saving
                            ? "bg-red-400 text-white cursor-wait"
                            : "bg-red-600 text-white hover:bg-red-700 cursor-pointer"
                          : "bg-red-200 text-red-600 cursor-not-allowed"
                      }`}
                    >
                      {deleting ? "Đang xóa..." : "Xác nhận xóa"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mt-2 grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={uploading || saving || deleting}
              className="h-10 rounded-lg border-green-500 text-sm font-bold text-green-600 hover:bg-green-50 hover:text-green-700"
            >
              Quay lại
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={!isDirty || saving || uploading || deleting}
              className={`h-10 rounded-lg text-sm font-bold ${
                !isDirty || saving || uploading || deleting
                  ? "cursor-not-allowed bg-[#bbf7d0] text-white hover:bg-[#bbf7d0]"
                  : "bg-[#34ad54] text-white hover:bg-[#2f9b45]"
              }`}
            >
              {saving ? "Đang lưu..." : "Lưu"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IngredientModal;


