import React from "react";
import TableSkeleton from "../TableSkeleton";

const CategoriesTable = ({ categories = [], onRowClick, isLoading }) => {
  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-gray-100">
        <TableSkeleton rows={5} columns={4} />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg bg-white shadow-sm ring-1 ring-gray-100">
      <table className="w-full text-left">
        <thead className="border-b border-gray-200 bg-white">
          <tr>
            <th className="px-5 py-3 text-base font-bold text-slate-600">Hình ảnh</th>
            <th className="px-5 py-3 text-base font-bold text-slate-600">Tên</th>
            <th className="px-5 py-3 text-base font-bold text-slate-600">Mô tả</th>
            <th className="px-5 py-3 text-center text-base font-bold text-slate-600">Trạng thái</th>
          </tr>
        </thead>
        <tbody className="bg-white">
          {categories.length > 0 ? (
            categories.map((c) => (
              <tr
                key={c._id}
                className="cursor-pointer border-b border-gray-100 text-base font-medium text-[#444] transition hover:bg-gray-50 last:border-b-0"
                onClick={() => onRowClick && onRowClick(c)}
              >
                <td className="px-5 py-3">
                  {c.imageUrl ? (
                    <img
                      src={c.imageUrl}
                      alt={c.name}
                      className="h-12 w-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 text-sm">
                      —
                    </div>
                  )}
                </td>
                <td className="px-5 py-3 font-bold text-gray-800">{c.name}</td>
                <td className="px-5 py-3 text-gray-700">
                  {c.description || "-"}
                </td>
                <td className="px-5 py-3 text-center">
                  {c.status === "available" ? (
                    <span className="text-sm font-medium text-green-600">
                      Đang bán
                    </span>
                  ) : (
                    <span className="text-sm font-medium text-red-600">
                      Đã ngừng bán
                    </span>
                  )}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={5}
                className="py-12 text-center text-gray-500 bg-white"
              >
                <div className="flex flex-col items-center gap-4">
                  <div>
                    <p className="font-medium text-lg text-gray-800">
                      Chưa có danh mục nào
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      Thêm danh mục mới để bắt đầu
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

export default CategoriesTable;


