import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import dishApi from "@/api/dishApi";
import categoryApi from "@/api/categoryApi";
import uploadApi from "@/api/uploadApi";
import { assets } from "@/assets/assets";
import IngredientSelectionModal from "@/components/admin-view/dish/IngredientSelectionModal";

const MAX_FILES = 8;

const AdminDishCreate = () => {
  const navigate = useNavigate();
  const accessToken = useSelector((state) => state.auth.accessToken);

  const [categories, setCategories] = useState([]);
  const [showIngredientModal, setShowIngredientModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [defaultPulse, setDefaultPulse] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    description: "",
    price: "",
    imageUrls: [],
    imagePublicIds: [],
    defaultImageIndex: 0,
    status: "active",
  });

  const [selectedIngredients, setSelectedIngredients] = useState([]);

  // Error state
  const [errors, setErrors] = useState({
    name: "",
    category: "",
    price: "",
  });

  // Fetch all categories
  const fetchCategories = async () => {
    try {
      const res = await categoryApi.getAll({ page: 1, limit: 1000 });
      if (res?.data) {
        setCategories(res.data);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast.error("Lỗi tải danh mục");
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Handle file upload
  const handleFiles = async (filesList) => {
    const files = Array.from(filesList || []);
    if (!files.length) return;
    setUploading(true);
    try {
      const token = accessToken || null;
      const remaining = Math.max(
        0,
        MAX_FILES - (formData.imageUrls?.length || 0)
      );
      const toProcess = files.slice(0, remaining);
      for (const f of toProcess) {
        try {
          const res = await uploadApi.uploadImage(f, "product", token);
          const url = res?.data?.url || res?.url || "";
          const publicId = res?.data?.publicId || res?.publicId || null;
          if (url) {
            setFormData((s) => ({
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

  const removeImageAt = async (idx) => {
    const token = accessToken || null;
    const pubId = formData.imagePublicIds?.[idx];
    try {
      if (pubId) await uploadApi.deleteImage(pubId, token);
    } catch (err) {
      console.warn("Failed to delete uploaded image", err);
    }
    setFormData((s) => {
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
    setFormData((s) => ({ ...s, defaultImageIndex: idx }));
    setDefaultPulse(idx);
    setTimeout(() => setDefaultPulse(null), 600);
  };

  // Handle create
  const handleCreate = async () => {
    try {
      // Clear previous errors
      const newErrors = { name: "", category: "", price: "" };

      // Validation
      if (!formData.name || formData.name.trim() === "") {
        newErrors.name = "Vui lòng nhập tên món";
      }
      if (!formData.category) {
        newErrors.category = "Vui lòng chọn danh mục";
      }

      const priceNum = Number(formData.price);
      if (!formData.price || formData.price.trim() === "") {
        newErrors.price = "Vui lòng nhập giá";
      } else if (Number.isNaN(priceNum) || priceNum < 0) {
        newErrors.price = "Giá không hợp lệ";
      }

      // Check if there are any errors
      if (newErrors.name || newErrors.category || newErrors.price) {
        setErrors(newErrors);
        return;
      }

      if (selectedIngredients.length === 0) {
        toast.error("Vui long chon it nhat mot nguyen lieu");
        return;
      }

      const payload = {
        name: formData.name,
        category: formData.category,
        description: formData.description,
        price: priceNum,
        imageUrls: formData.imageUrls,
        imagePublicIds: formData.imagePublicIds,
        defaultImageIndex: formData.defaultImageIndex,
        status: formData.status,
        ingredients: selectedIngredients.map((ing) => ({
          ingredient: ing._id,
          quantityGram: Number(ing.quantityGram) || 0,
        })),
      };

      await dishApi.create(accessToken, payload);
      toast.success("Tạo món thành công!");
      navigate("/admin/dishes");
    } catch (error) {
      console.error("Error creating dish:", error);
      const errorMessage = error?.response?.data?.message || "Lỗi tạo món";
      
      // Check if error is about duplicate name
      if (errorMessage.includes("already exists") || errorMessage.toLowerCase().includes("tên") || errorMessage.toLowerCase().includes("tồn tại")) {
        setErrors((prev) => ({ ...prev, name: "Tên món đã tồn tại" }));
      }
    }
  };

  // Add ingredients to selection
  const addIngredients = (ingredients) => {
    const newIngredients = ingredients.filter(
      (newIng) => !selectedIngredients.find((ing) => ing._id === newIng._id)
    );

    if (newIngredients.length === 0) {
      toast.info("Nguyên liệu đã được chọn");
      return;
    }

    setSelectedIngredients([...selectedIngredients, ...newIngredients]);
    toast.success(`Đã thêm ${newIngredients.length} nguyên liệu`);
  };

  // Update ingredient field
  const updateIngredientField = (ingredientId, field, value) => {
    setSelectedIngredients((prev) =>
      prev.map((ing) =>
        ing._id === ingredientId ? { ...ing, [field]: value } : ing
      )
    );
  };

  // Remove ingredient from selection
  const removeIngredient = (ingredientId) => {
    setSelectedIngredients((prev) =>
      prev.filter((ing) => ing._id !== ingredientId)
    );
  };

  return (
    <main className="bg-gray-50 min-h-screen p-6">
      {/* Header - Sticky */}
      <div className="sticky top-0 z-50 bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Thêm món mới</h1>
            <p className="text-gray-500 mt-1">Điền thông tin để tạo món mới</p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => navigate("/admin/dishes")}
              className="cursor-pointer"
            >
              Hủy
            </Button>
            <Button
              onClick={handleCreate}
              disabled={uploading}
              className="bg-green-600 hover:bg-green-700 cursor-pointer"
            >
              Tạo món
            </Button>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Basic Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Thông tin cơ bản</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Tên món <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    if (errors.name) setErrors({ ...errors, name: "" });
                  }}
                  placeholder="Nhập tên món..."
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                    errors.name ? "border-red-500" : ""
                  }`}
                />
                {errors.name && (
                  <p className="text-red-500 text-xs mt-1">{errors.name}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Danh mục <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => {
                      setFormData({ ...formData, category: e.target.value });
                      if (errors.category) setErrors({ ...errors, category: "" });
                    }}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 cursor-pointer ${
                      errors.category ? "border-red-500" : ""
                    }`}
                  >
                    <option value="">Chọn danh mục</option>
                    {categories.map((cat) => (
                      <option key={cat._id} value={cat._id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  {errors.category && (
                    <p className="text-red-500 text-xs mt-1">{errors.category}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Giá (VNĐ) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.price}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Only allow numbers
                      if (value === "" || /^\d+$/.test(value)) {
                        setFormData({ ...formData, price: value });
                        if (errors.price) setErrors({ ...errors, price: "" });
                      }
                    }}
                    placeholder="0"
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      errors.price ? "border-red-500" : ""
                    }`}
                  />
                  {errors.price && (
                    <p className="text-red-500 text-xs mt-1">{errors.price}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Mô tả</label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Nhập mô tả món..."
                  rows={4}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Images */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Hình ảnh</h2>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              id="file-upload"
              onChange={onPickFiles}
            />
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
              className={`border-2 border-dashed rounded-lg p-8 text-center ${
                uploading ? "opacity-60" : "hover:bg-gray-50 cursor-pointer"
              }`}
              onClick={() => document.getElementById("file-upload").click()}
            >
              <div className="text-gray-600">
                Kéo thả ảnh vào đây để tải lên
              </div>
              <div className="text-sm text-gray-400 mt-1">
                Tối đa {MAX_FILES} ảnh
              </div>

              <div className="mt-6 grid grid-cols-4 gap-4">
                {(formData.imageUrls || []).map((u, i) => (
                  <div
                    key={i}
                    className={`relative group w-full h-32 bg-gray-100 rounded overflow-hidden transform transition-transform hover:scale-105 ${
                      i === formData.defaultImageIndex
                        ? "border-2 border-green-600"
                        : ""
                    }`}
                  >
                    <img
                      src={u}
                      alt={`img-${i}`}
                      className={`w-full h-full object-cover ${
                        i === formData.defaultImageIndex
                          ? "ring-4 ring-green-500 ring-offset-2 ring-offset-white"
                          : ""
                      }`}
                    />

                    {i === formData.defaultImageIndex && defaultPulse === i && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="block w-10 h-10 bg-green-500 rounded-full opacity-40 animate-ping" />
                      </div>
                    )}

                    <button
                      title="Xóa"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImageAt(i);
                      }}
                      className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transform group-hover:scale-110 transition bg-white p-2 rounded-full text-red-600 shadow"
                    >
                      <img src={assets.xIcon} alt="Xóa" className="w-3 h-3" />
                    </button>

                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="flex flex-col items-center opacity-0 group-hover:opacity-100 transition">
                        <button
                          title={
                            i === formData.defaultImageIndex
                              ? "Mặc định"
                              : "Đặt mặc định"
                          }
                          onClick={(e) => {
                            e.stopPropagation();
                            setDefaultImage(i);
                          }}
                          className={`pointer-events-auto bg-white p-2 rounded-full ${
                            i === formData.defaultImageIndex
                              ? "text-yellow-500 shadow-lg"
                              : "text-green-600"
                          }`}
                        >
                          {i === formData.defaultImageIndex ? (
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

                        {i !== formData.defaultImageIndex && (
                          <div className="absolute top-2 left-1/2 -translate-x-1/2 hidden group-hover:flex z-20">
                            <div className="text-xs text-gray-800 bg-white px-2 py-1 rounded shadow">
                              Đặt làm mặc định
                            </div>
                          </div>
                        )}

                        {i === formData.defaultImageIndex && (
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
                    MAX_FILES - (formData.imageUrls || []).length
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

          {/* Ingredients */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Nguyên liệu</h2>
              <Button
                onClick={() => setShowIngredientModal(true)}
                variant="outline"
                className="border-green-600 text-green-700 hover:bg-green-50 cursor-pointer"
              >
                + Thêm nguyên liệu
              </Button>
            </div>

            {selectedIngredients.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                Chưa có nguyên liệu nào được chọn
              </div>
            ) : (
              <div className="space-y-3">
                {selectedIngredients.map((ing) => (
                  <div
                    key={ing._id}
                    className="flex items-center gap-4 p-4 border rounded-lg hover:border-green-500 transition-colors"
                  >
                    {/* Ingredient Image */}
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      {ing.imageUrl ? (
                        <img
                          src={ing.imageUrl}
                          alt={ing.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                          No image
                        </div>
                      )}
                    </div>

                    <div className="flex-1">
                      <p className="font-medium">{ing.name}</p>
                      <p className="text-sm text-gray-500">
                        {ing.energyKcal || 0} kcal / 100g
                      </p>
                    </div>
                    <div className="w-32">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={ing.quantityGram}
                          onChange={(e) => {
                            const value = e.target.value;
                            // Only allow numbers
                            if (value === "" || /^\d+$/.test(value)) {
                              updateIngredientField(
                                ing._id,
                                "quantityGram",
                                value
                              );
                            }
                          }}
                          className="w-full px-2 py-1 border rounded text-sm"
                          placeholder="Gram"
                        />
                        <span className="text-sm text-gray-500">g</span>
                      </div>
                    </div>
                    <button
                      onClick={() => removeIngredient(ing._id)}
                      className="text-red-600 hover:text-red-800 cursor-pointer"
                    >
                      Xóa
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Status */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Trạng thái</h2>
            <div className="flex items-center gap-3">
              <Switch
                checked={formData.status === "active"}
                onCheckedChange={(val) =>
                  setFormData((s) => ({
                    ...s,
                    status: val ? "active" : "inactive",
                  }))
                }
                className="data-[state=checked]:bg-green-600"
              />
              <Label>
                {formData.status === "active" ? "Hoạt động" : "Ngừng bán"}
              </Label>
            </div>
          </div>
        </div>
      </div>

      {/* Ingredient Selection Modal */}
      <IngredientSelectionModal
        open={showIngredientModal}
        onClose={() => setShowIngredientModal(false)}
        onSelectIngredients={addIngredients}
        alreadySelectedIngredients={selectedIngredients.map((i) => i._id)}
      />
    </main>
  );
};

export default AdminDishCreate;


