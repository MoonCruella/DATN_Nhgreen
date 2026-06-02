import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import flashsaleApi from "@/api/flashsaleApi";
import dishApi from "@/api/dishApi";
import { toast } from "sonner";
import DishSelectionModal from "@/components/admin-view/flashsale/DishSelectionModal";

const AdminFlashSaleCreate = () => {
  const navigate = useNavigate();
  const accessToken = useSelector((state) => state.auth.accessToken);

  const [allDishes, setAllDishes] = useState([]);
  const [searchDish, setSearchDish] = useState("");
  const [debouncedSearchDish, setDebouncedSearchDish] = useState("");
  const [showDishModal, setShowDishModal] = useState(false);
  const [loadingDishes, setLoadingDishes] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchDish(searchDish);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchDish]);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    startTime: "",
    endTime: "",
    description: "",
  });

  const [selectedDishes, setSelectedDishes] = useState([]);
  const [errors, setErrors] = useState({});

  // Fetch all dishes with search
  const fetchDishes = async () => {
    try {
      setLoadingDishes(true);
      const params = {
        limit: 100,
        status: "active",
        q: debouncedSearchDish || undefined,
      };
      Object.keys(params).forEach(
        (key) => params[key] === undefined && delete params[key]
      );
      const res = await dishApi.getAll(params);
      console.log(
        "Fetched dishes for flash sale:",
        res.data.dishes || res.data || []
      );
      if (res.success) {
        setAllDishes(res.data.dishes || res.data || []);
      }
    } catch (error) {
      console.error("Error fetching dishes:", error);
    } finally {
      setLoadingDishes(false);
    }
  };

  useEffect(() => {
    // Only fetch when modal is open
    if (showDishModal) {
      fetchDishes();
    }
  }, [debouncedSearchDish, showDishModal]);

  // Reset search when closing modal
  const handleCloseModal = () => {
    setShowDishModal(false);
    setSearchDish("");
  };

  // Handle create
  const handleCreate = async () => {
    const newErrors = {};

    if (!formData.title) {
      newErrors.title = "Vui lòng nhập tên chương trình";
    }
    if (!formData.startTime) {
      newErrors.startTime = "Vui lòng chọn thời gian bắt đầu";
    }
    if (!formData.endTime) {
      newErrors.endTime = "Vui lòng chọn thời gian kết thúc";
    }

    if (selectedDishes.length === 0) {
      newErrors.dishes = "Vui lòng chọn ít nhất 1 sản phẩm";
    } else {
      // Validate sale prices
      const invalidDishes = selectedDishes.filter(
        (d) => !d.salePrice || Number(d.salePrice) <= 0
      );
      if (invalidDishes.length > 0) {
        newErrors.dishes = "Vui lòng nhập giá sale cho tất cả sản phẩm";
      }

      // Validate sale price <= original price
      const overPricedDishes = selectedDishes.filter(
        (d) => Number(d.salePrice) >= Number(d.originalPrice)
      );
      if (overPricedDishes.length > 0) {
        newErrors.dishes = "Giá sale phải nhỏ hơn giá gốc";
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});

    const payload = {
      title: formData.title,
      startTime: formData.startTime,
      endTime: formData.endTime,
      description: formData.description,
      dishes: selectedDishes.map((d) => ({
        dish_id: d.dish_id,
        originalPrice: Number(d.originalPrice),
        salePrice: Number(d.salePrice),
        stock: Number(d.stock),
      })),
    };

    try {
      const res = await flashsaleApi.create(accessToken, payload);
      toast.success("Tạo Flash Sale thành công");
      navigate("/admin/flash-sale");
    } catch (error) {
      console.error("Error creating flash sale:", error);
      toast.error(error.response?.data?.message || "Lỗi tạo Flash Sale");
    }
  };

  // Add dishes to selection (can be single or multiple)
  const addDishes = (dishes) => {
    const dishesToAdd = Array.isArray(dishes) ? dishes : [dishes];

    const newDishes = dishesToAdd
      .filter((dish) => !selectedDishes.find((d) => d.dish_id === dish._id))
      .map((dish) => ({
        dish_id: dish._id,
        dishName: dish.name,
        dishImage:
          dish.imageUrls?.[dish.defaultImageIndex || 0] ||
          dish.imageUrls?.[0] ||
          "/placeholder.png",
        originalPrice: dish.price,
        salePrice: "", // Empty string to require user input
        stock: 100,
      }));

    if (newDishes.length === 0) {
      toast.warning("Tất cả sản phẩm đã được chọn");
      return;
    }

    setSelectedDishes([...selectedDishes, ...newDishes]);
    toast.success(`Đã thêm ${newDishes.length} sản phẩm`);
  };

  // Update dish field
  const updateDishField = (dishId, field, value) => {
    setSelectedDishes(
      selectedDishes.map((d) =>
        d.dish_id === dishId ? { ...d, [field]: value } : d
      )
    );
  };

  // Remove dish from selection
  const removeDish = (dishId) => {
    setSelectedDishes(selectedDishes.filter((d) => d.dish_id !== dishId));
  };

  // No client-side filtering - backend handles search via API

  return (
    <main className="bg-gray-50 min-h-screen">
      <section className="w-full px-4 pt-8">
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/admin/flash-sale")}
              className="px-3 py-2 bg-gray-100 rounded-lg transition hover:bg-gray-200 cursor-pointer"
            >
              ← Quay lại
            </button>
            <div className="text-lg font-medium">Tạo Flash Sale mới</div>
          </div>
          <button
            onClick={handleCreate}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition cursor-pointer"
          >
            Tạo Flash Sale
          </button>
        </div>
      </section>

      <section className="pb-16 w-full px-4">
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">
              Tên chương trình <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => {
                setFormData({ ...formData, title: e.target.value });
                setErrors((p) => ({ ...p, title: null }));
              }}
              placeholder="VD: Flash Sale cuối tuần"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400 transition"
            />
            {errors.title && (
              <div className="mt-1 text-xs text-red-600">{errors.title}</div>
            )}
          </div>

          {/* Time Range */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">
                Thời gian bắt đầu <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={formData.startTime}
                onChange={(e) => {
                  setFormData({ ...formData, startTime: e.target.value });
                  setErrors((p) => ({ ...p, startTime: null }));
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400 transition cursor-pointer"
              />
              {errors.startTime && (
                <div className="mt-1 text-xs text-red-600">{errors.startTime}</div>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Chỉ được chọn trong khung giờ 06:00 - 20:00
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">
                Thời gian kết thúc <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={formData.endTime}
                onChange={(e) => {
                  setFormData({ ...formData, endTime: e.target.value });
                  setErrors((p) => ({ ...p, endTime: null }));
                }}
                disabled={!formData.startTime}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400 transition cursor-pointer disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              {errors.endTime && (
                <div className="mt-1 text-xs text-red-600">{errors.endTime}</div>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Chỉ được chọn trong khung giờ 06:00 - 20:00
              </p>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">
              Mô tả
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-gray-400 transition"
              placeholder="Mô tả về chương trình Flash Sale..."
            />
          </div>

          {/* Products */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Danh sách sản phẩm ({selectedDishes.length}) <span className="text-red-500">*</span>
              </label>
              <button
                onClick={() => setShowDishModal(true)}
                className="px-3 py-2 bg-gray-100 rounded-lg transition hover:bg-gray-200 cursor-pointer"
              >
                + Thêm sản phẩm
              </button>
            </div>
            {errors.dishes && (
              <div className="mb-3 text-sm text-red-600">{errors.dishes}</div>
            )}

            <div className="space-y-3">
              {selectedDishes.length === 0 ? (
                <p className="text-gray-500 text-center py-8 bg-gray-50 rounded-lg">
                  Chưa có sản phẩm nào. Vui lòng thêm sản phẩm vào Flash Sale.
                </p>
              ) : (
                selectedDishes.map((dish) => (
                  <div
                    key={dish.dish_id}
                    className="flex items-center gap-4 p-4 border rounded-lg bg-white"
                  >
                    {/* Product Image */}
                    <img
                      src={dish.dishImage}
                      alt={dish.dishName}
                      className="w-16 h-16 object-cover rounded flex-shrink-0"
                    />

                    {/* Product Name */}
                    <div className="flex-1 font-medium text-gray-900">
                      {dish.dishName}
                    </div>

                    {/* Original Price (Read-only) */}
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-600 w-20">
                        Giá gốc:
                      </label>
                      <input
                        type="number"
                        value={dish.originalPrice}
                        readOnly
                        className="w-32 border border-gray-300 rounded-lg px-3 py-2 bg-gray-100 text-gray-600 cursor-not-allowed"
                      />
                    </div>

                    {/* Sale Price (Editable - Required) */}
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-600 w-20">
                        Giá sale: *
                      </label>
                      <input
                        type="number"
                        value={dish.salePrice}
                        onChange={(e) =>
                          updateDishField(
                            dish.dish_id,
                            "salePrice",
                            e.target.value
                          )
                        }
                        placeholder="Nhập giá sale"
                        className={`w-32 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 transition ${
                          !dish.salePrice
                            ? "border-red-300 focus:ring-red-400"
                            : "border-gray-300 focus:ring-gray-400"
                        }`}
                      />
                    </div>

                    {/* Stock */}
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-600 w-20">
                        Số lượng:
                      </label>
                      <input
                        type="number"
                        value={dish.stock}
                        onChange={(e) =>
                          updateDishField(dish.dish_id, "stock", e.target.value)
                        }
                        className="w-24 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400 transition"
                      />
                    </div>

                    {/* Discount Badge */}
                    {dish.salePrice && dish.originalPrice > 0 && (
                      <div className="text-sm font-semibold text-green-600 min-w-[60px] text-center">
                        -
                        {Math.round(
                          ((dish.originalPrice - dish.salePrice) /
                            dish.originalPrice) *
                            100
                        )}
                        %
                      </div>
                    )}

                    {/* Delete Button */}
                    <button
                      onClick={() => removeDish(dish.dish_id)}
                      className="px-3 py-1 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition flex-shrink-0"
                    >
                      Xóa
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      <DishSelectionModal
        open={showDishModal}
        onClose={handleCloseModal}
        dishes={allDishes}
        searchTerm={searchDish}
        setSearchTerm={setSearchDish}
        onSelectDishes={addDishes}
        alreadySelectedDishes={selectedDishes.map((d) => d.dish_id)}
        loading={loadingDishes}
      />
    </main>
  );
};

export default AdminFlashSaleCreate;


