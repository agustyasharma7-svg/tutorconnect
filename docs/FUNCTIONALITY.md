# TutorConnect India — Functionality Specification

**Version:** 1.5  
**Date:** June 2026  
**Status:** MVP Scope  
**Source:** Product Requirements Document v1.0  
**Changelog (v1.5):** Email-only notifications via SMTP (OTP + all alerts); SMS/push/WhatsApp deferred  
**Changelog (v1.4):** MVP monetization — tutor pays registration + commission only; no subscription module  
**Changelog (v1.3):** GST inclusive on commission and registration fees (not added on top)  
**Changelog (v1.2):** Demo class replaces chat; occupy/release slots; 15 min buffer; GST; one-time commission per student  
**Changelog (v1.1):** Resolved OQ-1/2/3; free requirement posting; 30% commission; Hindi + English UI

---

## Table of Contents

1. [Product Summary](#1-product-summary)
2. [User Roles & Permissions](#2-user-roles--permissions)
3. [Module Overview](#3-module-overview)
4. [Module 1 — Authentication & Authorization](#4-module-1--authentication--authorization)
5. [Module 2 — Student Management](#5-module-2--student-management)
6. [Module 3 — Tutor Management](#6-module-3--tutor-management)
7. [Module 4 — Tutor Verification](#7-module-4--tutor-verification)
8. [Module 5 — Requirement Management](#8-module-5--requirement-management)
9. [Module 6 — Matching Engine](#9-module-6--matching-engine)
10. [Module 7 — Demo Class](#10-module-7--demo-class)
11. [Module 8 — Scheduling Engine](#11-module-8--scheduling-engine)
12. [Module 9 — Agreement Management](#12-module-9--agreement-management)
13. [Module 10 — Commission Management](#13-module-10--commission-management)
14. [Module 11 — Payment](#14-module-11--payment)
15. [Module 12 — Notifications](#15-module-12--notifications)
16. [Module 13 — Ratings & Reviews](#16-module-13--ratings--reviews)
17. [Module 14 — Dispute Management](#17-module-14--dispute-management)
18. [Module 15 — Admin Panel](#18-module-15--admin-panel)
19. [Cross-Cutting Concerns](#19-cross-cutting-concerns)
20. [Key User Journeys](#20-key-user-journeys)
21. [Data Entities (Logical)](#21-data-entities-logical)
22. [Product Decisions & Open Questions](#22-product-decisions--open-questions)

---

## 1. Product Summary

**TutorConnect India** is a verified tutor marketplace connecting students and parents with qualified tutors for online and offline tuition.

### Core Capabilities

| Capability | Description |
|---|---|
| Tutor discovery | Search, filter, and compare verified tutors by subject, class, board, location, and availability |
| Requirement posting | Students publish tuition needs with budget, schedule, and mode preferences |
| Location-based matching | Rank tutors by geographic proximity and teaching radius |
| Tutor verification | Admin-reviewed identity and qualification documents with verified badge |
| Digital agreements | Auto-generated, dual-signed tuition contracts stored as PDF |
| Schedule management | Tutor calendars with slot occupy/release tied to confirmed agreements |
| Demo class | Trial session booking between shortlisted student and tutor (no in-app chat) |
| Commission management | One-time platform commission per tutor–student match; registration fees |
| Multi-lingual UI | Hindi and English across student, tutor, and admin interfaces |
| Ratings & reviews | Bidirectional 1–5 star feedback after engagements |
| Dispute resolution | Admin-mediated cases with evidence upload |

### Business Goals

- Build a trusted tutor marketplace
- Generate revenue from tutor registration fees and one-time match commissions
- Reduce fake profiles
- Increase successful tuition matches

### MVP Monetization Model

> **Product decision (v1.4):** Only **tutors** pay the platform in MVP. There is **no subscription module**.

| Payer | Platform fees in MVP |
|---|---|
| **Student** | None (requirement posting is free) |
| **Tutor** | Registration fee (₹199 incl. GST) + one-time commission per student (30% of monthly fee incl. GST) |

**Tutor payment types (only these two):**

1. **Registration fee** — ₹199 incl. GST at onboarding, or deferred via Earn First, Pay Later
2. **Commission** — one-time per tutor–student pair when agreement becomes ACTIVE

**Explicitly out of MVP:**

- Tutor subscription plans (monthly/annual)
- Student posting fees or platform fees
- Recurring monthly commission
- Premium tutor tiers or paid visibility boosts

### User Goals

| Persona | Goals |
|---|---|
| Student / Parent | Find verified tutors, compare options, hire easily |
| Tutor | Find genuine opportunities, build professional profile, manage schedule |
| Admin | Verify tutors, resolve disputes, manage commissions, report on operations |

---

## 2. User Roles & Permissions

### 2.1 Student

| Permission | Scope |
|---|---|
| Register / login | Self |
| Create and manage requirements | Own requirements |
| Search tutors | Public tutor profiles (limited before agreement) |
| Book demo class | Shortlisted tutors only |
| Sign agreements | Own agreements |
| Rate tutors | After completed engagement |

### 2.2 Tutor

| Permission | Scope |
|---|---|
| Register / login | Self |
| Create and edit profile | Own profile |
| Upload documents | Own verification documents |
| Apply for requirements | Open requirements within match criteria |
| Accept invitations | Invitations sent by students |
| Conduct demo classes | Shortlisted students only |
| Manage availability | Own calendar |
| Sign agreements | Own agreements |
| Rate students | After completed engagement |
| Pay registration fee / earn-first-pay-later | Own account |

### 2.3 Admin

| Permission | Scope |
|---|---|
| Verify tutor documents | All pending verifications |
| Manage disputes | All dispute cases |
| Manage commissions | All commission records |
| Generate reports | Platform-wide metrics |
| User management | Suspend, ban, or flag accounts (implied) |

### 2.4 Authorization Model

- **Authentication:** JWT-based sessions
- **Authorization:** Role-Based Access Control (RBAC) with role = `STUDENT` | `TUTOR` | `ADMIN`
- **One account, one role:** A user cannot be both student and tutor. Mobile number is unique per role; registration path determines role permanently for MVP

---

## 3. Module Overview

| # | Module | Primary Actors | Depends On |
|---|---|---|---|
| 1 | Authentication & Authorization | All | — |
| 2 | Student Management | Student, Admin | Auth |
| 3 | Tutor Management | Tutor, Admin | Auth |
| 4 | Tutor Verification | Tutor, Admin | Tutor Management |
| 5 | Requirement Management | Student | Auth |
| 6 | Matching Engine | Student, Tutor, System | Requirement, Tutor |
| 7 | Demo Class | Student, Tutor | Matching |
| 8 | Scheduling Engine | Tutor, Student, System | Tutor Management, Agreement |
| 9 | Agreement Management | Student, Tutor, System | Matching, Scheduling |
| 10 | Commission Management | Tutor, Admin, System | Agreement, Payment |
| 11 | Payment | Tutor only | — |
| 12 | Notifications | All | All event sources |
| 13 | Ratings & Reviews | Student, Tutor | Agreement (completed) |
| 14 | Dispute Management | Student, Tutor, Admin | Agreement, Payment |
| 15 | Admin Panel | Admin | All modules |

---

## 4. Module 1 — Authentication & Authorization

### 4.1 Student Registration

**Trigger:** New student signs up.

| Field | Required | Validation |
|---|---|---|
| Name | Yes | Min 2 characters |
| Mobile | Yes | Valid Indian mobile, unique |
| Email | Yes | Valid email, unique; used for OTP and notifications |

**Outcome:** Student account created; OTP sent to email for verification.

> **MVP:** Email is required so OTP and notifications can be delivered via SMTP.

### 4.2 Tutor Registration

**Trigger:** New tutor signs up.

| Field | Required | Validation |
|---|---|---|
| Name | Yes | Min 2 characters |
| Mobile | Yes | Valid Indian mobile, unique |
| Email | Yes | Valid email, unique |
| Qualification | Yes | Free text or structured picklist |

**Outcome:** Tutor account created; OTP sent to email; redirected to profile completion flow.

### 4.3 Login

| Method | Flow |
|---|---|
| Email OTP | Enter email → receive OTP via SMTP → verify → JWT issued |
| Password | Enter email + password → JWT issued |

> **MVP:** OTP is delivered by **email only** (SMTP). SMS OTP is not in MVP scope.

**Session:** JWT with role claim, expiry, and refresh token (recommended).

### 4.4 Forgot Password

1. User enters registered email
2. OTP sent to email via SMTP and verified
3. User sets new password
4. Existing sessions invalidated (recommended)

### 4.5 Acceptance Criteria

- [ ] Duplicate mobile and email registration blocked with clear error
- [ ] OTP sent via SMTP email; expires within configurable TTL (e.g., 5 minutes)
- [ ] Failed login attempts rate-limited
- [ ] JWT enforces RBAC on all protected endpoints
- [ ] Password meets minimum complexity policy

---

## 5. Module 2 — Student Management

### 5.1 Profile

Students maintain a basic profile derived from registration data. Extended fields (address, preferred language, child details) may be captured during requirement creation.

### 5.2 Capabilities

| Feature | Description |
|---|---|
| View profile | Name, mobile, email, requirement history |
| Edit profile | Update name, email |
| View requirements | List all requirements with status |
| View agreements | Active and historical agreements |
| View payments | N/A (students do not pay platform fees in MVP) |

### 5.3 Acceptance Criteria

- [ ] Student can only access own data
- [ ] Profile changes audited in activity log

---

## 6. Module 3 — Tutor Management

### 6.1 Profile Creation — FR-TUT-001

| Field | Required | Notes |
|---|---|---|
| Name | Yes | From registration, editable |
| Photo | Yes | JPG/PNG, max size TBD |
| Bio | Yes | Max 500 characters |
| Experience | Yes | Years or structured range |
| Qualification | Yes | From registration, editable |

### 6.2 Subject, Class, Board Selection — FR-TUT-002

Tutor selects one or more of each:

- **Subjects** — e.g., Mathematics, Physics, English
- **Classes** — e.g., 6–12, competitive exam prep
- **Boards** — e.g., CBSE, ICSE, State Board

**Rule:** At least one subject, one class, and one board required before profile is discoverable.

### 6.3 Document Upload — FR-TUT-003

| Format | Use Case |
|---|---|
| PDF | Certificates, degrees |
| JPG / PNG | ID scans, photos |

Documents stored encrypted; access restricted to tutor and admin.

### 6.4 Availability — FR-TUT-004

| Mode | Definition |
|---|---|
| Online availability | Weekly recurring slots (day + time range) |
| Offline availability | Weekly recurring slots for in-person sessions |

Tutor may enable one or both modes independently.

### 6.5 Teaching Radius — FR-TUT-005

Tutor defines maximum travel distance for offline sessions.

| Option | Value |
|---|---|
| Tier 1 | 5 km |
| Tier 2 | 10 km |
| Tier 3 | 20 km |

Requires tutor home/base location (lat/lng or pincode) for distance calculation.

### 6.6 Earn First, Pay Later — FR-TUT-006 to FR-TUT-008

Tutor chooses registration fee path at onboarding:

| Option | Behavior |
|---|---|
| **Option A — Pay Now** | Pay ₹199 at registration |
| **Option B — Earn First, Pay Later** | No upfront payment; fee deferred |

**`registrationFeeStatus` lifecycle:**

```
PENDING → PAID
        → WAIVED (admin action)
        → REFUNDED (admin action)
```

**Rule (FR-TUT-008):** If status is `PENDING` at first match, ₹199 is added to the tutor's first commission invoice.

### 6.7 Acceptance Criteria

- [ ] Profile completeness score gates discoverability
- [ ] Photo and documents pass virus/malware scan
- [ ] Teaching radius only applies when offline mode enabled
- [ ] Registration fee choice persisted and immutable after first payment event

---

## 7. Module 4 — Tutor Verification

### 7.1 Document Upload — FR-TUT-009

| Document | Purpose |
|---|---|
| Aadhaar | Identity verification |
| PAN | Tax / identity cross-check |
| Degree | Qualification verification |

### 7.2 Admin Verification — FR-TUT-010

| Status | Meaning |
|---|---|
| Pending | Submitted, awaiting admin review |
| Approved | Documents verified |
| Rejected | Failed verification; tutor notified with reason |

### 7.3 Verified Badge — FR-TUT-011

Approved tutors display a **Verified** badge on profile, search results, and match listings.

### 7.4 Verification State Machine

```
NOT_SUBMITTED → PENDING → APPROVED
                        → REJECTED → PENDING (re-upload)
```

### 7.5 Acceptance Criteria

- [ ] Unverified tutors visible in search but ranked lower (recommended)
- [ ] Rejection reason mandatory on admin reject
- [ ] Badge removed immediately on account suspension
- [ ] Document access logged for compliance

---

## 8. Module 5 — Requirement Management

### 8.1 Create Requirement — FR-REQ-001

| Field | Required | Notes |
|---|---|---|
| Class | Yes | e.g., Class 10 |
| Subject | Yes | e.g., Mathematics |
| Board | Yes | e.g., CBSE |
| Budget | Yes | Monthly fee range in INR |
| Location | Yes | Address or pincode; required for offline/both |

### 8.2 Mode Selection — FR-REQ-002

| Option | Description |
|---|---|
| Online | Remote sessions only |
| Offline | In-person sessions only |
| Both | Either mode acceptable |

### 8.3 Schedule — FR-REQ-003

| Field | Description |
|---|---|
| Days | e.g., Mon, Wed, Fri |
| Time | Preferred session start time |
| Duration | Session length (e.g., 60 min) |

### 8.4 Posting Fee — FR-REQ-004

Requirement posting is **free**. No payment is required to publish (transition from Draft → Open).

> **Product decision (v1.1):** Original PRD specified ₹99 posting fee; waived for MVP to reduce student friction.

### 8.5 Requirement Status Lifecycle — FR-REQ-005

```
Draft → Open → Applied → Shortlisted → Matched → Active → Completed
                                              ↘ Cancelled (any pre-Active state)
```

| Status | Definition |
|---|---|
| Draft | Created, not yet published |
| Open | Published (free), accepting applications |
| Applied | At least one tutor application received |
| Shortlisted | Student narrowed tutor list |
| Matched | Student and tutor confirmed |
| Active | Agreement signed; schedule slots occupied |
| Completed | Engagement ended |
| Cancelled | Requirement withdrawn |

### 8.6 Acceptance Criteria

- [ ] Draft auto-saved
- [ ] Student can publish (Draft → Open) without payment
- [ ] Cancelled requirements do not trigger new matches
- [ ] Budget displayed as range if min/max provided

---

## 9. Module 6 — Matching Engine

### 9.1 Matching Parameters

| Category | Parameters |
|---|---|
| Academic | Subject, class, board |
| Geography | Distance (tutor radius ∩ student location) |
| Schedule | Day/time overlap with tutor availability |
| Preferences | Gender, language (optional filters) |

### 9.2 Auto-Ranking — FR-MATCH-001

System scores and ranks eligible tutors when a requirement is published.

**Suggested ranking formula (weighted):**

1. Verification status (verified = boost)
2. Schedule overlap percentage
3. Geographic proximity
4. Rating average
5. Response rate / acceptance rate

### 9.3 Nearby Notifications — FR-MATCH-002

Top-N matched tutors (e.g., within radius and subject match) receive **email** notification of new requirement.

### 9.4 Tutor Application — FR-MATCH-003

Tutor views open requirements and submits application with optional message and proposed fee.

### 9.5 Student Invitation — FR-MATCH-004

Student browses tutor search results and sends direct invitation to specific tutors.

### 9.6 Match Record States

```
INVITED / APPLIED → SHORTLISTED → ACCEPTED → MATCHED
                ↘ REJECTED / WITHDRAWN
```

### 9.7 Acceptance Criteria

- [ ] Search response < 2 seconds for tutor discovery
- [ ] Offline matches respect tutor teaching radius
- [ ] Tutor cannot apply to requirements outside their subject/class/board
- [ ] Duplicate applications blocked

---

## 10. Module 7 — Demo Class

> **Product decision:** Pre-agreement — no in-app chat; students and tutors interact via demo class booking and platform notifications. Contact details remain hidden until agreement is signed. **Post-agreement:** student↔tutor text chat unlocks when agreement status is `ACTIVE`.

### 10.1 Demo Class Booking — FR-DEMO-001

After a tutor is **shortlisted**, the student may book a **demo class** (trial session) to evaluate fit before signing a tuition agreement.

| Field | Required | Notes |
|---|---|---|
| Date | Yes | From tutor available slots |
| Time | Yes | Respects 15-minute buffer rules |
| Mode | Yes | Online or offline (per requirement) |
| Duration | Yes | Default 30–60 minutes (configurable) |

### 10.2 Demo Class Rules — FR-DEMO-002

| Rule | Detail |
|---|---|
| Eligibility | Student must have shortlisted the tutor |
| Limit | One demo class per tutor–student pair per requirement |
| Scheduling | Uses tutor availability; does not permanently occupy recurring agreement slots |
| Contact privacy | Phone, email, and external links hidden (FR-DEMO-003) |
| Outcome | Student proceeds to agreement or removes tutor from shortlist |

### 10.3 Contact Privacy — FR-DEMO-003

- Phone number, email, and external contact links **hidden** until tuition agreement is signed
- Demo session join details (meeting link or address) shared only via platform for the scheduled demo window

### 10.4 Demo Class Status

```
REQUESTED → SCHEDULED → COMPLETED
                     ↘ CANCELLED / NO_SHOW
```

### 10.5 Acceptance Criteria

- [ ] No in-app chat or messaging between users in MVP
- [ ] Demo bookable only for shortlisted tutors
- [ ] One demo per tutor–student pair per requirement
- [ ] Demo slot respects 15-minute buffer on tutor calendar
- [ ] Notifications sent on demo scheduled, reminder, and completion
- [ ] Demo class does not trigger commission

---

## 11. Module 8 — Scheduling Engine

### 11.1 Tutor Calendar — FR-SCH-001

Tutor maintains a weekly recurring availability template plus exception dates (holidays, blocked days).

### 11.2 Slot Occupy / Release — FR-SCH-002

After a tuition agreement is **confirmed** (both parties signed, status = ACTIVE), agreed schedule slots move to **OCCUPIED**.

| State | Meaning |
|---|---|
| `AVAILABLE` | Open for demo booking or new agreements |
| `OCCUPIED` | Bound to an active agreement at that date/time |
| `RELEASED` | Student released the slot; tutor can accept new bookings at that time |

**Occupy:** When agreement is confirmed, each agreed recurring slot (day + time) is marked `OCCUPIED` on the tutor calendar.

**Release:** Only the **student** may release an occupied slot. On release, the slot returns to `AVAILABLE` and the tutor can take other students at that time.

> There is no separate session attendance log in MVP. Slot state is **occupy or release only**.

### 11.3 Buffer Between Slots — FR-SCH-003

A **15-minute buffer** is enforced between all bookings (online and offline) to prevent back-to-back conflicts.

Example: If a slot ends at 5:00 PM, the next bookable slot cannot start before 5:15 PM.

### 11.4 Conflict Rejection — FR-SCH-004

Tutor cannot accept a demo or agreement slot that overlaps an `OCCUPIED` slot or violates the 15-minute buffer.

### 11.5 Acceptance Criteria

- [ ] Calendar view shows `AVAILABLE`, `OCCUPIED`, and released slots clearly
- [ ] 15-minute buffer applied to online and offline sessions
- [ ] Only student can release an occupied slot
- [ ] Released slot immediately available for tutor
- [ ] Timezone handling consistent (IST default)

---

## 12. Module 9 — Agreement Management

### 12.1 Agreement Generation — FR-AGR-001

System auto-generates agreement PDF from confirmed match data.

| Field | Source |
|---|---|
| Student | Student profile |
| Tutor | Tutor profile |
| Subject | Requirement |
| Schedule | Agreed slots |
| Fee | Agreed monthly fee |
| Schedule | Agreed recurring slots (occupied on confirmation) |

### 12.2 Digital Signature — FR-AGR-002

Both student and tutor sign digitally (click-to-sign with timestamp and IP audit trail).

### 12.3 Permanent Storage — FR-AGR-003

Signed PDF stored in durable object storage with immutable retention.

### 12.4 Agreement State Machine

```
DRAFT → PENDING_STUDENT_SIGN → PENDING_TUTOR_SIGN → ACTIVE → COMPLETED
                                                   ↘ CANCELLED
```

### 12.5 Acceptance Criteria

- [ ] Neither party can edit terms after generation
- [ ] Both signatures required before status = Active
- [ ] PDF downloadable by both parties
- [ ] Agreed slots marked `OCCUPIED` when agreement becomes ACTIVE
- [ ] Agreement triggers one-time commission generation (if not already charged for this student)

---

## 13. Module 10 — Commission Management

### 13.1 Commission Generation — FR-COM-001

Commission is generated once when a tuition agreement becomes **ACTIVE** (both parties signed).

**Formula (GST inclusive):**

```
Commission (incl. GST) = 30% × Agreed Monthly Fee
Taxable value          = Commission (incl. GST) ÷ 1.18
GST component          = Commission (incl. GST) − Taxable value
```

The tutor is charged **30% of the monthly fee as a single all-in amount**. GST at **18% is embedded** in that figure — it is **not** added on top.

**One-time rule (OQ-8):** Commission is charged **once per tutor–student pair**. If the same tutor later signs a new agreement with the same student, no additional commission is charged. A new student always triggers a new one-time commission.

### 13.2 Registration Fee Add-On — FR-COM-002

Registration fee **₹199 is also GST inclusive** (not ₹199 + GST).

If tutor `registrationFeeStatus = PENDING`:

```
Total Due = Commission (incl. GST) + Registration Fee (incl. GST)
```

**Example** (monthly fee ₹6,000; GST @ 18% **inclusive**):

| Line Item | Amount charged (incl. GST) | Taxable value (÷ 1.18) | GST component |
|---|---|---|---|
| Monthly Fee (reference) | ₹6,000 | — | — |
| Commission (30%) | ₹1,800 | ₹1,525.42 | ₹274.58 |
| Registration Fee | ₹199 | ₹168.64 | ₹30.36 |
| **Total Due** | **₹1,999** | **₹1,694.06** | **₹304.94** |

### 13.3 GST — FR-COM-003

- All platform fees are **GST inclusive** — commission and ₹199 registration fee
- GST rate: **18%** embedded (confirm SAC/HSN with chartered accountant before launch)
- Invoices show: gross amount charged, taxable value, GST component, CGST/SGST or IGST split
- Razorpay charge amount = total inclusive figure (e.g. ₹1,800 or ₹1,999)

### 13.4 Commission Status Lifecycle

```
PENDING → GENERATED → PAID
                   → OVERDUE
                   → WAIVED
                   → CANCELLED
```

### 13.5 Acceptance Criteria

- [ ] Invoice itemized with commission, registration fee, and GST lines
- [ ] Duplicate commission blocked for same tutor–student pair
- [ ] Overdue triggers notification and account restriction (recommended)
- [ ] Admin can waive with reason and audit trail

---

## 14. Module 11 — Payment

> **MVP scope:** Payment module handles **tutor fees only** — registration fee and one-time commission. No student payments. No subscription billing.

### 14.1 Supported Methods

- UPI
- Credit Card
- Debit Card
- Net Banking

**Integration:** Razorpay or similar India-focused payment gateway.

### 14.2 Tutor Payment Flows (MVP — only these)

| ID | Flow | Amount | Payer | When |
|---|---|---|---|---|
| FR-PAY-002 | Tutor registration fee | ₹199 incl. GST | Tutor | Onboarding (or deferred) |
| FR-PAY-003 | One-time commission | 30% of monthly fee incl. GST (+ ₹199 incl. GST if deferred) | Tutor | First ACTIVE agreement per student |

**Not in MVP:** student posting fee (free), tutor subscriptions, recurring billing, premium plans.

### 14.3 Payment Record

Each payment stores: gateway transaction ID, gross amount (GST inclusive), GST component breakdown, status, payer, linked entity (registration / commission), timestamp.

### 14.4 Acceptance Criteria

- [ ] Idempotent payment callbacks
- [ ] Failed payments do not change business state
- [ ] Receipts generated and emailed for tutor payments (with GST breakdown)
- [ ] GST shown on all tutor invoices and payment receipts
- [ ] Only two tutor payment types implemented (registration + commission)
- [ ] No subscription or recurring payment logic in MVP
- [ ] No student payment flows (posting is free)

---

## 15. Module 12 — Notifications

> **Product decision (v1.5):** MVP uses **email only**, sent via **SMTP**. SMS, push, and WhatsApp are post-MVP.

### 15.1 Delivery (MVP)

| Channel | MVP status | Use cases |
|---|---|---|
| **Email (SMTP)** | **In scope** | OTP, registration, matching, demo class, agreements, payments, reminders |
| Push | Post-MVP | Real-time mobile/web alerts |
| SMS | Post-MVP | OTP fallback, critical SMS alerts |
| WhatsApp | Post-MVP | Match alerts, reminders |

**SMTP integration:**

- Backend: Nodemailer (or equivalent) with configurable SMTP host, port, TLS, credentials
- Dev: Mailtrap or similar SMTP sandbox
- Prod: Gmail SMTP, SendGrid SMTP, AWS SES SMTP, or VPS-hosted mail relay

### 15.2 Event Catalog (MVP — email only)

| Event | Recipients | Channel |
|---|---|---|
| OTP / verification | User | Email (SMTP) |
| New Requirement | Matched tutors | Email |
| New Application | Student | Email |
| Shortlisted | Tutor | Email |
| Demo Class Scheduled | Student, Tutor | Email |
| Demo Class Reminder | Student, Tutor | Email |
| Matched | Student, Tutor | Email |
| Agreement Signed | Student, Tutor | Email |
| Payment Due | Tutor | Email |
| Payment Receipt | Tutor | Email |
| Slot Released | Tutor | Email |
| Session Reminder | Student, Tutor | Email |
| Verification Approved/Rejected | Tutor | Email |

### 15.3 Acceptance Criteria

- [ ] All MVP notifications sent via SMTP email
- [ ] OTP for login, registration, and password reset delivered by email
- [ ] HTML + plain-text email templates for key events
- [ ] Notification delivery logged with retry policy (queue via BullMQ)
- [ ] SMTP credentials stored in environment variables, not in code

---

## 16. Module 13 — Ratings & Reviews

### 16.1 Student Rates Tutor — FR-RAT-001

After requirement status = Completed, student submits 1–5 star rating and optional text review.

### 16.2 Tutor Rates Student — FR-RAT-002

Tutor submits 1–5 star rating for student (review text optional).

### 16.3 Display Rules

- Tutor aggregate rating shown on profile and search
- Student ratings visible to tutors on application view (recommended)
- Reviews moderated for abuse (admin queue)

### 16.4 Acceptance Criteria

- [ ] One rating per party per completed engagement
- [ ] Ratings immutable after 7-day edit window (recommended)
- [ ] Low ratings do not auto-hide; admin can flag

---

## 17. Module 14 — Dispute Management

### 17.1 Dispute Types

| Type | Examples |
|---|---|
| Payment | Commission disputes, fee disagreements |
| Attendance | No-show, repeated cancellations |
| Behavior | Harassment, inappropriate conduct |
| Fraud | Fake credentials, misrepresentation |
| Qualification | Subject competency mismatch |

### 17.2 Case Lifecycle — FR-DISP-001 to FR-DISP-003

```
OPEN → UNDER_REVIEW → RESOLVED → CLOSED
```

| Action | Actor |
|---|---|
| Create case | Student, Tutor, or Admin |
| Upload evidence | Student, Tutor |
| Assign and review | Admin |
| Close with resolution | Admin |

### 17.3 Acceptance Criteria

- [ ] Dispute does not auto-cancel active agreement (admin decision)
- [ ] Evidence files stored securely
- [ ] Resolution notes visible to both parties

---

## 18. Module 15 — Admin Panel

### 18.1 User Metrics

| Metric | Description |
|---|---|
| Total students | Registered student count |
| Total tutors | Registered tutor count |
| Active users | MAU by role |

### 18.2 Revenue Metrics

| Metric | Description |
|---|---|
| Registration fees | Sum of ₹199 (GST inclusive) tutor registration payments |
| Commissions | Sum of one-time commission amounts (GST inclusive; paid + outstanding) |

### 18.3 Operations Metrics

| Metric | Description |
|---|---|
| Pending verifications | Count of PENDING document reviews |
| Active disputes | Open + under review cases |

### 18.4 Admin Actions

- Approve / reject tutor verification
- Waive or adjust commission
- Manage dispute cases
- Export reports (CSV / PDF)
- View audit logs

---

## 19. Cross-Cutting Concerns

### 19.1 Security (NFR)

| Requirement | Implementation |
|---|---|
| JWT Authentication | Access + refresh tokens |
| RBAC | Middleware role checks |
| Encrypted Storage | AES-256 at rest for documents and PII |
| Audit Logs | All admin actions and state changes |

### 19.2 Performance (NFR)

| Metric | Target |
|---|---|
| Search response | < 2 seconds |
| API response (p95) | < 500 ms |

### 19.3 Scalability (NFR)

- 100,000+ registered users
- 10,000+ active requirements concurrently

### 19.4 Availability (NFR)

- 99.9% uptime SLA

### 19.5 Internationalization (i18n)

| Requirement | Detail |
|---|---|
| Languages | Hindi (`hi`) and English (`en`) |
| Scope | All user-facing UI: student app, tutor app, admin panel |
| Default | English; user-selectable language preference |
| Persistence | Language preference stored on user profile |
| Content | UI strings externalized; dates/numbers formatted per locale |
| Agreements & PDFs | English for legal docs in MVP; Hindi summary optional (post-MVP) |

### 19.6 KPIs

| KPI | Definition |
|---|---|
| Monthly Active Tutors | Unique tutors with login or action in month |
| Monthly Active Students | Unique students with login or action in month |
| Successful Matches | Requirements reaching Matched/Active per month |
| Revenue | Registration + commission fees collected |
| Commission Recovery Rate | Paid commissions / generated commissions |
| Tutor Retention | % tutors active month-over-month |
| Student Retention | % students posting or matching month-over-month |

---

## 20. Key User Journeys

### 20.1 Student — Post Requirement and Hire Tutor

```
Register → Create Requirement (Draft) → Publish (Free) → Requirement Open
  → Review Applications / Invite Tutors → Shortlist → Book Demo Class
  → Sign Agreement → Slots Occupied → (Optional) Release Slots → Rate Tutor → Completed
```

### 20.2 Tutor — Register and Get First Student

```
Register → Complete Profile → Upload Documents → Choose Fee Plan
  → (Optional) Pay ₹199 OR Earn First Pay Later
  → Admin Verification → Receive Match Notifications → Apply / Accept Invite
  → Demo Class → Sign Agreement → Slots Occupied on Calendar
  → Pay One-Time Commission (GST inclusive) (+ ₹199 registration if deferred) → Rate Student
```

### 20.3 Admin — Verify Tutor

```
Login → Pending Verifications Queue → Review Documents
  → Approve (badge issued) OR Reject (reason sent) → Audit Log Entry
```

---

## 21. Data Entities (Logical)

| Entity | Key Relationships |
|---|---|
| User | 1:1 Student or Tutor or Admin profile (mutually exclusive roles) |
| Student | 1:N Requirements, Agreements, Payments |
| Tutor | 1:1 Profile, 1:N Applications, Availability, Documents |
| Requirement | N:M Tutors via Match/Application |
| Match | Links Requirement + Tutor with status |
| Agreement | 1:1 Match (post-confirmation) |
| Commission | 1 per tutor–student pair (one-time); triggered on first ACTIVE agreement |
| Payment | Links to Registration or Commission |
| DemoClass | N:1 Match (shortlisted); trial session before agreement |
| ScheduleSlot | Tutor calendar slot: AVAILABLE / OCCUPIED / RELEASED |
| Rating | 1:1 completed Engagement per rater |
| Dispute | N:1 Agreement or Match |
| Notification | N:1 User |
| AuditLog | Polymorphic reference to any entity |

---

## 22. Product Decisions & Open Questions

### Resolved Decisions

| # | Decision | Detail |
|---|---|---|
| OQ-1 | Dual role | **No.** A user cannot be both student and tutor. One mobile number maps to one role. |
| OQ-2 | Posting fee | **Free.** No student payment to publish requirements. No refund flow needed. |
| OQ-3 | Commission rate | **Fixed 30%** of agreed monthly fee. **One-time per tutor–student pair.** |
| OQ-4 | Communication | **No pre-agreement chat.** Demo after shortlist. **Post-ACTIVE** student↔tutor in-app chat allowed. |
| OQ-5 | Session / slot tracking | **Occupy/release only.** Slots occupied on agreement confirm; student releases to free tutor time. |
| OQ-6 | GST | **Yes — 18% GST inclusive** on commission and registration (not added on top). |
| OQ-7 | Buffer between slots | **15 minutes** for online and offline. |
| OQ-8 | MVP monetization | **Tutor pays only:** registration fee + one-time commission per student. **No subscription module.** Students pay nothing to platform. |
| — | Notifications (MVP) | **Email only via SMTP** for OTP and all platform notifications. SMS, push, WhatsApp deferred. |

### Assumptions (MVP)

1. Single web app with role-based views (not separate apps)
2. India-only; currency INR; timezone IST
3. One active match per requirement at a time
4. **Tutor-only monetization** — registration fee + one-time commission; no subscriptions
5. Commission charged to tutor, not student
6. Digital signature is click-to-sign, not Aadhaar e-Sign
7. UI available in Hindi and English from launch
8. No in-app messaging; demo class is the pre-agreement evaluation path
9. All OTP and notifications delivered via SMTP email in MVP

---

*End of Functionality Specification*
