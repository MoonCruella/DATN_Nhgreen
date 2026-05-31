import { axiosPrivate } from "./axios";

/**
 * Lấy gợi ý món ăn cho user hiện tại
 * @param {string} accessToken - JWT token
 * @param {Object} params - { limit, excludeDishIds }
 * @returns {Promise}
 */
export const getRecommendations = async (accessToken, params = {}) => {
  const { limit = 10, excludeDishIds = [] } = params;

  const response = await axiosPrivate.get("/api/recommendations/user/me", {
    params: {
      limit,
      excludeDishIds: excludeDishIds.join(","),
    },
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return response.data;
};

/**
 * Lấy món tương tự với một món cụ thể
 * @param {string} dishId - ID của món ăn
 * @param {Object} params - { limit }
 * @returns {Promise}
 */
export const getSimilarDishes = async (dishId, params = {}) => {
  const { limit = 10 } = params;

  const response = await axiosPrivate.get(
    `/api/recommendations/similar/${dishId}`,
    {
      params: { limit },
    }
  );

  return response.data;
};

/**
 * Trigger retrain AI model (Admin only)
 * @param {string} accessToken - JWT token của admin
 * @returns {Promise}
 */
export const retrainModel = async (accessToken) => {
  const response = await axiosPrivate.post(
    "/api/recommendations/retrain",
    {},
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  return response.data;
};

export default {
  getRecommendations,
  getSimilarDishes,
  retrainModel,
};
