import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Phone, Mail, MessageCircle, MapPin } from "lucide-react";

const ContactShopDialog = ({ open, onClose, order }) => {
  if (!order) return null;

  const branch = order.branch_id;
  const managerPhone = branch?.manager_phone || "0123456789";
  const managerEmail = branch?.manager_email || "manager@shop.com";
  const branchAddress = branch?.address || "Địa chỉ chi nhánh";
  const branchName = branch?.name || "Chi nhánh";

  const handleCallManager = () => {
    window.location.href = `tel:${managerPhone}`;
  };

  const handleEmailManager = () => {
    const subject = `Yêu cầu hỗ trợ đơn hàng #${
      order.order_number || order._id
    }`;
    const body = `Xin chào,\n\nTôi cần hỗ trợ về đơn hàng #${
      order.order_number || order._id
    }.\nTrạng thái: Đã giao nhưng chưa nhận được hàng.\n\nVui lòng liên hệ lại với tôi sớm nhất.\n\nCảm ơn.`;
    window.location.href = `mailto:${managerEmail}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-800">
            Liên hệ với Shop
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Chúng tôi rất tiếc vì sự bất tiện này. Vui lòng liên hệ với quản lý
            chi nhánh để được hỗ trợ.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Order Info */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <p className="text-sm text-orange-800 font-semibold mb-1">
              Đơn hàng: #{order.order_number || order._id?.slice(-8)}
            </p>
            <p className="text-xs text-orange-600">
              Trạng thái: Đã giao nhưng chưa nhận được hàng
            </p>
          </div>

          {/* Branch Info */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-800 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-green-600" />
              Thông tin chi nhánh
            </h4>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="font-medium text-gray-800 mb-2">{branchName}</p>
              <p className="text-sm text-gray-600">{branchAddress}</p>
            </div>
          </div>

          {/* Contact Methods */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-800 flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-blue-600" />
              Phương thức liên hệ
            </h4>

            {/* Phone */}
            <button
              onClick={handleCallManager}
              className="w-full flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all group"
            >
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center group-hover:bg-green-200 transition">
                <Phone className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-gray-800">Gọi điện thoại</p>
                <p className="text-sm text-gray-600">{managerPhone}</p>
              </div>
            </button>

            {/* Email */}
            <button
              onClick={handleEmailManager}
              className="w-full flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition">
                <Mail className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-gray-800">Gửi email</p>
                <p className="text-sm text-gray-600">{managerEmail}</p>
              </div>
            </button>
          </div>

          {/* Note */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Lưu ý:</strong> Quản lý chi nhánh sẽ liên hệ lại với bạn
              trong vòng 24h để giải quyết vấn đề.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
          >
            Đóng
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ContactShopDialog;
