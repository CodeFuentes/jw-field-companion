# jw-field-companion — System Specification

> **Living document.** This file is the single source of truth for the system. All implementation decisions, UI/UX standards, data model definitions, user flows, edge cases, and future phase plans are recorded here. Update this document whenever a requirement changes — use Git history for change tracking.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture & Tech Stack](#2-architecture--tech-stack)
3. [Data Model](#3-data-model)
4. [User Flows](#4-user-flows)
5. [UI/UX System](#5-uiux-system)
6. [Edge Cases & Business Rules](#6-edge-cases--business-rules)
7. [Backup & Data Safety](#7-backup--data-safety)
8. [Multi-Profile Support](#8-multi-profile-support)
9. [Localization & Settings](#9-localization--settings)
10. [Discarded Decisions](#10-discarded-decisions)
11. [Future Phases](#11-future-phases)

---

## 1. Project Overview

**jw-field-companion** is a personal desktop + mobile application for Jehovah's Witnesses to manage their field ministry records. It replaces manual tracking with a structured, offline-first tool that covers:

- People contacted during ministry (persons, visits, revisits)
- Bible studies (studies and individual study sessions)
- Preaching time records (preaching sessions with automatic hour calculation)
- Monthly ministry statistics and reporting summaries
- Personal notes per person

### Disclaimer

This application is independent and is not affiliated with, sponsored by, or approved by Jehovah's Witnesses or the Watch Tower Bible and Tract Society. This disclaimer must appear in the onboarding screen and in the About section of settings.

### Language

- **Documentation, code, comments, GitHub Issues, diagrams:** English
- **UI language:** Neutral Spanish (no voseo). Examples: "Guarda", "Registra", "Selecciona" — never "Guardá", "Registrá"
- Additional UI languages available via i18n settings (English supported from day one)

---

## 2. Architecture & Tech Stack

### Phase 1 (Local-only)

| Layer | Technology | Rationale |
|---|---|---|
| Desktop wrapper | Tauri | Lightweight native installer (~5MB), no external dependencies for end user |
| Frontend | React + TypeScript | Reusable across desktop and future mobile |
| Styling | Tailwind CSS | Consistent design system, utility-first |
| Local database | SQLite via `tauri-plugin-sql` | Embedded, no server required, managed from TypeScript |
| Icons | Lucide React | Thin stroke, consistent with minimal style |
| Virtual lists | @tanstack/virtual | Performant rendering of long lists without pagination |
| Dual range slider | react-range | Headless, fully styleable time range picker |

### Phase 2 (Sync & Mobile)

| Layer | Technology |
|---|---|
| Cloud sync | Supabase (PostgreSQL + Realtime) |
| Auth | Supabase Auth (email/password + Google) |
| Mobile | Capacitor (wraps existing React app) |

### Key Architectural Decisions

**Offline-first:** All data is written to local SQLite immediately. Sync with Supabase in Phase 2 is additive — the app works fully without internet.

**Multiple SQLite files per machine:** Each user profile has its own `.db` file. This guarantees physical data separation between profiles (e.g., a married couple sharing a PC). Cross-profile analytics in Phase 3 will use SQLite's `ATTACH DATABASE`.

**Timezone:** All timestamps stored in UTC. UI always displays in local time. This ensures correct behavior when syncing with Supabase (Phase 2) which uses `timestamptz`.

**No `preaching_record` table:** Preaching time is derived from `preaching_session` timestamps. Study time is tracked via `study_session` timestamps linked to a `preaching_session`. No separate segmentation table is needed for the reports defined in Phase 1.

---

## 3. Data Model

### 3.1 Entity Relationship Summary

```
user_settings         (1 per profile)
person                (1) ──< person_note
person                (1) ──< visit
person                (1) ──< study
study                 (1) ──< study_session
preaching_session     (1) ──< study_session
```

### 3.2 Tables

---

#### `user_settings`

Stores all user preferences and app configuration. One row per profile.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `language` | TEXT | `'es'` \| `'en'` — default `'es'` |
| `theme` | TEXT | `'light'` \| `'dark'` \| `'system'` — default `'system'` |
| `terms_version_accepted` | TEXT | Version string of last accepted terms, e.g. `'1.0'` |
| `allow_usage_data` | BOOLEAN | Default `false` — user must opt in |
| `auto_sync` | BOOLEAN | Default `false` — Phase 2 only |
| `backup_enabled` | BOOLEAN | Default `true` |
| `backup_directory` | TEXT | Nullable — user-selected path. If null, only system backup is active |
| `backup_max_snapshots` | INTEGER | Default `7` — max rotating snapshots in user directory |
| `onboarding_completed` | BOOLEAN | Default `false` — set to `true` after onboarding flow completes |
| `created_at` | TIMESTAMP | UTC |
| `updated_at` | TIMESTAMP | UTC |

---

#### `person`

Represents a person contacted during ministry.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `first_name` | TEXT | Required |
| `last_name` | TEXT | Nullable |
| `phone` | TEXT | Nullable |
| `email` | TEXT | Nullable — displayed as `mailto:` link in profile |
| `address` | TEXT | Nullable — free text |
| `latitude` | REAL | Nullable — from geocoding |
| `longitude` | REAL | Nullable — from geocoding |
| `interest_status` | TEXT | `'interested'` \| `'studying'` \| `'paused'` \| `'rejected'` — default `'interested'` |
| `archived_at` | TIMESTAMP | Nullable UTC — if not null, person is archived |
| `first_contact_date` | DATE | Nullable |
| `created_at` | TIMESTAMP | UTC |

**Constraints:**
- Soft unique on `first_name + last_name`: enforced via UI warning, not a database constraint. If a duplicate full name is detected, the user sees: "A person with this name already exists. Is this the same person?" with a link to the existing profile. The user can confirm it is a different person and proceed.

**Archiving behavior:**
- `archived_at IS NOT NULL` means the person is archived
- Archived persons are hidden from all active lists and searches by default
- A toggle "Show archived" on the persons list shows only archived persons
- Archiving sets all active `study` records for this person to `status = 'paused'`
- Restoring (clearing `archived_at`) does NOT reactivate studies — user decides manually

---

#### `person_note`

Chronological notes attached to a person. Immutable after creation.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `person_id` | UUID FK → person | Cascade delete |
| `content` | TEXT | Required |
| `created_at` | TIMESTAMP | UTC — set at save time, never editable |

**Rules:**
- Notes are not editable after creation. To correct something, add a new note.
- Notes can be deleted with a simple confirmation dialog.
- Display order: toggleable between newest-first (default) and oldest-first.

---

#### `visit`

Records each contact attempt with a person.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `person_id` | UUID FK → person | Cascade delete |
| `date` | DATE | Default today |
| `outcome` | TEXT | `'completed'` \| `'no_answer'` \| `'rejected'` — no default, user must select |
| `counts_as_revisit` | BOOLEAN | Auto-calculated: `true` if `outcome = 'completed'`, `false` otherwise. User can override. |
| `notes` | TEXT | Nullable |
| `created_at` | TIMESTAMP | UTC |

**Rules:**
- `outcome` has no default — the field renders as unselected chips and the user must explicitly choose before saving.
- When `outcome = 'rejected'`, the system suggests (non-blocking): "This person declined the visit — change their status to 'not interested'?" with yes/no options.
- When a visit with `outcome = 'completed'` is registered for a person who has an active study, the system asks: "Was this visit a study session?" and offers to navigate to F7 (register study session).

---

#### `study`

Represents an ongoing Bible study relationship with a person.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `person_id` | UUID FK → person | Cascade delete |
| `publication` | TEXT | Free text with autocomplete based on user's existing studies |
| `status` | TEXT | `'active'` \| `'paused'` \| `'completed'` — default `'active'` |
| `notes` | TEXT | Nullable |
| `created_at` | TIMESTAMP | UTC |

**Rules:**
- A person can have multiple studies over time (e.g., different publications, resumed after a pause).
- A person can theoretically have two `active` studies simultaneously. The system allows this but shows an informational warning: "This person already has an active study with [publication]. Do you want to create a new one?"
- Study sessions are displayed in the study view from most recent to oldest, each clickable.

---

#### `study_session`

Records a single session within a Bible study.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `study_id` | UUID FK → study | Cascade delete |
| `preaching_session_id` | UUID FK → preaching_session | Nullable — links session to a preaching outing |
| `started_at` | TIMESTAMP | UTC |
| `ended_at` | TIMESTAMP | UTC |
| `companions` | TEXT | Nullable — free text, names of companions present |
| `chapter_topic` | TEXT | Nullable — free text describing what was covered |
| `notes` | TEXT | Nullable |
| `created_at` | TIMESTAMP | UTC |

**Rules:**
- `started_at` and `ended_at` must not overlap with any other `study_session` on the same day. This is a hard validation — the user cannot save until the conflict is resolved.
- If linked to a `preaching_session`, `started_at` and `ended_at` must fall within the preaching session's time range. Hard validation with inline error.
- Publication is inherited from the parent `study` — variations can be noted in `notes`.

---

#### `preaching_session`

Records a preaching outing (field ministry, phone ministry, or letter writing).

| Field | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `started_at` | TIMESTAMP | UTC |
| `ended_at` | TIMESTAMP | Nullable UTC — null means session is currently active |
| `entry_mode` | TEXT | `'realtime'` \| `'manual'` |
| `modality` | TEXT | `'field'` \| `'phone'` \| `'letters'` — default `'field'` |
| `notes` | TEXT | Nullable |
| `created_at` | TIMESTAMP | UTC |

**Rules:**
- `ended_at IS NULL` means the session is active. No separate `status` field needed.
- **Active session across midnight:** If the app is opened and a session exists with `started_at` from a previous day and `ended_at IS NULL`, a blocking modal appears before any other interaction: "You have an open preaching session from [date] at [time]." Options: "Set end time" (opens time picker for that date) or "Discard session" (with simple confirmation).
- **On app close:** Tauri's `on_close` event triggers an immediate backup regardless of the debounce timer. If a session is active, the session remains open — it is not auto-closed.
- **Deleting a preaching session** cascades to all linked `study_session` records. The confirmation dialog shows: "This will permanently delete this preaching session and X study session(s) conducted during it: [list of person names]."

### 3.3 Hour Calculation Logic

Hours are stored as timestamps — never as a numeric field. All calculations are derived at query time.

**Monthly reportable hours:**

```
total_minutes_this_month = SUM(ended_at - started_at) for all preaching_sessions in month
total_minutes_all_prior_months = SUM(ended_at - started_at) for all prior months
carry_over_minutes = total_minutes_all_prior_months % 60
reportable_hours = FLOOR((total_minutes_this_month + carry_over_minutes) / 60)
next_month_carry = (total_minutes_this_month + carry_over_minutes) % 60
```

The organization requires whole hours only. Minutes that don't complete an hour carry over to the next month automatically.

**Dashboard display:**
> "This month: 8h 45min · Carried over: 23min · **Reportable: 9h** · Carry to next month: 8min"

**Studies given (for reporting):**
`COUNT(DISTINCT study.person_id)` where at least one `study_session` exists within the reporting period.

**Participated in ministry:**
`EXISTS` at least one `preaching_session` with `started_at` within the month.

**Revisits:**
`COUNT(visit)` where `counts_as_revisit = true` and `date` within the period.

---

## 4. User Flows

All flows apply to both desktop and mobile unless noted. Desktop uses full forms; mobile uses sequential steps for the same logic.

### F1 — Start and close a preaching session (mobile, real-time)

**Entry points:** Home, active session screen, study view

**Flow:**
1. User taps the ministry button. Two equal-weight options appear:
   - **"Start now"** — `started_at = current timestamp`
   - **"I started a while ago"** — opens time picker with suggestion chips (multiples of 5 min going back from now)
2. Session becomes active. Timer is visible. Quick actions available: Register Visit, Register Study.
3. During active session, a "Finish" button is visible but visually less prominent than quick actions (prevents accidental tap).
4. To close: **"Finish now"** or **"I finished a while ago"** (same chip pattern as start). The end time is editable with a single tap in the summary screen.
5. Summary screen shows: total duration, visits registered, studies conducted. User confirms or goes back to edit.

**Time picker behavior:** Any time field initialized with "now" automatically shows suggestion chips for the 3-4 nearest multiples of 5 minutes going backward. If the current time is already a multiple of 5, chips do not appear and the time is saved directly.

**Modality:** On PC, when starting a session, a chip selector appears for modality: Field (default), Phone, Letters.

### F2a — Register a preaching session retroactively (PC)

**Entry points:** Home, session history, study view

**Flow:**
1. Form fields: date (default today), start time, end time — both with time picker + suggestion chips.
2. Optional notes field (always visible, regardless of study checkbox).
3. Checkbox "Were there studies during this outing?" — unchecked by default.
   - If checked: study panel expands showing active studies to select from + "New study" button (opens F6 in a drawer without losing context). Each linked study requires its own start/end time within the session range.
   - Multiple studies can be linked to one session.
4. Summary screen before saving: total duration, linked studies, calculated hours.
5. Save.

**F2b (mobile retroactive):** Same logic as F2a. UI adapts to sequential steps instead of a single form. No separate flow diagram needed.

### F3 — Register a new person

**Entry points:** Home, persons list, register visit screen (F4), active session

**Flow:**
1. Form: first name (required), last name, phone, email, address. `interest_status` defaults to `'interested'`.
2. Optional: geocode address to set `latitude`/`longitude`. Geocoding uses OpenStreetMap/Nominatim (free). Failure saves address text only without blocking.
3. Checkbox "First visit already happened?" — unchecked by default. If checked, an inline visit mini-form appears (date, outcome, notes) without leaving the screen. `first_contact_date` is set to this date.
4. On save: navigate to person profile or return to previous context. If entered from an active session, returning restores the session context.

**Duplicate detection:** If `first_name + last_name` matches an existing person, a soft warning appears: "A person with this name already exists. [View profile] or continue creating." Not a hard block.

### F4 — Register a visit / revisit

**Entry points:** Home, person profile, active session, F3 inline

**Flow:**
1. If person not pre-selected: search field with real-time filtering + "New person" button (F3).
2. Form: date (default today), outcome (no default — required selection), notes.
3. `counts_as_revisit` is auto-calculated from outcome but displayed as an overrideable checkbox.
4. On `outcome = 'rejected'`: non-blocking suggestion to update `interest_status`.
5. On `outcome = 'completed'` for a person with an active study: non-blocking suggestion "Was this a study session?" with option to go to F7.
6. On save: go to person profile or return to previous context.

### F5 — Archive a person

**Entry points:** Person profile (ellipsis menu), persons list (ellipsis menu)

**Flow:**
1. User selects "Archive person" from ellipsis menu.
2. Confirmation dialog: "Archiving [Name] will remove them from your active lists. Their visits and studies are preserved. You can restore them at any time." Buttons: Cancel / Archive.
3. On confirm: `archived_at = now`, all active studies set to `status = 'paused'`.
4. User is returned to the persons list.

**Restoring:** From the archived persons view, a "Restore" button clears `archived_at` only. Studies remain paused — user reactivates manually.

**Permanent deletion:** Available via ellipsis menu in person profile. Confirmation requires typing "delete" and shows a summary: "This will permanently delete [Name] and all associated records: X notes, X visits, X studies, X study sessions." Full cascade delete.

### F6 — Create a Bible study

**Entry points:** Home, person profile, F2/F2b (retroactive session), F4 (after completed visit)

**Flow:**
1. If person not pre-selected: search/select or create (F3).
2. Form: publication (free text with autocomplete from user's existing studies), `status` (default `'active'`), notes.
3. Checkbox "Register first session now?" — unchecked by default. If checked, F7 form appears inline immediately.
4. On save: navigate to study view.

### F7 — Register a study session

**Entry points:** Study view, F6 inline, active session, F2/F2b

**Flow:**
1. If study not pre-selected: list of active studies to choose from.
2. Form: start time, end time (with time picker + dual range slider for quick adjustment), companions (optional free text), chapter/topic (optional), notes.
3. If an active `preaching_session` exists: auto-linked silently. Checkbox "Finish preaching session too?" appears — **unchecked by default**.
4. Overlap validation: hard block if time range overlaps with another `study_session` on the same day.
5. On save: return to study view.

### F8 — Dashboard / monthly report

**Entry points:** Home, main navigation

**Display:**
- Default period: current calendar month
- Period selector: chips for "Last month", "Quarter", "This year", + custom date range picker
- Statistics block (plain text):
  - Reportable hours (with full breakdown)
  - Studies given (distinct persons with a session in the period)
  - Revisits (count of `counts_as_revisit = true`)
  - Participated in ministry: Yes/No
- If active session exists: persistent banner at top showing elapsed time + "Finish" quick action
- Empty state (no data): friendly message with suggested actions

### F9 — Add a note to a person

**Entry points:** Person profile (inline), visit view, study session view, active session

**Flow:**
1. From person profile: expandable inline input in the notes section.
2. From any other context: drawer or modal (does not interrupt current context).
3. `created_at` is set automatically on save — not shown in the form.
4. On save: return to previous context. New note appears at top of the notes list.

**Note deletion:** Simple confirmation dialog. No editing of existing notes.

### F10 — Edit and delete records

**General pattern:**
- Edit button visible in record view. Delete in ellipsis menu.
- Edit: opens the same form used for creation, pre-populated.
- Delete: confirmation level varies by entity (see table below).
- On save after edit: if changes affect time ranges or linked records, an inline warning is shown before confirming.

**Edit restrictions by entity:**

| Entity | Editable fields | Special rule |
|---|---|---|
| `person` | All | Soft duplicate name check |
| `visit` | All | Changing `outcome` recalculates `counts_as_revisit` |
| `study` | All | Changing `publication` shows informational note |
| `study_session` | All | Hard overlap validation on time change |
| `preaching_session` | All | If `ended_at` moves earlier than a linked `study_session`, hard error: "Adjust the study session time first" |
| `person_note` | Not editable | Delete only |

**Delete confirmation by entity:**

| Entity | Confirmation type | Cascade |
|---|---|---|
| `person` | Explicit — type "delete" + record summary | Full cascade |
| `study` | Simple + shows session count | `study_session` deleted |
| `study_session` | Simple | Unlinks from `preaching_session` (session not deleted) |
| `preaching_session` | Simple + lists linked study sessions by person name | `study_session` deleted |
| `visit` | Simple | None |
| `person_note` | Simple | None |

### F11 — Settings

**Entry point:** Main navigation

**Sections:**
- **Appearance:** Theme toggle (Light / Dark / System — default System)
- **Language:** Language selector (Spanish default, English available)
- **Privacy:** Toggle for anonymous usage data (off by default) with brief explanation
- **Data:** Backup configuration (see Section 7), export all data as JSON or CSV
- **About:** App version, disclaimer of non-affiliation, terms version accepted

**Behavior:** All changes apply immediately — no "Save settings" button.

**Terms update:** If a new terms version is available on app open, a blocking modal appears before any interaction. User must accept to continue.

### F12 — Onboarding (first launch only)

**Trigger:** `user_settings.onboarding_completed = false`

**Steps:**
1. **Welcome + Language** — language selector pre-filled with OS language. All subsequent steps display in chosen language.
2. **Terms & Conditions** — required acceptance. Cannot proceed without it. `terms_version_accepted` is set.
3. **Appearance** — theme selector (Light / Dark / System).
4. **Personal backup** — directory picker. "Skip" option available. If skipped, only system backup is active and a soft reminder appears in Settings.

**On complete:** `onboarding_completed = true`. User enters home screen.

**Interrupted onboarding:** If app is closed mid-onboarding, it resumes from the last incomplete step on next launch. Terms step always shows fully if not yet accepted.

---

## 5. UI/UX System

### 5.1 Visual Style

Minimal functional design inspired by Claude Desktop. Clean surfaces, content as the protagonist. No decorative gradients, no illustrations, no banners with background images. Empty states use a single large gray icon + descriptive text + suggested action.

### 5.2 Color System

#### Background scale (warm base — not pure white)

| Token | Hex | Usage |
|---|---|---|
| `background-primary` | `#f5f4ef` | Main app background |
| `background-secondary` | `#eceae3` | Cards, panels, sidebar |
| `background-tertiary` | `#e2e0d8` | Row hover, input backgrounds |
| `background-elevated` | `#ffffff` | Modals, dropdowns (floating elements only) |
| `background-dark` | `#1a1917` | Dark mode base |

#### Accent — JW purple

| Token | Hex | Usage |
|---|---|---|
| `purple-50` | `#f0effe` | Subtle backgrounds, chip active fill |
| `purple-200` | `#c9c4f8` | Borders, chip active border |
| `purple-400` | `#7c6fe0` | Primary button hover |
| `purple-500` | `#5b4fcf` | Primary button normal, links, accent elements |
| `purple-700` | `#4338a8` | Primary button active/pressed |
| `purple-900` | `#2d2472` | Text on light purple backgrounds |

#### Semantic colors

| Token | Hex | Usage |
|---|---|---|
| `success` | `#1d9e75` | Saved confirmation, revisit counted |
| `warning` | `#ba7517` | Warnings, impact alerts |
| `danger` | `#e24b4a` | Delete actions, validation errors |
| `info` | `#378add` | Neutral information, links |

#### Text scale

| Token | Hex | Usage |
|---|---|---|
| `text-primary` | `#1a1a1a` | Main content |
| `text-secondary` | `#6b6a64` | Supporting content, labels |
| `text-tertiary` | `#9c9a92` | Placeholders, hints, timestamps |

#### Button states

| Type | Normal | Hover | Active | Disabled |
|---|---|---|---|---|
| Primary | `purple-500` bg, white text | `purple-400` bg | `purple-700` bg | `background-tertiary` bg, `text-tertiary` text |
| Secondary | transparent bg, `purple-500` border+text | `purple-50` bg | `purple-200` bg | transparent, gray border+text |
| Danger | `danger` bg, white text | lighter danger | darker danger | gray |
| Ghost | transparent, `text-secondary` | `background-tertiary` bg | `#d3d1c7` bg | transparent, `text-tertiary` |

#### Row states (example: studies list)

- **Active study:** full opacity, `success` color dot indicator
- **Paused study:** slightly muted text, `warning` color dot
- **Completed/archived:** 50% opacity, gray dot

### 5.3 Typography

**Font:** Inter (bundled — no external dependency at runtime)

| Role | Size | Weight |
|---|---|---|
| Page title | 20px | 500 |
| Section title | 16px | 500 |
| Body / form fields | 14px | 400 |
| Labels, secondary text | 13px | 400 |
| Captions, timestamps, hints | 12px | 400 |
| Monospace (paths, code) | 12px | 400 |

### 5.4 Spacing Scale (4px base)

| Token | Value | Usage |
|---|---|---|
| `xs` | 4px | Icon-to-label gap |
| `sm` | 8px | Chip/badge internal padding |
| `md` | 12px | Form field gap |
| `lg` | 16px | Card padding |
| `xl` | 24px | Section separation |
| `2xl` | 32px | Page padding |
| `3xl` | 48px | Major group separation |

### 5.5 Border Radius

| Element | Radius |
|---|---|
| Buttons | 8px |
| Inputs | 8px |
| Cards, panels | 12px |
| Modals | 16px |
| Badges, status pills | 20px (full pill) |
| Tooltips | 6px |
| Row indicators (dots) | 50% (circle) |

### 5.6 Shadows

Used only to indicate elevation — not decorative.

| Element | Shadow |
|---|---|
| Modals, drawers | `0 8px 32px rgba(0,0,0,0.12)` |
| Dropdowns, tooltips | `0 4px 16px rgba(0,0,0,0.08)` |
| Card on hover | `0 2px 8px rgba(0,0,0,0.06)` |
| Buttons, sidebar, headers | No shadow — use border `1px solid border-tertiary` |

### 5.7 Icons

Library: **Lucide React**
- Inline with text: 16px
- Navigation items: 20px
- Standalone action buttons: 24px max

No decorative illustrations. Empty states: single icon (gray, 48px) + heading + description + CTA button.

### 5.8 Navigation

**Desktop:** Collapsible left sidebar. Collapsed = icons only (48px wide). Expanded = icons + labels (200px). User can pin it open or closed. Main sections: Home/Dashboard, Persons, Ministry, Studies, Settings.

**Mobile:** Bottom navigation bar (same 5 sections). Sidebar is hidden on mobile.

**Floating action button (FAB):** Mobile only — bottom right corner, purple, contextual "+" action for the current section.

**Desktop primary action:** Placed in the page header, not floating.

**Breadcrumbs:** Shown only for 3+ levels of nesting (e.g., `Persons / María González / Bible Study / Session 3`). Plain text with `/` separator, no decorative elements.

**Back navigation:** Always available. Desktop: OS window back button + chevron in nested view headers. Mobile: native gesture + visible header button. Never rely on gesture alone.

### 5.9 Window Behavior (Desktop)

- **Minimum width:** 960px
- **Maximum content width:** 900px centered (sidebar + content)
- **Resizable:** Yes — content reflows within the max-width constraint
- **Close button (×):** Minimizes to system tray (not full quit). A tooltip explains this the first time it happens.
- **Tray menu:** Open, Finish preaching (if active session), Quit
- **Tray icon indicator:** Shows visual dot if a preaching session is active
- **Start with OS:** Optional, disabled by default, configurable in Settings
- **Minimized start:** If "start with OS" is enabled, app starts in tray without opening a window

### 5.10 Modals, Drawers, and Pages

| Pattern | When to use | Examples |
|---|---|---|
| **Modal** | Short action, no context needed, max 4-5 fields | Confirm delete, add note, onboarding steps, change status |
| **Drawer** (slides from right, ~420px, overlay) | Medium form, benefits from seeing context behind | Register visit, register study session, create study, edit person |
| **Full page** | Destination view, extensive content | Person profile, study view, dashboard, settings |

### 5.11 Forms

**Labels:** Always above inputs (not placeholders). Required fields have no indicator — optional fields are marked with "(optional)" in gray next to the label.

**Validation errors:** Always inline, below the specific field. Red text with a small red dot indicator. Multiple errors shown simultaneously on submit attempt. Never shown as toasts.

**Smart defaults:**

| Field | Default |
|---|---|
| `date` on visit, session | Today |
| `interest_status` on new person | `'interested'` |
| `study.status` on create | `'active'` |
| `entry_mode` on PC | `'manual'` |
| `counts_as_revisit` | Auto-calculated from `outcome` |
| `modality` | `'field'` |
| Time fields initialized with "now" | Current time, with nearest-5-min suggestion chips |

**Time picker:**
- `<input type="time">` with `step="300"` (5-minute increments via keyboard arrows)
- Suggestion chips showing 3-4 nearest multiples of 5 minutes (backward from current time)
- User can type any exact time regardless of step
- Start-time chips appear automatically when the current minute is not a multiple of 5

**Dual range slider (for time ranges):**
- Two draggable handles — left for start, right for end
- Moves in 5-minute steps
- Purple filled track between handles
- Complements (does not replace) the individual time inputs

**`outcome` field:** Rendered as unselected chips. No default. User must explicitly choose before form can be submitted.

**Checkbox "Finish preaching session too?"** (in F7): Unchecked by default.

**Autocompletions:**
- `publication` in study form: suggestions from user's existing study publications

**Help icons:** `(i)` icon (Lucide `Info`, 14px, `text-tertiary`) next to labels for non-obvious fields. Desktop: tooltip on hover. Mobile: popover on tap, closes on outside tap.

Fields that include help icons: `counts_as_revisit`, dashboard carry-over display, `entry_mode`, backup directory field, terms version in settings.

### 5.12 Notifications (Toasts)

- **Position:** Bottom-right corner
- **Duration:** 4 seconds, then slide-out animation
- **Types:** Success (green left border), Error (red), Warning (amber)
- **Dark background** (`#1a1917`) with light text — visible on both light and dark themes
- **Usage:** Confirmations of completed actions and global warnings only. Never for form validation errors.

### 5.13 Loading & Double-Click Prevention

- On any save/submit action: button is **immediately disabled** and shows an inline spinner replacing the label text.
- SQLite local operations are fast enough that loading state is typically invisible — but the disabled state prevents double submission regardless.
- No artificial loading delay.
- On failure: error shown inline, form returns to editable state, button re-enabled.
- Skeleton loaders (Phase 2): used for async Supabase calls, not for local SQLite.

### 5.14 Animations (Phase 1 only)

| Animation | Duration | Easing |
|---|---|---|
| Toast fade-in | 150ms | ease-out |
| Drawer slide-in from right | 200ms | ease-out |
| Button/row color transition on hover | 150ms | linear |
| Button spinner | continuous | linear |

All other animations (page transitions, micro-interactions) are Phase 2.

### 5.15 Disclaimer placement

- Onboarding screen (Step 1, below the welcome text)
- Settings → About section

Text: *"This application is independent and is not affiliated with, sponsored by, or approved by Jehovah's Witnesses or the Watch Tower Bible and Tract Society."*

---

## 6. Edge Cases & Business Rules

### Persons
- Soft duplicate name warning on create/edit — not a hard database constraint
- Geocoding failure on address entry: saves text address only, no error shown to user, coordinates remain null
- Person with active studies archived → studies set to `paused`
- Person restored from archive → studies remain `paused`, user reactivates manually

### Visits
- `outcome` is required — form cannot be submitted without selection
- `counts_as_revisit` is auto-calculated but overrideable
- `outcome = 'rejected'` → soft suggestion to update `interest_status`
- `outcome = 'completed'` + person has active study → soft suggestion to register as study session

### Studies
- Two simultaneous active studies for same person: allowed with informational warning
- Changing `publication` on existing study: informational note only, no block

### Study Sessions
- Overlapping time with another `study_session` on the same day: **hard block**, user must correct before saving
- `started_at`/`ended_at` outside parent `preaching_session` range: **hard block** with inline error
- Editing `preaching_session` end time to be earlier than a linked `study_session`: hard error "Adjust the study session time first"

### Preaching Sessions
- Active session across midnight: **blocking modal** on app open, must resolve before using app
- Options: set end time retroactively, or discard session
- App closed with active session: session remains open, backup is forced on close event
- Deleting a `preaching_session`: cascades to all linked `study_session` records, confirmation lists affected study names

### Dashboard
- First use (no data): friendly empty state with suggested first actions
- Carry-over minutes calculation: derived from all historical data, never stored as a field

### Onboarding
- Closed mid-flow: resumes from last incomplete step on next launch
- Terms step: always shown fully if not yet accepted

### Persons list
- Archived persons: hidden by default, toggle "Show archived" shows only archived (not mixed)

---

## 7. Backup & Data Safety

### System Backup (automatic, transparent)

- Location: Tauri `AppData` / `Application Support` / `.local/share` directory (OS-specific)
- Trigger: debounced — fires 30 seconds after last data change
- **On app close:** `on_close` event forces immediate backup regardless of debounce timer
- Rotating snapshots: last 5 kept, oldest deleted automatically
- Not user-configurable — always active
- Shown in Settings as: "System backup: active" with "Restore from system backup" option

### Personal Backup (user-configured)

- User selects a directory and optional filename prefix in Settings (also offered in onboarding Step 4)
- If directory not configured: only system backup is active. Soft reminder shown in Settings data section.
- **Trigger:** Same debounce as system backup (30 seconds after last change) + forced on app close
- **File structure:**
  - `jw-field-companion-backup.json` — always reflects latest state (overwritten)
  - `snapshots/jw-field-companion-[timestamp].json` — rotating history
- **Max snapshots:** User-configurable (3 / 7 / 14 / 30) — default 7
- On first directory configuration: immediate backup executed, user sees confirmation
- Status line in Settings: "Last backup: 3 minutes ago"

### Export

Available in Settings → Data:
- Export all data as JSON (full fidelity)
- Export as CSV (flattened, for spreadsheet use)
- Manual "Create backup now" button

---

## 8. Multi-Profile Support

Each profile on a PC is a separate SQLite database file. Physical separation guarantees no data leakage between profiles.

### Profile selection screen

Shown on app launch, before any PIN prompt. Displays existing profiles as cards (name + initials avatar). "Add profile" button creates a new one with its own onboarding flow.

### Switching profiles

Available from: system tray menu, sidebar footer ("Switch profile" link).
Switching returns to the profile selection screen.

### Per-profile settings

Each profile has its own:
- SQLite database file
- Backup directory configuration
- PIN (optional)
- Theme, language, and other `user_settings`

### PIN lock (desktop only)

- Optional 4-digit PIN per profile
- Requested on app open and on restore from tray
- Stored hashed locally
- No attempt limit in Phase 1 (basic protection against casual access)
- Not applicable on mobile (device lock is sufficient)

---

## 9. Localization & Settings

### i18n

- Implementation: `i18next` with JSON translation files per language
- Phase 1 languages: Spanish (neutral, default), English
- Language detection: OS language on first launch, pre-selected in onboarding
- Language change: immediate, no restart required

### Theme

- Options: Light, Dark, System (follows OS preference)
- Default: System
- Change: immediate

### Terms & Conditions

- Version tracked in `user_settings.terms_version_accepted`
- On new version: blocking modal on app open before any interaction
- Previous acceptance does not carry over to new version

---

## 10. Discarded Decisions

These were considered and explicitly rejected. Documented to prevent re-opening without new information.

| Decision | Rejected option | Reason |
|---|---|---|
| Hour tracking | `preaching_record` table to segment field vs study time | Derivable from timestamps; adds sync complexity with no reporting benefit |
| Session state | `status` field on `preaching_session` | `ended_at IS NULL` is sufficient; a `cancelled` state would just be a delete |
| Person deduplication | Hard unique constraint on `first_name + last_name` | Legitimate duplicates exist (different people, same name); soft UI warning is sufficient |
| Archive indicator | Separate `archive_status` field | `archived_at IS NOT NULL` is sufficient and carries more information |
| Carry-over storage | `carried_over_minutes` field in `user_settings` | Derivable from all historical session data; storing it creates sync risk |
| Type field | `type` on `preaching_record` | Table was removed entirely |
| Bulk actions | Multi-select for persons/visits/sessions | Use cases are rare; complexity not justified for Phase 1 or beyond |
| Single SQLite for all profiles | `user_id` column on all tables | Physical file separation is simpler and safer for personal data |

---

## 11. Future Phases

### Phase 2

**Sync & Auth**
- Supabase Auth: email/password + Google sign-in
- Offline-first sync: SQLite local → Supabase PostgreSQL
- Mobile app via Capacitor (same React codebase)
- `auto_sync` toggle in Settings

**UI/UX**
- Full animation system (page transitions, micro-interactions)
- Adjustable font size for visual accessibility
- Lazy-load panel in `preaching_session` view showing linked visits and studies

**Features**
- `study_appointment` table: dual-purpose planning and cancellation tracking
  - Future date → shown as scheduled appointment with calendar view
  - Past date (planned but cancelled) → cancellation record with reason
  - Past date (completed) → links to the resulting `study_session`
  - Status: `scheduled` | `completed` | `cancelled`
  - Field: `cancellation_reason` (nullable text)
- Simple pattern detection (no AI): percentage of cancelled sessions per person, shown as a visual indicator on the person profile. **Note:** Display carefully to avoid incorrectly judging a person's interest level.
- Smart suggestions on home screen: "You haven't visited [Name] in over 2 weeks" with clickable person references. Non-intrusive dismissible cards.
- Overlap validation between `preaching_session` records

### Phase 3

**Map & Territory**
- View persons on a map to plan outings
- Group persons by geographic area
- Generate a visit list for a planned outing

**Analytics & Intelligence**
- Timeline visual per person showing visits and studies over time (with `study_appointment` gaps differentiated from cancelled sessions)
- Cross-profile analytics using SQLite `ATTACH DATABASE`
- Smart search: global search across all entities, search history with configurable limit
- AI-powered predictive autocomplete in notes (inline suggestion, Tab to accept) — **disableable in Settings**
- In-app feedback submission
- Automatic app updates
- High contrast mode

### Phase 4

**Accessibility**
- Full keyboard-only navigation

**AI Features**
- Note summarization: "Summarize" button in person notes section, useful when many notes have accumulated
- Pre-visit briefing panel: AI-generated summary before registering a visit — last study topic, note highlights, time since last visit, publication suggestion. Generated from local data.

**Analytics**
- Cross-profile analytics (Phase 3 moved here if complexity warrants)

---

*Last updated: see Git history*
*All diagrams (ERD, user flow charts) are maintained as image assets in `/docs/diagrams/`*
