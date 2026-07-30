# 💰 Expense Tracker System — Quản Lý Chi Tiêu Cá Nhân

> Dự án Web Application Full-stack dành cho CV/Portfolio với tiêu chuẩn **Production-Grade**: Type-safe end-to-end, JWT Authentication với Refresh Token trong HttpOnly Cookie, Data Visualization (Biểu đồ Recharts), Lưu trữ cấu hình người dùng vĩnh viễn trên Database, Dockerized & CI/CD ready.

---

## 🌟 Tính Năng Nổi Bật

- **Authentication & Security**:
  - Đăng ký, đăng nhập với mã hóa mật khẩu `bcryptjs` (salt rounds = 12).
  - Cơ chế **Access Token (15m)** và **Refresh Token (7d)** lưu trong `HttpOnly Cookie` chống lỗ hổng XSS & CSRF.
  - Tự động gia hạn session (Auto-refresh token) khi token hết hạn.
  - Security headers với `Helmet.js`, Rate-limiting chống brute-force.
- **Quản lý Thu/Chi & Danh Mục**:
  - CRUD giao dịch Thu nhập & Chi tiêu với phân trang server-side (`pagination`), tìm kiếm & bộ lọc động theo khoảng ngày, danh mục, loại thu/chi.
  - Pre-seed danh mục hệ thống mặc định (Ăn uống, Mua sắm, Lương...) & cho phép người dùng tự tạo danh mục cá nhân.
  - **Export CSV**: Xuất dữ liệu giao dịch ra file CSV chuẩn UTF-8 (mở trực tiếp bằng Excel không lỗi font).
- **Ngân Sách & Cảnh Báo (Budgeting)**:
  - Đặt hạn mức ngân sách tháng theo từng danh mục.
  - Thanh tiến độ màu sắc động (**Xanh/Vàng/Đỏ**) hiển thị mức độ chi tiêu thực tế so với hạn mức (Cảnh báo vượt 80% / 100%).
- **Lưu Cấu Hình Người Dùng Vĩnh Viễn (`UserSettings`)**:
  - Tự động tạo bản ghi cài đặt 1-1 gắn liền với `User ID` trên CSDL.
  - Đổi giao diện **Dark/Light Mode**, đơn vị tiền tệ (**VND / USD**), ngôn ngữ, ngưỡng cảnh báo.
  - **Đăng nhập ở bất kỳ máy tính/trình duyệt nào đều khôi phục chính xác 100% dữ liệu và cài đặt cũ.**
- **Dashboard & Visualization**:
  - Cards tổng quan: **Tổng thu, Tổng chi, Số dư**.
  - **Biểu đồ tròn (Pie Chart)**: Phân bổ phần trăm chi tiêu theo danh mục.
  - **Biểu đồ cột (Bar Chart)**: Biến động Thu vs Chi theo thời gian.
  - Danh sách 5 giao dịch gần đây nhất.

---

## 🛠️ Tech Stack

### Backend (`/backend`)
- **Runtime & Framework**: Node.js v20/24 + Express + TypeScript
- **Database & ORM**: PostgreSQL + Prisma ORM (5 bảng: `User`, `UserSettings`, `RefreshToken`, `Category`, `Transaction`, `Budget`)
- **Auth**: JWT + `bcryptjs` + `cookie-parser`
- **Validation**: Zod (Type-safe input validation)
- **Logging**: Winston logger (JSON format production, colorized dev)
- **Testing**: Jest + Supertest

### Frontend (`/frontend`)
- **Core**: React 18 + Vite + TypeScript
- **Styling**: Vanilla CSS Design Tokens (CSS Custom Properties) + TailwindCSS
- **State & Data Fetching**: `@tanstack/react-query` + Axios (với auto-refresh interceptor)
- **Forms**: React Hook Form + Zod (`@hookform/resolvers/zod`)
- **Data Visualization**: Recharts
- **Icons**: Lucide Icons

---

## 🚀 Hướng Dẫn Chạy Local

### Cách 1: Chạy trực tiếp qua Node.js (Development)

#### 1. Yêu cầu hệ thống
- Node.js >= 20
- PostgreSQL database (cục bộ hoặc Supabase / Railway Postgres free tier)

#### 2. Khởi tạo Backend
```bash
cd backend

# Copy file cấu hình môi trường
cp .env.example .env

# Cập nhật DATABASE_URL trong .env với kết nối Postgres của bạn:
# DATABASE_URL="postgresql://postgres:password@localhost:5432/expense_tracker_dev?schema=public"

# Cài đặt dependencies
npm install

# Push schema & seed dữ liệu danh mục mặc định
npx prisma db push
npm run db:seed

# Khởi chạy dev server (chạy ở http://localhost:5000)
npm run dev
```

#### 3. Khởi tạo Frontend
```bash
cd frontend

# Cài đặt dependencies
npm install

# Khởi chạy dev server (chạy ở http://localhost:5173)
npm run dev
```

---

### Cách 2: Chạy qua Docker Compose (Toàn bộ hệ thống trong 1 câu lệnh)

Yêu cầu đã cài đặt **Docker** & **Docker Compose**.

```bash
# Tại thư mục gốc dự án:
docker compose up --build -d
```
Hệ thống sẽ tự động dựng 3 containers:
- **PostgreSQL**: `localhost:5432`
- **Backend API**: `localhost:5000`
- **Frontend App**: `localhost:80`

---

## 🧪 Testing & Code Quality

```bash
# Chạy Unit Tests ở Backend
cd backend
npm test

# Type-check TypeScript ở cả 2 dự án
cd backend && npm run type-check
cd frontend && npx tsc --noEmit
```

---

## 📐 Cấu Trúc Thư Mục Dự Án

```
Xet Chi Tieu/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # Prisma Schema (5 models: User, UserSettings, RefreshToken, Category, Transaction, Budget)
│   │   └── seed.ts             # Script seed 15 danh mục mặc định
│   ├── src/
│   │   ├── controllers/        # Thin HTTP Request Handlers
│   │   ├── services/           # Business Logic Layer
│   │   ├── routes/             # Express API Routers
│   │   ├── middlewares/        # Auth, RateLimit, Error Handling
│   │   ├── validators/         # Zod Schema Validators
│   │   ├── utils/              # Custom AppError & ErrorCodes
│   │   ├── lib/                # Singleton Prisma Client & Winston Logger
│   │   ├── app.ts              # Express App Setup
│   │   └── server.ts           # Server Entry Point
│   ├── tests/                  # Jest Unit & Integration Tests
│   └── Dockerfile              # Multi-stage Docker Build
│
├── frontend/
│   ├── src/
│   │   ├── components/         # Layout, Sidebar, ProtectedRoute
│   │   ├── contexts/           # AuthContext (Auto theme restore from UserSettings)
│   │   ├── pages/              # Dashboard, Transactions, Budgets, Settings, Login, Register
│   │   ├── services/           # Centralized API Service Layer
│   │   ├── lib/                # Axios Client with Auto-Refresh Interceptor
│   │   └── index.css           # Global Design Tokens & Dark Mode
│   └── Dockerfile              # Nginx SPA Serve
│
├── .github/workflows/
│   └── ci.yml                  # GitHub Actions CI Workflow
├── docker-compose.yml          # Multi-container Setup (Postgres + BE + FE)
└── README.md
```
