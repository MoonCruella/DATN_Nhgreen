import React from "react";
import { Star } from "lucide-react";
import TableSkeleton from "../TableSkeleton";

const RatingsTable = ({
  ratings,
  isLoading,
  onRowClick,
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

  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-gray-100">
        <TableSkeleton rows={10} columns={5} />
      </div>
    );
  }

  if (!ratings || ratings.length === 0) {
    return (
      <div className="rounded-lg bg-white p-8 text-center shadow-sm ring-1 ring-gray-100">
        <p className="text-gray-500">Không có đánh giá nào</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-gray-100">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-gray-200 bg-white">
            <tr>
              <th className="px-5 py-3 text-left text-base font-bold text-slate-600">
                Sản phẩm
              </th>
              <th className="px-5 py-3 text-left text-base font-bold text-slate-600">
                Người đánh giá
              </th>
              <th className="px-5 py-3 text-left text-base font-bold text-slate-600">
                Đánh giá
              </th>
              <th className="px-5 py-3 text-left text-base font-bold text-slate-600">
                Nội dung
              </th>
              <th className="px-5 py-3 text-left text-base font-bold text-slate-600">
                Đơn hàng
              </th>
              <th className="px-5 py-3 text-left text-base font-bold text-slate-600">
                Ngày tạo
              </th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {ratings.map((rating) => (
              <tr
                key={rating._id}
                className="cursor-pointer border-b border-gray-100 text-base font-medium text-[#444] transition hover:bg-gray-50 last:border-b-0"
              >
                {/* Dish */}
                <td
                  className="px-5 py-3"
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
                  className="px-5 py-3"
                  onClick={() => onRowClick(rating)}
                >
                  <div>
                    <p className="font-medium text-sm">
                      {rating.userName || ""}
                    </p>
                    <p className="text-xs text-gray-500">
                      {rating.userEmail || ""}
                    </p>
                  </div>
                </td>

                {/* Rating */}
                <td
                  className="px-5 py-3"
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
                  className="px-5 py-3"
                  onClick={() => onRowClick(rating)}
                >
                  <p className="max-w-xs truncate text-sm text-gray-700">
                    {rating.content}
                  </p>
                </td>

                {/* Order ID */}
                <td
                  className="px-5 py-3"
                  onClick={() => onRowClick(rating)}
                >
                  <p className="text-sm font-mono text-gray-700">
                    {rating.order_id?.order_number
                      ? `#${rating.order_id.order_number}`
                      : ""}
                  </p>
                </td>

                {/* Date */}
                <td
                  className="px-5 py-3 text-sm text-gray-500"
                  onClick={() => onRowClick(rating)}
                >
                  {new Date(rating.created_at).toLocaleDateString("vi-VN")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RatingsTable;


