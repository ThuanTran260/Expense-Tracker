# AGENTS.md — Xét Chi Tiêu (Smart Expense Tracker)

Expense tracker: decoupled monorepo — SPA (`/frontend`) gọi REST API (`/backend`) qua `/api/v1`, Prisma ORM → PostgreSQL.

## ⚠️ Instruction sources — đọc trước khi tin

| File | Trạng thái |
|---|---|
| `.gemini/GEMINI.md` | ✅ Áp dụng được: quy tắc git, domain tài chính, bảo mật, UI (tóm tắt bên dưới) |
| `.agents/AGENTS.md`, `.agents/skills/*`, `.agents/*/BRIEFING.md`… | ⚠️ **Stale từ dự án khác ("Flow State": Next.js + Supabase + TipTap)**. Bỏ qua mọi chỉ dẫn Supabase/RLS/Next.js/TipTap — stack thật là Express + Prisma + Vite |
| `README.md` | ✅ Nhưng phần Getting Started dùng `npm install` theo từng thư mục — lỗi thời, xem Commands bên dưới |

Quy tắc bắt buộc kế thừa (GEMINI.md §1): **KHÔNG tự động `git push`** — chỉ commit local rồi báo user.

## Kiến trúc

- **Backend** `expense-tracker-backend`: Node 20, Express 5, TypeScript (CommonJS, ts-node), Prisma 5, Zod, JWT, Winston. Layer: `routes → validators (Zod) → middlewares (JWT/rate-limit) → controllers → services → lib/prisma`. Entry: `src/server.ts` (retry connect DB 10×3s trước khi listen). Models: User, UserSettings, RefreshToken, Category, Transaction, Budget.
- **Frontend** `frontend`: React 19, Vite 8, TS ~6.0, Tailwind v4, React Query v5, React Router v7, Framer Motion. Alias `@/` → `src/`. Dev server port 5173, **đã proxy `/api` → `http://localhost:5000`** (xem `vite.config.ts`) — không cần CORS hay URL tuyệt đối khi dev.
- Auth: Access token 15m (header `Authorization: Bearer`), Refresh token 7d trong HttpOnly cookie, xoay vòng + lưu DB.

## Commands (pnpm workspace)

Root là pnpm workspace (`pnpm-workspace.yaml`). **Dev 1 lệnh từ root: `pnpm dev`** (song song backend :5000 + frontend :5173, đã verify). CI đã chuyển sang pnpm (`pnpm install --frozen-lockfile`, pnpm 11) và **toàn bộ `package-lock.json` npm đã xóa khỏi repo (2026-08-26)** — chỉ dùng `pnpm-lock.yaml`, không tái tạo lockfile npm.

```bash
pnpm dev          # backend :5000 + frontend :5173 song song
pnpm dev:api      # chỉ backend
pnpm dev:web      # chỉ frontend
pnpm db:push      # hoặc db:seed (passthrough sang backend)

# Hoặc chi tiết theo package:
pnpm --filter expense-tracker-backend type-check     # tsc --noEmit
pnpm --filter expense-tracker-backend test           # jest --runInBand --forceExit
pnpm --filter expense-tracker-backend exec jest tests/unit/errors.test.ts   # 1 file test
pnpm --filter frontend build      # tsc -b && vite build (build = typecheck thực tế của frontend)

# Full stack thay thế: docker compose up --build -d (postgres :5432, api :5000, web :80)
```

Verification khi sửa backend: `type-check → test`; frontend: `build`. Backend `lint` script có nhưng **chưa có file config ESLint nào trong repo** → sẽ fail, đừng dùng làm gate.

Test backend đọc `DATABASE_URL` từ `backend/.env` (tests/setup.ts chỉ ghi đè JWT secrets) → cần DB thật đang chạy; CI cấp Postgres service + chạy `prisma generate` → `prisma migrate deploy` trước khi test.

## Plan: gộp `run dev` thành 1 lệnh — ✅ ĐÃ IMPLEMENT (2026-08-26)

Root `package.json` đã có `dev` / `dev:api` / `dev:web` / `db:push` / `db:seed`; smoke test pass (vite ready :5173 + API connect DB :5000 trong cùng 1 lệnh `pnpm dev`). README Getting Started đã cập nhật theo pnpm; CI đã chuyển pnpm + xóa lockfile npm.

## Security posture (2026-08-26)

- `docker-compose.yml`: JWT secrets là **required env** (`${JWT_ACCESS_SECRET:?...}`) — compose từ chối start nếu thiếu, không còn default yếu.
- `backend/src/server.ts`: validate env fail-fast khi khởi động (Zod — `DATABASE_URL`, 2 secret JWT ≥32 ký tự).
- Backend cookie refresh token: `secure` khi production + `sameSite: 'strict'`. **Hệ quả deploy**: API và frontend phải cùng origin (qua proxy/rewrite) — nếu tách domain, cookie strict sẽ không gửi cross-site.
- Đích deploy dự kiến của user: **Supabase (DB) + Vercel — Kịch bản B đã implement (2026-08-26)**: `api/index.ts` export Express app làm Vercel Function + `vercel.json` rewrite `/api/*` → function (same-origin, cookie strict OK) + SPA fallback. Vercel settings: build `pnpm --filter frontend build`, output `frontend/dist`, 4 env vars (`DATABASE_URL` pooler 6543, `DIRECT_URL` direct 5432, 2 JWT secrets riêng cho prod).
- Prisma `binaryTargets = ["native", "rhel-openssl-3.0.x"]` cho runtime Amazon Linux của Vercel; nếu deploy báo thiếu engine thì đổi sang `rhel-openssl-1.0.x`.
- `backend/src/app.ts` có `app.set('trust proxy', 1)` — bắt buộc giữ khi deploy sau proxy (Vercel/Render/Nginx) để rate limiter thấy IP thật.
- Pre-commit hook quét secret đang hoạt động (đã có rule ở mục Git hooks bên dưới).

## UI direction: Phenomenon-clean (áp dụng từ 2026-08-26)

User yêu cầu UI "clean" theo hướng phenomenonstudio.com: paper/ink minimalism. Đã retoken toàn bộ trong `frontend/src/index.css`, **giữ nguyên tên class/keyframe** — mọi component tiếp tục dùng hệ này:

- Palette: bg `#fafaf8`, ink `#141414` làm màu action chính (`--color-primary`), border hairline `#e8e7e3`; dark mode đảo nền/trắng via `[data-theme="dark"]`. Success/danger giữ semantics tài chính.
- Button pill (`border-radius:999px`), không glow-shadow; card phẳng hover chỉ đổi border; bỏ translateX/lift.
- Text trên nền primary phải dùng `--color-primary-contrast` (ví dụ hero banner ExchangeRatePage).
- Số tiền: `font-variant-numeric: tabular-nums`; label micro uppercase `letter-spacing:0.08em`.
- Motion calm `cubic-bezier(0.16,1,0.3,1)`; giữ rule portal/scroll-lock của GEMINI.md cho modal.
- Cấm tái nhập palette indigo cũ (`#6366f1`, `#8b5cf6`) — đã dọn hết khỏi `frontend/src`.

## Domain & style rules (bắt buộc khi viết code)

- **Tiền**: VND hiển thị số nguyên, không thập phân; USD 2 chữ số (`toFixed(2)`/`Intl.NumberFormat`). Tỷ giá từ `open.er-api.com`, phải có fallback offline.
- **Thời gian**: thống kê theo tháng tính đầu tháng `00:00:00.000` → cuối `23:59:59.999` theo múi giờ local user rồi mới convert ISO UTC gửi backend.
- **Modal/popover Apple-style**: render qua `createPortal(..., document.body)` để blur phủ kín cả sidebar; mở modal thì `document.body.style.overflow = 'hidden'`; không dùng native `<select>`/dropdown.
- **Validation**: 100% request body qua Zod schema ở middleware trước controller.
- **Isolation dữ liệu (invariant bảo mật)**: mọi query trong `backend/src/services/*` phải scope theo `userId` (lấy từ JWT, không nhận từ client) + ownership check (`if (record.userId !== userId) throw forbidden`) trước khi get/update/delete. Cấm `$queryRaw`/`$executeRaw` trừ khi có lý do + review.
- **Secrets**: không hardcode; đọc qua `process.env` (`DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`).

## Git hooks

Husky pre-commit quét secret (pattern: `DATABASE_URL=postgresql://...`, JWT secret, `supabase.co`, key AWS/OpenAI/Google; chặn commit file tên `.env`). Commit bị chặn → xóa giá trị thật khỏi staged diff, không dùng `--no-verify`.
