
<h1 align="center">
🥗 NHGREEN
</h1>

<p align="center">
Healthy Food Ordering & Restaurant Management System
</p>

<p align="center">

![React](https://img.shields.io/badge/React-19-blue)
![NodeJS](https://img.shields.io/badge/NodeJS-Express-green)
![MongoDB](https://img.shields.io/badge/Database-MongoDB-success)
![License](https://img.shields.io/badge/license-MIT-orange)

</p>

NHGREEN là hệ thống quản lý và bán món ăn dinh dưỡng theo mô hình nhiều chi nhánh. Dự án bao gồm website khách hàng, E-menu tại bàn, trang quản lý chi nhánh và trang quản trị hệ thống. Hệ thống hỗ trợ đặt món online, đặt món tại bàn bằng QR, thanh toán điện tử, quản lý vận chuyển GHN, quản lý dinh dưỡng món ăn và gợi ý món ăn thông minh.

## Mục Tiêu

- Xây dựng nền tảng bán món ăn dinh dưỡng hoàn chỉnh cho cả online và tại quán.
- Quản lý món ăn, nguyên liệu, dinh dưỡng, chi nhánh, bàn, đơn hàng và khách hàng trong cùng một hệ thống.
- Tích hợp thanh toán VNPAY, MoMo, ZaloPay và hoàn tiền cho các giao dịch phù hợp.
- Tích hợp GHN cho đơn online, tự động đồng bộ trạng thái giao hàng và tạo thông báo khi GHN cập nhật.
- Cung cấp trải nghiệm E-menu tại bàn bằng QR, cập nhật realtime cho manager bằng Socket.io.
- Gợi ý món ăn trên trang chủ dựa trên món bán chạy, lịch sử đặt món, độ mới và đánh giá.

## Công Nghệ Sử Dụng

### Frontend

- React 19
- Vite
- React Router
- Redux Toolkit
- Tailwind CSS
- Radix UI, Ant Design
- Socket.io Client
- Axios
- Sonner / React Toastify
- Recharts

### Backend

- Node.js
- Express.js
- MongoDB, Mongoose
- Socket.io
- Redis
- JWT Authentication
- Cloudinary
- Nodemailer
- QRCode
- Docker

### Dịch Vụ Tích Hợp

- VNPAY Sandbox / Merchant API
- MoMo Test / UAT
- ZaloPay Sandbox
- GHN Test API
- Cloudinary
- SMTP Brevo

## Vai Trò Và Chức Năng

### Khách Hàng

- Đăng ký, đăng nhập, quên mật khẩu.
- Quản lý thông tin cá nhân và địa chỉ giao hàng.
- Xem danh sách món ăn, chi tiết món, nguyên liệu, xuất xứ nguyên liệu và thông tin dinh dưỡng.
- Tìm kiếm món ăn, lọc theo danh mục, kcal và nguyên liệu.
- Xem thông tin dinh dưỡng khi hover trên card món ăn.
- Nhận gợi ý món ăn trên trang chủ.
- Thêm món vào giỏ hàng, đặt hàng online.
- Thanh toán bằng COD, VNPAY, MoMo, ZaloPay.
- Theo dõi trạng thái đơn hàng, trạng thái giao hàng GHN.
- Đánh giá món ăn sau khi mua.
- Tích điểm thưởng cho đơn online thanh toán thành công.

### Khách Tại Bàn / E-menu

- Quét QR bàn để mở E-menu.
- Xem thông tin bàn và đơn chưa thanh toán đang có.
- Gọi món trực tiếp từ điện thoại.
- Manager nhận cập nhật bàn realtime bằng Socket.io.
- Thanh toán tại bàn bằng tiền mặt, QR MoMo, QR ZaloPay hoặc link thanh toán.
- Hiển thị hóa đơn riêng sau khi thanh toán thành công.
- In hóa đơn và in QR bàn.

### Quản Lý Chi Nhánh

- Quản lý bàn, sơ đồ bàn và trạng thái bàn.
- Tạo đơn tại bàn, thêm món, xác nhận món, thanh toán bàn.
- Quản lý đơn online thuộc chi nhánh.
- Gọi GHN khi nhấn giao hàng cho đơn online.
- Đồng bộ trạng thái GHN, tự động cập nhật khi vận đơn bị hủy trong sandbox.
- Xác nhận đơn đã giao và hoàn tất đơn.
- Quản lý món khả dụng theo chi nhánh.
- Xem thông báo được chia theo đơn online và đơn tại bàn.
- Xem doanh thu, thống kê, đánh giá và chi tiết đơn hàng.

### Quản Trị Viên

- Quản lý tài khoản người dùng, manager, admin.
- Vô hiệu hóa / kích hoạt tài khoản thay vì xóa cứng.
- Quản lý chi nhánh và tài khoản manager theo chi nhánh.
- Quản lý món ăn, nguyên liệu, danh mục.
- Quản lý flash sale, voucher, mã giảm giá.
- Quản lý đơn hàng toàn hệ thống.
- Xem chi tiết đơn hàng với giao diện đồng bộ với manager.
- Quản lý đánh giá, thông báo và dashboard thống kê.
- Quản lý trạng thái món, xuất xứ nguyên liệu và chỉ số dinh dưỡng.

## Tính Năng Nổi Bật

- **Thanh toán điện tử**: VNPAY, MoMo, ZaloPay cho online và tại bàn.
- **Hoàn tiền**: xử lý refund cho VNPAY, ZaloPay, MoMo theo luồng hủy đơn.
- **GHN Shipping**: tạo vận đơn, đồng bộ trạng thái, tự động cập nhật trạng thái vận chuyển.
- **E-menu QR tại bàn**: khách quét QR, gọi món và thanh toán ngay tại bàn.
- **Realtime bằng Socket.io**: cập nhật trạng thái bàn, đơn hàng và thông báo.
- **Dinh dưỡng món ăn**: tính kcal, protein, carbs, fat từ nguyên liệu.
- **Lọc món nâng cao**: tìm kiếm, lọc theo danh mục, kcal, giá và nguyên liệu.
- **Xuất xứ nguyên liệu**: hiển thị nguồn gốc nguyên liệu trong chi tiết món.
- **Gợi ý món ăn quen thuộc**: gợi ý dựa theo món ăn người dùng đặt nhiều nhất.
- **Tích điểm online**: cộng xu tích điểm cho đơn online thanh toán thành công.
- **Triển khai Render**: hỗ trợ tách client/server và Redis bằng Docker/Redis Cloud.

## Cấu Trúc Dự Án

```txt
DATN_Nhgreen/
├── client/                 # React app
│   ├── src/api             # API clients
│   ├── src/components      # Shared/customer/manager/admin components
│   ├── src/pages           # Customer, manager, admin pages
│   ├── src/context         # Cart and app contexts
│   └── src/assets          # Images and icons
├── server/                 # Express API
│   ├── controllers         # Business logic
│   ├── models              # Mongoose schemas
│   ├── routes              # API routes
│   ├── services            # Scheduler, rewards, notifications...
│   ├── config              # DB, socket, env config
│   └── middleware          # Auth and role middleware
├── docs/                   # Sequence diagrams / documents
└── docker-compose.yml      # Redis service for local development
```

## Cài Đặt Nhanh

### 1. Clone Project

```bash
git clone https://github.com/MoonCruella/DATN_Nhgreen.git
cd DATN_Nhgreen
```

### 2. Cài Backend

```bash
cd server
npm install
npm run dev
```

Backend mặc định chạy theo biến `PORT`, thường là `3000`.

### 3. Cài Frontend

```bash
cd client
npm install
npm run dev
```

Frontend Vite thường chạy tại `http://localhost:5173`.

### 4. Chạy Redis Bằng Docker

```bash
docker compose up -d redis
```

Hoặc chạy Redis thủ công:

```bash
docker run --name nhgreen-redis -d -p 6379:6379 redis
```

## Biến Môi Trường

### Client `.env`

```env
VITE_API_BASE_URL
VITE_GOONG_API_KEY
VITE_GOONG_MAP_KEY
```

### Server `.env`

```env
PORT
MONGODB_CONN

ACCESS_TOKEN_KEY
ACCESS_TOKEN_LIFE
REFRESH_TOKEN_KEY
REFRESH_TOKEN_LIFE

SMTP_SERVER
SMTP_USER
SMTP_PASSWORD
EMAIL_SENDER

CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET

SERVER_BASE_URL
CLIENT_URL
QR_CLIENT_BASE_URL

REDIS_HOST
REDIS_PORT
REDIS_PASSWORD
REDIS_DB

VNP_TMN_CODE
VNP_HASH_SECRET
VNP_RETURN_URL
VNP_URL
VNP_API_URL
VNP_FE_REDIRECT_URL

MOMO_PARTNER_CODE
MOMO_ACCESS_KEY
MOMO_SECRET_KEY
MOMO_REQUEST_TYPE
MOMO_REDIRECT_URL
MOMO_IPN_UR
MOMO_FE_REDIRECT_URL
MOMO_MANAGER_REDIRECT_URL

ZP_APP_ID
ZP_KEY1
ZP_KEY2
ZP_FE_REDIRECT_URL

GHN_TOKEN
GHN_AUTO_SYNC_ENABLED
GHN_AUTO_SYNC_INTERVAL_MS

AI_SERVICE_URL
AI_API_KEY
RECAPTCHA_SECRET_KEY
```

## API Chính

- `POST /api/auth/register` - đăng ký.
- `POST /api/auth/login` - đăng nhập.
- `GET /api/dishes` - danh sách món, hỗ trợ search/filter/sort.
- `GET /api/dishes/:id` - chi tiết món.
- `GET /api/recommendations/home` - gợi ý món ăn cho trang chủ.
- `GET /api/cart` - giỏ hàng.
- `POST /api/orders` - tạo đơn online.
- `PUT /api/orders/:id/cancel` - hủy đơn và xử lý hoàn tiền nếu có.
- `PUT /api/orders/:id/shipping` - tạo vận đơn GHN.
- `POST /api/vnpay/create-payment` - tạo thanh toán VNPAY.
- `POST /api/momo/create-payment` - tạo thanh toán MoMo.
- `POST /api/zalopay/create-payment` - tạo thanh toán ZaloPay.
- `GET /api/store-tables` - quản lý bàn.
- `GET /api/dine-in-sessions/:tableId` - phiên gọi món tại bàn.
- `GET /api/notifications` - thông báo.
```

## Scripts

### Backend

```bash
cd server
npm run dev
npm start
```

### Frontend

```bash
cd client
npm run dev
npm run build
npm start
```

## Tác Giả

Đồ án tốt nghiệp - Trường Đại học Công nghệ Kỹ thuật TP. Hồ Chí Minh

| Họ và tên | MSSV | GitHub |
| --- | --- | --- |
| Lê Huỳnh Như Nguyệt | 22110385 | [@MoonCruella](https://github.com/MoonCruella) |
| Phạm Ngọc Hòa | 22110330 | [@HoaPham236](https://github.com/hoapham236) |

## Liên Hệ

Nếu có thắc mắc về dự án, vui lòng liên hệ:

- nhunguyetpy206@gmail.com
- pnhpy2306@gmail.com


# NHGREEN

NHGREEN is a multi-branch healthy food ordering and management system. The project includes a customer website, QR-based E-menu, branch management portal, and system administration dashboard. It supports online ordering, dine-in ordering via QR code, electronic payments, GHN shipping integration, nutrition management, and intelligent food recommendations.

---

# Project Goals

- Build a complete healthy food ordering platform for both online and dine-in customers.
- Manage dishes, ingredients, nutrition information, branches, tables, orders, and customers within a unified system.
- Integrate VNPAY, MoMo, and ZaloPay payment gateways with refund support.
- Integrate GHN shipping for online orders, automatically synchronize delivery status, and notify managers of shipping updates.
- Provide a QR-based E-menu with real-time updates powered by Socket.io.
- Recommend dishes on the homepage using a hybrid recommendation algorithm based on popularity, purchase history, freshness, and ratings.

---

# Technology Stack

## Frontend

- React 19
- Vite
- React Router
- Redux Toolkit
- Tailwind CSS
- Radix UI
- Ant Design
- Socket.io Client
- Axios
- Sonner / React Toastify
- Recharts

## Backend

- Node.js
- Express.js
- MongoDB
- Mongoose
- Socket.io
- Redis
- JWT Authentication
- Cloudinary
- Nodemailer
- QRCode
- Docker

## Third-party Services

- VNPAY Sandbox / Merchant API
- MoMo Test / UAT
- ZaloPay Sandbox
- GHN Test API
- Cloudinary
- Brevo SMTP
- Optional AI Service (Chatbot / Recommendation Engine)

---

# Features

## Customer

- Register, login, and reset password.
- Manage personal profile and delivery addresses.
- Browse dishes with detailed nutrition information.
- View ingredients and ingredient origins.
- Search and filter dishes by category, calories, and ingredients.
- Display nutrition information when hovering over dish cards.
- Receive personalized dish recommendations.
- Add dishes to cart and place online orders.
- Pay using COD, VNPAY, MoMo, or ZaloPay.
- Track order and delivery status.
- Rate purchased dishes.
- Earn reward points for successful online payments.

---

## Dine-in Customer (QR E-menu)

- Scan a QR code to access the E-menu.
- View table information and unpaid orders.
- Order directly from a mobile device.
- Managers receive real-time table updates via Socket.io.
- Pay using cash, MoMo QR, ZaloPay QR, or payment links.
- Display a digital invoice after successful payment.
- Print invoices and table QR codes.

---

## Branch Manager

- Manage tables, table layouts, and table status.
- Create dine-in orders.
- Add and confirm ordered dishes.
- Process table payments.
- Manage online orders assigned to the branch.
- Create GHN shipping orders.
- Synchronize GHN delivery status automatically.
- Confirm delivered orders.
- Manage dish availability by branch.
- View separate notifications for online and dine-in orders.
- View revenue, statistics, customer reviews, and order details.

---

## System Administrator

- Manage customer, manager, and administrator accounts.
- Enable or disable accounts instead of permanently deleting them.
- Manage branches and branch manager accounts.
- Manage dishes, ingredients, and categories.
- Manage flash sales, vouchers, and coupons.
- Manage all system orders.
- View order details with a unified interface.
- Manage customer reviews and notifications.
- View analytics dashboards.
- Manage dish availability, ingredient origins, and nutrition information.

---

# Key Features

- Electronic payments via VNPAY, MoMo, and ZaloPay.
- Automatic refund processing for cancelled orders.
- GHN shipping integration with real-time synchronization.
- QR-based E-menu for dine-in ordering.
- Real-time updates using Socket.io.
- Automatic nutrition calculation from ingredients.
- Advanced dish filtering.
- Ingredient origin display.
- Reward points for successful online payments.
- Deployment on Render with Redis Cloud and Docker support.

---

# Project Structure

```text
DATN_Nhgreen/
├── client/                 # React application
│   ├── src/api
│   ├── src/components
│   ├── src/pages
│   ├── src/context
│   └── src/assets
├── server/                 # Express REST API
│   ├── controllers
│   ├── models
│   ├── routes
│   ├── services
│   ├── config
│   └── middleware
├── docs/                   # Documentation and sequence diagrams
└── docker-compose.yml      # Redis service
```

---

# Quick Start

## 1. Clone the Repository

```bash
git clone https://github.com/MoonCruella/DATN_Nhgreen.git
cd DATN_Nhgreen
```

---

## 2. Install Backend

```bash
cd server
npm install
npm run dev
```

The backend runs on the port specified by the `PORT` environment variable (default: **3000**).

---

## 3. Install Frontend

```bash
cd client
npm install
npm run dev
```

The frontend is typically available at:

```
http://localhost:5173
```

---

## 4. Start Redis with Docker

```bash
docker compose up -d redis
```

Or run Redis manually:

```bash
docker run --name nhgreen-redis -d -p 6379:6379 redis
```

---

# Environment Variables

## Client `.env`

```env
VITE_API_BASE_URL
VITE_GOONG_API_KEY
VITE_GOONG_MAP_KEY
```

## Server `.env`

```env
PORT
MONGODB_CONN

ACCESS_TOKEN_KEY
ACCESS_TOKEN_LIFE
REFRESH_TOKEN_KEY
REFRESH_TOKEN_LIFE

SMTP_SERVER
SMTP_USER
SMTP_PASSWORD
EMAIL_SENDER

CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET

SERVER_BASE_URL
CLIENT_URL
QR_CLIENT_BASE_URL

REDIS_HOST
REDIS_PORT
REDIS_PASSWORD
REDIS_DB

VNP_TMN_CODE
VNP_HASH_SECRET
VNP_RETURN_URL
VNP_URL
VNP_API_URL
VNP_FE_REDIRECT_URL

MOMO_PARTNER_CODE
MOMO_ACCESS_KEY
MOMO_SECRET_KEY
MOMO_REQUEST_TYPE
MOMO_REDIRECT_URL
MOMO_IPN_URL
MOMO_FE_REDIRECT_URL
MOMO_MANAGER_REDIRECT_URL

ZP_APP_ID
ZP_KEY1
ZP_KEY2
ZP_FE_REDIRECT_URL

GHN_TOKEN
GHN_AUTO_SYNC_ENABLED
GHN_AUTO_SYNC_INTERVAL_MS

AI_SERVICE_URL
AI_API_KEY
RECAPTCHA_SECRET_KEY
```

---

# Main APIs

| Method | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/auth/register` | Register a new account |
| POST | `/api/auth/login` | User login |
| GET | `/api/dishes` | Get dishes with search/filter/sort |
| GET | `/api/dishes/:id` | Get dish details |
| GET | `/api/recommendations/home` | Homepage recommendations |
| GET | `/api/cart` | Get shopping cart |
| POST | `/api/orders` | Create an online order |
| PUT | `/api/orders/:id/cancel` | Cancel an order and process refunds |
| PUT | `/api/orders/:id/shipping` | Create a GHN shipment |
| POST | `/api/vnpay/create-payment` | Create VNPAY payment |
| POST | `/api/momo/create-payment` | Create MoMo payment |
| POST | `/api/zalopay/create-payment` | Create ZaloPay payment |
| GET | `/api/store-tables` | Get table information |
| GET | `/api/dine-in-sessions/:tableId` | Get dine-in session |
| GET | `/api/notifications` | Get notifications |

---

# Available Scripts

## Backend

```bash
cd server

npm run dev
npm start
```

## Frontend

```bash
cd client

npm run dev
npm run build
npm start
```

---

# Authors

Bachelor Graduation Project

**Ho Chi Minh City University of Technology and Education (HCMUTE)**

| Name | Student ID | GitHub |
|------|------------|--------|
| Le Huynh Nhu Nguyet | 22110385 | @MoonCruella |
| Pham Ngoc Hoa | 22110330 | @HoaPham236 |

---

# Contact

For questions or feedback, please contact:

- nhunguyetpy206@gmail.com
- pnhpy2306@gmail.com
## Contact / Questions
For questions, contact: nhunguyetpy206@gmail.com, pnhpy2306@gmail.com
