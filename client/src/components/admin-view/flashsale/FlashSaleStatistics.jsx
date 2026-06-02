import React, { useEffect, useState } from "react";
import flashsaleApi from "@/api/flashsaleApi";
import { toast } from "sonner";
import { BarChart3, Package, CheckCircle2, Coins, Tag, RotateCcw } from "lucide-react";

const FlashSaleStatistics = ({ flashSaleId, flashSaleStatus }) => {
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      const res = await flashsaleApi.getStatistics(flashSaleId);
      if (res.success) {
        setStatistics(res.data);
      }
    } catch (error) {
      console.error("Error fetching statistics:", error);
      toast.error("Lỗi tải thống kê");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (flashSaleId) {
      fetchStatistics();
    }
  }, [flashSaleId]);

  // Auto-refresh every 30s if flash sale is active
  useEffect(() => {
    if (flashSaleStatus !== "active") return;

    const interval = setInterval(() => {
      fetchStatistics();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [flashSaleStatus, flashSaleId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchStatistics();
    setRefreshing(false);
    toast.success("Đã làm mới thống kê");
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-gray-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Đang tải thống kê...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!statistics) {
    return null;
  }

  const { summary, products } = statistics;

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-gray-700" />
          <h3 className="text-lg font-semibold text-gray-900">
            Thống kê chương trình
          </h3>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className={`flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg transition hover:bg-gray-200 cursor-pointer ${
            refreshing ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          <RotateCcw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          <span>{refreshing ? "Đang tải..." : "Làm mới"}</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {/* Total Products */}
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <p className="text-sm text-green-600 font-medium">Sản phẩm</p>
          </div>
          <p className="text-2xl font-bold text-green-900">
            {summary.totalProducts}
          </p>
          <p className="text-xs text-green-600 mt-1">Tổng sản phẩm</p>
        </div>

        {/* Total Sold */}
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
            <p className="text-sm text-green-600 font-medium">Đã bán</p>
          </div>
          <p className="text-2xl font-bold text-green-900">
            {summary.totalSold.toLocaleString("vi-VN")}
          </p>
          <p className="text-xs text-green-600 mt-1">
            {summary.salesRate}% / {summary.totalStock} sản phẩm
          </p>
        </div>

        {/* Remaining Stock */}
        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <p className="text-sm text-purple-600 font-medium">Còn lại</p>
          </div>
          <p className="text-2xl font-bold text-purple-900">
            {summary.remainingStock.toLocaleString("vi-VN")}
          </p>
          <p className="text-xs text-purple-600 mt-1">Số lượng tồn kho</p>
        </div>

        {/* Total Revenue */}
        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-yellow-600 rounded-lg flex items-center justify-center">
              <Coins className="w-5 h-5 text-white" />
            </div>
            <p className="text-sm text-yellow-600 font-medium">Doanh thu</p>
          </div>
          <p className="text-2xl font-bold text-yellow-900">
            {(summary.totalRevenue / 1000000).toFixed(1)}M
          </p>
          <p className="text-xs text-yellow-600 mt-1">
            {summary.totalRevenue.toLocaleString("vi-VN")}₫
          </p>
        </div>

        {/* Total Discount */}
        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
              <Tag className="w-5 h-5 text-white" />
            </div>
            <p className="text-sm text-red-600 font-medium">Giảm giá</p>
          </div>
          <p className="text-2xl font-bold text-red-900">
            {(summary.totalDiscount / 1000000).toFixed(1)}M
          </p>
          <p className="text-xs text-red-600 mt-1">
            TB {summary.averageDiscount}%
          </p>
        </div>
      </div>

      {/* Products Table */}
      <div>
        <h4 className="text-base font-semibold text-gray-900 mb-4">
          Chi tiết sản phẩm
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">
                  Sản phẩm
                </th>
                <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">
                  Giá gốc
                </th>
                <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">
                  Giá sale
                </th>
                <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">
                  Tồn kho
                </th>
                <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">
                  Đã bán
                </th>
                <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">
                  Còn lại
                </th>
                <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">
                  Tỷ lệ
                </th>
                <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">
                  Doanh thu
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {products.length === 0 ? (
                <tr>
                  <td
                    colSpan="8"
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    Chưa có sản phẩm
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr
                    key={product.dish_id}
                    className="hover:bg-gray-50 transition"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {product.dishImage && (
                          <img
                            src={product.dishImage}
                            alt={product.dishName}
                            className="w-12 h-12 object-cover rounded"
                          />
                        )}
                        <div>
                          <p className="font-medium text-gray-900">
                            {product.dishName}
                          </p>
                          <p className="text-xs text-gray-500">
                            -{product.discountPercent.toFixed(0)}%
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600 line-through">
                      {product.originalPrice.toLocaleString("vi-VN")}₫
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-semibold text-green-600">
                      {product.salePrice.toLocaleString("vi-VN")}₫
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-900">
                      {product.stock}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                        {product.sold}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-900">
                      {product.remaining}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-sm font-semibold text-green-600">
                          {product.salesRate.toFixed(1)}%
                        </span>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div
                            className="bg-green-600 h-1.5 rounded-full"
                            style={{ width: `${product.salesRate}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                      {product.revenue.toLocaleString("vi-VN")}₫
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Auto-refresh indicator */}
      {flashSaleStatus === "active" && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Tự động làm mới mỗi 30 giây (Flash Sale đang diễn ra)</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlashSaleStatistics;


