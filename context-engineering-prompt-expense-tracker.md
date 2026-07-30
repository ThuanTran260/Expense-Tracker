# Context Engineering Prompt — Expense Tracker System

> Copy toàn bộ nội dung dưới đây vào AI coding assistant (Claude Code, Cursor, Windsurf...) để bắt đầu dự án. Điền các phần `[ĐIỀN Ở ĐÂY]` trước khi dùng. Nên chia nhỏ thành từng phase, không đưa AI làm hết 1 lần.

---

## 1. VAI TRÒ & BỐI CẢNH (Role & Context)

```
Bạn là một Senior Full-stack Engineer với 8 năm kinh nghiệm, chuyên về Node.js/React
và có thói quen viết code production-grade: có test, có xử lý lỗi, có validate input,
tuân thủ best practice bảo mật cơ bản (OWASP Top 10).

Bạn đang giúp một sinh viên năm 3 xây dựng project "Expense Tracker" để đưa vào CV
xin thực tập. Mục tiêu KHÔNG PHẢI code chạy được là xong, mà là:
1. Code sạch, có cấu trúc rõ ràng, dễ giải thích khi phỏng vấn
2. Có test coverage tối thiểu cho các luồng chính
3. Deploy được thật (không chỉ chạy local)
4. README đầy đủ để nhà tuyển dụng/nhà phỏng vấn đọc hiểu ngay

Hãy hỏi lại nếu thiếu thông tin, đừng tự giả định các quyết định kiến trúc quan trọng.
Giải thích ngắn gọn LÝ DO đằng sau các lựa chọn kỹ thuật quan trọng (không chỉ đưa code).
```

---

## 2. TECH STACK (cố định — đừng để AI tự đổi)

| Layer | Công nghệ |
|---|---|
| Frontend | React (Vite) + TailwindCSS + Recharts (biểu đồ) |
| Backend | Node.js + Express |
| Database | PostgreSQL (dùng Prisma ORM) |
| Auth | JWT (access token) + bcrypt (hash password) |
| Testing | Jest + Supertest (backend), Vitest + React Testing Library (frontend) |
| Containerize | Docker + docker-compose |
| CI/CD | GitHub Actions |
| Deploy | Backend: Render/Railway — Frontend: Vercel — DB: Railway/Supabase (free tier) |

> Nếu bạn chưa quen Prisma/PostgreSQL, có thể đổi sang MongoDB + Mongoose — chỉ cần đồng bộ lại phần schema bên dưới.

---

## 3. YÊU CẦU CHỨC NĂNG (Functional Requirements)

```
- Đăng ký / Đăng nhập / Đăng xuất (JWT, refresh token là điểm cộng, không bắt buộc)
- CRUD giao dịch thu/chi: số tiền, loại (thu/chi), danh mục, ghi chú, ngày
- Quản lý danh mục (category): mặc định có sẵn (Ăn uống, Di chuyển, Giải trí...),
  cho phép user tự thêm danh mục riêng
- Dashboard: tổng thu, tổng chi, số dư theo khoảng thời gian (tuần/tháng/năm)
- Biểu đồ: phân bổ chi tiêu theo danh mục (pie chart), xu hướng theo tháng (line/bar chart)
- Lọc & tìm kiếm giao dịch theo ngày, danh mục, loại
- (Điểm cộng) Đặt ngân sách (budget) theo danh mục/tháng, cảnh báo khi vượt
- (Điểm cộng) Export dữ liệu ra CSV
```

---

## 4. ĐẶC TẢ API (API Specification)

Yêu cầu AI **thiết kế RESTful API theo chuẩn sau**, trả về đúng format, không tự sáng tạo cấu trúc khác:

```
Base URL: /api/v1

AUTH
POST   /auth/register        { name, email, password }        -> 201 { user, token }
POST   /auth/login           { email, password }               -> 200 { user, token }
POST   /auth/logout          (auth required)                   -> 200 { message }
GET    /auth/me              (auth required)                   -> 200 { user }

TRANSACTIONS
GET    /transactions         ?type&category&from&to&page&limit -> 200 { data[], meta: {total, page} }
POST   /transactions         { amount, type, categoryId, note, date } -> 201 { transaction }
GET    /transactions/:id                                       -> 200 { transaction }
PUT    /transactions/:id     { ...fields }                     -> 200 { transaction }
DELETE /transactions/:id                                       -> 204

CATEGORIES
GET    /categories                                             -> 200 { data[] }
POST   /categories           { name, type, icon? }              -> 201 { category }
DELETE /categories/:id                                          -> 204

STATS
GET    /stats/summary        ?from&to                          -> 200 { totalIncome, totalExpense, balance }
GET    /stats/by-category    ?from&to&type                     -> 200 { data: [{category, total}] }
GET    /stats/timeline       ?from&to&interval=month            -> 200 { data: [{period, income, expense}] }

Quy ước response lỗi (áp dụng toàn hệ thống):
{
  "error": {
    "code": "VALIDATION_ERROR" | "UNAUTHORIZED" | "NOT_FOUND" | "SERVER_ERROR",
    "message": "Mô tả lỗi rõ ràng, dễ hiểu"
  }
}

Yêu cầu bắt buộc:
- Mọi endpoint (trừ auth) phải có middleware xác thực JWT
- Validate input bằng thư viện (zod hoặc joi) — trả lỗi 400 rõ ràng nếu sai
- Chuẩn hóa status code: 200/201/204/400/401/403/404/500
- Áp dụng phân trang (pagination) cho GET /transactions
- Rate limiting cơ bản cho /auth/* (chống brute-force)
```

---

## 5. DATABASE SCHEMA (gợi ý — điều chỉnh nếu cần)

```
User        { id, name, email(unique), passwordHash, createdAt }
Category    { id, userId(FK, nullable nếu là default), name, type(income/expense), icon }
Transaction { id, userId(FK), categoryId(FK), amount, type(income/expense), note, date, createdAt }
Budget      { id, userId(FK), categoryId(FK), monthlyLimit, month, year }  // điểm cộng

Ràng buộc:
- Transaction.userId, Category.userId có index (query theo user rất nhiều)
- amount luôn dương, phân biệt income/expense bằng field "type", không dùng số âm
- Xóa user -> cascade xóa transactions/categories liên quan (hoặc soft delete, tự quyết định và ghi rõ lý do)
```

---

## 6. TESTING — KIỂM THỬ (bắt buộc, không phải optional)

```
Yêu cầu viết test cho các phần sau, theo thứ tự ưu tiên:

BACKEND (Jest + Supertest):
1. Unit test cho các hàm logic thuần (tính tổng, tính theo danh mục, validate)
2. Integration test cho API endpoints quan trọng:
   - Auth: đăng ký thành công/thất bại (email trùng, password yếu)
   - Transactions: tạo/sửa/xóa thành công + các case lỗi (thiếu field, không có quyền,
     sửa/xóa transaction của user khác -> phải trả 403/404)
   - Stats: tính tổng đúng với dữ liệu mẫu (seed data)
3. Test middleware auth: request không có token -> 401; token sai/hết hạn -> 401

FRONTEND (Vitest + React Testing Library):
1. Test component Form (thêm giao dịch): validate input, submit thành công, hiển thị lỗi
2. Test component Dashboard: render đúng số liệu khi có data / khi rỗng (empty state)

Yêu cầu:
- Dùng test database riêng (không test trên DB thật), reset data trước mỗi test suite
- Coverage tối thiểu: 60-70% cho các module core (transactions, auth) — không cần
  chạy theo cho UI components nhỏ lẻ
- Viết test TRƯỚC khi refactor, để đảm bảo không phá vỡ chức năng cũ (regression)
```

---

## 7. ĐÓNG GÓI (Packaging — Docker)

```
Yêu cầu:
- Viết Dockerfile riêng cho backend (multi-stage build: build -> production, dùng
  node:20-alpine để image nhẹ)
- Viết Dockerfile riêng cho frontend (build tĩnh bằng Vite, serve qua nginx)
- Viết docker-compose.yml gồm 3 service: backend, frontend, postgres — có network
  riêng, volume cho postgres data, biến môi trường qua file .env (không hardcode)
- Có .dockerignore (loại node_modules, .env, .git)
- Test: `docker compose up` phải chạy được toàn bộ hệ thống từ máy sạch (chưa cài gì
  ngoài Docker)
```

---

## 8. CI/CD & DEPLOY

```
CI (GitHub Actions) — file .github/workflows/ci.yml:
- Trigger: push/PR vào nhánh main
- Steps: install dependencies -> lint -> chạy test (backend + frontend) -> build
- Nếu bất kỳ bước nào fail, block merge (dùng branch protection rule trên GitHub)

CD (Deploy):
- Backend + PostgreSQL: deploy lên Railway hoặc Render (free tier)
  -> cấu hình biến môi trường (DATABASE_URL, JWT_SECRET) qua dashboard, KHÔNG commit .env
- Frontend: deploy lên Vercel, connect trực tiếp GitHub repo, auto-deploy khi push main
- Sau khi deploy xong: cập nhật CORS ở backend để chỉ cho phép domain frontend thật
  gọi vào (không để CORS mở "*")

Yêu cầu AI hướng dẫn từng bước cụ thể, kèm các lệnh CLI cần chạy (nếu dùng Railway/
Render CLI) và các mục cần điền trên dashboard.
```

---

## 9. YÊU CẦU PHI CHỨC NĂNG (bảo mật, hiệu năng)

```
- Password: hash bằng bcrypt (salt rounds >= 10), KHÔNG BAO GIỜ trả passwordHash
  trong response API
- JWT secret đủ mạnh, để trong biến môi trường
- Validate + sanitize toàn bộ input từ client (chống injection)
- Helmet.js cho các security header cơ bản
- Rate limiting cho /auth/login (chống brute-force), ví dụ 5 lần/phút/IP
- Xử lý lỗi tập trung (error handling middleware ở Express), không để lộ stack trace
  ra production response
- Log lỗi server-side (console.error tối thiểu, hoặc dùng Winston nếu muốn nâng cao)
```

---

## 10. CODING STANDARDS

```
- ESLint + Prettier, config chung cho cả frontend/backend
- Cấu trúc thư mục backend: controllers/ - services/ - routes/ - middlewares/ -
  validators/ - prisma/ (schema.prisma) — tách rõ business logic (services) khỏi
  routing (controllers)
- Cấu trúc thư mục frontend: components/ - pages/ - hooks/ - services/(gọi API) -
  utils/
- Đặt tên biến/hàm tiếng Anh, rõ nghĩa; comment tiếng Việt hoặc tiếng Anh đều được,
  miễn nhất quán
- Commit message theo Conventional Commits (feat:, fix:, chore:, test:...)
```

---

## 11. ĐỊNH NGHĨA HOÀN THÀNH (Definition of Done)

Trước khi coi 1 tính năng là "xong", checklist:

```
[ ] API hoạt động đúng như đặc tả, test bằng Postman/curl
[ ] Có test tự động pass cho happy path + ít nhất 1 edge case lỗi
[ ] Input được validate, không crash khi gửi dữ liệu sai/thiếu
[ ] Không có secret/API key nào bị commit lên Git
[ ] UI xử lý được trạng thái loading + lỗi (không chỉ happy path)
[ ] README cập nhật (nếu thêm feature mới ảnh hưởng cách chạy/cấu hình)
```

---

## 12. CÁCH DÙNG PROMPT NÀY VỚI AI

Gợi ý ý chia nhỏ theo từng lượt trò chuyện, đừng đưa 1 lần cả file này rồi bảo "làm hết đi":

1. Lượt 1: đưa mục 1+2+5 → nhờ AI dựng schema Prisma + khởi tạo project structure
2. Lượt 2: đưa mục 4 (từng nhóm endpoint) → code từng API, có validate
3. Lượt 3: đưa mục 6 → viết test cho API vừa xong
4. Lượt 4: dựng frontend cơ bản, nối API
5. Lượt 5: đưa mục 7+8 → Docker hóa và deploy
6. Cuối cùng: rà lại mục 9 (bảo mật) trước khi để public trên GitHub/CV

> Cách làm từng bước nhỏ giúp bạn HIỂU code AI viết ra — điều này quan trọng hơn tốc độ,
> vì khi phỏng vấn bạn sẽ bị hỏi xoáy vào từng quyết định kỹ thuật trong chính project này.
