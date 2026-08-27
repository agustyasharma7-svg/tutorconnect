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
| Payments checkout no-op | `PAYMENTS_MOCK=true` for local; or Razorpay test keys + `PAYMENTS_MOCK=false` |

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

## Staging / production (deferred)

Manual deploy checklist (not automated in Phase 6 code hardening):

1. Provision VPS + Docker Postgres/Redis with PostGIS
2. Set production secrets: JWT, SMTP, Cloudinary, Razorpay live, `CORS_ORIGIN`, `DOCUMENT_ENCRYPTION_KEY`, `NODE_ENV=production`
3. `git pull` → `prisma migrate deploy` → build API/web → process manager restart
4. Nginx reverse proxy + TLS certificates
5. Smoke: health, login, search, mock/live payment
6. Rollback: previous release artifact + DB backup restore

Monitoring (error rate, latency, disk) and beta cohort onboarding are ops follow-ups.
