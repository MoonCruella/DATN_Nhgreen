import Order from "../models/order-model.js";
import User from "../models/user-model.js";
import Dish from "../models/dish-model.js";
import response from "../helpers/response.js";

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

// Get manager dashboard statistics
export const getManagerDashboard = async (req, res) => {
  try {
    const managerId = req.user.userId;
    const { startDate, endDate } = req.query;

    // Check if user selected custom date
    const isCustomDate = !!(startDate && endDate);

    // Get manager's branch
    const manager = await User.findById(managerId).select("branch_id");
    if (!manager?.branch_id) {
      return response.sendError(
        res,
        "Tài khoản manager chưa được gán chi nhánh",
        403
      );
    }

    const branchId = manager.branch_id;

    // Parse date range with Vietnam timezone
    const start = startDate ? new Date(startDate) : getVietnamDateStart();
    const end = endDate ? new Date(endDate) : getVietnamDateEnd();

    // Get all orders from 2 months ago to calculate today/week/month revenue and comparisons
    const vnNow = toVietnamTime();
    const twoMonthsAgoForFetch = new Date(
      vnNow.getFullYear(),
      vnNow.getMonth() - 2,
      1
    );
    twoMonthsAgoForFetch.setHours(0, 0, 0, 0);

    const allOrders = await Order.find({
      branch_id: branchId,
      created_at: { $gte: twoMonthsAgoForFetch, $lte: end },
    }).lean();

    // Get orders for the selected date range (for chart)
    const orders = allOrders.filter((o) => {
      const orderDate = new Date(o.created_at);
      return orderDate >= start && orderDate <= end;
    });

    // Calculate revenue statistics (exclude cancelled orders)
    const totalRevenue = orders
      .filter((o) => o.status !== "cancelled")
      .reduce((sum, o) => sum + (o.total_amount || 0), 0);

    // Get today's revenue (Vietnam timezone - 1 day)
    const today = getVietnamDateStart();
    const todayEnd = getVietnamDateEnd();
    const todayOrders = allOrders.filter((o) => {
      const orderDate = new Date(o.created_at);
      return (
        orderDate >= today && orderDate <= todayEnd && o.status !== "cancelled"
      );
    });
    const todayRevenue = todayOrders.reduce(
      (sum, o) => sum + (o.total_amount || 0),
      0
    );

    // Get this week's revenue (from Monday of this week to now)
    const mondayThisWeek = getVietnamDateStart(vnNow);
    const currentDay = vnNow.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1; // If Sunday, go back 6 days
    mondayThisWeek.setDate(mondayThisWeek.getDate() - daysFromMonday);

    const weekEnd = getVietnamDateEnd(vnNow);
    const weekOrders = allOrders.filter((o) => {
      const orderDate = new Date(o.created_at);
      return (
        orderDate >= mondayThisWeek &&
        orderDate <= weekEnd &&
        o.status !== "cancelled"
      );
    });
    const weekRevenue = weekOrders.reduce(
      (sum, o) => sum + (o.total_amount || 0),
      0
    );

    // Get this month's revenue (from 1st day of this month to now)
    const firstDayThisMonth = new Date(
      vnNow.getFullYear(),
      vnNow.getMonth(),
      1
    );
    firstDayThisMonth.setHours(0, 0, 0, 0);

    const monthEnd = getVietnamDateEnd(vnNow);
    const monthOrders = allOrders.filter((o) => {
      const orderDate = new Date(o.created_at);
      return (
        orderDate >= firstDayThisMonth &&
        orderDate <= monthEnd &&
        o.status !== "cancelled"
      );
    });
    const monthRevenue = monthOrders.reduce(
      (sum, o) => sum + (o.total_amount || 0),
      0
    );

    // Calculate percentage changes for chart period (comparing to previous period)
    const prevStart = new Date(start);
    prevStart.setDate(
      prevStart.getDate() - (end - start) / (1000 * 60 * 60 * 24)
    );
    const prevEnd = new Date(start);
    prevEnd.setMilliseconds(-1);

    const prevOrders = await Order.find({
      branch_id: branchId,
      created_at: { $gte: prevStart, $lte: prevEnd },
    }).lean();

    const prevRevenue = prevOrders
      .filter((o) => o.status !== "cancelled")
      .reduce((sum, o) => sum + (o.total_amount || 0), 0);

    const revenueChange =
      prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;

    // Calculate percentage changes for today (comparing to yesterday)
    const yesterday = getVietnamDateStart(vnNow);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayEnd = getVietnamDateEnd(yesterday);
    const yesterdayOrders = allOrders.filter((o) => {
      const orderDate = new Date(o.created_at);
      return (
        orderDate >= yesterday &&
        orderDate <= yesterdayEnd &&
        o.status !== "cancelled"
      );
    });
    const yesterdayRevenue = yesterdayOrders.reduce(
      (sum, o) => sum + (o.total_amount || 0),
      0
    );
    const todayChange =
      yesterdayRevenue > 0
        ? Math.round(
            ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 * 100
          ) / 100
        : todayRevenue > 0
        ? 100
        : 0;

    // Calculate percentage changes for week (comparing this week to last week)
    // Last week: from Monday of last week to Sunday of last week
    const mondayLastWeek = new Date(mondayThisWeek);
    mondayLastWeek.setDate(mondayLastWeek.getDate() - 7);
    const sundayLastWeek = new Date(mondayThisWeek);
    sundayLastWeek.setMilliseconds(-1); // End of last week (Sunday 23:59:59)

    const prevWeekOrders = allOrders.filter((o) => {
      const orderDate = new Date(o.created_at);
      return (
        orderDate >= mondayLastWeek &&
        orderDate <= sundayLastWeek &&
        o.status !== "cancelled"
      );
    });
    const prevWeekRevenue = prevWeekOrders.reduce(
      (sum, o) => sum + (o.total_amount || 0),
      0
    );
    const weekChange =
      prevWeekRevenue > 0
        ? Math.round(
            ((weekRevenue - prevWeekRevenue) / prevWeekRevenue) * 100 * 100
          ) / 100
        : weekRevenue > 0
        ? 100
        : 0;

    // Calculate percentage changes for month (comparing this month to last month)
    // Last month: from 1st day of last month to last day of last month
    const firstDayLastMonth = new Date(
      vnNow.getFullYear(),
      vnNow.getMonth() - 1,
      1
    );
    firstDayLastMonth.setHours(0, 0, 0, 0);
    const lastDayLastMonth = new Date(firstDayThisMonth);
    lastDayLastMonth.setMilliseconds(-1); // End of last month

    const prevMonthOrders = allOrders.filter((o) => {
      const orderDate = new Date(o.created_at);
      return (
        orderDate >= firstDayLastMonth &&
        orderDate <= lastDayLastMonth &&
        o.status !== "cancelled"
      );
    });
    const prevMonthRevenue = prevMonthOrders.reduce(
      (sum, o) => sum + (o.total_amount || 0),
      0
    );
    const monthChange =
      prevMonthRevenue > 0
        ? Math.round(
            ((monthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100 * 100
          ) / 100
        : monthRevenue > 0
        ? 100
        : 0;

    // Determine chart granularity based on date range
    const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    let chartData = [];

    // If user selected custom date, always show daily data
    if (isCustomDate || daysDiff <= 7) {
      // 7 days or less: Show daily data
      const currentDate = new Date(start);
      while (currentDate <= end) {
        const dayStart = new Date(currentDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(currentDate);
        dayEnd.setHours(23, 59, 59, 999);

        const dayOrders = orders.filter((o) => {
          const orderDate = new Date(o.created_at);
          return (
            orderDate >= dayStart &&
            orderDate <= dayEnd &&
            o.status !== "cancelled"
          );
        });

        const dayRevenue = dayOrders.reduce(
          (sum, o) => sum + (o.total_amount || 0),
          0
        );

        const vnDate = toVietnamTime(dayStart);
        chartData.push({
          date: `${vnDate.getDate()}/${vnDate.getMonth() + 1}`,
          revenue: dayRevenue,
        });

        currentDate.setDate(currentDate.getDate() + 1);
      }
    } else if (daysDiff <= 28) {
      // 8-28 days: Show weekly data (4 weeks with week number from start of year)
      const weeklyData = {};

      // Calculate week numbers for the date range and initialize with 0
      const currentDate = new Date(start);
      while (currentDate <= end) {
        const vnDate = toVietnamTime(currentDate);
        const yearStart = new Date(vnDate.getFullYear(), 0, 1);
        const daysSinceYearStart = Math.floor(
          (vnDate - yearStart) / (24 * 60 * 60 * 1000)
        );
        const weekNumber = Math.ceil(
          (daysSinceYearStart + yearStart.getDay() + 1) / 7
        );
        const weekKey = `Tuần ${weekNumber}`;

        if (weeklyData[weekKey] === undefined) {
          weeklyData[weekKey] = 0;
        }

        currentDate.setDate(currentDate.getDate() + 7);
      }

      // Add revenue data
      orders.forEach((o) => {
        if (o.status === "cancelled") return;

        const orderDate = new Date(o.created_at);
        const vnOrderDate = toVietnamTime(orderDate);

        // Calculate week number from start of year
        const yearStart = new Date(vnOrderDate.getFullYear(), 0, 1);
        const daysSinceYearStart = Math.floor(
          (vnOrderDate - yearStart) / (24 * 60 * 60 * 1000)
        );
        const weekNumber = Math.ceil(
          (daysSinceYearStart + yearStart.getDay() + 1) / 7
        );
        const weekKey = `Tuần ${weekNumber}`;

        if (weeklyData[weekKey] !== undefined) {
          weeklyData[weekKey] += o.total_amount || 0;
        }
      });

      // Convert to array and sort by week number
      chartData = Object.keys(weeklyData)
        .sort((a, b) => {
          const weekA = parseInt(a.replace("Tuần ", ""));
          const weekB = parseInt(b.replace("Tuần ", ""));
          return weekA - weekB;
        })
        .map((week) => ({
          date: week,
          revenue: weeklyData[week],
        }));
    } else {
      // More than 28 days: Show monthly data (3 months)
      const monthlyData = {};

      // Initialize all months in range with 0
      const currentMonth = new Date(start);
      while (currentMonth <= end) {
        const vnMonth = toVietnamTime(currentMonth);
        const monthKey = `${vnMonth.getMonth() + 1}/${vnMonth.getFullYear()}`;
        monthlyData[monthKey] = 0;
        currentMonth.setMonth(currentMonth.getMonth() + 1);
      }

      orders.forEach((o) => {
        if (o.status === "cancelled") return;

        const orderDate = new Date(o.created_at);
        const vnOrderDate = toVietnamTime(orderDate);
        const monthKey = `${
          vnOrderDate.getMonth() + 1
        }/${vnOrderDate.getFullYear()}`;

        if (monthlyData[monthKey] !== undefined) {
          monthlyData[monthKey] += o.total_amount || 0;
        }
      });

      // Convert to array and sort by date
      chartData = Object.keys(monthlyData)
        .sort((a, b) => {
          const [monthA, yearA] = a.split("/").map(Number);
          const [monthB, yearB] = b.split("/").map(Number);
          return yearA !== yearB ? yearA - yearB : monthA - monthB;
        })
        .map((month) => ({
          date: `Tháng ${month}`,
          revenue: monthlyData[month],
        }));
    }

    const data = {
      revenue: {
        today: todayRevenue,
        today_change: Math.round(todayChange * 100) / 100,
        week: weekRevenue,
        week_change: Math.round(weekChange * 100) / 100,
        month: monthRevenue,
        month_change: Math.round(monthChange * 100) / 100,
        total: totalRevenue,
        change_percent: Math.round(revenueChange * 100) / 100,
      },
      chart: {
        daily_revenue: chartData,
      },
      date_range: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
    };

    return response.sendSuccess(
      res,
      data,
      "Lấy thống kê dashboard thành công",
      200
    );
  } catch (error) {
    console.error("Get manager dashboard error:", error);
    return response.sendError(
      res,
      "Có lỗi xảy ra khi lấy thống kê dashboard",
      500,
      error.message
    );
  }
};

// Get top selling dishes with pagination and filters
export const getTopSellingDishes = async (req, res) => {
  try {
    const managerId = req.user.userId;
    const {
      page = 1,
      limit = 10,
      sortBy = "quantity", // quantity or revenue
      order = "desc", // desc or asc
      period = "today", // today, week, month
    } = req.query;

    // Get manager's branch
    const manager = await User.findById(managerId).select("branch_id");
    if (!manager?.branch_id) {
      return response.sendError(
        res,
        "Tài khoản manager chưa được gán chi nhánh",
        403
      );
    }

    const branchId = manager.branch_id;

    // Calculate date range based on period (Vietnam timezone)
    let startDate, endDate;
    const vnNow = toVietnamTime();

    switch (period) {
      case "today":
        startDate = getVietnamDateStart(vnNow);
        endDate = getVietnamDateEnd(vnNow);
        break;
      case "week":
        // 4 tuần gần nhất (28 ngày)
        startDate = getVietnamDateStart(vnNow);
        startDate.setDate(startDate.getDate() - 27);
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
      default:
        startDate = getVietnamDateStart(vnNow);
        endDate = getVietnamDateEnd(vnNow);
    }

    // Get orders for the branch in date range (exclude cancelled)
    const orders = await Order.find({
      branch_id: branchId,
      created_at: { $gte: startDate, $lte: endDate },
      status: { $ne: "cancelled" },
    }).lean();

    // Get all active dishes from system
    const allActiveDishes = await Dish.find({ status: "active" })
      .select("_id name imageUrls defaultImageIndex price category")
      .populate("category", "name")
      .lean();

    // Calculate dish statistics from orders
    const dishSales = {};
    orders.forEach((order) => {
      order.items?.forEach((item) => {
        const dishId = item.dish_id.toString();
        if (!dishSales[dishId]) {
          dishSales[dishId] = {
            dish_id: dishId,
            dish_name: item.dish_name || "Món ăn",
            dish_image: item.dish_image || "",
            total_quantity: 0,
            total_revenue: 0,
          };
        }
        dishSales[dishId].total_quantity += item.quantity || 0;
        dishSales[dishId].total_revenue += item.total || 0;
      });
    });

    // Merge all active dishes with sales data
    const dishesArray = allActiveDishes.map((dish) => {
      const dishId = dish._id.toString();
      const salesData = dishSales[dishId];

      return {
        dish_id: dishId,
        dish_name: dish.name,
        dish_image:
          dish.imageUrls?.[dish.defaultImageIndex || 0] ||
          dish.imageUrls?.[0] ||
          "",
        dish_price: dish.price || 0,
        category_name: dish.category?.name || "Chưa phân loại",
        category_id: dish.category?._id || null,
        total_quantity: salesData ? salesData.total_quantity : 0,
        total_revenue: salesData ? salesData.total_revenue : 0,
      };
    });

    // Sort based on sortBy parameter
    if (sortBy === "quantity") {
      dishesArray.sort((a, b) => {
        return order === "desc"
          ? b.total_quantity - a.total_quantity
          : a.total_quantity - b.total_quantity;
      });
    } else if (sortBy === "revenue") {
      dishesArray.sort((a, b) => {
        return order === "desc"
          ? b.total_revenue - a.total_revenue
          : a.total_revenue - b.total_revenue;
      });
    }

    // Pagination
    const total = dishesArray.length;
    const totalPages = Math.ceil(total / parseInt(limit));
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedDishes = dishesArray.slice(startIndex, endIndex);

    const data = {
      dishes: paginatedDishes,
      pagination: {
        current_page: parseInt(page),
        total_pages: totalPages,
        total_items: total,
        per_page: parseInt(limit),
        has_next: parseInt(page) < totalPages,
        has_prev: parseInt(page) > 1,
      },
      filters: {
        period,
        sortBy,
        order,
      },
      date_range: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
    };

    return response.sendSuccess(
      res,
      data,
      "Lấy danh sách sản phẩm bán chạy thành công",
      200
    );
  } catch (error) {
    console.error("Get top selling dishes error:", error);
    return response.sendError(
      res,
      "Có lỗi xảy ra khi lấy danh sách sản phẩm",
      500,
      error.message
    );
  }
};

// Get admin dashboard statistics (all branches)
export const getAdminDashboard = async (req, res) => {
  try {
    const { startDate, endDate, branchId } = req.query;

    // Check if user selected custom date
    const isCustomDate = !!(startDate && endDate);

    // Parse date range with Vietnam timezone
    const start = startDate ? new Date(startDate) : getVietnamDateStart();
    const end = endDate ? new Date(endDate) : getVietnamDateEnd();

    // Get all orders from 2 months ago to calculate today/week/month revenue and comparisons
    const vnNow = toVietnamTime();
    const twoMonthsAgoForFetch = new Date(
      vnNow.getFullYear(),
      vnNow.getMonth() - 2,
      1
    );
    twoMonthsAgoForFetch.setHours(0, 0, 0, 0);

    // Build query with optional branch filter
    const query = {
      created_at: { $gte: twoMonthsAgoForFetch, $lte: end },
    };
    if (branchId) {
      query.branch_id = branchId;
    }

    const allOrders = await Order.find(query).lean();

    // Get orders for the selected date range (for chart)
    const orders = allOrders.filter((o) => {
      const orderDate = new Date(o.created_at);
      return orderDate >= start && orderDate <= end;
    });

    // Calculate revenue statistics (exclude cancelled orders)
    const totalRevenue = orders
      .filter((o) => o.status !== "cancelled")
      .reduce((sum, o) => sum + (o.total_amount || 0), 0);

    // Get today's revenue (Vietnam timezone - 1 day)
    const today = getVietnamDateStart();
    const todayEnd = getVietnamDateEnd();
    const todayOrders = allOrders.filter((o) => {
      const orderDate = new Date(o.created_at);
      return (
        orderDate >= today && orderDate <= todayEnd && o.status !== "cancelled"
      );
    });
    const todayRevenue = todayOrders.reduce(
      (sum, o) => sum + (o.total_amount || 0),
      0
    );

    // Get this week's revenue (from Monday of this week to now)
    const mondayThisWeek = getVietnamDateStart(vnNow);
    const currentDay = vnNow.getDay();
    const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1;
    mondayThisWeek.setDate(mondayThisWeek.getDate() - daysFromMonday);

    const weekEnd = getVietnamDateEnd(vnNow);
    const weekOrders = allOrders.filter((o) => {
      const orderDate = new Date(o.created_at);
      return (
        orderDate >= mondayThisWeek &&
        orderDate <= weekEnd &&
        o.status !== "cancelled"
      );
    });
    const weekRevenue = weekOrders.reduce(
      (sum, o) => sum + (o.total_amount || 0),
      0
    );

    // Get this month's revenue (from 1st day of this month to now)
    const firstDayThisMonth = new Date(
      vnNow.getFullYear(),
      vnNow.getMonth(),
      1
    );
    firstDayThisMonth.setHours(0, 0, 0, 0);

    const monthEnd = getVietnamDateEnd(vnNow);
    const monthOrders = allOrders.filter((o) => {
      const orderDate = new Date(o.created_at);
      return (
        orderDate >= firstDayThisMonth &&
        orderDate <= monthEnd &&
        o.status !== "cancelled"
      );
    });
    const monthRevenue = monthOrders.reduce(
      (sum, o) => sum + (o.total_amount || 0),
      0
    );

    // Calculate percentage changes for chart period
    const prevStart = new Date(start);
    prevStart.setDate(
      prevStart.getDate() - (end - start) / (1000 * 60 * 60 * 24)
    );
    const prevEnd = new Date(start);
    prevEnd.setMilliseconds(-1);

    // Build query for previous period with optional branch filter
    const prevQuery = {
      created_at: { $gte: prevStart, $lte: prevEnd },
    };
    if (branchId) {
      prevQuery.branch_id = branchId;
    }

    const prevOrders = await Order.find(prevQuery).lean();

    const prevRevenue = prevOrders
      .filter((o) => o.status !== "cancelled")
      .reduce((sum, o) => sum + (o.total_amount || 0), 0);

    const revenueChange =
      prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;

    // Calculate percentage changes for today
    const yesterday = getVietnamDateStart(vnNow);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayEnd = getVietnamDateEnd(yesterday);
    const yesterdayOrders = allOrders.filter((o) => {
      const orderDate = new Date(o.created_at);
      return (
        orderDate >= yesterday &&
        orderDate <= yesterdayEnd &&
        o.status !== "cancelled"
      );
    });
    const yesterdayRevenue = yesterdayOrders.reduce(
      (sum, o) => sum + (o.total_amount || 0),
      0
    );
    const todayChange =
      yesterdayRevenue > 0
        ? Math.round(
            ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 * 100
          ) / 100
        : todayRevenue > 0
        ? 100
        : 0;

    // Calculate percentage changes for week
    const mondayLastWeek = new Date(mondayThisWeek);
    mondayLastWeek.setDate(mondayLastWeek.getDate() - 7);
    const sundayLastWeek = new Date(mondayThisWeek);
    sundayLastWeek.setMilliseconds(-1);

    const prevWeekOrders = allOrders.filter((o) => {
      const orderDate = new Date(o.created_at);
      return (
        orderDate >= mondayLastWeek &&
        orderDate <= sundayLastWeek &&
        o.status !== "cancelled"
      );
    });
    const prevWeekRevenue = prevWeekOrders.reduce(
      (sum, o) => sum + (o.total_amount || 0),
      0
    );
    const weekChange =
      prevWeekRevenue > 0
        ? Math.round(
            ((weekRevenue - prevWeekRevenue) / prevWeekRevenue) * 100 * 100
          ) / 100
        : weekRevenue > 0
        ? 100
        : 0;

    // Calculate percentage changes for month
    const firstDayLastMonth = new Date(
      vnNow.getFullYear(),
      vnNow.getMonth() - 1,
      1
    );
    firstDayLastMonth.setHours(0, 0, 0, 0);
    const lastDayLastMonth = new Date(firstDayThisMonth);
    lastDayLastMonth.setMilliseconds(-1);

    const prevMonthOrders = allOrders.filter((o) => {
      const orderDate = new Date(o.created_at);
      return (
        orderDate >= firstDayLastMonth &&
        orderDate <= lastDayLastMonth &&
        o.status !== "cancelled"
      );
    });
    const prevMonthRevenue = prevMonthOrders.reduce(
      (sum, o) => sum + (o.total_amount || 0),
      0
    );
    const monthChange =
      prevMonthRevenue > 0
        ? Math.round(
            ((monthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100 * 100
          ) / 100
        : monthRevenue > 0
        ? 100
        : 0;

    // Determine chart granularity based on date range
    const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    let chartData = [];

    // If user selected custom date, always show daily data
    if (isCustomDate || daysDiff <= 7) {
      const currentDate = new Date(start);
      while (currentDate <= end) {
        const dayStart = new Date(currentDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(currentDate);
        dayEnd.setHours(23, 59, 59, 999);

        const dayOrders = orders.filter((o) => {
          const orderDate = new Date(o.created_at);
          return (
            orderDate >= dayStart &&
            orderDate <= dayEnd &&
            o.status !== "cancelled"
          );
        });

        const dayRevenue = dayOrders.reduce(
          (sum, o) => sum + (o.total_amount || 0),
          0
        );

        const vnDate = toVietnamTime(dayStart);
        chartData.push({
          date: `${vnDate.getDate()}/${vnDate.getMonth() + 1}`,
          revenue: dayRevenue,
        });

        currentDate.setDate(currentDate.getDate() + 1);
      }
    } else if (daysDiff <= 28) {
      const weeklyData = {};

      const currentDate = new Date(start);
      while (currentDate <= end) {
        const vnDate = toVietnamTime(currentDate);
        const yearStart = new Date(vnDate.getFullYear(), 0, 1);
        const daysSinceYearStart = Math.floor(
          (vnDate - yearStart) / (24 * 60 * 60 * 1000)
        );
        const weekNumber = Math.ceil(
          (daysSinceYearStart + yearStart.getDay() + 1) / 7
        );
        const weekKey = `Tuần ${weekNumber}`;

        if (weeklyData[weekKey] === undefined) {
          weeklyData[weekKey] = 0;
        }

        currentDate.setDate(currentDate.getDate() + 7);
      }

      orders.forEach((o) => {
        if (o.status === "cancelled") return;

        const orderDate = new Date(o.created_at);
        const vnOrderDate = toVietnamTime(orderDate);

        const yearStart = new Date(vnOrderDate.getFullYear(), 0, 1);
        const daysSinceYearStart = Math.floor(
          (vnOrderDate - yearStart) / (24 * 60 * 60 * 1000)
        );
        const weekNumber = Math.ceil(
          (daysSinceYearStart + yearStart.getDay() + 1) / 7
        );
        const weekKey = `Tuần ${weekNumber}`;

        if (weeklyData[weekKey] !== undefined) {
          weeklyData[weekKey] += o.total_amount || 0;
        }
      });

      chartData = Object.keys(weeklyData)
        .sort((a, b) => {
          const weekA = parseInt(a.replace("Tuần ", ""));
          const weekB = parseInt(b.replace("Tuần ", ""));
          return weekA - weekB;
        })
        .map((week) => ({
          date: week,
          revenue: weeklyData[week],
        }));
    } else {
      const monthlyData = {};

      const currentMonth = new Date(start);
      while (currentMonth <= end) {
        const vnMonth = toVietnamTime(currentMonth);
        const monthKey = `${vnMonth.getMonth() + 1}/${vnMonth.getFullYear()}`;
        monthlyData[monthKey] = 0;
        currentMonth.setMonth(currentMonth.getMonth() + 1);
      }

      orders.forEach((o) => {
        if (o.status === "cancelled") return;

        const orderDate = new Date(o.created_at);
        const vnOrderDate = toVietnamTime(orderDate);
        const monthKey = `${
          vnOrderDate.getMonth() + 1
        }/${vnOrderDate.getFullYear()}`;

        if (monthlyData[monthKey] !== undefined) {
          monthlyData[monthKey] += o.total_amount || 0;
        }
      });

      chartData = Object.keys(monthlyData)
        .sort((a, b) => {
          const [monthA, yearA] = a.split("/").map(Number);
          const [monthB, yearB] = b.split("/").map(Number);
          return yearA !== yearB ? yearA - yearB : monthA - monthB;
        })
        .map((month) => ({
          date: `Tháng ${month}`,
          revenue: monthlyData[month],
        }));
    }

    const data = {
      revenue: {
        today: todayRevenue,
        today_change: Math.round(todayChange * 100) / 100,
        week: weekRevenue,
        week_change: Math.round(weekChange * 100) / 100,
        month: monthRevenue,
        month_change: Math.round(monthChange * 100) / 100,
        total: totalRevenue,
        change_percent: Math.round(revenueChange * 100) / 100,
      },
      chart: {
        daily_revenue: chartData,
      },
      date_range: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
    };

    return response.sendSuccess(
      res,
      data,
      "Lấy thống kê dashboard thành công",
      200
    );
  } catch (error) {
    console.error("Get admin dashboard error:", error);
    return response.sendError(
      res,
      "Có lỗi xảy ra khi lấy thống kê dashboard",
      500,
      error.message
    );
  }
};

// Get top selling dishes for admin (all branches, include inactive)
export const getAdminTopSellingDishes = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = "quantity",
      order = "desc",
      period = "today",
      branchId,
    } = req.query;

    // Calculate date range based on period
    let startDate, endDate;
    const vnNow = toVietnamTime();

    switch (period) {
      case "today":
        startDate = getVietnamDateStart(vnNow);
        endDate = getVietnamDateEnd(vnNow);
        break;
      case "week":
        startDate = getVietnamDateStart(vnNow);
        startDate.setDate(startDate.getDate() - 27);
        endDate = getVietnamDateEnd(vnNow);
        break;
      case "month":
        startDate = new Date(
          vnNow.getFullYear(),
          vnNow.getMonth() - 2,
          vnNow.getDate()
        );
        startDate.setHours(0, 0, 0, 0);
        endDate = getVietnamDateEnd(vnNow);
        break;
      default:
        startDate = getVietnamDateStart(vnNow);
        endDate = getVietnamDateEnd(vnNow);
    }

    // Build query with optional branch filter
    const query = {
      created_at: { $gte: startDate, $lte: endDate },
      status: { $ne: "cancelled" },
    };
    if (branchId) {
      query.branch_id = branchId;
    }

    // Get orders (exclude cancelled)
    const orders = await Order.find(query).lean();

    // Get all dishes (including inactive)
    const allDishes = await Dish.find({})
      .select("_id name imageUrls defaultImageIndex price category status")
      .populate("category", "name")
      .lean();

    // Calculate dish statistics from orders
    const dishSales = {};
    orders.forEach((order) => {
      order.items?.forEach((item) => {
        const dishId = item.dish_id.toString();
        if (!dishSales[dishId]) {
          dishSales[dishId] = {
            dish_id: dishId,
            dish_name: item.dish_name || "Món ăn",
            dish_image: item.dish_image || "",
            total_quantity: 0,
            total_revenue: 0,
          };
        }
        dishSales[dishId].total_quantity += item.quantity || 0;
        dishSales[dishId].total_revenue += item.total || 0;
      });
    });

    // Merge all dishes with sales data
    const dishesArray = allDishes.map((dish) => {
      const dishId = dish._id.toString();
      const salesData = dishSales[dishId];

      return {
        dish_id: dishId,
        dish_name: dish.name,
        dish_image:
          dish.imageUrls?.[dish.defaultImageIndex || 0] ||
          dish.imageUrls?.[0] ||
          "",
        dish_price: dish.price || 0,
        dish_status: dish.status,
        category_name: dish.category?.name || "Chưa phân loại",
        category_id: dish.category?._id || null,
        total_quantity: salesData ? salesData.total_quantity : 0,
        total_revenue: salesData ? salesData.total_revenue : 0,
      };
    });

    // Sort based on sortBy parameter
    if (sortBy === "quantity") {
      dishesArray.sort((a, b) => {
        return order === "desc"
          ? b.total_quantity - a.total_quantity
          : a.total_quantity - b.total_quantity;
      });
    } else if (sortBy === "revenue") {
      dishesArray.sort((a, b) => {
        return order === "desc"
          ? b.total_revenue - a.total_revenue
          : a.total_revenue - b.total_revenue;
      });
    }

    // Pagination
    const total = dishesArray.length;
    const totalPages = Math.ceil(total / parseInt(limit));
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedDishes = dishesArray.slice(startIndex, endIndex);

    const data = {
      dishes: paginatedDishes,
      pagination: {
        current_page: parseInt(page),
        total_pages: totalPages,
        total_items: total,
        per_page: parseInt(limit),
        has_next: parseInt(page) < totalPages,
        has_prev: parseInt(page) > 1,
      },
      filters: {
        period,
        sortBy,
        order,
      },
      date_range: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
    };

    return response.sendSuccess(
      res,
      data,
      "Lấy danh sách sản phẩm bán chạy thành công",
      200
    );
  } catch (error) {
    console.error("Get admin top selling dishes error:", error);
    return response.sendError(
      res,
      "Có lỗi xảy ra khi lấy danh sách sản phẩm",
      500,
      error.message
    );
  }
};
