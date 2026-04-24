# Employer — New Job (Phase 4)

**Status:** Design accepted 2026-04-24
**Scope:** Rich job posting creation + editing + list surface on the employer profile, autosaved drafts, publish/close/reopen lifecycle.
**Out of scope (later phases):** applicant pipeline, candidate matching on a job, public `/jobs` browse redesign, boost credits, AI-assisted posting copy.

---

## 1. Goal

Let a verified employer post a role in under five minutes from inside `/employer/profile`. The form must capture the energy-specific signals that make Energized useful (sector, rotation, tickets) without feeling like a government form. Drafts must be safe from accidental tab-close.

## 2. User flow

1. Employer clicks the sidebar **New job** button on `/employer/profile` (currently disabled with a "Phase 4" tooltip).
2. Route hits `/employer/jobs/new` — a thin server action that calls `jobs.createDraft`, then redirects to `/employer/jobs/[id]/edit?step=1`.
3. Four-step wizard with autosave (see §5).
4. Final step offers **Save draft & exit** or **Publish**. Publish runs server-side validation; any missing required field surfaces as an inline error and focuses the first missing field.
5. On success, redirect back to `/employer/profile#ep-jobs` with the new job shown at the top of the list.

## 3. Data model

New file: `src/server/db/schema/job-listings.ts`. Re-exported from `schema/index.ts`.

### Enums (append to `schema/enums.ts`)

```ts
export const jobStatusEnum = pgEnum("job_status", [
  "draft",
  "published",
  "closed",
]);

export const experienceLevelEnum = pgEnum("experience_level", [
  "entry",
  "intermediate",
  "senior",
  "lead",
  "executive",
]);
```

### Table

```ts
export const jobListings = pgTable("job_listings", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => employerOrgs.id, { onDelete: "cascade" }),
  createdByUserId: text("created_by_user_id").notNull().references(() => user.id),

  // basics
  title: text("title"),
  sector: sectorEnum("sector"),
  subSectors: text("sub_sectors").array().notNull().default([]),
  experienceLevel: experienceLevelEnum("experience_level"),

  // location & schedule
  location: text("location"),
  workSetup: workSetupEnum("work_setup"),
  rotationSchedule: text("rotation_schedule"),     // "14/7" | "20/8" | "7/7" | null
  hoursPerWeek: integer("hours_per_week"),

  // compensation & requirements
  salaryMin: integer("salary_min"),
  salaryMax: integer("salary_max"),
  salaryCurrency: text("salary_currency").default("CAD"),
  salaryPeriod: text("salary_period").default("year"),  // year | hour | day
  requiredCertifications: text("required_certifications").array().notNull().default([]),
  screeningQuestions: jsonb("screening_questions")
    .$type<{ q: string; required: boolean }[]>()
    .notNull()
    .default([]),

  // story
  summary: text("summary"),
  description: text("description"),

  // lifecycle
  status: jobStatusEnum("status").notNull().default("draft"),
  publishedAt: timestamp("published_at"),
  closedAt: timestamp("closed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
});
```

All fields except `orgId` and `createdByUserId` are nullable/defaulted so drafts can save at any point.

Indexes: `(orgId, status, createdAt desc)` for list queries, `(status, publishedAt desc)` for the future public `/jobs` browse.

### State machine

```
draft → published (via jobs.publish, requires validation)
published → closed (via jobs.close)
closed → published (via jobs.reopen)
draft → (deleted) (via jobs.deleteDraft)
published/closed → NEVER deleted
```

## 4. tRPC router

New file: `src/server/api/routers/jobs.ts`. Wired into `root.ts`.

All procedures are org-scoped via the existing `findMyOrg` helper pattern from `employer.ts`. Role guards use the org member's role: `owner`, `admin`, `recruiter`, `hiring_manager` can create/edit. `viewer` cannot — throws `FORBIDDEN`. Owner/admin can close/reopen/delete; recruiters and hiring managers can edit but not close.

| Procedure | Kind | Purpose |
|---|---|---|
| `jobs.listForOrg` | query | All jobs for my org, newest first. Returns enough for the list card. |
| `jobs.getById` | query | Org-guarded fetch for the edit wizard. |
| `jobs.createDraft` | mutation | Inserts empty draft, returns `{ id }`. |
| `jobs.updateDraft` | mutation | Partial patch of any field. No-op if status != draft. |
| `jobs.publish` | mutation | Validates required fields, sets `status=published`, `publishedAt=now()`. |
| `jobs.close` | mutation | `status=closed`, `closedAt=now()`. |
| `jobs.reopen` | mutation | `status=published`, clears `closedAt`. |
| `jobs.deleteDraft` | mutation | Delete if and only if `status=draft`. |
| `jobs.duplicate` | mutation | Creates a new draft with the source's fields, returns `{ id }`. |
| `jobs.getPublic` | public query | Read-only view of `published` jobs for the future public route. |

### Publish validation (Zod, server-side)

Required: `title` (≥ 3), `sector`, `location` (≥ 2), `workSetup`, `experienceLevel`, `description` (100–4000 chars). Must have at least one of `salaryMin` / `salaryMax`; if both present, `salaryMin ≤ salaryMax`.

On failure, the server returns `{ missingFields: string[] }` in the `TRPCError.cause`; the client uses it to highlight and focus.

## 5. Autosave

- On wizard mount (after `createDraft` or when loading existing draft), form state hydrates from the server row.
- `useDebouncedEffect` (600 ms) on any field change → `updateDraft`. Pending saves are flushed synchronously when the user clicks **Next**, **Back**, or **Save draft & exit**.
- A compact saved indicator in the wizard header mirrors the profile page's `.ob-save-state` pattern — "Saving…" / "All changes saved".
- If `updateDraft` ever fails, show a single dismissable error strip; don't block typing.

## 6. UI

### Design language

Inherits the established `v2-*` + `ob-*` + `pp-*` classes. No new global CSS — local classes scoped under `.v2` shell only where needed. Typography: Lato Black italic for H1, Lato Regular for body, Lato Bold uppercase + `0.08em` tracking for eyebrows. Color discipline: primary blue `#1CAAE2`, deep blue `#004984`, coral reserved for Closed / destructive states, ink grays for text. No green.

### Wizard layout

```
┌─────────────────────────────────────────────────────────┐
│  [Brand]  Job / Edit                   • All changes saved │
│                                                            │
│  ●━━━━━○──○──○         STEP 02 · WHERE & HOW             │
│                                                            │
│  Where is this work?                   (Lato black italic) │
│  A short sub-line in ink-500.                              │
│                                                            │
│  [form fields…]                                            │
│                                                            │
├─────────────────────────────────────────────────────────┤
│  [← Back]                          [Save & exit] [Next →] │
└─────────────────────────────────────────────────────────┘
```

### Step 1 — Role basics

- **Job title** — `.v2-input-block`, placeholder "e.g. Senior Controls Engineer".
- **Sector** — `.v2-filter-chips`, single-select, pre-selected from org's `primarySector`.
- **Sub-sectors** — `.v2-filter-chips`, multi-select up to 4. Options seeded from `SUB_SECTOR_OPTIONS` (same list used on the profile).
- **Experience level** — `.v2-filter-chips`, single-select across the enum.

### Step 2 — Where & how

- **Location** — `.v2-input-block`, placeholder "Calgary, AB" or "Remote — Canada".
- **Work setup** — `.v2-filter-chips` (single), options match `workSetupEnum`.
- **Rotation schedule** — shown only if `workSetup ∈ { onsite, hybrid_preferred }`. Chips: `None`, `14/7`, `20/8`, `7/7`, `Custom…` (opens a small text input).
- **Hours per week** — segmented control: 20 / 30 / 40 / 44+.

### Step 3 — Pay & requirements

- **Salary** — two number inputs side-by-side (min / max) + currency select (CAD / USD) + period select (year / hour / day). Show a small reassurance line: "Jobseekers see a range, not your margin."
- **Required certifications** — `.v2-filter-chips`, multi-select, same list as the profile's `certifications` domain: H2S Alive, First Aid, CSTS, Red Seal, P.Eng, NACE, Fall Protection. An "Other" chip opens a small free-text input that appends to the array.
- **Screening questions** — list of rows. Each row: text input + "Required" toggle + trash icon. `+ Add question` button below. Max 8.

### Step 4 — Story

- **Summary** — `.v2-input-block`, 200-char limit, with live char count. Shown as the list-card subtitle.
- **Description** — textarea, 100–4000 chars, char count, no rich text formatting in this pass (plain text, we render with `whitespace-pre-wrap`).
- **Live preview** — a `JobCard`-shaped preview tile to the right on ≥ lg, below on smaller widths. Uses the same future `JobCard` primitive so WYSIWYG is real.
- **Footer** — left: `← Back` · right: `Save draft & exit` (v2-btn-ghost) · `Publish` (v2-btn-primary, black pill).

### Publish errors

If the server returns `missingFields`, the wizard jumps to the earliest step containing a missing field, scrolls to the first missing input, highlights with `.v2-input-block--error` (red-ish border using existing coral token), and shows an inline error strip above the footer listing each missing field.

## 7. Jobs list on the profile

Replace `JobsPlaceholder` in `employer-profile-client.tsx`. Keep the same `pp-section` shell + `id="ep-jobs"` so the sidebar nav still jumps to it.

### Header

```
Open roles                              [+ New job]
3 published · 1 draft
```

### Card

Reuses the existing `.pp-section` card tokens — no new primitive.

```
┌─────────────────────────────────────────────────────────┐
│  Senior Controls Engineer         [Renewables] [Published]│
│  Calgary, AB · Hybrid preferred · Posted 2 days ago        │
│                                                            │
│  [Edit] [Preview] [Close] [Duplicate]                     │
└─────────────────────────────────────────────────────────┘
```

- Status badge: Published → `v2-chip-accent`, Draft → `v2-chip-outline`, Closed → `v2-chip-coral`.
- Draft cards show `[Resume editing]` instead of Edit / Preview and a `[Delete draft]` action.
- Closed cards show `[Reopen]` instead of Close.
- Empty state: same `briefcase` icon composition as today, but the button is live.

### Sidebar CTA

Existing `.pp-side-cta` markup: drop the `disabled` + `"Coming in Phase 4"` title, wire `onClick` to `router.push("/employer/jobs/new")`.

## 8. Permissions matrix

| Action | owner | admin | recruiter | hiring_manager | viewer |
|---|---|---|---|---|---|
| createDraft / updateDraft | ✅ | ✅ | ✅ | ✅ | ❌ |
| publish | ✅ | ✅ | ✅ | ✅ | ❌ |
| close / reopen | ✅ | ✅ | ❌ | ❌ | ❌ |
| deleteDraft | ✅ | ✅ | ✅ (own) | ✅ (own) | ❌ |
| duplicate | ✅ | ✅ | ✅ | ✅ | ❌ |
| list / getById | ✅ | ✅ | ✅ | ✅ | ✅ (read-only) |

Every `publish` call requires the org's `verified=true` (not just the first time). If not, publish returns a specific error pointing back to `/employer/verify-domain`. Draft creation and editing are always allowed regardless of verification state.

## 9. Analytics (PostHog)

Events:
- `job.draft.created` — `{ orgId, jobId }`
- `job.draft.updated` — `{ orgId, jobId, fieldsChanged: string[] }` (debounced, emit once per settled save)
- `job.published` — `{ orgId, jobId, sector, experienceLevel, salaryMin, salaryMax }`
- `job.closed` — `{ orgId, jobId, daysOpen }`
- `job.reopened` — `{ orgId, jobId }`
- `job.wizard.step_viewed` — `{ orgId, jobId, step }`

Register these in `src/lib/analytics-events.ts` (or create it if it doesn't exist yet) alongside existing names.

## 10. Error handling

- All procedures throw `TRPCError` with precise codes: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `BAD_REQUEST`.
- The client wizard catches mutation errors and surfaces them in an inline strip — never a toast that disappears. Users should be able to re-read the reason.
- Autosave failures: show a single persistent warning; disable **Publish** until the last save succeeds.

## 11. Testing

- **Unit (Vitest):** Zod schemas for each wizard step, the publish validator, the state-machine transitions in the router.
- **Integration (Vitest w/ test Neon branch):** `createDraft` → `updateDraft` → `publish` happy path; `publish` from non-verified org; `deleteDraft` on a published row (must fail); role-based guards for each mutation.
- **E2E (Playwright):** full wizard flow end-to-end, accidental-close → reload (draft persisted), close → reopen, duplicate → new draft.
- **Visual (Playwright `toHaveScreenshot`):** one screenshot per wizard step at 1440 × 900, one screenshot of the Jobs list with three states (Published / Draft / Closed).

## 12. Files touched

**New**
- `src/server/db/schema/job-listings.ts`
- `src/server/db/migrations/00xx_job_listings.sql` (generated)
- `src/server/api/routers/jobs.ts`
- `src/app/(app)/employer/jobs/new/page.tsx` (server action + redirect)
- `src/app/(app)/employer/jobs/[id]/edit/page.tsx`
- `src/app/(app)/employer/jobs/[id]/edit/job-wizard-client.tsx`
- `src/app/(app)/employer/jobs/[id]/preview/page.tsx`
- `src/components/jobs/job-card.tsx` (shared with future public browse)
- `src/components/jobs/job-list-card.tsx` (the employer-side action row variant)
- `src/lib/analytics-events.ts` (if missing)
- E2E: `e2e/employer-new-job.spec.ts`
- Vitest: `src/server/api/routers/jobs.test.ts`

**Modified**
- `src/server/db/schema/enums.ts` — append `jobStatusEnum`, `experienceLevelEnum`
- `src/server/db/schema/index.ts` — re-export job-listings
- `src/server/api/root.ts` — register `jobsRouter`
- `src/app/(app)/employer/profile/employer-profile-client.tsx` — replace `JobsPlaceholder`, wire sidebar CTA

## 13. Non-goals explicit

- No applicant model, no pipeline, no candidate view on the job.
- No public `/jobs/:id` route wiring beyond the preview route (we keep preview org-scoped for now).
- No AI posting assistant (Phase 7).
- No boost credits / featured placement.
- No rich-text editor (plain text description, render with `whitespace-pre-wrap`).

## 14. Rollout

Behind a PostHog feature flag `employer.new-job` defaulted to `true` for internal emails, then flipped on for all verified employers once E2E passes. The flag gates only the sidebar CTA + the profile's list section; if a user hits the route directly while the flag is off we still honor it (so we can share preview links with beta employers).
