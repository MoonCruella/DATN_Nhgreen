import React, { useEffect, useRef, useState } from "react";
import uploadApi from "@/api/uploadApi";
import { useSelector } from "react-redux";

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
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            {initialData ? "Chi tiết / Sửa danh mục" : "Thêm danh mục"}
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col">
            <span className="text-sm text-gray-600">
              Tên <span className="text-red-500">*</span>
            </span>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="border rounded px-3 py-2"
            />
          </label>

          <label className="flex flex-col">
            <span className="text-sm text-gray-600">Trạng thái</span>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="border rounded px-3 py-2 cursor-pointer"
            >
              <option value="available">Đang bán</option>
              <option value="suspended">Đã ngừng bán</option>
            </select>
          </label>

          <label className="col-span-2 flex flex-col">
            <span className="text-sm text-gray-600">Mô tả</span>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              className="border rounded px-3 py-2"
            />
          </label>

          <div className="flex items-center gap-4">
            <div className="w-28 h-28 bg-gray-100 rounded overflow-hidden flex items-center justify-center">
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
                  className={`px-3 py-2 rounded ${
                    uploading || saving || deleting
                      ? "bg-gray-300 text-gray-900"
                      : "bg-gray-800 text-white hover:bg-gray-700 cursor-pointer"
                  }`}
                >
                  {uploading ? "Đang tải..." : "Chọn ảnh"}
                </button>
                <button
                  onClick={handleRemoveImage}
                  disabled={uploading || saving || deleting}
                  className="px-3 py-2 rounded bg-gray-100 cursor-pointer"
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

          <div className="mt-2 flex justify-end gap-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-gray-100 rounded cursor-pointer"
            >
              Đóng
            </button>
            <button
              onClick={handleSave}
              disabled={
                !isDirty ||
                saving ||
                String(form.name || "").trim().length === 0
              }
              className={`px-4 py-2 rounded ${
                !isDirty ||
                saving ||
                String(form.name || "").trim().length === 0
                  ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                  : "bg-gray-800 text-white"
              }`}
            >
              {saving ? "Đang lưu..." : "Lưu"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryModal;
