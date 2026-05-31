import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import categoryApi from "@/api/categoryApi";
import { assets } from "@/assets/assets";

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const scrollerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await categoryApi.getAll({ page: 1, limit: 100 });
        // API returns { success, data, pagination } or an array depending on backend
        const data = res?.data ?? res?.categories ?? res ?? [];
        if (mounted) setCategories(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load categories", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => (mounted = false);
  }, []);

  const scrollBy = (dir = "right") => {
    const el = scrollerRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.7;
    el.scrollBy({
      left: dir === "right" ? amount : -amount,
      behavior: "smooth",
    });
  };

  return (
    <section className="py-8 sm:py-12 md:py-16 bg-[linear-gradient(180deg,#f4fdf0,transparent)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-black">
            Menu của chúng tôi
          </h2>
          <p className="text-xs sm:text-sm text-black mt-2 px-4">
            Các món ăn được phân loại rõ ràng giúp bạn dễ dàng lựa chọn hơn.
          </p>
        </div>

        <div>
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 md:p-8 lg:p-12">
            <div
              ref={scrollerRef}
              className="flex gap-4 sm:gap-6 md:gap-8 items-start justify-center flex-wrap py-4 sm:py-6 px-2"
            >
              {loading ? (
                <div className="w-full text-center py-12 sm:py-20">
                  Loading...
                </div>
              ) : (
                (categories.length ? categories : [])
                  .slice(0, 10)
                  .map((c, i) => {
                    return (
                      <div
                        key={c._id || c.id || c.name}
                        className="flex-shrink-0 w-28 sm:w-32 md:w-36 lg:w-40 text-center"
                      >
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() =>
                            navigate("/products", {
                              state: { categoryId: c._id },
                            })
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              navigate("/products", {
                                state: { categoryId: c._id },
                              });
                            }
                          }}
                          className="group mx-auto w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 rounded-lg border border-transparent hover:border-gray-100 flex flex-col items-center justify-center p-2 transition duration-200 ease-out transform hover:-translate-y-2 hover:shadow-lg cursor-pointer"
                        >
                          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden relative flex items-center justify-center bg-white">
                            <div
                              className="absolute inset-0"
                              style={{
                                backgroundImage: `url(${assets.green_bg})`,
                                backgroundSize: "contain",
                                backgroundPosition: "center",
                                backgroundRepeat: "no-repeat",
                              }}
                            />
                            <img
                              src={c.imageUrl || assets.logo}
                              alt={c.name}
                              className="w-10 h-10 sm:w-12 sm:h-12 object-contain relative z-10"
                            />
                          </div>
                          <div className="mt-1.5 sm:mt-2 text-center w-full px-1">
                            <div className="font-semibold text-xs sm:text-sm text-gray-800 truncate transition-colors duration-200 group-hover:text-[#34ad54] group-focus:text-[#34ad54]">
                              {c.name}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Categories;
