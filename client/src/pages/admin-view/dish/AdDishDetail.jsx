import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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

const AdminDishDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const accessToken = useSelector((state) => state.auth.accessToken);

  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [dish, setDish] = useState(null);
  const [categories, setCategories] = useState([]);
  const [showIngredientModal, setShowIngredientModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [defaultPulse, setDefaultPulse] = useState(null);

  const getTagLabel = (tag) => {
    if (!tag) return "";
    if (typeof tag === "string") return tag;
    if (typeof tag === "object") {
      if (tag.label) return tag.label;
      if (tag.name) return tag.name;
    }
    return String(tag);
  };

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

  // Fetch dish detail
  const fetchDishDetail = async () => {
    try {
      setLoading(true);
      const res = await dishApi.getById(id);
      if (res?.data) {
        const dishData = res.data;
        setDish(dishData);
        setFormData({
          name: dishData.name,
          category:
            typeof dishData.category === "string"
              ? dishData.category
              : dishData.category?._id || "",
          description: dishData.description || "",
          price: String(dishData.price || 0),
          imageUrls: dishData.imageUrls || [],
          imagePublicIds: dishData.imagePublicIds || [],
          defaultImageIndex: dishData.defaultImageIndex || 0,
          status: dishData.status || "active",
        });
        setSelectedIngredients(
          (dishData.ingredients || []).map((ing) => ({
            _id:
              typeof ing.ingredient === "string"
                ? ing.ingredient
                : ing.ingredient?._id || "",
            name: ing.ingredient?.name || "N/A",
            energyKcal: ing.ingredient?.energyKcal || 0,
            imageUrl: ing.ingredient?.imageUrl || "",
            quantityGram: String(ing.quantityGram || 0),
          }))
        );
      }
    } catch (error) {
      console.error("Error fetching dish:", error);
      toast.error("Lỗi tải thông tin món");
      navigate("/admin/dishes");
    } finally {
      setLoading(false);
    }
  };

  // Fetch all categories
  const fetchCategories = async () => {
    try {
      const res = await categoryApi.getAll({ page: 1, limit: 1000 });
      if (res?.data) {
        setCategories(res.data);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  useEffect(() => {
    // Force scroll to top immediately when component mounts or id changes
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    if (id) {
      fetchDishDetail();
      fetchCategories();
    }
  }, [id]);

  // Handle save
  const handleSave = async () => {
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

    try {
      await dishApi.update(accessToken, id, payload);
      toast.success("Cập nhật món thành công");
      setIsEditing(false);
      fetchDishDetail();
    } catch (error) {
      console.error("Error updating dish:", error);
      const errorMessage = error?.response?.data?.message || "Lỗi cập nhật món";
      
      // Check if error is about duplicate name
      if (errorMessage.includes("already exists") || errorMessage.toLowerCase().includes("tên") || errorMessage.toLowerCase().includes("tồn tại")) {
        setErrors((prev) => ({ ...prev, name: "Tên món đã tồn tại" }));
      }
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!window.confirm("Bạn có chắc muốn xóa món này?")) return;

    try {
      await dishApi.remove(accessToken, id);
      toast.success("Xóa món thành công");
      navigate("/admin/dishes");
    } catch (error) {
      console.error("Error deleting dish:", error);
      toast.error("Lỗi xóa món");
    }
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setIsEditing(false);
    setErrors({ name: "", category: "", price: "" });
    if (dish) {
      setFormData({
        name: dish.name,
        category:
          typeof dish.category === "string"
            ? dish.category
            : dish.category?._id || "",
        description: dish.description || "",
        price: String(dish.price || 0),
        imageUrls: dish.imageUrls || [],
        imagePublicIds: dish.imagePublicIds || [],
        defaultImageIndex: dish.defaultImageIndex || 0,
        status: dish.status || "active",
      });
      setSelectedIngredients(
        (dish.ingredients || []).map((ing) => ({
          _id:
            typeof ing.ingredient === "string"
              ? ing.ingredient
              : ing.ingredient?._id || "",
          name: ing.ingredient?.name || "N/A",
          energyKcal: ing.ingredient?.energyKcal || 0,
          imageUrl: ing.ingredient?.imageUrl || "",
          quantityGram: String(ing.quantityGram || 0),
        }))
      );
    }
  };

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
    if (!isEditing) return;
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

  const getStatusBadge = (status) => {
    const badges = {
      active: "bg-green-100 text-green-800",
      inactive: "bg-red-100 text-red-800",
    };
    const labels = {
      active: "Hoạt động",
      inactive: "Ngừng bán",
    };
    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-medium ${
          badges[status] || "bg-gray-100 text-gray-800"
        }`}
      >
        {labels[status] || status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  if (!dish) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Không tìm thấy món</p>
      </div>
    );
  }

  return (
    <main className="bg-gray-50 min-h-screen p-6">
      {/* Header - Sticky */}
      <div className="sticky top-0 z-50 bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              {isEditing ? "Chỉnh sửa món" : "Chi tiết món"}
            </h1>
            <div className="flex items-center flex-wrap gap-3 mt-2">
              {getStatusBadge(dish.status)}
              <span className="text-sm text-gray-500">
                Đã bán: {dish.soldCount || 0}
              </span>
            </div>
          </div>
          <div className="flex gap-3">
            {!isEditing ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => navigate("/admin/dishes")}
                  className="cursor-pointer"
                >
                  ← Quay lại
                </Button>
                <Button
                  onClick={() => setIsEditing(true)}
                  className="bg-green-600 hover:bg-green-700 cursor-pointer"
                >
                  Chỉnh sửa
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  className="cursor-pointer"
                >
                  Xóa món
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={handleCancelEdit}
                  className="cursor-pointer"
                >
                  Hủy
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={uploading}
                  className="bg-green-600 hover:bg-green-700 cursor-pointer"
                >
                  Lưu thay đổi
                </Button>
              </>
            )}
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
                  disabled={!isEditing}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100 ${
                    errors.name && isEditing ? "border-red-500" : ""
                  }`}
                />
                {errors.name && isEditing && (
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
                    disabled={!isEditing}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100 cursor-pointer ${
                      errors.category && isEditing ? "border-red-500" : ""
                    }`}
                  >
                    <option value="">Chọn danh mục</option>
                    {categories.map((cat) => (
                      <option key={cat._id} value={cat._id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  {errors.category && isEditing && (
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
                      // Only allow numbers when editing
                      if (isEditing) {
                        if (value === "" || /^\d+$/.test(value)) {
                          setFormData({ ...formData, price: value });
                          if (errors.price) setErrors({ ...errors, price: "" });
                        }
                      } else {
                        setFormData({ ...formData, price: value });
                      }
                    }}
                    disabled={!isEditing}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100 ${
                      errors.price && isEditing ? "border-red-500" : ""
                    }`}
                  />
                  {errors.price && isEditing && (
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
                  disabled={!isEditing}
                  rows={4}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none disabled:bg-gray-100"
                />
              </div>
            </div>
          </div>

          {/* Images */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Hình ảnh</h2>
            {isEditing && (
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                id="file-upload"
                onChange={onPickFiles}
              />
            )}
            <div
              onDragOver={(e) => isEditing && e.preventDefault()}
              onDrop={onDrop}
              className={`border-2 border-dashed rounded-lg p-8 ${
                isEditing
                  ? uploading
                    ? "opacity-60"
                    : "hover:bg-gray-50 cursor-pointer"
                  : "bg-gray-50"
              }`}
              onClick={() =>
                isEditing && document.getElementById("file-upload")?.click()
              }
            >
              {isEditing && (
                <>
                  <div className="text-gray-600 text-center">
                    Kéo thả ảnh vào đây để tải lên
                  </div>
                  <div className="text-sm text-gray-400 mt-1 text-center">
                    Tối đa {MAX_FILES} ảnh
                  </div>
                </>
              )}

              <div
                className={`${isEditing ? "mt-6" : ""} grid grid-cols-4 gap-4`}
              >
                {(formData.imageUrls || []).map((u, i) => (
                  <div
                    key={i}
                    className={`relative group w-full h-32 bg-gray-100 rounded overflow-hidden ${
                      isEditing
                        ? "transform transition-transform hover:scale-105"
                        : ""
                    } ${
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

                    {isEditing && (
                      <>
                        {i === formData.defaultImageIndex &&
                          defaultPulse === i && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <span className="block w-10 h-10 bg-green-500 rounded-full opacity-40 animate-ping" />
                            </div>
                          )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeImageAt(i);
                          }}
                          className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transform group-hover:scale-110 transition bg-white p-2 rounded-full text-red-600 shadow"
                        >
                          <img
                            src={assets.xIcon}
                            alt="Xóa"
                            className="w-3 h-3"
                          />
                        </button>

                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="flex flex-col items-center opacity-0 group-hover:opacity-100 transition">
                            <button
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
                      </>
                    )}

                    {!isEditing && i === formData.defaultImageIndex && (
                      <div className="absolute top-2 left-2 z-20">
                        <div className="text-xs bg-green-500 text-white px-2 py-0.5 rounded">
                          Mặc định
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {isEditing &&
                  Array.from({
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
              {isEditing && (
                <Button
                  onClick={() => setShowIngredientModal(true)}
                  variant="outline"
                  className="border-green-600 text-green-700 hover:bg-green-50 cursor-pointer"
                >
                  + Thêm nguyên liệu
                </Button>
              )}
            </div>

            {selectedIngredients.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                Chưa có nguyên liệu nào
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
                    </div>
                    <div className="w-32">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={ing.quantityGram}
                          onChange={(e) => {
                            const value = e.target.value;
                            // Only allow numbers when editing
                            if (isEditing) {
                              if (value === "" || /^\d+$/.test(value)) {
                                updateIngredientField(
                                  ing._id,
                                  "quantityGram",
                                  value
                                );
                              }
                            } else {
                              updateIngredientField(
                                ing._id,
                                "quantityGram",
                                value
                              );
                            }
                          }}
                          disabled={!isEditing}
                          className="w-full px-2 py-1 border rounded text-sm disabled:bg-gray-100"
                          placeholder="Gram"
                        />
                        <span className="text-sm text-gray-500">g</span>
                      </div>
                    </div>
                    {isEditing && (
                      <button
                        onClick={() => removeIngredient(ing._id)}
                        className="text-red-600 hover:text-red-800 cursor-pointer"
                      >
                        Xóa
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Status & Stats */}
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
                disabled={!isEditing}
                className="data-[state=checked]:bg-green-600"
              />
              <Label>
                {formData.status === "active" ? "Hoạt động" : "Ngừng bán"}
              </Label>
            </div>
          </div>

          {/* Stats */}
          {!isEditing && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">Thống kê</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Đã bán:</span>
                  <span className="font-medium">{dish.soldCount || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tổng Kcal:</span>
                  <span className="font-medium">
                    {dish.totalEnergyKcal != null
                      ? `${Math.round(dish.totalEnergyKcal)} kcal`
                      : "-"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Protein:</span>
                  <span className="font-medium">
                    {dish.totalProtein != null
                      ? `${dish.totalProtein.toFixed(1)}g`
                      : "-"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Carbs:</span>
                  <span className="font-medium">
                    {dish.totalCarbs != null
                      ? `${dish.totalCarbs.toFixed(1)}g`
                      : "-"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Fat:</span>
                  <span className="font-medium">
                    {dish.totalFat != null
                      ? `${dish.totalFat.toFixed(1)}g`
                      : "-"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {!isEditing && Array.isArray(dish.tags) && dish.tags.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">Tags</h2>
              <div className="flex flex-wrap gap-2">
                {dish.tags.map((tag, idx) => (
                  <span
                    key={
                      typeof tag === "string"
                        ? tag
                        : tag?._id || tag?.value || idx
                    }
                    className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700"
                  >
                    {getTagLabel(tag)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Ingredient Selection Modal */}
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

export default AdminDishDetail;


