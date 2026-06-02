import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import flashsaleApi from "@/api/flashsaleApi";
import { toast } from "sonner";
import DishSelectionModal from "@/components/admin-view/flashsale/DishSelectionModal";
import FlashSaleStatistics from "@/components/admin-view/flashsale/FlashSaleStatistics";
import dishApi from "@/api/dishApi";

const AdminFlashSaleDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const accessToken = useSelector((state) => state.auth.accessToken);

  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [flashSale, setFlashSale] = useState(null);
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
    dishes: [],
  });

  const [selectedDishes, setSelectedDishes] = useState([]);

  // Fetch flash sale detail
  const fetchFlashSaleDetail = async () => {
    try {
      setLoading(true);
      const res = await flashsaleApi.getById(id);
      if (res.success) {
        const fs = res.data;
        setFlashSale(fs);
        setFormData({
          title: fs.title,
          startTime: new Date(fs.startTime).toISOString().slice(0, 16),
          endTime: new Date(fs.endTime).toISOString().slice(0, 16),
          description: fs.description || "",
          dishes: fs.dishes || [],
        });
        setSelectedDishes(
          (fs.dishes || [])
            .filter((d) => {
              // Chỉ filter out dishes inactive khi Flash Sale đang diễn ra hoặc sắp diễn ra
              // Nếu đã kết thúc, hiển thị tất cả (kể cả inactive)
              if (fs.status === "ended") {
                return true; // Hiển thị tất cả món khi đã kết thúc
              }
              // Với upcoming và active, chỉ hiển thị món active
              const dishStatus = d.dish_id?.status;
              return dishStatus === "active";
            })
            .map((d) => ({
              dish_id: d.dish_id?._id || d.dish_id,
              dishName: d.dish_id?.name || "N/A",
              originalPrice: d.originalPrice,
              salePrice: d.salePrice,
              stock: d.stock,
              dishStatus: d.dish_id?.status, // Track status for display
            }))
        );

        // Show warning if any dishes were filtered out (chỉ với upcoming/active)
        if (fs.status !== "ended") {
          const inactiveDishes = (fs.dishes || []).filter(
            (d) => d.dish_id?.status !== "active"
          );
          if (inactiveDishes.length > 0) {
            toast.warning(
              `${inactiveDishes.length} sản phẩm đã ngừng bán và sẽ không hiển thị trong Flash Sale`,
              { duration: 5000 }
            );
          }
        }
      }
    } catch (error) {
      console.error("Error fetching flash sale:", error);
      toast.error("Lỗi tải thông tin Flash Sale");
      navigate("/admin/flash-sale");
    } finally {
      setLoading(false);
    }
  };

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
    if (id) {
      fetchFlashSaleDetail();
    }
  }, [id]);

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

  // Handle save
  const handleSave = async () => {
    if (!formData.title || !formData.startTime || !formData.endTime) {
      toast.error("Vui lòng điền đầy đủ thông tin");
      return;
    }

    if (selectedDishes.length === 0) {
      toast.error("Vui lòng chọn ít nhất 1 sản phẩm");
      return;
    }

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
      await flashsaleApi.update(accessToken, id, payload);
      toast.success("Cập nhật Flash Sale thành công");
      setIsEditing(false);
      fetchFlashSaleDetail();
    } catch (error) {
      console.error("Error updating flash sale:", error);
      toast.error("Lỗi cập nhật Flash Sale");
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!window.confirm("Bạn có chắc muốn xóa Flash Sale này?")) return;

    try {
      await flashsaleApi.remove(accessToken, id);
      toast.success("Xóa Flash Sale thành công");
      navigate("/admin/flash-sale");
    } catch (error) {
      console.error("Error deleting flash sale:", error);
      toast.error("Lỗi xóa Flash Sale");
    }
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setIsEditing(false);
    if (flashSale) {
      setFormData({
        title: flashSale.title,
        startTime: new Date(flashSale.startTime).toISOString().slice(0, 16),
        endTime: new Date(flashSale.endTime).toISOString().slice(0, 16),
        description: flashSale.description || "",
        dishes: flashSale.dishes || [],
      });
      setSelectedDishes(
        (flashSale.dishes || [])
          .filter((d) => {
            // Same logic: chỉ filter khi upcoming/active
            if (flashSale.status === "ended") {
              return true;
            }
            return d.dish_id?.status === "active";
          })
          .map((d) => ({
            dish_id: d.dish_id?._id || d.dish_id,
            dishName: d.dish_id?.name || "N/A",
            originalPrice: d.originalPrice,
            salePrice: d.salePrice,
            stock: d.stock,
            dishStatus: d.dish_id?.status,
          }))
      );
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
        originalPrice: dish.price,
        salePrice: Math.round(dish.price * 0.8),
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

  const getStatusBadge = (status) => {
    const badges = {
      upcoming: "bg-green-100 text-green-800",
      active: "bg-green-100 text-green-800",
      ended: "bg-gray-100 text-gray-800",
    };
    const labels = {
      upcoming: "Sắp diễn ra",
      active: "Đang diễn ra",
      ended: "Đã kết thúc",
    };
    return (
      <span
        className={`px-3 py-1 rounded-full text-sm font-medium ${badges[status]}`}
      >
        {labels[status]}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!flashSale) {
    return (
      <div className="p-6">
        <p className="text-center text-gray-500">Không tìm thấy Flash Sale</p>
      </div>
    );
  }

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
            <div className="text-lg font-medium">Chi tiết Flash Sale</div>
            {!isEditing && flashSale && (
              <div className="ml-2">{getStatusBadge(flashSale.status)}</div>
            )}
          </div>

          <div className="flex gap-2">
            {!isEditing ? (
              <>
                {/* Cho phép chỉnh sửa khi sắp diễn ra HOẶC đang diễn ra */}
                {flashSale.status === "upcoming" ||
                flashSale.status === "active" ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-3 py-2 bg-gray-100 rounded-lg transition hover:bg-gray-200 cursor-pointer"
                  >
                    Chỉnh sửa
                  </button>
                ) : (
                  <button
                    disabled
                    className="px-3 py-2 bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed"
                    title="Không thể chỉnh sửa Flash Sale đã kết thúc"
                  >
                    Chỉnh sửa
                  </button>
                )}

                {/* Cho phép xóa khi sắp diễn ra hoặc đã kết thúc (không cho xóa đang diễn ra) */}
                {flashSale.status !== "active" ? (
                  <button
                    onClick={handleDelete}
                    className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition cursor-pointer"
                  >
                    Xóa
                  </button>
                ) : (
                  <button
                    disabled
                    className="px-3 py-2 bg-red-50 text-red-300 rounded-lg cursor-not-allowed"
                    title="Không thể xóa Flash Sale đang diễn ra"
                  >
                    Xóa
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  onClick={handleCancelEdit}
                  className="px-3 py-2 bg-gray-100 rounded-lg transition hover:bg-gray-200 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSave}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition cursor-pointer"
                >
                  Lưu thay đổi
                </button>
              </>
            )}
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
      <section className="pb-16 w-full px-4">
        {/* Statistics Section - Only show when not editing and status is active or ended */}
        {!isEditing &&
          flashSale &&
          (flashSale.status === "active" || flashSale.status === "ended") && (
            <FlashSaleStatistics
              flashSaleId={flashSale._id}
              flashSaleStatus={flashSale.status}
            />
          )}

        <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">
              Tên chương trình
            </label>
            {isEditing ? (
              <input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="VD: Flash Sale cuối tuần"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400 transition"
              />
            ) : (
              <p className="text-xl font-semibold text-gray-900">
                {flashSale.title}
              </p>
            )}
          </div>

          {/* Time Range */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">
                Thời gian bắt đầu
              </label>
              {isEditing ? (
                <input
                  type="datetime-local"
                  value={formData.startTime}
                  onChange={(e) =>
                    setFormData({ ...formData, startTime: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400 transition"
                />
              ) : (
                <p className="text-lg text-gray-900">
                  {new Date(flashSale.startTime).toLocaleString("vi-VN")}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">
                Thời gian kết thúc
              </label>
              {isEditing ? (
                <input
                  type="datetime-local"
                  value={formData.endTime}
                  onChange={(e) =>
                    setFormData({ ...formData, endTime: e.target.value })
                  }
                  disabled={!formData.startTime}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400 transition cursor-pointer disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              ) : (
                <p className="text-lg text-gray-900">
                  {new Date(flashSale.endTime).toLocaleString("vi-VN")}
                </p>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">
              Mô tả
            </label>
            {isEditing ? (
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-gray-400 transition"
                placeholder="Mô tả về chương trình Flash Sale..."
              />
            ) : (
              <p className="text-gray-700 whitespace-pre-wrap">
                {flashSale.description || "Không có mô tả"}
              </p>
            )}
          </div>

          {/* Products */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Danh sách sản phẩm ({selectedDishes.length})
                {flashSale &&
                  flashSale.dishes &&
                  flashSale.status !== "ended" &&
                  flashSale.dishes.length > selectedDishes.length && (
                    <span className="ml-2 text-xs text-orange-600 font-normal">
                      ({flashSale.dishes.length - selectedDishes.length} sản
                      phẩm đã ngừng bán và bị ẩn)
                    </span>
                  )}
              </label>
              {isEditing && (
                <button
                  onClick={() => setShowDishModal(true)}
                  className="px-3 py-2 bg-gray-100 rounded-lg transition hover:bg-gray-200 cursor-pointer"
                >
                  + Thêm sản phẩm
                </button>
              )}
            </div>

            <div className="space-y-3">
              {selectedDishes.length === 0 ? (
                <p className="text-gray-500 text-center py-8 bg-gray-50 rounded-lg">
                  Chưa có sản phẩm nào
                </p>
              ) : (
                selectedDishes.map((dish) => (
                  <div
                    key={dish.dish_id}
                    className={`flex items-center gap-4 p-4 border rounded-lg ${
                      dish.dishStatus === "inactive"
                        ? "border-orange-200 bg-orange-50/50 opacity-75"
                        : "border-gray-200 bg-gray-50"
                    }`}
                  >
                    <div className="flex-1 font-medium text-gray-900">
                      {dish.dishName}
                      {dish.dishStatus === "inactive" && (
                        <span className="ml-2 text-xs px-2 py-1 bg-orange-200 text-orange-800 rounded">
                          Đã ngừng bán
                        </span>
                      )}
                    </div>

                    {isEditing ? (
                      <>
                        <div className="flex items-center gap-2">
                          <label className="text-sm text-gray-600 w-20">
                            Giá gốc:
                          </label>
                          <input
                            type="number"
                            value={dish.originalPrice}
                            onChange={(e) =>
                              updateDishField(
                                dish.dish_id,
                                "originalPrice",
                                e.target.value
                              )
                            }
                            className="w-32 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400 transition"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-sm text-gray-600 w-20">
                            Giá sale:
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
                            className="w-32 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400 transition"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-sm text-gray-600 w-20">
                            Số lượng:
                          </label>
                          <input
                            type="number"
                            value={dish.stock}
                            onChange={(e) =>
                              updateDishField(
                                dish.dish_id,
                                "stock",
                                e.target.value
                              )
                            }
                            className="w-24 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400 transition"
                          />
                        </div>
                        <button
                          onClick={() => removeDish(dish.dish_id)}
                          className="px-3 py-1 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"
                        >
                          Xóa
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">Giá gốc:</span>{" "}
                          {dish.originalPrice?.toLocaleString("vi-VN")}₫
                        </div>
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">Giá sale:</span>{" "}
                          {dish.salePrice?.toLocaleString("vi-VN")}₫
                        </div>
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">Số lượng:</span>{" "}
                          {dish.stock}
                        </div>
                        <div className="text-sm font-semibold text-green-600">
                          Giảm{" "}
                          {Math.round(
                            ((dish.originalPrice - dish.salePrice) /
                              dish.originalPrice) *
                              100
                          )}
                          %
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default AdminFlashSaleDetail;


