# DaemThis Attendance

A Premium College Attendance Management System featuring digital attendance for faculty, students, HODs, and administrators across multiple role-based portals. Built with a modern tech stack, dark-mode-first premium UI, and secure rotating QR code technology.

## Key Features

- **Role-Based Portals**: Dedicated UI and workflows for **Admins**, **HODs**, **Faculty**, and **Students**.
- **Secure Live QR Attendance**: Faculty can project a live QR code that updates every 5 seconds (preventing screenshot cheating) using Server-Sent Events (SSE).
- **Intelligent Timetables**: Automated rendering of timetables with dynamic conflict packing (if two lab sessions overlap, they render side-by-side beautifully).
- **Fast Testing UI**: A built-in "Quick Test Login" panel on the login screen to instantly switch between user roles with one click.
- **Premium Design System**: Dark-themed, glassmorphic UI built from scratch using OKLCH color tokens, system-ui fonts, and micro-animations for a deeply satisfying user experience.

## Tech Stack

- **Framework:** Next.js 14 (App Router) + TypeScript
- **Styling:** Vanilla CSS Modules + Tailwind CSS with custom Design Tokens
- **Auth:** NextAuth.js v5 — Credentials Provider with JWT
- **Database:** PostgreSQL + Prisma ORM
- **Realtime:** SSE (Server-Sent Events) for real-time QR rotation
- **QR Tech:** jsqr (browser decoding) + jose (JWT token signing)

---

## How to Run Locally

Follow these steps to get the project running on your local machine.

### 1. Start the Database (PostgreSQL)
You will need a PostgreSQL database. If you have Docker installed, you can spin one up instantly:
```bash
docker run -d --name puff-attendance-db \
  -e POSTGRES_USER=puff \
  -e POSTGRES_PASSWORD=puff \
  -e POSTGRES_DB=puff_attendance \
  -p 5432:5432 \
  postgres:16-alpine
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Sync Database Schema
Push the Prisma schema to your local database to create the necessary tables:
```bash
npx prisma db push
```

### 4. Seed the Database
Populate the database with sample users, timetables, and courses:
```bash
npx tsx prisma/seed.ts
npx tsx prisma/seed_ce_timetable.ts
```

### 5. Start the Development Server
```bash
npm run dev
```
Visit **http://localhost:3000** in your browser!

---

## Login Info & Test Credentials

On the login page, you can use the **Quick Test Login** buttons at the bottom of the form to instantly log in as any role with one click! 

If you prefer to type them manually, all test accounts use the password: **`password123`**

| Role | Email | Portal URL | Access Level |
|---|---|---|---|
| **Admin** | `admin@college.edu` | `/admin` | Manage users, courses, create and edit timetables. |
| **Faculty** | `byp@college.edu` | `/faculty` | Start live sessions, project QR codes, view history. |
| **HOD** | `hod@college.edu` | `/hod` | Monitor faculty attendance, generate department reports. |
| **Student** | `student@college.edu` | `/student` | View personal attendance, scan live QR codes. |

---

## Project Structure

- `app/` - Next.js App Router structure with dedicated route groups for `(auth)`, `admin/`, `faculty/`, `hod/`, and `student/`.
- `components/` - Reusable UI components (Buttons, Modals, TimetableGrid) and role-specific views.
- `lib/` - Prisma client, NextAuth configuration, and utility functions.
- `prisma/` - Database schema defining Users, Courses, TimetableEntries, and AttendanceRecords.
