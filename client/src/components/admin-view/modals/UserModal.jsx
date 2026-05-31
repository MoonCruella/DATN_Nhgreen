import React, { useState } from "react";
import {
  X,
  User,
  Mail,
  Phone,
  Shield,
  CheckCircle,
  XCircle,
  MapPin,
  Ban,
  Unlock,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

const UserModal = ({ open, onClose, user, onBanUser, onUnbanUser }) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showBanDialog, setShowBanDialog] = useState(false);
  const [banDuration, setBanDuration] = useState("1");
  const [banReason, setBanReason] = useState("");

  if (!open || !user) return null;

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

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const isBanned =
    user?.ban_info?.status !== null && user?.ban_info?.status !== undefined;
  const banUntil = user?.ban_info?.banned_until
    ? new Date(user.ban_info.banned_until)
    : null;
  const isBanActive = isBanned && banUntil && banUntil > new Date();

  const getRoleBadge = (role) => {
    const roleMap = {
      admin: { text: "Admin", color: "bg-red-100 text-red-800" },
      manager: { text: "Manager", color: "bg-blue-100 text-blue-800" },
      customer: { text: "Khách hàng", color: "bg-green-100 text-green-800" },
    };
    const badge = roleMap[role] || {
      text: role,
      color: "bg-gray-100 text-gray-800",
    };
    return (
      <span
        className={`px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}
      >
        {badge.text}
      </span>
    );
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">
              Thông tin người dùng
            </h2>
            <p className="text-sm text-gray-500 mt-1">ID: {user._id}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
              <User className="w-5 h-5" />
              Thông tin cá nhân
            </h3>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-gray-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-500">Tên</p>
                  <p className="font-medium text-gray-800">
                    {user.name || "Chưa cập nhật"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-gray-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium text-gray-800">{user.email}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-gray-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-500">Số điện thoại</p>
                  <p className="font-medium text-gray-800">
                    {user.phone || "Chưa cập nhật"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-gray-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-500">Giới tính</p>
                  <p className="font-medium text-gray-800">
                    {user.gender === "male"
                      ? "Nam"
                      : user.gender === "female"
                      ? "Nữ"
                      : "Chưa cập nhật"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-gray-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-500">Xu (Coin)</p>
                  <p className="font-medium text-gray-800">
                    {user.coin || 0} xu
                  </p>
                </div>
              </div>
            </div>
          </div>

          {user.shipping_addresses && user.shipping_addresses.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Địa chỉ giao hàng ({user.shipping_addresses.length})
              </h3>
              <div className="space-y-2">
                {user.shipping_addresses.map((addr, idx) => (
                  <div key={idx} className="bg-white p-3 rounded-lg text-sm">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">
                          {addr.full_name} - {addr.phone}
                        </p>
                        <p className="text-gray-600">{addr.full_address}</p>
                        {addr.is_default && (
                          <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">
                            Mặc định
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Thông tin tài khoản
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Vai trò:</span>
                {getRoleBadge(user.role)}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-600">Trạng thái:</span>
                {isBanActive ? (
                  <span className="flex items-center gap-2 text-red-600">
                    <Ban className="w-5 h-5" />
                    Đã bị ban
                  </span>
                ) : user.active ? (
                  <span className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-5 h-5" />
                    Đã kích hoạt
                  </span>
                ) : (
                  <span className="flex items-center gap-2 text-orange-600">
                    <XCircle className="w-5 h-5" />
                    Chưa kích hoạt
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-600">Ngày tạo:</span>
                <span className="font-medium text-gray-800">
                  {user.createdAt
                    ? format(new Date(user.createdAt), "dd/MM/yyyy HH:mm", {
                        locale: vi,
                      })
                    : "N/A"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-600">Cập nhật lần cuối:</span>
                <span className="font-medium text-gray-800">
                  {user.updatedAt
                    ? format(new Date(user.updatedAt), "dd/MM/yyyy HH:mm", {
                        locale: vi,
                      })
                    : "N/A"}
                </span>
              </div>

              {user.last_login && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Đăng nhập lần cuối:</span>
                  <span className="font-medium text-gray-800">
                    {format(new Date(user.last_login), "dd/MM/yyyy HH:mm", {
                      locale: vi,
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Ban Info Section */}
          {isBanActive && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-medium text-red-800 mb-3 flex items-center gap-2">
                <Ban className="w-5 h-5" />
                Thông tin khóa tài khoản
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-red-700">Loại khóa:</span>
                  <span className="font-medium text-red-800">
                    {user.ban_info.status === "banned_login"
                      ? "Khóa đăng nhập"
                      : "Khóa đặt hàng"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-red-700">Lý do:</span>
                  <span className="font-medium text-red-800">
                    {user.ban_info.reason === "login_failed"
                      ? "Đăng nhập sai quá nhiều"
                      : user.ban_info.reason === "cancel_order"
                      ? "Hủy đơn liên tiếp"
                      : "Khóa bởi admin"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-red-700">Khóa đến:</span>
                  <span className="font-medium text-red-800">
                    {format(banUntil, "dd/MM/yyyy HH:mm", { locale: vi })}
                  </span>
                </div>
                {user.ban_info.failed_login_count > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-red-700">Số lần đăng nhập sai:</span>
                    <span className="font-medium text-red-800">
                      {user.ban_info.failed_login_count}
                    </span>
                  </div>
                )}
                {user.ban_info.cancel_order_count > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-red-700">Tổng đơn đã hủy:</span>
                    <span className="font-medium text-red-800">
                      {user.ban_info.cancel_order_count}
                    </span>
                  </div>
                )}
                {user.ban_info.cancel_order_streak > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-red-700">Chuỗi hủy liên tiếp:</span>
                    <span className="font-medium text-red-800">
                      {user.ban_info.cancel_order_streak}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Ban Dialog */}
        {showBanDialog && (
          <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Ban className="w-5 h-5 text-red-600" />
                Khóa tài khoản tạm thời
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Thời gian khóa
                  </label>
                  <select
                    value={banDuration}
                    onChange={(e) => setBanDuration(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="1">1 giờ</option>
                    <option value="3">3 giờ</option>
                    <option value="24">1 ngày</option>
                    <option value="72">3 ngày</option>
                    <option value="168">7 ngày</option>
                    <option value="720">30 ngày</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lý do khóa (tùy chọn)
                  </label>
                  <textarea
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                    placeholder="Nhập lý do khóa tài khoản..."
                    rows={3}
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowBanDialog(false)}
                  disabled={isUpdating}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  onClick={handleBanUser}
                  disabled={isUpdating}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {isUpdating ? "Đang khóa..." : "Xác nhận khóa"}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-between gap-3">
          <div className="flex gap-3">
            {isBanActive ? (
              <button
                onClick={handleUnbanUser}
                disabled={isUpdating || user.role === "admin"}
                className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
              >
                <Unlock className="w-4 h-4" />
                {isUpdating ? "Đang mở khóa..." : "Mở khóa ban"}
              </button>
            ) : (
              <button
                onClick={() => setShowBanDialog(true)}
                disabled={isUpdating || user.role === "admin"}
                className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
              >
                <Ban className="w-4 h-4" />
                Khóa tạm thời
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserModal;
