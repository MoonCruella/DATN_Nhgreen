import axios from "axios";

const DEFAULT_GHN_API_URL =
  "https://dev-online-gateway.ghn.vn/shiip/public-api";

const getGhnBaseConfig = () => {
  const apiUrl = process.env.GHN_API_URL || DEFAULT_GHN_API_URL;
  const token = process.env.GHN_TOKEN || "";

  if (!token) {
    throw new Error("GHN_TOKEN chưa được cấu hình");
  }

  return { apiUrl, token };
};

const getGhnConfig = (shopId) => {
  const { apiUrl, token } = getGhnBaseConfig();
  const resolvedShopId = shopId ? String(shopId).trim() : "";

  if (!resolvedShopId) {
    throw new Error("Chi nhánh chưa có shop_id GHN");
  }

  return { apiUrl, token, shopId: resolvedShopId };
};

const getAddressText = (address = {}) =>
  [address.street, address.ward?.name, address.district?.name, address.province?.name]
    .filter(Boolean)
    .join(", ");

const getRegionName = (value) =>
  value && typeof value === "object" ? value.name : value;

const buildGhnStoreAddress = (address = {}) =>
  [address.street, address.ward?.name, address.district?.name, address.province?.name]
    .filter(Boolean)
    .join(", ");

const buildCreateStorePayload = ({ name, phone, address = {} }) => {
  const districtId = Number(address.district?.code) || undefined;
  const wardCode = String(address.ward?.code || "").trim();
  const storeAddress = buildGhnStoreAddress(address);

  if (!districtId || !wardCode) {
    throw new Error("Thiếu mã quận/huyện hoặc phường/xã GHN để tạo shop");
  }

  if (!name || !phone || !storeAddress) {
    throw new Error("Thông tin chi nhánh chưa đầy đủ để tạo shop GHN");
  }

  return {
    district_id: districtId,
    ward_code: wardCode,
    name,
    phone,
    address: storeAddress,
  };
};

const buildFeeItems = (items = []) =>
  items
    .map((item) => ({
      name: item.name || item.dish_name || item.dish_id?.name || "San pham",
      quantity: Number(item.quantity || 1),
      height: Number(item.height || process.env.GHN_DEFAULT_HEIGHT || 10),
      weight: Number(item.weight || item.dish_id?.weight || process.env.GHN_DEFAULT_WEIGHT || 500),
      length: Number(item.length || process.env.GHN_DEFAULT_LENGTH || 20),
      width: Number(item.width || process.env.GHN_DEFAULT_WIDTH || 15),
    }))
    .filter((item) => item.quantity > 0);

const buildCalculateFeePayload = ({
  shippingInfo = {},
  items = [],
  insuranceValue = 0,
}) => {
  const toDistrictId = Number(shippingInfo.district?.code) || undefined;
  const toWardCode = String(shippingInfo.ward?.code || "").trim();

  if (!toDistrictId || !toWardCode) {
    throw new Error(
      "Thiếu mã quận/huyện hoặc phường/xã GHN của người nhận để tính phí giao hàng",
    );
  }

  const payload = {
    service_type_id: 2,
    to_district_id: toDistrictId,
    to_ward_code: toWardCode,
    height: Number(process.env.GHN_DEFAULT_HEIGHT || 10),
    length: Number(process.env.GHN_DEFAULT_LENGTH || 20),
    weight: Number(process.env.GHN_DEFAULT_WEIGHT || 500),
    width: Number(process.env.GHN_DEFAULT_WIDTH || 15),
    insurance_value: Math.min(Number(insuranceValue || 0), 5000000),
    cod_failed_amount: Number(process.env.GHN_COD_FAILED_AMOUNT || 0),
    coupon: process.env.GHN_COUPON || null,
  };

  const feeItems = buildFeeItems(items);
  if (feeItems.length > 0) payload.items = feeItems;

  return payload;
};

const resolveGhnServiceId = async ({ apiUrl, token, shopId, branch = {}, shippingInfo = {} }) => {
  const branchAddress = branch.address || {};
  const fromDistrictId = Number(branchAddress.district?.code) || undefined;
  const toDistrictId = Number(shippingInfo.district?.code) || undefined;

  if (!fromDistrictId || !toDistrictId) {
    throw new Error("Thieu ma quan/huyen GHN de lay goi dich vu giao hang");
  }

  const payload = {
    shop_id: Number(shopId),
    from_district: fromDistrictId,
    to_district: toDistrictId,
  };
  const endpoint = `${apiUrl}/v2/shipping-order/available-services`;

  const response = await axios.post(endpoint, payload, {
    headers: {
      "Content-Type": "application/json",
      Token: token,
      ShopId: shopId,
    },
  });

  const data = response.data || {};
  if (data.code !== 200) {
    throw new Error(data.message || "GHN lay goi dich vu giao hang that bai");
  }

  const services = Array.isArray(data.data) ? data.data : [];
  const selectedService =
    services.find((service) => Number(service.service_type_id) === 2) ||
    services[0];

  return Number(selectedService?.service_id || 0) || null;
};

const buildLeadtimePayload = ({ branch = {}, shippingInfo = {}, serviceId }) => {
  const branchAddress = branch.address || {};
  const fromDistrictId = Number(branchAddress.district?.code) || undefined;
  const fromWardCode = String(branchAddress.ward?.code || "").trim();
  const toDistrictId = Number(shippingInfo.district?.code) || undefined;
  const toWardCode = String(shippingInfo.ward?.code || "").trim();
  const resolvedServiceId = Number(serviceId) || undefined;

  if (!fromDistrictId || !fromWardCode) {
    throw new Error(
      "Thieu ma quan/huyen hoac phuong/xa GHN cua chi nhanh de tinh thoi gian giao hang",
    );
  }

  if (!toDistrictId || !toWardCode) {
    throw new Error(
      "Thieu ma quan/huyen hoac phuong/xa GHN cua nguoi nhan de tinh thoi gian giao hang",
    );
  }

  if (!resolvedServiceId) {
    throw new Error("GHN chua tra ve ma dich vu de tinh thoi gian giao hang");
  }

  return {
    from_district_id: fromDistrictId,
    from_ward_code: fromWardCode,
    to_district_id: toDistrictId,
    to_ward_code: toWardCode,
    service_id: resolvedServiceId,
  };
};

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
    service_type_id: 2,
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
  const branchShopId = order.branch_id?.shop_id || order.branch_info?.shop_id;
  const { apiUrl, token, shopId } = getGhnConfig(branchShopId);
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

export const createGhnStore = async (branchData) => {
  const { apiUrl, token } = getGhnBaseConfig();
  const payload = buildCreateStorePayload(branchData);

  const response = await axios.post(`${apiUrl}/v2/shop/register`, payload, {
    headers: {
      "Content-Type": "application/json",
      Token: token,
    },
  });

  const data = response.data || {};
  if (data.code !== 200) {
    throw new Error(data.message || "GHN tạo shop thất bại");
  }

  if (!data.data?.shop_id) {
    throw new Error("GHN không trả về shop_id");
  }

  return {
    shopId: data.data.shop_id,
    raw: data,
  };
};

export const calculateGhnShippingFee = async ({
  branch,
  shippingInfo,
  items = [],
  insuranceValue = 0,
}) => {
  const branchShopId = branch?.shop_id;
  const { apiUrl, token, shopId } = getGhnConfig(branchShopId);
  const payload = buildCalculateFeePayload({
    shippingInfo,
    items,
    insuranceValue,
  });

  const endpoint = `${apiUrl}/v2/shipping-order/fee`;
  const logContext = {
    branchId: branch?._id,
    branchName: branch?.name,
    shopId,
    endpoint,
    payload,
  };

  console.info("[GHN][shipping-fee][request]", JSON.stringify(logContext, null, 2));

  let response;
  try {
    response = await axios.post(endpoint, payload, {
      headers: {
        "Content-Type": "application/json",
        Token: token,
        ShopId: shopId,
      },
    });
  } catch (error) {
    const ghnError = error.response?.data || {};
    console.error(
      "[GHN][shipping-fee][error]",
      JSON.stringify(
        {
          ...logContext,
          status: error.response?.status,
          response: ghnError,
          message: error.message,
        },
        null,
        2,
      ),
    );

    if (ghnError.code_message === "CLIENT_NOT_BELONG_OF_SHOP") {
      throw new Error(
        `Shop ID GHN ${shopId} của chi nhánh không thuộc GHN_TOKEN hiện tại. Vui lòng đổi shop_id của chi nhánh hoặc dùng đúng token GHN sandbox.`
      );
    }

    throw error;
  }

  const data = response.data || {};
  console.info(
    "[GHN][shipping-fee][response]",
    JSON.stringify(
      {
        branchId: branch?._id,
        branchName: branch?.name,
        shopId,
        code: data.code,
        message: data.message,
        fee: data.data,
      },
      null,
      2,
    ),
  );

  if (data.code !== 200) {
    console.error(
      "[GHN][shipping-fee][failed]",
      JSON.stringify(
        {
          ...logContext,
          response: data,
        },
        null,
        2,
      ),
    );
    throw new Error(data.message || "GHN tính phí giao hàng thất bại");
  }

  return {
    total: Number(data.data?.total || 0),
    serviceFee: Number(data.data?.service_fee || 0),
    serviceId: Number(data.data?.service_id || 0) || null,
    raw: data,
  };
};

export const calculateGhnLeadtime = async ({ branch, shippingInfo, serviceId }) => {
  const branchShopId = branch?.shop_id;
  const { apiUrl, token, shopId } = getGhnConfig(branchShopId);
  const resolvedServiceId =
    Number(serviceId) ||
    (await resolveGhnServiceId({ apiUrl, token, shopId, branch, shippingInfo }));
  const payload = buildLeadtimePayload({
    branch,
    shippingInfo,
    serviceId: resolvedServiceId,
  });
  const endpoint = `${apiUrl}/v2/shipping-order/leadtime`;
  const logContext = {
    branchId: branch?._id,
    branchName: branch?.name,
    shopId,
    endpoint,
    payload,
  };

  console.info("[GHN][leadtime][request]", JSON.stringify(logContext, null, 2));

  let response;
  try {
    response = await axios.post(endpoint, payload, {
      headers: {
        "Content-Type": "application/json",
        Token: token,
        ShopId: shopId,
      },
    });
  } catch (error) {
    console.error(
      "[GHN][leadtime][error]",
      JSON.stringify(
        {
          ...logContext,
          status: error.response?.status,
          response: error.response?.data,
          message: error.message,
        },
        null,
        2,
      ),
    );
    throw error;
  }

  const data = response.data || {};
  console.info(
    "[GHN][leadtime][response]",
    JSON.stringify(
      {
        branchId: branch?._id,
        branchName: branch?.name,
        shopId,
        code: data.code,
        message: data.message,
        leadtime: data.data,
      },
      null,
      2,
    ),
  );

  if (data.code !== 200) {
    throw new Error(data.message || "GHN tinh thoi gian giao hang that bai");
  }

  const leadtime = Number(data.data?.leadtime || 0) || null;
  const orderDate = Number(data.data?.order_date || 0) || null;

  return {
    leadtime,
    orderDate,
    leadtimeDate: leadtime ? new Date(leadtime * 1000).toISOString() : null,
    orderDateTime: orderDate ? new Date(orderDate * 1000).toISOString() : null,
    raw: data,
  };
};

export const getGhnShippingOrderDetail = async (orderCode, shopId) => {
  const { apiUrl, token, shopId: resolvedShopId } = getGhnConfig(shopId);
  const endpoint = `${apiUrl}/v2/shipping-order/detail`;
  const payload = { order_code: orderCode };

  let response;
  try {
    response = await axios.post(endpoint, payload, {
      headers: {
        "Content-Type": "application/json",
        Token: token,
        ShopId: resolvedShopId,
      },
    });
  } catch (error) {
    console.error(
      "[GHN][order-detail][error]",
      JSON.stringify(
        {
          orderCode,
          shopId: resolvedShopId,
          endpoint,
          status: error.response?.status,
          response: error.response?.data,
          message: error.message,
        },
        null,
        2,
      ),
    );
    throw error;
  }

  const data = response.data || {};
  if (data.code !== 200) {
    console.error(
      "[GHN][order-detail][failed]",
      JSON.stringify(
        {
          orderCode,
          shopId: resolvedShopId,
          endpoint,
          response: data,
        },
        null,
        2,
      ),
    );
    throw new Error(data.message || "GHN lấy trạng thái vận đơn thất bại");
  }

  return data.data || {};
};
