# TutorConnect India

Verified tutor marketplace — standalone API and Web apps (npm).

## Stack

- **API:** NestJS + Prisma + PostgreSQL + Redis + SMTP (Nodemailer)
- **Web:** Next.js 14 + next-intl (hi/en) + Tailwind CSS
- **DB:** Docker Compose (PostgreSQL 16 + PostGIS, Redis 7)

## Project Structure

```
api/                 NestJS backend (standalone npm app)
web/                 Next.js frontend (standalone npm app)
mobile/              React Native (Expo) — planned; see docs/REACT_NATIVE_IMPLEMENTATION_PLAN.md
docs/                Specs, plan, checklist
docker-compose.yml   Postgres + Redis
```

No monorepo / no pnpm workspaces. Deploy and install each app separately.

## Quick Start

### 1. Prerequisites

- Node.js 20+
- npm (comes with Node)
- Docker Desktop

### 2. Environment

Copy **sample** files (never commit real secrets):

```bash
copy api\.env.example api\.env
copy web\.env.example web\.env.local
```

Edit `api/.env` and `web/.env.local` yourself using the comments in the samples.

**Web (`web/.env.local`) needs only:**
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_PAYMENTS_MOCK` — mirror API `PAYMENTS_MOCK` (`true` local mock; `false` for Razorpay test/live)
- `NEXT_PUBLIC_RAZORPAY_KEY_ID` — Key ID only (`rzp_test_…` or `rzp_live_…`)

**API** secrets (JWT, SMTP, Cloudinary, Razorpay Key Secret, DB) go only in `api/.env` — see `api/.env.example`.

### 3. Start database

```bash
npm run db:up
```

### 4. API

```bash
cd api
npm install
npx prisma generate
npx prisma migrate deploy
npm run prisma:seed
npm run dev
```

- API: http://localhost:3001
- Swagger: http://localhost:3001/api/docs

### 5. Web (new terminal)

```bash
cd web
npm install
npm run dev
```

- Web: http://localhost:3000

## Phase status

- [x] Phase 0 — Foundation (auth, i18n, Docker DB)
- [x] Phase 1 — Profiles
- [x] Phase 2 — Marketplace
- [x] Phase 3 — Engagement (demo, schedule, agreements)
- [x] Phase 4 — Monetization (₹199 + commission, Razorpay/mock)
- [x] Phase 5 — Trust & Operations (verification, ratings, disputes, admin metrics)
- [x] Phase 6 — Code hardening (security, tests, docs)
- [x] Phase 7 — Go-live (**7A–7D code/docs done**; VPS/Nginx/backup + live soak **deferred**)

**Soft launch:** enable `SOFT_LAUNCH_INVITE_ONLY=true` + invite codes (see `docs/OPS_PLAYBOOK.md`). Soak: `docs/SOAK_CHECKLIST.md`.

See `docs/IMPLEMENTATION_CHECKLIST.md` and `docs/RUNBOOK.md` for Phases 0–6 tracking and ops.

**Payments:** `.env.example` defaults to `PAYMENTS_MOCK=true` for local checkout without Razorpay keys (mirror `NEXT_PUBLIC_PAYMENTS_MOCK` on web). For live sandbox, set `RAZORPAY_*` and `PAYMENTS_MOCK=false` on **both** API and web. Checkout follows the API `mock` flag. Email delivery uses **BullMQ** on Redis (`REDIS_URL`).

**Chat:** student↔tutor messaging unlocks only when an agreement is **ACTIVE** (`/chat`). Pre-agreement contact stays private; demos remain the trial path.

**Tests:** `cd api && npm test` · `cd web && npm run test:e2e` (Playwright; web must be running) · `npm run load:smoke` (needs k6) · `npm run test:i18n`
