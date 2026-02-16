import express from "express";
import axios from "axios";

const router = express.Router();

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
