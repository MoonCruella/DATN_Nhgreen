import cors from "cors";
import express from "express";
import cookieParser from "cookie-parser";
import authRouter from "./routes/auth-routes.js";
import branchRouter from "./routes/branch-routes.js";
import ingredientRouter from "./routes/ingredient-routes.js";
import categoryRouter from "./routes/category-routes.js";
import uploadRouter from "./routes/upload-routes.js";
import dishRouter from "./routes/dish-routes.js";
import voucherRouter from "./routes/voucher-routes.js";
import flashsaleRouter from "./routes/flashsale-routes.js";
import cartRouter from "./routes/cart-routes.js";
import ratingRouter from "./routes/rating-routes.js";
import addressRouter from "./routes/address-routes.js";
import orderRouter from "./routes/order-routes.js";
import userRoutes from "./routes/user-route.js";
import vnpayRouter from "./routes/vnpay-routes.js";
import zalopayRouter from "./routes/zalopay-routes.js";
import geocodingRouter from "./routes/geocoding-routes.js";
import notificationRouter from "./routes/notification-routes.js";
import supportChatRouter from "./routes/supportChat-route.js";
import dashboardRouter from "./routes/dashboard-routes.js";
import recommendationRouter from "./routes/recommendation-routes.js";
import storeTableRouter from "./routes/store-table-routes.js";
import dineInSessionRouter from "./routes/dinein-session-routes.js";
import dineInCustomerRouter from "./routes/dinein-customer-routes.js";
const app = express();
app.use(
  cors({
    origin: ["http://localhost:5173", "http://192.168.0.80:5173"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Cache-Control",
      "Pragma",
      "Expires",
    ],
    credentials: true, // quan trọng để gửi cookie
  }),
);
app.use(cookieParser()); // sửa đúng tên
app.use(express.json());

// Auth
app.use("/api/auth", authRouter);

// Branches
app.use("/api/branches", branchRouter);

// Ingredients
app.use("/api/ingredients", ingredientRouter);

// Categories
app.use("/api/categories", categoryRouter);

// Dishes
app.use("/api/dishes", dishRouter);

// Upload Anh len Cloudinary
app.use("/api/upload", uploadRouter);

// Voucher routes
app.use("/api/vouchers", voucherRouter);

// Flashsale routes
app.use("/api/flashsales", flashsaleRouter);

// Cart routes
app.use("/api/cart", cartRouter);

// Ratings
app.use("/api/ratings", ratingRouter);

// Addresses
app.use("/api/addresses", addressRouter);

// Orders
app.use("/api/orders", orderRouter);

// Store Tables
app.use("/api/store-tables", storeTableRouter);

// Dine-in QR
app.use("/api/dine-in", dineInSessionRouter);

// Dine-in Customers
app.use("/api/dine-in-customers", dineInCustomerRouter);

// Users
app.use("/api/users", userRoutes);

// VNPay
app.use("/api/vnpay", vnpayRouter);

// ZaloPay
app.use("/api/zalopay", zalopayRouter);

// Geocoding (Proxy cho Nominatim OSM)
app.use("/api/geocoding", geocodingRouter);

// Notifications
app.use("/api/notifications", notificationRouter);

// Support Chat
app.use("/api/support-chat", supportChatRouter);

// Dashboard
app.use("/api/dashboard", dashboardRouter);

// Recommendations (AI Service)
app.use("/api/recommendations", recommendationRouter);

export default app;
