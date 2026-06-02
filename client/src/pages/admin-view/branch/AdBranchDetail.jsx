import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import branchApi from "@/api/branchApi";
import locationApi from "@/api/locationApi";

const AdminBranchDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const accessToken = useSelector((state) => state.auth.accessToken);

  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [branch, setBranch] = useState(null);
  const [provinces, setProvinces] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loadingCoords, setLoadingCoords] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchingAddress, setSearchingAddress] = useState(false);
  const [showManagerModal, setShowManagerModal] = useState(false);
  const [creatingManager, setCreatingManager] = useState(false);

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

  // Manager form state
  const [managerForm, setManagerForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
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

  // Fetch branch detail
  const fetchBranchDetail = async () => {
    try {
      setLoading(true);
      const res = await branchApi.getById(id);
      if (res?.data) {
        const branchData = res.data;
        console.log("branchData", branchData);
        setBranch(branchData);
        setFormData({
          name: branchData.name || "",
          phone: branchData.phone || "",
          street: branchData.address?.street || "",
          provinceCode: branchData.address?.province?.code || null,
          districtCode: branchData.address?.district?.code || null,
          wardCode: branchData.address?.ward?.code || null,
          active: branchData.active ?? true,
          coordinates: {
            latitude: branchData.address?.coordinates?.latitude || null,
            longitude: branchData.address?.coordinates?.longitude || null,
          },
        });
      }
    } catch (error) {
      console.error("Error fetching branch:", error);
      toast.error("Lỗi tải thông tin chi nhánh");
      navigate("/admin/branches");
    } finally {
      setLoading(false);
    }
  };

  // Fetch provinces
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

  // Fetch branch detail after provinces loaded
  useEffect(() => {
    if (id && provinces.length > 0) {
      fetchBranchDetail();
    }
  }, [id, provinces.length]);

  // Search for address suggestions when street input changes
  useEffect(() => {
    if (!isEditing || !formData.street || formData.street.trim().length < 3) {
      setAddressSuggestions([]);
      return;
    }

    const delaySearch = setTimeout(async () => {
      if (
        !formData.provinceCode ||
        !formData.districtCode ||
        !formData.wardCode
      ) {
        return;
      }

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

        if (!prov || !dist || !ward) return;

        const query = `${formData.street}, ${ward.name}, ${dist.name}, ${prov.name}, Vietnam`;
        const results = await locationApi.searchAddress(query);

        if (results && Array.isArray(results)) {
          setAddressSuggestions(results);
        }
      } catch (error) {
        console.error("Address search error:", error);
      } finally {
        setSearchingAddress(false);
      }
    }, 500); // Debounce 500ms

    return () => clearTimeout(delaySearch);
  }, [
    formData.street,
    formData.provinceCode,
    formData.districtCode,
    formData.wardCode,
    isEditing,
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
      toast.error("Vui lòng nhập đầy đủ thông tin địa chỉ");
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
        toast.success("Đã lấy tọa độ thành công");
      } else {
        toast.error("Không tìm thấy tọa độ cho địa chỉ này");
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

  // Handle save
  const handleSave = async () => {
    // Get names from selected codes
    const prov = provinces.find(
      (p) => p.code === Number(formData.provinceCode)
    );
    const dist = prov?.districts?.find(
      (d) => d.code === Number(formData.districtCode)
    );
    const ward = dist?.wards?.find((w) => w.code === Number(formData.wardCode));

    if (!formData.name || !formData.name.trim()) {
      toast.error("Vui lòng nhập tên chi nhánh");
      return;
    }

    if (
      !formData.provinceCode ||
      !formData.districtCode ||
      !formData.wardCode
    ) {
      toast.error("Vui lòng chọn đầy đủ địa chỉ");
      return;
    }

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
      await branchApi.update(accessToken, id, payload);
      toast.success("Cập nhật chi nhánh thành công");
      setIsEditing(false);
      fetchBranchDetail();
    } catch (error) {
      console.error("Error updating branch:", error);
      toast.error(error?.response?.data?.message || "Lỗi cập nhật chi nhánh");
    } finally {
      setSaving(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!window.confirm("Bạn có chắc muốn xóa chi nhánh này?")) return;

    try {
      await branchApi.remove(accessToken, id);
      toast.success("Xóa chi nhánh thành công");
      navigate("/admin/branches");
    } catch (error) {
      console.error("Error deleting branch:", error);
      toast.error("Lỗi xóa chi nhánh");
    }
  };

  // Handle create manager
  const handleCreateManager = async (e) => {
    e.preventDefault();

    // Validation
    if (!managerForm.name.trim()) {
      toast.error("Vui lòng nhập tên quản lý");
      return;
    }
    if (!managerForm.email.trim()) {
      toast.error("Vui lòng nhập email");
      return;
    }
    if (!managerForm.password.trim()) {
      toast.error("Vui lòng nhập mật khẩu");
      return;
    }
    if (managerForm.password.length < 6) {
      toast.error("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }

    try {
      setCreatingManager(true);
      await branchApi.createManager(accessToken, id, managerForm);
      toast.success(
        "Tạo tài khoản quản lý thành công! Email thông tin đã được gửi đến quản lý."
      );
      setShowManagerModal(false);
      setManagerForm({ name: "", email: "", password: "", phone: "" });
      // Refresh branch data to get updated manager info
      fetchBranchDetail();
    } catch (error) {
      console.error("Error creating manager:", error);
      toast.error(
        error?.response?.data?.message || "Lỗi tạo tài khoản quản lý"
      );
    } finally {
      setCreatingManager(false);
    }
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setIsEditing(false);
    if (branch) {
      setFormData({
        name: branch.name || "",
        phone: branch.phone || "",
        street: branch.address?.street || "",
        provinceCode: branch.address?.provinceCode || null,
        districtCode: branch.address?.districtCode || null,
        wardCode: branch.address?.wardCode || null,
        active: branch.active ?? true,
        coordinates: {
          latitude: branch.coordinates?.latitude || null,
          longitude: branch.coordinates?.longitude || null,
        },
      });
    }
  };

  const getStatusBadge = (active) => {
    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-medium ${
          active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
        }`}
      >
        {active ? "Hoạt động" : "Ngừng hoạt động"}
      </span>
    );
  };

  const getFullAddress = () => {
    if (!branch?.address) return "-";
    const { street, provinceCode, districtCode, wardCode } = branch.address;
    const prov = provinces.find((p) => p.code === Number(provinceCode));
    const dist = prov?.districts?.find((d) => d.code === Number(districtCode));
    const ward = dist?.wards?.find((w) => w.code === Number(wardCode));

    const parts = [street, ward?.name, dist?.name, prov?.name].filter(Boolean);
    return parts.join(", ");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  if (!branch) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Không tìm thấy chi nhánh</p>
      </div>
    );
  }

  return (
    <main className="bg-gray-50 min-h-screen p-6">
      {/* Header - Sticky */}
      <div className="sticky top-0 z-50 bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              {isEditing ? "Chỉnh sửa chi nhánh" : "Chi tiết chi nhánh"}
            </h1>
            <div className="flex items-center gap-3 mt-2">
              {getStatusBadge(branch.active)}
              <span className="text-sm text-gray-500">
                Mã: {branch.code || branch.branchId || branch._id}
              </span>
            </div>
          </div>
          <div className="flex gap-3">
            {!isEditing ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => navigate("/admin/branches")}
                  className="cursor-pointer"
                >
                  ← Quay lại
                </Button>
                {!branch.manager && (
                  <Button
                    onClick={() => setShowManagerModal(true)}
                    className="bg-purple-600 hover:bg-purple-700 cursor-pointer"
                  >
                    Tạo tài khoản quản lý
                  </Button>
                )}
                <Button
                  onClick={() => setIsEditing(true)}
                  className="bg-green-600 hover:bg-green-700 cursor-pointer"
                >
                  Chỉnh sửa
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  className="cursor-pointer"
                >
                  Xóa chi nhánh
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={handleCancelEdit}
                  className="cursor-pointer"
                >
                  Hủy
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-green-600 hover:bg-green-700 cursor-pointer"
                >
                  Lưu thay đổi
                </Button>
              </>
            )}
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
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:bg-gray-100"
                />
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
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:bg-gray-100"
                />
              </div>

              <div className="pt-4 border-t">
                <h3 className="text-base font-medium mb-3">Địa chỉ</h3>
                {!isEditing ? (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-gray-700">{getFullAddress()}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Tỉnh/Thành phố <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={formData.provinceCode || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              provinceCode: e.target.value,
                              districtCode: null,
                              wardCode: null,
                            })
                          }
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 cursor-pointer"
                        >
                          <option value="">Chọn tỉnh/thành</option>
                          {provinces.map((p) => (
                            <option key={p.code} value={p.code}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Quận/Huyện <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={formData.districtCode || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              districtCode: e.target.value,
                              wardCode: null,
                            })
                          }
                          disabled={!formData.provinceCode}
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:bg-gray-100 cursor-pointer"
                        >
                          <option value="">Chọn quận/huyện</option>
                          {districts.map((d) => (
                            <option key={d.code} value={d.code}>
                              {d.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Phường/Xã <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={formData.wardCode || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              wardCode: e.target.value,
                            })
                          }
                          disabled={!formData.districtCode}
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:bg-gray-100 cursor-pointer"
                        >
                          <option value="">Chọn phường/xã</option>
                          {wards.map((w) => (
                            <option key={w.code} value={w.code}>
                              {w.name}
                            </option>
                          ))}
                        </select>
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
                            setFormData({
                              ...formData,
                              street: e.target.value,
                            });
                            setShowSuggestions(true);
                          }}
                          onFocus={() => setShowSuggestions(true)}
                          onBlur={() =>
                            setTimeout(() => setShowSuggestions(false), 200)
                          }
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
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
                      {formData.coordinates.latitude &&
                        formData.coordinates.longitude && (
                          <p className="text-sm text-gray-600 mt-2">
                            📍 Tọa độ:{" "}
                            {formData.coordinates.latitude.toFixed(6)},{" "}
                            {formData.coordinates.longitude.toFixed(6)}
                          </p>
                        )}
                    </div>
                  </div>
                )}
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
                disabled={!isEditing}
                className="data-[state=checked]:bg-green-600"
              />
              <Label>{formData.active ? "Hoạt động" : "Ngừng hoạt động"}</Label>
            </div>
          </div>

          {/* Manager Information */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Thông tin quản lý</h2>
            {branch?.manager ? (
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Họ và tên</p>
                  <p className="font-medium">{branch.manager.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{branch.manager.email}</p>
                </div>
                {branch.manager.phone && (
                  <div>
                    <p className="text-sm text-gray-500">Số điện thoại</p>
                    <p className="font-medium">{branch.manager.phone}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500">Ngày tạo</p>
                  <p className="font-medium">
                    {new Date(branch.manager.createdAt).toLocaleDateString(
                      "vi-VN"
                    )}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500 text-sm mb-3">
                  Chưa có quản lý cho chi nhánh này
                </p>
                <Button
                  onClick={() => setShowManagerModal(true)}
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  Tạo tài khoản
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Manager Creation Modal */}
      {showManagerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-gray-800">
                Tạo tài khoản quản lý
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Tạo tài khoản cho quản lý chi nhánh {branch.name}
              </p>
            </div>
            <form onSubmit={handleCreateManager} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Họ và tên <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={managerForm.name}
                  onChange={(e) =>
                    setManagerForm({ ...managerForm, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                  placeholder="Nhập họ và tên"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={managerForm.email}
                  onChange={(e) =>
                    setManagerForm({ ...managerForm, email: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                  placeholder="Nhập email"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Mật khẩu <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={managerForm.password}
                  onChange={(e) =>
                    setManagerForm({ ...managerForm, password: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                  placeholder="Nhập mật khẩu (tối thiểu 6 ký tự)"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Số điện thoại
                </label>
                <input
                  type="tel"
                  value={managerForm.phone}
                  onChange={(e) =>
                    setManagerForm({ ...managerForm, phone: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                  placeholder="Nhập số điện thoại (tùy chọn)"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowManagerModal(false);
                    setManagerForm({
                      name: "",
                      email: "",
                      password: "",
                      phone: "",
                    });
                  }}
                  className="flex-1"
                  disabled={creatingManager}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                  disabled={creatingManager}
                >
                  {creatingManager ? "Đang tạo..." : "Tạo tài khoản"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
};

export default AdminBranchDetail;


