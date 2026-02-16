import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import branchApi from "@/api/branchApi";
import locationApi from "@/api/locationApi";

const AdminBranchCreate = () => {
  const navigate = useNavigate();
  const accessToken = useSelector((state) => state.auth.accessToken);

  const [provinces, setProvinces] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loadingCoords, setLoadingCoords] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchingAddress, setSearchingAddress] = useState(false);

  // Error state
  const [errors, setErrors] = useState({
    name: "",
    provinceCode: "",
    districtCode: "",
    wardCode: "",
    street: "",
  });

  // Form state
  const [formData, setFormData] = useState({
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

  // Derived lists
  const selectedProvince = provinces.find(
    (p) => p.code === Number(formData.provinceCode)
  );
  const districts = selectedProvince ? selectedProvince.districts || [] : [];
  const selectedDistrict = districts.find(
    (d) => d.code === Number(formData.districtCode)
  );
  const wards = selectedDistrict ? selectedDistrict.wards || [] : [];

  useEffect(() => {
    const fetchProvinces = async () => {
      try {
        const data = await locationApi.getAllProvinces();
        setProvinces(data || []);
      } catch (error) {
        console.error("Error fetching provinces:", error);
      }
    };
    fetchProvinces();
  }, []);

  // Debounced address search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (formData.street && formData.street.trim().length >= 3) {
        setSearchingAddress(true);
        try {
          const prov = provinces.find(
            (p) => p.code === Number(formData.provinceCode)
          );
          const dist = prov?.districts?.find(
            (d) => d.code === Number(formData.districtCode)
          );
          const ward = dist?.wards?.find(
            (w) => w.code === Number(formData.wardCode)
          );

          const results = await locationApi.searchAddress(formData.street, {
            province: prov?.name,
            district: dist?.name,
            ward: ward?.name,
          });
          setAddressSuggestions(results || []);
        } catch (error) {
          console.error("Error searching address:", error);
        } finally {
          setSearchingAddress(false);
        }
      } else {
        setAddressSuggestions([]);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [
    formData.street,
    formData.provinceCode,
    formData.districtCode,
    formData.wardCode,
    provinces,
  ]);

  const handleFetchCoordinates = async () => {
    if (
      !formData.provinceCode ||
      !formData.districtCode ||
      !formData.wardCode ||
      !formData.street ||
      !formData.street.trim()
    ) {
      return;
    }

    setLoadingCoords(true);
    try {
      const prov = provinces.find(
        (p) => p.code === Number(formData.provinceCode)
      );
      const dist = prov?.districts?.find(
        (d) => d.code === Number(formData.districtCode)
      );
      const ward = dist?.wards?.find(
        (w) => w.code === Number(formData.wardCode)
      );

      if (!prov || !dist || !ward) return;

      const query = `${formData.street}, ${ward.name}, ${dist.name}, ${prov.name}, Vietnam`;
      const result = await locationApi.getCoordinatesFromAddress(query);

      if (result?.latitude && result?.longitude) {
        setFormData((prev) => ({
          ...prev,
          coordinates: {
            latitude: result.latitude,
            longitude: result.longitude,
          },
        }));
        console.log("Fetched coordinates:", result);
        toast.success("Đã lấy tọa độ thành công");
      }
    } catch (error) {
      console.error("Geocoding error:", error);
      toast.error("Không thể lấy tọa độ");
    } finally {
      setLoadingCoords(false);
    }
  };

  const handleSelectSuggestion = (suggestion) => {
    setFormData((prev) => ({
      ...prev,
      street: suggestion.address,
      coordinates: {
        latitude: suggestion.latitude,
        longitude: suggestion.longitude,
      },
    }));
    setShowSuggestions(false);
    setAddressSuggestions([]);
    toast.success("Đã chọn địa chỉ và lấy tọa độ");
  };

  const handleCreate = async () => {
    // Clear previous errors
    const newErrors = {
      name: "",
      provinceCode: "",
      districtCode: "",
      wardCode: "",
      street: "",
    };

    // Validation
    if (!formData.name || !formData.name.trim()) {
      newErrors.name = "Vui lòng nhập tên chi nhánh";
    }

    if (!formData.provinceCode) {
      newErrors.provinceCode = "Vui lòng chọn tỉnh/thành phố";
    }

    if (!formData.districtCode) {
      newErrors.districtCode = "Vui lòng chọn quận/huyện";
    }

    if (!formData.wardCode) {
      newErrors.wardCode = "Vui lòng chọn phường/xã";
    }

    if (!formData.street || !formData.street.trim()) {
      newErrors.street = "Vui lòng nhập số nhà, đường";
    }

    // Check if there are any errors
    if (
      newErrors.name ||
      newErrors.provinceCode ||
      newErrors.districtCode ||
      newErrors.wardCode ||
      newErrors.street
    ) {
      setErrors(newErrors);
      return;
    }

    // Get names from selected codes
    const prov = provinces.find(
      (p) => p.code === Number(formData.provinceCode)
    );
    const dist = prov?.districts?.find(
      (d) => d.code === Number(formData.districtCode)
    );
    const ward = dist?.wards?.find((w) => w.code === Number(formData.wardCode));

    const payload = {
      name: formData.name,
      phone: formData.phone,
      address: {
        street: formData.street,
        province: {
          code: Number(formData.provinceCode),
          name: prov?.name || "",
        },
        district: {
          code: Number(formData.districtCode),
          name: dist?.name || "",
        },
        ward: {
          code: Number(formData.wardCode),
          name: ward?.name || "",
        },
        coordinates: {
          latitude: formData.coordinates.latitude,
          longitude: formData.coordinates.longitude,
        },
      },
      active: formData.active,
    };

    try {
      setSaving(true);
      const token = accessToken || null;
      await branchApi.create(token, payload);
      toast.success("Tạo chi nhánh thành công");
      navigate("/admin/branches");
    } catch (error) {
      console.error("Error creating branch:", error);
      const errorMessage = error?.response?.data?.message || "Lỗi tạo chi nhánh";
      
      // Check if error is about duplicate name
      if (errorMessage.includes("already exists") || errorMessage.toLowerCase().includes("tên") || errorMessage.toLowerCase().includes("tồn tại")) {
        setErrors((prev) => ({ ...prev, name: "Tên chi nhánh đã tồn tại" }));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="bg-gray-50 min-h-screen p-6">
      {/* Header - Sticky */}
      <div className="sticky top-0 z-50 bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Thêm chi nhánh mới
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Điền thông tin để tạo chi nhánh mới
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => navigate("/admin/branches")}
              className="cursor-pointer"
            >
              Hủy
            </Button>
            <Button
              onClick={handleCreate}
              disabled={saving}
              className="bg-gray-800 hover:bg-gray-900 cursor-pointer"
            >
              Tạo chi nhánh
            </Button>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Basic Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Thông tin cơ bản</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Tên chi nhánh <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    if (errors.name) setErrors({ ...errors, name: "" });
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 ${
                    errors.name ? "border-red-500" : ""
                  }`}
                  placeholder="Nhập tên chi nhánh"
                />
                {errors.name && (
                  <p className="text-red-500 text-xs mt-1">{errors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Số điện thoại
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
                  placeholder="Nhập số điện thoại"
                />
              </div>

              <div className="pt-4 border-t">
                <h3 className="text-base font-medium mb-3">Địa chỉ</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Tỉnh/Thành phố <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.provinceCode || ""}
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            provinceCode: e.target.value,
                            districtCode: null,
                            wardCode: null,
                          });
                          if (errors.provinceCode) setErrors({ ...errors, provinceCode: "" });
                        }}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 cursor-pointer ${
                          errors.provinceCode ? "border-red-500" : ""
                        }`}
                      >
                        <option value="">Chọn tỉnh/thành</option>
                        {provinces.map((p) => (
                          <option key={p.code} value={p.code}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                      {errors.provinceCode && (
                        <p className="text-red-500 text-xs mt-1">{errors.provinceCode}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Quận/Huyện <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.districtCode || ""}
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            districtCode: e.target.value,
                            wardCode: null,
                          });
                          if (errors.districtCode) setErrors({ ...errors, districtCode: "" });
                        }}
                        disabled={!formData.provinceCode}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:bg-gray-100 cursor-pointer ${
                          errors.districtCode ? "border-red-500" : ""
                        }`}
                      >
                        <option value="">Chọn quận/huyện</option>
                        {districts.map((d) => (
                          <option key={d.code} value={d.code}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                      {errors.districtCode && (
                        <p className="text-red-500 text-xs mt-1">{errors.districtCode}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Phường/Xã <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.wardCode || ""}
                        onChange={(e) => {
                          setFormData({ ...formData, wardCode: e.target.value });
                          if (errors.wardCode) setErrors({ ...errors, wardCode: "" });
                        }}
                        disabled={!formData.districtCode}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:bg-gray-100 cursor-pointer ${
                          errors.wardCode ? "border-red-500" : ""
                        }`}
                      >
                        <option value="">Chọn phường/xã</option>
                        {wards.map((w) => (
                          <option key={w.code} value={w.code}>
                            {w.name}
                          </option>
                        ))}
                      </select>
                      {errors.wardCode && (
                        <p className="text-red-500 text-xs mt-1">{errors.wardCode}</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Số nhà, đường <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={formData.street}
                        onChange={(e) => {
                          setFormData({ ...formData, street: e.target.value });
                          setShowSuggestions(true);
                          if (errors.street) setErrors({ ...errors, street: "" });
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        onBlur={() =>
                          setTimeout(() => setShowSuggestions(false), 200)
                        }
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 ${
                          errors.street ? "border-red-500" : ""
                        }`}
                        placeholder="Nhập số nhà, tên đường"
                      />
                      {searchingAddress && (
                        <div className="absolute right-3 top-3">
                          <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                      {showSuggestions && addressSuggestions.length > 0 && (
                        <div className="absolute z-20 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {addressSuggestions.map((suggestion, idx) => (
                            <button
                              type="button"
                              key={idx}
                              onMouseDown={(event) => {
                                event.preventDefault();
                                handleSelectSuggestion(suggestion);
                              }}
                              className="w-full px-4 py-2 text-left hover:bg-gray-100 border-b last:border-b-0"
                            >
                              <p className="text-sm text-gray-900">
                                {suggestion.displayName}
                              </p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {errors.street && (
                      <p className="text-red-500 text-xs mt-1">{errors.street}</p>
                    )}
                  </div>

                  {loadingCoords && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                      <span>Đang lấy tọa độ...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Status */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Trạng thái</h2>
            <div className="flex items-center gap-3">
              <Switch
                checked={formData.active}
                onCheckedChange={(val) =>
                  setFormData({ ...formData, active: val })
                }
                className="data-[state=checked]:bg-green-600"
              />
              <Label>{formData.active ? "Hoạt động" : "Ngừng hoạt động"}</Label>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default AdminBranchCreate;
