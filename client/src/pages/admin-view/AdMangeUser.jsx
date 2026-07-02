import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { useSelector } from "react-redux";
import UsersTable from "@/components/admin-view/tables/UsersTable";
import UserModal from "@/components/admin-view/modals/UserModal";
import userApi from "@/api/userApi";
import { ChevronRight, Search, Store } from "lucide-react";
import FilterSelect from "@/components/common/FilterSelect";
import AdminPagination from "@/components/admin-view/AdminPagination";
import { Button } from "@/components/ui/button";

const AdminUserAccount = () => {
  const { user, isAuthenticated, accessToken } = useSelector((s) => s.auth);

  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const [qSearch, setQSearch] = useState("");
  const [debouncedQSearch, setDebouncedQSearch] = useState("");
  const [qRole, setQRole] = useState("all");
  const [qActiveStatus, setQActiveStatus] = useState("all");
  const [qBanStatus, setQBanStatus] = useState("all");
  const [appliedRole, setAppliedRole] = useState("all");
  const [appliedActiveStatus, setAppliedActiveStatus] = useState("all");
  const [appliedBanStatus, setAppliedBanStatus] = useState("all");

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
        role: appliedRole !== "all" ? appliedRole : undefined,
        status: appliedActiveStatus !== "all" ? appliedActiveStatus : undefined,
        banStatus: appliedBanStatus !== "all" ? appliedBanStatus : undefined,
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
  }, [
    isAuthenticated,
    user,
    page,
    debouncedQSearch,
    appliedRole,
    appliedActiveStatus,
    appliedBanStatus,
  ]);

  const handleRowClick = (user) => {
    setSelectedUser(user);
    setIsOpen(true);
  };

  const handleResetFilters = () => {
    setQSearch("");
    setQRole("all");
    setQActiveStatus("all");
    setQBanStatus("all");
    setAppliedRole("all");
    setAppliedActiveStatus("all");
    setAppliedBanStatus("all");
    setPage(1);
  };

  const applyFilters = () => {
    setAppliedRole(qRole);
    setAppliedActiveStatus(qActiveStatus);
    setAppliedBanStatus(qBanStatus);
    setPage(1);
  };
  const hasActiveFilters =
    Boolean(qSearch.trim()) ||
    qRole !== "all" ||
    qActiveStatus !== "all" ||
    qBanStatus !== "all" ||
    appliedRole !== "all" ||
    appliedActiveStatus !== "all" ||
    appliedBanStatus !== "all";

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

  const handleToggleUserStatus = async (userId) => {
    try {
      await userApi.toggleUserStatus(accessToken, userId);
      toast.success("Cập nhật trạng thái tài khoản thành công");
      loadUsers();
    } catch (err) {
      console.error("Error toggling user status", err);
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "Lỗi cập nhật trạng thái tài khoản"
      );
      throw err;
    }
  };

  return (
    <section className="min-h-[calc(100vh-92px)] bg-[#f7f7f8] px-3 py-3">
      <header className="mb-5 flex items-center gap-2 text-lg font-bold">
        <div className="flex items-center gap-2 text-gray-900">
          <Store className="h-5 w-5" strokeWidth={1.8} />
          Quản trị hệ thống
        </div>
        <ChevronRight className="h-5 w-5 text-gray-500" />
        <div className="text-[#34ad54]">Quản lý người dùng</div>
      </header>

      <div className="mb-4 flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-start">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
          <div className="relative w-full lg:w-[300px]">
            <input
              type="text"
              placeholder="Tên, email, SĐT"
              value={qSearch}
              onChange={(e) => {
                setQSearch(e.target.value);
                setPage(1);
              }}
              className="h-12 w-full rounded-lg border border-gray-200 bg-white px-4 pr-11 text-base font-medium text-gray-800 outline-none placeholder:text-slate-300 focus:border-[#34ad54]"
            />
            <Search className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          </div>

          <div className="text-base font-bold text-gray-500">Lọc bởi:</div>

          <FilterSelect
            label="Vai trò"
            value={qRole}
            onChange={(value) => {
              setQRole(value);
            }}
            options={[
              { value: "all", label: "Tất cả vai trò" },
              { value: "customer", label: "Khách hàng" },
              { value: "manager", label: "Manager" },
              { value: "admin", label: "Admin" },
            ]}
            className="lg:w-[220px]"
          />

          <FilterSelect
            label="Ban status"
            value={qBanStatus}
            onChange={(value) => {
              setQBanStatus(value);
            }}
            options={[
              { value: "all", label: "Tất cả ban status" },
              { value: "banned", label: "Đang bị ban" },
              { value: "not_banned", label: "Không bị ban" },
            ]}
            className="lg:w-[220px]"
          />

          <FilterSelect
            label="Trạng thái"
            value={qActiveStatus}
            onChange={(value) => {
              setQActiveStatus(value);
            }}
            options={[
              { value: "all", label: "Tất cả trạng thái" },
              { value: "active", label: "Đã kích hoạt" },
              { value: "unverified", label: "Chưa xác thực email" },
              { value: "disabled", label: "Vô hiệu hóa" },
            ]}
            className="lg:w-[220px]"
          />

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="whitespace-nowrap text-base font-bold text-[#34ad54] underline underline-offset-4 hover:text-[#2f9b45]"
            >
              Chọn mặc định
            </button>
          )}

        </div>

          <Button
            type="button"
            onClick={applyFilters}
            className="h-12 w-full min-w-[110px] shrink-0 rounded-lg bg-[#34ad54] px-5 text-base font-bold text-white hover:bg-[#2f9b45] sm:w-auto"
          >
            Áp dụng
          </Button>
      </div>

      <section className="pb-16 w-full">
        <UsersTable
          users={users}
          isLoading={isLoading}
          onRowClick={handleRowClick}
        />

        <AdminPagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalUsers}
          pageSize={limit}
          itemLabel="người dùng"
          onPageChange={setPage}
        />
      </section>

      <UserModal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        user={selectedUser}
        onBanUser={handleBanUser}
        onUnbanUser={handleUnbanUser}
        onToggleUserStatus={handleToggleUserStatus}
      />
    </section>
  );
};

export default AdminUserAccount;


