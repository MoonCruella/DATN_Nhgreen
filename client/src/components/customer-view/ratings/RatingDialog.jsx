import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Rate } from "antd";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import ratingApi from "@/api/ratingApi";
import userApi from "@/api/userApi";
import { setUser } from "@/store/auth-slice";

const RatingDialog = ({
  open,
  onClose,
  order,
  accessToken,
  onRatingSubmitted,
  editingRating = null,
}) => {
  const dispatch = useDispatch();
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [ratings, setRatings] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkingExistingRatings, setCheckingExistingRatings] = useState(false);
  const [alreadyRatedItems, setAlreadyRatedItems] = useState([]);
  const [editMode, setEditMode] = useState(false);

  // Ẩn scroll body khi dialog mở
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [open]);

  // Check món đã đánh giá
  useEffect(() => {
    const checkExistingRatings = async () => {
      if (!open || !order?.items || !accessToken || editingRating) return;

      try {
        setCheckingExistingRatings(true);

        const checks = await Promise.all(
          order.items.map((item) =>
            ratingApi
              .checkUserRating(accessToken, item.dish_id, order._id)
              .then((res) => {
                return res;
              })
              .catch(() => ({ success: false, data: { hasRated: false } }))
          )
        );

        const ratedDishIds = checks
          .filter((res) => res.success && res.data.hasRated)
          .map((res, index) => order.items[index].dish_id);

        setAlreadyRatedItems(ratedDishIds);

        if (ratedDishIds.length === order.items.length) {
          toast.info("Bạn đã đánh giá tất cả sản phẩm trong đơn hàng này!");
          onClose();
          return;
        }

        if (ratedDishIds.length > 0) {
          toast.info(
            `${ratedDishIds.length} sản phẩm đã được đánh giá, bạn chỉ cần đánh giá các món còn lại.`
          );
        }
      } catch (err) {
        console.error("Error checking existing ratings:", err);
      } finally {
        setCheckingExistingRatings(false);
      }
    };

    checkExistingRatings();
  }, [open, order, accessToken, editingRating, onClose]);

  // Set default rating 5 sao cho món CHƯA đánh giá
  useEffect(() => {
    if (open && order?.items && !editingRating) {
      const defaultRatings = {};
      order.items.forEach((item) => {
        const dishId = String(item.dish_id?._id || item.dish_id);
        if (!alreadyRatedItems.includes(item.dish_id)) {
          defaultRatings[dishId] = {
            rating: 5,
            content: "",
          };
        }
      });
      setRatings(defaultRatings);
    }
  }, [open, order, alreadyRatedItems, editingRating]);

  // Load editing rating
  useEffect(() => {
    if (open && editingRating) {
      setEditMode(true);

      const dishIdFromRating =
        editingRating.dish_id?._id || editingRating.dish_id;

      const matchingItem = order.items.find((item) => {
        const itemDishId = item.dish_id?._id || item.dish_id;
        const match = String(itemDishId) === String(dishIdFromRating);
        return match;
      });

      if (!matchingItem) {
        toast.error("Không tìm thấy món ăn trong đơn hàng!");
        onClose();
        return;
      }

      const dishId = String(matchingItem.dish_id?._id || matchingItem.dish_id);

      setRatings({
        [dishId]: {
          rating: editingRating.rating,
          content: editingRating.content,
          _id: editingRating._id,
        },
      });

      setCurrentItemIndex(0);
    } else {
      setEditMode(false);
      setCurrentItemIndex(0);
    }
  }, [open, editingRating, order, onClose]);

  // Reset index về món đầu tiên CHƯA đánh giá
  useEffect(() => {
    if (open && !editingRating) {
      const firstUnratedIndex =
        order?.items?.findIndex(
          (item) => !alreadyRatedItems.includes(item.dish_id)
        ) ?? 0;
      setCurrentItemIndex(firstUnratedIndex >= 0 ? firstUnratedIndex : 0);
    }
  }, [open, order, alreadyRatedItems, editingRating]);

  // --- TÍNH TOÁN GIỚI HẠN THỜI GIAN ĐÁNH GIÁ/CHỈNH SỬA ---
  // Lấy ngày hoàn thành đơn hàng
  const completedAt = order?.confirmed_at ? new Date(order.confirmed_at) : null;
  // Lấy ngày tạo đánh giá (nếu đang chỉnh sửa)
  const editingCreatedAt = editingRating?.created_at
    ? new Date(editingRating.created_at)
    : null;
  // Lấy ngày hiện tại (theo server/backend, nhưng ở đây tạm dùng client)
  const now = new Date();

  // Kiểm tra quá hạn đánh giá (7 ngày sau hoàn thành đơn)
  let isRatingExpired = false;
  if (completedAt) {
    const diffDays = (now - completedAt) / (1000 * 60 * 60 * 24);
    isRatingExpired = diffDays > 7;
  }

  // Kiểm tra quá hạn chỉnh sửa (3 ngày sau khi tạo rating)
  let isEditExpired = false;
  if (editMode && editingCreatedAt) {
    const diffDays = (now - editingCreatedAt) / (1000 * 60 * 60 * 24);
    isEditExpired = diffDays > 3;
  }

  // Nếu quá hạn đánh giá thì ẩn dialog luôn
  if (!open || !order || isRatingExpired) return null;

  // Lọc món chưa đánh giá (hoặc món đang edit)
  const itemsToRate =
    editMode && editingRating
      ? [
          order.items.find((item) => {
            const dishId = editingRating.dish_id?._id || editingRating.dish_id;
            return item.dish_id === dishId || item.dish_id?._id === dishId;
          }),
        ].filter(Boolean)
      : order.items.filter((item) => !alreadyRatedItems.includes(item.dish_id));

  // Loading state
  if (checkingExistingRatings && !editMode) {
    return (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
        <div className="bg-white rounded-xl p-8 text-center">
          <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Đang kiểm tra trạng thái đánh giá...</p>
        </div>
      </div>
    );
  }

  // Không còn món nào để đánh giá
  if (itemsToRate.length === 0) {
    return null;
  }

  const currentItem = itemsToRate[currentItemIndex];
  const totalItems = itemsToRate.length;
  const isLastItem = currentItemIndex === totalItems - 1 || editMode;

  const handleRatingChange = (value) => {
    const dishId = String(currentItem.dish_id?._id || currentItem.dish_id);
    setRatings((prev) => ({
      ...prev,
      [dishId]: {
        ...prev[dishId],
        rating: value,
      },
    }));
  };

  const handleContentChange = (e) => {
    const dishId = String(currentItem.dish_id?._id || currentItem.dish_id);
    setRatings((prev) => ({
      ...prev,
      [dishId]: {
        ...prev[dishId],
        content: e.target.value,
      },
    }));
  };

  const handleNext = () => {
    const dishId = String(currentItem.dish_id?._id || currentItem.dish_id);
    const currentRating = ratings[dishId];

    if (!currentRating?.rating) {
      toast.warning("Vui lòng chọn số sao!");
      return;
    }

    if (!currentRating?.content?.trim()) {
      toast.warning("Vui lòng nhập nội dung đánh giá!");
      return;
    }

    // Validate min 10 ký tự
    if (currentRating.content.trim().length < 10) {
      toast.warning("Nội dung đánh giá phải có ít nhất 10 ký tự!");
      return;
    }

    if (isLastItem) {
      handleSubmitAll();
    } else {
      setCurrentItemIndex((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentItemIndex > 0) {
      setCurrentItemIndex((prev) => prev - 1);
    }
  };

  const handleSubmitAll = async () => {
    try {
      setIsSubmitting(true);

      if (editMode && editingRating) {
        const dishId = String(
          editingRating.dish_id?._id || editingRating.dish_id
        );
        const ratingData = ratings[dishId];
        if (!ratingData) {
          toast.error("Dữ liệu đánh giá không hợp lệ!");
          return;
        }
        // Update existing rating
        await ratingApi.update(accessToken, editingRating._id, {
          content: ratingData.content,
          rating: ratingData.rating,
        });
        toast.success("Cập nhật đánh giá thành công!");
      } else {
        // CREATE MODE: Submit tất cả
        const ratingsToSubmit = Object.entries(ratings)
          .filter(([dishId]) => !alreadyRatedItems.includes(dishId))
          .map(([dishId, data]) => ({
            dish_id: dishId,
            order_id: order._id,
            content: data.content,
            rating: data.rating,
          }));

        if (ratingsToSubmit.length === 0) {
          toast.warning("Không có đánh giá nào để gửi!");
          return;
        }

        const results = await Promise.all(
          ratingsToSubmit.map((ratingData) =>
            ratingApi.create(accessToken, ratingData)
          )
        );

        const totalCoins = ratingsToSubmit.length * 200;
        toast.success(
          `Đánh giá ${ratingsToSubmit.length} sản phẩm thành công! Bạn nhận được ${totalCoins} xu. Cảm ơn bạn đã góp ý.`
        );

        // Refresh user data to update coin balance in Redux store
        try {
          const updatedUser = await userApi.getMyProfile(accessToken);
          if (updatedUser?.data) {
            dispatch(setUser(updatedUser.data));
          }
        } catch (refreshError) {
          console.error("Failed to refresh user data:", refreshError);
          // Don't show error to user since rating was successful
        }
      }

      if (onRatingSubmitted) {
        onRatingSubmitted();
      }

      onClose();
      setRatings({});
      setCurrentItemIndex(0);
      setAlreadyRatedItems([]);
      setEditMode(false);
    } catch (err) {
      console.error("Error submitting ratings:", err);
      toast.error(err.message || "Có lỗi khi gửi đánh giá. Vui lòng thử lại!");
      console.error("❌ Error response:", err.response?.data);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    onClose();
    setRatings({});
    setCurrentItemIndex(0);
    setAlreadyRatedItems([]);
    setEditMode(false);
  };

  const dishIdKey = String(
    currentItem?.dish_id?._id || currentItem?.dish_id || ""
  );
  const currentRating = ratings[dishIdKey] || {
    rating: 5,
    content: "",
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div
        className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10 rounded-t-xl">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">
              {editMode ? "Chỉnh sửa đánh giá" : "Đánh giá sản phẩm"}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {editMode ? (
                "Cập nhật đánh giá của bạn"
              ) : (
                <>
                  Sản phẩm {currentItemIndex + 1}/{totalItems}
                  {alreadyRatedItems.length > 0 && (
                    <span className="ml-2 text-green-600">
                      ({alreadyRatedItems.length} đã đánh giá)
                    </span>
                  )}
                </>
              )}
            </p>
            {!editMode && (
              <div className="flex items-center gap-1 mt-1 text-yellow-600">
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <circle cx="12" cy="12" r="10" fill="#FFD700" />
                  <text
                    x="12"
                    y="16"
                    fontSize="12"
                    fontWeight="bold"
                    textAnchor="middle"
                    fill="#B8860B"
                  >
                    ₫
                  </text>
                </svg>
                <span className="text-xs font-medium">
                  +200 xu cho mỗi đánh giá
                </span>
              </div>
            )}
          </div>
          <button
            onClick={handleSkip}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 transition cursor-pointer disabled:cursor-not-allowed"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Product Info */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <img
              src={currentItem?.dish_image || "/placeholder-dish.jpg"}
              alt={currentItem?.dish_name}
              className="w-20 h-20 object-cover rounded-lg"
              onError={(e) => {
                e.target.src = "/placeholder-dish.jpg";
              }}
            />
            <div className="flex-1">
              <p className="font-medium text-gray-800 text-lg">
                {currentItem?.dish_name}
              </p>
              <p className="text-sm text-gray-500">
                Số lượng: {currentItem?.quantity}
              </p>
            </div>
          </div>

          {/* Rating */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">
              Chất lượng sản phẩm
            </label>
            <div className="flex items-center gap-4">
              <Rate
                value={currentRating.rating}
                onChange={handleRatingChange}
                className="text-3xl"
                disabled={isSubmitting}
              />
              <span className="text-sm text-gray-600">
                {currentRating.rating === 5
                  ? "Tuyệt vời"
                  : currentRating.rating === 4
                  ? "Hài lòng"
                  : currentRating.rating === 3
                  ? "Bình thường"
                  : currentRating.rating === 2
                  ? "Không hài lòng"
                  : "Tệ"}
              </span>
            </div>
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">
              Chia sẻ thêm về sản phẩm (bắt buộc)
            </label>
            <textarea
              value={currentRating.content}
              onChange={handleContentChange}
              placeholder="Hãy chia sẻ những điều bạn thích về sản phẩm này nhé..."
              className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[120px] resize-none"
              disabled={isSubmitting}
            />
            <p className="text-xs text-gray-500 mt-1">
              {currentRating.content.trim().length}/10 ký tự tối thiểu
            </p>
          </div>

          {/* Progress Indicator */}
          {totalItems > 1 && !editMode && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Tiến trình đánh giá</span>
                <span>
                  {currentItemIndex + 1}/{totalItems}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${((currentItemIndex + 1) / totalItems) * 100}%`,
                  }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-between gap-3 rounded-b-xl">
          <div className="flex gap-2">
            {!editMode && currentItemIndex > 0 && (
              <button
                onClick={handleBack}
                disabled={isSubmitting}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Quay lại
              </button>
            )}
            <button
              onClick={handleSkip}
              disabled={isSubmitting}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {editMode ? "Hủy" : "Bỏ qua"}
            </button>
          </div>

          {/* Nút cập nhật chỉ hiện khi chưa quá hạn chỉnh sửa */}
          {(!editMode || (editMode && !isEditExpired)) && (
            <button
              onClick={handleNext}
              disabled={isSubmitting}
              className="px-8 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting
                ? "Đang gửi..."
                : editMode
                ? "Cập nhật"
                : isLastItem
                ? "Hoàn thành"
                : "Tiếp theo"}
            </button>
          )}
          {/* Nếu quá hạn chỉnh sửa, chỉ cho xem, không cho cập nhật */}
          {editMode && isEditExpired && (
            <span className="text-sm text-gray-400 italic px-2">
              Bạn chỉ có thể xem đánh giá này (quá hạn chỉnh sửa)
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default RatingDialog;
