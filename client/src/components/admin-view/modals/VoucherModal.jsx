import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function VoucherForm({ open, onClose, onSubmit, initialData }) {
  const defaultForm = {
    code: "",
    type: "DISCOUNT",
    isPercent: true,
    discountValue: 0,
    maxDiscount: 0,
    minOrderValue: 0,
    startDate: "",
    endDate: "",
    usageLimit: 0,
    active: true,
  };

  const formatToInputDate = (value) => {
    if (!value) return "";
    const d = new Date(value);
    if (isNaN(d)) return "";
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  // VND formatting helpers
  const formatVND = (v) => {
    if (v === null || v === undefined || v === "") return "";
    const n = Number(String(v).replace(/[^\d.-]/g, "")) || 0;
    if (n === 0) return "";
    return n.toLocaleString("vi-VN") + " ₫";
  };

  const parseNumber = (str) => {
    if (str === null || str === undefined) return 0;
    const digits = String(str).replace(/[^\d-]/g, "");
    return digits === "" ? 0 : Number(digits);
  };

  const [form, setForm] = useState(defaultForm);
  const [errors, setErrors] = useState({});
  const discountRef = useRef(null);
  const [focusedField, setFocusedField] = useState(null);

  // populate form when modal opens or when initialData changes
  useEffect(() => {
    if (!open) return;

    if (initialData) {
      const merged = {
        ...defaultForm,
        ...initialData,
      };

      // normalize date fields to YYYY-MM-DD for <input type="date">
      merged.startDate =
        formatToInputDate(
          initialData.startDate ??
            initialData.start_date ??
            initialData.start_at ??
            initialData.start
        ) || merged.startDate;
      merged.endDate =
        formatToInputDate(
          initialData.endDate ??
            initialData.end_date ??
            initialData.end_at ??
            initialData.end ??
            initialData.expireDate ??
            initialData.expiryDate
        ) || merged.endDate;

      setForm(merged);
      return;
    }

    // when opened for a new voucher, reset to defaults
    setForm(defaultForm);
  }, [open, initialData]);

  const handleChange = (field, value) => {
    setForm({ ...form, [field]: value });
  };

  const handleSubmit = () => {
    const newErrors = {};

    // required: code
    if (!String(form.code || "").trim())
      newErrors.code = "Vui lòng nhập mã voucher";

    // type-specific validations
    if (form.type === "DISCOUNT") {
      const val = Number(form.discountValue) || 0;
      if (val <= 0)
        newErrors.discountValue = "Vui lòng nhập giá trị giảm lớn hơn 0";
      if (form.isPercent && val > 100)
        newErrors.discountValue = "Giá trị % phải ≤ 100";
      // nếu là % thì yêu cầu giảm tối đa (đ) (nếu muốn bắt buộc)
      if (form.isPercent) {
        const max = Number(form.maxDiscount) || 0;
        if (max <= 0) newErrors.maxDiscount = "Vui lòng nhập Giảm tối đa (VNĐ)";
      }
    } else if (form.type === "FREESHIP") {
      const max = Number(form.maxDiscount) || 0;
      if (max <= 0)
        newErrors.maxDiscount = "Vui lòng nhập mức hỗ trợ phí ship (VNĐ)";
    }

    // dates
    if (!form.startDate) newErrors.startDate = "Vui lòng chọn ngày bắt đầu";
    if (!form.endDate) newErrors.endDate = "Vui lòng chọn ngày kết thúc";
    if (form.startDate && form.endDate) {
      const s = new Date(form.startDate);
      const e = new Date(form.endDate);
      if (!isNaN(s) && !isNaN(e) && s > e)
        newErrors.endDate = "Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu";
    }

    // if any error -> show and focus first field
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // focus first problematic field if available
      if (newErrors.code) {
        const el = document.querySelector('input[placeholder="VD: SALE20"]');
        if (el) el.focus();
      } else if (newErrors.discountValue && discountRef.current) {
        discountRef.current.focus();
      }
      return;
    }

    setErrors({});
    onSubmit(form);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto rounded-xl bg-white px-6 py-6 shadow-xl ring-0 animate-modal-pop">
        <DialogHeader>
          <DialogTitle>
            <div className="mb-2 text-center">
              <span className="text-lg font-bold text-black">
                {initialData ? "Cập nhật Voucher" : "Thêm Voucher mới"}
              </span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Code */}
            <div className="col-span-1 md:col-span-2">
              <Label className="text-sm font-bold text-black">
                Mã voucher <span className="text-red-500">*</span>
              </Label>
              <Input
                value={form.code}
                onChange={(e) => {
                  setErrors((p) => ({ ...p, code: null }));
                  handleChange("code", e.target.value);
                }}
                placeholder="VD: SALE20"
                className="mt-2 h-11 rounded-lg border-gray-200 text-sm font-medium text-black placeholder:text-gray-400 focus:border-green-500 focus-visible:ring-0"
              />
              {errors.code && (
                <div className="mt-1 text-xs text-red-600">{errors.code}</div>
              )}
            </div>

            {/* Type */}
            <div>
              <Label className="text-sm font-bold text-black">Loại</Label>
              <Select
                value={form.type}
                onValueChange={(val) => handleChange("type", val)}
              >
                <SelectTrigger className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white text-sm font-medium text-slate-700 focus:border-green-500 focus:ring-0 focus-visible:ring-0">
                  <SelectValue placeholder="Chọn loại" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DISCOUNT">Giảm giá</SelectItem>
                  <SelectItem value="FREESHIP">Free ship</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Percent switch */}
            {form.type === "DISCOUNT" && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Switch
                    className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600 bg-gray-200 border-gray-200 cursor-pointer"
                    checked={form.isPercent}
                    onCheckedChange={(val) => handleChange("isPercent", val)}
                  />
                  <Label className="text-sm font-bold text-black">Giảm theo %</Label>
                </div>
              </div>
            )}

            {/* Discount value */}
            {form.type === "DISCOUNT" && (
              <>
                <div>
                  <Label className="text-sm font-bold text-black">
                    {form.isPercent ? "% giảm " : "Số tiền giảm (đ)"} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    ref={discountRef}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={
                      form.isPercent
                        ? // percent: plain number always
                          form.discountValue ?? ""
                        : // money: show raw when focused, formatted otherwise
                        focusedField === "discountValue"
                        ? form.discountValue !== 0 && form.discountValue != null
                          ? String(parseNumber(form.discountValue))
                          : ""
                        : formatVND(form.discountValue)
                    }
                    onFocus={() => setFocusedField("discountValue")}
                    onBlur={() => setFocusedField(null)}
                    onChange={(e) => {
                      setErrors((p) => ({ ...p, discountValue: null }));
                      const val = form.isPercent
                        ? Number(e.target.value || 0)
                        : parseNumber(e.target.value);
                      handleChange("discountValue", val);
                    }}
                    placeholder={form.isPercent ? "VD: 20" : "VD: 50000"}
                    className="mt-2 h-11 rounded-lg border-gray-200 text-sm font-medium text-black placeholder:text-gray-400 focus:border-green-500 focus-visible:ring-0"
                    aria-invalid={!!errors.discountValue}
                  />
                  {errors.discountValue && (
                    <div className="mt-1 text-xs text-red-600">
                      {errors.discountValue}
                    </div>
                  )}
                </div>

                {/* Hiện 'Giảm tối đa' chỉ khi giảm theo % */}
                {form.isPercent && (
                  <div>
                    <Label className="text-sm font-bold text-black">
                      Giảm tối đa (đ) <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={
                        focusedField === "maxDiscount"
                          ? form.maxDiscount !== 0 && form.maxDiscount != null
                            ? String(parseNumber(form.maxDiscount))
                            : ""
                          : formatVND(form.maxDiscount)
                      }
                      onFocus={() => setFocusedField("maxDiscount")}
                      onBlur={() => setFocusedField(null)}
                      onChange={(e) => {
                        setErrors((p) => ({ ...p, maxDiscount: null }));
                        handleChange(
                          "maxDiscount",
                          parseNumber(e.target.value)
                        );
                      }}
                      placeholder="VD: 50000"
                      className="mt-2 h-11 rounded-lg border-gray-200 text-sm font-medium text-black placeholder:text-gray-400 focus:border-green-500 focus-visible:ring-0"
                    />
                    {errors.maxDiscount && (
                      <div className="mt-1 text-xs text-red-600">
                        {errors.maxDiscount}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* FREESHIP */}
            {form.type === "FREESHIP" && (
              <div className="md:col-span-2">
                <Label className="text-sm font-bold text-black">
                  Hỗ trợ phí ship tối đa (đ) <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={
                    focusedField === "maxDiscount"
                      ? form.maxDiscount !== 0 && form.maxDiscount != null
                        ? String(parseNumber(form.maxDiscount))
                        : ""
                      : formatVND(form.maxDiscount)
                  }
                  onFocus={() => setFocusedField("maxDiscount")}
                  onBlur={() => setFocusedField(null)}
                  onChange={(e) =>
                    handleChange("maxDiscount", parseNumber(e.target.value))
                  }
                  placeholder="VD: 30000"
                  className="mt-2 h-11 rounded-lg border-gray-200 text-sm font-medium text-black placeholder:text-gray-400 focus:border-green-500 focus-visible:ring-0"
                />
              </div>
            )}

            {/* Common fields */}
            <div>
              <Label className="text-sm font-bold text-black">
                Đơn hàng tối thiểu
              </Label>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={
                  focusedField === "minOrderValue"
                    ? form.minOrderValue !== 0 && form.minOrderValue != null
                      ? String(parseNumber(form.minOrderValue))
                      : ""
                    : formatVND(form.minOrderValue)
                }
                onFocus={() => setFocusedField("minOrderValue")}
                onBlur={() => setFocusedField(null)}
                onChange={(e) => {
                  setErrors((p) => ({ ...p, minOrderValue: null }));
                  handleChange("minOrderValue", parseNumber(e.target.value));
                }}
                className="mt-2 h-11 rounded-lg border-gray-200 text-sm font-medium text-black placeholder:text-gray-400 focus:border-green-500 focus-visible:ring-0"
              />
              {errors.minOrderValue && (
                <div className="mt-1 text-xs text-red-600">
                  {errors.minOrderValue}
                </div>
              )}
            </div>

            <div>
              <Label className="text-sm font-bold text-black">Giới hạn số lượt</Label>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={form.usageLimit}
                onChange={(e) =>
                  handleChange("usageLimit", Number(e.target.value))
                }
                className="mt-2 h-11 rounded-lg border-gray-200 text-sm font-medium text-black placeholder:text-gray-400 focus:border-green-500 focus-visible:ring-0"
              />
            </div>

            <div>
              <Label className="text-sm font-bold text-black">
                Ngày bắt đầu <span className="text-red-500">*</span>
              </Label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => {
                  setErrors((p) => ({ ...p, startDate: null, endDate: null }));
                  handleChange("startDate", e.target.value);
                }}
                className="mt-2 h-11 cursor-pointer rounded-lg border-gray-200 text-sm font-medium text-black focus:border-green-500 focus-visible:ring-0"
              />
              {errors.startDate && (
                <div className="mt-1 text-xs text-red-600">
                  {errors.startDate}
                </div>
              )}
            </div>

            <div>
              <Label className="text-sm font-bold text-black">
                Ngày kết thúc <span className="text-red-500">*</span>
              </Label>
              <Input
                type="date"
                value={form.endDate}
                onChange={(e) => {
                  setErrors((p) => ({ ...p, endDate: null }));
                  handleChange("endDate", e.target.value);
                }}
                disabled={!form.startDate}
                className="mt-2 h-11 cursor-pointer rounded-lg border-gray-200 text-sm font-medium text-black focus:border-green-500 focus-visible:ring-0 disabled:cursor-not-allowed disabled:bg-gray-100"
              />
              {errors.endDate && (
                <div className="mt-1 text-xs text-red-600">
                  {errors.endDate}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 md:col-span-2">
              <Switch
                className="data-[state=checked]:bg-green-800 data-[state=checked]:border-green-800 bg-gray-200 border-gray-200 cursor-pointer"
                checked={form.active}
                onCheckedChange={(val) => handleChange("active", val)}
              />
              <Label className="text-sm font-bold text-black">Đang hoạt động</Label>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-6">
          <div className="grid w-full grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="h-10 cursor-pointer rounded-lg border-green-500 text-sm font-bold text-green-600 hover:bg-green-50 hover:text-green-700"
            >
              Quay lại
            </Button>
            <Button
              onClick={handleSubmit}
              className="h-10 cursor-pointer rounded-lg bg-[#34ad54] text-sm font-bold text-white hover:bg-[#2f9b45]"
            >
              Lưu
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


