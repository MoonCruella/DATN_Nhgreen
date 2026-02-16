import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { useAddressContext } from "@/context/AddressContext";
import AddressForm from "@/components/customer-view/address/AddressForm";
import addressApi from "@/api/addressApi";

const ProfileAddress = () => {
  const { accessToken } = useSelector((state) => state.auth);
  const { addresses, loading, loadAddresses, removeAddress, updateAddress } =
    useAddressContext();

  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);

  useEffect(() => {
    if (accessToken) {
      loadAddresses();
    }
  }, [accessToken]);

  const handleEdit = (address) => {
    setEditingAddress(address);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    try {
      await removeAddress(id);
    } catch (error) {
      toast.error(error.message || "Có lỗi xảy ra");
    }
  };

  const handleSetDefault = async (id) => {
    try {
      const response = await addressApi.setDefaultAddress(accessToken, id);

      if (response.success) {
        toast.success("Đặt địa chỉ mặc định thành công!");
        await loadAddresses();
      } else {
        toast.error(response.message || "Có lỗi xảy ra");
      }
    } catch (error) {
      console.error("Set default address error:", error);
      toast.error(
        error.response?.data?.message ||
          "Có lỗi xảy ra khi đặt địa chỉ mặc định"
      );
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingAddress(null);
  };

  return (
    <div className="bg-white rounded-2xl shadow-md p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-6 border-b">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Địa Chỉ Của Tôi</h2>
          <p className="text-gray-500 mt-1">Quản lý địa chỉ giao hàng</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium cursor-pointer"
        >
          Thêm địa chỉ mới
        </button>
      </div>

      {/* Address Form Popup */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <AddressForm
                addressToEdit={editingAddress}
                onCancel={handleCloseForm}
              />
            </div>
          </div>
        </div>
      )}

      {/* Address List */}
      {addresses && addresses.length > 0 ? (
        <div className="space-y-4">
          {addresses.map((address) => (
            <div
              key={address._id}
              className={`border-2 rounded-xl p-5 transition hover:shadow-md ${
                address.is_default
                  ? "border-green-500 bg-green-50"
                  : "border-gray-200 bg-white"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <p className="font-bold text-gray-800 text-lg">
                      {address.full_name}
                    </p>
                    {address.is_default && (
                      <span className="px-3 py-1 bg-green-600 text-white text-xs font-bold rounded-full">
                        Mặc định
                      </span>
                    )}
                  </div>
                  <div className="space-y-1 text-gray-600">
                    <p>
                      <span className="font-semibold">Số điện thoại:</span>{" "}
                      {address.phone}
                    </p>
                    <p>
                      <span className="font-semibold">Địa chỉ:</span>{" "}
                      {address.full_address}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 ml-4">
                  <button
                    onClick={() => handleEdit(address)}
                    className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition text-sm font-medium cursor-pointer"
                  >
                    Chỉnh sửa
                  </button>
                  {!address.is_default && (
                    <>
                      <button
                        onClick={() => handleSetDefault(address._id)}
                        className="px-4 py-2 text-green-600 hover:bg-green-50 rounded-lg transition text-sm font-medium cursor-pointer"
                      >
                        Đặt mặc định
                      </button>
                      <button
                        onClick={() => handleDelete(address._id)}
                        className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition text-sm font-medium cursor-pointer"
                      >
                        Xóa
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="w-32 h-32 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
            <svg
              className="w-16 h-16 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
          <p className="text-gray-500 text-xl font-semibold mb-2">
            Chưa có địa chỉ nào
          </p>
          <p className="text-gray-400 mb-6">
            Thêm địa chỉ giao hàng để thuận tiện cho việc mua sắm
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold cursor-pointer"
          >
            Thêm địa chỉ đầu tiên
          </button>
        </div>
      )}
    </div>
  );
};

export default ProfileAddress;
