import axios from "axios";

/**
 * API để lấy danh sách tỉnh/thành phố, quận/huyện, xã/phường
 * Nguồn: https://provinces.open-api.vn/api/
 */

const PROVINCES_API_BASE = "https://provinces.open-api.vn/api";

/**
 * Lấy danh sách tất cả tỉnh/thành phố kèm quận/huyện và xã/phường
 * @returns {Promise<Array>} Danh sách tỉnh với cấu trúc đầy đủ
 */
export const getAllProvinces = async () => {
  try {
    const response = await axios.get(`${PROVINCES_API_BASE}/?depth=3`);
    return response.data;
  } catch (error) {
    console.error("Error fetching provinces:", error);
    throw error;
  }
};

/**
 * Lấy thông tin chi tiết của một tỉnh/thành phố theo code
 * @param {number} provinceCode - Mã tỉnh
 * @returns {Promise<Object>} Thông tin tỉnh
 */
export const getProvinceByCode = async (provinceCode) => {
  try {
    const response = await axios.get(
      `${PROVINCES_API_BASE}/p/${provinceCode}?depth=2`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching province:", error);
    throw error;
  }
};

/**
 * Lấy thông tin chi tiết của một quận/huyện theo code
 * @param {number} districtCode - Mã quận/huyện
 * @returns {Promise<Object>} Thông tin quận/huyện
 */
export const getDistrictByCode = async (districtCode) => {
  try {
    const response = await axios.get(
      `${PROVINCES_API_BASE}/d/${districtCode}?depth=2`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching district:", error);
    throw error;
  }
};

// Goong Maps API
const GOONG_API_KEY = import.meta.env.VITE_GOONG_API_KEY || "";
const GOONG_BASE = "https://rsapi.goong.io";

/**
 * Autocomplete địa chỉ và lấy tọa độ
 * @param {string} query - Địa chỉ cần tìm kiếm
 * @param {Object} options - Tùy chọn: { limit: 5, province: '', district: '', ward: '' }
 * @returns {Promise<Array>} Danh sách địa chỉ gợi ý với tọa độ
 */
export const searchAddress = async (query, options = {}) => {
  if (!query || query.trim().length < 3) return [];

  if (!GOONG_API_KEY || GOONG_API_KEY === "YOUR_GOONG_API_KEY") {
    console.error(
      "Goong API key is missing. Please add VITE_GOONG_API_KEY to .env file"
    );
    return [];
  }

  return await searchAddressGoong(query, options);
};

/**
 * Search địa chỉ bằng Goong Maps API
 */
const searchAddressGoong = async (query, options = {}) => {
  try {
    // Xây dựng query với location context
    let searchInput = query;
    const locationParts = [];
    if (options.ward) locationParts.push(options.ward);
    if (options.district) locationParts.push(options.district);
    if (options.province) locationParts.push(options.province);

    if (locationParts.length > 0) {
      searchInput = `${query}, ${locationParts.join(", ")}`;
    }

    const params = new URLSearchParams({
      api_key: GOONG_API_KEY,
      input: searchInput,
      limit: options.limit || 5,
    });

    const response = await axios.get(
      `${GOONG_BASE}/Place/AutoComplete?${params}`
    );

    if (!response.data || !response.data.predictions) {
      return [];
    }

    // Lấy chi tiết cho mỗi prediction để có tọa độ
    const detailPromises = response.data.predictions
      .slice(0, 5)
      .map(async (prediction) => {
        try {
          const detailParams = new URLSearchParams({
            api_key: GOONG_API_KEY,
            place_id: prediction.place_id,
          });
          const detailRes = await axios.get(
            `${GOONG_BASE}/Place/Detail?${detailParams}`
          );

          if (detailRes.data && detailRes.data.result) {
            const result = detailRes.data.result;
            const location = result.geometry?.location;

            return {
              displayName: result.formatted_address || prediction.description,
              address: result.formatted_address,
              latitude: location?.lat || 0,
              longitude: location?.lng || 0,
              placeId: prediction.place_id,
              type: result.types?.[0] || "unknown",
              importance: 1,
            };
          }
        } catch (err) {
          console.error("Error fetching place detail:", err);
        }
        return null;
      });

    const results = await Promise.all(detailPromises);
    return results.filter((r) => r !== null && r.latitude && r.longitude);
  } catch (error) {
    console.error("Error searching with Goong API:", error);
    throw error;
  }
};

/**
 * Lấy tọa độ từ địa chỉ đầy đủ (dùng Goong Geocoding API)
 * @param {string} fullAddress - Địa chỉ đầy đủ
 * @returns {Promise<Object|null>} { latitude, longitude } hoặc null
 */
export const getCoordinatesFromAddress = async (fullAddress) => {
  if (!GOONG_API_KEY || GOONG_API_KEY === "YOUR_GOONG_API_KEY") {
    console.error("Goong API key is missing");
    return null;
  }

  try {
    const params = new URLSearchParams({
      api_key: GOONG_API_KEY,
      address: fullAddress,
    });

    const response = await axios.get(
      `${GOONG_BASE}/Geocode?${params.toString()}`
    );

    if (
      response.data &&
      response.data.results &&
      response.data.results.length > 0
    ) {
      const result = response.data.results[0];
      const location = result.geometry?.location;
      return {
        latitude: location?.lat || 0,
        longitude: location?.lng || 0,
        displayName: result.formatted_address || fullAddress,
      };
    }
    return null;
  } catch (error) {
    console.error("Error getting coordinates:", error);
    return null;
  }
};

/**
 * Reverse Geocoding - Lấy địa chỉ từ tọa độ (dùng Goong API)
 * @param {number} latitude - Vĩ độ
 * @param {number} longitude - Kinh độ
 * @returns {Promise<Object|null>} Thông tin địa chỉ
 */
export const getAddressFromCoordinates = async (latitude, longitude) => {
  if (!GOONG_API_KEY || GOONG_API_KEY === "YOUR_GOONG_API_KEY") {
    console.error("Goong API key is missing");
    return null;
  }

  try {
    const params = new URLSearchParams({
      api_key: GOONG_API_KEY,
      latlng: `${latitude},${longitude}`,
    });

    const response = await axios.get(
      `${GOONG_BASE}/Geocode?${params.toString()}`
    );

    if (
      response.data &&
      response.data.results &&
      response.data.results.length > 0
    ) {
      const result = response.data.results[0];
      return {
        displayName: result.formatted_address,
        address: result.compound || {},
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
      };
    }
    return null;
  } catch (error) {
    console.error("Error reverse geocoding:", error);
    return null;
  }
};

/**
 * Tính khoảng cách giữa 2 điểm tọa độ (Haversine formula)
 * @param {number} lat1 - Vĩ độ điểm 1
 * @param {number} lon1 - Kinh độ điểm 1
 * @param {number} lat2 - Vĩ độ điểm 2
 * @param {number} lon2 - Kinh độ điểm 2
 * @returns {number} Khoảng cách (km)
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Bán kính Trái Đất (km)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export default {
  getAllProvinces,
  getProvinceByCode,
  getDistrictByCode,
  searchAddress,
  getCoordinatesFromAddress,
  getAddressFromCoordinates,
  calculateDistance,
};
