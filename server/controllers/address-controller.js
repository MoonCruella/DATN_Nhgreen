import User from "../models/user-model.js";

// Thêm địa chỉ
export const addAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const newAddress = req.body;

    if (newAddress.is_default) {
      // 🔹 Reset tất cả địa chỉ khác về false
      user.shipping_addresses.forEach((addr) => {
        addr.is_default = false;
      });
    }

    user.shipping_addresses.push(newAddress);
    await user.save();

    res.json({
      success: true,
      message: "Address added",
      data: user.shipping_addresses,
      addresses: user.shipping_addresses, // backward compatibility
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Lấy danh sách địa chỉ
export const getAddresses = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ success: true, data: user.shipping_addresses });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Cập nhật địa chỉ
export const updateAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const { addressId } = req.params;
    const newData = req.body;

    const address = user.shipping_addresses.id(addressId);
    if (!address) return res.status(404).json({ message: "Address not found" });

    if (newData.is_default) {
      // 🔹 Reset tất cả địa chỉ khác về false
      user.shipping_addresses.forEach((addr) => {
        addr.is_default = false;
      });
    }

    Object.assign(address, newData);
    await user.save();

    res.json({
      success: true,
      message: "Address updated",
      data: user.shipping_addresses,
      addresses: user.shipping_addresses, // backward compatibility
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Xóa địa chỉ
export const deleteAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const { addressId } = req.params;
    const address = user.shipping_addresses.id(addressId);
    if (!address) return res.status(404).json({ message: "Address not found" });

    address.deleteOne(); // xoá địa chỉ khỏi mảng
    await user.save();

    res.json({
      success: true,
      message: "Address removed",
      data: user.shipping_addresses,
      addresses: user.shipping_addresses, // backward compatibility
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Đặt mặc định
export const setDefaultAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const { addressId } = req.params;
    const address = user.shipping_addresses.id(addressId);
    if (!address) return res.status(404).json({ message: "Address not found" });

    // Reset tất cả về false trước
    user.shipping_addresses.forEach((addr) => {
      addr.is_default = false;
    });

    address.is_default = true;
    await user.save();

    res.json({
      success: true,
      message: "Default address set",
      data: user.shipping_addresses,
      addresses: user.shipping_addresses, // backward compatibility
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
