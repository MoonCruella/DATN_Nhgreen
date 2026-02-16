import React from "react";
import { Utensils } from "lucide-react";
import TableSkeleton from "../TableSkeleton";

const ProductsTable = ({
  products = [],
  isLoading,
  page = 1,
  totalPages = 1,
  onPageChange,
  onRowClick,
}) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <TableSkeleton rows={10} columns={7} />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto shadow rounded-xl bg-white">
      <table className="w-full text-left">
        <thead className="bg-gray-200">
          <tr>
            <th className="py-3 px-4 text-gray-700">#</th>
            <th className="py-3 px-4 text-gray-700">Ảnh</th>
            <th className="py-3 px-4 text-gray-700">Tên</th>
            <th className="py-3 px-4 text-gray-700">Danh mục</th>
            <th className="py-3 px-4 text-gray-700">Giá</th>
            <th className="py-3 px-4 text-gray-700">Số lượng</th>
            <th className="py-3 px-4 text-gray-700">Tags</th>
            <th className="py-3 px-4 text-gray-700">Kcal</th>
            <th className="py-3 px-4 text-gray-700">Đã bán</th>
            <th className="py-3 px-4 text-gray-700">Trạng thái</th>
          </tr>
        </thead>
        <tbody className="bg-white">
          {products.length > 0 ? (
            products.map((p, i) => (
              <tr
                key={p._id}
                className="border-b hover:bg-gray-50 cursor-pointer"
                onClick={() => onRowClick && onRowClick(p)}
              >
                <td className="py-3 px-4 font-medium text-gray-800">
                  {i + 1 + (page - 1) * 10}
                </td>
                <td className="py-2 px-4">
                  {p.imageUrls && p.imageUrls.length > 0 ? (
                    <img
                      src={
                        p.imageUrls[p.defaultImageIndex || 0] || p.imageUrls[0]
                      }
                      alt={p.name}
                      className="w-10 h-10 rounded object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gray-100 rounded" />
                  )}
                </td>
                <td className="py-3 px-4 text-gray-700">{p.name}</td>
                <td className="py-3 px-4 text-gray-700">
                  {p.category?.name || "-"}
                </td>
                <td className="py-3 px-4 text-gray-700">
                  {p.price?.toLocaleString?.() || p.price}
                </td>
                <td className="py-3 px-4 text-gray-700">
                  {p.stock != null ? p.stock : "-"}
                </td>
                <td className="py-3 px-4 text-gray-700">
                  {(p.tags || []).length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {(p.tags || []).slice(0, 4).map((t, idx) => (
                        <span
                          key={idx}
                          className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded"
                        >
                          {t}
                        </span>
                      ))}
                      {(p.tags || []).length > 4 && (
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                          +{(p.tags || []).length - 4}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">-</span>
                  )}
                </td>

                <td className="py-3 px-4 text-gray-700">
                  {p.totalEnergyKcal != null ? p.totalEnergyKcal : "-"}
                </td>
                <td className="py-3 px-4 text-gray-700">
                  {p.soldCount != null ? p.soldCount : 0}
                </td>
                <td className="py-3 px-4 ">
                  {p.status === "active" ? (
                    <span className="text-sm font-medium text-green-600">
                      Hoạt động
                    </span>
                  ) : (
                    <span className="text-sm font-medium text-red-600">
                      Không hoạt động
                    </span>
                  )}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={10}
                className="py-12 text-center text-gray-500 bg-white"
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                    <Utensils className="w-8 h-8 text-gray-400" />
                  </div>
                  <div>
                    <p className="font-medium text-lg text-gray-800">
                      Chưa có món ăn nào
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      Thêm món mới để bắt đầu
                    </p>
                  </div>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Pagination */}
      <div className="p-4 flex justify-center bg-white border-t">
        <div className="flex items-center gap-2">
          {/** Ensure totalPages is treated as a number to avoid Array mapping issues **/}
          {(() => {
            const pages = Math.max(1, Number(totalPages) || 1);
            return (
              <>
                <button
                  disabled={page <= 1}
                  onClick={() => onPageChange && onPageChange(page - 1)}
                  className={`px-3 py-1 rounded ${
                    page <= 1
                      ? "bg-gray-200 text-gray-400"
                      : "bg-gray-800 text-white hover:bg-gray-700 cursor-pointer"
                  }`}
                >
                  {"<"}
                </button>

                {[...Array(pages)].map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => onPageChange && onPageChange(idx + 1)}
                    className={`px-3 py-1 rounded ${
                      page === idx + 1
                        ? "bg-gray-800 text-white"
                        : "bg-gray-200"
                    }`}
                  >
                    {idx + 1}
                  </button>
                ))}

                <button
                  disabled={page >= pages}
                  onClick={() => onPageChange && onPageChange(page + 1)}
                  className={`px-3 py-1 rounded ${
                    page >= pages
                      ? "bg-gray-200 text-gray-400"
                      : "bg-gray-800 text-white hover:bg-gray-700 cursor-pointer"
                  }`}
                >
                  {">"}
                </button>
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

export default ProductsTable;
