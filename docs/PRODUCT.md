# College Attendance Management System — Masterplan

## Register

product

## Users

| Role | Who | Primary Need |
|---|---|---|
| Student | ~1000+ across branches/semesters | Mark attendance quickly, view own attendance % |
| Faculty | All teaching staff | Take attendance fast, correct records, export data |
| HOD | Department heads | Department-wide visibility, no editing |
| Admin | System/college administration | Configure the system, import data, manage access |

Students use phones on-the-go between classes; faculty work on desktop during/between lectures; HODs and admins use desktop for oversight. Each role has a different relationship with time pressure — students need speed, faculty need accuracy, HODs need awareness, admins need control.

## Product Purpose

A production-grade digital attendance system for a 1000+ student college, replacing manual roll-call across multiple engineering branches, semesters, and divisions. Built around a timeslot model (not "lecture-based"), it handles real institutional messiness — proxies, cancellations, cross-branch events — without hacks. Success means eliminating the proxy-attendance problem while saving ~10 minutes of class time per session.

## Brand Personality

clean, fast, no-nonsense

The interface earns trust by being invisible during the task. Zero friction for high-frequency actions; data density without clutter when the user needs information. Professional but not cold — the warmth comes from reliability.

## Anti-references

- Generic SaaS dashboards with heavy card grids, gradient accents, and decorative illustration
- Over-styled admin panels where form controls fight for attention with the data
- Consumer-app gamification (badges, progress rings, confetti) in a professional context
- Any UI that makes faculty wait or hunt for the "start session" button

## Design Principles

1. **Zero-friction faculty flow** — Starting a session is 1–2 taps, every time, because it happens 6x/day per faculty member. The primary action is always one click from any faculty screen.
2. **Data density with clarity** — Tables, filters, and export buttons take priority over decorative UI. Information is the interface.
3. **Mobile-first for scanning, desktop-first for management** — Students scan on phones in hallways; faculty and admins manage on desktop. Each surface optimized for its context.
4. **Trust through transparency** — Every scan shows immediate success/failure. Every edit is auditable. No ambiguity means no classroom confusion.
5. **Consistency over surprise** — Same visual vocabulary across all four portals. Roles get different data; they do not get different interaction patterns.

## Accessibility & Inclusion

WCAG 2.2 AA compliance target. Screen-reader-friendly data tables, sufficient color contrast across all role portals, keyboard-navigable forms and menus. QR scan screen accounts for varied lighting conditions (classroom glare, dim corridors). Manual fallback (faculty mark) available for any student without a smartphone.

---

## 1. App Overview & Objectives

A production-grade, digital attendance system for a 1000+ student college, replacing manual roll-call across multiple engineering branches, semesters, and divisions. The system is built around a **timeslot model** (not "lecture-based"), meaning attendance is tied to a specific hour-long slot on a specific day — regardless of whether it's a regular lecture, a lab, a faculty proxy, or a college-wide event. This makes the system flexible enough to handle real institutional messiness (proxies, cancellations, cross-branch events) without hacks.

**Core objective:** Eliminate manual roll-call and its associated proxy-attendance problem, while giving students, faculty, HODs, and admins accurate, real-time visibility into attendance — with minimal operational complexity for a 5-person student team to build and maintain over one semester.

**Why this matters:** The current process (verbal roll-call, 6x/day, 70 students/class) wastes significant class time daily and is trivially easy to game. A well-designed digital system solves both problems at once, at institutional scale.

---

## 2. Target Audience

| Role | Who | Primary Need |
|---|---|---|
| Student | ~1000+ across branches/semesters | Mark attendance quickly, view own attendance % |
| Faculty | All teaching staff | Take attendance fast, correct records, export data |
| HOD | Department heads | Department-wide visibility, no editing |
| Admin | System/college administration | Configure the system, import data, manage access |

---

## 3. Core Features & Functionality

### Attendance Capture
- Faculty starts a session for their scheduled slot with one click (system already knows what/where from the timetable — no manual entry needed)
- A QR token is displayed, refreshing every 2–5 seconds
- Students open the scan page (already logged in), scan via in-browser camera, token is validated server-side and attendance is marked instantly
- Faculty can also launch an **ad-hoc/custom session** (proxy lecture, makeup class) not tied to the default timetable
- Faculty can manually add/edit/override individual student attendance at any time after the session, with a change log

### Timetable Engine
- One timetable per division, structured as **6 (configurable) slots/day**
- A lecture = 1 slot, a lab = 2 consecutive slots
- Labs support **sub-batches** (A/B/C) running in parallel
- Timetable is a **recurring template**; actual attendance is recorded against a **session** — a specific date-instance of a slot. This distinction lets proxies/cancellations/overrides happen on a single date without altering the recurring weekly template.

### Event-Based Attendance
- Admin/Faculty can create a **scoped event** (e.g. sports meet, seminar) spanning one or more timeslots
- Scope can target: entire branch, specific division(s), specific batch(es), or an arbitrary custom list of students
- Custom groups can be **saved and reused** (e.g. "College Cricket Team")
- Students covered by an active event are auto-marked present for any regular class they'd otherwise miss during that time window

### Student Portal
- Own attendance %, broken down by subject and combined semester-wide
- Shows total lectures conducted vs. attended

### Faculty Portal
- Today's/upcoming sessions pulled automatically from timetable — one-click start
- Attendance history for every class/session they've taken
- Export attendance as CSV — filterable by class/division or by batch

### HOD Portal
- Read-only dashboard across the entire department — all divisions, all semesters

### Admin Portal
- CSV import for: branches, semesters, divisions, batches, students, timetable
- System configuration: number of slots, LAN restriction toggle, academic year rollover/archival
- User/role management

---

## 4. High-Level Technical Stack Recommendation

Chosen for: **small team, single language (JavaScript/TypeScript) across the entire stack, minimal moving parts, production-credible.**

| Layer | Recommendation | Why |
|---|---|---|
| Backend | **Express.js (Node.js)** | Minimal, unopinionated, huge ecosystem, easiest for a student team to reason about and debug |
| ORM / Database layer | **Prisma + PostgreSQL** | Type-safe queries, auto-generated migrations, schema file doubles as living documentation of the data model; PostgreSQL handles the relational structure and attendance-% aggregation queries comfortably at this scale |
| Admin panel | **AdminJS** | Auto-generates CRUD screens directly from the Prisma models — recreates the "CSV import & data management without building custom screens" advantage, without needing a different language |
| Real-time QR refresh | **Server-Sent Events (SSE)**, via native Node HTTP streaming or a small Express helper | One-directional (server→browser) is all that's needed; simpler to run and reason about than WebSockets |
| Frontend | **EJS or Handlebars templates + htmx**, with one small vanilla JS page for the camera scan screen | Keeps everything inside a single Express app — no separate frontend build pipeline or repo to maintain |
| Hosting | College server (on-prem) or a low-cost VPS | Matches your LAN-toggle requirement; a single Node process is easy to self-host and deploy |

**Alternative considered: NestJS** instead of Express — more structured out of the box (built-in modules, dependency injection), which some teams prefer for long-term maintainability of a "production-grade" system. It's a reasonable upgrade path later, but has a steeper learning curve up front. Given the team's stated preference for simplicity, **Express is the recommended starting point**, with NestJS as a fallback if the project's complexity outgrows it.

**Why full Node.js works well here:** one language across backend, frontend templating, and tooling means less context-switching for a 5-person student team, a single deployable unit, and a very large ecosystem of well-documented packages (Prisma, AdminJS, Express) to lean on instead of building things from scratch.

---

## 5. Conceptual Data Model

Kept **flat and relational** — no per-batch or per-class tables (that anti-pattern was corrected during planning).

- **Student** — linked to Branch, current Semester, Division, Batch
- **Branch / Semester / Division / Batch** — hierarchical reference tables
- **Faculty** — linked to Branch
- **Timetable Entry** — (Division, Day, Slot number, Subject, Faculty, optional Batch for labs) — the recurring template
- **Session** — a specific date-instance of a Timetable Entry (or a standalone ad-hoc/proxy session) — this is what attendance actually attaches to
- **Attendance Record** — (Student, Session, Status, Marked-by, Timestamp, Edit history)
- **Event** — (Name, Time window, Scope definition)
- **Event Scope** — links an Event to Branches/Divisions/Batches/individual Students, or a Saved Group
- **Saved Group** — reusable named list of students

This structure comfortably supports hundreds of sessions/day and thousands of attendance records without special handling — that scale is routine for a relational database with proper indexing.

---

## 6. User Interface Design Principles

- **Faculty flow must be near-zero-friction**: opening today's session should be 1–2 taps, since this happens 6x/day per faculty member across the college
- **Student flow**: log in once per session (or stay logged in), scan, done — under 5 seconds ideally
- Mobile-first for the scan screen (students will use phones); desktop-friendly for admin/HOD dashboards
- Clear, immediate feedback on scan (success/failure state) — ambiguity here creates classroom confusion
- Faculty and Admin dashboards prioritize **data density with clarity** (tables, filters, export buttons) over decorative UI

---

## 7. Security Considerations

- **Authentication:** Enrollment/Employee ID + password for all roles
- **Anti-proxy measures:**
  - QR token rotates every 2–5 seconds — a shared screenshot goes stale almost immediately
  - QR encodes a raw token only (no URL) — meaningless outside an authenticated scan session
  - Rate-limiting/duplicate-prevention is enforced **per student account**, not per IP — IP-based blocking was deliberately ruled out since students on shared college WiFi/NAT can share the same IP, which would incorrectly block legitimate students
- **LAN restriction:** optional, admin-configurable toggle — not hardcoded, so it can be enabled per-network reality without a code change
- **Edit auditability:** every manual attendance edit by faculty is logged (who, when, old→new value) for accountability
- **Role-based access control:** strictly enforced at the query level (HOD can't edit, students can't see others' data, faculty limited to their own classes)

---

## 8. Development Phases (fit to a one-semester timeline)

**Phase 1 — Foundation (Weeks 1–3)**
Data model, admin CSV import (students/branches/semesters/divisions/timetable), auth for all roles.

**Phase 2 — Core Attendance Flow (Weeks 4–7)**
Timetable-driven session start, QR token generation + rotation (SSE), student scan-and-mark flow, basic attendance storage.

**Phase 3 — Faculty & Student Portals (Weeks 8–10)**
Faculty session history + manual edit/override with audit log, student attendance % dashboard, CSV export for faculty.

**Phase 4 — Events & HOD Dashboard (Weeks 11–13)**
Scoped event creation, saved groups, event-based auto-attendance, HOD read-only department view.

**Phase 5 — Admin Config, LAN Toggle, Polish & Testing (Weeks 14–16)**
Configurable slot count, LAN restriction toggle, semester rollover/archival, real-classroom pilot testing, bug fixing.

*(Low-attendance alerts and multi-college configurability were discussed but intentionally excluded from this scope — good future additions, not needed for launch.)*

---

## 9. Potential Challenges & Solutions

| Challenge | Solution |
|---|---|
| Faculty resistance to change from familiar manual process | Keep the "start session" flow to 1 click; pilot with a few friendly faculty first |
| Scale of CSV data (1000+ students, multiple branches) at initial setup | Build robust CSV validation + clear error reporting in admin import, not just raw upload |
| Distinguishing recurring timetable from actual day-to-day reality (proxies, cancellations) | Solved architecturally via the Timetable-Entry vs. Session distinction (Section 5) |
| Students without smartphones/data issues on scan day | Faculty manual-mark remains available as a fallback for any student, any time |
| Team of 5 students maintaining a production system post-graduation | Keep stack deliberately simple (single language, single deployable unit) to lower the maintenance bar for whoever inherits it |

---

## 10. Future Expansion Possibilities

- Low-attendance auto-alerts to students/faculty
- Multi-college / multi-campus configurability (already loosely supported via configurable slot count)
- Native mobile app instead of browser-based camera scan
- Analytics dashboard (attendance trends over time, at-risk student flagging)
- Integration with existing college ERP/LMS if one exists
- Fully queryable historical data across years (currently scoped as archive/export-only)

---

## Feedback

This is a first draft blueprint — please review and let me know what needs adjusting, removing, or expanding before we treat this as final.