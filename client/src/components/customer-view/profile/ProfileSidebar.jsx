import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { User, MapPin, Lock, ShoppingBag } from "lucide-react";

const ProfileSidebar = () => {
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);

  const isOrdersActive = location.pathname.startsWith("/my-account/orders");

  const menuItems = [
    {
      title: "Tài Khoản Của Tôi",
      items: [
        {
          icon: User,
          label: "Hồ Sơ",
          path: "/my-account/info",
          isActive: location.pathname === "/my-account/info",
        },
        {
          icon: MapPin,
          label: "Địa Chỉ",
          path: "/my-account/address",
          isActive: location.pathname === "/my-account/address",
        },
        {
          icon: Lock,
          label: "Đổi Mật Khẩu",
          path: "/my-account/password",
          isActive: location.pathname === "/my-account/password",
        },
      ],
    },
    {
      title: "Đơn Mua",
      items: [
        {
          icon: ShoppingBag,
          label: "Đơn Hàng",
          path: "/my-account/orders",
          isActive: isOrdersActive,
        },
      ],
    },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-md p-6">
      {/* User Info */}
      <div className="flex items-center gap-4 pb-6 border-b">
        {user?.avatar ? (
          <img
            src={user.avatar}
            alt="User Avatar"
            className="w-16 h-16 rounded-full object-cover"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-2xl font-bold">
            {user?.name?.charAt(0).toUpperCase() || "U"}
          </div>
        )}
        <div>
          <p className="font-bold text-gray-800">{user?.name || "User"}</p>
          <p className="text-sm text-gray-500">{user?.email}</p>
        </div>
      </div>

      {/* Menu */}
      <div className="mt-6 space-y-6">
        {menuItems.map((section, idx) => (
          <div key={idx}>
            <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">
              {section.title}
            </h3>
            <div className="space-y-1">
              {section.items.map((item, index) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={index}
                    to={item.path}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition cursor-pointer ${
                      item.isActive
                        ? "bg-green-50 text-green-600 font-semibold"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                    {item.isActive && (
                      <div className="ml-auto w-1 h-6 bg-green-600 rounded-full"></div>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProfileSidebar;
