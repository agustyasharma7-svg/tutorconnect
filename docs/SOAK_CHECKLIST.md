# Soft-launch soak checklist (Phase 7D.4)

Run for **≥7 days** with invite-only cohort before deciding on public open.

| Day | Check | Owner | Pass? |
|---|---|---|---|
| D1 | OTP email delivery reliability | Ops | [ ] |
| D1 | Registration + login (student + tutor) with invite | Ops | [ ] |
| D2 | Requirement → search → apply/invite → shortlist | Ops | [ ] |
| D3 | Demo book + reminder email | Ops | [ ] |
| D4 | Agreement dual-sign → ACTIVE → chat | Ops | [ ] |
| D5 | Tutor registration fee + commission (test/live Razorpay) | Ops | [ ] |
| D5 | Webhook signature path; mock-complete rejected in prod | Eng | [ ] |
| D6 | Verification approve/reject; dispute open/close | Ops | [ ] |
| D7 | Sentry: no open P0; readiness `/health/ready` green | Eng | [ ] |
| D7 | Payment reconciliation vs Razorpay | Ops | [ ] |
| D7 | Support SLA: all tickets answered | Ops | [ ] |

**Exit:** no open P0; invite cohort healthy; decision recorded — remain invite-only **or** schedule public open (post–Phase 7).

Related: [`OPS_PLAYBOOK.md`](./OPS_PLAYBOOK.md) · [`RUNBOOK.md`](./RUNBOOK.md) · [`GO_LIVE_CHECKLIST.md`](./GO_LIVE_CHECKLIST.md)
