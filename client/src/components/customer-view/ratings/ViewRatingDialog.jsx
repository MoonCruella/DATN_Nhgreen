import React, { useState, useEffect } from "react";
import { X, Star, Edit2 } from "lucide-react";
import { Rate } from "antd";
import { toast } from "sonner";
import ratingApi from "@/api/ratingApi";

const ViewRatingsDialog = ({
  open,
  onClose,
  order,
  accessToken,
  onEditRating,
}) => {
  const [ratings, setRatings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

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

  useEffect(() => {
    const fetchRatings = async () => {
      if (!open || !order?._id || !accessToken) return;

      try {
        setIsLoading(true);

        const response = await ratingApi.getOrderRatings(
          accessToken,
          order._id
        );

        if (response.success) {
          setRatings(response.data.ratings || []);
        } else {
          toast.error("Lỗi tải đánh giá");
        }
      } catch (err) {
        console.error("Error fetching ratings:", err);
        toast.error("Lỗi tải đánh giá");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRatings();
  }, [open, order, accessToken]);

  if (!open || !order) return null;

  const handleEdit = (rating) => {
    onClose();
    setTimeout(() => {
      onEditRating(order, rating);
    }, 100);
  };

  const getDishImage = (dish) => {
    if (!dish) return "/placeholder-dish.jpg";

    const imageUrls = dish.imageUrls || [];
    const defaultIndex = dish.defaultImageIndex || 0;

    if (imageUrls.length > 0) {
      return imageUrls[defaultIndex] || imageUrls[0];
    }

    return "/placeholder-dish.jpg";
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div
        className="bg-white rounded-xl shadow-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">
              Đánh giá của bạn
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Đơn hàng: {order.order_number || order._id?.slice(-8)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : ratings.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">⭐</div>
              <p className="text-gray-500">Chưa có đánh giá nào</p>
            </div>
          ) : (
            <div className="space-y-4">
              {ratings.map((rating) => (
                <div
                  key={rating._id}
                  className="border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow"
                >
                  {/* Product Info */}
                  <div className="flex items-start gap-4 mb-4">
                    <img
                      src={getDishImage(rating.dish_id)}
                      alt={rating.dish_id?.name}
                      className="w-20 h-20 object-cover rounded-lg"
                      onError={(e) => {
                        e.target.src = "/placeholder-dish.jpg";
                      }}
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800 text-lg mb-2">
                        {rating.dish_id?.name}
                      </h3>
                      <div className="flex items-center gap-3">
                        <Rate
                          value={rating.rating}
                          disabled
                          className="text-xl"
                        />
                        <span className="text-sm text-gray-600">
                          {rating.rating === 5
                            ? "Tuyệt vời"
                            : rating.rating === 4
                            ? "Hài lòng"
                            : rating.rating === 3
                            ? "Bình thường"
                            : rating.rating === 2
                            ? "Không hài lòng"
                            : "Tệ"}
                        </span>
                      </div>
                    </div>
                    {/* Nút Sửa chỉ hiện nếu chưa quá 3 ngày kể từ khi tạo rating */}
                    {(() => {
                      const createdAt = new Date(rating.created_at);
                      const now = new Date();
                      const diffDays = (now - createdAt) / (1000 * 60 * 60 * 24);
                      if (diffDays > 3) {
                        return null;
                      }
                      if (rating.updated_at === rating.created_at) {
                        return (
                          <button
                            onClick={() => handleEdit(rating)}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                            Sửa
                          </button>
                        );
                      } else {
                        return (
                          <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg">Đã sửa</span>
                        );
                      }
                    })()}
                  </div>

                  {/* Rating Content */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-700 leading-relaxed">
                      {rating.content}
                    </p>
                  </div>

                  {/* Rating Date */}
                  <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                    <span>
                      Đánh giá lúc:{" "}
                      {new Date(rating.created_at).toLocaleString("vi-VN")}
                    </span>
                    {rating.updated_at !== rating.created_at && (
                      <span>
                        Chỉnh sửa lúc:{" "}
                        {new Date(rating.updated_at).toLocaleString("vi-VN")}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t px-6 py-4">
          <button
            onClick={onClose}
            className="w-full px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewRatingsDialog;
