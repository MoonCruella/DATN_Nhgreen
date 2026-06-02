import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Printer } from "lucide-react";
import { dashboardApi } from "@/api/dashboardApi";
import { toast } from "react-toastify";
import TopSellingDishes from "@/components/manager-view/TopSellingDishes";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";

const ManagerDashboard = () => {
  const accessToken = useSelector((state) => state.auth.accessToken);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [dateRange, setDateRange] = useState("day");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  // Helper function to convert to Vietnam timezone (UTC+7)
  const toVietnamTime = (date = new Date()) => {
    const utcDate = new Date(date);
    const vietnamOffset = 7 * 60; // UTC+7 in minutes
    const localOffset = utcDate.getTimezoneOffset(); // Local offset in minutes
    const offsetDiff = vietnamOffset + localOffset;
    return new Date(utcDate.getTime() + offsetDiff * 60 * 1000);
  };

  const getVietnamDateStart = (date = new Date()) => {
    const vnDate = toVietnamTime(date);
    vnDate.setHours(0, 0, 0, 0);
    return vnDate;
  };

  const getVietnamDateEnd = (date = new Date()) => {
    const vnDate = toVietnamTime(date);
    vnDate.setHours(23, 59, 59, 999);
    return vnDate;
  };

  // Calculate date range based on selection (Vietnam timezone)
  const getDateRange = () => {
    const vnNow = toVietnamTime();
    let startDate, endDate;

    switch (dateRange) {
      case "day":
        // 7 ngày gần nhất (bao gồm hôm nay)
        startDate = getVietnamDateStart(vnNow);
        startDate.setDate(startDate.getDate() - 6);
        endDate = getVietnamDateEnd(vnNow);
        break;
      case "week":
        // 4 tuần gần nhất
        startDate = getVietnamDateStart(vnNow);
        startDate.setDate(startDate.getDate() - 27); // 4 weeks = 28 days - 1
        endDate = getVietnamDateEnd(vnNow);
        break;
      case "month":
        // 3 tháng gần nhất
        startDate = new Date(
          vnNow.getFullYear(),
          vnNow.getMonth() - 2,
          vnNow.getDate()
        );
        startDate.setHours(0, 0, 0, 0);
        endDate = getVietnamDateEnd(vnNow);
        break;
      case "custom":
        if (customStartDate && customEndDate) {
          startDate = new Date(customStartDate);
          endDate = new Date(customEndDate);
          endDate.setHours(23, 59, 59, 999);
        } else {
          startDate = getVietnamDateStart(vnNow);
          startDate.setDate(startDate.getDate() - 7);
          endDate = getVietnamDateEnd(vnNow);
        }
        break;
      default:
        startDate = getVietnamDateStart(vnNow);
        startDate.setDate(startDate.getDate() - 6);
        endDate = getVietnamDateEnd(vnNow);
    }

    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };
  };

  // Fetch dashboard data
  const fetchDashboard = async (isInitial = false) => {
    try {
      if (isInitial) {
        setLoading(true);
      } else {
        setChartLoading(true);
      }
      const { startDate, endDate } = getDateRange();
      const res = await dashboardApi.getManagerDashboard(accessToken, {
        startDate,
        endDate,
      });

      if (res.success) {
        setDashboardData(res.data);
      }
    } catch (error) {
      console.error("Error fetching dashboard:", error);
      toast.error("Lỗi tải dữ liệu dashboard");
    } finally {
      if (isInitial) {
        setLoading(false);
      } else {
        setChartLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchDashboard(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (dashboardData !== null) {
      fetchDashboard(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, customStartDate, customEndDate]);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("vi-VN").format(amount) + " ₫";
  };

  // Format date for chart
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  };

  // Handle print report
  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-area, .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print-header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #333;
          }
          .print-title {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
          }
          .print-subtitle {
            font-size: 14px;
            color: #666;
            margin: 5px 0;
          }
          .revenue-cards-print {
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 1rem !important;
            margin-bottom: 1.5rem !important;
          }
          @page {
            size: A4 landscape;
            margin: 1.5cm;
          }
        }
      `}</style>

      {/* Print Area */}
      <div className="print-area">
        {/* Print Header */}
        <div className="hidden print:block print-header">
          <div className="print-title">NHGREEN FOOD</div>
          <div className="print-title" style={{fontSize: '20px', marginTop: '5px'}}>BÁO CÁO DOANH THU VÀ BÁN HÀNG</div>
          <div className="print-subtitle">
            Kỳ báo cáo: {formatDate(dashboardData?.date_range?.start)} - {formatDate(dashboardData?.date_range?.end)}
          </div>
          <div className="print-subtitle">
            Ngày in: {new Date().toLocaleDateString("vi-VN")} {new Date().toLocaleTimeString("vi-VN")}
          </div>
        </div>

        {/* Revenue Cards for Print */}
        <div className="hidden print:block revenue-cards-print">
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">DOANH THU HÔM NAY</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-800">
                {formatCurrency(dashboardData?.revenue?.today || 0)}
              </div>
              <p className={`text-xs mt-1 ${dashboardData?.revenue?.today_change >= 0 ? "text-green-600" : "text-red-600"}`}>
                {dashboardData?.revenue?.today_change >= 0 ? "+" : ""}
                {dashboardData?.revenue?.today_change || 0}% so với hôm qua
              </p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">DOANH THU TUẦN NÀY</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-800">
                {formatCurrency(dashboardData?.revenue?.week || 0)}
              </div>
              <p className={`text-xs mt-1 ${dashboardData?.revenue?.week_change >= 0 ? "text-green-600" : "text-red-600"}`}>
                {dashboardData?.revenue?.week_change >= 0 ? "+" : ""}
                {dashboardData?.revenue?.week_change || 0}% so với tuần trước
              </p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">DOANH THU THÁNG NÀY</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-800">
                {formatCurrency(dashboardData?.revenue?.month || 0)}
              </div>
              <p className={`text-xs mt-1 ${dashboardData?.revenue?.month_change >= 0 ? "text-green-600" : "text-red-600"}`}>
                {dashboardData?.revenue?.month_change >= 0 ? "+" : ""}
                {dashboardData?.revenue?.month_change || 0}% so với tháng trước
              </p>
            </CardContent>
          </Card>
        </div>

      {/* Print Button */}
      <div className="flex justify-end mb-4 print:hidden">
        <Button
          onClick={handlePrint}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Printer className="w-4 h-4" />
          In báo cáo
        </Button>
      </div>

      {/* Revenue Cards - Screen only */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:hidden">
        {/* Today Revenue */}
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              HÔM NAY
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-800">
              {formatCurrency(dashboardData?.revenue?.today || 0)}
            </div>
            <p
              className={`text-xs mt-1 ${
                dashboardData?.revenue?.today_change >= 0
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {dashboardData?.revenue?.today_change >= 0 ? "+" : ""}
              {dashboardData?.revenue?.today_change || 0}% so với hôm qua
            </p>
          </CardContent>
        </Card>

        {/* Week Revenue */}
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              TUẦN NÀY
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-800">
              {formatCurrency(dashboardData?.revenue?.week || 0)}
            </div>
            <p
              className={`text-xs mt-1 ${
                dashboardData?.revenue?.week_change >= 0
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {dashboardData?.revenue?.week_change >= 0 ? "+" : ""}
              {dashboardData?.revenue?.week_change || 0}% so với tuần trước
            </p>
          </CardContent>
        </Card>

        {/* Month Revenue */}
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              THÁNG NÀY
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-800">
              {formatCurrency(dashboardData?.revenue?.month || 0)}
            </div>
            <p
              className={`text-xs mt-1 ${
                dashboardData?.revenue?.month_change >= 0
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {dashboardData?.revenue?.month_change >= 0 ? "+" : ""}
              {dashboardData?.revenue?.month_change || 0}% so với tháng trước
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Date Filter */}
      <div className="flex items-center justify-end gap-2 mt-8 mb-6 print:hidden">
        <Button
          size="sm"
          variant={dateRange === "day" ? "default" : "outline"}
          onClick={() => setDateRange("day")}
          className={dateRange === "day" ? "bg-green-600 hover:bg-green-700" : ""}
        >
          Ngày
        </Button>
        <Button
          size="sm"
          variant={dateRange === "week" ? "default" : "outline"}
          onClick={() => setDateRange("week")}
          className={
            dateRange === "week" ? "bg-green-600 hover:bg-green-700" : ""
          }
        >
          Tuần
        </Button>
        <Button
          size="sm"
          variant={dateRange === "month" ? "default" : "outline"}
          onClick={() => setDateRange("month")}
          className={
            dateRange === "month" ? "bg-green-600 hover:bg-green-700" : ""
          }
        >
          Tháng
        </Button>

        {/* Custom Date Range */}
        <div className="flex items-center gap-2 border-l pl-2">
          <input
            type="date"
            value={customStartDate}
            onChange={(e) => {
              setCustomStartDate(e.target.value);
              setDateRange("custom");
            }}
            className="px-3 py-1 text-sm border rounded"
          />
          <span>-</span>
          <input
            type="date"
            value={customEndDate}
            onChange={(e) => {
              setCustomEndDate(e.target.value);
              setDateRange("custom");
            }}
            disabled={!customStartDate}
            className="px-3 py-1 text-sm border rounded cursor-pointer disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setCustomStartDate("");
              setCustomEndDate("");
              setDateRange("day");
            }}
            className="bg-green-600 text-white hover:bg-green-700"
          >
            Reset
          </Button>
        </div>
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Doanh thu</span>
            <div className="flex items-center gap-2 text-sm font-normal text-gray-500">
              <Calendar className="w-4 h-4" />
              <span>
                {formatDate(dashboardData?.date_range?.start)} -{" "}
                {formatDate(dashboardData?.date_range?.end)}
              </span>
            </div>
          </CardTitle>
          <div className="text-sm text-gray-500">
            Tổng: {formatCurrency(dashboardData?.revenue?.total || 0)}
          </div>
        </CardHeader>
        <CardContent>
          {chartLoading ? (
            <div className="flex items-center justify-center h-[300px]">
              <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={dashboardData?.chart?.daily_revenue || []}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis
                  tickFormatter={(value) =>
                    new Intl.NumberFormat("vi-VN", {
                      notation: "compact",
                      compactDisplay: "short",
                    }).format(value)
                  }
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  formatter={(value) => formatCurrency(value)}
                  labelFormatter={(label) => label}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Top Selling Dishes */}
      <TopSellingDishes />
      </div>
    </div>
  );
};

export default ManagerDashboard;


