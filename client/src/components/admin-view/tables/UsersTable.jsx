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
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <TableSkeleton rows={10} columns={5} />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto shadow rounded-xl bg-white">
      <table className="w-full text-left">
        <thead className="bg-gray-200">
          <tr>
            <th className="py-3 px-4 text-gray-700">Tên</th>
            <th className="py-3 px-4 text-gray-700">Email</th>
            <th className="py-3 px-4 text-gray-700">Số điện thoại</th>
            <th className="py-3 px-4 text-gray-700 text-center">Vai trò</th>
            <th className="py-3 px-4 text-gray-700 text-center">Trạng thái</th>
            <th className="py-3 px-4 text-gray-700">Ngày tạo</th>
          </tr>
        </thead>
        <tbody className="bg-white">
          {users.length > 0 ? (
            users.map((user) => (
              <tr
                key={user._id}
                className="border-b hover:bg-gray-50 cursor-pointer transition"
                onClick={() => onRowClick && onRowClick(user)}
              >
                <td className="py-3 px-4 text-gray-700 font-medium">
                  {user.name || "N/A"}
                </td>
                <td className="py-3 px-4 text-gray-700">{user.email}</td>
                <td className="py-3 px-4 text-gray-700">
                  {user.phone || "N/A"}
                </td>
                <td className="py-3 px-4 text-center">
                  {getRoleBadge(user.role)}
                </td>
                <td className="py-3 px-4 text-center">
                  {getStatusBadge(user)}
                </td>
                <td className="py-3 px-4 text-gray-700">
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


