import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { assets } from "@/assets/assets";
import productService from "../../api/dishApi.js";
import categoryService from "../../api/categoryApi.js";
import ProductCard from "@/components/customer-view/dish/DishMainCard.jsx";
import { useDebounce } from "../../hooks/useDebounce.jsx";

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
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sortOption, setSortOption] = useState("default");

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
  }, [activeCategory, debouncedSearch, sortOption, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory, debouncedSearch, sortOption]);

  const showingFrom =
    totalProducts > 0 ? (currentPage - 1) * productsPerPage + 1 : 0;
  const showingTo = Math.min(currentPage * productsPerPage, totalProducts);
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

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
            <div className="bg-yellow-50 p-4 rounded-xl">
              <div className="flex items-center border rounded-lg px-2 py-1 bg-white">
                <input
                  type="text"
                  placeholder="Keywords"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full bg-transparent focus:outline-none px-2"
                />
                {searchInput && (
                  <button
                    onClick={() => setSearchInput("")}
                    className="bg-yellow-400 p-2 rounded-lg cursor-pointer hover:bg-yellow-500 transition"
                  >
                    ❌
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
