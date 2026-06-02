import React from "react";
import TableSkeleton from "../TableSkeleton";

const IngredientTable = ({
  ingredients = [],
  onRowClick,
  isLoading,
  page = 1,
  totalPages = 1,
  onPageChange,
  pageSize = 10,
}) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <TableSkeleton rows={10} columns={10} />
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
            <th className="py-3 px-4 text-gray-700">Loại</th>
            <th className="py-3 px-4 text-gray-700">Xuất xứ</th>
            <th className="py-3 px-4 text-gray-700">
              Protein<text className="text-xs">/100g</text>
            </th>
            <th className="py-3 px-4 text-gray-700">
              Fat<text className="text-xs">/100g</text>
            </th>
            <th className="py-3 px-4 text-gray-700">
              Carbs<text className="text-xs">/100g</text>
            </th>
            <th className="py-3 px-4 text-gray-700">Energy (kcal)</th>
            <th className="py-3 px-4 text-gray-700 text-center">Trạng thái</th>
          </tr>
        </thead>
        <tbody className="bg-white">
          {ingredients.length > 0 ? (
            ingredients.map((it, idx) => (
              <tr
                key={it._id || it.id}
                className="border-b hover:bg-gray-50 cursor-pointer"
                onClick={() => onRowClick && onRowClick(it)}
              >
                <td className="py-3 px-4 font-medium text-gray-800">
                  {(page - 1) * pageSize + idx + 1}
                </td>
                <td className="py-2 px-4">
                  {it.imageUrl ? (
                    <img
                      src={it.imageUrl}
                      alt={it.name}
                      className="w-10 h-10 rounded object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center text-sm">
                      —
                    </div>
                  )}
                </td>
                <td className="py-3 px-4 text-gray-700">{it.name}</td>
                <td className="py-3 px-4 text-gray-700">
                  {it.type === "tinh_bot"
                    ? "Tinh bột"
                    : it.type === "protein_dong_vat"
                    ? "Protein động vật"
                    : it.type === "protein_thuc_vat"
                    ? "Protein thực vật"
                    : it.type === "rau_cu_qua"
                    ? "Rau, củ, quả"
                    : it.type === "trai_cay"
                    ? "Trái cây"
                    : it.type === "do_uong"
                    ? "Đồ uống"
                    : it.type === "do_ngot"
                    ? "Đồ ngọt"
                    : "-"}
                </td>
                <td className="py-3 px-4 text-gray-700">{it.origin || "-"}</td>
                <td className="py-3 px-4 text-gray-700">{it.protein ?? 0}</td>
                <td className="py-3 px-4 text-gray-700">{it.fat ?? 0}</td>
                <td className="py-3 px-4 text-gray-700">{it.carbs ?? 0}</td>
                <td className="py-3 px-4 text-gray-700">
                  {it.energyKcal ?? "-"}
                </td>
                <td className="py-3 px-4 text-center">
                  {it.status === "available" ? (
                    <span className="text-sm font-medium text-green-600">
                      Có sẵn
                    </span>
                  ) : (
                    <span className="text-sm font-medium text-red-600">
                      Ngừng bán
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
                    🥕
                  </div>
                  <div>
                    <p className="font-medium text-lg text-gray-800">
                      Chưa có nguyên liệu nào
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      Thêm nguyên liệu mới để bắt đầu
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
          <button
            disabled={page <= 1}
            onClick={() => onPageChange && onPageChange(page - 1)}
            className={`px-3 py-1 rounded ${
              page <= 1
                ? "bg-gray-200 text-gray-400"
                : "bg-green-600 text-white hover:bg-green-700 cursor-pointer"
            }`}
          >
            {"<"}
          </button>

          {(() => {
            const pages = [];
            const showEllipsis = totalPages > 5;

            if (!showEllipsis) {
              // Show all pages if 5 or fewer
              for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
              }
            } else {
              // Always show first page
              pages.push(1);

              if (page <= 2) {
                // Near start: show 1,2,3,...,last
                pages.push(2, 3, "...", totalPages);
              } else if (page >= totalPages - 1) {
                // Near end: show 1,...,last-2,last-1,last
                pages.push(
                  "...",
                  totalPages - 2,
                  totalPages - 1,
                  totalPages
                );
              } else {
                // Middle: show 1,...,current-1,current,current+1,...,last
                pages.push("...", page - 1, page, page + 1, "...", totalPages);
              }
            }

            return pages.map((p, idx) => {
              if (p === "...") {
                return (
                  <span key={`ellipsis-${idx}`} className="px-2 text-gray-400">
                    ...
                  </span>
                );
              }
              return (
                <button
                  key={p}
                  onClick={() => onPageChange && onPageChange(p)}
                  className={`px-3 py-1 rounded ${
                    page === p
                      ? "bg-green-600 text-white"
                      : "bg-gray-200 cursor-pointer hover:bg-gray-300"
                  }`}
                >
                  {p}
                </button>
              );
            });
          })()}

          <button
            disabled={page >= totalPages}
            onClick={() => onPageChange && onPageChange(page + 1)}
            className={`px-3 py-1 rounded ${
              page >= totalPages
                ? "bg-gray-200 text-gray-400"
                : "bg-green-600 text-white hover:bg-green-700 cursor-pointer"
            }`}
          >
            {">"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default IngredientTable;


