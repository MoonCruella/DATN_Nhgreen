import React, { useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, EffectFade } from "swiper/modules";
import "swiper/css";
import "swiper/css/effect-fade";

import { assets } from "@/assets/assets";
import { Link } from "react-router-dom";

const MainBanner = () => {
  const banners = [
    {
      img: assets.main_banner1,
      title: "Ăn lành – sống xanh",
      subtitle:
        "Cùng bạn xây dựng thói quen ăn uống lành mạnh từ những lựa chọn nhỏ nhất.",
    },
    {
      img: assets.main_banner2,
      title: "Bữa nhỏ, lợi lớn – cho cuộc sống khỏe và vui",
      subtitle:
        "Healthy không chỉ là xu hướng, mà là cách bạn yêu thương chính mình.",
    },
  ];

  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <div className="relative">
      <Swiper
        modules={[Autoplay, EffectFade]}
        effect="fade"
        autoplay={{ delay: 8000, disableOnInteraction: false }}
        loop={true}
        className="w-full h-[50vh] sm:h-[60vh] md:h-[70vh] lg:h-[75vh]"
        onSlideChange={(swiper) => setActiveIndex(swiper.realIndex)}
        onSwiper={(swiper) => setActiveIndex(swiper.realIndex)}
      >
        {banners.map((banner, index) => {
          const isActive = index === activeIndex;
          return (
            <SwiperSlide key={index}>
              <div className="relative w-full h-[50vh] sm:h-[60vh] md:h-[70vh] lg:h-[75vh]">
                {/* Ảnh */}
                <img
                  src={banner.img}
                  alt={`banner-${index}`}
                  className="w-full h-full object-cover"
                />

                {/* Lớp overlay */}
                <div className="absolute inset-0 bg-black/20"></div>

                {/* Nội dung trên ảnh */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 sm:px-6">
                  <h1
                    className={`text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-extrabold text-white leading-tight max-w-3xl ${
                      isActive
                        ? "opacity-0 slide-up slide-up-del-1"
                        : "opacity-0"
                    }`}
                  >
                    {banner.title}
                  </h1>
                  <p
                    className={`text-sm sm:text-base md:text-lg font-medium text-white mt-3 sm:mt-4 max-w-2xl px-4 ${
                      isActive
                        ? "opacity-0 slide-up slide-up-del-2"
                        : "opacity-0"
                    }`}
                  >
                    {banner.subtitle}
                  </p>

                  <div className="flex flex-col md:flex-row gap-3 sm:gap-4 mt-6 sm:mt-8">
                    <Link
                      to={"/products"}
                      className={`flex items-center justify-center gap-2 px-6 sm:px-8 py-2.5 sm:py-3 btn-primary transition rounded text-white font-medium min-w-[160px] sm:min-w-[200px] text-sm sm:text-base ${
                        isActive
                          ? "opacity-0 slide-up slide-up-del-3"
                          : "opacity-0"
                      }`}
                    >
                      Xem sản phẩm →
                    </Link>
                  </div>
                </div>
              </div>
            </SwiperSlide>
          );
        })}
      </Swiper>
    </div>
  );
};

export default MainBanner;
