<!-- SEED: re-run $impeccable document once there's code to capture the actual tokens and components. -->
---
name: College Attendance Management System
description: Production-grade digital attendance for a 1000+ student college
---

# Design System: College Attendance Management System

## 1. Overview

**Creative North Star: "The Quiet Register"**

A college attendance system used 6 times a day by every faculty member, across every class, every semester. The interface earns its keep by being invisible — faculty tap "Start Session" without thinking, students scan and move on, administrators find what they need without hunting. The opposite of an ERP dashboard: no heavy gradients, no cluttered tables, no decorative flourishes. Every pixel serves the task.

This is a **product** surface. Design serves the task, not the brand. The navy-slate accent appears only where it earns its place — primary actions, current selections, and state indicators. Everything else is neutral, legible, and dense enough for real institutional scale.

**Key Characteristics:**
- Zero-friction primary actions (1–2 taps for faculty session start)
- Data density with clarity — tables and filters, not cards and illustrations
- Dense but airy: tight spacing with generous visual breathing room
- Mobile-first for student scan flow; desktop-first for management dashboards
- Consistent vocabulary across all four portals (student, faculty, HOD, admin)

## 2. Colors

**The Restrained Rule.** The palette is restrained by design — tinted cool neutrals with a single navy-slate accent used on ≤10% of any given surface. The rarity of the accent is the point: when navy appears (a primary button, a selected tab, a focused input), it carries weight. The surface does not compete.

**Hue anchor:** Navy / slate (cool, authoritative, institutional). The mood is "institutional-grade precision — a navy lecture hall, clean glass, silent focus."

### Primary (Accent)
- **Navy Slate** `[value to be resolved during implementation]`: Primary buttons, active navigation items, focused inputs, selected states. Never decorative. Used on ≤10% of any screen.

### Neutral
- **White** `[value to be resolved during implementation]`: Page backgrounds and content areas. Pure white, no tint.
- **Cool Surface** `[value to be resolved during implementation]`: Sidebars, panels, cards, section backgrounds. A whisper cooler than the page background.
- **Cool Ink** `[value to be resolved during implementation]`: Body text. Near-black with a subtle cool shift toward the brand hue. ≥7:1 contrast against backgrounds.
- **Cool Muted** `[value to be resolved during implementation]`: Secondary text, labels, placeholder text. ≥4.5:1 against backgrounds.
- **Cool Border** `[value to be resolved during implementation]`: Dividers, table borders, input strokes. Subtle and structural.

### Semantic
- **Red** `[value to be resolved during implementation]`: Error states, deletion actions, low-attendance warnings.
- **Green** `[value to be resolved during implementation]`: Success states, confirmed attendance, positive indicators.

### Named Rules
**The One Voice Rule.** The navy accent is used on ≤10% of any given screen. Its rarity is the point — when it appears, it communicates "this is actionable."

**The Pure Surface Rule.** Warmth lives in the accent color, not the background. Page backgrounds are pure white at all times. The cool air comes from the navy-slate anchor; tinting the surface would compete with it.

## 3. Typography

**Direction:** Single sans-serif throughout. One workhorse family for all roles — headings, body, labels, data tables, buttons. No pairing, no display face.

**Character:** Clean, technical-neutral, highly legible at small sizes for dense data views. The typography disappears into readability — no expressive flourishes, no forced personality.

**Font:** `[font pairing to be chosen at implementation]` — recommended candidates: Inter (open-source, excellent legibility across sizes), system-ui stack (zero load cost, native feel).

### Hierarchy
- **Headline** (Semibold 600, 1.5rem/24px, 1.3): Page titles and section headers.
- **Title** (Medium 500, 1.125rem/18px, 1.4): Card titles, panel headers, dialog headings.
- **Body** (Regular 400, 0.9375rem/15px, 1.5): Primary reading text. Max line length 65–75ch for prose content; tables and compact UI may run denser.
- **Label** (Medium 500, 0.8125rem/13px, 1.4, 0.01em letter-spacing): Form labels, table headers, button text, navigation items.
- **Caption** (Regular 400, 0.75rem/12px, 1.4): Metadata, helper text, timestamps, data table cells.

### Named Rules
**The One Family Rule.** A single sans-serif for everything. No display pairing, no serif headings, no monospace data. Consistency and legibility at small sizes are the priority.

**The Tight Scale Rule.** The ratio between steps is 1.125–1.2 — tight enough to avoid vertical dislocation in dense admin views, wide enough to establish clear hierarchy.

## 4. Elevation

**Flat by default.** The system uses tonal layering (background and surface colors) rather than box shadows to establish depth. Cards, panels, and modals are differentiated by their background tint, not by a drop shadow.

This is a deliberate choice for an institutional tool used on varied hardware (college desktops, aging classroom projectors, student phones in hallway glare). Shadows read differently across displays; tinted surfaces are reliable everywhere.

### Shadow Vocabulary
- **Modal backdrop** `[value to be resolved during implementation]`: A dark semi-transparent overlay for dialogs and popovers.

No other shadows are used at rest. If hover elevation is needed, it is implemented as a background tint shift (`[to be resolved during implementation]`), not a shadow.

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat at rest. Depth is conveyed through background tints, not shadows. Shadows appear only as a response to state (a modal's backdrop overlay).

## 5. Components

*Omitted in seed mode. Components will be documented once code exists.*

## 6. Do's and Don'ts

### Do:
- **Do** use the navy-slate accent sparingly — on primary actions, active selections, and focused elements only.
- **Do** keep page backgrounds pure white. Warmth and personality come from the accent color and typography, not the canvas.
- **Do** prioritize data density in admin and faculty views — tables, filters, sort controls, and export buttons over decorative cards.
- **Do** make the "start session" action the most prominent element on every faculty screen. It happens 6x/day; it should be the one thing the faculty member never has to hunt for.
- **Do** use white text on the navy-slate accent fills for maximum readability.
- **Do** use skeleton states for loading data, not spinners in the middle of content.

### Don't:
- **Don't** use gradient badges, heavy shadows, glassmorphism, or decorative illustration — those are ERP dashboard clichés and this system is the opposite.
- **Don't** create card-heavy layouts that waste vertical space. Tables and lists are the default; cards are for specific action-oriented groupings only.
- **Don't** put display fonts or gradient text in UI labels, buttons, or data.
- **Don't** animate page-load sequences. Users are in a task; don't make them watch it load.
- **Don't** use a modal when an inline edit, progressive disclosure, or side panel would do. Modals are the last resort.
- **Don't** use border-left or border-right as a colored accent stripe on cards, list items, or alerts.
- **Don't** override standard affordances — no custom scrollbars, no weird form controls, no non-standard modals.
- **Don't** show empty tables as blank slates. Every data surface should teach the interface: "Import your first CSV" or "No sessions today" with a clear next action.
