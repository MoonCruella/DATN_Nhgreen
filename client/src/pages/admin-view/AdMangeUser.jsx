import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { useSelector } from "react-redux";
import UsersTable from "@/components/admin-view/tables/UsersTable";
import UserModal from "@/components/admin-view/modals/UserModal";
import userApi from "@/api/userApi";

const AdminUserAccount = () => {
  const { user, isAuthenticated, accessToken } = useSelector((s) => s.auth);

  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const [qSearch, setQSearch] = useState("");
  const [debouncedQSearch, setDebouncedQSearch] = useState("");
  const [qRole, setQRole] = useState("all");
  const [qBanStatus, setQBanStatus] = useState("all");

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);

  const [isOpen, setIsOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const params = {
        page,
        limit,
        role: qRole !== "all" ? qRole : undefined,
        search: debouncedQSearch || undefined,
      };

      const res = await userApi.getUserList(accessToken, params);

      setUsers(res?.data?.users || []);
      setTotalPages(res?.data?.pagination?.total_pages || 1);
      setTotalUsers(res?.data?.pagination?.total_users || 0);
    } catch (err) {
      console.error("Error loading users", err);
      toast.error("Lỗi tải danh sách người dùng");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQSearch(qSearch.trim()), 300);
    return () => clearTimeout(t);
  }, [qSearch]);

  useEffect(() => {
    if (isAuthenticated && user?.role === "admin") {
      loadUsers();
    }
  }, [isAuthenticated, user, page, debouncedQSearch, qRole]);

  const handleRowClick = (user) => {
    setSelectedUser(user);
    setIsOpen(true);
  };

  const handleResetFilters = () => {
    setQSearch("");
    setQRole("all");
    setQBanStatus("all");
    setPage(1);
  };

  const handleBanUser = async (userId, data) => {
    try {
      await userApi.banUser(accessToken, userId, data);
      toast.success("Đã khóa tài khoản thành công");
      loadUsers();
    } catch (err) {
      console.error("Error banning user", err);
      toast.error(err.message || "Lỗi khóa tài khoản");
      throw err;
    }
  };

  const handleUnbanUser = async (userId) => {
    try {
      await userApi.unbanUser(accessToken, userId);
      toast.success("Đã mở khóa tài khoản thành công");
      loadUsers();
    } catch (err) {
      console.error("Error unbanning user", err);
      toast.error(err.message || "Lỗi mở khóa tài khoản");
      throw err;
    }
  };

  return (
    <main className="bg-gray-50 min-h-screen">
      <section className="w-full px-4 pt-8">
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex items-center justify-between">
          <div className="text-lg font-medium">Quản lý người dùng</div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-4">
              <input
                type="text"
                placeholder="Tìm theo tên, email, SĐT..."
                value={qSearch}
                onChange={(e) => {
                  setQSearch(e.target.value);
                  setPage(1);
                }}
                className="border rounded-lg px-3 py-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 transition w-64"
              />

              <select
                value={qRole}
                onChange={(e) => {
                  setQRole(e.target.value);
                  setPage(1);
                }}
                className="border rounded-lg px-3 py-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 transition cursor-pointer"
              >
                <option value="all">Tất cả vai trò</option>
                <option value="customer">Khách hàng</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>

              <select
                value={qBanStatus}
                onChange={(e) => {
                  setQBanStatus(e.target.value);
                  setPage(1);
                }}
                className="border rounded-lg px-3 py-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 transition cursor-pointer"
              >
                <option value="all">Tất cả ban status</option>
                <option value="banned">Đang bị ban</option>
                <option value="not_banned">Không bị ban</option>
              </select>

              <button
                onClick={handleResetFilters}
                className="px-3 py-2 bg-gray-100 rounded-lg transition hover:bg-gray-200 cursor-pointer"
              >
                Đặt lại
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-16 w-full px-4">
        <UsersTable
          users={users.filter((user) => {
            if (qBanStatus === "all") return true;
            const isBanned =
              user?.ban_info?.status !== null &&
              user?.ban_info?.status !== undefined;
            const banUntil = user?.ban_info?.banned_until
              ? new Date(user.ban_info.banned_until)
              : null;
            const isBanActive = isBanned && banUntil && banUntil > new Date();

            if (qBanStatus === "banned") return isBanActive;
            if (qBanStatus === "not_banned") return !isBanActive;
            return true;
          })}
          isLoading={isLoading}
          onRowClick={handleRowClick}
        />

        <div className="mt-3 text-xs text-gray-600 flex items-center justify-between">
          <div>
            Hiển thị {users.length} / {totalUsers} người dùng
          </div>
          <div>
            Trang {page} / {totalPages}
          </div>
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center mt-4 gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className={`px-3 py-1 rounded ${
                page === 1
                  ? "bg-gray-200 text-gray-400"
                  : "bg-gray-800 text-white cursor-pointer"
              }`}
            >
              {"<"}
            </button>
            {[...Array(totalPages)].map((_, idx) => (
              <button
                key={idx}
                onClick={() => setPage(idx + 1)}
                className={`px-3 py-1 rounded ${
                  page === idx + 1
                    ? "bg-gray-800 text-white"
                    : "bg-gray-200 cursor-pointer"
                }`}
              >
                {idx + 1}
              </button>
            ))}
            <button
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
              className={`px-3 py-1 rounded ${
                page === totalPages
                  ? "bg-gray-200 text-gray-400"
                  : "bg-gray-800 text-white cursor-pointer"
              }`}
            >
              {">"}
            </button>
          </div>
        )}
      </section>

      <UserModal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        user={selectedUser}
        onBanUser={handleBanUser}
        onUnbanUser={handleUnbanUser}
      />
    </main>
  );
};

export default AdminUserAccount;
