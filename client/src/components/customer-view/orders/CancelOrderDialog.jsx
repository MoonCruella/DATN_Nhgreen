import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const CancelOrderDialog = ({ open, onClose, order, onConfirm }) => {
  const [selectedReason, setSelectedReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const cancelReasons = [
    { value: "payment_issue", label: "Vấn đề về thanh toán" },
    { value: "address_change", label: "Có thay đổi địa chỉ nhận hàng" },
    { value: "wrong_order", label: "Đặt nhầm món/thông tin" },
    { value: "other", label: "Lý do khác" },
  ];

  const handleSubmit = async () => {
    if (!selectedReason) {
      return;
    }

    if (selectedReason === "other" && !customReason.trim()) {
      return;
    }

    setIsSubmitting(true);

    let reason = cancelReasons.find((r) => r.value === selectedReason)?.label;
    if (selectedReason === "other") {
      reason = customReason.trim();
    }

    await onConfirm(order._id, reason);

    setIsSubmitting(false);
    handleClose();
  };

  const handleClose = () => {
    setSelectedReason("");
    setCustomReason("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Yêu cầu hủy đơn hàng #{order?.order_number}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <Label className="text-base font-semibold">
              Vui lòng chọn lý do hủy đơn hàng:
            </Label>
            <RadioGroup
              value={selectedReason}
              onValueChange={setSelectedReason}
            >
              {cancelReasons.map((reason) => (
                <div key={reason.value} className="flex items-center space-x-3">
                  <RadioGroupItem value={reason.value} id={reason.value} />
                  <Label
                    htmlFor={reason.value}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {reason.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {selectedReason === "other" && (
            <div className="space-y-2">
              <Label htmlFor="customReason" className="text-sm font-medium">
                Vui lòng nêu rõ lý do:
              </Label>
              <Textarea
                id="customReason"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Nhập lý do hủy đơn hàng..."
                className="min-h-[100px]"
              />
            </div>
          )}

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>Lưu ý:</strong> Yêu cầu hủy đơn sẽ được gửi đến quản lý
              cửa hàng. Đơn hàng chỉ được hủy sau khi được duyệt.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
            className="cursor-pointer"
          >
            Đóng
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              !selectedReason ||
              (selectedReason === "other" && !customReason.trim()) ||
              isSubmitting
            }
            className="bg-red-600 hover:bg-red-700 text-white cursor-pointer"
          >
            {isSubmitting ? "Đang gửi yêu cầu..." : "Gửi yêu cầu hủy"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CancelOrderDialog;
