import { axiosPrivate } from "./axios";

export const getFamiliarDishes = async (accessToken, params = {}) => {
  const { limit = 4 } = params;

  const response = await axiosPrivate.get("/api/recommendations/familiar/me", {
    params: { limit },
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return response.data;
};

export default {
  getFamiliarDishes,
};
