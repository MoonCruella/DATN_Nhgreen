# NHGREEN

## Mục đích dự án
Trong bối cảnh chuyển đổi số ngày càng phát triển mạnh mẽ, việc xây dựng các hệ thống thương mại điện tử thông minh, linh hoạt và có khả năng mở rộng là nhu cầu thiết yếu đối với doanh nghiệp và người tiêu dùng. Nhằm áp dụng những kiến thức đã học vào thực tiễn, đồng thời nghiên cứu và triển khai các công nghệ phần mềm hiện đại, nhóm sinh viên chúng em thực hiện đề tài **“Hệ thống thương mại điện tử tích hợp dịch vụ AI hỗ trợ người dùng”**.

Dự án hướng đến việc xây dựng một nền tảng mua sắm trực tuyến hoàn chỉnh, cho phép người dùng dễ dàng tìm kiếm, đặt mua sản phẩm và quản lý đơn hàng. Bên cạnh đó, hệ thống còn tích hợp **dịch vụ AI (Chatbot / gợi ý thông minh)** nhằm nâng cao trải nghiệm người dùng, hỗ trợ tư vấn sản phẩm và giải đáp thắc mắc một cách nhanh chóng, hiệu quả. Thông qua dự án, nhóm mong muốn áp dụng kiến trúc hiện đại (microservice), đảm bảo khả năng mở rộng, bảo trì và phát triển lâu dài cho hệ thống.

---

## Công nghệ sử dụng
- **Node.js**: Nền tảng JavaScript phía máy chủ, dùng để xây dựng backend với hiệu năng cao và khả năng mở rộng tốt.
- **Express.js**: Framework backend cho Node.js, hỗ trợ xây dựng RESTful API và xử lý logic nghiệp vụ.
- **React.js**: Thư viện JavaScript dùng để phát triển giao diện người dùng hiện đại, tương tác mượt mà.
- **MongoDB & Mongoose**: Cơ sở dữ liệu NoSQL và thư viện ORM giúp quản lý dữ liệu người dùng, sản phẩm, đơn hàng.
- **Tailwind CSS**: Framework CSS hỗ trợ thiết kế giao diện nhanh chóng, tối ưu và responsive.
- **WebSocket / Socket.io**: Hỗ trợ giao tiếp thời gian thực (chat, thông báo).
- **AI Service (Microservice)**: Dịch vụ AI riêng biệt phục vụ chatbot hoặc gợi ý thông minh cho người dùng.
- **Cloudinary**: Lưu trữ và quản lý hình ảnh sản phẩm.
- **Docker**: Hỗ trợ triển khai và quản lý môi trường chạy ứng dụng.

---

## Vai trò và các chức năng

### 1. Khách hàng
- Đăng ký tài khoản và đăng nhập hệ thống.
- Quên mật khẩu và cấp lại mật khẩu.
- Cập nhật và quản lý thông tin cá nhân.
- Tìm kiếm món ăn theo danh mục và thành phần dinh dưỡng.
- Xem chi tiết món ăn: giá, mô tả, lượng calo, hình ảnh, thành phần,...
- Quản lý giỏ hàng: thêm / xóa / cập nhật số lượng sản phẩm.
- Đặt hàng và lựa chọn phương thức thanh toán.
- Theo dõi trạng thái đơn hàng theo thời gian thực.
- Xem lịch sử các đơn hàng đã mua.
- Đánh giá và nhận xét món ăn.
- Xem thông tin hệ thống các chi nhánh.

### 2. Quản lý chi nhánh
- Nhận và xử lý các đơn hàng thuộc chi nhánh quản lý.
- Cập nhật tình trạng món ăn tại chi nhánh (còn hàng / hết hàng).
- Xem thống kê doanh thu của chi nhánh.
- Xem đánh giá và phản hồi từ khách hàng.

### 3. Người quản trị
- Quản lý tài khoản người dùng:Xem, khóa hoặc mở khóa tài khoản khách hàng và quản lý chi nhánh.
- Quản lý món ăn: thêm, sửa, xóa món ăn.
- Quản lý danh mục món ăn.
- Quản lý hệ thống cửa hàng trong chuỗi: thêm, chỉnh sửa, khóa chi nhánh.
- Quản lý đơn hàng: xem, xử lý và cập nhật trạng thái đơn.
- Quản lý nguyên liệu của món ăn.
- Quản lý doanh thu:
  - Xem báo cáo theo ngày / tháng / năm.
  - Thống kê theo từng cửa hàng và từng món ăn.
- Quản lý phản hồi khách hàng và xử lý khiếu nại.
- Quản lý mã giảm giá, khuyến mãi và chương trình flash sale.

---

## Cấu trúc dự án
- server/ — API (controllers, routes, models, middleware, utils, services, config)
- client/ — React app (pages, components, services, redux, context, hooks, assets)
- ai-service/ — AI microservice (chatbot / recommendation)

## Cài đặt nhanh (dev)
1. **Clone repo tại:**  [@NHgreen](https://github.com/MoonCruella/TLCN_Project)     
2. **Backend:**
```bash
cd server
cp .env   # cấu hình biến môi trường
npm install
npm run dev
```

3. **Frontend:**
```bash
cd client
cp .env   # cấu hình API_BASE_URL
npm install
npm start
```
4. **Cài đặt Redis:**
- Cài đặt **Redis** bằng **Docker**: 

```bash
docker pull redis
docker run --name redis-server -d -p 6379:6379 redis 
```
5. **AI Service:**
```bash
cd ai-service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```

## Biến môi trường chính

- **Biến môi trường phía Frontend:**

``` bash 
VITE_API_BASE_URL
VITE_GOONG_API_KEY
VITE_GOONG_MAP_KEY
```

- **Biến môi trường phía Server:**
```bash
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
VNP_TMN_CODE
VNP_HASH_SECRET
VNP_RETURN_URL
VNP_URL
ZP_APP_ID
ZP_KEY1
ZP_KEY2
AI_SERVICE_URL
AI_API_KEY
```

- **Biến môi trường phía AI Service:**
```bash
MONGO_URI
MONGO_DB
AI_API_KEY
MODEL_DIR
MODEL_FILENAME
```

## Tổng quan API 
- /api/auth — Xác thực người dùng
- /api/users — Quản lý người dùng
- /api/upload — Upload hình ảnh
- /api/categories — Quản lý danh mục
- /api/products — Quản lý sản phẩm
- /api/cart — Giỏ hàng
- /api/orders — Đơn hàng
- /api/vouchers — Voucher
- /api/ratings — Đánh giá sản phẩm
- /api/revenue — Thống kê doanh thu
- /api/notifications — Thông báo
- /api/support — Hỗ trợ khách hàng


## Tác giả
Tiểu luận chuyên ngành - Trường Đại Học Sư Phạm Kỹ Thuật TP Hồ Chí Minh
| Họ và tên              | Mã số sinh viên | GitHub                                                |
|-------------------------|-----------------|--------------------------------------------------------|
| Lê Huỳnh Như Nguyệt     | 22110385        | [@MoonCruella](https://www.github.com/MoonCruella)     |
| Phạm Ngọc Hòa           | 22110330        | [@HoaPham236](https://github.com/hoapham236)           |



## Góp ý/Thắc mắc

Nếu có thắc mắc nào về dự án, vui lòng liên hệ cho chúng tôi theo địa chỉ email: nhunguyetpy206@gmail.com hoặc pnhpy2306@gmail.com


# NHGREEN

## Project Purpose
In the context of rapid digital transformation, building intelligent, flexible, and scalable e-commerce systems has become an essential requirement for both businesses and consumers. With the aim of applying acquired knowledge into practice and researching modern software technologies, our student group conducted the topic **“E-commerce System Integrated with AI Services for User Support.”**

The project focuses on developing a complete online shopping platform that allows users to easily search for products, place orders, and manage their purchases. In addition, the system integrates **AI services (Chatbot / intelligent recommendations)** to enhance user experience by providing product consultation and fast, efficient customer support. Through this project, the team aims to apply modern architectural approaches (microservices) to ensure scalability, maintainability, and long-term system development.

---

## Technologies Used
- **Node.js**: A JavaScript runtime for building high-performance and scalable backend systems.
- **Express.js**: A backend framework for Node.js used to build RESTful APIs and handle business logic.
- **React.js**: A JavaScript library for developing modern, interactive user interfaces.
- **MongoDB & Mongoose**: A NoSQL database and ORM library for managing users, products, and orders.
- **Tailwind CSS**: A utility-first CSS framework for building responsive and optimized user interfaces.
- **WebSocket / Socket.io**: Enables real-time communication (chat, notifications).
- **AI Service (Microservice)**: A standalone AI service for chatbot functionality and intelligent recommendations.
- **Cloudinary**: Cloud-based image storage and management.
- **Docker**: Supports deployment and environment management.

---

## Roles and Features
## 1. Customer
- Register an account and log in to the system.
- Forgot password and reset password.
- Update and manage personal information.
- Search for food items by category and nutritional components.
- View food details: price, description, calorie information, images, ingredients, etc.
- Manage shopping cart: add / remove / update product quantities.
- Place orders and choose payment methods.
- Track order status in real time.
- View order purchase history.
- Rate and review food items.
- View information about branch locations.

## 2. Branch Manager
- Receive and process orders belonging to the managed branch.
- Update the availability status of food items at the branch (available / out of stock).
- View branch revenue statistics.
- View customer ratings and feedback.

## 3. Administrator
- User account management: view, lock, or unlock customer and branch manager accounts.
- Food management: add, edit, and delete food items.
- Food category management.
- Chain store management: add, edit, or deactivate branches.
- Order management: view, process, and update order statuses.
- Ingredient management for food items.
- Revenue management:
  - View reports by day / month / year.
  - Analyze revenue by branch and by food item.
- Customer feedback management and complaint handling.
- Promotion management: discount codes, promotions, and flash sale programs.

---

## Project Structure
- server/ — API (controllers, routes, models, middleware, utils, services, config)
- client/ — React app (pages, components, services, redux, context, hooks, assets)
- ai-service/ — AI microservice (chatbot / recommendation)

## Quick Start (Development)

1. **Clone the repository:**  
   https://github.com/MoonCruella/TLCN_Project

2. **Backend**
```bash
cd server
cp .env   # configure environment variables
npm install
npm run dev
```
3. **Frontend**
```bash
cd client
cp .env   # configure API_BASE_URL
npm install
npm start
```
4. **Redis**
```bash
docker pull redis
docker run --name redis-server -d -p 6379:6379 redis
```
5. **AI Service**
```bash
cd ai-service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```
## Important environment variables

Frontend:
```
VITE_API_BASE_URL
```

Server:
```
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
VNP_TMN_CODE
VNP_HASH_SECRET
VNP_RETURN_URL
VNP_URL
ZP_APP_ID
ZP_KEY1
ZP_KEY2
AI_SERVICE_URL
AI_API_KEY
```

AI Service:
```bash
MONGO_URIx
MONGO_DB
AI_API_KEY
MODEL_DIR
MODEL_FILENAME
```

## API overview
- /api/auth — Authentication
- /api/users — User management
- /api/upload — Image upload
- /api/categories — Category management
- /api/products — Product management
- /api/cart — Shopping cart
- /api/orders — Order management
- /api/vouchers — Voucher management
- /api/ratings — Product ratings
- /api/revenue — Revenue statistics
- /api/notifications — User notifications
- /api/support — Customer support

## Authors
Specialized Project (TLCN) — Ho Chi Minh City University of Technology and Education

| Name | Student ID | GitHub |
|---|---:|---|
| Lê Huỳnh Như Nguyệt | 22110385 | [@MoonCruella](https://www.github.com/MoonCruella) |
| Phạm Ngọc Hòa | 22110330 | [@HoaPham236](https://github.com/hoapham236) |

## Contact / Questions
For questions, contact: nhunguyetpy206@gmail.com, pnhpy2306@gmail.com
