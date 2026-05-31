// context/AddressContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import addressApi from "@/api/addressApi";
import branchApi from "@/api/branchApi";
import { toast } from "sonner";
import { useSelector } from "react-redux";

const AddressContext = createContext();

export const AddressProvider = ({ children }) => {
  const { user, isAuthenticated, accessToken } = useSelector(
    (state) => state.auth
  );

  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null); // lưu object
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [loading, setLoading] = useState(false);

  // Branch state
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [loadingBranches, setLoadingBranches] = useState(false);

  /* Load danh sách địa chỉ từ API */
  const loadAddresses = async () => {
    if (!user || !accessToken) {
      setAddresses([]);
      setSelectedAddress(null);
      return;
    }
    try {
      setLoading(true);
      const res = await addressApi.getAddresses(accessToken);

      // API trả về { success: true, data: [...] }
      const list = res?.data || [];
      setAddresses(list);

      // Nếu chưa chọn địa chỉ => chọn mặc định hoặc địa chỉ đầu tiên
      if (list.length > 0) {
        const defaultAddr = list.find((a) => a.is_default);
        setSelectedAddress(defaultAddr || list[0]);
      } else {
        setSelectedAddress(null);
      }
    } catch (err) {
      console.error("Error loading addresses:", err);
      setAddresses([]);
      setSelectedAddress(null);
    } finally {
      setLoading(false);
    }
  };

  /* Load danh sách chi nhánh */
  const loadBranches = async () => {
    try {
      setLoadingBranches(true);
      const res = await branchApi.getAll();
      const list = res?.data || [];
      setBranches(list);

      // Tự động chọn chi nhánh đầu tiên nếu chưa có chi nhánh được chọn
      if (list.length > 0 && !selectedBranch) {
        setSelectedBranch(list[0]);
      }
    } catch (err) {
      console.error("Error loading branches:", err);
      setBranches([]);
    } finally {
      setLoadingBranches(false);
    }
  };

  const addAddress = async (data) => {
    if (!accessToken) {
      toast.error("Vui lòng đăng nhập");
      return;
    }
    try {
      const res = await addressApi.addAddress(accessToken, data);

      if (res?.success) {
        // API trả về { success: true, data: [...], addresses: [...] }
        const list = res.data || res.addresses || [];
        setAddresses(list);

        // Chọn địa chỉ vừa thêm (địa chỉ cuối cùng trong mảng)
        if (list.length > 0) {
          const newAddr = list[list.length - 1];
          setSelectedAddress(newAddr);
        }

        toast.success("Thêm địa chỉ thành công");
        return list[list.length - 1];
      } else {
        toast.error(res?.message || "Thêm địa chỉ thất bại");
        await loadAddresses();
      }
    } catch (err) {
      console.error("Error adding address:", err);
      toast.error("Thêm địa chỉ thất bại");
    }
  };

  /* Cập nhật địa chỉ */
  const updateAddress = async (id, data) => {
    if (!accessToken) {
      toast.error("Vui lòng đăng nhập");
      return;
    }
    try {
      const res = await addressApi.updateAddress(accessToken, id, data);
      if (res?.success) {
        // API trả về { success: true, data: [...], addresses: [...] }
        const list = res.data || res.addresses || [];
        setAddresses(list);

        const updatedItem = list.find((a) => a._id === id);
        if (updatedItem) setSelectedAddress(updatedItem);

        toast.success("Cập nhật địa chỉ thành công");
        return updatedItem || null;
      } else {
        toast.error(res?.message || "Cập nhật địa chỉ thất bại");
        await loadAddresses();
      }
    } catch (err) {
      console.error("Error updating address:", err);
      toast.error("Cập nhật địa chỉ thất bại");
    }
  };

  /* Xóa địa chỉ */
  const removeAddress = async (id) => {
    // xác nhận xóa
    if (!window.confirm("Bạn có chắc muốn xóa địa chỉ này?")) return false;
    if (!accessToken) {
      toast.error("Vui lòng đăng nhập");
      return false;
    }
    try {
      const res = await addressApi.deleteAddress(accessToken, id);
      if (res?.success) {
        // API trả về { success: true, data: [...], addresses: [...] }
        const list = res.data || res.addresses || [];
        setAddresses(list);

        // Nếu địa chỉ đang chọn bị xóa, chọn địa chỉ khác
        if (selectedAddress?._id === id) {
          setSelectedAddress(
            list.length > 0 ? list.find((a) => a.is_default) || list[0] : null
          );
        }

        toast.success("Xóa địa chỉ thành công");
        return true;
      } else {
        toast.error(res?.message || "Xóa địa chỉ thất bại");
        return false;
      }
    } catch (err) {
      console.error("Error removing address:", err);
      toast.error("Xóa địa chỉ thất bại");
      return false;
    }
  };

  useEffect(() => {
    loadAddresses();
    loadBranches(); // Load branches khi component mount
  }, [user, accessToken]);

  return (
    <AddressContext.Provider
      value={{
        addresses,
        selectedAddress,
        setSelectedAddress,
        paymentMethod,
        setPaymentMethod,
        loading,
        loadAddresses,
        addAddress,
        updateAddress,
        removeAddress,
        // Branch
        branches,
        selectedBranch,
        setSelectedBranch,
        loadingBranches,
        loadBranches,
      }}
    >
      {children}
    </AddressContext.Provider>
  );
};

export const useAddressContext = () => useContext(AddressContext);
