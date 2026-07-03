import React, { useEffect, useState } from "react";
import { useAddressContext } from "@/context/AddressContext";
import {
  getAllProvinces,
  getCoordinatesFromAddress,
  getDistrictByCode,
  getProvinceByCode,
} from "@/api/locationApi";
import AddressAutocomplete from "./AddressAutocomplete";

const AddressForm = ({ addressToEdit, onCancel }) => {
  const { addAddress, updateAddress } = useAddressContext();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [street, setStreet] = useState("");
  const [province, setProvince] = useState("");
  const [district, setDistrict] = useState("");
  const [ward, setWard] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [coordinates, setCoordinates] = useState({
    latitude: null,
    longitude: null,
  });

  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);

  const [errors, setErrors] = useState({});
  const [loadingCoords, setLoadingCoords] = useState(false);

  // Load tỉnh/huyện/xã
  useEffect(() => {
    getAllProvinces().then((data) => {
      setProvinces(data);
      console.log("Provinces data loaded:", data);
    });
  }, []);

  // Nếu edit thì load dữ liệu cũ
  useEffect(() => {
    const loadAddressForEdit = async () => {
      if (!addressToEdit || provinces.length === 0) return;

      setFullName(addressToEdit.full_name || "");
      setPhone(addressToEdit.phone || "");
      setStreet(addressToEdit.street || "");
      setIsDefault(addressToEdit.is_default || false);
      setCoordinates({
        latitude: addressToEdit.coordinates?.latitude || null,
        longitude: addressToEdit.coordinates?.longitude || null,
      });

      // Tìm lại province/district/ward theo code
      const provinceObj = provinces.find(
        (p) => p.code === addressToEdit.province?.code
      );
      if (provinceObj) {
        setProvince(provinceObj.code);
        const provinceDetail = await getProvinceByCode(provinceObj.code);
        const provinceDistricts = provinceDetail?.districts || [];
        setDistricts(provinceDistricts);
        const districtObj = provinceDistricts.find(
          (d) => d.code === addressToEdit.district?.code
        );
        if (districtObj) {
          setDistrict(districtObj.code);
          const districtDetail = await getDistrictByCode(districtObj.code);
          const districtWards = districtDetail?.wards || [];
          setWards(districtWards);
          const wardObj = districtWards.find(
            (w) => String(w.code) === String(addressToEdit.ward?.code)
          );
          if (wardObj) {
            setWard(wardObj.code);
          }
        }
      }
    };

    loadAddressForEdit();
  }, [addressToEdit, provinces]);

  const handleProvinceChange = async (e) => {
    const code = parseInt(e.target.value);
    setProvince(code);
    setDistrict("");
    setWard("");
    const selectedProvince = code ? await getProvinceByCode(code) : null;
    setDistricts(selectedProvince ? selectedProvince.districts || [] : []);
    setWards([]);
  };

  const handleDistrictChange = async (e) => {
    const code = parseInt(e.target.value);
    setDistrict(code);
    setWard("");
    const selectedDistrict = code ? await getDistrictByCode(code) : null;
    setWards(selectedDistrict ? selectedDistrict.wards || [] : []);
  };

  // Handle chọn địa chỉ từ autocomplete
  const handleSelectLocation = (location) => {
    // Lưu toàn bộ displayName hoặc address làm street (địa chỉ đầy đủ)
    const fullAddress = location.displayName || location.address;
    setStreet(fullAddress);
    setCoordinates({
      latitude: location.latitude,
      longitude: location.longitude,
    });
  };

  // Tự động lấy tọa độ từ tỉnh/huyện/xã (không dùng địa chỉ chi tiết)
  const handleFetchCoordinates = async () => {
    if (!province || !district || !ward) {
      return;
    }

    const provinceObj = provinces.find((p) => p.code === province);
    const districtObj = districts.find((d) => d.code === district);
    const wardObj = wards.find((w) => w.code === ward);

    // Chỉ dùng phường/quận/tỉnh để fetch tọa độ
    const addressQuery = `${wardObj?.name}, ${districtObj?.name}, ${provinceObj?.name}`;

    setLoadingCoords(true);
    try {
      const result = await getCoordinatesFromAddress(addressQuery);
      if (result) {
        setCoordinates({
          latitude: result.latitude,
          longitude: result.longitude,
        });
      }
    } catch (error) {
      console.error("Error fetching coordinates:", error);
    } finally {
      setLoadingCoords(false);
    }
  };

  const validateForm = () => {
    const normalizedFullName = fullName.normalize("NFC");

    const newErrors = {};
    if (!normalizedFullName.trim()) newErrors.fullName = "Vui lòng nhập họ tên";

    const nameValid = /^[\p{L}\s'-]+$/u.test(normalizedFullName.trim());
    const words = normalizedFullName.trim().split(/\s+/).filter(Boolean);

    const singleWordOk = words.length === 1 && words[0].length >= 2;

    if (!nameValid || !(words.length >= 2 || singleWordOk))
      newErrors.fullName =
        "Họ tên không hợp lệ. Nhập ít nhất 2 từ hoặc 1 từ >=2 ký tự; chỉ chữ, dấu -, ' và khoảng trắng.";
    if (!phone.trim()) newErrors.phone = "Vui lòng nhập số điện thoại";
    else if (!/^(0\d{9})$/.test(phone))
      newErrors.phone = "Số điện thoại không hợp lệ. Vui lòng nhập 10 số bắt đầu bằng 0";
    if (!province) newErrors.province = "Vui lòng chọn tỉnh/thành phố";
    if (!district) newErrors.district = "Vui lòng chọn quận/huyện";
    if (!ward) newErrors.ward = "Vui lòng chọn xã/phường";
    if (!street.trim()) newErrors.street = "Vui lòng nhập địa chỉ chi tiết";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const provinceObj = provinces.find((p) => p.code === province);
    const districtObj = districts.find((d) => d.code === district);
    const wardObj = wards.find((w) => w.code === ward);

    // full_address = địa chỉ chi tiết (street) - không nối thêm
    const fullAddress = street;

    // Nếu chưa có tọa độ, thử fetch từ phường/quận/tỉnh
    let finalCoords = coordinates;
    if (!finalCoords.latitude || !finalCoords.longitude) {
      setLoadingCoords(true);
      const addressQuery = `${wardObj?.name}, ${districtObj?.name}, ${provinceObj?.name}`;
      const result = await getCoordinatesFromAddress(addressQuery);
      if (result) {
        finalCoords = {
          latitude: result.latitude,
          longitude: result.longitude,
        };
      }
      setLoadingCoords(false);
    }

    const newAddress = {
      full_name: fullName,
      phone,
      street,
      province: { code: provinceObj?.code, name: provinceObj?.name },
      district: { code: districtObj?.code, name: districtObj?.name },
      ward: { code: wardObj?.code, name: wardObj?.name },
      full_address: fullAddress,
      coordinates: finalCoords,
      is_default: isDefault,
    };

    if (addressToEdit) {
      await updateAddress(addressToEdit._id, newAddress);
    } else {
      await addAddress(newAddress);
    }

    onCancel(); // đóng form
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl my-5 mx-auto">
      <h2 className="text-xl font-bold mb-6 text-gray-800">
        {addressToEdit ? "Chỉnh sửa địa chỉ" : "Thêm địa chỉ mới"}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Họ tên */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Họ và tên *
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            maxLength="100"
            className="w-full border rounded-lg px-3 py-2"
            placeholder="Nhập họ và tên (tối đa 100 ký tự)"
          />
          {errors.fullName && (
            <p className="text-red-500 text-sm mt-1">{errors.fullName}</p>
          )}
        </div>

        {/* SĐT */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Số điện thoại *
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => {
              const digitsOnly = e.target.value.replace(/\D/g, "");
              setPhone(digitsOnly);
            }}
            maxLength="10"
            className="w-full border rounded-lg px-3 py-2"
            placeholder="Nhập số điện thoại (10 số)"
          />
          {errors.phone && (
            <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
          )}
        </div>

        {/* Province */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Tỉnh / Thành phố *
          </label>
          <select
            value={province}
            onChange={handleProvinceChange}
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="">-- Chọn tỉnh --</option>
            {provinces.map((p) => (
              <option key={p.code} value={p.code}>
                {p.name}
              </option>
            ))}
          </select>
          {errors.province && (
            <p className="text-red-500 text-sm mt-1">{errors.province}</p>
          )}
        </div>

        {/* District */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Quận / Huyện *
          </label>
          <select
            value={district}
            onChange={handleDistrictChange}
            disabled={!districts.length}
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="">-- Chọn huyện --</option>
            {districts.map((d) => (
              <option key={d.code} value={d.code}>
                {d.name}
              </option>
            ))}
          </select>
          {errors.district && (
            <p className="text-red-500 text-sm mt-1">{errors.district}</p>
          )}
        </div>

        {/* Ward */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Xã / Phường *
          </label>
          <select
            value={ward}
            onChange={(e) => setWard(e.target.value)}
            disabled={!wards.length}
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="">-- Chọn xã --</option>
            {wards.map((w) => (
              <option key={w.code} value={w.code}>
                {w.name}
              </option>
            ))}
          </select>
          {errors.ward && (
            <p className="text-red-500 text-sm mt-1">{errors.ward}</p>
          )}
        </div>

        {/* Street - Sử dụng Autocomplete */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Địa chỉ chi tiết *{" "}
            {loadingCoords && (
              <span className="text-xs text-gray-400">
                (Đang lấy tọa độ...)
              </span>
            )}
          </label>
          <AddressAutocomplete
            value={street}
            onChange={setStreet}
            onSelectLocation={handleSelectLocation}
            error={errors.street}
            province={provinces.find((p) => p.code === province)?.name || ""}
            district={districts.find((d) => d.code === district)?.name || ""}
            ward={wards.find((w) => w.code === ward)?.name || ""}
          />
          {!errors.street && coordinates.latitude && coordinates.longitude && (
            <p className="text-xs text-green-600 mt-1">
              ✓ Tọa độ: {coordinates.latitude.toFixed(6)},{" "}
              {coordinates.longitude.toFixed(6)}
            </p>
          )}
          {!errors.street &&
            !coordinates.latitude &&
            province &&
            district &&
            ward && (
              <button
                type="button"
                onClick={handleFetchCoordinates}
                disabled={loadingCoords}
                className="text-xs text-blue-600 hover:underline mt-1"
              >
                {loadingCoords
                  ? "Đang lấy tọa độ..."
                  : "Lấy tọa độ từ phường/xã đã chọn"}
              </button>
            )}
        </div>
      </div>

      {/* Default + Buttons */}
      <div className="mt-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-gray-700">Đặt làm mặc định</span>
          <button
            type="button"
            onClick={() => setIsDefault(!isDefault)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
              isDefault ? "bg-teal-500" : "bg-gray-300"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isDefault ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2 border rounded-lg text-gray-600 hover:bg-gray-100 cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 cursor-pointer"
          >
            Lưu
          </button>
        </div>
      </div>
    </form>
  );
};

export default AddressForm;
