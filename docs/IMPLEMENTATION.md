# Faculty Session Flow — Implementation

## Overview

The faculty session flow covers the full lifecycle of taking attendance: viewing today's schedule, starting a session, displaying a rotating QR code via SSE, ending the session, reviewing attendance, and manually editing records.

## Architecture

```
Express (EJS + htmx) → Prisma → PostgreSQL
              ↕
         SSE stream
```

- **Server-rendered EJS templates** with client-side htmx-style interactions (plain fetch for edits)
- **Server-Sent Events** for QR token rotation (3s interval) and real-time attendance count updates
- **Inline editing** via PATCH + HTML swap (no modals)

## Routes

| Method | Path | Purpose |
|---|---|---|
| GET | `/faculty` | Dashboard with today's timetable + active session |
| POST | `/faculty/sessions/:id/start` | Start a session from a timetable entry |
| GET | `/faculty/sessions/:id/live` | Live QR code display screen |
| GET | `/faculty/sessions/:id/events` | SSE stream (token rotation + attendance updates) |
| POST | `/faculty/sessions/:id/end` | End an active session |
| GET | `/faculty/sessions/:id/summary` | Attendance table with edit controls |
| PATCH | `/faculty/sessions/:id/attendance/:studentId` | Edit a single attendance record |
| POST | `/faculty/sessions/ad-hoc` | Start an unscheduled ad-hoc session |
| GET | `/api/qr/generate` | Generate QR PNG from token parameter |

## Key Design Decisions

1. **SSE over WebSockets** — Simpler to implement (native HTTP), sufficient for one-directional server→client updates. QR token rotation fires every 3s.

2. **htmx-free interactivity** — The summary page uses vanilla `fetch()` + `DOMParser` for inline edits. Keeps the dependency light while avoiding full page reloads.

3. **Inline editing over modals** — Per the design brief: the edit row expands below the student record. No modal, no navigation. Edit history is shown beneath the edit form.

4. **Restrained color application** — Navy-slate accent (`oklch(0.37 0.08 260)`) is reserved for primary actions and active states. Everything else is neutral. Pure white backgrounds for content density.

5. **Single sans typography** — System font stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto...`). No external font loads. Headlines, labels, and body use the same family at different weights.

## States Coverage

| State | Handling |
|---|---|
| **No sessions today** | Empty state with "Start Ad-Hoc Session" button |
| **Multiple upcoming** | All shown on dashboard; faculty picks one |
| **Active session** | Prominent banner at top of dashboard with "Return to session" |
| **Session live** | Full-screen QR with animated timer bar, auto-refreshing |
| **SSE disconnect** | Client-side `EventSource` handles reconnection; QR continues from last token |
| **Session ended** | Summary table with per-row edit, edit history, CSV export |
| **Edit with history** | Audit log shown below edit form; full old→new trail |
| **Manual add** | PATCH creates record if none exists (faculty mark for late/smartphone-less students) |
| **Error states** | Inline error banners; 404/400 responses with clear messages |

## Files

```
prisma/schema.prisma              — Data model (User, Session, AttendanceRecord, EditLog, etc.)
src/app.js                        — Express entry, session config, QR API endpoint
src/middleware/auth.js             — requireAuth + requireRole middleware
src/routes/auth.js                 — Login/logout
src/routes/faculty.js              — All faculty session endpoints + SSE management
src/public/css/design-tokens.css   — OKLCH color tokens, typography, spacing, z-index scale
src/public/css/app.css             — Layout, components, states, responsive rules
src/views/layouts/main.ejs         — Public layout (login, error pages)
src/views/layouts/faculty.ejs      — Faculty layout with sidebar
src/views/auth/login.ejs           — Faculty/student login
src/views/error.ejs                — Error page
src/views/faculty/dashboard.ejs    — Today's sessions list + ad-hoc form
src/views/faculty/live-session.ejs — QR display + SSE connection
src/views/faculty/session-summary.ejs — Attendance table + edit controls + CSV export
src/views/faculty/partials/student-row.ejs — Single student row (display + edit states)
```

## Design Tokens

All tokens in OKLCH. Key values:

```
--color-primary:  oklch(0.37 0.08 260)    /* Navy slate accent */
--color-bg:       oklch(1 0 0)             /* Pure white */
--color-surface:  oklch(0.97 0.005 260)    /* Cool whisper */
--color-ink:      oklch(0.12 0.01 260)     /* Near-black */
--color-muted:    oklch(0.5 0.015 260)     /* Secondary text */
--color-error:    oklch(0.55 0.2 25)       /* Red */
--color-success:  oklch(0.6 0.18 145)      /* Green */
```

WCAG contrast: body text ≥7:1, muted text ≥4.5:1, white text on primary ≥7:1. All pass AA.

## Getting Started

```bash
npm install
# Set up PostgreSQL and set DATABASE_URL in .env
npx prisma db push
npm run dev
```

Visit `http://localhost:3000/auth/login` and sign in with a faculty account.
