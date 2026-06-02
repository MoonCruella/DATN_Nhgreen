import React from "react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import TableSkeleton from "../TableSkeleton";

const UsersTable = ({ users = [], onRowClick, isLoading }) => {
  const getRoleBadge = (role) => {
    const roleMap = {
      admin: { text: "Admin", color: "bg-red-100 text-red-800" },
      manager: { text: "Manager", color: "bg-green-100 text-green-800" },
      customer: { text: "Khách hàng", color: "bg-green-100 text-green-800" },
    };
    const badge = roleMap[role] || {
      text: role,
      color: "bg-gray-100 text-gray-800",
    };
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}
      >
        {badge.text}
      </span>
    );
  };

  const getStatusBadge = (user) => {
    const isBanned =
      user?.ban_info?.status !== null && user?.ban_info?.status !== undefined;
    const banUntil = user?.ban_info?.banned_until
      ? new Date(user.ban_info.banned_until)
      : null;
    const isBanActive = isBanned && banUntil && banUntil > new Date();

    if (isBanActive) {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
          Đã bị ban
        </span>
      );
    }

    return user.active ? (
      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
        Đã kích hoạt
      </span>
    ) : (
      <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
        Chưa kích hoạt
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-gray-100">
        <TableSkeleton rows={10} columns={5} />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg bg-white shadow-sm ring-1 ring-gray-100">
      <table className="w-full text-left">
        <thead className="border-b border-gray-200 bg-white">
          <tr>
            <th className="px-5 py-3 text-base font-bold text-slate-600">Tên</th>
            <th className="px-5 py-3 text-base font-bold text-slate-600">Email</th>
            <th className="px-5 py-3 text-base font-bold text-slate-600">Số điện thoại</th>
            <th className="px-5 py-3 text-center text-base font-bold text-slate-600">Vai trò</th>
            <th className="px-5 py-3 text-center text-base font-bold text-slate-600">Trạng thái</th>
            <th className="px-5 py-3 text-base font-bold text-slate-600">Ngày tạo</th>
          </tr>
        </thead>
        <tbody className="bg-white">
          {users.length > 0 ? (
            users.map((user) => (
              <tr
                key={user._id}
                className="cursor-pointer border-b border-gray-100 text-base font-medium text-[#444] transition hover:bg-gray-50 last:border-b-0"
                onClick={() => onRowClick && onRowClick(user)}
              >
                <td className="px-5 py-3 font-bold text-gray-800">
                  {user.name || "N/A"}
                </td>
                <td className="px-5 py-3 text-gray-700">{user.email}</td>
                <td className="px-5 py-3 text-gray-700">
                  {user.phone || "N/A"}
                </td>
                <td className="px-5 py-3 text-center">
                  {getRoleBadge(user.role)}
                </td>
                <td className="px-5 py-3 text-center">
                  {getStatusBadge(user)}
                </td>
                <td className="px-5 py-3 text-gray-700">
                  {user.createdAt
                    ? format(new Date(user.createdAt), "dd/MM/yyyy", {
                        locale: vi,
                      })
                    : "N/A"}
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
                  <div>
                    <p className="font-medium text-lg text-gray-800">
                      Chưa có người dùng nào
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      Người dùng sẽ hiển thị tại đây
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

export default UsersTable;


