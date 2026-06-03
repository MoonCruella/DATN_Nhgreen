import axios from "axios";

const DEFAULT_GHN_API_URL =
  "https://dev-online-gateway.ghn.vn/shiip/public-api";

const getGhnConfig = () => {
  const apiUrl = process.env.GHN_API_URL || DEFAULT_GHN_API_URL;
  const token = process.env.GHN_TOKEN || "";
  const shopId = process.env.GHN_SHOP_ID || "";

  if (!token) {
    throw new Error("GHN_TOKEN chưa được cấu hình");
  }

  if (!shopId) {
    throw new Error("GHN_SHOP_ID chưa được cấu hình");
  }

  return { apiUrl, token, shopId };
};

const getAddressText = (address = {}) =>
  [address.street, address.ward?.name, address.district?.name, address.province?.name]
    .filter(Boolean)
    .join(", ");

const getRegionName = (value) =>
  value && typeof value === "object" ? value.name : value;

const getOrderContent = (order) =>
  (order.items || [])
    .map((item) => `${item.dish_name} x${item.quantity}`)
    .join(", ")
    .slice(0, 2000);

const buildCreateOrderPayload = (order) => {
  const branchAddress = order.branch_id?.address || order.branch_info?.address || {};
  const branchPhone = order.branch_id?.phone || order.branch_info?.phone || "";
  const branchAddressText =
    getAddressText(branchAddress) || order.branch_info?.address?.full_address || "";
  const shippingInfo = order.shipping_info || {};
  const toName = shippingInfo.name || shippingInfo.full_name || "";
  const toAddress =
    shippingInfo.address ||
    shippingInfo.full_address ||
    [
      shippingInfo.street,
      getRegionName(shippingInfo.ward),
      getRegionName(shippingInfo.district),
      getRegionName(shippingInfo.province),
    ]
      .filter(Boolean)
      .join(", ");
  const toDistrictId =
    Number(shippingInfo.district?.code) || undefined;
  const toWardCode = String(shippingInfo.ward?.code || "").trim();

  if (!toName || !shippingInfo.phone || !toAddress) {
    throw new Error("Thông tin người nhận chưa đầy đủ để tạo đơn GHN");
  }

  if (!toDistrictId || !toWardCode) {
    throw new Error(
      "Thiếu mã quận/huyện hoặc phường/xã GHN của người nhận để tạo đơn GHN",
    );
  }

  return {
    payment_type_id: Number(process.env.GHN_PAYMENT_TYPE_ID || 2),
    service_id: process.env.GHN_SERVICE_ID
      ? Number(process.env.GHN_SERVICE_ID)
      : undefined,
    service_type_id: Number(process.env.GHN_SERVICE_TYPE_ID || 2),
    required_note: process.env.GHN_REQUIRED_NOTE || "KHONGCHOXEMHANG",
    client_order_code: order.order_number || String(order._id),
    to_name: toName,
    to_phone: shippingInfo.phone,
    to_address: toAddress,
    to_ward_code: toWardCode,
    to_district_id: toDistrictId,
    return_phone: process.env.GHN_RETURN_PHONE || branchPhone,
    return_address: process.env.GHN_RETURN_ADDRESS || branchAddressText,
    return_district_id:
      Number(process.env.GHN_RETURN_DISTRICT_ID || branchAddress.district?.code) ||
      undefined,
    return_ward_code:
      String(process.env.GHN_RETURN_WARD_CODE || branchAddress.ward?.code || "") ||
      undefined,
    weight: Number(process.env.GHN_DEFAULT_WEIGHT || 500),
    length: Number(process.env.GHN_DEFAULT_LENGTH || 20),
    width: Number(process.env.GHN_DEFAULT_WIDTH || 15),
    height: Number(process.env.GHN_DEFAULT_HEIGHT || 10),
    cod_amount:
      order.payment_method === "cod" && order.payment_status !== "paid"
        ? Number(order.total_amount || 0)
        : 0,
    insurance_value: Math.min(Number(order.total_amount || 0), 5000000),
    content: getOrderContent(order) || `Don hang ${order.order_number}`,
    note: `NHGreen ${order.order_number || order._id}`,
  };
};

export const createGhnShippingOrder = async (order) => {
  const { apiUrl, token, shopId } = getGhnConfig();
  const payload = buildCreateOrderPayload(order);

  const response = await axios.post(
    `${apiUrl}/v2/shipping-order/create`,
    payload,
    {
      headers: {
        "Content-Type": "application/json",
        Token: token,
        ShopId: shopId,
      },
    },
  );

  const data = response.data || {};
  if (data.code !== 200) {
    throw new Error(data.message || "GHN tạo vận đơn thất bại");
  }

  return {
    orderCode: data.data?.order_code || "",
    expectedDeliveryTime: data.data?.expected_delivery_time || null,
    fee: data.data?.total_fee || data.data?.fee?.main_service || null,
    raw: data,
  };
};

export const getGhnShippingOrderDetail = async (orderCode) => {
  const { apiUrl, token } = getGhnConfig();

  const response = await axios.post(
    `${apiUrl}/v2/shipping-order/detail`,
    { order_code: orderCode },
    {
      headers: {
        "Content-Type": "application/json",
        Token: token,
      },
    },
  );

  const data = response.data || {};
  if (data.code !== 200) {
    throw new Error(data.message || "GHN lấy trạng thái vận đơn thất bại");
  }

  return data.data || {};
};
