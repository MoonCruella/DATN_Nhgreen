import React, { useState, useEffect } from "react";
import { getAllProvinces, getCoordinatesFromAddress } from "@/api/locationApi";
import AddressAutocomplete from "@/components/customer-view/address/AddressAutocomplete";

const BranchModal = ({ open, onClose, initialData, onSubmit, onDelete }) => {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    street: "",
    provinceCode: null,
    districtCode: null,
    wardCode: null,
    active: true,
    coordinates: {
      latitude: null,
      longitude: null,
    },
  });

  const [provinces, setProvinces] = useState([]);

  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [initialSnapshot, setInitialSnapshot] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loadingCoords, setLoadingCoords] = useState(false);

  // derived lists
  const selectedProvince = provinces.find(
    (p) => p.code === Number(form.provinceCode)
  );
  const districts = selectedProvince ? selectedProvince.districts || [] : [];
  const selectedDistrict = districts.find(
    (d) => d.code === Number(form.districtCode)
  );
  const wards = selectedDistrict ? selectedDistrict.wards || [] : [];

  useEffect(() => {
    // fetch provinces with depth=3 once
    getAllProvinces()
      .then((data) => setProvinces(data || []))
      .catch((e) => {
        console.error("Failed to load provinces", e);
      });
  }, []);

  useEffect(() => {
    if (initialData) {
      const addr = initialData.address || {};
      // normalize active (could be boolean or string)
      let activeVal = true;
      if (typeof initialData.active !== "undefined") {
        if (typeof initialData.active === "string") {
          activeVal = initialData.active === "true";
        } else {
          activeVal = Boolean(initialData.active);
        }
      }

      setForm({
        name: initialData.name || "",
        phone: initialData.phone || "",
        street: addr.street || "",
        provinceCode: addr.province?.code ?? null,
        districtCode: addr.district?.code ?? null,
        wardCode: addr.ward?.code ?? null,
        active: activeVal,
        coordinates: {
          latitude: addr.coordinates?.latitude ?? null,
          longitude: addr.coordinates?.longitude ?? null,
        },
      });
      // snapshot initial form state for dirty checking
      setInitialSnapshot({
        name: initialData.name || "",
        phone: initialData.phone || "",
        street: addr.street || "",
        provinceCode: addr.province?.code ?? null,
        districtCode: addr.district?.code ?? null,
        wardCode: addr.ward?.code ?? null,
        active: activeVal,
        coordinates: {
          latitude: addr.coordinates?.latitude ?? null,
          longitude: addr.coordinates?.longitude ?? null,
        },
      });
    } else {
      setForm({
        name: "",
        phone: "",
        street: "",
        provinceCode: null,
        districtCode: null,
        wardCode: null,
        active: true,
        coordinates: {
          latitude: null,
          longitude: null,
        },
      });
      setInitialSnapshot({
        name: "",
        phone: "",
        street: "",
        provinceCode: null,
        districtCode: null,
        wardCode: null,
        active: true,
        coordinates: {
          latitude: null,
          longitude: null,
        },
      });
    }
  }, [initialData]);

  // also reset initial snapshot when modal opens
  useEffect(() => {
    if (!open) return;
    if (initialSnapshot === null) return;
    setInitialSnapshot((s) => s);
  }, [open]);

  // reset delete confirmation when modal opens or branch changes
  useEffect(() => {
    setShowDeleteConfirm(false);
    setDeleteConfirm("");
  }, [open, initialData]);

  // when opening the modal in "add" mode (no initialData), ensure form is cleared
  useEffect(() => {
    if (!open) return;
    if (initialData) return; // edit mode will populate form via other effect

    const empty = {
      name: "",
      phone: "",
      street: "",
      provinceCode: null,
      districtCode: null,
      wardCode: null,
      active: true,
      coordinates: {
        latitude: null,
        longitude: null,
      },
    };
    setForm(empty);
    setInitialSnapshot(empty);
    setShowDeleteConfirm(false);
    setDeleteConfirm("");
  }, [open, initialData]);

  if (!open) return null;

  // Handle chọn địa chỉ từ autocomplete
  const handleSelectLocation = (location) => {
    // Lưu toàn bộ displayName hoặc address làm street (địa chỉ đầy đủ)
    const fullAddress = location.displayName || location.address;
    setForm({
      ...form,
      street: fullAddress,
      coordinates: {
        latitude: location.latitude,
        longitude: location.longitude,
      },
    });
  };

  // Tự động lấy tọa độ từ tỉnh/huyện/xã (không dùng địa chỉ chi tiết)
  const handleFetchCoordinates = async () => {
    if (!form.provinceCode || !form.districtCode || !form.wardCode) {
      return;
    }

    const province = provinces.find(
      (p) => p.code === Number(form.provinceCode)
    );
    const district = (province?.districts || []).find(
      (d) => d.code === Number(form.districtCode)
    );
    const ward = (district?.wards || []).find(
      (w) => w.code === Number(form.wardCode)
    );

    // Chỉ dùng phường/quận/tỉnh để fetch tọa độ
    const addressQuery = [ward?.name, district?.name, province?.name]
      .filter(Boolean)
      .join(", ");

    setLoadingCoords(true);
    try {
      const result = await getCoordinatesFromAddress(addressQuery);
      if (result) {
        setForm({
          ...form,
          coordinates: {
            latitude: result.latitude,
            longitude: result.longitude,
          },
        });
      }
    } catch (error) {
      console.error("Error fetching coordinates:", error);
    } finally {
      setLoadingCoords(false);
    }
  };

  const handleSave = async () => {
    if (saving) return; // guard double submit
    setSaving(true);
    // build address object expected by server
    const province = provinces.find(
      (p) => p.code === Number(form.provinceCode)
    );
    const district = (province?.districts || []).find(
      (d) => d.code === Number(form.districtCode)
    );
    const ward = (district?.wards || []).find(
      (w) => w.code === Number(form.wardCode)
    );

    const address = {
      street: form.street || "",
      ward: ward ? { code: ward.code, name: ward.name } : {},
      district: district ? { code: district.code, name: district.name } : {},
      province: province ? { code: province.code, name: province.name } : {},
      coordinates: form.coordinates,
    };

    // full_address = địa chỉ chi tiết (street) - không nối thêm
    address.full_address = form.street || "";

    const payload = {
      name: form.name,
      phone: form.phone,
      address,
      active: form.active === true || form.active === "true",
    };
    console.debug("BranchModal: saving payload", payload);
    try {
      if (onSubmit) {
        const res = onSubmit(payload);
        if (res && res.then) await res;
      }
    } finally {
      setSaving(false);
    }
  };

  // compute dirty flag comparing current form to initial snapshot
  const isDirty = (() => {
    if (!initialSnapshot) return true; // if no snapshot assume dirty (new)
    const keys = [
      "name",
      "phone",
      "street",
      "provinceCode",
      "districtCode",
      "wardCode",
      "active",
    ];
    for (const k of keys) {
      // loose compare after normalizing null/undefined
      const a = initialSnapshot[k] ?? null;
      const b = form[k] ?? null;
      if (String(a) !== String(b)) return true;
    }
    // Check coordinates
    if (
      initialSnapshot.coordinates?.latitude !== form.coordinates?.latitude ||
      initialSnapshot.coordinates?.longitude !== form.coordinates?.longitude
    ) {
      return true;
    }
    return false;
  })();

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl">
        <h3 className="text-lg font-semibold mb-4">
          {initialData ? "Chi tiết / Sửa chi nhánh" : "Thêm chi nhánh"}
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col">
            <span className="text-sm text-gray-600">Tên</span>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="border rounded px-3 py-2"
            />
          </label>
          <label className="flex flex-col">
            <span className="text-sm text-gray-600">Số điện thoại</span>
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="border rounded px-3 py-2"
            />
          </label>

          <label className="col-span-2 flex flex-col">
            <span className="text-sm text-gray-600">
              Số nhà / Đường{" "}
              {loadingCoords && (
                <span className="text-xs text-gray-400">
                  (Đang lấy tọa độ...)
                </span>
              )}
            </span>
            <AddressAutocomplete
              value={form.street}
              onChange={(value) => setForm({ ...form, street: value })}
              onSelectLocation={handleSelectLocation}
              province={
                provinces.find((p) => p.code === Number(form.provinceCode))
                  ?.name || ""
              }
              district={
                districts.find((d) => d.code === Number(form.districtCode))
                  ?.name || ""
              }
              ward={
                wards.find((w) => w.code === Number(form.wardCode))?.name || ""
              }
            />
            {form.coordinates?.latitude && form.coordinates?.longitude && (
              <p className="text-xs text-green-600 mt-1">
                ✓ Tọa độ: {form.coordinates.latitude.toFixed(6)},{" "}
                {form.coordinates.longitude.toFixed(6)}
              </p>
            )}
            {!form.coordinates?.latitude &&
              form.provinceCode &&
              form.districtCode &&
              form.wardCode && (
                <button
                  type="button"
                  onClick={handleFetchCoordinates}
                  disabled={loadingCoords}
                  className="text-xs text-blue-600 hover:underline mt-1 text-left"
                >
                  {loadingCoords
                    ? "Đang lấy tọa độ..."
                    : "Lấy tọa độ từ phường/xã đã chọn"}
                </button>
              )}
          </label>

          <label className="flex flex-col">
            <span className="text-sm text-gray-600">Tỉnh / Thành</span>
            <select
              value={form.provinceCode ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  provinceCode: e.target.value,
                  districtCode: null,
                  wardCode: null,
                })
              }
              className="border rounded px-3 py-2"
            >
              <option value="">Chọn tỉnh/thành</option>
              {provinces.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col">
            <span className="text-sm text-gray-600">Quận / Huyện</span>
            <select
              value={form.districtCode ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  districtCode: e.target.value,
                  wardCode: null,
                })
              }
              className="border rounded px-3 py-2"
            >
              <option value="">Chọn quận/huyện</option>
              {districts.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col">
            <span className="text-sm text-gray-600">Phường / Xã</span>
            <select
              value={form.wardCode ?? ""}
              onChange={(e) => setForm({ ...form, wardCode: e.target.value })}
              className="border rounded px-3 py-2"
            >
              <option value="">Chọn phường/xã</option>
              {wards.map((w) => (
                <option key={w.code} value={w.code}>
                  {w.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />
            <span className="text-sm text-gray-600">Kích hoạt</span>
          </label>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          {initialData && !showDeleteConfirm && (
            <div className="flex justify-start">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 bg-white border rounded text-red-600"
              >
                Xóa
              </button>
            </div>
          )}

          {initialData && showDeleteConfirm && (
            <div className="bg-red-50 border border-red-100 p-4 rounded">
              <p className="text-sm text-red-700 mb-2">
                Để xóa chi nhánh, nhập <strong>delete</strong> vào ô bên dưới để
                xác nhận.
              </p>
              <input
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder="gõ delete để xác nhận"
                className="w-full border rounded px-3 py-2 mb-3"
              />
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setDeleteConfirm("");
                    setShowDeleteConfirm(false);
                  }}
                  className="px-4 py-2 bg-gray-100 rounded cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  onClick={async () => {
                    if (deleting) return;
                    if (deleteConfirm !== "delete") return;
                    if (!onDelete) return;
                    setDeleting(true);
                    try {
                      const res = onDelete(initialData._id);
                      if (res && res.then) await res;
                    } finally {
                      setDeleting(false);
                    }
                  }}
                  disabled={deleteConfirm !== "delete" || deleting}
                  className={`px-4 py-2 rounded ${
                    deleteConfirm === "delete"
                      ? deleting
                        ? "bg-red-400 text-white cursor-wait"
                        : "bg-red-600 text-white"
                      : "bg-red-200 text-red-600 cursor-not-allowed"
                  }`}
                >
                  {deleting ? "Đang xóa..." : "Xác nhận xóa"}
                </button>
              </div>
            </div>
          )}
          <div className="mt-2 flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 bg-gray-100 rounded cursor-pointer">
              Đóng
            </button>
            <button
              onClick={handleSave}
              disabled={!isDirty || saving}
              className={`px-4 py-2 rounded ${
                !isDirty || saving
                  ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                  : "bg-gray-800 text-white"
              }`}
            >
              {saving ? "Đang lưu..." : "Lưu"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BranchModal;
