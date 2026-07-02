import React from "react";
import { Star, Eye, EyeOff } from "lucide-react";

const ManagerRatingsTable = ({
  ratings,
  loading,
  onRowClick,
  onToggleStatus,
}) => {
  const StarRating = ({ rating }) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
        <p className="mt-4 text-gray-500">Đang tải...</p>
      </div>
    );
  }

  if (!ratings || ratings.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8 text-center">
        <p className="text-gray-500">Không có đánh giá nào</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Sản phẩm
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Người đánh giá
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Đánh giá
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nội dung
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Đơn hàng
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Trạng thái
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {ratings.map((rating) => (
              <tr
                key={rating._id}
                className="hover:bg-gray-50 transition"
              >
                {/* Dish */}
                <td
                  className="px-4 py-4 cursor-pointer"
                  onClick={() => onRowClick(rating)}
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={
                        rating.dish_id?.imageUrls?.[
                          rating.dish_id?.defaultImageIndex || 0
                        ] || "/placeholder.png"
                      }
                      alt={rating.dish_id?.name}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                    <div>
                      <p className="font-medium text-sm">
                        {rating.dishName || ""}
                      </p>
                      <p className="text-xs text-gray-500">
                        #{rating.dish_id?._id?.slice(-6)}
                      </p>
                    </div>
                  </div>
                </td>

                {/* User */}
                <td
                  className="px-4 py-4 cursor-pointer"
                  onClick={() => onRowClick(rating)}
                >
                  <div>
                    <p className="font-medium text-sm">
                      {rating.userName || ""}
                    </p>
                    <p className="text-xs text-gray-500">
                      {rating.userEmail || ""}
                    </p>
                    {!rating.userActive && (
                      <span className="inline-block mt-1 px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded">
                        Đã khóa
                      </span>
                    )}
                  </div>
                </td>

                {/* Rating */}
                <td
                  className="px-4 py-4 cursor-pointer"
                  onClick={() => onRowClick(rating)}
                >
                  <div className="flex items-center gap-2">
                    <StarRating rating={rating.rating} />
                    <span className="text-sm font-medium">
                      {rating.rating}/5
                    </span>
                  </div>
                </td>

                {/* Content */}
                <td
                  className="px-4 py-4 cursor-pointer"
                  onClick={() => onRowClick(rating)}
                >
                  <p className="max-w-xs truncate text-sm text-gray-700">
                    {rating.content}
                  </p>
                </td>

                {/* Order ID */}
                <td
                  className="px-4 py-4 cursor-pointer"
                  onClick={() => onRowClick(rating)}
                >
                  <p className="text-sm font-mono text-gray-700">
                    {rating.order_id?.order_number
                      ? `#${rating.order_id.order_number}`
                      : ""}
                  </p>
                </td>

                {/* Status */}
                <td
                  className="px-4 py-4 cursor-pointer"
                  onClick={() => onRowClick(rating)}
                >
                  {rating.status === "visible" ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                      <Eye className="w-3 h-3" />
                      Hiển thị
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                      <EyeOff className="w-3 h-3" />
                      Đã ẩn
                    </span>
                  )}
                </td>

                {/* Action */}
                <td className="px-4 py-4">
                  <div className="flex justify-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleStatus(rating);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                        rating.status === "visible"
                          ? "bg-orange-500 hover:bg-orange-600 text-white"
                          : "bg-green-500 hover:bg-green-600 text-white"
                      }`}
                    >
                      {rating.status === "visible" ? "Ẩn" : "Hiện"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ManagerRatingsTable;


