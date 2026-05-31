import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ProductDisplay from "../dish/DishDisplay";
import flashsaleApi from "@/api/flashsaleApi";
import { assets } from "@/assets/assets";

const pad = (n) => String(n).padStart(2, "0");

const getTimeDiff = (target) => {
  const now = new Date();
  const t = new Date(target) - now;
  if (isNaN(t)) return null;
  if (t <= 0) return { total: 0, hours: 0, minutes: 0, seconds: 0 };
  const total = Math.floor(t / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return { total, hours, minutes, seconds };
};

const CountdownBlocks = ({ hours, minutes, seconds }) => (
  <div className="flex items-center gap-1 sm:gap-2">
    <div className="bg-black text-white px-2 sm:px-3 py-1 rounded-sm text-sm sm:text-lg font-bold">
      {pad(hours)}
    </div>
    <div className="text-base sm:text-xl font-bold">:</div>
    <div className="bg-black text-white px-2 sm:px-3 py-1 rounded-sm text-sm sm:text-lg font-bold">
      {pad(minutes)}
    </div>
    <div className="text-base sm:text-xl font-bold">:</div>
    <div className="bg-black text-white px-2 sm:px-3 py-1 rounded-sm text-sm sm:text-lg font-bold">
      {pad(seconds)}
    </div>
  </div>
);

const FlashSale = () => {
  const [flashSale, setFlashSale] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [statusLabel, setStatusLabel] = useState("");
  const [loading, setLoading] = useState(true);
  const [noProgram, setNoProgram] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const res = await flashsaleApi.getNearest();
        if (mounted) {
          if (res && res.success && res.data) {
            setFlashSale(res.data);
            setNoProgram(false);
          } else {
            setFlashSale(null);
            setNoProgram(true);
          }
        }
      } catch (err) {
        console.warn("Failed to load nearest flash sale", err);
        if (mounted) {
          setFlashSale(null);
          setNoProgram(true);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!flashSale) {
      setCountdown(null);
      setStatusLabel("");
      return;
    }

    const update = () => {
      const now = new Date();
      const start = new Date(flashSale.startTime);
      const end = new Date(flashSale.endTime);
      if (now < start) {
        // upcoming -> countdown to start
        const td = getTimeDiff(start);
        setCountdown(td);
        setStatusLabel("Sắp diễn ra");
      } else if (now >= start && now <= end) {
        // active -> countdown to end
        const td = getTimeDiff(end);
        setCountdown(td);
        setStatusLabel("Đang diễn ra");
      } else {
        setCountdown(null);
        setStatusLabel("Đã kết thúc");
      }
    };

    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [flashSale]);

  return (
    <div className="mt-8 sm:mt-10 md:mt-12 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 sm:mb-8 gap-4 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6 w-full lg:w-auto">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-[#ff4d4f] tracking-wide">
            FLASH SALE
          </h2>
          {loading ? (
            <span className="text-xs sm:text-sm text-gray-500">
              Đang tải...
            </span>
          ) : noProgram ? (
            <span className="text-xs sm:text-sm text-gray-800 bg-gray-100 px-2 sm:px-3 py-1 rounded-full">
              Chưa có chương trình
            </span>
          ) : countdown ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
              <span className="text-sm sm:text-base font-semibold text-gray-600">
                {statusLabel}
              </span>
              <CountdownBlocks
                hours={countdown.hours}
                minutes={countdown.minutes}
                seconds={countdown.seconds}
              />
            </div>
          ) : (
            flashSale && (
              <span className="text-xs sm:text-sm text-gray-600">
                {statusLabel}
              </span>
            )
          )}
        </div>

        {!noProgram && (
          <Link
            to="/flashsale-products"
            className="inline-flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2 rounded-full border border-[#34ad54] text-[#34ad54] hover:bg-[#34ad54] hover:text-white transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#34ad54] text-sm sm:text-base"
            aria-label="Xem tất cả sản phẩm Flash Sale"
          >
            <span className="font-medium">Xem tất cả</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-3 h-3 sm:w-4 sm:h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        )}
      </div>

      {!loading && !noProgram && (
        <ProductDisplay type="discount" layout="slider" flashSale={flashSale} />
      )}

      {!loading && noProgram && (
        <div className="flex flex-col items-center justify-center py-8 sm:py-12 px-4">
          <div className="text-center">
            <img
              src={assets.gift}
              alt="No Flash Sale"
              className="w-12 h-12 sm:w-16 sm:h-16 mb-3 sm:mb-4 mx-auto"
            />
            <p className="text-lg sm:text-xl text-gray-600 mb-2">
              Hiện tại chưa có chương trình Flash Sale
            </p>
            <p className="text-xs sm:text-sm text-gray-500">
              Hãy quay lại sau để không bỏ lỡ các ưu đãi hấp dẫn!
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlashSale;
