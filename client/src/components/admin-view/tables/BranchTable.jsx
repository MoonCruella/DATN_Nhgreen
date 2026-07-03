import React from "react";
import TableSkeleton from "../TableSkeleton";

const BranchTable = ({ branches = [], onRowClick, isLoading }) => {
  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-gray-100">
        <TableSkeleton rows={5} columns={6} />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg bg-white shadow-sm ring-1 ring-gray-100">
      <table className="w-full text-left">
        <thead className="border-b border-gray-200 bg-white">
          <tr>
            <th className="px-5 py-3 text-base font-bold text-slate-600">Mã chi nhánh</th>
            <th className="px-5 py-3 text-base font-bold text-slate-600">Shop ID GHN</th>
            <th className="px-5 py-3 text-base font-bold text-slate-600">Tên</th>
            <th className="px-5 py-3 text-base font-bold text-slate-600">Địa chỉ</th>
            <th className="px-5 py-3 text-base font-bold text-slate-600">Số điện thoại</th>
            <th className="px-5 py-3 text-center text-base font-bold text-slate-600">Trạng thái</th>
          </tr>
        </thead>
        <tbody className="bg-white">
          {branches.length > 0 ? (
            branches.map((b) => (
              <tr
                key={b._id}
                className="cursor-pointer border-b border-gray-100 text-base font-medium text-[#444] transition hover:bg-gray-50 last:border-b-0"
                onClick={() => onRowClick && onRowClick(b)}
              >
                <td className="px-5 py-3 font-bold text-gray-800">
                  {b.code || b.branchId || b._id}
                </td>
                <td className="px-5 py-3 font-mono text-gray-700">
                  {b.shop_id || "-"}
                </td>
                <td className="px-5 py-3 text-gray-700">{b.name}</td>
                <td className="px-5 py-3 text-gray-700">
                  {(b.address &&
                    (b.address.full_address || b.address.street)) ||
                    "-"}
                </td>
                <td className="px-5 py-3 text-gray-700">{b.phone || "-"}</td>
                <td className="px-5 py-3 text-center">
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
                colSpan={6}
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


