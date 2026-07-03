# Puff Attendance

College Attendance Management System — digital attendance for faculty, students, HODs, and admin across multiple portals.

## Stack

- **Framework:** Next.js 14 (App Router) + TypeScript
- **Styling:** Tailwind CSS + OKLCH design tokens
- **Auth:** NextAuth v5 (Auth.js) — credentials provider, JWT strategy
- **Database:** PostgreSQL + Prisma ORM
- **QR:** jsqr (browser decoding) + jose (token signing) + SSE (token rotation)

## Getting Started

### 1. Start PostgreSQL

```bash
docker start puff-attendance-app-db-1
```

If you don't have a container yet:

```bash
docker run -d --name puff-attendance-db \
  -e POSTGRES_USER=puff \
  -e POSTGRES_PASSWORD=puff \
  -e POSTGRES_DB=puff_attendance \
  -p 5432:5432 \
  postgres:16-alpine
```

### 2. Sync database schema

```bash
npx prisma db push
```

### 3. Seed sample data

```bash
npx tsx prisma/seed.ts
```

### 4. Start dev server

```bash
npm run dev
```

Visit **http://localhost:3000**

## Test Credentials

All accounts use password: **`password123`**

| Role | Email | Portal URL |
|---|---|---|
| **Admin** | admin@college.edu | `/admin` — manage users, courses, timetables |
| **Faculty** | faculty@college.edu | `/faculty/dashboard` — take attendance, start sessions |
| **HOD** | hod@college.edu | `/hod` — monitor faculty, generate reports |
| **Student** | student@college.edu | `/student` — view attendance, scan QR code |

## Project Structure

```
app/
  (auth)/           Login, auth error pages
  admin/            User/course/timetable CRUD, reports
  faculty/          Dashboard, live session, summary, history
  hod/              Faculty list, session monitoring, reports
  student/          Dashboard, QR scanner
  api/              All API routes (auth, faculty, admin, student, qr)
components/
  ui/               Button, Input, Table, Badge, Banner, Modal, Skeleton, EmptyState
  layout/           AppShell, Sidebar, Topbar
  faculty/          SessionCard, LiveSessionClient, StudentTable, AdHocForm, etc.
  student/          QRScanner
  auth/             LoginForm, SessionProvider
lib/
  prisma.ts         Singleton PrismaClient
  auth.ts           NextAuth re-exports
  auth.config.ts    Auth configuration
  faculty-service.ts Faculty session logic
  qr-token.ts       JWT sign/verify for QR tokens
  utils.ts          cn() class merger
prisma/
  schema.prisma     6 models (User, Course, TimetableEntry, Session, AttendanceRecord, EditLog)
  seed.ts           Sample data
styles/
  design-tokens.css OKLCH color tokens, typography, spacing
```

## Routes (33 total)

### Portals
- `/admin/*` — Admin dashboard, users, courses, timetables, reports
- `/faculty/*` — Dashboard, live session, session summary, history
- `/hod/*` — Dashboard, faculty, sessions, reports
- `/student/*` — Dashboard, QR scanner

### API
- `/api/auth/[...nextauth]` — NextAuth handlers
- `/api/faculty/sessions/[id]/*` — Start, live (SSE), end, attendance, export
- `/api/faculty/sessions/ad-hoc` — Ad-hoc session creation
- `/api/admin/users/*` — User CRUD
- `/api/admin/courses/*` — Course CRUD
- `/api/admin/timetables/*` — Timetable CRUD
- `/api/student/scan` — QR token verification + attendance marking
- `/api/qr/generate` — QR code PNG generation

## Design System

- **Creative North Star:** "The Quiet Register" — invisible, task-focused interface
- **Accent:** Navy-slate (`oklch(0.37 0.08 260)`) on ≤10% of any surface
- **Typography:** System-ui font stack (single sans-serif)
- **Elevation:** Flat by default — depth via background tints, not shadows
- **Contrast:** Body ≥7:1, muted ≥4:1, all pass WCAG AA
