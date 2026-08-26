// S2.1 — Spike: 500 VU trong 30s — tìm pool exhaustion / 5xx hàng loạt
// Chạy: k6 run load/spike.js
import http from 'k6/http';
import { check } from 'k6';
import { BASE_URL, loadUsers, login, authHeaders } from './config.js';

export const options = {
  scenarios: {
    spike: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: 100,
      maxVUs: 500,
      stages: [
        { duration: '10s', target: 50 },
        { duration: '30s', target: 500 },
        { duration: '10s', target: 10 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    'http_req_duration{expected_response:true}': ['p(95)<1500'],
  },
};

const users = loadUsers();

export default function () {
  const user = users[__VU % users.length];
  const { accessToken } = login(user);
  const res = http.get(`${BASE_URL}/transactions?limit=20`, authHeaders(accessToken));
  check(res, { 'list 200': (r) => r.status === 200 });
}
