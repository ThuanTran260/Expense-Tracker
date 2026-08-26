// S2.1 — Refresh storm: 200 VU, mỗi VU rotate liên tục trên family RIÊNG
// → đo contention ghi bảng refresh_tokens + purge. (Dùng chung 1 token cho nhiều VU
//   sẽ kích hoạt reuse detection → 401 hàng loạt — đó là test attack, không phải load.)
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
    http_req_failed: ['rate<0.02'],
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
  check(res, { 'refresh 200': (r) => r.status === 200 });
  if (res.status === 200) {
    s.cookie = `refreshToken=${res.cookies['refreshToken'][0].value}`;
  }
  sleep(0.5);
}
