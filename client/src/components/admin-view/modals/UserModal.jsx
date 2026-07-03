import React, { useState } from "react";
import { Ban, CheckCircle, Power, Unlock, User, X, XCircle } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

const formatDateTime = (value) =>
  value ? format(new Date(value), "HH:mm dd/MM/yyyy", { locale: vi }) : "";

const displayValue = (value) => value || "";

const DetailRow = ({ label, value, children }) => (
  <div className="grid grid-cols-[180px_1fr] gap-4 border-b border-gray-100 px-1 py-3 last:border-b-0">
    <div className="text-sm font-semibold text-gray-500">{label}</div>
    <div className="break-words text-sm font-semibold text-gray-900">
      {children || displayValue(value)}
    </div>
  </div>
);

const Section = ({ title, children }) => (
  <section className="rounded-lg border border-gray-200 bg-white">
    <div className="border-b border-gray-200 px-4 py-3">
      <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
    </div>
    <div className="px-4">{children}</div>
  </section>
);

const UserModal = ({
  open,
  onClose,
  user,
  onBanUser,
  onUnbanUser,
  onToggleUserStatus,
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showBanDialog, setShowBanDialog] = useState(false);
  const [banDuration, setBanDuration] = useState("1");
  const [banReason, setBanReason] = useState("");

  if (!open || !user) return null;

  const isBanned =
    user?.ban_info?.status !== null && user?.ban_info?.status !== undefined;
  const banUntil = user?.ban_info?.banned_until
    ? new Date(user.ban_info.banned_until)
    : null;
  const isBanActive = isBanned && banUntil && banUntil > new Date();
  const isAdmin = user.role === "admin";

  const roleMap = {
    admin: "Admin",
    manager: "Manager",
    customer: "Khách hàng",
  };

  const statusMeta = isBanActive
    ? {
        label: "Đã bị ban",
        icon: Ban,
        className: "border-gray-300 text-gray-800",
      }
    : user.disabled
    ? {
        label: "Vô hiệu hóa",
        icon: XCircle,
        className: "border-gray-300 text-gray-800",
      }
    : user.active
    ? {
        label: "Đã kích hoạt",
        icon: CheckCircle,
        className: "border-gray-300 text-gray-800",
      }
    : {
        label: "Chưa xác thực email",
        icon: XCircle,
        className: "border-gray-300 text-gray-800",
      };
  const StatusIcon = statusMeta.icon;

  const handleBanUser = async () => {
    if (!onBanUser) return;
    setIsUpdating(true);
    try {
      await onBanUser(user._id, {
        duration: parseInt(banDuration),
        reason: banReason || "Vi phạm chính sách của admin",
      });
      setShowBanDialog(false);
      onClose();
    } catch (err) {
      console.error("Failed to ban user", err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUnbanUser = async () => {
    if (!onUnbanUser) return;
    setIsUpdating(true);
    try {
      await onUnbanUser(user._id);
      onClose();
    } catch (err) {
      console.error("Failed to unban user", err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!onToggleUserStatus) return;
    setIsUpdating(true);
    try {
      await onToggleUserStatus(user._id);
      onClose();
    } catch (err) {
      console.error("Failed to toggle user status", err);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between border-b border-gray-200 px-6 py-5">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold text-gray-900">
              Chi tiết người dùng
            </h2>
            <p className="mt-1 text-sm font-medium text-gray-500">
              {user._id}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-800 cursor-pointer"
            aria-label="Đóng"
          >
            <X className="h-6 w-6" />
          </button>
        </header>

        <main className="overflow-y-auto px-6 py-5">
          <div className="mb-5 flex items-center gap-4 rounded-lg border border-gray-200 px-4 py-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-gray-50">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name || "User"}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <User className="h-7 w-7 text-gray-500" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-lg font-semibold text-gray-900">
                {user.name || "Người dùng"}
              </div>
              <div className="text-sm font-medium text-gray-500">
                {user.email}
              </div>
            </div>
            <span
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border bg-white px-3 py-1 text-xs font-semibold ${statusMeta.className}`}
            >
              <StatusIcon className="h-3.5 w-3.5" />
              {statusMeta.label}
            </span>
          </div>

          <div className="space-y-5">
            <Section title="Thông tin cá nhân">
              <DetailRow label="Tên" value={user.name} />
              <DetailRow label="Email" value={user.email} />
              <DetailRow label="Số điện thoại" value={user.phone} />
              <DetailRow label="Giới tính">
                {user.gender === "male"
                  ? "Nam"
                  : user.gender === "female"
                  ? "Nữ"
                  : ""}
              </DetailRow>
              <DetailRow label="Xu tích lũy" value={`${user.coin || 0} xu`} />
            </Section>

            <Section title="Thông tin tài khoản">
              <DetailRow label="Vai trò" value={roleMap[user.role] || user.role} />
              <DetailRow label="Trạng thái" value={statusMeta.label} />
              <DetailRow label="Ngày tạo" value={formatDateTime(user.createdAt)} />
              <DetailRow label="Cập nhật lần cuối" value={formatDateTime(user.updatedAt)} />
              <DetailRow label="Đăng nhập lần cuối" value={formatDateTime(user.last_login)} />
            </Section>

            {user.shipping_addresses?.length > 0 && (
              <Section title={`Địa chỉ giao hàng (${user.shipping_addresses.length})`}>
                <div className="space-y-3 py-3">
                  {user.shipping_addresses.map((addr, idx) => (
                    <div
                      key={idx}
                      className="rounded border border-gray-200 px-4 py-3 text-sm"
                    >
                      <div className="font-bold text-gray-900">
                        {[addr.full_name, addr.phone].filter(Boolean).join(" - ")}
                      </div>
                      <div className="mt-1 font-medium text-gray-600">
                        {addr.full_address}
                      </div>
                      {addr.is_default && (
                        <span className="mt-2 inline-flex rounded-lg border border-gray-200 px-2 py-0.5 text-xs font-semibold text-gray-700">
                          Mặc định
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {isBanActive && (
              <Section title="Thông tin khóa tài khoản">
                <DetailRow label="Loại khóa">
                  {user.ban_info.status === "banned_login"
                    ? "Khóa đăng nhập"
                    : "Khóa đặt hàng"}
                </DetailRow>
                <DetailRow label="Lý do">
                  {user.ban_info.reason === "login_failed"
                    ? "Đăng nhập sai quá nhiều"
                    : user.ban_info.reason === "cancel_order"
                    ? "Hủy đơn liên tiếp"
                    : "Khóa bởi admin"}
                </DetailRow>
                <DetailRow label="Khóa đến" value={formatDateTime(banUntil)} />
                <DetailRow
                  label="Đăng nhập sai"
                  value={String(user.ban_info.failed_login_count || 0)}
                />
                <DetailRow
                  label="Tổng đơn đã hủy"
                  value={String(user.ban_info.cancel_order_count || 0)}
                />
                <DetailRow
                  label="Chuỗi hủy liên tiếp"
                  value={String(user.ban_info.cancel_order_streak || 0)}
                />
              </Section>
            )}
          </div>
        </main>

        <footer className="flex flex-col justify-between gap-3 border-t border-gray-200 bg-white px-6 py-4 sm:flex-row">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleToggleStatus}
              disabled={isUpdating || isAdmin}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer ${
                user.disabled
                  ? "bg-gray-700 hover:bg-gray-800"
                  : "bg-orange-600 hover:bg-orange-700"
              }`}
            >
              <Power className="h-4 w-4" />
              {isUpdating
                ? "Đang cập nhật..."
                : user.disabled
                ? "Mở vô hiệu hóa"
                : "Vô hiệu hóa"}
            </button>

            {isBanActive ? (
              <button
                type="button"
                onClick={handleUnbanUser}
                disabled={isUpdating || isAdmin}
                className="inline-flex items-center gap-2 rounded-lg bg-gray-700 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              >
                <Unlock className="h-4 w-4" />
                {isUpdating ? "Đang mở khóa..." : "Mở khóa ban"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowBanDialog(true)}
                disabled={isUpdating || isAdmin}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              >
                <Ban className="h-4 w-4" />
                Khóa tạm thời
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
          >
            Đóng
          </button>
        </footer>
      </div>

      {showBanDialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              Khóa tài khoản tạm thời
            </h3>

            <div className="space-y-4">
              <label className="block text-sm font-semibold text-gray-700">
                Thời gian khóa
                <select
                  value={banDuration}
                  onChange={(e) => setBanDuration(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium outline-none focus:border-gray-600"
                >
                  <option value="1">1 giờ</option>
                  <option value="3">3 giờ</option>
                  <option value="24">1 ngày</option>
                  <option value="72">3 ngày</option>
                  <option value="168">7 ngày</option>
                  <option value="720">30 ngày</option>
                </select>
              </label>

              <label className="block text-sm font-semibold text-gray-700">
                Lý do khóa
                <textarea
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  placeholder="Nhập lý do khóa tài khoản..."
                  rows={3}
                  className="mt-2 w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium outline-none focus:border-gray-600"
                />
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowBanDialog(false)}
                disabled={isUpdating}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleBanUser}
                disabled={isUpdating}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 cursor-pointer"
              >
                {isUpdating ? "Đang khóa..." : "Xác nhận khóa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserModal;
