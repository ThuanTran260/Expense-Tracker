# Load Test (S2) — k6 chống backend LOCAL

> ⚠️ Chỉ chạy chống `http://localhost:5000`. **Cấm** bắn production/Supabase.

## 1. Cài đặt một lần

```powershell
# k6 (chọn 1):
winget install k6 --source winget
# hoặc: choco install k6
```

## 2. Chuẩn bị môi trường local

1. **Bật Docker Desktop** → `docker compose up -d postgres`
2. **Tạm đổi `backend/.env`**:
   - `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/expense_tracker` (thay Supabase!)
   - `RATE_LIMIT_MAX_REQUESTS=10000` (nới limiter — load test cần; nhớ giá trị cũ để khôi phục)
3. Đồng bộ DB local + seed danh mục + seed users:
   ```bash
   pnpm db:push
   pnpm --filter expense-tracker-backend db:seed
   node load/seed-users.mjs 200
   ```
4. Chạy backend: `pnpm dev:api` (terminal riêng)

## 3. Chạy các kịch bản

```bash
k6 run load/mixed.js           # ramp 50→200 VU, 80/20 read/write
k6 run load/spike.js           # 500 VU / 30s — tìm pool exhaustion
k6 run load/soak.js            # 100 VU / 30 phút — tìm rò rỉ
k6 run load/refresh-storm.js   # 200 family rotate đồng thời
```

## 4. Đọc kết quả

- `THRESHOLDS` section cuối: tất cả `✓` = đạt (p95 < 800ms, error < 1%)
- Fail bất kỳ → **RCA trước khi tối ưu** (systematic-debugging): kiểm tra
  log backend (query chậm, `Timed out fetching connection`, pgbouncer queue)

## 5. Khôi phục sau test (BẮT BUỘC)

1. Trả `backend/.env` về như cũ (DATABASE_URL Supabase + RATE_LIMIT_MAX_REQUESTS cũ)
2. Xóa `load/users.json` (credential local)
3. Muốn dọn data test local: `docker compose down -v`
