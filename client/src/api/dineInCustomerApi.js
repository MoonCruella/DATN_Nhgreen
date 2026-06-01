import { axiosPrivate } from "./axios";

const base = "/api/dine-in-customers";

const getByPhone = async (phone) => {
  const response = await axiosPrivate.get(`${base}/phone/${phone}`);
  return response.data;
};

const create = async (payload) => {
  const response = await axiosPrivate.post(base, payload);
  return response.data;
};

const dineInCustomerApi = {
  getByPhone,
  create,
};

export default dineInCustomerApi;
