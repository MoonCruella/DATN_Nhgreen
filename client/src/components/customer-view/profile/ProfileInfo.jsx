import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { toast } from "sonner";
import userApi from "@/api/userApi";
import { setUser } from "@/store/auth-slice";

const ProfileInfo = () => {
  const dispatch = useDispatch();
  const { user, accessToken } = useSelector((state) => state.auth);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [errors, setErrors] = useState({
    name: "",
    phone: "",
  });
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    gender: "",
    date_of_birth: "",
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        gender: user.gender || "",
        date_of_birth: user.date_of_birth
          ? new Date(user.date_of_birth).toISOString().split("T")[0]
          : "",
      });
      setAvatarPreview(user.avatar);
      console.log("Loaded user data into form:", {
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
      });
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
    
    // Only allow digits for phone number
    if (name === "phone") {
      const digitsOnly = value.replace(/\D/g, "");
      setFormData((prev) => ({
        ...prev,
        [name]: digitsOnly,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Kích thước ảnh không được vượt quá 5MB");
        return;
      }

      if (!file.type.startsWith("image/")) {
        toast.error("Vui lòng chọn file ảnh");
        return;
      }

      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Reset errors
    setErrors({ name: "", phone: "" });

    let hasError = false;
    const newErrors = { name: "", phone: "" };

    if (!formData.name.trim()) {
      newErrors.name = "Vui lòng nhập họ tên";
      hasError = true;
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Vui lòng nhập số điện thoại";
      hasError = true;
    } else {
      // Validate Vietnamese phone number (10 digits, starts with 0)
      const phoneRegex = /^0\d{9}$/;
      if (!phoneRegex.test(formData.phone)) {
        newErrors.phone = "Số điện thoại không hợp lệ. Vui lòng nhập 10 số bắt đầu bằng 0";
        hasError = true;
      }
    }

    if (hasError) {
      setErrors(newErrors);
      return;
    }

    try {
      setIsLoading(true);

      const updateData = new FormData();
      updateData.append("name", formData.name.trim());
      updateData.append("phone", formData.phone.trim());
      updateData.append("gender", formData.gender);
      if (formData.date_of_birth) {
        updateData.append("date_of_birth", formData.date_of_birth);
      }

      // Only append avatar if a new file was selected
      if (avatarFile) {
        updateData.append("avatar", avatarFile);
      }

      console.log("Sending update with FormData:", {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        gender: formData.gender,
        date_of_birth: formData.date_of_birth,
        hasAvatar: !!avatarFile,
        avatarFileName: avatarFile?.name,
      });

      const response = await userApi.updateMyProfile(accessToken, updateData);

      if (response.success) {
        dispatch(setUser(response.data));
        toast.success("Cập nhật thông tin thành công!");
        setIsEditing(false);
        setAvatarFile(null);
      } else {
        toast.error(response.message || "Cập nhật thất bại");
      }
    } catch (error) {
      console.error("Update profile error:", error);
      toast.error(error.response?.data?.message || "Có lỗi xảy ra");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      gender: user.gender || "",
      date_of_birth: user.date_of_birth
        ? new Date(user.date_of_birth).toISOString().split("T")[0]
        : "",
    });
    setAvatarPreview(user.avatar);
    setAvatarFile(null);
    setIsEditing(false);
  };

  return (
    <div className="bg-white rounded-2xl shadow-md p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 pb-6 border-b">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Hồ Sơ Của Tôi</h2>
          <p className="text-gray-500 mt-1">
            Quản lý thông tin hồ sơ để bảo mật tài khoản
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Coin Display */}
          <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-50 to-yellow-100 border-2 border-yellow-300 rounded-lg h-[42px]">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" fill="#FFD700" />
              <circle cx="12" cy="12" r="8" fill="#FFA500" opacity="0.5" />
              <text
                x="12"
                y="16"
                fontSize="12"
                fontWeight="bold"
                textAnchor="middle"
                fill="#B8860B"
              >
                ₫
              </text>
            </svg>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 font-medium">Xu:</span>
              <span className="text-base font-bold text-yellow-700">
                {user?.coin?.toLocaleString("vi-VN") || "0"}
              </span>
            </div>
          </div>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium cursor-pointer"
            >
              Chỉnh sửa
            </button>
          )}
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Avatar */}
          <div className="lg:col-span-1">
            <div className="text-center">
              <div className="relative inline-block">
                <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-gray-200 bg-gradient-to-br from-green-400 to-green-600">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white text-6xl font-bold">
                      {user?.name?.charAt(0).toUpperCase() || "U"}
                    </div>
                  )}
                </div>

                {isEditing && (
                  <label
                    htmlFor="avatar-upload"
                    className="absolute bottom-0 right-0 w-12 h-12 bg-green-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-green-700 transition shadow-lg"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-6 h-6 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {isEditing && (
                <p className="mt-4 text-sm text-gray-500">
                  Nhấn vào biểu tượng camera để thay đổi ảnh đại diện
                  <br />
                  <span className="text-xs text-gray-400">
                    Dung lượng tối đa 5MB - Định dạng: JPG, PNG, GIF
                  </span>
                </p>
              )}
            </div>
          </div>

          {/* Right Column - Form Fields */}
          <div className="lg:col-span-2 space-y-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Họ và tên <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                disabled={!isEditing}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-50 disabled:text-gray-500 transition ${
                  errors.name ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="Nhập họ và tên"
              />
              {errors.name && (
                <p className="text-red-500 text-xs mt-1">{errors.name}</p>
              )}
            </div>

            {/* Email - Read Only */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                disabled
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">
                Email không thể thay đổi
              </p>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Số điện thoại <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                disabled={!isEditing}
                maxLength="10"
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-50 disabled:text-gray-500 transition ${
                  errors.phone ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="Nhập số điện thoại (10 số)"
              />
              {errors.phone && (
                <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
              )}
            </div>

            {/* Gender */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Giới tính
              </label>
              <div className="flex gap-4">
                {[
                  { value: "male", label: "Nam" },
                  { value: "female", label: "Nữ" },
                  { value: "other", label: "Khác" },
                ].map((option) => (
                  <label
                    key={option.value}
                    className={`flex-1 text-center px-4 py-3 border-2 rounded-lg cursor-pointer transition ${
                      formData.gender === option.value
                        ? "border-green-500 bg-green-50 text-green-700 font-semibold"
                        : "border-gray-300 hover:border-green-300 text-gray-700"
                    } ${!isEditing ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <input
                      type="radio"
                      name="gender"
                      value={option.value}
                      checked={formData.gender === option.value}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className="hidden"
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Date of Birth */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Ngày sinh
              </label>
              <input
                type="date"
                name="date_of_birth"
                value={formData.date_of_birth}
                onChange={handleInputChange}
                disabled={!isEditing}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-50 disabled:text-gray-500 cursor-pointer transition"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {isEditing && (
          <div className="flex gap-4 mt-8 pt-6 border-t">
            <button
              type="submit"
              disabled={isLoading}
              className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Đang lưu...
                </>
              ) : (
                "Lưu thay đổi"
              )}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={isLoading}
              className="px-8 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold cursor-pointer"
            >
              Hủy
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

export default ProfileInfo;
