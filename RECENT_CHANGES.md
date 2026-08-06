# Recent Changes & Commit Summary

This document summarizes all changes, bug fixes, and infrastructure updates made across the recent commits up to the current `main` branch (`805ad96`).

---

## 📋 Summary of Recent Commits

| Commit Hash | Commit Message | Key Focus |
|---|---|---|
| `805ad96` | `fix: auto-end previous active sessions to prevent session creation blocking errors` | Active session conflict resolution |
| `27761f4` | `fix: enforce connection_limit=3 to prevent Supabase pooler EMAXCONNSESSION errors` | Database connection pool hardening |
| `746d692` | `fix: proxy alert false positives and sync endSession auto-absent logic with live roster` | Proxy detection & session end sync |
| `5e6a98b` | `chore: harden auth, consolidate guards, add migrations and E2E suite` | Auth guards, Prisma migration baseline & Playwright E2E |
| `843f281` | `docs: add HANDOVER.md project status and developer guide` | Handover documentation |
| `2d4065c` | `feat: complete phase 2 product gaps (password recovery, dashboard analytics)` | Account recovery (Forgot/Reset password) & live roster filters |

---

## 🛠️ Detailed Breakdown of Changes

### 1. Session Creation & Active Session Management (`805ad96`)
- **Problem**: Starting a session or ad-hoc class failed with `"An active session already exists"` if a previous test or class session was left active/unended.
- **Changes in [lib/faculty-service.ts](file:///d:/curlyfish/daemthisattendance/lib/faculty-service.ts)**:
  - `startSession()`: If a session for the exact same timetable entry is already active, returns that active session instead of throwing an error. If another active session exists, it automatically ends the previous active session (marking unmarked students absent) so the teacher is never blocked.
  - `createAdHocSession()`: Auto-ends any previous active session and performs a case-insensitive search for course codes (`mode: "insensitive"`).

### 2. Database Connection Pooling Hardening (`27761f4`)
- **Problem**: Supabase pooler threw `FATAL: (EMAXCONNSESSION) max clients reached in session mode - max clients are limited to pool_size: 15` when multiple queries or SSE streams executed concurrently.
- **Changes in [lib/prisma.ts](file:///d:/curlyfish/daemthisattendance/lib/prisma.ts)**:
  - Automatically appends `connection_limit=3&pgbouncer=true` to the `DATABASE_URL` if omitted.
  - Limits Prisma Client instances to a maximum of 3 connections per process, staying safely below Supabase's pool limit of 15.

### 3. Proxy Detection & Session End Roster Sync (`746d692`)
- **Problem 1 (False Proxy Alerts)**: Normal students got proxy flags (`Scanning from an unrecognized device`) when browser cookies changed or when scanning from mobile browsers.
- **Problem 2 (Unmarked Students on Session End)**: Ending a session only marked 16 students absent (batch B1) while leaving 38 students in the live roster unmarked.
- **Changes in [app/api/student/scan/route.ts](file:///d:/curlyfish/daemthisattendance/app/api/student/scan/route.ts)**:
  - Updated proxy detection logic to **ONLY** flag when the **same physical device** (`deviceHash`) is used to mark attendance for **multiple different students** in the same session or on the same day.
  - Removed false-positive device locking flags for single students.
- **Changes in [lib/faculty-service.ts](file:///d:/curlyfish/daemthisattendance/lib/faculty-service.ts) & [app/api/faculty/sessions/[id]/students/route.ts](file:///d:/curlyfish/daemthisattendance/app/api/faculty/sessions/[id]/students/route.ts)**:
  - Added `getExpectedStudentsForSession()` helper function.
  - Synchronized live roster API and `endSession()` logic.
  - When a session ends, **all** unmarked students in the session roster are bulk-marked `ABSENT`.

### 4. Authentication Guard Consolidation & E2E Testing (`5e6a98b`)
- **Changes in API Routes**:
  - Replaced ad-hoc session checks with centralized `requireRole(["FACULTY", "HOD", "ADMIN"])` guards across all faculty endpoints (`/api/faculty/sessions/...`).
  - Added `verifyCsrfOrigin` checks across state-changing endpoints.
- **E2E & Testing Suite**:
  - Added Playwright E2E test configuration ([playwright.config.ts](file:///d:/curlyfish/daemthisattendance/playwright.config.ts)) and test suite ([e2e/auth.spec.ts](file:///d:/curlyfish/daemthisattendance/e2e/auth.spec.ts)).
  - Configured GitHub Actions CI workflow ([.github/workflows/ci.yml](file:///d:/curlyfish/daemthisattendance/.github/workflows/ci.yml)).
- **Prisma Migrations**:
  - Un-ignored `prisma/migrations` and established baseline SQL migration (`prisma/migrations/20260803213128_init/migration.sql`).

### 5. Handover Documentation (`843f281`)
- Added [HANDOVER.md](file:///d:/curlyfish/daemthisattendance/HANDOVER.md) outlining project architecture, quickstart commands, security rules, and developer guidelines.

### 6. Phase 2 Features: Account Recovery & Live Roster Filters (`2d4065c`)
- **Account Recovery**:
  - Added [app/(auth)/forgot-password/page.tsx](file:///d:/curlyfish/daemthisattendance/app/(auth)/forgot-password/page.tsx) and [app/(auth)/reset-password/page.tsx](file:///d:/curlyfish/daemthisattendance/app/(auth)/reset-password/page.tsx).
  - Implemented version-fingerprinted JWT password reset tokens in [lib/password-reset-token.ts](file:///d:/curlyfish/daemthisattendance/lib/password-reset-token.ts). Tokens automatically invalidate upon password change.
- **Roster Filters**:
  - Added filter tabs (`All`, `Present`, `Absent`, `Unmarked`) to `LiveSessionClient.tsx`.

---

## 📊 File Statistics Summary

- **32 files modified/added**
- **1,474 insertions (+), 319 deletions (-)**
- Build status: **49/49 pages compiled with 0 errors**
