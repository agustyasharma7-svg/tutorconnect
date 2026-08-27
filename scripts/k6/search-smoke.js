/**
 * k6 smoke — health + search latency soft assert.
 *
 * Install: https://k6.io/docs/get-started/installation/
 * Run: k6 run scripts/k6/search-smoke.js
 *
 * Env:
 *   API_BASE=http://localhost:3001/api/v1
 *   AUTH_TOKEN=optional Bearer for authenticated search
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 5,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<2000'],
  },
};

const BASE = __ENV.API_BASE || 'http://localhost:3001/api/v1';

export default function () {
  const health = http.get(`${BASE}/health`);
  check(health, {
    'health 200': (r) => r.status === 200,
  });

  const headers = {};
  if (__ENV.AUTH_TOKEN) {
    headers.Authorization = `Bearer ${__ENV.AUTH_TOKEN}`;
  }

  // Search may 401 without token — still measure response time
  const search = http.get(`${BASE}/search/tutors?mode=BOTH`, { headers });
  check(search, {
    'search responds': (r) => r.status === 200 || r.status === 401 || r.status === 403,
    'search under 2s': (r) => r.timings.duration < 2000,
  });

  sleep(1);
}
