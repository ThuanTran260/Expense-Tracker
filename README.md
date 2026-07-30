# 💰 Expense Tracker — Ứng Dụng Quản Lý Chi Tiêu Cá Nhân Smart & Intuitive

**Expense Tracker** là giải pháp quản lý tài chính cá nhân toàn diện, giúp bạn dễ dàng ghi chép thu chi, theo dõi ngân sách hàng tháng và phân tích thói quen tiêu dùng thông qua biểu đồ trực quan. Ứng dụng được xây dựng với kiến trúc hiện đại, hỗ trợ lưu trữ đám mây đồng bộ vĩnh viễn và giao diện tùy biến linh hoạt.

---

## 🌟 Tính Năng Cốt Lõi

### 1. Quản Lý Thu - Chi & Giao Dịch
* **Ghi chép nhanh chóng**: Thêm, sửa, xóa các khoản thu nhập hoặc chi tiêu với đầy đủ thông tin (số tiền, danh mục, ngày tháng, ghi chú).
* **Danh mục linh hoạt**: Sử dụng bộ danh mục mặc định (Ăn uống, Di chuyển, Lương, Mua sắm...) hoặc tự tạo danh mục riêng theo nhu cầu cá nhân.
* **Bộ lọc & Tìm kiếm thông minh**: Lọc giao dịch theo loại (Thu/Chi), khoảng thời gian, danh mục hoặc tìm kiếm nhanh theo từ khóa ghi chú.
* **Phân trang dữ liệu**: Xử lý mượt mà danh sách giao dịch lớn với phân trang server-side.
* **Xuất báo cáo (Export CSV)**: Trích xuất lịch sử giao dịch ra file CSV chuẩn UTF-8 (mở trực tiếp bằng Excel không lỗi font).

### 2. Ngân Sách & Cảnh Báo Thông Minh (Budgeting)
* **Thiết lập hạn mức**: Đặt ngân sách chi tiêu tháng cho từng danh mục cụ thể.
* **Theo dõi tiến độ trực quan**: Thanh tiến độ đổi màu tự động (**Xanh ➔ Vàng ➔ Đỏ**) tương ứng với mức độ tiêu dùng.
* **Cảnh báo vượt hạn mức**: Tự động phát tín hiệu cảnh báo khi chi tiêu cán mốc 80% hoặc vượt 100% ngân sách đã đề ra.

### 3. Dashboard & Phân Tích Tài Chính
* **Thống kê tổng quan**: Cập nhật số liệu Real-time về Tổng thu, Tổng chi và Số dư thực tế trong tháng.
* **Biểu đồ tròn (Pie Chart)**: Trực quan hóa tỷ lệ phần trăm chi tiêu giữa các danh mục.
* **Biểu đồ cột (Bar Chart)**: Theo dõi biến động Thu nhập vs Chi tiêu theo từng tháng.
* **Giao dịch gần đây**: Hiển thị nhanh các dòng tiền mới phát sinh.

### 4. Cá Nhân Hóa & Bảo Mật
* **Lưu cấu hình vĩnh viễn (`UserSettings`)**: Lưu giữ giao diện **Dark/Light Mode**, đơn vị tiền tệ (**VND / USD**), ngôn ngữ và ngưỡng cảnh báo trực tiếp trên CSDL Cloud. Đăng nhập ở bất kỳ thiết bị nào cũng khôi phục chính xác trạng thái cài đặt cũ.
* **Bảo mật đa lớp**: Mã hóa mật khẩu chuẩn `bcryptjs`, cơ chế xác thực **Access Token (15m)** & **Refresh Token (7d)** lưu trong `HttpOnly Cookie` bảo vệ chống lỗ hổng XSS & CSRF.

---

## 🛠️ Công Nghệ Sử Dụng (Tech Stack)

### Frontend
* **Core**: React 18, Vite, TypeScript
* **State & Data Fetching**: `@tanstack/react-query`, Axios (Auto-refresh token interceptor)
* **Data Visualization**: Recharts
* **Styling**: Vanilla CSS Design Tokens (Custom Properties) + TailwindCSS
* **Form & Validation**: React Hook Form, Zod

### Backend
* **Runtime & Framework**: Node.js, Express, TypeScript
* **Database & ORM**: PostgreSQL, Prisma ORM
* **Authentication**: JWT, `bcryptjs`, `cookie-parser`
* **Security & Utility**: Helmet.js, Express Rate Limit, Winston Logger, Zod Validation

### DevOps & Infrastructure
* **Containerization**: Docker, Docker Compose (Multi-stage build)
* **CI/CD**: GitHub Actions
* **Database Cloud**: Hỗ trợ kết nối Supabase / Railway / PostgreSQL local

---

## 🚀 Hướng Dẫn Khởi Chạy

### Cách 1: Chạy trực tiếp qua Node.js (Khuyên dùng khi Dev)

#### 1. Khởi tạo Backend
```bash
cd backend

# Copy file cấu hình môi trường
cp .env.example .env

# Cập nhật DATABASE_URL trong .env với PostgreSQL của bạn (hoặc Supabase URI)
# DATABASE_URL="postgresql://postgres:password@localhost:5432/expense_tracker?schema=public"

# Cài đặt dependencies
npm install

# Tạo bảng CSDL & nạp danh mục mặc định
npx prisma db push
npm run db:seed

# Khởi chạy Backend API (http://localhost:5000)
npm run dev
```

#### 2. Khởi tạo Frontend
```bash
cd frontend

# Cài đặt dependencies & khởi chạy
npm install
npm run dev
```
👉 Mở trình duyệt tại: **`http://localhost:5173`**

---

### Cách 2: Chạy toàn bộ qua Docker Compose

Yêu cầu đã cài đặt **Docker Desktop**.

```bash
# Tại thư mục gốc dự án:
docker compose up --build -d
```
Hệ thống sẽ tự động khởi chạy 3 dịch vụ:
* **Frontend Web App**: `http://localhost` (Port 80)
* **Backend API**: `http://localhost:5000`
* **PostgreSQL Database**: `localhost:5432`

---

## 🔮 Các Cải Tiến & Tính Năng Sắp Tới (Roadmap)

Dự án đang tiếp tục được nâng cấp với các tính năng dự kiến ra mắt trong các phiên bản tiếp theo:

- [ ] 📲 **PWA & Mobile Viewport**: Tối ưu trải nghiệm màn hình dọc và hỗ trợ cài đặt ứng dụng web (Progressive Web App) trực tiếp trên điện thoại.
- [ ] 🤖 **AI Financial Assistant**: Tích hợp AI phân tích thói quen tiêu dùng, đưa ra lời khuyên tiết kiệm và cảnh báo các khoản chi bất thường.
- [ ] 🧾 **Quét Hóa Đơn Tự Động (OCR)**: Cho phép chụp ảnh hóa đơn/biên lai để tự động bóc tách số tiền và tạo giao dịch mà không cần nhập tay.
- [ ] 🔄 **Giao Dịch Định Kỳ (Recurring Transactions)**: Tự động ghi nhận các khoản thu/chi cố định lặp lại theo chu kỳ (tiền nhà, tiền mạng, lương hàng tháng).
- [ ] 👥 **Quản Lý Chi Tiêu Nhóm / Split Bill**: Hỗ trợ tạo ví chung cho gia đình hoặc nhóm bạn, tự động tính toán chia tiền chuyến đi.
- [ ] 🔔 **Thông Báo Qua Telegram / Email**: Gửi thông báo nhắc nhở khi đến ngày thanh toán hóa đơn hoặc khi ngân sách chi tiêu đạt ngưỡng cảnh báo.

---

## 📐 Cấu Trúc Thư Mục

```
Xet Chi Tieu/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # Prisma Schema (User, UserSettings, RefreshToken, Category, Transaction, Budget)
│   │   └── seed.js             # Script nạp 15 danh mục mặc định
│   ├── src/
│   │   ├── controllers/        # Thin Controllers Layer
│   │   ├── services/           # Business Logic Layer
│   │   ├── routes/             # Express API Routers
│   │   ├── middlewares/        # JWT Auth, Rate Limiter, Error Handler
│   │   ├── validators/         # Zod Schemas
│   │   └── server.ts           # Server Entry Point
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── components/         # Layout, Sidebar, ProtectedRoute
│   │   ├── contexts/           # AuthContext (Auto apply UserSettings theme/currency)
│   │   ├── pages/              # Dashboard, Transactions, Budgets, Settings, Login, Register
│   │   ├── services/           # Centralized API Calls
│   │   └── index.css           # Global Design System & Dark Mode
│   └── Dockerfile
│
├── .github/workflows/ci.yml    # CI Pipeline
├── docker-compose.yml          # Container Orchestration
└── README.md
```

---

## 📄 License

Dự án phát triển mã nguồn mở dưới giấy phép [MIT License](LICENSE).
