import express from "express";
import axios from "axios";

const router = express.Router();
const DEFAULT_GHN_API_URL =
  "https://dev-online-gateway.ghn.vn/shiip/public-api";

let ghnLocationCache = {
  expiresAt: 0,
  provinces: null,
  districtsByProvince: new Map(),
  wardsByDistrict: new Map(),
};

const getGhnHeaders = () => {
  const token = process.env.GHN_TOKEN || "";
  if (!token) {
    throw new Error("GHN_TOKEN chưa được cấu hình");
  }
  return { Token: token };
};

const getGhnApiUrl = () => process.env.GHN_API_URL || DEFAULT_GHN_API_URL;

const normalizeGhnProvince = (item) => ({
  code: Number(item.ProvinceID),
  name: item.ProvinceName,
  districts: [],
});

const normalizeGhnDistrict = (item) => ({
  code: Number(item.DistrictID),
  name: item.DistrictName,
  province_code: Number(item.ProvinceID),
  wards: [],
});

const normalizeGhnWard = (item) => ({
  code: String(item.WardCode),
  name: item.WardName,
  district_code: Number(item.DistrictID),
});

const fetchGhnProvinces = async () => {
  const response = await axios.get(`${getGhnApiUrl()}/master-data/province`, {
    headers: getGhnHeaders(),
    timeout: 10000,
  });
  return (response.data?.data || []).map(normalizeGhnProvince);
};

const fetchGhnDistricts = async (provinceId) => {
  const response = await axios.get(`${getGhnApiUrl()}/master-data/district`, {
    params: { province_id: Number(provinceId) },
    headers: getGhnHeaders(),
    timeout: 10000,
  });
  return (response.data?.data || []).map(normalizeGhnDistrict);
};

const fetchGhnWards = async (districtId) => {
  const response = await axios.get(`${getGhnApiUrl()}/master-data/ward`, {
    params: { district_id: Number(districtId) },
    headers: getGhnHeaders(),
    timeout: 10000,
  });
  return (response.data?.data || []).map(normalizeGhnWard);
};

const getGhnLocationTree = async () => {
  const now = Date.now();
  if (ghnLocationCache.provinces && ghnLocationCache.expiresAt > now) {
    return ghnLocationCache.provinces;
  }

  const provinces = await fetchGhnProvinces();

  ghnLocationCache = {
    provinces,
    expiresAt: now + 24 * 60 * 60 * 1000,
    districtsByProvince: new Map(),
    wardsByDistrict: new Map(),
  };

  return provinces;
};

const getGhnProvinceWithDistricts = async (provinceId) => {
  const provinces = await getGhnLocationTree();
  const province = provinces.find((item) => item.code === Number(provinceId));
  if (!province) return null;

  if (!ghnLocationCache.districtsByProvince.has(Number(provinceId))) {
    const districts = await fetchGhnDistricts(provinceId);
    ghnLocationCache.districtsByProvince.set(Number(provinceId), districts);
  }

  return {
    ...province,
    districts: ghnLocationCache.districtsByProvince.get(Number(provinceId)),
  };
};

const getGhnDistrictWithWards = async (districtId) => {
  const numericDistrictId = Number(districtId);
  let district = null;
  for (const districts of ghnLocationCache.districtsByProvince.values()) {
    district = districts.find((item) => item.code === numericDistrictId);
    if (district) break;
  }
  if (!district) {
    district = { code: numericDistrictId, name: "", wards: [] };
  }

  if (!ghnLocationCache.wardsByDistrict.has(numericDistrictId)) {
    const wards = await fetchGhnWards(numericDistrictId);
    ghnLocationCache.wardsByDistrict.set(numericDistrictId, wards);
  }

  return {
    ...district,
    wards: ghnLocationCache.wardsByDistrict.get(numericDistrictId),
  };
};

router.get("/ghn/provinces", async (req, res) => {
  try {
    const provinces = await getGhnLocationTree();
    res.json(provinces);
  } catch (error) {
    console.error("GHN provinces error:", error.message);
    res.status(500).json({
      error: "Failed to fetch GHN provinces",
      message: error.message,
    });
  }
});

router.get("/ghn/provinces/:provinceId", async (req, res) => {
  try {
    const province = await getGhnProvinceWithDistricts(req.params.provinceId);
    if (!province) {
      return res.status(404).json({ message: "Province not found" });
    }
    res.json(province);
  } catch (error) {
    console.error("GHN province detail error:", error.message);
    res.status(500).json({
      error: "Failed to fetch GHN province",
      message: error.message,
    });
  }
});

router.get("/ghn/districts/:districtId", async (req, res) => {
  try {
    const district = await getGhnDistrictWithWards(req.params.districtId);
    if (!district) {
      return res.status(404).json({ message: "District not found" });
    }
    res.json(district);
  } catch (error) {
    console.error("GHN district detail error:", error.message);
    res.status(500).json({
      error: "Failed to fetch GHN district",
      message: error.message,
    });
  }
});

/**
 * Proxy route cho Nominatim OSM để tránh CORS
 * GET /api/geocoding/search?q=address&limit=5
 */
router.get("/search", async (req, res) => {
  try {
    const { q, limit = 5, countrycodes = "vn" } = req.query;

    if (!q) {
      return res.status(400).json({ error: "Query parameter 'q' is required" });
    }

    const response = await axios.get(
      "https://nominatim.openstreetmap.org/search",
      {
        params: {
          q,
          format: "json",
          addressdetails: 1,
          limit: parseInt(limit),
          countrycodes,
        },
        headers: {
          "Accept-Language": "vi",
          "User-Agent": "FoodDeliveryApp/1.0",
        },
        timeout: 5000,
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error("Geocoding search error:", error.message);
    res.status(500).json({
      error: "Failed to fetch geocoding data",
      message: error.message,
    });
  }
});

/**
 * Reverse geocoding - Lấy địa chỉ từ tọa độ
 * GET /api/geocoding/reverse?lat=10.123&lon=106.456
 */
router.get("/reverse", async (req, res) => {
  try {
    const { lat, lon } = req.query;

    if (!lat || !lon) {
      return res
        .status(400)
        .json({ error: "Parameters 'lat' and 'lon' are required" });
    }

    const response = await axios.get(
      "https://nominatim.openstreetmap.org/reverse",
      {
        params: {
          lat: parseFloat(lat),
          lon: parseFloat(lon),
          format: "json",
          addressdetails: 1,
        },
        headers: {
          "Accept-Language": "vi",
          "User-Agent": "FoodDeliveryApp/1.0",
        },
        timeout: 5000,
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error("Reverse geocoding error:", error.message);
    res.status(500).json({
      error: "Failed to fetch reverse geocoding data",
      message: error.message,
    });
  }
});

export default router;
