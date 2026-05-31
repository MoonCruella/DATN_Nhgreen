(function () {
  // placeholder to ensure patch context when file was empty
})();

import React, { useState } from "react";
import logo from "../../assets/logo.png";
import { assets } from "../../assets/assets";

const Footer = () => {
  const [email, setEmail] = useState("");

  const handleSubscribe = (e) => {
    e.preventDefault();
    // TODO: wire to newsletter API
    setEmail("");
    alert("Subscribed (demo)");
  };

  return (
    <footer
      className="relative text-white"
      style={{
        backgroundImage: `url(${assets.background})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* dark overlay */}
      <div className="absolute inset-0 bg-green-800/90" aria-hidden="true" />

      <div className="relative max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <img src={logo} alt="Organze" className="h-16" />
            <p className="text-gray-100 max-w-sm">
              Chúng tôi cam kết mang đến cho bạn những sản phẩm tươi ngon nhất
              và an toàn nhất.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Truy cập nhanh</h3>
            <ul className="space-y-2 text-gray-100">
              <li>Giới thiệu</li>
              <li>Dịch vụ</li>
              <li>Đánh giá của khách hàng</li>
              <li>Liên hệ</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Liên hệ</h3>
            <div className="text-gray-100 space-y-2">
              <div>01 Võ Văn Ngân, Thủ Đức, TP.HCM</div>
              <div>nhunguyetpy206@gmail.com</div>
              <div>pnhpy2306@gmail.com</div>
              <div>(+84) 39 279 6201</div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Giờ làm việc</h3>
            <ul className="space-y-2 text-gray-100">
              <li>Thứ Hai - Chủ Nhật: 6:00 - 20:00</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="relative max-w-7xl mx-auto px-6 py-4 text-center text-sm text-gray-100">
          © {new Date().getFullYear()} All rights reserved.
        </div>
      </div>

      {/* back to top */}
      <button
        aria-label="Back to top"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="fixed bottom-6 right-6 z-50 h-10 w-10 rounded-full bg-green-500 text-white flex items-center justify-center shadow-lg cursor-pointer hover:bg-green-600 transition"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 15l7-7 7 7"
          />
        </svg>
      </button>
    </footer>
  );
};

export default Footer;
