import { axiosPrivate } from "./axios";

const base = "/api/upload";

const uploadApi = {
  uploadImage: async (file, type = "general", accessToken = null) => {
    const form = new FormData();
    form.append("image", file);
    form.append("type", type);

    const headers = accessToken
      ? { Authorization: `Bearer ${accessToken}` }
      : undefined;

    // axiosPrivate has JSON header by default; override to multipart
    const res = await axiosPrivate.post(base, form, {
      headers: { ...headers, "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  uploadAvatar: async (file, accessToken) => {
    const form = new FormData();
    form.append("avatar", file);
    const headers = accessToken
      ? { Authorization: `Bearer ${accessToken}` }
      : undefined;
    const res = await axiosPrivate.post(`${base}/avatar`, form, {
      headers: { ...headers, "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },
  deleteImage: async (publicId, accessToken = null) => {
    const headers = accessToken
      ? { Authorization: `Bearer ${accessToken}` }
      : undefined;
    // axios.delete accepts data in config
    const res = await axiosPrivate.delete(base, {
      data: { publicId },
      headers,
    });
    return res.data;
  },
};

export default uploadApi;
