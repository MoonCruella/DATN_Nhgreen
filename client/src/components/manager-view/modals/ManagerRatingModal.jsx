import React, { useState } from "react";
import { X, Star, Package, User, ShoppingBag, Mail, Calendar, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

const ManagerRatingModal = ({ rating, onClose, onToggleStatus, onRefresh }) => {
  const [isUpdating, setIsUpdating] = useState(false);

  if (!rating) return null;

  const StarRating = ({ rating }) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-5 h-5 ${
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  const handleToggleStatus = async () => {
    setIsUpdating(true);
    try {
      await onToggleStatus(rating);
      onRefresh();
      toast.success(
        `Đã ${rating.status === "visible" ? "ẩn" : "hiện"} đánh giá`
      );
      onClose();
    } catch (error) {
      console.error("Error toggling status:", error);
      toast.error("Không thể cập nhật trạng thái");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-800">Chi tiết đánh giá</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status Badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {rating.status === "visible" ? (
                <>
                  <Eye className="w-5 h-5 text-green-500" />
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                    Đang hiển thị
                  </span>
                </>
              ) : (
                <>
                  <EyeOff className="w-5 h-5 text-gray-500" />
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                    Đã ẩn
                  </span>
                </>
              )}
            </div>
            <button
              onClick={handleToggleStatus}
              disabled={isUpdating}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                rating.status === "visible"
                  ? "bg-orange-500 hover:bg-orange-600 text-white"
                  : "bg-green-500 hover:bg-green-600 text-white"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isUpdating
                ? "Đang xử lý..."
                : rating.status === "visible"
                ? "Ẩn đánh giá"
                : "Hiện đánh giá"}
            </button>
          </div>

          {/* Main Info - Dish, Order & Rating */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-start gap-4 mb-4">
              <img
                src={
                  rating.dish_id?.imageUrls?.[
                    rating.dish_id?.defaultImageIndex || 0
                  ] || "/placeholder.png"
                }
                alt={rating.dish_id?.name}
                className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Package className="w-4 h-4 text-gray-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-lg font-medium text-gray-800 truncate">
                      {rating.dishName || ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                  <ShoppingBag className="w-4 h-4" />
                  <span className="font-mono">
                    {rating.order_id?.order_number || rating.order_id?._id
                      ? `ORDER: #${rating.order_id?.order_number || rating.order_id?._id?.slice(-8)}`
                      : ""}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <StarRating rating={rating.rating} />
                  <span className="text-xl font-bold text-yellow-600">
                    {rating.rating}/5
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* User Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <User className="w-5 h-5 text-gray-500" />
              <h4 className="font-semibold text-gray-800">Người đánh giá</h4>
            </div>
            <p className="text-base font-medium text-gray-800">
              {rating.userName || ""}
            </p>
            <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
              <Mail className="w-4 h-4" />
              <span>{rating.userEmail || ""}</span>
            </div>
            {!rating.userActive && (
              <div className="mt-2 px-3 py-1 bg-red-100 text-red-700 rounded-md text-sm inline-block">
                Tài khoản đã bị khóa
              </div>
            )}
          </div>

          {/* Content */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-3">Nội dung</h4>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {rating.content}
            </p>
          </div>

          {/* Date */}
          <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>
                Ngày tạo: {new Date(rating.created_at).toLocaleString("vi-VN")}
              </span>
            </div>
            {rating.updated_at && rating.updated_at !== rating.created_at && (
              <span className="text-orange-600">
                Đã chỉnh sửa: {new Date(rating.updated_at).toLocaleString("vi-VN")}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagerRatingModal;


