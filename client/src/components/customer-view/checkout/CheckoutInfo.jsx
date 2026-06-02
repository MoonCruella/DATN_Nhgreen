import React, { useEffect, useState } from "react";
import { assets } from "@/assets/assets";
import { useAddressContext } from "@/context/AddressContext";
import { useCartContext } from "@/context/CartContext";
import AddressModal from "../address/AddressModal";
import UnavailableItemsModal from "./UnavailableItemsModal";
import branchApi from "@/api/branchApi";
import { toast } from "sonner";
import {
  MapPin,
  Phone,
  Edit2,
  Trash2,
  AlertTriangle,
  XCircle,
} from "lucide-react";

const CheckoutInfo = ({ cartItems = [] }) => {
  const {
    addresses,
    loadAddresses,
    addAddress,
    updateAddress,
    removeAddress,
    selectedAddress,
    setSelectedAddress,
    paymentMethod,
    setPaymentMethod,
    branches,
    selectedBranch,
    setSelectedBranch,
    loadingBranches,
  } = useAddressContext();

  const [showModal, setShowModal] = useState(false);
  const [editAddress, setEditAddress] = useState(null);
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [sortedBranches, setSortedBranches] = useState([]);
  const [showUnavailableModal, setShowUnavailableModal] = useState(false);
  const [unavailableItems, setUnavailableItems] = useState([]);

  const { removeFromCart } = useCartContext();

  // load danh sách địa chỉ khi mở trang
  useEffect(() => {
    loadAddresses();
  }, []);

  // Hàm tính khoảng cách giữa 2 điểm tọa độ (Haversine formula)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;

    const R = 6371; // Bán kính trái đất (km)
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Khoảng cách (km)

    return distance;
  };

  // Lọc và sắp xếp chi nhánh: chỉ hiển thị cùng tỉnh và < 20km
  useEffect(() => {
    if (branches.length === 0) {
      setSortedBranches([]);
      return;
    }

    if (!selectedAddress) {
      setSortedBranches(branches);
      return;
    }

    // Lọc chi nhánh cùng tỉnh
    const sameCityBranches = branches.filter((branch) => {
      // Kiểm tra cùng tỉnh/thành phố
      if (!branch.address?.province?.code || !selectedAddress?.province?.code) {
        return false;
      }

      return branch.address.province.code === selectedAddress.province.code;
    });

    // Tính khoảng cách và lọc < 20km
    const branchesWithDistance = sameCityBranches
      .map((branch) => {
        const distance = calculateDistance(
          selectedAddress?.coordinates?.latitude,
          selectedAddress?.coordinates?.longitude,
          branch.address?.coordinates?.latitude,
          branch.address?.coordinates?.longitude
        );

        return {
          ...branch,
          distance: distance !== null ? distance : 999, // Gán 999 nếu không có tọa độ để đẩy xuống cuối
        };
      })
      .filter((branch) => {
        // Chỉ hiển thị chi nhánh < 20km (hoặc không có tọa độ)
        return branch.distance === 999 || branch.distance < 20;
      })
      .sort((a, b) => {
        // Sắp xếp theo khoảng cách (gần nhất lên đầu, không có tọa độ xuống cuối)
        return a.distance - b.distance;
      });

    setSortedBranches(branchesWithDistance);

    // Tự động chọn chi nhánh gần nhất khi thay đổi địa chỉ
    if (branchesWithDistance.length > 0) {
      // Luôn chọn chi nhánh gần nhất (đầu tiên trong danh sách)
      setSelectedBranch(branchesWithDistance[0]);
    } else {
      // Nếu không có chi nhánh phù hợp, clear selection
      setSelectedBranch(null);
    }
  }, [branches, selectedAddress]);

  // Check dish availability when branch is selected
  useEffect(() => {
    const checkAvailability = async () => {
      if (!selectedBranch?._id || !cartItems || cartItems.length === 0) {
        return;
      }

      try {
        // Extract dish IDs from cart items
        const dishIds = cartItems
          .map((item) => {
            const dish = item.dish_id || item.product_id;
            return dish?._id || dish;
          })
          .filter(Boolean);

        if (dishIds.length === 0) return;

        // Call API to check availability
        const response = await branchApi.checkDishesAvailability(
          selectedBranch._id,
          dishIds
        );

        if (response.success && response.unavailableDishes?.length > 0) {
          // Map unavailable dish IDs to full cart items
          const unavailableDishIds = response.unavailableDishes.map(
            (d) => d._id || d.dishId
          );

          const unavailableCartItems = cartItems.filter((item) => {
            const dish = item.dish_id || item.product_id;
            const dishId = dish?._id || dish;
            return unavailableDishIds.includes(dishId);
          });

          setUnavailableItems(unavailableCartItems);
          setShowUnavailableModal(true);
        }
      } catch (error) {
        console.error("Error checking dish availability:", error);
        toast.error("Không thể kiểm tra tình trạng món ăn");
      }
    };

    checkAvailability();
  }, [selectedBranch, cartItems]);

  // Check dish availability when branch is selected
  useEffect(() => {
    const checkAvailability = async () => {
      if (!selectedBranch?._id || !cartItems || cartItems.length === 0) {
        return;
      }

      try {
        // Extract dish IDs from cart items
        const dishIds = cartItems
          .map((item) => {
            const dish = item.dish_id || item.product_id;
            return dish?._id || dish;
          })
          .filter(Boolean);

        if (dishIds.length === 0) return;

        // Call API to check availability
        const response = await branchApi.checkDishesAvailability(
          selectedBranch._id,
          dishIds
        );

        if (response.success && response.unavailableDishes?.length > 0) {
          // Map unavailable dish IDs to full cart items
          const unavailableDishIds = response.unavailableDishes.map(
            (d) => d._id || d.dishId
          );

          const unavailableCartItems = cartItems.filter((item) => {
            const dish = item.dish_id || item.product_id;
            const dishId = dish?._id || dish;
            return unavailableDishIds.includes(dishId);
          });

          setUnavailableItems(unavailableCartItems);
          setShowUnavailableModal(true);
        }
      } catch (error) {
        console.error("Error checking dish availability:", error);
        toast.error("Không thể kiểm tra tình trạng món ăn");
      }
    };

    checkAvailability();
  }, [selectedBranch, cartItems]);

  // Lưu địa chỉ (thêm hoặc sửa)
  const handleSaveAddress = async (data) => {
    if (editAddress) {
      await updateAddress(editAddress._id, data);
    } else {
      await addAddress(data);
    }
    setShowModal(false);
    setEditAddress(null);
  };

  return (
    <div>
      {/* Shipping Address - Moved to top */}
      <div className="mb-8">
        <h4 className="text-lg font-semibold mb-4">Địa chỉ nhận hàng</h4>

        {/* Dropdown for address selection */}
        <div className="relative">
          <div
            onClick={() => setShowAddressDropdown(!showAddressDropdown)}
            className={`border rounded-lg p-4 cursor-pointer transition ${
              selectedAddress
                ? "border-green-600 bg-green-50"
                : "border-gray-300 hover:border-green-400"
            }`}
          >
            {selectedAddress ? (
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 flex items-center gap-2">
                    {selectedAddress.full_name} - {selectedAddress.phone}
                    {selectedAddress.is_default && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                        Mặc định
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedAddress.full_address || selectedAddress.street}
                  </p>
                </div>
                <svg
                  className={`w-5 h-5 text-gray-600 transition-transform ${
                    showAddressDropdown ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-gray-500">Chọn địa chỉ nhận hàng</p>
                <svg
                  className={`w-5 h-5 text-gray-600 transition-transform ${
                    showAddressDropdown ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            )}
          </div>

          {/* Dropdown menu */}
          {showAddressDropdown && (
            <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
              {addresses.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  Chưa có địa chỉ nào
                </div>
              ) : (
                <div className="p-2 space-y-2">
                  {addresses.map((addr) => (
                    <div
                      key={addr._id}
                      onClick={() => {
                        setSelectedAddress(addr);
                        setShowAddressDropdown(false);
                      }}
                      className={`p-3 rounded-lg cursor-pointer transition ${
                        selectedAddress?._id === addr._id
                          ? "bg-green-50 border-2 border-green-600"
                          : "hover:bg-gray-50 border-2 border-transparent"
                      }`}
                    >
                      <p className="font-semibold text-gray-900 flex items-center gap-2">
                        {addr.full_name} - {addr.phone}
                        {addr.is_default && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                            Mặc định
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {addr.full_address || addr.street}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Add new address button in dropdown */}
              <div className="border-t border-gray-200 p-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditAddress(null);
                    setShowModal(true);
                    setShowAddressDropdown(false);
                  }}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  + Thêm địa chỉ mới
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Edit/Delete buttons for selected address */}
        {selectedAddress && (
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setEditAddress(selectedAddress);
                setShowModal(true);
              }}
              className="px-3 py-1.5 text-sm border border-green-600 text-green-600 rounded-lg hover:bg-green-50 transition flex items-center gap-1"
            >
              <Edit2 className="w-4 h-4" /> Chỉnh sửa
            </button>
            <button
              type="button"
              onClick={() => removeAddress(selectedAddress._id)}
              className="px-3 py-1.5 text-sm border border-red-600 text-red-600 rounded-lg hover:bg-red-50 transition flex items-center gap-1"
            >
              <Trash2 className="w-4 h-4" /> Xóa
            </button>
          </div>
        )}
      </div>

      {/* Branch Selection */}
      <div className="mb-8">
        <h4 className="text-lg font-semibold mb-3">
          Chọn chi nhánh
          {selectedAddress && (
            <span className="text-sm font-normal text-gray-600 ml-2">
              (Cùng tỉnh và trong bán kính 20km)
            </span>
          )}
        </h4>

        {loadingBranches ? (
          <p className="text-gray-500">Đang tải danh sách chi nhánh...</p>
        ) : !selectedAddress ? (
          <p className="text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" /> Vui lòng chọn địa chỉ nhận
            hàng trước để xem chi nhánh phù hợp
          </p>
        ) : sortedBranches.length === 0 ? (
          <p className="text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
            <XCircle className="w-5 h-5" /> Không có chi nhánh nào trong khu vực
            của bạn (cùng tỉnh và trong bán kính 20km)
          </p>
        ) : (
          <div className="relative">
            {/* Dropdown trigger */}
            <div
              onClick={() => setShowBranchDropdown(!showBranchDropdown)}
              className={`border rounded-lg p-4 cursor-pointer transition ${
                selectedBranch
                  ? "border-green-600 bg-green-50"
                  : "border-gray-300 hover:border-green-400"
              }`}
            >
              {selectedBranch ? (
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 flex items-center gap-2">
                      {selectedBranch.name}
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                        {!selectedBranch.distance
                          ? "N/A"
                          : `${selectedBranch.distance.toFixed(1)} km`}
                      </span>
                    </p>
                    <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                      <MapPin className="w-4 h-4" />{" "}
                      {selectedBranch.address?.street || "Chưa có địa chỉ"}
                    </p>
                    {selectedBranch.phone && (
                      <p className="text-sm text-gray-600 mt-0.5 flex items-center gap-1">
                        <Phone className="w-4 h-4" /> {selectedBranch.phone}
                      </p>
                    )}
                  </div>
                  <svg
                    className={`w-5 h-5 text-gray-600 transition-transform flex-shrink-0 ml-2 ${
                      showBranchDropdown ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-gray-500">Chọn chi nhánh gần bạn</p>
                  <svg
                    className={`w-5 h-5 text-gray-600 transition-transform ${
                      showBranchDropdown ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              )}
            </div>

            {/* Dropdown menu */}
            {showBranchDropdown && (
              <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
                <div className="p-2 space-y-2">
                  {sortedBranches.map((branch, index) => {
                    const isSelected = selectedBranch?._id === branch._id;
                    const distance = branch.distance;
                    const isNearest = index === 0 && distance !== 999;

                    return (
                      <div
                        key={branch._id}
                        onClick={() => {
                          setSelectedBranch(branch);
                          setShowBranchDropdown(false);
                        }}
                        className={`p-3 rounded-lg cursor-pointer transition relative ${
                          isSelected
                            ? "bg-green-50 border-2 border-green-600"
                            : "hover:bg-gray-50 border-2 border-transparent"
                        }`}
                      >
                        {isNearest && (
                          <span className="absolute -top-1 -right-1 bg-green-600 text-white text-xs px-2 py-0.5 rounded-full shadow-md flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> Gần nhất
                          </span>
                        )}

                        <p className="font-semibold text-gray-900 flex items-center gap-2">
                          {branch.name}
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                            {!distance || distance === 999
                              ? "N/A"
                              : `${distance.toFixed(1)} km`}
                          </span>
                        </p>
                        <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                          <MapPin className="w-4 h-4" />{" "}
                          {branch.address?.street || "Chưa có địa chỉ"}
                        </p>
                        {branch.phone && (
                          <p className="text-sm text-gray-600 mt-0.5 flex items-center gap-1">
                            <Phone className="w-4 h-4" /> {branch.phone}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Payment Method */}
      <div>
        <h4 className="text-lg font-semibold mb-3">Phương thức thanh toán</h4>
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              value: "cod",
              label: "Thanh toán khi nhận hàng (COD)",
              icon: assets.cod_icon,
            },
            { value: "vnpay", label: "VNPAY", icon: assets.vnpay_icon },
            { value: "momo", label: "MoMo", icon: assets.momo_icon },
            { value: "zalopay", label: "ZaloPay", icon: assets.zalo_pay },
          ].map((method) => {
            const isSelected = paymentMethod === method.value;
            return (
              <label
                key={method.value}
                className={`flex items-center gap-2 border rounded-lg p-3 cursor-pointer transition
            ${
              isSelected
                ? "border-green-600 bg-green-50 shadow-sm"
                : "border-gray-200 hover:shadow-sm"
            }
          `}
              >
                <input
                  type="radio"
                  name="payment"
                  value={method.value}
                  checked={isSelected}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="hidden"
                />
                <img
                  src={method.icon}
                  alt={method.label}
                  className="w-8 h-8 object-contain"
                />
                <span
                  className={`font-medium text-sm ${
                    isSelected ? "text-green-700" : "text-gray-800"
                  }`}
                >
                  {method.label}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Shipping Address */}
      {/* REMOVED - Moved to top as dropdown */}

      {/* Modal Form */}
      {showModal && (
        <AddressModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setEditAddress(null);
          }}
          onSubmit={handleSaveAddress}
          addressToEdit={editAddress}
        />
      )}

      {/* Unavailable Items Modal */}
      <UnavailableItemsModal
        isOpen={showUnavailableModal}
        onClose={() => {
          setShowUnavailableModal(false);
          setUnavailableItems([]);
        }}
        unavailableItems={unavailableItems}
        onRemoveItems={async () => {
          try {
            // Remove all unavailable items from cart
            for (const item of unavailableItems) {
              await removeFromCart(item._id);
            }
            setShowUnavailableModal(false);
            setUnavailableItems([]);
            // Navigate back to cart to show updated items
            window.location.href = "/my-cart";
          } catch (error) {
            console.error("Error removing items:", error);
            toast.error("Không thể xóa món ăn");
          }
        }}
        onChangeBranch={() => {
          setShowUnavailableModal(false);
          setUnavailableItems([]);
          setShowBranchDropdown(true);
        }}
      />
    </div>
  );
};

export default CheckoutInfo;
