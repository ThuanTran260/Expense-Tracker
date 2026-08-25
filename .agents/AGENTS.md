# Context Engineering & AI Execution Rules — Xét Chi Tiêu (Smart Expense Tracker)

> Bộ quy tắc bắt buộc cho AI Agent khi làm việc trên repo này. Kiến trúc chi tiết + commands xem `AGENTS.md` (root); domain tài chính/bảo mật xem `.gemini/GEMINI.md`.
> Lịch sử: nội dung cũ của file này thuộc dự án khác ("Flow State" — Next.js + Supabase + TipTap) và đã bị thay thế toàn bộ.

---

## 🚫 QUY TẮC GIT (BẮT BUỘC)
- **TUYỆT ĐỐI KHÔNG tự động `git push`.** Chỉ làm local (`add`, `commit`, `status`, `diff`, `branch`), xong thì báo user tự push.
- Không commit khi chưa được yêu cầu. Pre-commit hook quét secret — bị chặn thì xóa giá trị thật, **không dùng `--no-verify`**.

## 🧠 Quy tắc xử lý bắt buộc (Superpowers)

1. **`systematic-debugging` khi có bug** — THE IRON LAW: không sửa code khi chưa tìm ra Root Cause. Với UI lỗi hiển thị, phân tích trước: Stacking Context (`backdrop-blur`, `transform`), Overflow Clipping, z-index, `dvh`, virtual keyboard. Ưu tiên giải pháp bền vững (`createPortal`) hơn vá bề mặt (tăng z-index tạm).
2. **`verification-before-completion` trước khi báo hoàn thành** — không tuyên bố "done/fixed" nếu chưa chạy gate thực tế của repo này:
   - Backend: `pnpm --filter expense-tracker-backend type-check` rồi `pnpm --filter expense-tracker-backend test` (cần PostgreSQL đang chạy + `backend/.env`).
   - Frontend: `pnpm --filter frontend build` (= typecheck + build thật).
   - Backend có script `lint` nhưng **chưa có ESLint config** → fail, đừng dùng làm gate.
3. **`writing-plans`: tạo `implementation_plan.md` và chờ user duyệt** trước khi làm thay đổi kiến trúc/UI nặng.

## 🎯 Skills khuyên dùng theo ngữ cảnh dự án

| Skill | Khi nào |
|---|---|
| `test-driven-development` | Logic số dư, quy đổi tiền tệ, bộ lọc giao dịch, Zod schemas |
| `systematic-debugging` | Lệch múi giờ biểu đồ, re-fetch React Query, giật animation, modal blur bị cắt |
| `verification-before-completion` | Luôn, trước mọi claim hoàn thành (gate ở trên) |
| `brainstorming` / `writing-plans` / `executing-plans` | Feature mới, refactor lớn |

> Skill `tiptap-prosemirror-best-practices` đã bị xóa (thuộc stack TipTap, không dùng trong dự án này).

## 🏛️ Bối cảnh nhanh (chi tiết trong `AGENTS.md` root)
- Monorepo pnpm workspace: `/frontend` (React 19 + Vite 8 + Tailwind v4 + React Query v5) ↔ `/backend` (Express 5 + Prisma 5 + Zod + JWT) qua REST `/api/v1`; vite đã proxy `/api` → :5000.
- Dev 1 lệnh từ root: `pnpm dev` (chạy song song backend :5000 + frontend :5173).
- Hướng UI hiện tại: **Phenomenon-clean minimalism** (paper/ink, pill buttons, typography-first, ít shadow) — tuân thủ vẫn các rule Apple-style trong GEMINI.md về portal/modal/scroll-lock.
