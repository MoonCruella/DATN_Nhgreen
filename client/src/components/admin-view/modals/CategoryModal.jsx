import React, { useEffect, useRef, useState } from "react";
import uploadApi from "@/api/uploadApi";
import { useSelector } from "react-redux";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

const CategoryModal = ({ open, onClose, initialData, onSubmit, onDelete }) => {
  const { accessToken } = useSelector((s) => s.auth || {});
  const [form, setForm] = useState({
    name: "",
    description: "",
    imageUrl: "",
    imagePublicId: null,
    status: "available",
  });
  const [snapshot, setSnapshot] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const fileRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    if (initialData) {
      const s = {
        name: initialData.name || "",
        description: initialData.description || "",
        imageUrl: initialData.imageUrl || "",
        imagePublicId: initialData.imagePublicId || null,
        status: initialData.status || "available",
      };
      setForm(s);
      setSnapshot(s);
    } else {
      const empty = {
        name: "",
        description: "",
        imageUrl: "",
        imagePublicId: null,
        status: "available",
      };
      setForm(empty);
      setSnapshot(empty);
    }
    setShowDeleteConfirm(false);
    setDeleteConfirm("");
  }, [open, initialData]);

  if (!open) return null;

  const handleClose = async () => {
    try {
      const token = accessToken || null;
      const initialPublicId = snapshot?.imagePublicId || null;
      if (form.imagePublicId && form.imagePublicId !== initialPublicId) {
        await uploadApi.deleteImage(form.imagePublicId, token);
      }
    } catch (err) {
      console.warn("Failed to cleanup category image", err);
    }
    onClose && onClose();
  };

  const handleFileChange = async (e) => {
    if (uploading || saving || deleting) return;
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    setUploading(true);
    try {
      const token = accessToken || null;
      const prev = form.imagePublicId;
      const res = await uploadApi.uploadImage(f, "category", token);
      const url = res?.data?.url || res?.url || "";
      const publicId = res?.data?.publicId || res?.publicId || null;
      setForm((p) => ({ ...p, imageUrl: url, imagePublicId: publicId }));
      if (prev && prev !== snapshot?.imagePublicId) {
        try {
          await uploadApi.deleteImage(prev, token);
        } catch (e) {
          console.warn("Failed to delete previous image", e);
        }
      }
    } catch (err) {
      console.error(err);
      alert("Tải ảnh thất bại");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = null;
    }
  };

  const handleRemoveImage = async () => {
    if (uploading || saving || deleting) return;
    const token = accessToken || null;
    const publicId = form.imagePublicId;
    if (publicId) {
      try {
        setUploading(true);
        await uploadApi.deleteImage(publicId, token);
      } catch (e) {
        console.warn("Failed to delete image", e);
      } finally {
        setUploading(false);
      }
    }
    setForm((p) => ({ ...p, imageUrl: "", imagePublicId: null }));
  };

  const isDirty = (() => {
    if (!snapshot) return true;
    const keys = ["name", "description", "imageUrl", "status"];
    for (const k of keys) {
      const a = snapshot[k] ?? "";
      const b = form[k] ?? "";
      if (String(a) !== String(b)) return true;
    }
    return false;
  })();

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      if (onSubmit) {
        const payload = {
          name: form.name,
          description: form.description,
          imageUrl: form.imageUrl || "",
          imagePublicId: form.imagePublicId || null,
          status: form.status || "available",
        };
        const res = onSubmit(payload);
        if (res && res.then) await res;
      }
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (deleting) return;
    if (deleteConfirm !== "delete") return;
    if (!onDelete) return;
    setDeleting(true);
    try {
      const res = onDelete(initialData._id);
      if (res && res.then) await res;
    } finally {
      setDeleting(false);
    }
  };

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
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white px-6 py-6 shadow-xl animate-modal-pop">
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
            {initialData ? "Chi tiết / Sửa danh mục" : "Thêm danh mục"}
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
            <span className="mb-2 text-sm font-bold text-black">Trạng thái</span>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="h-11 cursor-pointer rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none focus:border-green-500"
            >
              <option value="available">Đang bán</option>
              <option value="suspended">Đã ngừng bán</option>
            </select>
          </label>

          <label className="flex flex-col md:col-span-2">
            <span className="mb-2 text-sm font-bold text-black">Mô tả</span>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              className="min-h-24 rounded-lg border border-gray-200 px-4 py-3 text-sm font-medium text-black outline-none placeholder:text-gray-400 focus:border-green-500"
            />
          </label>

          <div className="flex items-center gap-4">
            <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-lg bg-gray-100">
              {form.imageUrl ? (
                <img
                  src={form.imageUrl}
                  alt={form.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="text-gray-400">No image</div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <input
                type="file"
                ref={fileRef}
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => fileRef.current && fileRef.current.click()}
                  disabled={uploading || saving || deleting}
                  className={`h-10 rounded-lg px-3 text-sm font-bold ${
                    uploading || saving || deleting
                      ? "cursor-not-allowed bg-gray-300 text-gray-600"
                      : "cursor-pointer bg-[#34ad54] text-white hover:bg-[#2f9b45]"
                  }`}
                >
                  {uploading ? "Đang tải..." : "Chọn ảnh"}
                </button>
                <button
                  onClick={handleRemoveImage}
                  disabled={uploading || saving || deleting}
                  className="h-10 cursor-pointer rounded-lg bg-gray-100 px-3 text-sm font-bold hover:bg-gray-200"
                >
                  Xóa
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          {initialData && !showDeleteConfirm && (
            <div className="flex justify-start">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 bg-white border rounded text-red-600 cursor-pointer"
              >
                Xóa
              </button>
            </div>
          )}

          {initialData && showDeleteConfirm && (
            <div className="bg-red-50 border border-red-100 p-4 rounded">
              <p className="text-sm text-red-700 mb-2">
                Để xóa danh mục, nhập <strong>delete</strong> vào ô bên dưới để
                xác nhận.
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
                  onClick={handleConfirmDelete}
                  disabled={deleteConfirm !== "delete" || deleting}
                  className={`px-4 py-2 rounded ${
                    deleteConfirm === "delete"
                      ? deleting
                        ? "bg-red-400 text-white cursor-wait"
                        : "bg-red-600 text-white "
                      : "bg-red-200 text-red-600 cursor-not-allowed"
                  }`}
                >
                  {deleting ? "Đang xóa..." : "Xác nhận xóa"}
                </button>
              </div>
            </div>
          )}

          <div className="mt-2 grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="h-10 rounded-lg border-green-500 text-sm font-bold text-green-600 hover:bg-green-50 hover:text-green-700"
            >
              Quay lại
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={
                !isDirty ||
                saving ||
                String(form.name || "").trim().length === 0
              }
              className={`h-10 rounded-lg text-sm font-bold ${
                !isDirty ||
                saving ||
                String(form.name || "").trim().length === 0
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

export default CategoryModal;


