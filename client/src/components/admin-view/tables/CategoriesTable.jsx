import React from "react";
import TableSkeleton from "../TableSkeleton";

const CategoriesTable = ({ categories = [], onRowClick, isLoading }) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <TableSkeleton rows={5} columns={4} />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto shadow rounded-xl bg-white">
      <table className="w-full text-left">
        <thead className="bg-gray-200">
          <tr>
            <th className="py-3 px-4 text-gray-700">Hình ảnh</th>
            <th className="py-3 px-4 text-gray-700">Tên</th>
            <th className="py-3 px-4 text-gray-700">Mô tả</th>
            <th className="py-3 px-4 text-gray-700 text-center">Trạng thái</th>
          </tr>
        </thead>
        <tbody className="bg-white">
          {categories.length > 0 ? (
            categories.map((c) => (
              <tr
                key={c._id}
                className="border-b hover:bg-gray-50 cursor-pointer"
                onClick={() => onRowClick && onRowClick(c)}
              >
                <td className="py-2 px-4">
                  {c.imageUrl ? (
                    <img
                      src={c.imageUrl}
                      alt={c.name}
                      className="w-10 h-10 rounded object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center text-sm">
                      —
                    </div>
                  )}
                </td>
                <td className="py-3 px-4 text-gray-700">{c.name}</td>
                <td className="py-3 px-4 text-gray-700">
                  {c.description || "-"}
                </td>
                <td className="py-3 px-4 text-center">
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
