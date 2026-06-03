import React from "react";
import TableSkeleton from "../TableSkeleton";

const IngredientTable = ({
  ingredients = [],
  onRowClick,
  isLoading,
  page = 1,
  pageSize = 10,
}) => {
  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-gray-100">
        <TableSkeleton rows={10} columns={10} />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg bg-white shadow-sm ring-1 ring-gray-100">
      <table className="w-full text-left">
        <thead className="border-b border-gray-200 bg-white">
          <tr>
            <th className="px-5 py-3 text-base font-bold text-slate-600">#</th>
            <th className="px-5 py-3 text-base font-bold text-slate-600">Ảnh</th>
            <th className="px-5 py-3 text-base font-bold text-slate-600">Tên</th>
            <th className="px-5 py-3 text-base font-bold text-slate-600">Loại</th>
            <th className="px-5 py-3 text-base font-bold text-slate-600">Xuất xứ</th>
            <th className="px-5 py-3 text-base font-bold text-slate-600">
              Protein<text className="text-xs">/100g</text>
            </th>
            <th className="px-5 py-3 text-base font-bold text-slate-600">
              Fat<text className="text-xs">/100g</text>
            </th>
            <th className="px-5 py-3 text-base font-bold text-slate-600">
              Carbs<text className="text-xs">/100g</text>
            </th>
            <th className="px-5 py-3 text-base font-bold text-slate-600">Energy (kcal)</th>
            <th className="px-5 py-3 text-center text-base font-bold text-slate-600">Trạng thái</th>
          </tr>
        </thead>
        <tbody className="bg-white">
          {ingredients.length > 0 ? (
            ingredients.map((it, idx) => (
              <tr
                key={it._id || it.id}
                className="cursor-pointer border-b border-gray-100 text-base font-medium text-[#444] transition hover:bg-gray-50 last:border-b-0"
                onClick={() => onRowClick && onRowClick(it)}
              >
                <td className="px-5 py-3 font-medium text-gray-800">
                  {(page - 1) * pageSize + idx + 1}
                </td>
                <td className="px-5 py-3">
                  {it.imageUrl ? (
                    <img
                      src={it.imageUrl}
                      alt={it.name}
                      className="h-12 w-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 text-sm">
                      —
                    </div>
                  )}
                </td>
                <td className="px-5 py-3 font-bold text-gray-800">{it.name}</td>
                <td className="px-5 py-3 text-gray-700">
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
                <td className="px-5 py-3 text-gray-700">{it.origin || "-"}</td>
                <td className="px-5 py-3 text-gray-700">{it.protein ?? 0}</td>
                <td className="px-5 py-3 text-gray-700">{it.fat ?? 0}</td>
                <td className="px-5 py-3 text-gray-700">{it.carbs ?? 0}</td>
                <td className="px-5 py-3 text-gray-700">
                  {it.energyKcal ?? "-"}
                </td>
                <td className="px-5 py-3 text-center">
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
    </div>
  );
};

export default IngredientTable;


