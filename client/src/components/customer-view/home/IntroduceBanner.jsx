import React from "react";
import { assets } from "@/assets/assets";
import { Link } from "react-router-dom";

const Feature = ({ children }) => (
  <div className="flex items-center gap-3">
    <div className="w-6 h-6 flex items-center justify-center bg-green-50 rounded-full">
      <img src={assets.starIcon} alt="icon" className="w-4 h-4" />
    </div>
    <div className="text-sx font-semibold text-gray-700">{children}</div>
  </div>
);

const IntroduceBanner = () => {
  return (
    <section className="bg-white mt-20">
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-6">
            <div className="max-w-xl">
              <img src={assets.leaf} alt="leaf" className="w-10 h-10 " />
              <h2 className="text-5xl md:text-5xl font-extrabold text-slate-800 leading-tight">
                Món ăn khoa học
                <br />
                cho cuộc sống khỏe mạnh!
              </h2>

              <p className="mt-6 text-gray-500">
                Chúng tôi cam kết cung cấp những món ăn không chỉ ngon miệng mà
                còn tốt cho sức khỏe, giúp bạn và gia đình tận hưởng cuộc sống
                tràn đầy năng lượng mỗi ngày.
              </p>

              <div className="mt-8 space-y-3 ">
                <Feature>Nguồn nguyên liệu sạch</Feature>
                <Feature>Nguồn gốc rõ ràng</Feature>
                <Feature>Tuân thủ các tiêu chuẩn dinh dưỡng</Feature>
                <Feature>Giao hàng nhanh chóng</Feature>
              </div>

              <div className="mt-8">
                <Link
                  to={"/products/tags?tag=balanced_meal"}
                  className="inline-flex items-center gap-2 px-6 py-2 btn-primary transition rounded text-white font-medium"
                >
                  Xem ngay
                </Link>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 flex justify-center lg:justify-end">
            <div className="w-full max-w-xl">
              <img
                src={assets.foodbanner}
                alt="vegetables"
                className="w-full h-auto object-contain"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default IntroduceBanner;
