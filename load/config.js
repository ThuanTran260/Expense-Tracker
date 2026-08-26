// Shared config + helpers cho k6 load tests
// Chạy chống BACKEND LOCAL (http://localhost:5000) — KHÔNG bắn production.
// Trước khi chạy: xem load/README.md (Docker Postgres + seed users + nới rate limit).

import http from 'k6/http';
import { check } from 'k6';

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000/api/v1';

export function loadUsers() {
  // File sinh bởi: node load/seed-users.mjs 200 (chạy từ thư mục backend)
  return JSON.parse(open('./users.json'));
}

// Login 1 user → trả về { accessToken, refreshTokenCookie }
export function login(user) {
  const res = http.post(`${BASE_URL}/auth/login`, JSON.stringify(user), {
    headers: { 'Content-Type': 'application/json' },
  });
  check(res, { 'login 200': (r) => r.status === 200 });
  const accessToken = res.json('accessToken');
  const refreshCookie = res.cookies['refreshToken']?.[0]?.value;
  return { accessToken, refreshCookie };
}

export function authHeaders(token) {
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
}

// Tạo 1 transaction ngẫu nhiên (write path)
export function createTransaction(token, categoryId) {
  return http.post(
    `${BASE_URL}/transactions`,
    JSON.stringify({
      amount: Math.floor(Math.random() * 500000) + 10000,
      type: Math.random() > 0.5 ? 'EXPENSE' : 'INCOME',
      categoryId,
      note: 'load-test',
      date: new Date().toISOString(),
    }),
    authHeaders(token)
  );
}
