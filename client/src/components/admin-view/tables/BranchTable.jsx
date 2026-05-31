import React from "react";
import TableSkeleton from "../TableSkeleton";

const BranchTable = ({ branches = [], onRowClick, isLoading }) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <TableSkeleton rows={5} columns={5} />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto shadow rounded-xl bg-white">
      <table className="w-full text-left">
        <thead className="bg-gray-200">
          <tr>
            <th className="py-3 px-4 text-gray-700">Mã chi nhánh</th>
            <th className="py-3 px-4 text-gray-700">Tên</th>
            <th className="py-3 px-4 text-gray-700">Địa chỉ</th>
            <th className="py-3 px-4 text-gray-700">Số điện thoại</th>
            <th className="py-3 px-4 text-gray-700 text-center">Trạng thái</th>
          </tr>
        </thead>
        <tbody className="bg-white">
          {branches.length > 0 ? (
            branches.map((b) => (
              <tr
                key={b._id}
                className="border-b hover:bg-gray-50 cursor-pointer"
                onClick={() => onRowClick && onRowClick(b)}
              >
                <td className="py-3 px-4 font-medium text-gray-800">
                  {b.code || b.branchId || b._id}
                </td>
                <td className="py-3 px-4 text-gray-700">{b.name}</td>
                <td className="py-3 px-4 text-gray-700">
                  {(b.address &&
                    (b.address.full_address || b.address.street)) ||
                    "-"}
                </td>
                <td className="py-3 px-4 text-gray-700">{b.phone || "-"}</td>
                <td className="py-3 px-4 text-center">
                  {b.active ? (
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
                colSpan={5}
                className="py-12 text-center text-gray-500 bg-white"
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                    🏬
                  </div>
                  <div>
                    <p className="font-medium text-lg text-gray-800">
                      Chưa có chi nhánh nào
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      Thêm chi nhánh mới để bắt đầu
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

export default BranchTable;
