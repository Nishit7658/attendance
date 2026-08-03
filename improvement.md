# DaemThis Attendance — Improvement & Security Plan

This document is an honest audit of the current codebase. It lists what is missing, every critical security gap, and a step-by-step roadmap to take this project from **"works on my machine"** to **"production-safe, 10/10"**.

---

## 1. Honest Rating

**Current score: 6.0 / 10**

> Note: The original estimate of 6.5 has been revised to 6.0 — the `3/10` security posture, the login-breaking MissingCSRF bug, and the timezone convention risk weigh more heavily than initially credited.

| Category | Score | Why |
|---|---|---|
| Feature completeness (vs. PRODUCT.md) | 8/10 | All four portals, QR attendance, events, saved groups, audit logs, device binding, CSV export. Impressive scope. |
| Architecture & schema | 8/10 | Clean Next.js App Router, well-normalized Prisma schema, JWT session strategy. |
| Security posture | 3/10 | **Critical**: hardcoded secret, committed database file, zero rate-limiting, open endpoints, client-spoofable device ID. |
| Code quality / maintainability | 5/10 | No tests, build checks disabled, heavy `any` usage, repetitive auth boilerplate. |
| Production readiness | 4/10 | `db push` used instead of migrations, no CI, no error handling in several flows, leftover scratch/test files. |

> It is a strong, feature-rich student project structurally, but it is **not safe to deploy publicly as-is**. The security gaps below are fixable in a single focused pass.

---

## 2. Critical (fix immediately — blocker before any deployment)

### 2.1 Hardcoded fallback secret in source — `lib/qr-token.ts:8`
```ts
const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "8f3d1e4a7c9b2e5f...";
```
If env vars are missing, the QR JWT is signed with a secret **committed to the repository**. Anyone can forge an attendance token and mark themselves present for any `sessionId`.

**Fix:** remove the fallback entirely.
```ts
const secret = process.env.QR_SIGNING_SECRET ?? process.env.AUTH_SECRET;
if (!secret) throw new Error("QR signing secret is not set");
```
Set real values in `.env` / Vercel / your production host. Keep `.env` out of git (it already is).

### 2.2 Committed database file — block data leak
`dev.db` was added to the repo by `git add -f` (it is not blocked by `.gitignore`) and **pushed to GitHub**. Any real user data in it (emails, bcrypt hashes) is now public forever.

**Fix:**
- `git rm --cached dev.db prisma/dev.db`
- Add `*.db` / `*.sqlite*` / `dev.db` / `prisma/dev.db` to `.gitignore`
- Verify with `git ls-files | grep db` → empty
- Rotate any real credentials that touched that file (change all seed passwords before go-live).

### 2.3 Zero rate limiting anywhere
`/api/student/scan`, `/api/auth/...` (login), and every POST endpoint can be hammered:
- Login brute-force (CSE student password is `password123`).
- Scan-spam / proxy-gaming.
- DoS via `/api/qr/generate` (public).

**Fix:** Add an in-memory rate limiter util and wrap sensitive endpoints:
- Login: e.g. 5 attempts / 15 min per email+IP.
- Scan: e.g. 5 scans / 60 s per user.
- QR generate: minimal, per request, cache-friendly.
> Heavy: a proper store-backed limiter (Upstash Redis) for multi-instance Vercel deploys.

### 2.4 NextAuth MissingCSRF — login fails in some environments
When logging in, the server log shows:
```
[auth][error] MissingCSRF: CSRF token was missing during an action callback.
```
This happens with NextAuth v5-beta when the app is accessed from a non-`localhost` origin (e.g., a network IP like `0.0.0.0:3001`, a tunnelled URL, or a deployed host). The beta version requires explicit `trustHost: true` and correct cookie configuration.

**Fix:** In `auth.config.ts` (or the Auth options object), add:
```ts
export const authConfig = {
  trustHost: true,
  // ...
};
```
And ensure `AUTH_URL` / `NEXTAUTH_URL` env var matches the actual deployment URL exactly. Without this, login is broken for anyone not on `localhost:3000`.

---

## 3. High priorities (make it genuinely secure)

### 3.1 QR "5-second rotation" doesn't actually protect
`generateQrToken` sets `exp: 120s`, but the UI rotates every 5s. Server trusts a token for **2 full minutes**, so a screenshot taken mid-session still works for 120s — undermining the whole anti-proxy design.

**Fix:** bind tokens to short TTL (5–6s), and additionally bind to the session's `qrToken` + rotation nonce. Only issue student. Also require the `ts` to be within a few seconds of server time (currently 30s clock tolerance is too loose).

### 3.2 Device ID is client-forged — defeats the anti-proxy flag
`lib/device-id.ts` stores a UUID in `localStorage` and sends it to the server. A student can clear storage or send an arbitrary string to bypass the "same phone = two students" flag.

**Fix (server-side registration):**
- On first scan, generate server-side device token, store its **hash** on the User, and return a signed cookie/credential.
- Subsequent scans require the signed device credential → cannot be forged from localStorage.
- Add browser fingerprinting (not deterministic) as a secondary signal, never as the primary trust.

### 3.3 Information disclosure leaks internals
Many routes return `err instanceof Error ? err.message : ...` in 500 / 400 responses (`scan`, `change-password`, `settings`, `import`, `sessions/*`). This leaks column/SQL details and can aid attacks.

**Fix:** generic message for client (`"Internal server error"`), log the real error server-side only. Better: replace error-throwing strings with typed `AppError` and validate all inputs (zod) before touching the DB.

### 3.4 CSRF on custom state-changing endpoints
Change-password, reset-device, settings, attendance PATCH rely only on the NextAuth same-site cookie (default `Lax`). For `O` it's mostly mitigated, but add explicit CSRF tokens for all these `POST/PATCH/PUT` endpoints.

**Fix:** set NextAuth cookie `SameSite: "lax"`, add `Origin`/`Referer` check helper for API routes, or issue a double-submit CSRF token.

### 3.5 Hardcoded `branchId` in import — breaks course import
`app/api//import/route.ts:174` writes `branchId: "default-branch-id"`, which will fail the FK constraint if no such branch exists (Course requires a real Branch).

**Fix:** resolve the branch from the CSV (branch column) or a guided default selected by the admin; reject rows when it can't be resolved (with a friendly row error).

---

## 4. Missing product features (what "seems to be left")

From `docs/PRODUCT.md`, these are planned but **not implemented** (or implemented but not enforced):

| Feature | Status | Notes |
|---|---|---|
| LAN restriction toggle | Defined in settings only | Not enforced anywhere. Add checks in Middleware / scan route / API host. |
| `slots_per_day` config | Saved | Not used by the timetable engine (hardcoded). |
| `qr_refresh_interval` setting | Saved | Not wired to the actual rotation. |
| Academic-year rollover / archival | Missing | No script or UI to archive past-year session/data. |
| CSV import for branches/semesters/divisions/batches/timetable | Missing | Only `users` and `courses` are implemented. |
| Low-attendance auto-alerts | Missing (marked future) | Easy win, high value. |
| Analytics / attendance trends | Missing (future) | Marked as future — could add at-risk trends. |
| Pagination on large lists | Missing | `admin/users`, `hod/reports`, session summary load everything. |
| Sessions marked ABSENT for every unmarked student | Partial | Only for scheduled sessions; ad-hoc handled, OK. But add a "not scanned" grace window / manual correction not auto-absent-if-minutes-window. |

---

## 5. Code quality & project hygiene (things not "right")

- **`next.config.mjs` disables ESLint and TypeScript errors during build.**
  ```js
  typescript: { ignoreBuildErrors: true },
  eslint:   { ignoreDuringBuilds: true },
  ```
  This lets broken code ship. Remove these to force correctness.
- **No automated tests.** A project like this needs at least: auth happy/deny path, role-based middleware access, scan flow (success, duplicate 409, expired/invalid token), device-binding flag, session start/end absentee logic, event-apply math. Add **Vitest** + **Prisma test DB** (or mock), plus one **Cypress/Playwright** E2E for the QR scan happy path.
- **Repetitive auth guard boilerplate** in every `route.ts` (re-fetch session → re-fetch user → check role). Extract:
  ```ts
  export async function requireRole(...roles: Role[]): Promise<User> {
    const session = await auth();
    if (!session?.user?.id) throw unauthorized();
    const u = await prisma.user.findUnique(...checking role);
    ...
  }
  ```
- **Type safety**: replace `any[]` and `studentQuery: any` with proper Prisma types / a small query dsl. Adding `@types/prisma-generated` leveraged.
- **Migrations, not `db push`**: add `@prisma/migrate` tracked migration history (`prisma/migrations/`), and a `postinstall`/`build` script. `db push` is fine for dev, dangerous for prod.
- **Database indexes**: Prisma does not auto-index. Add `@@index` on frequently-joined/where columns: `AttendanceRecord(studentId)`, `AttendanceRecord(sessionId)`, `Session(date)`, `Session(facultyId,status)`, `Session(timetableEntryId)`, `User(role)`, `User(divisionId)`, `EditLog(attendanceRecordId)`.
- **Secret management**: keep `.env.example` (+ singular `example` is committed), ensure production `secrets` come from env of the host (Vercel env vars). Never `console.log` env/secrets.
- **Timezone convention is implicit and fragile**: All timetable times are stored in the database as UTC `DateTime` with a `1970-01-01` epoch date (e.g., `1970-01-01T04:05:00Z` means 09:35 IST). This convention is not documented anywhere in the codebase. Any new developer who reads `getUTCHours()` directly will get the wrong time — this exact bug caused all morning classes to render off-screen in the calendar. **Fix:** document the convention clearly in a `docs/DATA_CONVENTIONS.md`, and add a shared utility function `getISTMinutes(date: Date): number` in `lib/time.ts` so the conversion is done in one place. Never read `.getUTCHours()` directly from timetable timestamps.
- **Cleanup junk files** in repo root (created during debugging sessions — must be removed before any public/production deployment):
  - `check_101.ts`, `cleanup_records.ts`, `test_timetable.ts`, `test_time.js` — created by AI during debugging
  - `test_loop.ts`, `test_fetch_login.ts`, `test_query.ts`, `test_page_queries.ts`, `query.ts`, `generate_data.js` — leftover dev scripts
  - `scratch/` directory
  
  Run `git rm --cached <file>` for any already tracked, then add patterns to `.gitignore`.

---

## 6. "Make it 10/10" roadmap

### Phase A — Secure the base (few days)
- [ ] Remove hardcoded secret, make QR secret required (2.1)
- [ ] Remove `dev.db` from git + update `.gitignore`; rotate any exposed creds (2.2)
- [ ] Add rate limiting (login + scan + qr-generate) (2.3)
- [ ] Tighten QR TTL to ~6s + nonce + clock window (3.1)
- [ ] Server-side device binding (hash token, not client string) (3.2)
- [ ] Generic error responses + zod validation on every route (3.3)
- [ ] CSRF origin check + `SameSite` cookies on state-changing API routes (3.4)
- [ ] Fix hardcoded `branchId` in import (3.5)
- [ ] Add `trustHost: true` + correct `AUTH_URL` env to fix MissingCSRF login failure (2.4)
- [ ] Create `lib/time.ts` with `getISTMinutes()` utility + document timezone convention in `docs/DATA_CONVENTIONS.md` (5)
- [ ] Delete all debug/scratch files from repo root and update `.gitignore` (5)

### Phase B — Production-ready features
- [ ] Enforce configured settings: `slots_per_day`, `qr_refresh_interval`, LAN toggle (4)
- [ ] Academic-year rollover / archival (4)
- [ ] CSV import for branches → semesters → divisions → batches → timetable (4)
- [ ] Pagination on users / reports / history lists (4)
- [ ] Automated absent-window handling & "not scanned" clarity (opt-out per faculty) (4)

### Phase C — Engineering quality
- [ ] Remove ignored build checks from `next.config.mjs`; get `tsc` and `lint` green (5)
- [ ] Add a test suite (unit + integration + one E2E for scan) (5)
- [ ] Extract `requireRole` + shared error/validation layer (5)
- [ ] Type-remove, kill `any` (5)
- [ ] Add Prisma migrations + committed `prisma/migrations/` (5)
- [ ] Add DB indexes, enable `pg` prepared statements (5)
- [ ] Add GitHub Actions: lint → typecheck → test → build on every PR
- [ ] Default-secure seed (randomized passwords, or force-change-on-first-login) (5)

### Phase D — Nice-to-have score boosters
- [ ] Low-attendance auto-alerts (email/push/under)
- [ ] Server-side analytics for trends / at-risk students
- [ ] Export daily faculty sheet (PDF), bulk operations
- [ ] Force password rotation, MFA option for admins
- [ ] Email verification / "forgot password" flow (currently only change-when-logged-in)

---

## 7. Security checklist (comprehensive)

- [ ] Secrets: no secrets in code; validated at boot; encrypted release.
- [ ] Auth: bcrypt cost ≥ 12 consistent everywhere; no known default passwords.
- [ ] RBAC: role checked at **both** middleware AND DB-layer on every request/action.
- [ ] Rate limited: login, scan, QR gen, export.
- [ ] Input validation (zod) on every body/23/query param.
- [ ] No sensitive error messages to clients.
- [ ] HTTPS-only; HSTS header; `Secure; HttpOnly; SameSite` cookies.
- [ ] Dependencies kept patched (`npm audit` in CI).
- [ ] Sensitive GET endpoints (reports, users) confirm role.
- [ ] Audit trail: every attendance edit logged (already) **and** every admin/create deleted.
- [ ] No orphan records; FKs with cascade are deliberate.
- [ ] Logs sanitized (no PII/emails/secrets).
- [ ] Database backups + restore tested before go-live.
- [ ] No obvious tensor.Prisma raw SQL or string interpolation.

---

## 8. 10/10 definition

When **all of Phases A & B** ship **and**:
- Every route is role-checked and validated, returns no internal errors.
- The scan flow (token, device, rate, uniqueness) cannot be boosted by a curl request.
- Build is green with TS strict + ESLint on, tests run in CI.
- Migrations, indexes, pagination, and archival are in place.
- Secret-free code, secrets injected, database out of git.

Then the project earns a **10/10**. Today it's a **6.5/10** — a great foundation.