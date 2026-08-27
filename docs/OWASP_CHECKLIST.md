# OWASP Top 10 — TutorConnect India (Phase 6+)

Mapped to shipped controls. Cloudinary replaces S3 for file storage (presigned S3 TTL N/A).

| # | Risk | Status | Control in this repo |
|---|---|---|---|
| A01 Broken Access Control | Partial → improved | Role guards (`RolesGuard`), ownership checks; open-requirement list redacts address/lat/lng (pincode only) |
| A02 Cryptographic Failures | Improved | bcrypt cost 12; JWT secrets required in production (no placeholder); AES-GCM `DOCUMENT_ENCRYPTION_KEY`; refresh tokens SHA-256 hashed; OTP via `crypto.randomInt` |
| A03 Injection | Pass | Prisma parameterized queries; global `ValidationPipe` whitelist + forbidNonWhitelisted |
| A04 Insecure Design | Pass (updated) | **Pre-agreement:** no chat; contact hidden. **Post-ACTIVE:** student↔tutor chat. Payments tutor-only; ratings gated on COMPLETED |
| A05 Security Misconfiguration | Improved | Helmet (API); Next security headers + CSP (`connect-src` from `NEXT_PUBLIC_API_URL`); CORS requires `CORS_ORIGIN` in production; Swagger disabled in production |
| A06 Vulnerable Components | Process | Run `npm run audit:deps` in `api/` and `web/` periodically (no CI yet) |
| A07 Auth Failures | Improved | Access JWT ~15m; refresh rotation + reuse detection; OTP TTL; `@Throttle` on register/login/OTP/refresh/reset |
| A08 Software/Data Integrity | Fixed | Razorpay webhook **fail-closed** when not mock: requires secret + signature; client payment HMAC verify; mock only if `PAYMENTS_MOCK=true` |
| A09 Logging/Monitoring | Improved | `AuditService` for verification doc views, admin user list/export, audit-log view, revenue export; notification queue failures logged |
| A10 SSRF | Pass | No user-controlled server-side URL fetch; Cloudinary SDK uploads only |

## File / PII access

- Verification documents: admin viewer logs `VERIFICATION_DOC_VIEWED`.
- Dispute evidence: Cloudinary URLs; create/list scoped to parties + admin.
- Optional document numbers: encrypted when `DOCUMENT_ENCRYPTION_KEY` is set (masked last-4 for admin).

## Remaining / deferred

- Production monitoring alerts, WAF, third-party pen-test.
- Stronger CSP (remove `'unsafe-eval'` when Next allows).
- Push CI `npm audit` gate.
- Require `DOCUMENT_ENCRYPTION_KEY` in production if document numbers are accepted (optional harden).

## Recent remediations (code)

1. Webhook signature fail-closed outside mock mode  
2. Prod JWT secret validation + no weak placeholders  
3. Throttle login / refresh / register  
4. Cryptographically stronger OTP  
5. Swagger off in production  
6. Open-requirement address/coords redaction  
7. Admin PII list/export audit events  
8. Next CSP API origin from env  
