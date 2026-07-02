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

        if (minKcal !== "") {
          params.minKcal = minKcal;
        }

        if (maxKcal !== "") {
          params.maxKcal = maxKcal;
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
    minKcal,
    maxKcal,
    selectedIngredientIds,
    currentPage,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory, debouncedSearch, sortOption, minKcal, maxKcal, selectedIngredientIds]);

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
            {/* Search Box */}
            <div className="rounded-xl border border-green-100 bg-white p-4 shadow-sm">
              <label className="mb-2 block text-sm font-semibold text-gray-800">
                Tìm kiếm món ăn
              </label>
              <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-2.5 transition focus-within:border-green-400 focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(34,197,94,0.14)]">
                <FaSearch className="shrink-0 text-sm text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm sản phẩm..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full bg-transparent text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => setSearchInput("")}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-gray-500 shadow-sm transition hover:bg-gray-100 hover:text-gray-800 cursor-pointer"
                    aria-label="Xóa tìm kiếm"
                  >
                    <FaTimes className="text-xs" />
                  </button>
                )}
              </div>
              {searchInput !== debouncedSearch && (
                <p className="text-xs text-gray-500 mt-2 flex items-center gap-2">
                  <span className="inline-block w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></span>
                  Đang tìm kiếm...
                </p>
              )}
            </div>

            {/* Categories */}
            <div className="bg-yellow-50 p-4 rounded-xl">
              <h2 className="font-semibold mb-3">Các danh mục</h2>
              <ul className="space-y-2">
                <li
                  onClick={() => setActiveCategory(null)}
                  className={`flex justify-between items-center py-2 border-b cursor-pointer hover:text-primary transition ${
                    activeCategory === null ? "text-primary font-bold" : ""
                  }`}
                >
                  Tất cả loại sản phẩm <span>↻</span>
                </li>

                {/* Check if categories is array before mapping */}
                {Array.isArray(categories) && categories.length > 0 ? (
                  categories.map((cat) => (
                    <li
                      key={cat._id}
                      onClick={() => setActiveCategory(cat._id)}
                      className={`flex justify-between items-center py-2 border-b cursor-pointer hover:text-green-600 transition ${
                        activeCategory === cat._id
                          ? "text-primary font-bold"
                          : ""
                      }`}
                    >
                      {cat.name} <span>→</span>
                    </li>
                  ))
                ) : (
                  <li className="text-gray-500 text-sm py-2">
                    Đang tải danh mục...
                  </li>
                )}
              </ul>
            </div>

            <div className="bg-yellow-50 p-4 rounded-xl">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h2 className="font-semibold">Lọc theo kcal</h2>
                {(minKcal || maxKcal) && (
                  <button
                    type="button"
                    onClick={() => {
                      setMinKcal("");
                      setMaxKcal("");
                    }}
                    className="text-xs font-medium text-green-700 hover:text-green-800 cursor-pointer"
                  >
                    Xóa lọc
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-medium text-gray-600">
                  Từ kcal
                  <input
                    type="number"
                    min="0"
                    value={minKcal}
                    onChange={(e) => setMinKcal(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-400"
                    placeholder="VD: 300"
                  />
                </label>
                <label className="text-xs font-medium text-gray-600">
                  Đến kcal
                  <input
                    type="number"
                    min="0"
                    value={maxKcal}
                    onChange={(e) => setMaxKcal(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-400"
                    placeholder="VD: 600"
                  />
                </label>
              </div>
              <p className="mt-2 text-xs italic text-gray-500">
                Kcal được tính từ nguyên liệu của từng món.
              </p>
            </div>

            <div className="bg-yellow-50 p-4 rounded-xl">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="font-semibold">Lọc theo nguyên liệu</h2>
                {selectedIngredientIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedIngredientIds([])}
                    className="text-xs font-medium text-green-700 hover:text-green-800 cursor-pointer"
                  >
                    Xóa lọc
                  </button>
                )}
              </div>

              {ingredients.length > 0 ? (
                <div className="flex max-h-52 flex-wrap gap-2 overflow-y-auto pr-1">
                  {ingredients.map((ingredient) => {
                    const active = selectedIngredientIds.includes(
                      ingredient._id
                    );
                    return (
                      <button
                        key={ingredient._id}
                        type="button"
                        onClick={() => toggleIngredientFilter(ingredient._id)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                          active
                            ? "border-green-600 bg-green-600 text-white shadow-sm"
                            : "border-green-200 bg-white text-gray-700 hover:border-green-400 hover:text-green-700"
                        }`}
                      >
                        {ingredient.name}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  Chưa có nguyên liệu để lọc.
                </p>
              )}
            </div>
          </div>

          {/* Product Section */}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-4 px-5">
              <span className="bg-primary text-white px-4 py-2 rounded-lg">
                Hiển thị {showingFrom}-{showingTo} of {totalProducts} kết quả
              </span>
              <select
                className="border rounded-lg px-3 py-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-green-400"
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
              >
                <option value="default">Mặc định</option>
                <option value="lowToHigh">Giá từ thấp lên cao</option>
                <option value="highToLow">Giá từ cao xuống thấp</option>
              </select>
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
