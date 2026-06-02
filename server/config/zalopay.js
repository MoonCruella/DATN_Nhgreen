import dotenv from "dotenv";
dotenv.config();

const zalopayConfig = {
  app_id: process.env.ZP_APP_ID,
  key1: process.env.ZP_KEY1, // used for creating order & query
  key2: process.env.ZP_KEY2, // used for callback validation
  createEndpoint:
    process.env.ZP_CREATE_ENDPOINT || "https://sb-openapi.zalopay.vn/v2/create",
  queryEndpoint:
    process.env.ZP_QUERY_ENDPOINT || "https://sb-openapi.zalopay.vn/v2/query",
  refundEndpoint:
    process.env.ZP_REFUND_ENDPOINT || "https://sb-openapi.zalopay.vn/v2/refund",
  queryRefundEndpoint:
    process.env.ZP_QUERY_REFUND_ENDPOINT ||
    "https://sb-openapi.zalopay.vn/v2/query_refund",
  // Your server public base URL
  serverBaseUrl: process.env.SERVER_BASE_URL,
  // Frontend checkout page to redirect after payment
  frontendRedirectUrl:
    process.env.ZP_FE_REDIRECT_URL,
};

export default zalopayConfig;
