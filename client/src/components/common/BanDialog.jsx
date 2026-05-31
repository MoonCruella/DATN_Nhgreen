import React, { useState, useEffect } from "react";
import { Ban, Clock } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

const BanDialog = ({ open, onClose, banInfo, onLogout }) => {
  const [timeRemaining, setTimeRemaining] = useState("");

  useEffect(() => {
    if (!open || !banInfo?.banned_until) {
      setTimeRemaining("");
      return;
    }

    const updateCountdown = () => {
      const now = new Date();
      const bannedUntil = new Date(banInfo.banned_until);

      // Validate date
      if (isNaN(bannedUntil.getTime())) {
        setTimeRemaining("");
        return;
      }

      const diff = bannedUntil - now;

      if (diff <= 0) {
        setTimeRemaining("");
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 24) {
        const days = Math.floor(hours / 24);
        const remainingHours = hours % 24;
        setTimeRemaining(`${days} ngày ${remainingHours} giờ`);
      } else if (hours > 0) {
        setTimeRemaining(`${hours} giờ ${minutes} phút`);
      } else {
        setTimeRemaining(`${minutes} phút ${seconds} giây`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [open, banInfo]);

  if (!open || !banInfo) return null;

  // Validate and parse banned_until date
  const getBannedUntilDate = () => {
    if (!banInfo.banned_until) return null;
    const date = new Date(banInfo.banned_until);
    return isNaN(date.getTime()) ? null : date;
  };

  const bannedUntilDate = getBannedUntilDate();

  const getBanReasonText = () => {
    if (banInfo.reason === "cancel_order") {
      return "hủy đơn hàng liên tiếp quá nhiều lần";
    }
    if (banInfo.reason === "admin_ban") {
      return "vi phạm chính sách của hệ thống";
    }
    return "vi phạm chính sách";
  };

  const handleClose = () => {
    if (onLogout) {
      onLogout();
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <Ban className="w-8 h-8 text-red-600" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
            Tài khoản đã bị khóa
          </h2>

          <p className="text-center text-gray-600 mb-6">
            Tài khoản của bạn đã bị khóa tạm thời do{" "}
            <span className="font-semibold text-red-600">
              {getBanReasonText()}
            </span>
          </p>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <Clock className="w-5 h-5 text-red-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-900">
                  Thời gian khóa đến:
                </p>
                <p className="text-base font-bold text-red-700">
                  {bannedUntilDate
                    ? format(bannedUntilDate, "HH:mm - dd/MM/yyyy", {
                        locale: vi,
                      })
                    : "Không xác định"}
                </p>
              </div>
            </div>

            {timeRemaining && (
              <div className="flex items-center gap-3 pt-3 border-t border-red-200">
                <Clock className="w-5 h-5 text-red-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-900">
                    Thời gian còn lại:
                  </p>
                  <p className="text-base font-bold text-red-700">
                    {timeRemaining}
                  </p>
                </div>
              </div>
            )}
          </div>

          {banInfo.reason === "cancel_order" && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-yellow-800">
                <span className="font-semibold">Lưu ý:</span> Để tránh bị khóa
                tài khoản, vui lòng không hủy đơn hàng liên tiếp. Nếu bạn tiếp
                tục vi phạm, thời gian khóa sẽ được tăng lên.
              </p>
            </div>
          )}

          <button
            onClick={handleClose}
            className="w-full py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
          >
            {onLogout ? "Đăng xuất" : "Đã hiểu"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BanDialog;
