# TutorConnect India — React Native Implementation Plan

**Version:** 1.0  
**Created:** 2 Aug 2026  
**Status:** Planning only (not started)  
**API:** Existing NestJS `api/` (`/api/v1`) — reuse; do not duplicate business logic in the app  
**Web:** Existing Next.js `web/` remains the admin + desktop web client  

---

## 1. Goal

Ship a **native mobile app** (iOS + Android) for **students and tutors** using **React Native**, with:

- Branded **splash screen** and app icons  
- Auth, marketplace, engagement, payments, trust features, and **post-ACTIVE chat**  
- Hindi + English  
- Same backend contracts as the web MVP  

**Out of mobile v1:** Admin panel (stay on web), tutor subscription plans, SMS/WhatsApp, CI/CD store automation beyond basic build docs.

---

## 2. Recommended stack (locked defaults)

| Concern | Choice | Why |
|---|---|---|
| Framework | **Expo (SDK 52+)** managed workflow | Faster splash/icons, OTA, less native churn for MVP |
| Language | TypeScript | Match `web/` / `api/` |
| Navigation | Expo Router (file-based) | Aligns with Next-style routing |
| UI | React Native Paper **or** NativeWind (Tailwind) | Pick one in Phase M0; prefer NativeWind if you want web design parity |
| i18n | `i18next` + `react-i18next` (or `expo-localization`) | hi/en parity with `web/messages` |
| HTTP | `fetch` + thin API client (mirror `web/lib/api.ts`) | Same JWT Bearer pattern |
| Secure storage | `expo-secure-store` | Access + refresh tokens (not AsyncStorage for tokens) |
| Images / docs | `expo-image-picker` + multipart upload to existing Cloudinary endpoints | Reuse API |
| Payments | `react-native-razorpay` (dev client / prebuild) | Registration + commission |
| Lists / forms | FlashList + React Hook Form + Zod | Perf + validation |
| Chat poll | Same REST poll as web (`GET` messages every 4s) | No WebSockets until later |
| Splash | `expo-splash-screen` + `app.json` splash | Required first impression |

**Dev client note:** Razorpay native module typically needs `npx expo prebuild` / Expo Dev Client (not Expo Go alone).

---

## 3. Repository layout

```
mobile/                      # New standalone Expo app (sibling to api/ and web/)
  app/                       # Expo Router screens
    (auth)/
    (student)/
    (tutor)/
    _layout.tsx
  assets/                    # splash, icon, adaptive-icon
  src/
    api/                     # apiClient, endpoints
    auth/                    # session, refresh rotation client
    i18n/
    components/
    hooks/
    theme/
  app.json / app.config.ts
  .env.example               # EXPO_PUBLIC_API_URL only — no secrets
docs/REACT_NATIVE_IMPLEMENTATION_PLAN.md   # this file
```

Same rule as web: **never commit real `.env`**; only `.env.example` / `.env.sample`.

---

## 4. Product scope by role

| Role | Mobile app | Notes |
|---|---|---|
| Student | Yes | Requirements, search, demos, agreements, chat, disputes, ratings |
| Tutor | Yes | Profile, verification upload, open requirements, schedule, commissions, chat |
| Admin | No (v1) | Use `web/` admin dashboard |

**Chat rule (already on API):** unlocks only when agreement is **ACTIVE**; COMPLETED = read-only history.

---

## 5. Phased implementation

### Phase M0 — Project bootstrap & splash (Week 1)

**Deliverables**

- [ ] Create Expo TypeScript app in `mobile/`
- [ ] Configure `app.json` / `app.config.ts`:
  - App name: **TutorConnect India**
  - Bundle IDs: e.g. `in.tutorconnect.app` (confirm before store)
  - Splash: full-bleed brand image + background color
  - Icon + Android adaptive icon
  - Orientation: portrait
  - `userInterfaceStyle`: light (match MVP web bias) unless product says otherwise
- [ ] Implement splash hide flow:
  1. Keep splash visible via `SplashScreen.preventAutoHideAsync()`
  2. Load fonts / hydrate secure session / i18n
  3. `SplashScreen.hideAsync()` then navigate
- [ ] Expo Router root layout + auth gate
- [ ] `EXPO_PUBLIC_API_URL` in `.env.example` (point to local LAN IP for devices, not `localhost` on physical phones)
- [ ] Health check screen / debug banner in `__DEV__`
- [ ] README section in root or `mobile/README.md` (run on Android emulator / iOS simulator)

**Splash checklist**

| Asset | Spec |
|---|---|
| Splash image | ~1284×2778 safe center logo; transparent PNG preferred |
| Splash bg | Brand color (define CSS/hex in theme) |
| Icon | 1024×1024 |
| Android adaptive | Foreground 1024 + background color |
| Duration | Until bootstrap completes (target &lt; 2s on warm start) |

**Exit:** App launches → branded splash → auth or role home without white flash.

---

### Phase M1 — Auth & session (Week 1–2)

Mirror web auth against existing API:

- [ ] Register student / tutor  
- [ ] Email OTP verify  
- [ ] Password login  
- [ ] Forgot / reset password  
- [ ] Store tokens in SecureStore  
- [ ] Refresh rotation client (call `POST /auth/refresh`; on reuse failure clear session)  
- [ ] `GET /auth/me` on cold start  
- [ ] Locale preference (hi/en) persisted  
- [ ] Deep link stubs for future password reset (optional)

**Exit:** Student and tutor can register, verify OTP, login, logout; session survives app kill.

---

### Phase M2 — Navigation shell & profiles (Week 2–3)

- [ ] Role-based tab navigators:
  - **Student tabs:** Home, Requirements, Search, Agreements, More  
  - **Tutor tabs:** Home, Opportunities, Calendar, Earnings, More  
- [ ] Student profile view/edit  
- [ ] Tutor onboarding wizard (subjects, classes, boards, availability, radius, photo, fee choice)  
- [ ] Catalog fetch (`/catalog/*`)  
- [ ] Cloudinary photo upload via existing `POST /tutors/me/photo`

**Exit:** Profiles match web completeness / discoverability rules.

---

### Phase M3 — Marketplace (Week 3–4)

- [ ] Student: create/edit/publish/cancel requirements (free publish)  
- [ ] Tutor: open requirements list + apply  
- [ ] Student: search tutors + invite; applications inbox (shortlist/reject)  
- [ ] Public tutor profile (verified badge + ratings; **no contact** pre-agreement)  
- [ ] Matching score / distance display  

**Exit:** Full apply/invite/shortlist loop on device.

---

### Phase M4 — Engagement (Week 4–5)

- [ ] Demo book / detail / status (complete, cancel, no-show)  
- [ ] Tutor calendar: occupied slots, **15-min buffer** visualization, exception dates, release  
- [ ] Agreements: generate, dual sign, PDF open (Linking / WebBrowser)  
- [ ] Contact privacy preserved until ACTIVE  

**Exit:** Demo → agreement ACTIVE path works on mobile.

---

### Phase M5 — Monetization (Week 5–6)

- [ ] Tutor registration fee checkout (Razorpay RN SDK + mock path if `EXPO_PUBLIC_PAYMENTS_MOCK=true`)  
- [ ] Commission list / invoice PDF / pay now  
- [ ] Success / fail return screens  
- [ ] Overdue UX (hidden from search messaging)  

**Exit:** Mock and test-mode Razorpay paths documented and working on Dev Client.

---

### Phase M6 — Trust, chat, disputes (Week 6–7)

- [ ] Tutor verification document upload (Aadhaar/PAN/degree)  
- [ ] Verification status on profile  
- [ ] Mark requirement COMPLETED (student)  
- [ ] Ratings form on completed engagements  
- [ ] Disputes create + evidence upload + list  
- [ ] Chat list + conversation (poll); composer only when ACTIVE  

**Exit:** Trust + chat parity with web for student/tutor (admin remains web).

---

### Phase M7 — Polish, store prep (Week 7–8)

- [ ] Empty / error / offline states  
- [ ] Pull-to-refresh on key lists  
- [ ] Accessibility (labels, font scaling)  
- [ ] Performance: list virtualization, image caching  
- [ ] Privacy / Terms / Agreement template screens (reuse copy from web legal stubs)  
- [ ] App Store / Play listing copy draft  
- [ ] Privacy policy URL  
- [ ] Production `EXPO_PUBLIC_API_URL`  
- [ ] EAS Build profiles (`development`, `preview`, `production`)  
- [ ] Manual QA matrix (see §8)

**Exit:** Internal TestFlight / Play internal testing build.

---

## 6. Screen map (minimum)

### Shared
Splash → Welcome → Login → OTP → Register (student|tutor) → Legal  

### Student
Dashboard · Requirements (list/new/detail) · Search · Tutor public · Inbox · Demos · Agreements · Chat · Disputes · Ratings · Profile · Settings  

### Tutor
Dashboard · Profile wizard · Verification · Open requirements · My applications · Schedule · Demos · Agreements · Chat · Commissions · Registration pay · Disputes · Settings  

---

## 7. API & env

Reuse Nest routes under `/api/v1`. Mobile client responsibilities:

| Concern | Approach |
|---|---|
| Auth header | `Authorization: Bearer <access>` |
| Refresh | On 401, try refresh once; else logout |
| CORS | Native apps are not browser CORS; API CORS still needed for web only |
| Device testing | Use machine LAN IP: `http://192.168.x.x:3001/api/v1` |
| Android cleartext | Allow HTTP only in `__DEV__` / debug network security config |

`mobile/.env.example`:

```env
EXPO_PUBLIC_API_URL=http://localhost:3001/api/v1
EXPO_PUBLIC_PAYMENTS_MOCK=true
EXPO_PUBLIC_RAZORPAY_KEY_ID=
```

Do **not** put JWT secrets, Razorpay secret, SMTP, or Cloudinary secrets in the mobile app.

---

## 8. QA matrix (mobile)

| # | Path | Pass criteria |
|---|---|---|
| Q1 | Splash → login | No white flash; splash hides after hydrate |
| Q2 | Student register + OTP | Session stored securely |
| Q3 | Publish requirement | Tutors can see open list |
| Q4 | Apply / invite / shortlist | Status updates correct |
| Q5 | Demo + buffer conflict | API rejects overlapping slot; UI shows error |
| Q6 | Dual sign → ACTIVE | Chat unlocks |
| Q7 | Chat send / poll | Messages appear within ~4s |
| Q8 | Commission mock pay | Receipt / status updates |
| Q9 | Verification upload | Status PENDING |
| Q10 | Locale hi ↔ en | All new screens translated |
| Q11 | Kill + reopen | Session restored via SecureStore |
| Q12 | COMPLETED chat | Read-only; send blocked |

---

## 9. Explicit non-goals (mobile v1)

- Admin screens  
- Tutor subscription / premium plans  
- WebSockets chat  
- Push notifications (email remains primary; push = later)  
- In-app video calls  
- Replacing web entirely  

---

## 10. Dependencies on web/API

| Dependency | Owner |
|---|---|
| Stable `/api/v1` + Swagger | `api/` (done) |
| Chat ACTIVE gate | `api/src/chat/` (done) |
| Razorpay keys | Ops / `.env` (user-managed) |
| Production HTTPS API | Phase 6 deploy (deferred) |
| Store accounts | Apple Developer + Google Play Console |

---

## 11. Suggested order of work (checklist summary)

1. **M0** Expo app + splash + icons + env sample + router shell  
2. **M1** Auth + SecureStore + refresh  
3. **M2** Tabs + profiles  
4. **M3** Marketplace  
5. **M4** Demos / schedule / agreements  
6. **M5** Payments (Dev Client)  
7. **M6** Verification, ratings, disputes, chat  
8. **M7** Store polish + EAS builds  

---

## 12. Success criteria

- Students and tutors can complete the core MVP journey on a physical device  
- Splash and branding meet store basic quality bar  
- No secrets in the mobile repo  
- Chat only after agreement **ACTIVE**  
- Admin continues on web  

---

## 13. Next action after this doc

When ready to build: create `mobile/` with Expo, implement **Phase M0** (splash + shell), then proceed phase-by-phase without expanding into admin or subscriptions.

---

*End of React Native Implementation Plan*
