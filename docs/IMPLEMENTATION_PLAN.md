# TutorConnect India — Implementation Plan

**Version:** 1.5  
**Date:** June 2026  
**Author:** Product & Engineering  
**Target:** MVP Launch (16–20 weeks)  
**Changelog (v1.5):** Email-only notifications via SMTP (OTP + all alerts)  
**Changelog (v1.4):** Tutor-only monetization (registration + commission); no subscription module  
**Changelog (v1.3):** GST inclusive on commission and registration (not added on top)  
**Changelog (v1.2):** Demo class replaces chat; occupy/release slots; 15 min buffer; GST; one-time commission per student  
**Changelog (v1.1):** Free posting; 30% commission; hi/en i18n; VPS/AWS hosting; Docker DB; no CI/CD

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Delivery Strategy](#2-delivery-strategy)
3. [Recommended Tech Stack](#3-recommended-tech-stack)
4. [System Architecture](#4-system-architecture)
5. [Phase Breakdown](#5-phase-breakdown)
6. [Sprint-Level Roadmap](#6-sprint-level-roadmap)
7. [Team Structure](#7-team-structure)
8. [Dependencies & Critical Path](#8-dependencies--critical-path)
9. [API & Service Design](#9-api--service-design)
10. [Database Schema (High Level)](#10-database-schema-high-level)
11. [Third-Party Integrations](#11-third-party-integrations)
12. [Testing Strategy](#12-testing-strategy)
13. [DevOps & Infrastructure](#13-devops--infrastructure)
14. [Security & Compliance](#14-security--compliance)
15. [Risks & Mitigations](#15-risks--mitigations)
16. [Definition of Done (MVP)](#16-definition-of-done-mvp)
17. [Post-MVP Backlog](#17-post-mvp-backlog)

---

## 1. Executive Summary

TutorConnect India MVP delivers a verified tutor marketplace with end-to-end flows: registration → profile → requirement posting → matching → demo class → agreement → occupy/release scheduling → tutor payment (registration + one-time commission) → ratings.

### MVP Monetization (Tutor Only)

| Fee | Who pays | Amount | Frequency |
|---|---|---|---|
| Registration fee | Tutor | ₹199 incl. GST | Once (or deferred to first commission) |
| Commission | Tutor | 30% of monthly fee incl. GST | Once per tutor–student pair |
| Requirement posting | Student | Free | — |

**No subscription module in MVP.** No recurring tutor plans, no student platform fees.

### MVP Scope Boundaries

| In Scope (MVP) | Out of Scope (Post-MVP) |
|---|---|
| Auth (email OTP via SMTP + password) | Native iOS/Android apps |
| Student & tutor profiles | AI-based matching |
| Tutor verification (manual admin) | Video calls in-app |
| Requirement posting (free) | Tutor subscription plans |
| Rule-based matching & ranking | Recurring monthly commission |
| Demo class booking (no in-app chat) | Multi-student group tuition |
| Scheduling (occupy/release slots) | Tutor payroll / payouts |
| Digital agreements (PDF) | Advanced analytics / BI |
| Tutor payments only (registration + commission) | Premium tutor tiers |
| One-time commission (30%, GST inclusive) | |
| Email notifications (SMTP) — OTP + all alerts | SMS / WhatsApp notifications |
| Payments (Razorpay) — tutor only | Push notifications (FCM) |
| Multi-lingual UI (Hindi + English) | Additional regional languages |
| Ratings & reviews | |
| Admin panel (core ops) | |

### Timeline Overview

| Phase | Duration | Outcome |
|---|---|---|
| Phase 0 — Foundation | 2 weeks | Infra, Docker DB, auth, project scaffold |
| Phase 1 — Core Profiles | 3 weeks | Student + tutor onboarding complete |
| Phase 2 — Marketplace Core | 4 weeks | Requirements, matching, search |
| Phase 3 — Engagement | 4 weeks | Demo class, scheduling, agreements |
| Phase 4 — Tutor Monetization | 3 weeks | Registration fee + one-time commission (no subscriptions) |
| Phase 5 — Trust & Ops | 3 weeks | Verification, ratings, disputes, admin |
| Phase 6 — Hardening & Launch | 2 weeks | QA, perf, security, beta launch |

**Total: ~21 weeks** (adjustable to 16 weeks with parallel workstreams and scope trim)

---

## 2. Delivery Strategy

### 2.1 Approach

- **Modular monolith first** — single deployable backend with clear module boundaries; extract services later if needed
- **API-first** — OpenAPI contract drives frontend and mobile (future) development
- **Vertical slices** — each sprint ships a testable user-facing flow, not horizontal layers only
- **Feature flags** — gate incomplete modules in production

### 2.2 Environments

| Environment | Purpose |
|---|---|
| `local` | Developer machines; PostgreSQL + Redis via Docker Compose |
| `staging` | UAT, payment sandbox, load testing (VPS or AWS) |
| `production` | Live users (VPS or AWS) |

### 2.3 Branching

- `main` — production
- `develop` — integration branch
- `feature/*` — short-lived feature branches
- PR required with 1+ review; manual deploy (no CI/CD pipeline for MVP)

---

## 3. Recommended Tech Stack

### 3.1 Backend

| Layer | Choice | Rationale |
|---|---|---|
| Runtime | Node.js 20 LTS + TypeScript | Full-stack JS, large hiring pool |
| Framework | NestJS | Modular architecture, DI, guards for RBAC |
| ORM | Prisma | Type-safe schema, migrations |
| Database | PostgreSQL 16 | Relational integrity, JSON support |
| Cache | Redis 7 | Sessions, OTP, rate limiting, job queues |
| Search | PostgreSQL + PostGIS (MVP) | Geo queries; migrate to Elasticsearch at scale |
| Queue | BullMQ (Redis) | Async jobs: email notifications, PDF, matching |
| Email | Nodemailer + SMTP | OTP and all MVP notifications |
| File Storage | AWS S3 / Cloudflare R2 | Documents, agreement PDFs |

### 3.2 Frontend

| Layer | Choice | Rationale |
|---|---|---|
| Web App | Next.js 14 (App Router) | SSR for SEO (tutor discovery), React ecosystem |
| UI | Tailwind CSS + shadcn/ui | Fast, consistent component library |
| i18n | next-intl | Hindi (`hi`) + English (`en`) with locale routing |
| State | TanStack Query + Zustand | Server state + light client state |
| Mobile (MVP) | Responsive PWA | Defer native apps; add Capacitor later if needed |

### 3.3 Admin Panel

- Next.js separate route group (`/admin`) or standalone app sharing API
- Role-gated via middleware

### 3.4 Infrastructure & DevOps

| Tool | Purpose |
|---|---|
| Docker Compose | PostgreSQL 16 + PostGIS and Redis for local and staging DB |
| VPS or AWS EC2 | Application hosting (API + Next.js) |
| AWS S3 | Documents, agreement PDFs (when on AWS); or VPS object storage alternative |
| Nginx | Reverse proxy, SSL termination on VPS |
| Sentry | Error monitoring |

> **Out of scope for MVP:** CI/CD pipelines (GitHub Actions, auto-deploy). Deployments are manual via SSH or AWS console.

---

## 4. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Student Web  │  │  Tutor Web   │  │    Admin Panel       │  │
│  │  (Next.js)   │  │  (Next.js)   │  │    (Next.js)         │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
└─────────┼─────────────────┼─────────────────────┼───────────────┘
          │                 │                     │
          └────────────────┬┴─────────────────────┘
                           │ HTTPS / WSS
┌──────────────────────────▼──────────────────────────────────────┐
│                      API GATEWAY / CDN                           │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                   BACKEND (NestJS Monolith)                       │
│  ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌───────────┐ ┌────────┐ │
│  │  Auth   │ │ Profiles│ │ Matching │ │ Scheduling│ │  Demo  │ │
│  └─────────┘ └─────────┘ └──────────┘ └───────────┘ └────────┘ │
│  ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌───────────┐ ┌────────┐ │
│  │  Reqs   │ │Agreement│ │ Payment  │ │Commission │ │ Admin  │ │
│  └─────────┘ └─────────┘ └──────────┘ └───────────┘ └────────┘ │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              Notification Service (internal)                 ││
│  └─────────────────────────────────────────────────────────────┘│
└───────┬──────────────┬───────────────┬───────────────┬──────────┘
        │              │               │               │
   ┌────▼────┐   ┌─────▼─────┐  ┌─────▼─────┐  ┌─────▼─────┐
   │PostgreSQL│   │   Redis   │  │    S3     │  │ Razorpay  │
   │+PostGIS  │   │           │  │           │  │           │
   │ (Docker) │   │ (Docker)  │  │           │  │           │
   └─────────┘   └───────────┘  └───────────┘  └───────────┘
```

> PostgreSQL and Redis run in Docker containers on VPS/AWS. API and web app deploy as Node.js processes (or optional Docker) behind Nginx.

### 4.1 Module Boundaries (Backend Packages)

```
src/
├── auth/
├── users/
├── students/
├── tutors/
├── verification/
├── requirements/
├── matching/
├── demo/
├── scheduling/
├── agreements/
├── payments/
├── commissions/
├── notifications/
├── ratings/
├── disputes/
├── admin/
└── common/          # guards, filters, pipes, utils
```

---

## 5. Phase Breakdown

### Phase 0 — Foundation (Weeks 1–2)

**Goal:** Runnable project with auth skeleton and local/staging infrastructure.

| Task | Owner | Deliverable |
|---|---|---|
| Standalone api + web (npm) | Backend Lead | `api/`, `web/` |
| Docker Compose (PostgreSQL + PostGIS, Redis) | Backend | `docker-compose.yml` |
| Prisma schema (users) + migrations | Backend | Migration v001 |
| JWT auth (OTP via email SMTP + password); single-role enforcement | Backend | `/auth/*` endpoints |
| SMTP email service (Nodemailer) | Backend | OTP + notification mailer |
| VPS or AWS EC2 provisioning + Nginx | Infra | Staging server ready |
| Next.js scaffold + auth pages + i18n setup (hi/en) | Frontend | Login, register, email OTP |
| API contract (OpenAPI v0.1) | Backend | Swagger docs |

**Exit Criteria:** User can register, receive OTP via email, login, switch language, and see empty dashboard.

---

### Phase 1 — Core Profiles (Weeks 3–5)

**Goal:** Complete student and tutor onboarding.

| Task | Deliverable |
|---|---|
| Student profile CRUD | Student dashboard |
| Tutor profile CRUD (bio, subjects, classes, boards) | Tutor profile wizard |
| Document upload to S3 | Presigned URL flow |
| Availability editor (online/offline) | Weekly slot UI |
| Teaching radius + geocoding | Pincode → lat/lng |
| Earn First Pay Later choice | `registrationFeeStatus` field |
| i18n: profile and onboarding strings (hi/en) | Locale files for Phase 1 screens |
| Admin: basic user list | Admin users page |

**Exit Criteria:** Tutor can complete profile to 100%; student can view/edit profile.

---

### Phase 2 — Marketplace Core (Weeks 6–9)

**Goal:** Requirements live; tutors discoverable; matching works.

| Task | Deliverable |
|---|---|
| Requirement CRUD + status machine | Requirement form |
| Free publish flow (Draft → Open, no payment) | `POST /:id/publish` |
| Tutor search with filters | Search page < 2s |
| Matching engine v1 (rule-based score) | Ranked tutor list per requirement |
| Tutor apply to requirement | Application flow |
| Student invite tutor | Invitation flow |
| Match notifications (email via SMTP) | Event: NEW_REQUIREMENT |
| Shortlist management | Student shortlist UI |

**Exit Criteria:** Student posts free requirement; tutors apply; student shortlists.

---

### Phase 3 — Engagement (Weeks 10–13)

**Goal:** Demo class, slot occupy/release scheduling, and legal agreement in place.

| Task | Deliverable |
|---|---|
| Demo class booking (post-shortlist) | Schedule trial session; no chat |
| Demo notifications + join details | Platform-mediated; contact hidden |
| Tutor calendar with occupy/release | Slots OCCUPIED on agreement ACTIVE |
| Student slot release action | Released slots return to AVAILABLE |
| 15-minute buffer (online + offline) | Scheduling rules engine |
| Agreement PDF generation | Template + Puppeteer/pdf-lib |
| Digital dual-signature flow | Sign → ACTIVE agreement |
| Permanent PDF storage | S3 with retention policy |

**Exit Criteria:** Student books demo, signs agreement; agreed slots occupied; student can release slots; tutor calendar updates correctly.

---

### Phase 4 — Tutor Monetization (Weeks 14–16)

**Goal:** Tutor-side payments only — registration fee and one-time commission. No subscription module.

| Task | Deliverable |
|---|---|
| Tutor registration fee payment (₹199 GST inclusive) | Option A flow |
| One-time commission invoice (30% of fee, GST inclusive) | Post-agreement trigger; once per tutor–student pair |
| Duplicate commission guard | Skip if tutor–student already charged |
| Deferred ₹199 (GST inclusive) on first commission | Invoice line item logic |
| Commission payment collection | Razorpay checkout at inclusive amount |
| GST invoice PDF | Gross amount, taxable value, CGST/SGST split |
| Overdue handling + reminders | Status → OVERDUE |
| Payment webhooks (idempotent) | Gateway callback handler |
| Payment due + receipt emails | SMTP templates for monetization events |

**Explicitly excluded:** subscription billing, recurring payments, student payment flows, premium tutor tiers.

**Exit Criteria:** Both tutor payment types (registration + commission) work end-to-end in staging sandbox.

---

### Phase 5 — Trust & Operations (Weeks 17–19)

**Goal:** Verification, feedback, disputes, and admin ops complete.

| Task | Deliverable |
|---|---|
| Verification upload (Aadhaar, PAN, degree) | Document types |
| Admin verification queue | Approve/reject UI |
| Verified badge on profiles | Badge component |
| Ratings & reviews (bidirectional) | Post-completion flow |
| Dispute case management | Admin dispute module |
| Admin dashboard metrics | KPI widgets |
| Audit logging | Admin action trail |
| Requirement → Completed lifecycle | Status transitions |

**Exit Criteria:** Admin can verify tutors, view revenue, manage disputes; users can rate.

---

### Phase 6 — Hardening & Launch (Weeks 20–21)

**Goal:** Production-ready beta.

| Task | Deliverable |
|---|---|
| Load testing (10K requirements) | Perf report |
| Security review (OWASP top 10) | Remediation list |
| Penetration test (basic) | Sign-off |
| E2E test suite (Playwright) | Critical path coverage |
| Beta user onboarding (50 tutors, 100 students) | Feedback log |
| Production deployment + monitoring | Go-live checklist |
| Runbook + on-call setup | Ops docs |

**Exit Criteria:** 99.9% staging uptime during soak test; all P0 bugs resolved.

---

## 6. Sprint-Level Roadmap

Assuming 2-week sprints:

| Sprint | Theme | Key Stories |
|---|---|---|
| S1 | Foundation | Monorepo, Docker DB, VPS/AWS, OTP auth, i18n scaffold |
| S2 | Auth complete | Password login, forgot password, JWT refresh, single-role guard |
| S3 | Tutor profile p1 | Profile fields, photo upload, subjects |
| S4 | Tutor profile p2 | Availability, radius, registration fee choice |
| S5 | Student + requirements | Student profile, requirement draft |
| S6 | Publish requirements | Free publish (Draft → Open), no payment gate |
| S7 | Search + matching p1 | Tutor search, geo filter, ranking v1 |
| S8 | Matching p2 | Apply, invite, shortlist, notifications |
| S9 | Demo class | Demo booking, notifications, no chat |
| S10 | Scheduling | Occupy/release slots, 15 min buffer |
| S11 | Agreements | PDF gen, dual sign, S3 storage |
| S12 | Tutor payments | Registration + one-time commission (no subscription) |
| S13 | Verification + admin | Doc review, badge, admin dashboard |
| S14 | Ratings + disputes + i18n | Reviews, dispute cases, full hi/en coverage |
| S15 | Hardening | Perf, security, E2E, beta launch |

---

## 7. Team Structure

### 7.1 Recommended Team (MVP)

| Role | Count | Responsibility |
|---|---|---|
| Product Manager / TPM | 1 | Scope, priorities, stakeholder alignment |
| Tech Lead / Architect | 1 | Architecture, code review, unblocking |
| Backend Engineer | 2 | API, matching, payments, notifications |
| Frontend Engineer | 2 | Web app, admin panel |
| QA Engineer | 1 | Test plans, automation, UAT |
| Infra (part-time) | 0.5 | VPS/AWS setup, Docker, monitoring |
| UI/UX Designer | 1 | Wireframes, design system (weeks 1–8) |

**Total: ~8.5 FTE**

### 7.2 Lean Team (16-week compress)

| Role | Count |
|---|---|
| Full-stack Engineer | 2 |
| Frontend Engineer | 1 |
| TPM (part-time) | 0.5 |
| QA (part-time) | 0.5 |

Defer: SMS, WhatsApp, push notifications, advanced admin reports, Elasticsearch.

---

## 8. Dependencies & Critical Path

```
Auth ──► Profiles ──► Requirements ──► Matching ──► Demo Class
                              │              │
                              ▼              ▼
                          (no payment)   Scheduling ──► Agreement
                              (occupy/release)              │
                                                          ▼
                                              One-Time Commission ──► Launch
```

### Critical Path Items

1. **Auth + RBAC + single-role enforcement** — blocks everything
2. **Razorpay integration** — blocks tutor registration fee and commission (not requirement publish)
3. **Geocoding + PostGIS** — blocks offline matching
4. **Agreement signing** — blocks commission and ACTIVE state
5. **Admin verification** — blocks trust positioning (can soft-launch without)
6. **i18n (hi/en)** — parallel track from Phase 0; must complete before launch

### Parallel Workstreams

| Stream A | Stream B |
|---|---|
| Backend matching engine | Frontend tutor search UI |
| Demo class API | Scheduling calendar UI |
| PDF agreement generation | Admin verification UI |
| Notification service | Ratings UI |

---

## 9. API & Service Design

### 9.1 Core API Groups

| Group | Prefix | Key Endpoints |
|---|---|---|
| Auth | `/api/v1/auth` | `POST /register`, `POST /login`, `POST /otp/send`, `POST /otp/verify` |
| Students | `/api/v1/students` | `GET /me`, `PATCH /me` |
| Tutors | `/api/v1/tutors` | `GET /me`, `PATCH /me`, `POST /documents` |
| Requirements | `/api/v1/requirements` | `CRUD`, `POST /:id/publish` |
| Matching | `/api/v1/matches` | `GET /search`, `POST /apply`, `POST /invite` |
| Demo | `/api/v1/demo-classes` | `POST /book`, `GET /me`, `PATCH /:id/cancel` |
| Scheduling | `/api/v1/schedules` | `GET /calendar`, `POST /slots/occupy`, `POST /slots/release` |
| Agreements | `/api/v1/agreements` | `POST /generate`, `POST /:id/sign` |
| Payments | `/api/v1/payments` | `POST /initiate`, `POST /webhook` |
| Commissions | `/api/v1/commissions` | `GET /me`, `POST /:id/pay` |
| Admin | `/api/v1/admin` | Verification, disputes, reports |

### 9.2 Key Events (Internal)

| Event | Subscribers |
|---|---|
| `requirement.published` | Matching, Notifications |
| `match.shortlisted` | Notifications, Demo Class |
| `demo.scheduled` | Notifications |
| `agreement.signed` | Commission (one-time), Scheduling (occupy), Notifications |
| `slot.released` | Notifications |
| `commission.generated` | Notifications, Payments |
| `payment.completed` | Requirements, Commissions, Notifications |
| `verification.approved` | Notifications, Search index |

---

## 10. Database Schema (High Level)

### 10.1 Core Tables

```sql
users (id, mobile, email, password_hash, role, status, created_at)
students (id, user_id, name, ...)
tutors (id, user_id, name, bio, experience, registration_fee_status, ...)
tutor_subjects (tutor_id, subject_id)
tutor_availability (tutor_id, day, start_time, end_time, mode)
tutor_documents (tutor_id, type, s3_key, verification_status)
requirements (id, student_id, class, subject, board, budget, mode, status, location_geog)
matches (id, requirement_id, tutor_id, status, score, ...)
applications (match_id, message, proposed_fee, ...)
agreements (id, match_id, pdf_s3_key, student_signed_at, tutor_signed_at, status)
commissions (id, tutor_id, student_id, agreement_id, gross_amount, taxable_amount, gst_amount, registration_fee, status, due_date)
demo_classes (id, match_id, scheduled_at, mode, duration, status)
schedule_slots (id, tutor_id, start_at, end_at, status, agreement_id, buffer_minutes)
payments (id, payer_id, type, gross_amount, taxable_amount, gst_amount, gateway_ref, status, entity_type, entity_id)
ratings (id, agreement_id, rater_id, ratee_id, score, review, created_at)
disputes (id, agreement_id, type, status, resolution, created_at)
notifications (id, user_id, channel, event, payload, status, sent_at)
audit_logs (id, actor_id, action, entity_type, entity_id, metadata, created_at)
```

### 10.2 Indexing Priorities

- `tutors` + PostGIS GIST on location
- `requirements(status, subject_id, class_id)` composite
- `matches(requirement_id, status)`
- `commissions(tutor_id, student_id)` unique — enforces one-time commission per pair
- `schedule_slots(tutor_id, start_at)` — occupancy queries

---

## 11. Third-Party Integrations

| Service | Provider | Phase | Purpose |
|---|---|---|---|
| Email / OTP | SMTP via Nodemailer | Phase 0 | OTP, all MVP notifications |
| Payments | Razorpay | Phase 4 | Registration (₹199) + commission (30%) — both GST inclusive |
| Maps / Geocoding | Google Maps API | Phase 1 | Pincode, distance |
| File Storage | AWS S3 | Phase 1 | Documents, PDFs |
| Error Tracking | Sentry | Phase 0 | Error monitoring |

**Post-MVP integrations:** MSG91/Twilio (SMS), Firebase FCM (push), WhatsApp Business API.

---

## 12. Testing Strategy

### 12.1 Test Pyramid

| Level | Coverage Target | Tools |
|---|---|---|
| Unit | 70% backend business logic | Jest |
| Integration | All API endpoints | Supertest + test DB |
| E2E | Critical user journeys | Playwright |
| Load | Search + matching | k6 |

### 12.2 Critical E2E Scenarios

1. Student registers → posts requirement (free) → requirement Open
2. Tutor registers → completes profile → applies
3. Student shortlists → books demo class → signs agreement
4. One-time commission invoice: ₹1,800 GST inclusive (or ₹1,999 with deferred ₹199 registration)
5. Student releases occupied slot → tutor calendar shows available
6. Admin approves verification → badge appears
7. Student rates tutor after completion
8. User switches UI language between Hindi and English

### 12.3 QA Gates per Phase

- No P0/P1 bugs open
- API p95 < 500ms in staging
- Payment flows verified in Razorpay sandbox
- Security checklist passed

---

## 13. DevOps & Infrastructure

### 13.1 MVP Infrastructure

| Component | Spec |
|---|---|
| API | Node.js on VPS or AWS EC2 (PM2 or systemd) |
| Web | Next.js on same VPS/AWS or separate instance |
| PostgreSQL | Docker container with PostGIS extension |
| Redis | Docker container (sessions, OTP, queues) |
| Reverse proxy | Nginx with Let's Encrypt SSL |
| File storage | AWS S3 (recommended) or local volume on VPS |
| Deploy | Manual: git pull → build → restart (no CI/CD) |

### 13.2 Docker Compose (Database Layer)

```yaml
# docker-compose.yml — local and staging
services:
  postgres:
    image: postgis/postgis:16-3.4
    volumes: [postgres_data:/var/lib/postgresql/data]
    ports: ["5432:5432"]
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
```

API and web app run directly on the host (or optional Docker later). Database and cache always via Docker.

### 13.3 Hosting Options

| Option | Pros | Cons |
|---|---|---|
| **VPS** (DigitalOcean, Linode, Hetzner) | Low cost, full control | Manual ops, single point of failure |
| **AWS EC2** | Scalable, pairs with S3/RDS path later | Higher cost, more config |

**Recommendation:** Start with a single VPS (4 vCPU, 8 GB RAM) or AWS EC2 `t3.medium` for staging + production isolation.

### 13.4 Monitoring

| Metric | Alert Threshold |
|---|---|
| API error rate | > 1% over 5 min |
| API p95 latency | > 800ms |
| DB connections | > 80% pool |
| Payment webhook failures | Any failure |
| Disk / storage | > 85% |

---

## 14. Security & Compliance

### 14.1 MVP Security Checklist

- [ ] JWT with short expiry + refresh rotation
- [ ] bcrypt password hashing (cost 12)
- [ ] Rate limiting on auth and OTP endpoints
- [ ] Input validation (class-validator / Zod)
- [ ] SQL injection prevention (Prisma parameterized)
- [ ] XSS prevention (CSP headers, output encoding)
- [ ] CORS restricted to known origins
- [ ] S3 presigned URLs with TTL for documents
- [ ] PII encryption at rest (Aadhaar, PAN)
- [ ] Audit log for admin and payment actions
- [ ] DPDP Act 2023 awareness — consent, data deletion request flow

### 14.2 Document Handling

- Aadhaar/PAN stored encrypted; masked in UI (e.g., `XXXX-XXXX-1234`)
- Admin access logged per view
- Retention policy: 7 years for agreements and financial records

---

## 15. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Razorpay integration delays | Medium | High | Start sandbox in Phase 0; mock payment adapter |
| Geo-matching accuracy | Medium | Medium | Pincode fallback; manual radius override |
| Low tutor supply at launch | High | High | Seed tutors in target cities; referral incentive |
| Fake tutor documents | Medium | High | Manual verification MVP; ML doc check later |
| Chat abuse / contact leakage | Low | Medium | No chat in MVP; demo join details platform-only |
| Scope creep | High | High | Strict MVP boundary; feature flags |
| Performance at scale | Low (MVP) | Medium | PostGIS indexes; Redis cache; load test in Phase 6 |
| Legal agreement validity | Medium | High | Legal review of agreement template before launch |

---

## 16. Definition of Done (MVP)

### 16.1 Functional DoD

- [ ] All 12 MVP modules from PRD implemented
- [ ] All FR-* requirements traceable to shipped feature
- [ ] Demo class flow works; no chat module in MVP
- [ ] Slot occupy on agreement; student release frees tutor calendar
- [ ] Tutor-only payments: registration (₹199) + one-time commission (30% incl. GST)
- [ ] No subscription or recurring billing module
- [ ] Hindi and English UI complete on all MVP screens
- [ ] All notifications and OTP delivered via SMTP email
- [ ] Admin can verify tutors and view dashboard metrics
- [ ] Agreement PDF generated and stored on every match

### 16.2 Non-Functional DoD

- [ ] API p95 < 500ms (excluding search; search < 2s)
- [ ] 99.9% uptime during 1-week staging soak
- [ ] OWASP top 10 addressed
- [ ] Audit logs for admin and payment events
- [ ] Runbook documented

### 16.3 Launch Checklist

- [ ] Legal: Terms of Service, Privacy Policy, Tutor Agreement template
- [ ] Razorpay live keys configured
- [ ] SMTP configured (host, port, TLS, credentials via env vars)
- [ ] Test email delivery for OTP and sample notifications
- [ ] Domain + SSL configured
- [ ] Beta cohort onboarded (minimum 50 verified tutors)
- [ ] Support email / chat ready
- [ ] Rollback plan documented

---

## 17. Post-MVP Backlog

| Priority | Feature | Rationale |
|---|---|---|
| P1 | SMS + WhatsApp notifications | Higher reach in India |
| P1 | Push notifications (FCM) | Real-time mobile/web alerts |
| P1 | Native mobile apps | Better retention and push |
| P1 | Tutor subscription plans | Recurring revenue model |
| P2 | In-app chat / messaging | Post-agreement communication |
| P2 | Tutor payout tracking | If platform collects student fees |
| P2 | Video session integration | Zoom/Meet embed for online tuition |
| P2 | ML matching score | Improve match quality |
| P2 | Elasticsearch for search | Scale beyond 100K tutors |
| P2 | Referral program | Growth |
| P3 | Additional regional languages (Tamil, Telugu, etc.) | Beyond hi/en |
| P3 | Institutional / school accounts | B2B channel |
| P3 | Automated document verification | Reduce admin load |

---

## Appendix A — Requirement Traceability Matrix (Sample)

| PRD Ref | Feature | Phase | Status |
|---|---|---|---|
| FR-TUT-001 | Tutor profile creation | Phase 1 | Planned |
| FR-TUT-006 | Earn First Pay Later | Phase 1 | Planned |
| FR-REQ-004 | Free requirement posting | Phase 2 | Planned |
| FR-DEMO-001 | Demo class booking | Phase 3 | Planned |
| FR-MATCH-001 | Auto-rank tutors | Phase 2 | Planned |
| FR-SCH-002 | Slot occupy/release | Phase 3 | Planned |
| FR-COM-002 | One-time commission (GST inclusive) | Phase 4 | Planned |
| FR-TUT-011 | Verified badge | Phase 5 | Planned |
| FR-RAT-001 | Student rates tutor | Phase 5 | Planned |

---

## Appendix B — Folder Structure (Standalone Apps)

```
tutorconnect/
├── api/                     # NestJS backend (npm)
├── web/                     # Next.js frontend (npm)
├── docs/
│   ├── FUNCTIONALITY.md
│   ├── IMPLEMENTATION_PLAN.md
│   └── IMPLEMENTATION_CHECKLIST.md
├── docker-compose.yml       # PostgreSQL + Redis
└── README.md
```

> No monorepo / no pnpm workspaces. Each app has its own `package.json` and `node_modules`. Deploy independently.

### Appendix C — Resolved Product Decisions

| Decision | Value |
|---|---|
| OQ-1: Dual student + tutor role | No — one role per account |
| OQ-2: Posting fee | Free — no student payment |
| OQ-3: Commission rate | Fixed 30%; one-time per tutor–student pair |
| OQ-4: Communication | No chat; demo class after shortlist |
| OQ-5: Slot tracking | Occupy on agreement confirm; student releases |
| OQ-6: GST | 18% inclusive on commission and registration (not on top) |
| OQ-7: Buffer | 15 minutes (online and offline) |
| OQ-8: MVP monetization | Tutor pays registration + commission only; no subscription module |
| Notifications (MVP) | Email only via SMTP (OTP + all alerts) |
| Hosting | VPS or AWS EC2; manual deploy |
| Database | PostgreSQL + Redis via Docker Compose |
| Repo layout | Standalone `api/` + `web/` (npm); no monorepo/pnpm |
| CI/CD | Skipped for MVP |
| i18n | Hindi + English on frontend |

---

*End of Implementation Plan*
