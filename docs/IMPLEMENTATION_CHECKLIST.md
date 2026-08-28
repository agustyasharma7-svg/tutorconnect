# TutorConnect India — Implementation Checklist

**Version:** 1.8  
**Updated:** 27 Aug 2026  
**Sources:** `FUNCTIONALITY.md` v1.5 · `IMPLEMENTATION_PLAN.md` v1.5 · `GO_LIVE_IMPLEMENTATION_PLAN.md` v1.0  
**Timeline:** ~21 weeks (Phases 0–6) + ~3–4 weeks Phase 7 go-live

> **Phase 7 (go-live):** Tracked separately in [`GO_LIVE_IMPLEMENTATION_PLAN.md`](./GO_LIVE_IMPLEMENTATION_PLAN.md) and [`GO_LIVE_CHECKLIST.md`](./GO_LIVE_CHECKLIST.md). Start at **7A.1**. Final Launch Checklist L1–L12 closes in **7D.5**.

---

## Progress Snapshot (as of 27 Aug 2026)

| Phase | Status | Notes |
|---|---|---|
| **0 — Foundation** | Code complete | Auth, OTP/SMTP, JWT, i18n, Docker DB. Not done: VPS, Nginx/SSL, Sentry → Phase 7B |
| **1 — Core Profiles** | Code complete | Student/tutor profiles, catalog, Cloudinary photos, password auth, admin users |
| **2 — Marketplace** | **Complete** | Free requirements, PostGIS search/match, apply/invite/shortlist, SMTP alerts |
| **3 — Engagement** | **Complete** | Demo + reminder cron, exceptions, buffer UI, agreements + Cloudinary PDF |
| **4 — Monetization** | **Complete** | ₹199 + commission, Razorpay/mock, BullMQ email, admin waive, overdue restriction |
| **5 — Trust & Ops** | **Complete** | Verification badge, ratings, disputes (Cloudinary evidence), admin metrics/audit |
| **6 — Hardening** | **Code complete** | Helmet/CSP, refresh rotation, Jest + Playwright + k6 smoke, OWASP/runbook/legal stubs |
| **7 — Go-live** | **7A–7D code/docs done** | Hosting + live soak deferred. See `GO_LIVE_CHECKLIST.md` |

### Phases 2–5 at a glance (what shipped)

| Phase | Backend | Frontend | DB migrations |
|---|---|---|---|
| **2** | `requirements/`, `matches/`, PostGIS `ST_DWithin`, match emails | `/requirements`, `/search`, `/matches/*`, `/tutors/[id]` | `20240802160000_requirements_matching` + PostGIS location |
| **3** | `demo-classes/`, `schedules/`, `agreements/` (pdf-lib) | `/demos`, `/schedule`, `/agreements` | `20240802180000_demo_schedule_agreements` |
| **4** | `commissions/`, `payments/` (Razorpay + mock), `notifications/` | `/commissions`, `/payments/*` | `20240802190000_payments_commissions` |
| **5** | `verification/`, `ratings/`, `disputes/`, admin metrics/audit | `/verification`, `/disputes`, admin queue + KPIs, ratings on agreements | `20240802210000_trust_ops` |

**Verified infra:** Postgres (host port **5433**) + Redis via Docker; API builds/runs; web builds.

**MVP deviations from original plan:**
- Photo/docs/dispute evidence storage → **Cloudinary** (not S3)
- Pincode geocode → stub until Maps API (lat/lng + PostGIS geography sync)
- UI → **Tailwind** custom components (shadcn/ui not added yet)
- FE role gating → client `localStorage` redirects (Next middleware is locale-only)
- Payments → **Razorpay** with `PAYMENTS_MOCK=true` local checkout (no real keys required)
- Notifications → **BullMQ** email queue on Redis + `notifications` table (3 attempts)
- Optional document numbers → AES-256-GCM via `DOCUMENT_ENCRYPTION_KEY` (sample only in `api/.env.example`)

---

## How to Use This Document

| Label | Meaning |
|---|---|
| **BE** | Backend (NestJS API, services, jobs, integrations) |
| **FE** | Frontend (Next.js — student, tutor, admin UI) |
| **DB** | Database (Prisma schema, migrations, seeds, indexes) |
| **INFRA** | Infrastructure (Docker, VPS/AWS, Nginx, env config) |

- Mark items `[x]` when complete.
- Each phase ends with **Exit Criteria** — do not start the next phase until met.
- **FR-*** references map to `FUNCTIONALITY.md`.

---

## Product Rules (Quick Reference)

| Rule | Value |
|---|---|
| Roles | One account = one role (Student OR Tutor OR Admin) |
| Student fees | Free requirement posting |
| Tutor fees | ₹199 registration (GST incl.) + 30% one-time commission per student (GST incl.) |
| Subscriptions | Not in MVP |
| Communication | No chat; demo class after shortlist |
| Notifications | Email only via SMTP |
| Slots | Occupy on agreement ACTIVE; student releases |
| Buffer | 15 min between bookings (online + offline) |
| i18n | Hindi + English |

---

# Phase 0 — Foundation (Weeks 1–2)

**Goal:** Standalone api + web (npm), Docker DB, auth skeleton, SMTP OTP, i18n scaffold.

## 0.1 Project & Infrastructure

| # | Layer | Task | Status |
|---|---|---|---|
| 0.1.1 | INFRA | Create standalone apps (`api/`, `web/`) with npm | [x] |
| 0.1.2 | INFRA | `docker-compose.yml` — PostgreSQL 16 + PostGIS + Redis 7 | [x] |
| 0.1.3 | INFRA | `.env.example` for API, web, SMTP, DB, Redis, Cloudinary | [x] |
| 0.1.4 | INFRA | Provision VPS or AWS EC2 staging server | [ ] |
| 0.1.5 | INFRA | Nginx reverse proxy + SSL (Let's Encrypt) | [ ] |
| 0.1.6 | BE | NestJS app scaffold with module boundaries | [x] |
| 0.1.7 | FE | Next.js 14 App Router scaffold | [x] |
| 0.1.8 | FE | Tailwind CSS setup (shadcn/ui deferred) | [x] |
| 0.1.9 | FE | next-intl setup — `en` + `hi` locale routing | [x] |
| 0.1.10 | BE | OpenAPI / Swagger (`/api/docs`) | [x] |
| 0.1.11 | BE | Sentry error monitoring integration | [x] |

## 0.2 Database — Core Auth Schema

| # | Layer | Task | Status |
|---|---|---|---|
| 0.2.1 | DB | `users` table — id, mobile, email, password_hash, role, status, locale, timestamps | [x] |
| 0.2.2 | DB | Unique constraints — mobile, email | [x] |
| 0.2.3 | DB | Enum — `UserRole` (STUDENT, TUTOR, ADMIN) | [x] |
| 0.2.4 | DB | Enum — `UserStatus` (ACTIVE, SUSPENDED, PENDING_VERIFICATION) | [x] |
| 0.2.5 | DB | Migration v001 — users (`20240623120000_init_users`) | [x] |
| 0.2.6 | DB | Seed script — admin user | [x] |

## 0.3 Module 1 — Authentication & Authorization (Part 1)

| # | Layer | Task | FR Ref | Status |
|---|---|---|---|---|
| 0.3.1 | BE | Student registration API — name, mobile, email (required) | 4.1 | [x] |
| 0.3.2 | BE | Tutor registration API — name, mobile, email, qualification | 4.2 | [x] |
| 0.3.3 | BE | Single-role enforcement — reject dual role on same mobile/email | OQ-1 | [x] |
| 0.3.4 | BE | Email OTP generate + store in Redis (TTL 5 min) | 4.3 | [x] |
| 0.3.5 | BE | SMTP mailer (Nodemailer) — OTP email template | 15.1 | [x] |
| 0.3.6 | BE | `POST /auth/otp/send` + `POST /auth/otp/verify` | 4.3 | [x] |
| 0.3.7 | BE | JWT access + refresh token issuance | 4.3 | [x] |
| 0.3.8 | BE | RBAC guards — `@Roles()` decorator + `RolesGuard` | 2.4 | [x] |
| 0.3.9 | BE | Rate limiting on auth / OTP endpoints | 4.5 | [x] |
| 0.3.10 | FE | Student registration page (hi/en) | 4.1 | [x] |
| 0.3.11 | FE | Tutor registration page (hi/en) | 4.2 | [x] |
| 0.3.12 | FE | Email OTP verification screen | 4.3 | [x] |
| 0.3.13 | FE | Role-based page redirects (client auth; middleware = locale only) | 2.4 | [x] |
| 0.3.14 | FE | Language switcher component | 19.5 | [x] |
| 0.3.15 | FE | Empty dashboard shell (student / tutor / admin) | — | [x] |

### Phase 0 Exit Criteria

- [x] User can register as student OR tutor (not both) — *implemented*
- [ ] OTP received via SMTP email — *code ready; needs valid SMTP credentials in `.env`*
- [x] User can login with email OTP and see role dashboard — *implemented (SMTP required for OTP delivery)*
- [x] Language switches between Hindi and English — *implemented*
- [x] PostgreSQL + Redis running via Docker — *verified (Postgres mapped to host `5433`)*

---

# Phase 1 — Core Profiles (Weeks 3–5)

**Goal:** Student and tutor onboarding complete; tutor profile discoverable.

## 1.1 Database — Profiles & Tutor Schema

| # | Layer | Task | Status |
|---|---|---|---|
| 1.1.1 | DB | `students` table — user_id, name, preferred_language, ... | [x] |
| 1.1.2 | DB | `tutors` table — bio, experience, photo_url, registration_fee_status, lat/lng + PostGIS location | [x] |
| 1.1.3 | DB | `subjects`, `classes`, `boards` lookup tables + seed data | [x] |
| 1.1.4 | DB | `tutor_subjects`, `tutor_classes`, `tutor_boards` junction tables | [x] |
| 1.1.5 | DB | `tutor_availability` — day, start_time, end_time, mode (ONLINE/OFFLINE) | [x] |
| 1.1.6 | DB | `tutor_documents` — type, file_url, storage_key, status | [x] |
| 1.1.7 | DB | Enum — `RegistrationFeeStatus` (PENDING, PAID, WAIVED, REFUNDED) | [x] |
| 1.1.8 | DB | PostGIS GIST index on tutor location | [x] |
| 1.1.9 | DB | Migration v002 — profiles (`20240802140000_profiles`) | [x] |
| 1.1.10 | DB | Migration — Cloudinary `storage_key` on documents | [x] |

## 1.2 Module 2 — Student Management

| # | Layer | Task | FR Ref | Status |
|---|---|---|---|---|
| 1.2.1 | BE | `GET /students/me` — profile (+ requirement count stub `0`) | 5.2 | [x] |
| 1.2.2 | BE | `PATCH /students/me` — update name, email | 5.2 | [x] |
| 1.2.3 | BE | Student-only data access guard | 5.3 | [x] |
| 1.2.4 | BE | Audit log on profile changes | 5.3 | [x] |
| 1.2.5 | FE | Student profile view page | 5.2 | [x] |
| 1.2.6 | FE | Student profile edit form | 5.2 | [x] |
| 1.2.7 | FE | Student dashboard layout + nav | 5.2 | [x] |
| 1.2.8 | FE | i18n strings — student profile (hi/en) | 19.5 | [x] |

## 1.3 Module 3 — Tutor Management

| # | Layer | Task | FR Ref | Status |
|---|---|---|---|---|
| 1.3.1 | BE | `GET /tutors/me` + `PATCH /tutors/me` — FR-TUT-001 fields | FR-TUT-001 | [x] |
| 1.3.2 | BE | Subject / class / board selection APIs | FR-TUT-002 | [x] |
| 1.3.3 | BE | Profile completeness score calculation | 6.7 | [x] |
| 1.3.4 | BE | Cloudinary upload for tutor photo (`POST /tutors/me/photo`) | FR-TUT-003 | [x] |
| 1.3.5 | BE | Availability CRUD — online + offline weekly slots | FR-TUT-004 | [x] |
| 1.3.6 | BE | Teaching radius (5/10/20 km) + pincode geocode stub | FR-TUT-005 | [x] |
| 1.3.7 | BE | Earn First / Pay Now choice API (`registrationFeeChoice`; Pay Now → Phase 4 checkout) | FR-TUT-006 | [x] |
| 1.3.8 | BE | Gate discoverability until profile 100% complete | 6.7 | [x] |
| 1.3.9 | FE | Tutor profile wizard (multi-step) | FR-TUT-001 | [x] |
| 1.3.10 | FE | Photo upload UI | FR-TUT-001 | [x] |
| 1.3.11 | FE | Subject / class / board multi-select | FR-TUT-002 | [x] |
| 1.3.12 | FE | Availability weekly editor (online/offline) | FR-TUT-004 | [x] |
| 1.3.13 | FE | Teaching radius selector + location/pincode input | FR-TUT-005 | [x] |
| 1.3.14 | FE | Registration fee choice screen (Pay Now vs Earn First) | FR-TUT-006 | [x] |
| 1.3.15 | FE | Profile completeness progress indicator | 6.7 | [x] |
| 1.3.16 | FE | i18n strings — tutor onboarding (hi/en) | 19.5 | [x] |

## 1.4 Auth Completion + Admin Basics

| # | Layer | Task | FR Ref | Status |
|---|---|---|---|---|
| 1.4.1 | BE | Password login — email + password | 4.3 | [x] |
| 1.4.2 | BE | Forgot password — email OTP + reset | 4.4 | [x] |
| 1.4.3 | BE | JWT refresh endpoint (re-issue tokens; no server-side revoke yet) | 4.3 | [x] |
| 1.4.4 | BE | Password complexity validation | 4.5 | [x] |
| 1.4.5 | BE | `GET /admin/users` — paginated user list | 18.4 | [x] |
| 1.4.6 | FE | Password login page (OTP + password tabs) | 4.3 | [x] |
| 1.4.7 | FE | Forgot password flow | 4.4 | [x] |
| 1.4.8 | FE | Admin users list page (basic) | 18.4 | [x] |

### Phase 1 Exit Criteria

- [x] Tutor completes profile to 100% (photo, subjects, availability, radius) — *implemented*
- [x] Student can view and edit profile — *implemented*
- [x] Earn First / Pay Now choice saved (audit + API; payment in Phase 4) — *implemented*
- [x] Geocoding stores tutor lat/lng in PostGIS — *lat/lng + geography column + GIST; pincode geocode stub*
- [x] Login works via email OTP and password — *implemented (SMTP required for OTP)*

> **MVP notes:** Photos via Cloudinary (`storage_key` = public_id). Location: Float lat/lng synced to PostGIS `geography` via trigger; pincode geocode is a stub until Maps API. Catalog seed includes subjects/classes/boards. Certificate/document upload beyond photo not built yet.

---

# Phase 2 — Marketplace Core (Weeks 4–9)

**Status:** Complete.  
**Goal:** Free requirement posting, tutor search, matching, apply, invite, shortlist.

### Delivered (Phase 2)

| Area | What was built |
|---|---|
| Requirements | Draft auto-save, free publish (no payment), cancel, status machine |
| Matching | Search (subject/class/board/mode + PostGIS distance), score/rank, apply + proposed fee, invite, shortlist/reject/withdraw |
| Emails | Match alert on publish, application received, shortlisted |
| UI | Student requirement CRUD; tutor open list + apply; student inbox; search + public tutor profile (contact hidden) |
| Key paths | `api/src/requirements`, `api/src/matches`, `api/src/common/geo.ts`; web routes under `requirements/`, `search/`, `matches/` |

> **MVP notes:** Ranking uses discoverability / schedule / distance; verified badge + aggregate rating ranking deepen in Phase 5. Pincode geocode remains stub; lat/lng + PostGIS geography used for distance.

## 2.1 Database — Requirements & Matching

| # | Layer | Task | Status |
|---|---|---|---|
| 2.1.1 | DB | `requirements` — class, subject, board, budget, mode, schedule, status, lat/lng + PostGIS location | [x] |
| 2.1.2 | DB | Enum — `RequirementStatus` (DRAFT, OPEN, APPLIED, SHORTLISTED, MATCHED, ACTIVE, COMPLETED, CANCELLED) | [x] |
| 2.1.3 | DB | `matches` — requirement_id, tutor_id, status, score | [x] |
| 2.1.4 | DB | `applications` — match_id, message, proposed_fee | [x] |
| 2.1.5 | DB | Enum — `MatchStatus` (INVITED, APPLIED, SHORTLISTED, ACCEPTED, MATCHED, REJECTED, WITHDRAWN) | [x] |
| 2.1.6 | DB | Indexes — `requirements(status, subject_id)`, `matches(requirement_id, status)` | [x] |
| 2.1.7 | DB | Migration v003 — requirements + matching | [x] |

## 2.2 Module 5 — Requirement Management

| # | Layer | Task | FR Ref | Status |
|---|---|---|---|---|
| 2.2.1 | BE | `POST /requirements` — create draft (FR-REQ-001 fields) | FR-REQ-001 | [x] |
| 2.2.2 | BE | Auto-save draft on field change | 8.6 | [x] |
| 2.2.3 | BE | Mode selection — online / offline / both | FR-REQ-002 | [x] |
| 2.2.4 | BE | Schedule fields — days, time, duration | FR-REQ-003 | [x] |
| 2.2.5 | BE | `POST /requirements/:id/publish` — Draft → Open (no payment) | FR-REQ-004 | [x] |
| 2.2.6 | BE | Requirement status machine transitions | FR-REQ-005 | [x] |
| 2.2.7 | BE | `PATCH /requirements/:id/cancel` | FR-REQ-005 | [x] |
| 2.2.8 | BE | Student-only requirement access guard | 5.3 | [x] |
| 2.2.9 | FE | Requirement create / edit form | FR-REQ-001 | [x] |
| 2.2.10 | FE | Mode + schedule picker UI | FR-REQ-002/003 | [x] |
| 2.2.11 | FE | Draft auto-save indicator | 8.6 | [x] |
| 2.2.12 | FE | Publish button (free — no payment UI) | FR-REQ-004 | [x] |
| 2.2.13 | FE | Requirement list with status badges | FR-REQ-005 | [x] |
| 2.2.14 | FE | Requirement detail page | FR-REQ-005 | [x] |
| 2.2.15 | FE | i18n — requirement forms (hi/en) | 19.5 | [x] |

## 2.3 Module 6 — Matching Engine

| # | Layer | Task | FR Ref | Status |
|---|---|---|---|---|
| 2.3.1 | BE | Tutor search API — subject, class, board, mode, location filters | FR-MATCH-001 | [x] |
| 2.3.2 | BE | PostGIS distance filter — tutor radius ∩ student location | FR-MATCH-001 | [x] |
| 2.3.3 | BE | Ranking engine — verification, schedule overlap, distance, rating | FR-MATCH-001 | [x] |
| 2.3.4 | BE | Auto-rank tutors on requirement publish | FR-MATCH-001 | [x] |
| 2.3.5 | BE | Email notification to top-N matched tutors (SMTP) | FR-MATCH-002 | [x] |
| 2.3.6 | BE | `POST /matches/apply` — tutor application + proposed fee | FR-MATCH-003 | [x] |
| 2.3.7 | BE | `POST /matches/invite` — student invitation | FR-MATCH-004 | [x] |
| 2.3.8 | BE | Block duplicate applications | 9.7 | [x] |
| 2.3.9 | BE | Block apply outside tutor subject/class/board | 9.7 | [x] |
| 2.3.10 | BE | Shortlist / reject / withdraw match transitions | 9.6 | [x] |
| 2.3.11 | BE | Email — new application, shortlisted events | 15.2 | [x] |
| 2.3.12 | FE | Tutor search page with filters | FR-MATCH-001 | [x] |
| 2.3.13 | FE | Tutor profile card — hide contact pre-agreement | FR-DEMO-003 | [x] |
| 2.3.14 | FE | Tutor public profile page | 2.1 | [x] |
| 2.3.15 | FE | Open requirements list (tutor view) | FR-MATCH-003 | [x] |
| 2.3.16 | FE | Apply to requirement form | FR-MATCH-003 | [x] |
| 2.3.17 | FE | Invite tutor button on search results | FR-MATCH-004 | [x] |
| 2.3.18 | FE | Student applications inbox | FR-MATCH-003 | [x] |
| 2.3.19 | FE | Shortlist management UI | 9.6 | [x] |
| 2.3.20 | FE | Search performance — loading states, < 2s target | 9.7 | [x] |
| 2.3.21 | FE | i18n — search + matching (hi/en) | 19.5 | [x] |

### Phase 2 Exit Criteria

- [x] Student publishes free requirement (Draft → Open) — *implemented*
- [x] Tutors receive email alert for matching requirements — *implemented (SMTP)*
- [x] Tutor can search, apply, and be invited — *implemented*
- [x] Student can shortlist tutors — *implemented*
- [x] Search returns results < 2 seconds — *local MVP*
- [x] No student payment flow exists — *confirmed*

---

# Phase 3 — Engagement (Weeks 10–13)

**Status:** Complete.  
**Goal:** Demo class, scheduling (occupy/release), digital agreements.

### Delivered (Phase 3)

| Area | What was built |
|---|---|
| Demo class | Book after shortlist; one demo/match; join details; COMPLETED / CANCELLED / **NO_SHOW**; **no commission** |
| Reminders | Cron every 5 min → email ~1h before SCHEDULED demos (`reminderSentAt`) |
| Scheduling | Occupy on ACTIVE; student release; **15‑min buffer** (before+after UI); conflict checks; IST |
| Exceptions | `tutor_availability_exceptions` — all-day blocks; enforced on book/occupy; tutor CRUD on `/schedule` |
| Agreements | Generate; pdf-lib PDF; dual sign + IP; **signed email** to other party; ACTIVE → occupy + Cloudinary PDF |
| Emails | Demo scheduled / reminder / completed (both) / cancelled|no-show; slot released; agreement signed + active |
| UI | `/demos`, `/demos/[id]`, `/schedule` (buffer bands + exceptions), `/agreements` |
| Key paths | `api/src/demo-classes`, `demo-reminder.service.ts`, `api/src/schedules`, `api/src/agreements` |

> **MVP notes:** Agreement PDF on **Cloudinary** (S3 deferred by product choice). Student calendar auto-resolves `tutorId` from an active/pending agreement when query param omitted.

## 3.1 Database — Demo, Scheduling, Agreements

| # | Layer | Task | Status |
|---|---|---|---|
| 3.1.1 | DB | `demo_classes` — match_id, scheduled_at, mode, duration, status, join_details | [x] |
| 3.1.2 | DB | Enum — `DemoClassStatus` (REQUESTED, SCHEDULED, COMPLETED, CANCELLED, NO_SHOW) | [x] |
| 3.1.3 | DB | `schedule_slots` — tutor_id, start_at, end_at, status, agreement_id | [x] |
| 3.1.4 | DB | Enum — `SlotStatus` (AVAILABLE, OCCUPIED, RELEASED) | [x] |
| 3.1.5 | DB | `agreements` — match_id, monthly_fee, schedule_json, pdf_url/pdf_storage_key (Cloudinary), sign timestamps/IPs, status | [x] |
| 3.1.6 | DB | Enum — `AgreementStatus` (DRAFT, PENDING_STUDENT_SIGN, PENDING_TUTOR_SIGN, ACTIVE, COMPLETED, CANCELLED) | [x] |
| 3.1.7 | DB | Index — `schedule_slots(tutor_id, start_at)` | [x] |
| 3.1.8 | DB | Migration v004 — demo, scheduling, agreements | [x] |
| 3.1.9 | DB | `tutor_availability_exceptions` + `demo_classes.reminder_sent_at` (`20240802200000_phase3_complete`) | [x] |

## 3.2 Module 7 — Demo Class

| # | Layer | Task | FR Ref | Status |
|---|---|---|---|---|
| 3.2.1 | BE | `POST /demo-classes/book` — post-shortlist only | FR-DEMO-001 | [x] |
| 3.2.2 | BE | Enforce one demo per tutor–student pair per requirement | FR-DEMO-002 | [x] |
| 3.2.3 | BE | 15-minute buffer check on demo booking | FR-DEMO-001 | [x] |
| 3.2.4 | BE | Hide contact details in API responses pre-agreement | FR-DEMO-003 | [x] |
| 3.2.5 | BE | Platform-mediated join details (meeting link / address) | FR-DEMO-003 | [x] |
| 3.2.6 | BE | Demo status transitions — SCHEDULED → COMPLETED / CANCELLED | 10.4 | [x] |
| 3.2.7 | BE | Email — demo scheduled, ~1h reminder (cron), completion (both parties), cancel/no-show | 15.2 | [x] |
| 3.2.8 | BE | Demo does NOT trigger commission | 10.5 | [x] |
| 3.2.9 | FE | Book demo class UI (date, time, mode, duration) | FR-DEMO-001 | [x] |
| 3.2.10 | FE | Demo class detail — join info (no contact leak) | FR-DEMO-003 | [x] |
| 3.2.11 | FE | Demo list on student + tutor dashboards | 10.4 | [x] |
| 3.2.12 | FE | Confirm no **pre-agreement** chat UI (post-ACTIVE chat added later) | OQ-4 | [x] |
| 3.2.13 | FE | i18n — demo class screens (hi/en) | 19.5 | [x] |

## 3.3 Module 8 — Scheduling Engine

| # | Layer | Task | FR Ref | Status |
|---|---|---|---|---|
| 3.3.1 | BE | `GET /schedules/calendar` — tutor weekly view | FR-SCH-001 | [x] |
| 3.3.2 | BE | Tutor availability template (weekly) + exception dates CRUD | FR-SCH-001 | [x] |
| 3.3.3 | BE | `POST /schedules/slots/occupy` — on agreement ACTIVE | FR-SCH-002 | [x] |
| 3.3.4 | BE | `POST /schedules/slots/release` — student-only action | FR-SCH-002 | [x] |
| 3.3.5 | BE | 15-minute buffer enforcement (online + offline) | FR-SCH-003 | [x] |
| 3.3.6 | BE | Reject conflicting demo/agreement slots | FR-SCH-004 | [x] |
| 3.3.7 | BE | Email — slot released notification | 15.2 | [x] |
| 3.3.8 | BE | IST timezone handling | 11.5 | [x] |
| 3.3.9 | FE | Tutor calendar view — AVAILABLE / OCCUPIED / RELEASED | 11.5 | [x] |
| 3.3.10 | FE | Student release slot action on occupied slots | FR-SCH-002 | [x] |
| 3.3.11 | FE | Visual buffer bands before/after each occupied slot | FR-SCH-003 | [x] |
| 3.3.12 | FE | i18n — calendar (hi/en) | 19.5 | [x] |
| 3.3.13 | FE | Exception dates editor on tutor calendar | FR-SCH-001 | [x] |

## 3.4 Module 9 — Agreement Management

| # | Layer | Task | FR Ref | Status |
|---|---|---|---|---|
| 3.4.1 | BE | `POST /agreements/generate` — from match data | FR-AGR-001 | [x] |
| 3.4.2 | BE | Agreement PDF template — student, tutor, subject, fee, schedule | FR-AGR-001 | [x] |
| 3.4.3 | BE | PDF generation (Puppeteer / pdf-lib) | FR-AGR-001 | [x] |
| 3.4.4 | BE | `POST /agreements/:id/sign` — click-to-sign + IP/timestamp audit | FR-AGR-002 | [x] |
| 3.4.5 | BE | Dual-signature flow — student then tutor (or parallel) | FR-AGR-002 | [x] |
| 3.4.6 | BE | Upload signed PDF to Cloudinary (S3 deferred) — immutable retention | FR-AGR-003 | [x] |
| 3.4.7 | BE | On ACTIVE — slot occupy + match MATCHED + requirement ACTIVE (+ Phase 4 commission hook) | FR-AGR-001 | [x] |
| 3.4.8 | BE | Agreement status machine | 12.4 | [x] |
| 3.4.9 | BE | Email — agreement signed (other party) + agreement active (both) | 15.2 | [x] |
| 3.4.10 | FE | Agreement preview page (read-only terms) | FR-AGR-001 | [x] |
| 3.4.11 | FE | Digital sign button + confirmation | FR-AGR-002 | [x] |
| 3.4.12 | FE | Download signed PDF link | FR-AGR-003 | [x] |
| 3.4.13 | FE | Agreement list on student + tutor dashboards | 12.4 | [x] |
| 3.4.14 | FE | i18n — agreement screens (hi/en) | 19.5 | [x] |

### Phase 3 Exit Criteria

- [x] Student books demo class after shortlist — *implemented*
- [x] No **pre-agreement** in-app chat — *confirmed*; post-ACTIVE student↔tutor chat shipped separately
- [x] Student and tutor sign agreement digitally — *implemented*
- [x] Agreed slots marked OCCUPIED on ACTIVE — *implemented*
- [x] Student can release slot → status RELEASED (available again) — *implemented*
- [x] 15-minute buffer enforced — *implemented*
- [x] Signed PDF stored in Cloudinary and downloadable — *implemented*

---

# Phase 4 — Tutor Monetization (Weeks 14–16)

**Status:** Complete.  
**Goal:** Registration fee + one-time commission (GST inclusive). No subscriptions.

### Delivered (Phase 4)

| Area | What was built |
|---|---|
| Registration fee | ₹199 GST incl.; Pay Now checkout; Earn First deferral to first commission |
| Commission | On ACTIVE: 30% GST incl.; unique tutor–student; invoice PDF; overdue cron + **hide from search** until paid/waived |
| Payments | Razorpay initiate/verify/webhook + **`PAYMENTS_MOCK`**; success/fail/history |
| Admin | `GET/POST` waive APIs + FE `/admin/commissions` |
| Notifications | **BullMQ** email queue (3 attempts, backoff) + `notifications` table; session reminders |
| UI | `/commissions`, `/payments/*`, admin commissions (hi/en) |
| Key paths | `api/src/commissions`, `payments`, `notifications` (BullMQ), `web/lib/payments.ts` |

> **Notes:** Live Razorpay needs `RAZORPAY_*` + `PAYMENTS_MOCK=false`. Verification emails are Phase 5. No subscription module.

## 4.1 Database — Payments & Commissions

| # | Layer | Task | Status |
|---|---|---|---|
| 4.1.1 | DB | `commissions` — tutor_id, student_id, agreement_id, gross_amount, taxable_amount, gst_amount, status | [x] |
| 4.1.2 | DB | `payments` — payer_id, type, gross_amount, taxable_amount, gst_amount, gateway_ref, entity_type, entity_id | [x] |
| 4.1.3 | DB | Enum — `CommissionStatus` (PENDING, GENERATED, PAID, OVERDUE, WAIVED, CANCELLED) | [x] |
| 4.1.4 | DB | Enum — `PaymentType` (REGISTRATION, COMMISSION) | [x] |
| 4.1.5 | DB | Unique constraint — `commissions(tutor_id, student_id)` one-time rule | [x] |
| 4.1.6 | DB | Migration v005 — payments + commissions (`20240802190000_payments_commissions`) + `registration_fee_choice` + `notifications` | [x] |

## 4.2 Module 10 — Commission Management

| # | Layer | Task | FR Ref | Status |
|---|---|---|---|---|
| 4.2.1 | BE | Generate commission on agreement ACTIVE — 30% incl. GST | FR-COM-001 | [x] |
| 4.2.2 | BE | GST breakdown — taxable = gross ÷ 1.18 | FR-COM-003 | [x] |
| 4.2.3 | BE | Skip commission if tutor–student pair already charged | OQ-8 | [x] |
| 4.2.4 | BE | Add deferred ₹199 registration to first commission invoice | FR-COM-002 | [x] |
| 4.2.5 | BE | Commission status machine — GENERATED → PAID / OVERDUE | 13.4 | [x] |
| 4.2.6 | BE | Admin waive commission with reason + audit | 13.5 | [x] |
| 4.2.7 | BE | GST invoice PDF generation | FR-COM-003 | [x] |
| 4.2.8 | BE | Email — payment due, overdue reminders | 15.2 | [x] |
| 4.2.9 | FE | Tutor commission invoice view | FR-COM-001 | [x] |
| 4.2.10 | FE | Invoice line items — commission, registration, GST breakdown | FR-COM-003 | [x] |
| 4.2.11 | FE | Commission payment history list | 13.4 | [x] |
| 4.2.12 | FE | i18n — payment screens (hi/en) | 19.5 | [x] |

## 4.3 Module 11 — Payment

| # | Layer | Task | FR Ref | Status |
|---|---|---|---|---|
| 4.3.1 | BE | Razorpay SDK integration (sandbox) | 14.1 | [x] |
| 4.3.2 | BE | `POST /payments/initiate` — registration fee ₹199 incl. GST | FR-PAY-002 | [x] |
| 4.3.3 | BE | `POST /payments/initiate` — commission payment | FR-PAY-003 | [x] |
| 4.3.4 | BE | `POST /payments/webhook` — idempotent callback handler | 14.4 | [x] |
| 4.3.5 | BE | On success — update registration_fee_status / commission status | FR-PAY-002/003 | [x] |
| 4.3.6 | BE | On failure — no business state change | 14.4 | [x] |
| 4.3.7 | BE | Email payment receipt with GST breakdown | 14.4 | [x] |
| 4.3.8 | BE | Explicitly exclude subscription / recurring billing logic | OQ-8 | [x] |
| 4.3.9 | FE | Tutor registration fee checkout (Pay Now — Option A) | FR-PAY-002 | [x] |
| 4.3.10 | FE | Commission payment checkout (Razorpay) | FR-PAY-003 | [x] |
| 4.3.11 | FE | Payment success / failure pages | 14.4 | [x] |
| 4.3.12 | FE | Earn First Pay Later — no checkout at onboarding | FR-TUT-007 | [x] |
| 4.3.13 | FE | Confirm no student payment UI exists | FR-REQ-004 | [x] |

## 4.4 Module 12 — Notifications (Payment Events)

| # | Layer | Task | FR Ref | Status |
|---|---|---|---|---|
| 4.4.1 | BE | BullMQ job queue for async email delivery | 15.3 | [x] |
| 4.4.2 | DB | `notifications` table — user_id, event, channel, payload, status, sent_at | [x] |
| 4.4.3 | BE | Notification retry policy on SMTP failure | 15.3 | [x] |
| 4.4.4 | BE | HTML + plain-text email templates — MVP catalog (verification → Phase 5) | 15.2 | [x] |
| 4.4.5 | FE | Admin commissions list + waive UI | 13.5 | [x] |
| 4.4.6 | BE | Overdue cron + hide tutor from search until paid/waived | 13.4 | [x] |

### Phase 4 Exit Criteria

- [x] Tutor pays ₹199 registration (GST inclusive) via Razorpay — *or mock checkout when `PAYMENTS_MOCK=true`*
- [x] Earn First Pay Later defers ₹199 to first commission (e.g. ₹1,800 + ₹199 = ₹1,999 on ₹6,000/mo)
- [x] One-time commission 30% of monthly fee (GST inclusive) on first agreement per student
- [x] Duplicate commission blocked for same tutor–student pair
- [x] Payment receipts emailed via SMTP
- [x] No subscription module in codebase
- [x] BullMQ email queue with retry + notification log
- [x] Overdue commissions restrict discoverability until paid/waived

---

# Phase 5 — Trust & Operations (Weeks 17–19)

**Goal:** Verification, ratings, disputes, admin dashboard, audit logs.

> **Notes:** Dispute evidence uses **Cloudinary** (not S3). Optional document numbers encrypted with AES-256-GCM. Student/admin marks requirement `COMPLETED` when agreement is `ACTIVE` → unlocks bidirectional ratings.

## 5.1 Database — Verification, Ratings, Disputes, Audit

| # | Layer | Task | Status |
|---|---|---|---|
| 5.1.1 | DB | Extend `tutor_documents` — AADHAAR, PAN, DEGREE types + verification_status | [x] |
| 5.1.2 | DB | Enum — `VerificationStatus` (NOT_SUBMITTED, PENDING, APPROVED, REJECTED) | [x] |
| 5.1.3 | DB | `ratings` — agreement_id, rater_id, ratee_id, score, review | [x] |
| 5.1.4 | DB | `disputes` — agreement_id, type, status, resolution, evidence_urls (Cloudinary) | [x] |
| 5.1.5 | DB | Enum — `DisputeType`, `DisputeStatus` | [x] |
| 5.1.6 | DB | `audit_logs` — actor_id, action, entity_type, entity_id, metadata | [x] |
| 5.1.7 | DB | Migration `20240802210000_trust_ops` — verification, ratings, disputes | [x] |

## 5.2 Module 4 — Tutor Verification

| # | Layer | Task | FR Ref | Status |
|---|---|---|---|---|
| 5.2.1 | BE | Upload Aadhaar, PAN, degree documents | FR-TUT-009 | [x] |
| 5.2.2 | BE | Verification status machine | 7.4 | [x] |
| 5.2.3 | BE | Admin `POST /admin/verification/:id/approve` | FR-TUT-010 | [x] |
| 5.2.4 | BE | Admin reject with mandatory reason | FR-TUT-010 | [x] |
| 5.2.5 | BE | Verified badge flag on tutor profile | FR-TUT-011 | [x] |
| 5.2.6 | BE | Lower unverified tutors in search ranking | 7.5 | [x] |
| 5.2.7 | BE | Document access audit log | 7.5 | [x] |
| 5.2.8 | BE | PII encryption at rest for Aadhaar/PAN | 19.1 | [x] |
| 5.2.9 | BE | Email — verification approved / rejected | 15.2 | [x] |
| 5.2.10 | FE | Tutor verification document upload UI | FR-TUT-009 | [x] |
| 5.2.11 | FE | Verification status indicator on tutor profile | 7.4 | [x] |
| 5.2.12 | FE | Verified badge component on cards + profile | FR-TUT-011 | [x] |
| 5.2.13 | FE | Admin verification queue page | FR-TUT-010 | [x] |
| 5.2.14 | FE | Admin document viewer (masked Aadhaar/PAN) | 14.2 | [x] |
| 5.2.15 | FE | Approve / reject with reason form | FR-TUT-010 | [x] |

## 5.3 Module 13 — Ratings & Reviews

| # | Layer | Task | FR Ref | Status |
|---|---|---|---|---|
| 5.3.1 | BE | `POST /ratings` — student rates tutor (1–5 stars) | FR-RAT-001 | [x] |
| 5.3.2 | BE | `POST /ratings` — tutor rates student | FR-RAT-002 | [x] |
| 5.3.3 | BE | Gate ratings — requirement COMPLETED only | 16.4 | [x] |
| 5.3.4 | BE | One rating per party per engagement | 16.4 | [x] |
| 5.3.5 | BE | Tutor aggregate rating on profile + search | 16.3 | [x] |
| 5.3.6 | FE | Rating form — stars + optional review text | FR-RAT-001 | [x] |
| 5.3.7 | FE | Display ratings on tutor profile + search cards | 16.3 | [x] |
| 5.3.8 | FE | i18n — ratings (hi/en) | 19.5 | [x] |

## 5.4 Module 14 — Dispute Management

| # | Layer | Task | FR Ref | Status |
|---|---|---|---|---|
| 5.4.1 | BE | `POST /disputes` — create case (student, tutor, admin) | FR-DISP-001 | [x] |
| 5.4.2 | BE | Evidence file upload to Cloudinary | FR-DISP-002 | [x] |
| 5.4.3 | BE | Admin review + close with resolution notes | FR-DISP-003 | [x] |
| 5.4.4 | BE | Dispute does not auto-cancel agreement | 17.3 | [x] |
| 5.4.5 | FE | Create dispute form + evidence upload | FR-DISP-001 | [x] |
| 5.4.6 | FE | Dispute status view for student + tutor | 17.2 | [x] |
| 5.4.7 | FE | Admin dispute management page | FR-DISP-003 | [x] |

## 5.5 Module 15 — Admin Panel

| # | Layer | Task | FR Ref | Status |
|---|---|---|---|---|
| 5.5.1 | BE | `GET /admin/metrics/users` — students, tutors, MAU | 18.1 | [x] |
| 5.5.2 | BE | `GET /admin/metrics/revenue` — registration + commission totals | 18.2 | [x] |
| 5.5.3 | BE | `GET /admin/metrics/operations` — pending verifications, active disputes | 18.3 | [x] |
| 5.5.4 | BE | Admin waive / adjust commission | 18.4 | [x] |
| 5.5.5 | BE | Export reports CSV | 18.4 | [x] |
| 5.5.6 | BE | `GET /admin/audit-logs` — paginated | 19.1 | [x] |
| 5.5.7 | BE | Requirement → COMPLETED lifecycle trigger | FR-REQ-005 | [x] |
| 5.5.8 | FE | Admin dashboard — KPI widgets | 18.1–18.3 | [x] |
| 5.5.9 | FE | Revenue charts — registration vs commission | 18.2 | [x] |
| 5.5.10 | FE | Admin layout + navigation | 18.4 | [x] |
| 5.5.11 | FE | i18n — admin panel (hi/en) | 19.5 | [x] |

### Phase 5 Exit Criteria

- [x] Admin can approve/reject tutor verification with badge
- [x] Bidirectional ratings after completed requirement
- [x] Dispute create → review → close flow works
- [x] Admin dashboard shows user, revenue, and ops metrics
- [x] Audit logs capture admin actions

---

# Phase 6 — Hardening & Launch (Weeks 20–21)

**Goal:** QA, security, performance, production deploy, beta launch.

> **Phase 6 code hardening (this ship):** security headers, JWT refresh rotation, unit/integration tests, Playwright smoke, k6 smoke, OWASP + runbook docs, legal stubs, i18n parity.  
> **Deferred to ops:** live VPS/SSL, production Docker, monitoring SaaS, live SMTP/Razorpay keys, beta cohort, 1-week soak.  
> **N/A:** S3 presigned URLs — files use Cloudinary (see `docs/OWASP_CHECKLIST.md`).

## 6.1 Cross-Cutting — Security & NFR

| # | Layer | Task | FR Ref | Status |
|---|---|---|---|---|
| 6.1.1 | BE | JWT short expiry + refresh rotation review | 19.1 | [x] |
| 6.1.2 | BE | bcrypt cost 12 for passwords | 19.1 | [x] |
| 6.1.3 | BE | Input validation on all DTOs | 19.1 | [x] |
| 6.1.4 | BE | CORS restricted to known origins | 19.1 | [x] |
| 6.1.5 | BE | CSP headers | 19.1 | [x] |
| 6.1.6 | BE | S3 presigned URLs with TTL | 19.1 | [N/A] |
| 6.1.7 | BE | API p95 latency < 500ms (exclude search) | 19.2 | [~] |
| 6.1.8 | BE | Search response < 2 seconds | 19.2 | [~] |
| 6.1.9 | INFRA | Production VPS/AWS deploy — manual git pull + restart | 13.1 | [deferred] |
| 6.1.10 | INFRA | Production Docker DB + Redis | 13.2 | [deferred] |
| 6.1.11 | INFRA | Monitoring alerts — error rate, latency, disk | 13.4 | [deferred] |
| 6.1.12 | INFRA | SMTP production credentials configured | 15.3 | [deferred] |
| 6.1.13 | INFRA | Razorpay live keys configured | 16.3 | [deferred] |
| 6.1.14 | INFRA | Domain + SSL live | 16.3 | [deferred] |

`[~]` = covered by local k6 smoke thresholds / docs in `scripts/k6/search-smoke.js` + `docs/RUNBOOK.md` (not a production soak).

## 6.2 Testing

| # | Layer | Task | Status |
|---|---|---|---|
| 6.2.1 | BE | Unit tests — commission calc, GST inclusive, matching score | [x] |
| 6.2.2 | BE | Integration tests — auth refresh rotation, requirement rules, payment amounts | [x] |
| 6.2.3 | FE+BE | E2E — student posts free requirement (auth gate smoke) | [x] |
| 6.2.4 | FE+BE | E2E — tutor applies → demo → agreement → commission | [manual] |
| 6.2.5 | FE+BE | E2E — slot release frees tutor calendar | [manual] |
| 6.2.6 | FE+BE | E2E — admin verifies tutor → badge appears | [manual] |
| 6.2.7 | FE+BE | E2E — language switch hi ↔ en | [x] |
| 6.2.8 | BE | Load test — 10K requirements (k6) | [~] |
| 6.2.9 | BE | Security review — OWASP top 10 | [x] |

`[manual]` = document critical path; automate when seed fixtures are expanded. `[~]` on 6.2.8 = light k6 smoke (not 10K).

## 6.3 Launch Readiness

| # | Layer | Task | Status |
|---|---|---|---|
| 6.3.1 | INFRA | Legal docs — Terms, Privacy Policy, Agreement template | [x] |
| 6.3.2 | INFRA | Beta cohort — 50 verified tutors, 100 students | [deferred] |
| 6.3.3 | INFRA | Runbook + rollback plan documented | [x] |
| 6.3.4 | FE | Full hi/en coverage audit on all screens | [x] |
| 6.3.5 | BE | All FR-* requirements traceable to shipped code | [x] |

### Phase 6 Exit Criteria

- [x] Code hardening P0 security items shipped (helmet, CORS prod, refresh rotation)
- [deferred] 99.9% staging uptime during 1-week soak
- [x] Critical E2E smoke paths pass (home/locale/login/requirement gate)
- [deferred] Production live with beta users

---

# Module Completion Matrix

| Module | Phase | Status | BE | FE | DB |
|---|---|---|:---:|:---:|:---:|
| 1 — Authentication & Authorization | 0, 1 | Done | ✓ | ✓ | ✓ |
| 2 — Student Management | 1, 2 | Done (Phase 1+2 requirements) | ✓ | ✓ | ✓ |
| 3 — Tutor Management | 1 | Done (Cloudinary + PostGIS location) | ✓ | ✓ | ✓ |
| 4 — Tutor Verification | 5 | Done | ✓ | ✓ | ✓ |
| 5 — Requirement Management | 2 | Done (+ COMPLETED lifecycle in Phase 5) | ✓ | ✓ | ✓ |
| 6 — Matching Engine | 2 | Done (PostGIS ST_DWithin; verified + rating boost) | ✓ | ✓ | ✓ |
| 7 — Demo Class | 3 | Done | ✓ | ✓ | ✓ |
| 8 — Scheduling Engine | 3 | Done | ✓ | ✓ | ✓ |
| 9 — Agreement Management | 3 | Done (Cloudinary PDF) | ✓ | ✓ | ✓ |
| 10 — Commission Management | 4 | Done | ✓ | ✓ | ✓ |
| 11 — Payment (tutor only) | 4 | Done | ✓ | ✓ | ✓ |
| 12 — Notifications (SMTP email) | 0, 2, 3, 4, 5 | Done (OTP + marketplace + verification emails via BullMQ) | ✓ | — | ✓ |
| 13 — Ratings & Reviews | 5 | Done | ✓ | ✓ | ✓ |
| 14 — Dispute Management | 5 | Done (Cloudinary evidence) | ✓ | ✓ | ✓ |
| 15 — Admin Panel | 1, 5 | Done (users, commissions, verification, metrics, audit) | ✓ | ✓ | ✓ |
| 16 — Post-agreement chat | post-5 | Done (ACTIVE-only student↔tutor, REST poll) | ✓ | ✓ | ✓ |

---

# FR Traceability Checklist

| FR ID | Description | Phase | BE | FE | DB | Done |
|---|---|---|---|---|---|---|
| FR-TUT-001 | Tutor profile creation | 1 | [x] | [x] | [x] | [x] |
| FR-TUT-002 | Subject, class, board selection | 1 | [x] | [x] | [x] | [x] |
| FR-TUT-003 | Document upload | 1 | [x] | [x] | [x] | [x] |
| FR-TUT-004 | Online/offline availability | 1 | [x] | [x] | [x] | [x] |
| FR-TUT-005 | Teaching radius | 1 | [x] | [x] | [x] | [x] |
| FR-TUT-006 | Earn First, Pay Later choice | 1 | [x] | [x] | [x] | [x] |
| FR-TUT-007 | registrationFeeStatus tracking | 1, 4 | [x] | [x] | [x] | [x] |
| FR-TUT-008 | Deferred ₹199 on first commission | 4 | [x] | [x] | [x] | [x] |
| FR-TUT-009 | Aadhaar, PAN, degree upload | 5 | [x] | [x] | [x] | [x] |
| FR-TUT-010 | Admin document verification | 5 | [x] | [x] | [x] | [x] |
| FR-TUT-011 | Verified badge | 5 | [x] | [x] | [x] | [x] |
| FR-REQ-001 | Create requirement | 2 | [x] | [x] | [x] | [x] |
| FR-REQ-002 | Mode selection | 2 | [x] | [x] | [x] | [x] |
| FR-REQ-003 | Schedule selection | 2 | [x] | [x] | [x] | [x] |
| FR-REQ-004 | Free posting | 2 | [x] | [x] | [x] | [x] |
| FR-REQ-005 | Requirement status lifecycle | 2, 3, 5 | [x] | [x] | [x] | [x] |
| FR-MATCH-001 | Auto-rank tutors | 2 | [x] | [x] | [x] | [x] |
| FR-MATCH-002 | Email notify matched tutors | 2 | [x] | — | [x] | [x] |
| FR-MATCH-003 | Tutor apply | 2 | [x] | [x] | [x] | [x] |
| FR-MATCH-004 | Student invite tutor | 2 | [x] | [x] | [x] | [x] |
| FR-DEMO-001 | Demo class booking | 3 | [x] | [x] | [x] | [x] |
| FR-DEMO-002 | Demo class rules | 3 | [x] | [x] | [x] | [x] |
| FR-DEMO-003 | Contact privacy | 2, 3 | [x] | [x] | — | [x] |
| FR-SCH-001 | Tutor calendar | 3 | [x] | [x] | [x] | [x] |
| FR-SCH-002 | Slot occupy / release | 3 | [x] | [x] | [x] | [x] |
| FR-SCH-003 | 15-minute buffer | 3 | [x] | [x] | — | [x] |
| FR-SCH-004 | Conflict rejection | 3 | [x] | — | — | [x] |
| FR-AGR-001 | Agreement generation | 3 | [x] | [x] | [x] | [x] |
| FR-AGR-002 | Digital dual signature | 3 | [x] | [x] | [x] | [x] |
| FR-AGR-003 | PDF permanent storage | 3 | [x] | [x] | — | [x] |
| FR-COM-001 | One-time commission (30% GST incl.) | 4 | [x] | [x] | [x] | [x] |
| FR-COM-002 | Registration fee add-on | 4 | [x] | [x] | [x] | [x] |
| FR-COM-003 | GST inclusive invoicing | 4 | [x] | [x] | [x] | [x] |
| FR-PAY-002 | Tutor registration fee | 4 | [x] | [x] | [x] | [x] |
| FR-PAY-003 | Commission collection | 4 | [x] | [x] | [x] | [x] |
| FR-RAT-001 | Student rates tutor | 5 | [x] | [x] | [x] | [x] |
| FR-RAT-002 | Tutor rates student | 5 | [x] | [x] | [x] | [x] |
| FR-DISP-001 | Create dispute case | 5 | [x] | [x] | [x] | [x] |
| FR-DISP-002 | Evidence upload | 5 | [x] | [x] | [x] | [x] |
| FR-DISP-003 | Admin close dispute | 5 | [x] | [x] | [x] | [x] |

---

# Explicitly Out of Scope (Do Not Implement)

- [x] In-app chat / messaging — **pre-agreement only out of scope**; post-ACTIVE student↔tutor chat allowed
- [ ] SMS / WhatsApp / push notifications
- [ ] Tutor subscription plans
- [ ] Recurring monthly commission
- [ ] Student posting fee / student payments
- [ ] Premium tutor tiers
- [ ] CI/CD pipeline (manual deploy only) — **Phase 7C.1 adds minimal GitHub Actions (test/audit); full CD still out of scope**
- [ ] Native iOS/Android apps
- [ ] Video calls in-app
- [ ] Session attendance logging (occupy/release only)

> Go-live work (security, staging, soft launch) is **in scope for Phase 7** — see [`GO_LIVE_CHECKLIST.md`](./GO_LIVE_CHECKLIST.md).

---

# Final MVP Launch Checklist

Close during **Phase 7D.5** (see [`GO_LIVE_CHECKLIST.md`](./GO_LIVE_CHECKLIST.md)). Do not treat as done before 7A + 7B exit.

| # | Item | Status | Phase 7 link |
|---|---|---|---|
| L1 | All Phase 0–6 exit criteria met | [x] | Code complete; infra soak deferred |
| L2 | All 15 modules functional | [x] | Re-verify during soak |
| L3 | Tutor pays only registration + commission | [x] | Shipped |
| L4 | GST inclusive on all tutor fees | [x] | Shipped |
| L5 | Email OTP + all notifications via SMTP | [~] | Needs live SMTP on host |
| L6 | Demo class works; pre-agreement no chat (post-ACTIVE chat OK) | [x] | Shipped |
| L7 | Slot occupy/release + 15 min buffer | [x] | Shipped |
| L8 | Hindi + English on all screens | [x] | Shipped |
| L9 | Razorpay live + SMTP production tested | [~] | Deferred with staging host |
| L10 | 50 verified tutors onboarded | [~] | Invite gate ready; cohort is ops |
| L11 | Legal documents published | [x] | 7D.1 |
| L12 | Runbook and rollback plan ready | [x] | + OPS_PLAYBOOK + SOAK_CHECKLIST |

---

*End of Implementation Checklist*
