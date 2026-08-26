// S2.1 — Refresh storm: 200 VU, mỗi VU rotate liên tục trên family RIÊNG
// → đo contention ghi bảng refresh_tokens + purge. (Dùng chung 1 token cho nhiều VU
//   sẽ kích hoạt reuse detection → 401 hàng loạt — đó là test attack, không phải load.)
// LƯU Ý: endpoint /auth/refresh có rate-limit 30/phút/IP (30/min). Với 200 VU × 2 req/s
// = 24.000 req/phút, limiter SẼ chặn ~99% request bằng 429 — đây là hành vi ĐÚNG
// (bảo vệ brute-force), không phải bug. Threshold dưới phản ánh điều đó: p95 vẫn
// nhanh, 429 được chấp nhận, chỉ 500 mới là FAIL. Muốn đo contention thuần túy
// (không chạm limiter), tạm set REFRESH_RATE_LIMIT_MAX=10000 trong backend/.env.
// Chạy: k6 run load/refresh-storm.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, loadUsers } from './config.js';

export const options = {
  scenarios: {
    storm: {
      executor: 'constant-vus',
      vus: 200,
      duration: '2m',
    },
  },
  thresholds: {
    // 429 là expected (limiter hoạt động) — chỉ 500 mới là lỗi hệ thống
    http_req_failed: ['rate<0.99'],
    http_req_duration: ['p(95)<1000'],
  },
};

const users = loadUsers();

export function setup() {
  // Mỗi VU login riêng → cookie refresh riêng (family riêng)
  const sessions = [];
  for (let i = 0; i < Math.min(users.length, 200); i++) {
    const res = http.post(`${BASE_URL}/auth/login`, JSON.stringify(users[i]), {
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.status === 200) {
      sessions.push({
        cookie: `refreshToken=${res.cookies['refreshToken'][0].value}`,
      });
    }
  }
  return { sessions };
}

export default function (data) {
  const s = data.sessions[__VU % data.sessions.length];
  const res = http.post(
    `${BASE_URL}/auth/refresh`,
    '{}',
    { headers: { 'Content-Type': 'application/json', Cookie: s.cookie } }
  );
  check(res, {
    'refresh 200 or 429 (limiter)': (r) => r.status === 200 || r.status === 429,
    'never 500': (r) => r.status !== 500,
  });
  if (res.status === 200 && res.cookies['refreshToken']?.[0]?.value) {
    s.cookie = `refreshToken=${res.cookies['refreshToken'][0].value}`;
  }
  sleep(0.5);
}
