# TutorConnect India — Go-Live Checklist (Phase 7)

**Version:** 1.0  
**Updated:** 27 Aug 2026  
**Plan:** [`GO_LIVE_IMPLEMENTATION_PLAN.md`](./GO_LIVE_IMPLEMENTATION_PLAN.md)  
**How to use:** Mark `[x]` when done. Do not start 7B until 7A exit is met; do not soft-launch until 7B exit is met.

---

## Progress snapshot

| Phase | Status | Notes |
|---|---|---|
| **7A — P0/P1 security** | **Complete** | Code + unit tests green |
| **7B — Staging ops** | **Partial** | 7B.4–7B.5 done; VPS/Nginx/backup **deferred** |
| **7C — Quality / SEO / auth** | **Complete** | CI, E2E gates, cookies/CSRF, SEO, tx, logout |
| **7D — Soft launch** | **Code complete** | Legal + invite gate + ops/soak docs; cohort/soak are ops |

---

## Phase 7A — P0/P1 security

| # | Layer | Task | Status |
|---|---|---|---|
| 7A.1 | BE | Refuse `SUSPENDED` on OTP verify, password login, refresh; never flip suspended → ACTIVE | [x] |
| 7A.2 | BE | Hard-fail `PAYMENTS_MOCK=true` in production; disable `mock-complete` in prod | [x] |
| 7A.3 | BE | Cloudinary authenticated KYC/agreement PDFs + signed URL delivery | [x] |
| 7A.4 | BE | Redact address/lat/lng for tutors on requirement `getOne` | [x] |
| 7A.5 | BE | Bind student calendar `tutorId` to agreement ownership | [x] |
| 7A.6 | BE / INFRA | Hash OTPs in Redis; Redis AUTH + private bind for staging | [x] |
| 7A.7 | BE | Require `DOCUMENT_ENCRYPTION_KEY` in prod; block default admin seed password in prod | [x] |
| 7A.8 | BE | Unit tests for 7A.1–7A.5 behaviors | [x] |

### 7A exit

- [x] All 7A.1–7A.8 complete
- [x] `cd api && npm test` green
- [x] OWASP checklist updated for closed findings

---

## Phase 7B — Staging infra & money path

| # | Layer | Task | Status |
|---|---|---|---|
| 7B.1 | INFRA | VPS provisioned; SSH hardened; Docker Postgres/PostGIS + Redis (no public Redis) | [~] deferred |
| 7B.2 | INFRA | Nginx + Let’s Encrypt for API + web | [~] deferred |
| 7B.3 | INFRA | Prod-like secrets set; `PAYMENTS_MOCK=false`; `NODE_ENV=production` | [~] deferred (env samples updated) |
| 7B.4 | BE | Readiness endpoint (DB + Redis); liveness remains `/api/v1/health` | [x] |
| 7B.5 | BE / FE | Sentry on API + web | [x] |
| 7B.6 | INFRA | Nightly DB backup + restore drill documented and proven once | [~] deferred |
| 7B.7 | OPS | Smoke: OTP email, search, registration pay, commission pay, webhook | [~] deferred (needs staging) |

### 7B exit

- [~] Staging HTTPS live — **deferred** (no VPS/Nginx this pass)
- [~] SMTP + Razorpay smoke recorded in runbook — **deferred**
- [~] Backup restore proven — **deferred**
- [x] Sentry wiring shipped (set `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` to receive events)
- [x] Readiness: `GET /api/v1/health/ready`

---

## Phase 7C — Quality, SEO, session hardening

| # | Layer | Task | Status |
|---|---|---|---|
| 7C.1 | INFRA | GitHub Actions: Jest + web lint/build + `npm audit --omit=dev` | [x] |
| 7C.2 | FE | Playwright critical path (register → … → pay with mock on CI) | [x] |
| 7C.3 | BE / FE | httpOnly Secure cookies; CSRF; remove tokens from `localStorage` | [x] |
| 7C.4 | FE | SSR + `generateMetadata` for home/search/tutors; `sitemap.ts` + `robots.ts` | [x] |
| 7C.5 | BE | Transactional `markSuccess` + agreement activate; crons via BullMQ | [x] |
| 7C.6 | BE / FE | Logout + refresh revoke | [x] |

### 7C exit

- [x] CI workflow present (`.github/workflows/ci.yml`)
- [x] Critical-path Playwright gates (`e2e/critical-path.spec.ts`)
- [x] Cookie auth; JWTs not stored in `localStorage`
- [x] Public home/search/tutor metadata + sitemap/robots

---

## Phase 7D — Invite-only soft launch

| # | Layer | Task | Status |
|---|---|---|---|
| 7D.1 | FE / LEGAL | Publish Terms / Privacy / Tutor agreement | [x] |
| 7D.2 | OPS | Support email + admin ops playbook | [x] |
| 7D.3 | OPS | Beta cohort (≈50 tutors / 100 students) behind invite/allowlist | [x] code gate; cohort onboarding is ops |
| 7D.4 | OPS | 1-week soak (errors, payments, disputes) | [x] checklist ready — run when hosted |
| 7D.5 | OPS | Close Final MVP Launch Checklist L1–L12 | [x] linked; remaining items need live env |

### 7D exit

- [x] Legal pages published (hi/en) with support contact
- [x] Ops playbook + soak checklist documented
- [x] Invite-only registration gate available (`SOFT_LAUNCH_INVITE_ONLY`)
- [ ] Invite cohort onboarded + 1-week soak executed (requires hosting — deferred with 7B infra)
- [x] Public open marketplace explicitly deferred until soak

---

## Final MVP Launch Checklist (cross-link)

Tracked in [`IMPLEMENTATION_CHECKLIST.md`](./IMPLEMENTATION_CHECKLIST.md) — close during **7D.5**:

| # | Item | Closes in |
|---|---|---|
| L1 | Phase 0–6 exit criteria | 7A–7B complete implies revisit |
| L2 | All modules functional | Manual soak |
| L3–L4 | Tutor fees + GST | Already shipped; re-verify on staging |
| L5 | SMTP OTP + notifications | 7B.7 |
| L6 | Demo + pre-agreement privacy | Shipped |
| L7–L8 | Slots/buffer + i18n | Re-verify on staging |
| L9 | Razorpay live + SMTP prod tested | 7B.7 |
| L10 | 50 verified tutors | 7D.3 |
| L11 | Legal published | 7D.1 |
| L12 | Runbook + rollback | 7B.6 + runbook updates |

---

## Out of scope (do not track here)

- SMS / WhatsApp / push
- Native mobile
- Subscriptions / Elasticsearch / video
- WAF / pen-test (post soft launch)

---

*End of Go-Live Checklist*
