# 💰 Expense Tracker — Local Project Rules & AI Assistant Guidelines

> **Tài liệu quy tắc & tiêu chuẩn phát triển dự án (GEMINI.md)**: Định hình kiến trúc, quy chuẩn bảo mật tài chính, thiết kế UI/UX và bộ kỹ năng được tối ưu riêng cho dự án **Xét Chi Tiêu (Smart Expense Tracker)**.

---

## 🚫 1. QUY TẮC GIT & REMOTE REPOSITORY (BẮT BUỘC)
- **TUYỆT ĐỐI KHÔNG TỰ ĐỘNG `git push`**:
  - AI Assistant chỉ thực hiện các thao tác Git cục bộ (`git add`, `git commit`, `git status`, `git diff`, `git branch`).
  - Sau khi hoàn thành và commit xong, chỉ thông báo cho người dùng và để người dùng tự quyết định thời điểm push lên GitHub.

---

## 🏛️ 2. KIẾN TRÚC HỆ THỐNG & TECH STACK
- **Mô hình**: Decoupled Client-Server Monorepo.
  - **Frontend (`/frontend`)**: React 19, TypeScript, Vite 8, React Router v7, `@tanstack/react-query` v5, Axios, Recharts, Framer Motion v12, TailwindCSS v4.
  - **Backend (`/backend`)**: Node.js, Express 5, TypeScript, Prisma ORM 5.22, PostgreSQL, Zod, JWT, bcryptjs, Helmet, Winston Logger.
  - **DevOps**: Docker, Docker Compose (3 containers: Frontend Nginx, Backend Node, PostgreSQL).

---

## 💵 3. NGUYÊN TẮC NGHIỆP VỤ TÀI CHÍNH (FINANCIAL DOMAIN RULES)
1. **Độ chính xác tiền tệ (Currency Precision)**:
   - `VND`: Đơn vị tiền tệ số nguyên (làm tròn số, không dùng phần thập phân khi hiển thị).
   - `USD`: Đơn vị tiền tệ có 2 chữ số thập phân (`.toFixed(2)` / `Intl.NumberFormat`).
   - Tỷ giá USD/VND: Lấy tự động qua Open Exchange API (`open.er-api.com`), có fallback cố định nếu mất mạng.
2. **Xử lý Ngày Tháng & Múi Giờ**:
   - Truy vấn thống kê theo tháng phải tính chuẩn mốc đầu tháng `00:00:00.000` đến cuối tháng `23:59:59.999` theo múi giờ local của người dùng trước khi chuyển sang ISO UTC gửi lên Backend.
3. **Hướng UI Phenomenon-clean (thay cho Apple HIG — đồng bộ từ 2026-08-26)**:
   - Định hướng hiện tại: **paper/ink minimalism** (nền giấy `#fafaf8`, mực `#141414`, hairline border, button pill) — chi tiết token xem `AGENTS.md` root §"UI direction". Toàn bộ design tokens nằm trong `frontend/src/index.css`.
   - Vẫn giữ nguyên quy tắc Modal/popover: bắt buộc dùng `createPortal(..., document.body)` để lớp phủ blur phủ kín 100% màn hình kể cả Sidebar; khi mở Modal khóa cuộn trang (`document.body.style.overflow = 'hidden'`) và chặn sự kiện cuộn chuột.
   - Giữ hiệu ứng chuyển đổi số cuộn (`AnimatedNumber.tsx`) mượt mà với Framer Motion; motion tổng thể calm `cubic-bezier(0.16,1,0.3,1)`, không bounce/glow.
   - Cấm tái nhập palette indigo cũ (`#6366f1`, `#8b5cf6`); màu action chính là ink qua `--color-primary`, text trên nền đó dùng `--color-primary-contrast`.

---

## 🛡️ 4. BẢO MẬT & QUẢN LÝ DỮ LIỆU
1. **Quản lý Token Đa lớp (JWT Tokens)**:
   - **Access Token (15 phút)**: Trả về JSON, lưu trong Header `Authorization: Bearer <token>`.
   - **Refresh Token (7 ngày)**: Lưu trong `HttpOnly Cookie` (có cờ `SameSite: strict`, `Secure` trên production), tự động xoay vòng và lưu DB để hỗ trợ thu hồi quyền khi logout.
2. **Zero Hardcoded Secrets**:
   - Mọi biến nhạy cảm (`DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`) phải đọc qua `process.env`.
   - File `.env` thật luôn được `.gitignore` bảo vệ và kiểm tra qua pre-commit hook.
3. **Xác thực Đầu vào (Strict Input Validation)**:
   - 100% Request Body từ client phải được validate qua **Zod Schema** ở tầng Middleware trước khi vào Controller.

---

## 🎯 5. BỘ KỸ NĂNG KHUYẾN NGHỊ (RECOMMENDED SKILLS)
Khi phát triển các module trong dự án này, AI Assistant nên áp dụng các kỹ năng:
- **`tdd` (Test-Driven Development)**: Áp dụng khi viết logic tính toán số dư, hàm chuyển đổi tiền tệ, và bộ lọc giao dịch.
- **`diagnosing-bugs`**: Áp dụng khi gặp lỗi lệch múi giờ biểu đồ, lỗi re-fetch React Query, hoặc giật lag animation.
- **`code-review`**: Rà soát 2 trục (Tiêu chuẩn code + Đúng yêu cầu bài toán) trước mỗi lần commit.
