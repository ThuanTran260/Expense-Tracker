// S2.1 — Mixed workload: ramp 50→200 VU, 80% đọc / 20% ghi
// Chạy: k6 run load/mixed.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, loadUsers, login, authHeaders, createTransaction } from './config.js';

export const options = {
  scenarios: {
    ramp: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 50 },
        { duration: '2m', target: 200 },
        { duration: '1m', target: 200 },
        { duration: '30s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<800'],
    http_req_failed: ['rate<0.01'],
  },
};

const users = loadUsers();

export function setup() {
  const u = users[0];
  const { accessToken } = login(u);
  const res = http.get(`${BASE_URL}/categories`, authHeaders(accessToken));
  const cats = res.json('data') || [];
  const expense = cats.find((c) => c.userId === null && c.type === 'EXPENSE');
  return { accessToken, categoryId: expense?.id };
}

export default function (data) {
  const user = users[__VU % users.length];
  const { accessToken } = login(user);
  const headers = authHeaders(accessToken);

  // 80% đọc
  const list = http.get(`${BASE_URL}/transactions?limit=20`, headers);
  check(list, { 'list 200': (r) => r.status === 200 });
  http.get(`${BASE_URL}/stats/summary?from=2026-08-01T00:00:00.000Z&to=2026-08-31T23:59:59.999Z`, headers);
  http.get(`${BASE_URL}/categories`, headers);

  // 20% ghi
  if (Math.random() < 0.2 && data.categoryId) {
    const created = createTransaction(accessToken, data.categoryId);
    check(created, { 'create 201': (r) => r.status === 201 });
  }

  sleep(1);
}
