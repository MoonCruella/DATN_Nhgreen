import dotenv from "dotenv";

dotenv.config();

const momoConfig = {
  partnerCode: process.env.MOMO_PARTNER_CODE,
  accessKey: process.env.MOMO_ACCESS_KEY,
  secretKey: process.env.MOMO_SECRET_KEY,
  requestType: process.env.MOMO_REQUEST_TYPE || "captureWallet",
  endpoint:
    process.env.MOMO_ENDPOINT ||
    "https://test-payment.momo.vn/v2/gateway/api/create",
  refundEndpoint:
    process.env.MOMO_REFUND_ENDPOINT ||
    "https://test-payment.momo.vn/v2/gateway/api/refund",
  queryRefundEndpoint:
    process.env.MOMO_QUERY_REFUND_ENDPOINT ||
    "https://test-payment.momo.vn/v2/gateway/api/refund/query",
  serverBaseUrl: process.env.SERVER_BASE_URL,
  frontendRedirectUrl:
    process.env.MOMO_FE_REDIRECT_URL,
};

momoConfig.redirectUrl =
  process.env.MOMO_REDIRECT_URL || momoConfig.frontendRedirectUrl;
momoConfig.ipnUrl =
  process.env.MOMO_IPN_URL || `${momoConfig.serverBaseUrl}/api/momo/ipn`;

export default momoConfig;
