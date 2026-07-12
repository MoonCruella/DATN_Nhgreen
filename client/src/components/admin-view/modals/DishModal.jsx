import React, { useEffect, useState, useRef } from "react";
import uploadApi from "@/api/uploadApi";
import { toast } from "sonner";
import { useSelector } from "react-redux";
import { assets } from "@/assets/assets";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import SelectIngredient from "@/components/admin-view/component/SelectIngredient";

const MAX_FILES = 8;

const ProductModal = ({
  open,
  onClose,
  initialData,
  onSubmit,
  onDelete,
  ingredientsList = [],
  categories = [],
}) => {
  const [form, setForm] = useState({
    name: "",
    category: "",
    description: "",
    // store price as string so the input can preserve formatting (leading zeros)
    price: "0",
    stock: "0",
    imageUrls: [],
    imagePublicIds: [],
    defaultImageIndex: 0,
    ingredients: [], // [{ ingredient: id, quantityGram }]
    status: "active",
  });

  const [initialSnapshot, setInitialSnapshot] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [defaultPulse, setDefaultPulse] = useState(null);

  const fileRef = useRef(null);
  const modalRef = useRef(null);
  const [openPickerIndex, setOpenPickerIndex] = useState(null);

  const { accessToken } = useSelector((s) => s.auth || {});

  useEffect(() => {
    if (!open) return;

    if (initialData) {
      const snapshot = {
        name: initialData.name || "",
        category:
          typeof initialData.category === "string"
            ? initialData.category
            : initialData.category && initialData.category._id
            ? initialData.category._id
            : "",
        description: initialData.description || "",
        // keep as string
        price: String(initialData.price ?? 0),
        stock: String(initialData.stock ?? 0),
        imageUrls: initialData.imageUrls || [],
        imagePublicIds: initialData.imagePublicIds || [],
        defaultImageIndex: initialData.defaultImageIndex ?? 0,
        // normalize ingredients so each entry has { ingredient: id, quantityGram }
        // store quantityGram as string so the input can preserve leading zeros/formatting
        ingredients: (initialData.ingredients || []).map((it) => ({
          ingredient:
            typeof it.ingredient === "string"
              ? it.ingredient
              : it.ingredient && it.ingredient._id
              ? it.ingredient._id
              : it._id || "",
          quantityGram: String(it.quantityGram ?? 0),
        })),
        status: initialData.status || "active",
      };
      setForm(snapshot);
      setInitialSnapshot(snapshot);
    } else {
      const empty = {
        name: "",
        category: "",
        description: "",
        price: "0",
        stock: "0",
        imageUrls: [],
        imagePublicIds: [],
        defaultImageIndex: 0,
        ingredients: [],
        status: "active",
      };
      setForm(empty);
      setInitialSnapshot(empty);
    }
  }, [open, initialData]);

  useEffect(() => {
    setShowDeleteConfirm(false);
    setDeleteConfirm("");
  }, [open, initialData]);

  if (!open) return null;

  const handleFiles = async (filesList) => {
    const files = Array.from(filesList || []);
    if (!files.length) return;
    setUploading(true);
    try {
      const token = accessToken || null;
      const remaining = Math.max(0, MAX_FILES - (form.imageUrls?.length || 0));
      const toProcess = files.slice(0, remaining);
      for (const f of toProcess) {
        try {
          const res = await uploadApi.uploadImage(f, "product", token);
          const url = res?.data?.url || res?.url || "";
          const publicId = res?.data?.publicId || res?.publicId || null;
          if (url) {
            setForm((s) => ({
              ...s,
              imageUrls: [...(s.imageUrls || []), url],
              imagePublicIds: [...(s.imagePublicIds || []), publicId],
            }));
          }
        } catch (err) {
          console.error("Upload failed for file", f.name, err);
        }
      }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = null;
    }
  };

  const onDrop = async (e) => {
    e.preventDefault();
    const dt = e.dataTransfer;
    if (!dt) return;
    await handleFiles(dt.files);
  };

  const onPickFiles = (e) => {
    const files = e.target.files;
    if (!files || !files.length) return;
    handleFiles(files);
  };

  const handleClose = async () => {
    // delete any newly uploaded images that weren't present in the initial snapshot
    try {
      const token = accessToken || null;
      const curr = form.imagePublicIds || [];
      const init = initialSnapshot?.imagePublicIds || [];
      const toDelete = curr.filter((id) => id && !init.includes(id));
      for (const pid of toDelete) {
        try {
          await uploadApi.deleteImage(pid, token);
        } catch (err) {
          console.warn("Failed to cleanup orphan image", pid, err);
        }
      }
    } catch (err) {
      console.warn("Failed to cleanup orphan images on close", err);
    }
    onClose && onClose();
  };

  const removeImageAt = async (idx) => {
    const token = accessToken || null;
    const pubId = form.imagePublicIds?.[idx];
    try {
      if (pubId) await uploadApi.deleteImage(pubId, token);
    } catch (err) {
      console.warn("Failed to delete uploaded image", err);
    }
    setForm((s) => {
      const imageUrls = (s.imageUrls || []).filter((_, i) => i !== idx);
      const imagePublicIds = (s.imagePublicIds || []).filter(
        (_, i) => i !== idx
      );
      let defaultImageIndex = s.defaultImageIndex || 0;
      if (defaultImageIndex >= imageUrls.length) defaultImageIndex = 0;
      return { ...s, imageUrls, imagePublicIds, defaultImageIndex };
    });
  };

  const setDefaultImage = (idx) => {
    setForm((s) => ({ ...s, defaultImageIndex: idx }));
    setDefaultPulse(idx);
    setTimeout(() => setDefaultPulse(null), 600);
  };

  const addIngredient = () => {
    const nextIdx = (form.ingredients || []).length;
    setForm((s) => ({
      ...s,
      ingredients: [
        ...(s.ingredients || []),
        { ingredient: "", quantityGram: "0" },
      ],
    }));
    // open picker for the new row
    setOpenPickerIndex(nextIdx);
  };

  const updateIngredient = (idx, patch) => {
    setForm((s) => {
      const ingredients = Array.isArray(s.ingredients)
        ? [...s.ingredients]
        : [];
      ingredients[idx] = { ...(ingredients[idx] || {}), ...patch };
      return { ...s, ingredients };
    });
  };

  const removeIngredient = (idx) => {
    setForm((s) => {
      const ingredients = (s.ingredients || []).filter((_, i) => i !== idx);
      return { ...s, ingredients };
    });
    // if picker for this index was open, close it
    setOpenPickerIndex((cur) => (cur === idx ? null : cur));
  };

  const isDirty = (() => {
    if (!initialSnapshot) return true;
    try {
      // shallow compare important fields
      return (
        String(initialSnapshot.name) !== String(form.name) ||
        String(initialSnapshot.category) !== String(form.category) ||
        String(initialSnapshot.description) !== String(form.description) ||
        String(initialSnapshot.price) !== String(form.price) ||
        String(initialSnapshot.stock) !== String(form.stock) ||
        String(initialSnapshot.defaultImageIndex) !==
          String(form.defaultImageIndex) ||
        String(initialSnapshot.status) !== String(form.status) ||
        JSON.stringify(initialSnapshot.imagePublicIds || []) !==
          JSON.stringify(form.imagePublicIds || []) ||
        JSON.stringify(initialSnapshot.ingredients || []) !==
          JSON.stringify(form.ingredients || [])
      );
    } catch (err) {
      return true;
    }
  })();

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      if (onSubmit) {
        // client-side validation
        if (!form.name || String(form.name).trim() === "") {
          toast.error("Vui lòng nhập tên món");
          return;
        }
        if (!form.category || String(form.category).trim() === "") {
          toast.error("Vui lòng chọn danh mục");
          return;
        }
        const priceNum = Number(form.price);
        if (Number.isNaN(priceNum) || priceNum < 0) {
          toast.error("Giá không hợp lệ");
          return;
        }
        if (!Array.isArray(form.ingredients) || form.ingredients.length === 0) {
          toast.error("Vui long chon it nhat mot nguyen lieu");
          return;
        }

        // prepare payload: coerce numeric fields
        const payload = {
          ...form,
          price: priceNum,
          stock: Number(form.stock) || 0,
          defaultImageIndex: Number(form.defaultImageIndex) || 0,
          ingredients: (form.ingredients || []).map((it) => ({
            ingredient: it.ingredient || "",
            quantityGram: Number(it.quantityGram) || 0,
          })),
          imageUrls: Array.isArray(form.imageUrls) ? form.imageUrls : [],
          imagePublicIds: Array.isArray(form.imagePublicIds)
            ? form.imagePublicIds
            : [],
        };
        const res = onSubmit(payload);
        if (res && res.then) await res;
        // update snapshot to current saved state
        const snap = {
          ...payload,
          price: String(payload.price || 0),
          ingredients: (payload.ingredients || []).map((it) => ({
            ingredient: it.ingredient,
            quantityGram: String(it.quantityGram || 0),
          })),
          imageUrls: payload.imageUrls || [],
          imagePublicIds: payload.imagePublicIds || [],
        };
        setInitialSnapshot(snap);
        setForm((s) => ({ ...s, ...snap }));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div
        ref={modalRef}
        className="relative bg-white rounded-xl py-4 px-6 w-full max-w-6xl max-h-[90vh] overflow-auto"
      >
        <button
          onClick={handleClose}
          disabled={uploading || saving || deleting}
          title="Đóng"
          aria-label="Đóng"
          className={`absolute right-4 top-4 p-2 rounded-full bg-white shadow transition ${
            {
              true: "",
            }[true]
          } ${
            uploading || saving || deleting
              ? "opacity-50 cursor-not-allowed"
              : "hover:bg-gray-100"
          }`}
        >
          <img src={assets.xIcon} alt="Đóng" className="w-4 h-4" />
        </button>

        <h3 className="text-lg font-semibold mb-4">
          {initialData ? "Sửa món" : "Thêm món"}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex flex-col">
            <span className="text-sm text-gray-600">Tên</span>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="border rounded px-3 py-2"
            />
          </label>

          <label className="flex flex-col">
            <span className="text-sm text-gray-600">Danh mục</span>
            {categories && categories.length > 0 ? (
              <select
                value={form.category || ""}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="border rounded px-3 py-2"
              >
                <option value="">Chọn danh mục</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={form.category || ""}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="border rounded px-3 py-2"
              />
            )}
          </label>

          <label className="flex flex-col">
            <span className="text-sm text-gray-600">Giá</span>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="border rounded px-3 py-2"
            />
          </label>

          <label className="flex flex-col">
            <span className="text-sm text-gray-600">Số lượng</span>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: e.target.value })}
              className="border rounded px-3 py-2"
            />
          </label>

          {/* Description spans both columns */}
          <div className="md:col-span-2">
            <label className="flex flex-col">
              <span className="text-sm text-gray-600">Mô tả</span>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className="border rounded px-3 py-2 h-24 resize-none"
              />
            </label>
          </div>

          {/* Image area spans both columns */}
          <div className="md:col-span-2">
            <div className="text-sm text-gray-600 mb-2">Ảnh</div>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={onPickFiles}
            />

            <div
              id="image-dropzone"
              onClick={() => fileRef.current && fileRef.current.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
              className={`border-dashed border-2 rounded p-4 cursor-pointer ${
                uploading ? "opacity-60" : "hover:bg-gray-50"
              }`}
            >
              <div className="text-gray-600">
                Kéo thả ảnh vào đây để tải lên
              </div>
              <div className="text-sm text-gray-400 mt-1">
                Tối đa {MAX_FILES} ảnh
              </div>

              <div className="mt-3 grid grid-cols-4 gap-3">
                {(form.imageUrls || []).map((u, i) => (
                  <div
                    key={i}
                    className={`relative group w-full h-32 bg-gray-100 rounded overflow-hidden transform transition-transform hover:scale-105 ${
                      i === form.defaultImageIndex
                        ? "border-2 border-green-600"
                        : ""
                    }`}
                  >
                    <img
                      src={u}
                      alt={`img-${i}`}
                      className={`w-full h-full object-cover ${
                        i === form.defaultImageIndex
                          ? "ring-4 ring-green-500 ring-offset-2 ring-offset-white"
                          : ""
                      }`}
                    />

                    {/* Pulse overlay when user sets this image as default */}
                    {i === form.defaultImageIndex && defaultPulse === i && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="block w-10 h-10 bg-green-500 rounded-full opacity-40 animate-ping" />
                      </div>
                    )}

                    {/* Delete button - top-right, appears on hover */}
                    <button
                      title="Xóa"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImageAt(i);
                      }}
                      className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transform group-hover:scale-110 transition bg-white p-2 rounded-full text-red-600 shadow"
                      aria-label="Xóa ảnh"
                    >
                      <img src={assets.xIcon} alt="Xóa" className="w-3 h-3" />
                    </button>

                    {/* Centered default button + caption (only on hover) */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="flex flex-col items-center opacity-0 group-hover:opacity-100 transition">
                        <button
                          title={
                            i === form.defaultImageIndex
                              ? "Mặc định"
                              : "Đặt mặc định"
                          }
                          onClick={(e) => {
                            e.stopPropagation();
                            setDefaultImage(i);
                          }}
                          className={`pointer-events-auto bg-white p-2 rounded-full ${
                            i === form.defaultImageIndex
                              ? "text-yellow-500 shadow-lg"
                              : "text-green-600"
                          }`}
                          aria-label="Đặt ảnh mặc định"
                        >
                          {i === form.defaultImageIndex ? (
                            <img
                              src={assets.starIcon}
                              alt="default"
                              className="w-6 h-6"
                            />
                          ) : (
                            <img
                              src={assets.star1Icon}
                              alt="set-default"
                              className="w-6 h-6"
                            />
                          )}
                        </button>

                        {/* Top-centered note overlay for non-default images */}
                        {i !== form.defaultImageIndex && (
                          <div className="absolute top-2 left-1/2 -translate-x-1/2 hidden group-hover:flex z-20">
                            <div className="text-xs text-gray-800 bg-white px-2 py-1 rounded shadow">
                              Đặt làm mặc định
                            </div>
                          </div>
                        )}

                        {/* Small badge for already-default images */}
                        {i === form.defaultImageIndex && (
                          <div className="absolute top-2 left-2 z-20">
                            <div className="text-xs bg-green-500 text-white px-2 py-0.5 rounded">
                              Mặc định
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {Array.from({
                  length: Math.max(
                    0,
                    MAX_FILES - (form.imageUrls || []).length
                  ),
                }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="flex items-center justify-center h-32 bg-white/50 rounded border border-dashed text-gray-300"
                  >
                    +
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="md:col-span-2 w-full">
            <SelectIngredient
              formIngredients={form.ingredients}
              ingredientsList={ingredientsList}
              addIngredient={addIngredient}
              updateIngredient={updateIngredient}
              removeIngredient={removeIngredient}
              openPickerIndex={openPickerIndex}
              setOpenPickerIndex={setOpenPickerIndex}
              uploading={uploading}
              saving={saving}
              deleting={deleting}
              fullWidth={true}
            />
          </div>

          <div className="flex items-center gap-2 md:col-span-2">
            <Switch
              style={{
                transform: "scale(1.45)",
                transformOrigin: "left center",
              }}
              className="data-[state=checked]:bg-green-700 data-[state=checked]:border-green-800 bg-gray-200 border-gray-200"
              checked={form.status === "active"}
              onCheckedChange={(val) =>
                setForm((s) => ({ ...s, status: val ? "active" : "inactive" }))
              }
            />
            <Label className="text-sm text-gray-700 ml-4">Đang hoạt động</Label>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          {initialData && (
            <div>
              {!showDeleteConfirm ? (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Để xóa món, nhấn Xóa và xác nhận.
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
                    Để xóa món, nhập <strong>delete</strong> để xác nhận.
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

          <div className="mt-2 flex justify-end gap-3">
            <button
              onClick={handleClose}
              disabled={uploading || saving || deleting}
              className="px-4 py-2 bg-gray-100 rounded cursor-pointer"
            >
              Hủy
            </button>
            <button
              onClick={handleSave}
              disabled={!isDirty || saving || uploading || deleting}
              className={`px-4 py-2 rounded transition ${
                !isDirty || saving || uploading || deleting
                  ? "bg-gray-300 text-white-600 cursor-not-allowed"
                  : "bg-green-600 text-white hover:bg-green-700 cursor-pointer"
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

export default ProductModal;


