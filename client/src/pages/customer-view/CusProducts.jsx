import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { assets } from "@/assets/assets";
import productService from "../../api/dishApi.js";
import categoryService from "../../api/categoryApi.js";
import ingredientApi from "../../api/ingredientApi.js";
import ProductCard from "@/components/customer-view/dish/DishMainCard.jsx";
import { useDebounce } from "../../hooks/useDebounce.jsx";
import { FaSearch, FaTimes } from "react-icons/fa";

const CustomerProducts = () => {
  const location = useLocation();

  // ưu tiên location.state, fallback query param ?category=
  const initialCategory =
    location.state?.categoryId ??
    new URLSearchParams(location.search).get("category") ??
    null;

  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [products, setProducts] = useState([]);
  const [displayProducts, setDisplayProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [selectedIngredientIds, setSelectedIngredientIds] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sortOption, setSortOption] = useState("default");
  const [minKcal, setMinKcal] = useState("");
  const [maxKcal, setMaxKcal] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const productsPerPage = 9;

  const debouncedSearch = useDebounce(searchInput, 500);
  const debouncedMinKcal = useDebounce(minKcal, 500);
  const debouncedMaxKcal = useDebounce(maxKcal, 500);

  // khi location thay đổi (navigate từ Home) cập nhật lại activeCategory
  useEffect(() => {
    const cat =
      location.state?.categoryId ??
      new URLSearchParams(location.search).get("category") ??
      null;
    setActiveCategory(cat);
  }, [location.key, location.state, location.search]);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categoryRes = await categoryService.getAll();
        console.log("Categories response:", categoryRes);

        if (categoryRes.success) {
          // Check if data is array or nested object
          const categoriesData = Array.isArray(categoryRes.data)
            ? categoryRes.data
            : categoryRes.data?.categories || [];

          setCategories(categoriesData);
        }
      } catch (err) {
        console.error("Error fetching categories:", err);
        setCategories([]);
      }
    };

    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchIngredients = async () => {
      try {
        const ingredientRes = await ingredientApi.getAll(null, {
          status: "available",
          limit: 100,
          sortBy: "name",
          sortOrder: "asc",
        });

        if (ingredientRes.success) {
          const ingredientData = Array.isArray(ingredientRes.data)
            ? ingredientRes.data
            : [];
          setIngredients(ingredientData);
        }
      } catch (err) {
        console.error("Error fetching ingredients:", err);
        setIngredients([]);
      }
    };

    fetchIngredients();
  }, []);

  // Fetch products từ Backend với search, filter, sort
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);

        const params = {
          page: currentPage,
          limit: productsPerPage,
          status: "active",
        };

        if (activeCategory) {
          params.category = activeCategory;
        }

        if (debouncedSearch.trim() !== "") {
          params.search = debouncedSearch.trim();
        }

        if (debouncedMinKcal !== "") {
          params.minKcal = debouncedMinKcal;
        }

        if (debouncedMaxKcal !== "") {
          params.maxKcal = debouncedMaxKcal;
        }

        if (selectedIngredientIds.length > 0) {
          params.ingredientIds = selectedIngredientIds.join(",");
        }

        if (sortOption === "lowToHigh") {
          params.sort = "price_asc";
        } else if (sortOption === "highToLow") {
          params.sort = "price_desc";
        }

        console.log(" Fetching products with params:", params);

        const response = await productService.getAll(params);

        if (response.success) {
          const productList = response.data?.dishes || [];

          const formatted = productList.map((p) => ({
            ...p,
            primary_image:
              p.imageUrls[p.defaultImageIndex] || assets.placeholderImage,
          }));

          setProducts(formatted);
          setDisplayProducts(formatted);

          const pagination = response.data?.pagination || {};
          setTotalPages(pagination.total_pages || 1);
          setTotalProducts(pagination.total_items || 0);
        }
      } catch (err) {
        console.error("Error fetching products:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [
    activeCategory,
    debouncedSearch,
    sortOption,
    debouncedMinKcal,
    debouncedMaxKcal,
    selectedIngredientIds,
    currentPage,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory, debouncedSearch, sortOption, debouncedMinKcal, debouncedMaxKcal, selectedIngredientIds]);

  const showingFrom =
    totalProducts > 0 ? (currentPage - 1) * productsPerPage + 1 : 0;
  const showingTo = Math.min(currentPage * productsPerPage, totalProducts);
  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  const toggleIngredientFilter = (ingredientId) => {
    setSelectedIngredientIds((prev) =>
      prev.includes(ingredientId)
        ? prev.filter((id) => id !== ingredientId)
        : [...prev, ingredientId]
    );
  };

  const hasKcalFilter = Boolean(minKcal || maxKcal);
  const hasActiveFilters = Boolean(
    activeCategory ||
      searchInput ||
      sortOption !== "default" ||
      hasKcalFilter ||
      selectedIngredientIds.length > 0
  );

  const clearAllFilters = () => {
    setActiveCategory(null);
    setSearchInput("");
    setSortOption("default");
    setMinKcal("");
    setMaxKcal("");
    setSelectedIngredientIds([]);
  };
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentPage]);

  // không trả về toàn bộ trang khi loading, sẽ hiển thị skeleton cho phần card bên dưới
  return (
    <div className="w-full h-auto">
      {/* Content */}
      <div className="min-h-screen bg-[#fbfbf7] p-4 md:p-24">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar */}
          <div className="w-full md:w-84 flex flex-col gap-6 mb-6 md:mb-0 min-w-0">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-emerald-600">
                    Bộ lọc
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-slate-950">
                    Tìm món phù hợp
                  </h2>
                </div>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 cursor-pointer"
                  >
                    Xóa tất cả
                  </button>
                )}
              </div>

              <label className="mb-2 block text-sm font-semibold text-slate-800">
                Tìm kiếm món ăn
              </label>
              <div className="relative">
                <FaSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400" />
                <input
                  type="search"
                  placeholder="Nhập tên món ăn..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-12 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:shadow-[0_0_0_4px_rgba(16,185,129,0.12)]"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => setSearchInput("")}
                    className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm transition hover:bg-slate-100 hover:text-slate-800 cursor-pointer"
                    aria-label="Xóa tìm kiếm"
                  >
                    <FaTimes className="text-xs" />
                  </button>
                )}
              </div>
              {searchInput !== debouncedSearch && (
                <p className="mt-2 flex items-center gap-2 text-xs font-medium text-slate-500">
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                  Đang tìm kiếm...
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-base font-bold text-slate-950">
                  Danh mục
                </h2>
                {activeCategory && (
                  <button
                    type="button"
                    onClick={() => setActiveCategory(null)}
                    className="rounded-full px-3 py-1.5 text-sm font-bold text-emerald-700 transition hover:bg-emerald-50 hover:text-emerald-800 cursor-pointer"
                  >
                    Xóa
                  </button>
                )}
              </div>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setActiveCategory(null)}
                  className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition cursor-pointer ${
                    activeCategory === null
                      ? "border-emerald-500 bg-emerald-50 text-emerald-800 shadow-sm"
                      : "border-slate-200 bg-slate-50 text-slate-700 hover:border-emerald-200 hover:bg-emerald-50/70"
                  }`}
                >
                  <span>Tất cả món ăn</span>
                  <span className="text-xs">{activeCategory === null ? "Đang chọn" : "Chọn"}</span>
                </button>

                {Array.isArray(categories) && categories.length > 0 ? (
                  categories.map((cat) => {
                    const active = activeCategory === cat._id;
                    return (
                      <button
                        key={cat._id}
                        type="button"
                        onClick={() => setActiveCategory(cat._id)}
                        className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition cursor-pointer ${
                          active
                            ? "border-emerald-500 bg-emerald-50 text-emerald-800 shadow-sm"
                            : "border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50/70"
                        }`}
                      >
                        <span className="min-w-0 truncate">{cat.name}</span>
                        <span className="shrink-0 text-xs">{active ? "Đang chọn" : "Chọn"}</span>
                      </button>
                    );
                  })
                ) : (
                  <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-500">
                    Đang tải danh mục...
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-base font-bold text-slate-950">
                Sắp xếp theo giá
              </h2>
              <select
                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100 cursor-pointer"
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
              >
                <option value="default">Mặc định</option>
                <option value="lowToHigh">Giá từ thấp lên cao</option>
                <option value="highToLow">Giá từ cao xuống thấp</option>
              </select>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-base font-bold text-slate-950">
                  Hàm lượng kcal
                </h2>
                {hasKcalFilter && (
                  <button
                    type="button"
                    onClick={() => {
                      setMinKcal("");
                      setMaxKcal("");
                    }}
                    className="rounded-full px-3 py-1.5 text-sm font-bold text-emerald-700 transition hover:bg-emerald-50 hover:text-emerald-800 cursor-pointer"
                  >
                    Xóa
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Từ kcal
                  <input
                    type="number"
                    min="0"
                    value={minKcal}
                    onChange={(e) => setMinKcal(e.target.value)}
                    className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                    placeholder="300"
                  />
                </label>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Đến kcal
                  <input
                    type="number"
                    min="0"
                    value={maxKcal}
                    onChange={(e) => setMaxKcal(e.target.value)}
                    className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                    placeholder="600"
                  />
                </label>
              </div>
              <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                Kcal được tính từ nguyên liệu của từng món.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-base font-bold text-slate-950">
                  Nguyên liệu
                </h2>
                {selectedIngredientIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedIngredientIds([])}
                    className="rounded-full px-3 py-1.5 text-sm font-bold text-emerald-700 transition hover:bg-emerald-50 hover:text-emerald-800 cursor-pointer"
                  >
                    Xóa
                  </button>
                )}
              </div>

              {ingredients.length > 0 ? (
                <div className="flex max-h-56 flex-wrap gap-2 overflow-y-auto pr-1">
                  {ingredients.map((ingredient) => {
                    const active = selectedIngredientIds.includes(
                      ingredient._id
                    );
                    return (
                      <button
                        key={ingredient._id}
                        type="button"
                        onClick={() => toggleIngredientFilter(ingredient._id)}
                        className={`rounded-full border px-3 py-2 text-xs font-bold transition cursor-pointer ${
                          active
                            ? "border-emerald-600 bg-emerald-600 text-white shadow-sm shadow-emerald-200"
                            : "border-slate-200 bg-slate-50 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
                        }`}
                      >
                        {ingredient.name}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-500">
                  Chưa có nguyên liệu để lọc.
                </p>
              )}
            </div>          </div>

          {/* Product Section */}
          <div className="flex-1 min-w-0">
            <div className="mb-4 flex items-center px-5">
              <span className="bg-primary text-white px-4 py-2 rounded-lg">
                Hiển thị {showingFrom}-{showingTo} of {totalProducts} kết quả
              </span>
            </div>

            {loading ? (
              // skeleton chỉ cho vùng card khi lần đầu load
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-0 md:px-8">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div
                    key={i}
                    className="p-5 bg-white rounded-xl shadow-md overflow-hidden min-h-[220px] relative animate-pulse"
                    style={{ animationDelay: `${i * 80}ms` }}
                  >
                    <div className="w-full h-40 bg-gray-200 rounded mb-4" />
                    <div className="w-3/4 h-4 bg-gray-200 rounded mb-2" />
                    <div className="w-1/2 h-4 bg-gray-200 rounded" />
                  </div>
                ))}
              </div>
            ) : displayProducts.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <svg
                    className="w-16 h-16 mx-auto"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                    />
                  </svg>
                </div>
                <p className="text-gray-600">No products found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 w-full box-border">
                {displayProducts.map((product) => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex justify-center mt-6 space-x-2">
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => paginate(i + 1)}
                    className={`px-4 py-2 rounded-lg transition ${
                      currentPage === i + 1
                        ? "bg-green-700 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300 cursor-pointer"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerProducts;
