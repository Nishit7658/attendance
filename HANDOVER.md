# Project Handover & Current Status Guide

Welcome to the **College Attendance Management System** codebase! This document provides a comprehensive overview of the current architecture, completed features, security enhancements, and guidelines for continuing development.

---

## 🚀 Quick Start for New Developers

### 1. Environment Setup
Ensure you have Node.js (v18+) installed. Clone the repository and install dependencies:
```bash
npm install
```

### 2. Environment Variables (`.env`)
Make sure your `.env` file contains the following keys:
```env
DATABASE_URL="postgresql://..." # Supabase pooling connection string
AUTH_SECRET="your-super-secret-key"
QR_SIGNING_SECRET="your-qr-signing-secret"
NEXTAUTH_URL="http://localhost:3000"
```

### 3. Common Commands
- **Development Server**: `npm run dev`
- **Type Checking**: `npx tsc --noEmit`
- **Linting**: `npm run lint`
- **Production Build**: `npm run build`
- **Prisma Client Generation**: `npx prisma generate`

---

## 📌 Current Project Status

The codebase has completed **Phase 1 (Security Surface)**, **Phase 2 (Product Gaps)**, and **Phase 3 (Engineering Polish)**. The project compiles with zero TypeScript/ESLint errors and passes production builds (`npm run build`) with 49 static & dynamic routes.

### Summary of Portals & Features:
1. **Student Portal** (`/student`):
   - Interactive QR Scanner (`/student/scan`) with server-side hardware device binding (`device_token` cookie).
   - Per-subject attendance breakdown with risk indicators (*At Risk* / *Borderline* / *On Track*).
   - Student timetable viewer (`/student/timetable`).
   - Forced password change modal for seeded default accounts.

2. **Faculty Portal** (`/faculty/dashboard`):
   - Dynamic QR Code generator (`/faculty/sessions/[id]/qr`) with configurable refresh intervals (default 10s).
   - Live Session Monitor (`/faculty/sessions/[id]/live`) with real-time SSE updates and roster filtering (`All`, `Present`, `Absent`, `Unmarked`).
   - Ad-hoc session creator & Attendance History exports (`/faculty/history`).

3. **HOD Portal** (`/hod`):
   - Department-wide analytics, session tracking, faculty activity monitoring, and custom date range attendance reports (`/hod/reports`).

4. **Admin Portal** (`/admin`):
   - Comprehensive User Management (`/admin/users`), Timetable Management (`/admin/timetables`), Course Management (`/admin/courses`), Event Management (`/admin/events`), System Settings (`/admin/settings`), and CSV Import/Export (`/admin/import`).

5. **Account Recovery & Authentication**:
   - **Forgot / Reset Password** (`/forgot-password`, `/reset-password`): Stateless, version-fingerprinted JWT tokens signed with `jose`. Tokens automatically invalidate across all devices as soon as a password is updated.
   - **Forced First-Time Password Change**: Users with seeded default passwords are automatically forced to update their password via `middleware.ts` before accessing any protected routes.

---

## 🔒 Key Security & Architectural Patterns

When adding new code or features, please adhere to these established patterns:

### 1. CSRF Protection
All state-changing API routes (POST, PUT, DELETE, PATCH) must invoke `verifyCsrfOrigin(request)` from `@/lib/csrf`.
```typescript
import { verifyCsrfOrigin } from "@/lib/csrf";

export async function POST(request: NextRequest) {
  verifyCsrfOrigin(request);
  // ... rest of route handler
}
```

### 2. Rate Limiting
Public or high-sensitivity endpoints (like login, QR generation, password reset) use the token-bucket rate limiter from `@/lib/rate-limit`.
```typescript
import rateLimit from "@/lib/rate-limit";

const limiter = rateLimit({ interval: 15 * 60 * 1000, uniqueTokenPerInterval: 500 });
await limiter.check(limit, `identifier:${ip}`);
```

### 3. Zod Input Validation
Validate incoming request bodies and query parameters using schemas defined in `@/lib/zod-schemas.ts`.

### 4. Password Security
Password hashing uses `bcryptjs` with a cost factor of `12`. Do not hardcode lower cost factors.

### 5. Middleware & NextAuth Integration
Authentication and route protection are handled centrally in `middleware.ts` using NextAuth v5 (`@/lib/auth`). User roles (`STUDENT`, `FACULTY`, `HOD`, `ADMIN`) and `needsPasswordChange` flags are embedded in the JWT session.

---

## 🗄️ Database & Prisma Indexing

Hot-path tables have performance indexes applied in `prisma/schema.prisma`:
- `AttendanceRecord`: indexed on `[sessionId]` and `[studentId]`
- `Session`: indexed on `[facultyId]` and `[date]`

> ⚠️ **Database Migration Note**: The production database is connected via Supabase Transaction Pooler. The repo now ships a committed baseline migration in `prisma/migrations/`. Apply schema changes with `npx prisma migrate dev` locally and `npx prisma migrate deploy` in production — never `prisma db push` against a shared database. Use a direct connection (`DIRECT_URL`) when creating migrations against Supabase.

---

## 📝 Recent Commit History

- `feat: complete phase 2 product gaps (password recovery, dashboard analytics)`
  - Added stateless version-fingerprinted password recovery (`/forgot-password`, `/reset-password`).
  - Added live roster filter tabs (*All*, *Present*, *Absent*, *Unmarked*) to `LiveSessionClient`.
  - Enforced cost 12 bcrypt and rate-limiting on password routes.
  - Refactored `change-password` route to `/api/auth/change-password`.

---

## 🎯 Next Steps / Suggested Enhancements

If you are joining the team to build new features, here are great starting points:
1. **Email Provider Integration**: Replace the simulated server-side log for reset links in `app/api/auth/forgot-password/route.ts` with a real SMTP/Resend service.
2. **Push Notifications**: Integrate web push notifications for students when an ad-hoc session or event is scheduled.
3. **Offline Mode / PWA**: Add service workers for offline scanning caching in low-connectivity areas.
