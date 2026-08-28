# TutorConnect India — Admin & Support Ops Playbook (Phase 7D.2)

**Support email:** set `NEXT_PUBLIC_SUPPORT_EMAIL` / publish the same address on legal pages (default placeholder `support@tutorconnect.in`).  
Staff this mailbox during soft launch business hours.

---

## Daily / weekly ops

| Cadence | Task |
|---|---|
| Daily | Triage support inbox; escalate payments/KYC |
| Daily | Admin → verification queue: approve/reject with clear reasons |
| Daily | Open disputes: review evidence, resolve or request more info |
| Weekly | Razorpay dashboard vs admin revenue export reconciliation |
| Weekly | Overdue commissions (auto job + manual waive if policy) |
| Soft launch | Issue invite codes; track cohort size vs target (50 tutors / 100 students) |

---

## Common admin actions (web)

| Action | Where |
|---|---|
| Verify tutors | `/[locale]/admin/verification` |
| Waive commission | `/[locale]/admin/commissions` |
| Metrics + audit | `/[locale]/dashboard/admin` |
| Resolve dispute | `/[locale]/disputes` (admin resolve) |

Always use a strong unique admin password (never `Admin@123456` in production).

---

## Support macros (short)

**OTP not received:** Confirm SMTP; ask user to check spam; resend OTP from login; verify email spelling.

**Payment failed:** Confirm `PAYMENTS_MOCK=false` and Razorpay keys; ask for order id / payment id; check webhook logs and `/payments/history`.

**Cannot register (invite-only):** Confirm `SOFT_LAUNCH_INVITE_ONLY`; issue a code from `SOFT_LAUNCH_INVITE_CODES` or add email to `SOFT_LAUNCH_ALLOWLIST_EMAILS`.

**KYC rejected:** Ask tutor to re-upload clearer JPG/PNG/PDF (≤5MB); remind last-4 / document number optional encryption.

**Chat missing:** Chat unlocks only when agreement is **ACTIVE**.

---

## Escalation

1. Product/ops owner  
2. Engineering (Sentry + API logs)  
3. Payment provider (Razorpay) for settlement disputes  

Incident notes: time, user id/email, impact, rollback if any (`docs/RUNBOOK.md`).

---

## Soft launch invite ops (7D.3)

1. Set on API: `SOFT_LAUNCH_INVITE_ONLY=true`  
2. Set `SOFT_LAUNCH_INVITE_CODES=beta-tutor-01,beta-student-01` (rotate as needed)  
3. Optional: `SOFT_LAUNCH_ALLOWLIST_EMAILS=founder@…`  
4. Mirror UX: `NEXT_PUBLIC_SOFT_LAUNCH_INVITE_ONLY=true` on web  
5. Share codes out-of-band (email/WhatsApp); do not commit real codes  

Existing users can still log in; gate applies to **new registration** only.
