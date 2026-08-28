# TutorConnect India — Runbook

## Local development

1. Start Docker Postgres (host **5433**) + Redis.
2. `cd api` → copy `api/.env.example` keys into your local `.env` (never commit secrets).
3. `npx prisma migrate deploy` && `npx prisma generate`
4. `npm run dev` → API http://localhost:3001 (Swagger `/api/docs`)
5. `cd web` → set `NEXT_PUBLIC_API_URL` → `npm run dev` → http://localhost:3000

### Common failures

| Symptom | Fix |
|---|---|
| Prisma `EPERM` rename query_engine on Windows | Stop all `node` processes, re-run `prisma generate` |
| Redis / BullMQ email not sending | Ensure Redis up; check `REDIS_URL` |
| CORS errors from Next | Set `CORS_ORIGIN=http://localhost:3000` on API |
| Payments checkout no-op | `PAYMENTS_MOCK=true` on API **and** `NEXT_PUBLIC_PAYMENTS_MOCK=true` on web; checkout follows API `order.mock` |
| Distance / offline match wrong | Set `GOOGLE_MAPS_API_KEY` (Geocoding API) or send device lat/lng; without key, pincode uses Delhi-area stub |

### Migrations

```bash
cd api
npx prisma migrate deploy   # apply
# Rollback: restore DB backup or manually reverse SQL — Prisma has no auto-down in deploy workflow
```

### Tests & load smoke

```bash
cd api && npm test
cd web && npx playwright test   # needs web running
k6 run scripts/k6/search-smoke.js   # install k6 separately
```

---

## Staging / production (Phase 7B)

Full sequence: [`GO_LIVE_IMPLEMENTATION_PLAN.md`](./GO_LIVE_IMPLEMENTATION_PLAN.md) · tracker [`GO_LIVE_CHECKLIST.md`](./GO_LIVE_CHECKLIST.md).  
**Do not deploy real users until Phase 7A security exit is met.**

### Pre-flight (secrets)

Set on the server only (never commit):

| Variable | Notes |
|---|---|
| `NODE_ENV` | `production` |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Strong, unique; no `change-me` / `dev-*` |
| `CORS_ORIGIN` | Exact web origin(s), comma-separated |
| `DOCUMENT_ENCRYPTION_KEY` | Required in prod (Phase 7A.7) |
| `PAYMENTS_MOCK` | Must be `false` in prod (Phase 7A.2 hard-fail) |
| `RAZORPAY_*` + `RAZORPAY_WEBHOOK_SECRET` | Test first, then live |
| `SMTP_*` | Production mailbox for OTP + alerts |
| `CLOUDINARY_*` | Prefer authenticated delivery for KYC (7A.3) |
| `REDIS_URL` | Include password; Redis not bound to public 0.0.0.0:6379 |
| `DATABASE_URL` | Postgres with PostGIS |
| `SENTRY_DSN` | After 7B.5 |

### Deploy checklist

Liveness/readiness are available now (no VPS required locally):

1. Confirm liveness: `GET /api/v1/health` → `{ status: 'ok' }`.
2. Confirm readiness: `GET /api/v1/health/ready` → `{ status: 'ready', checks: { database, redis } }` (503 if either down).

VPS, Nginx/TLS, and automated backups are **deferred** — see Phase 7B.1 / 7B.2 / 7B.6 in `GO_LIVE_CHECKLIST.md`. When resuming staging deploy:

1. Provision VPS; harden SSH (keys only, non-root deploy user, firewall).
2. Docker Compose: Postgres/PostGIS + Redis (**do not publish Redis**; use `requirepass`).
3. Copy env from samples; set secrets table above + `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN`.
4. `git pull` → migrate → build API/web → process manager.
5. Nginx + Let’s Encrypt for API + web hostnames.

### Sentry (7B.5)

| App | Env var | Notes |
|---|---|---|
| API | `SENTRY_DSN` | Optional locally; set for staging/prod. 5xx captured via global filter. |
| Web | `NEXT_PUBLIC_SENTRY_DSN` (+ optional `SENTRY_DSN` for server) | Client: `instrumentation-client.ts`. Server/edge: `instrumentation.ts` + `sentry.server.config.ts` / `sentry.edge.config.ts`. Render errors: `app/global-error.tsx`. |

Leave DSN empty to disable (no-op). Source maps upload only if `SENTRY_AUTH_TOKEN` is set.

### Smoke checklist (record date / result)

| # | Check | Pass? |
|---|---|---|
| 1 | HTTPS web + API load | [ ] |
| 2 | Email OTP received (SMTP) | [ ] |
| 3 | Login + role dashboard | [ ] |
| 4 | Tutor search | [ ] |
| 5 | Registration payment (Razorpay test/live) | [ ] |
| 6 | Commission payment + webhook | [ ] |
| 7 | Mock-complete **rejected** when `NODE_ENV=production` | [ ] |
| 8 | Sentry test event (API + web) | [ ] |

### Backups (7B.6 — deferred)

| Item | Detail |
|---|---|
| Schedule | Nightly (cron) `pg_dump` of Postgres volume/DB |
| Storage | Off-box (object storage or secondary host) |
| Retention | Minimum 7 daily dumps |
| Restore drill | Restore to scratch DB once per staging standup; document commands below |

```bash
# Example dump (adjust container/user/db names)
docker exec tutorconnect-postgres pg_dump -U tutorconnect tutorconnect > backup-$(date +%F).sql

# Example restore (scratch / disaster only)
# docker exec -i tutorconnect-postgres psql -U tutorconnect tutorconnect < backup-YYYY-MM-DD.sql
```

### Rollback

1. Stop API/web processes.
2. Redeploy previous known-good build artifact (or `git checkout <tag>` + rebuild).
3. If migration was forward-only and incompatible: restore DB from last good backup **before** restarting API.
4. Re-run smoke checklist items 1–4 minimum.
5. Announce in support channel; file incident note.

### Monitoring (7B.5+)

| Signal | Tool |
|---|---|
| Errors / exceptions | Sentry (API + web) |
| Process up | systemd/PM2 + Nginx health |
| Disk / DB size | Host metrics + backup job logs |
| Payment anomalies | Admin revenue export + Razorpay dashboard reconciliation |

Monitoring alerts and beta cohort onboarding are completed in Phase **7D**.

---

## Related

- Go-live plan: `docs/GO_LIVE_IMPLEMENTATION_PLAN.md`
- Go-live checklist: `docs/GO_LIVE_CHECKLIST.md`
- OWASP: `docs/OWASP_CHECKLIST.md`
