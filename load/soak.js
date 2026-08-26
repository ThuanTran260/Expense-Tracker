// S2.1 — Soak: 100 VU trong 30 phút — tìm rò rỉ memory/connection
// Chạy: k6 run load/soak.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, loadUsers, login, authHeaders, createTransaction } from './config.js';

export const options = {
  scenarios: {
    soak: {
      executor: 'constant-vus',
      vus: 100,
      duration: '30m',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<800'],
  },
};

const users = loadUsers();

export function setup() {
  const u = users[0];
  const { accessToken } = login(u);
  const res = http.get(`${BASE_URL}/categories`, authHeaders(accessToken));
  const cats = res.json('data') || [];
  const expense = cats.find((c) => c.userId === null && c.type === 'EXPENSE');
  return { categoryId: expense?.id };
}

export default function (data) {
  const user = users[__VU % users.length];
  const { accessToken } = login(user);
  const headers = authHeaders(accessToken);

  http.get(`${BASE_URL}/transactions?limit=20`, headers);
  http.get(`${BASE_URL}/stats/summary?from=2026-08-01T00:00:00.000Z&to=2026-08-31T23:59:59.999Z`, headers);
  if (data.categoryId && Math.random() < 0.2) {
    createTransaction(accessToken, data.categoryId);
  }
  sleep(2);
}
