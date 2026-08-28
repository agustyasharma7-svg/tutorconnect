# OWASP Top 10 — TutorConnect India (Phase 6+ / Phase 7)

Mapped to shipped controls after **Phase 7A** remediations. Cloudinary replaces S3 for file storage.  
Tracker: [`GO_LIVE_CHECKLIST.md`](./GO_LIVE_CHECKLIST.md) · plan: [`GO_LIVE_IMPLEMENTATION_PLAN.md`](./GO_LIVE_IMPLEMENTATION_PLAN.md).

| # | Risk | Status | Control in this repo |
|---|---|---|---|
| A01 Broken Access Control | **Improved (7A)** | Role guards; open list + tutor `getOne` redact address/lat/lng (**7A.4**); student calendar `tutorId` bound to agreement (**7A.5**) |
| A02 Cryptographic Failures | **Improved (7A)** | bcrypt 12; JWT secrets required in prod; AES-GCM; refresh SHA-256; OTP via `crypto.randomInt` + **hashed in Redis (7A.6)**; KYC/agreements as Cloudinary **authenticated** + signed URLs (**7A.3**); `DOCUMENT_ENCRYPTION_KEY` **required in prod (7A.7)** |
| A03 Injection | Pass | Prisma parameterized queries; global `ValidationPipe` whitelist + forbidNonWhitelisted |
| A04 Insecure Design | Improved | Pre-agreement privacy; tutor-only payments; **mock payments forbidden in prod (7A.2)** |
| A05 Security Misconfiguration | Improved | Helmet; Next CSP; CORS required in prod; Swagger off in prod; Redis AUTH notes for staging (**7A.6**); default admin seed blocked in prod (**7A.7**) |
| A06 Vulnerable Components | Process | `npm run audit:deps` (CI gate in **7C.1**) |
| A07 Auth Failures | **Improved (7A)** | Access JWT ~15m; refresh rotation + reuse detection; OTP TTL; throttle; **SUSPENDED refused on OTP/password/refresh (7A.1)**; cookie sessions deferred to **7C.3** |
| A08 Software/Data Integrity | Improved | Webhook fail-closed; client HMAC; **`PAYMENTS_MOCK` hard-fail in prod (7A.2)**; transactional markSuccess deferred to **7C.5** |
| A09 Logging/Monitoring | **Improved (7B.5)** | `AuditService`; Sentry wired on API (`SENTRY_DSN`) + web (`NEXT_PUBLIC_SENTRY_DSN`); readiness probe `/health/ready` (**7B.4**) |
| A10 SSRF | Pass | No user-controlled server-side URL fetch; Cloudinary SDK uploads only |

## File / PII access

- Verification documents: stored as authenticated Cloudinary assets; admin/tutor views use short-lived signed URLs; admin viewer logs `VERIFICATION_DOC_VIEWED`.
- Agreement PDFs: authenticated upload; signed URL on serialize.
- Dispute evidence: still public Cloudinary upload path (harden later if needed).
- Document numbers: encrypted when key set; **key required in production**.

## Remaining / deferred (Phase 7B infra + 7C–7D)

- VPS / Nginx / TLS / backups / live smoke (**7B.1–7B.3, 7B.6–7B.7** — deferred)
- CI `npm audit` gate (**7C.1**)
- httpOnly Secure cookies; stronger CSP (**7C.3**)
- Payment / agreement activation atomicity (**7C.5**)
- Logout revoke (**7C.6**)
- WAF / third-party pen-test (post soft launch)

## Recent remediations

### Phase 7B.4–7B.5 (Aug 2026)

1. `GET /api/v1/health/ready` — DB + Redis readiness (503 when down)
2. Sentry on API (`@sentry/node` + 5xx filter) and web (`@sentry/nextjs`)

### Phase 7A (Aug 2026)

1. Suspended accounts cannot authenticate via OTP, password, or refresh  
2. `PAYMENTS_MOCK=true` / mock-complete forbidden in production  
3. Authenticated Cloudinary + signed URLs for KYC and agreement PDFs  
4. Tutor requirement `getOne` address/coords redaction  
5. Student calendar IDOR fix (agreement-bound `tutorId`)  
6. OTP hashed at rest in Redis; staging Redis AUTH documented  
7. `DOCUMENT_ENCRYPTION_KEY` required in prod; default admin seed blocked in prod  
8. Unit tests for the above  

### Phase 6

1. Webhook signature fail-closed outside mock mode  
2. Prod JWT secret validation  
3. Throttle login / refresh / register  
4. Stronger OTP generation  
5. Swagger off in production  
6. Open-requirement list address redaction  
7. Admin PII audit events  
8. Next CSP API origin from env  
