# Employer Dashboard v1.5 — Trend Enrichments

**Status:** Design accepted 2026-04-29
**Scope:** Add four new sections to `/employer` (Hiring funnel, Applications-over-time area chart, Roles-by-family, Date-range filter), all driven by a shared `?range=` URL state. No new domain features — all data comes from existing `applications`, `jobListings`, and `applicationStatusEnum`.
**Out of scope (defer for later phases):** AI shortlist, interview scheduling, offer artifact and acceptance tracking, time-to-hire metric, source attribution on applications, boost credits, job expiry/closing dates, talent search queries, messages, geography breakdown (`profiles.location` is freeform text — needs structured location data first), per-job sparklines, sub-nav bar, plan-quota seats-used row, time-of-day greeting variant.

---

## 1. Goal

The current `/employer` dashboard (shipped 2026-04-29) answers two questions: "what needs my attention?" (Inbox / Stale alerts) and "is everything OK?" (KPI strip / Pipeline / Plan). It does not yet show **trends** — how the org's pipeline is moving over time. v1.5 adds the trend layer:

- A **hiring funnel** so the user sees stage-to-stage conversion at a glance.
- An **applications-over-time area chart** so the user sees the volume trend.
- A **roles-by-family bar list** so the user sees which sectors drive their pipeline.
- A **date-range filter** that scopes all three new sections plus the existing KPI strip.

The richer Claude AI design that inspired this slice has many more features (AI shortlist, interviews, offers, source mix, geography). Those each need new domain features built first and are intentionally out of scope.

## 2. Page layout (after the changes)

```
┌─────────────────────────────────────────────────────────────────┐
│ Header: "Welcome back, {orgName}"   [date-range pills]  [+ Post]│  ← pills are NEW
├─────────────────────────────────────────────────────────────────┤
│ KPI strip (4 tiles, now driven by selected range)                │
├─────────────────────────────────────────────────────────────────┤
│ Hiring funnel (full width, NEW)                                  │
│  Applied · Review · Interview · Offer  +  "Rejected: N" pill     │
├──────────────────────────────────┬──────────────────────────────┤
│ Inbox queue                      │ Stale alerts                 │
├──────────────────────────────────┴──────────────────────────────┤
│ Applications over time (NEW)                                     │
│  Two-line area chart: Applications + Reviewed-or-deeper          │
├─────────────────────────────────────────────────────────────────┤
│ Pipeline by job (existing table, unchanged)                      │
├──────────────────────────────────┬──────────────────────────────┤
│ Roles by family (NEW)            │ Plan & quota                  │
│ Sector bars w/ counts             │ (unchanged)                   │
├─────────────────────────────────────────────────────────────────┤
│ Recent activity (full width, unchanged)                          │
└─────────────────────────────────────────────────────────────────┘
```

Insertion points relative to v1: funnel goes after KPI strip, area chart between Inbox/Stale row and Pipeline, Roles-by-family becomes the left column of the previously single-column "Plan & quota" row.

## 3. Date-range filter (`?range=`)

**URL state via search param.** Values: `7d` | `30d` | `90d` | `all`. Default: `30d`. Invalid values fall back to default.

**Pills component (`_components/range-pills.tsx`)** — the only new client component (`"use client"` required for `useRouter` + `useSearchParams`). Renders four pill buttons; clicking pushes a navigation that updates `?range=`. The active pill has the brand-blue background.

**Sections that respect the range:**
- KPI strip (KPI procedure refactored to accept `range`)
- Hiring funnel (new procedure)
- Applications-over-time area chart (new procedure)
- Roles-by-family (new procedure)

**Sections that do NOT respect the range** (intentional — they answer "current state" questions, not "trend" questions):
- Inbox queue
- Stale alerts
- Pipeline-by-job
- Plan & quota
- Recent activity

The user is told this implicitly by the layout — sections inside the "trend zone" sit near the pills.

## 4. Data layer

No schema changes. Three new tRPC procedures + one refactored procedure.

### 4.1 Refactor: `employer.getKpis(range?)`

Accept an optional `range` input:

```ts
.input(z.object({ range: z.enum(["7d","30d","90d","all"]).default("30d") }))
```

The existing `applicants30d` field is renamed to `applicantsInRange` for honesty. Spot-check via grep: only `_components/kpi-strip.tsx` and the page reference these fields, so a one-pass rename is safe. The KPI tile labels also update: "Applicants" subtitle becomes the active range (e.g. "Last 7 days" / "Last 30 days" / "Last 90 days" / "All time").

`profileViews30d` similarly becomes `profileViewsInRange`. Update the existing `countEmployerOrgViews30d` helper at `src/server/services/profile-views.ts` to take a range — or add a sibling helper. (Implementation detail for the plan, not the spec.)

### 4.2 New: `employer.getFunnel(range)`

```ts
input:  z.object({ range: z.enum(["7d","30d","90d","all"]).default("30d") })
output: {
  stages: [
    { key: "applied",   label: "Applied",   count: number, pctOfPrev: number | null },
    { key: "review",    label: "Review",    count: number, pctOfPrev: number },
    { key: "interview", label: "Interview", count: number, pctOfPrev: number },
    { key: "offer",     label: "Offer",     count: number, pctOfPrev: number },
  ],
  rejectedCount: number,
  totalApplications: number,
}
```

**Stage definitions (cumulative — "reached this stage or beyond"):**
- `applied` = all applications in the range (every status counts).
- `review` = applications whose current status is `reviewed`, `interview`, or `offer` (i.e. moved past initial submission).
- `interview` = applications whose current status is `interview` or `offer`.
- `offer` = applications whose current status is `offer`.
- `rejectedCount` = applications whose current status is `rejected`. Reported as a side number, not a funnel stage.

Cumulative counts give monotonically-decreasing bars (the funnel shape). Snapshot of *current* status of applications created in the range — not an audit log.

`pctOfPrev` is the conversion percentage from the prior stage. The first stage's `pctOfPrev` is `null`.

Single SQL query: `select status, count(*) … where applications.createdAt >= cutoff AND jobListings.orgId = orgId group by status`. Cumulative roll-up done in JS.

**Range → cutoff mapping** (used by all four procedures that accept `range`):
- `"7d"` → `now() - interval '7 days'`
- `"30d"` → `now() - interval '30 days'`
- `"90d"` → `now() - interval '90 days'`
- `"all"` → no `createdAt` filter applied (all rows for the org)

A small helper `rangeToCutoff(range): Date | null` lives at `src/lib/range.ts`. Returns `null` for `"all"` so the caller can skip the predicate.

### 4.3 New: `employer.getApplicationsTimeseries(range)`

```ts
input:  z.object({ range: z.enum(["7d","30d","90d","all"]).default("30d") })
output: {
  buckets: Array<{ at: Date, applications: number, reviewedOrDeeper: number }>,
  granularity: "day" | "week" | "month",
}
```

**Bucketing rule:**
- `7d` and `30d` → daily buckets
- `90d` → weekly buckets (Mon-anchored)
- `all` → monthly buckets

`reviewedOrDeeper` is the count of applications in `(reviewed | interview | offer)`. (Mirrors the design's "Applied + Shortlisted" two-line layout.)

Implementation: one SQL query with `date_trunc('day' | 'week' | 'month', applications.createdAt)` as the bucket key and two conditional counts:
```sql
count(*) as applications,
count(*) filter (where status in ('reviewed','interview','offer')) as reviewedOrDeeper
```
Buckets with zero rows must still appear in the output (front-fill in JS by walking the range and filling missing dates with zeros) so the chart's x-axis doesn't have gaps.

### 4.4 New: `employer.getApplicantsBySector(range)`

```ts
input:  z.object({ range: z.enum(["7d","30d","90d","all"]).default("30d") })
output: Array<{
  sector: JobSector
  label: string
  count: number
  pct: number  // 0-100, share of total
}>
```

`label` from the existing `SECTOR_LABELS` map at `src/lib/jobs-options.ts`. Sorted by `count` descending. Excludes `"other"` from the headline list if its count is 0; otherwise it appears at the bottom. Sectors with zero applications in the range are omitted entirely (UI shows only sectors with activity).

Single SQL: `select jobListings.sector, count(*) … group by sector`. `pct` computed in JS from the total.

## 5. New components

```
src/app/(app)/employer/_components/
├── range-pills.tsx              # client component, the date-range filter
├── hiring-funnel.tsx            # async RSC, calls getFunnel
├── applications-chart.tsx       # async RSC, calls getApplicationsTimeseries; renders SVG
└── roles-by-family.tsx          # async RSC, calls getApplicantsBySector
```

Plus a small **shared chart-rendering helper** at `src/app/(app)/employer/_components/charts/area-chart.tsx` containing the SVG area-chart primitive. Same file pattern as the design's `AreaChart` helper but ported to Lato + brand-blue palette. The funnel and bars don't need shared helpers — they're cheap inline.

The page (`src/app/(app)/employer/page.tsx`) is updated to:
1. Read `searchParams.range`, validate, default to `30d`.
2. Pass `range` to the four section components that need it (KPI strip, funnel, area chart, roles-by-family).
3. Render `<RangePills active={range} />` in the header next to the "Post a job" button.
4. Insert the three new sections at the spec's layout positions.

## 6. Brand translation rules (mandatory)

The Claude AI design uses lime green, coral, lilac, sky, Geist + Instrument Serif + JetBrains Mono. None of those ship.

- **Single accent color:** `#1CAAE2` (brand blue, exposed as `--v2-accent`). For places the design uses a second accent (e.g., the "Shortlisted" line vs. "Applied" line, alternating sector bars), use `#004984` (`--v2-accent-deep`) or graduated opacity of `#1CAAE2`.
- **Funnel bars:** background fills go from `--v2-accent` at full opacity (Stage 1) → `--v2-accent` at ~30% (Stage 4). Each bar height is proportional to `count / max`.
- **Area chart:** two strokes — `#1CAAE2` solid for Applications, `#004984` dashed (`stroke-dasharray="4 3"`) for Reviewed-or-deeper. Fills are the matching strokes at ~18% / ~12% opacity respectively. Gridlines are neutral `#E4E7EE`. Axis labels use Lato `tabular-nums` at small size, **not** JetBrains Mono.
- **Sector bars:** brand blue fills with stepped opacity (100% / 80% / 60% / 40% / 25%) so the visual hierarchy reads cleanly.
- **Italic flourishes** ("Pipeline *velocity*", "Hiring *funnel*") use Lato Italic (already loaded), not serif.
- **No `bg-[#XXX]` Tailwind literals** anywhere new. Use `bg-[var(--v2-accent)]` / `text-[var(--v2-accent)]` for arbitrary uses, or the existing `v2-btn v2-btn-accent` class for primary CTAs.

## 7. Empty / loading / error states

- **Funnel:** zero applications → render the four stage bars at 0 with the empty-state copy "No applications in this range — try widening the date range."
- **Applications chart:** zero applications → render the empty grid with placeholder text "No applications yet."
- **Roles-by-family:** zero applications → "No applications to break down."
- **Range pills:** always render. Clicking the active pill is a no-op.
- **Loading:** each new section is wrapped in `<Suspense>` with a per-card skeleton (gray pulse blocks shaped like the section). The page-level `loading.tsx` is updated to add two new skeleton blocks (funnel-shaped + chart-shaped).
- **Error:** if a section's query throws, an inline error card replaces the section. The rest of the page renders normally.

## 8. Testing

Deferred to a follow-up step. Test inventory to add when the test infrastructure is set up:

- **Vitest unit tests** for the three new procedures + the refactored `getKpis`. Specific assertions:
  - `getFunnel`: cumulative counts are monotonically decreasing across stages; `pctOfPrev` correctly computed; `rejectedCount` is independent of stage counts; range filter excludes out-of-range rows.
  - `getApplicationsTimeseries`: front-fill produces buckets even for empty days; granularity matches the range; both count fields aggregate correctly.
  - `getApplicantsBySector`: pct sums to ~100% (within rounding); zero-count sectors are omitted; `other` placement is bottom.
  - `getKpis`: the renamed fields (`applicantsInRange` / `profileViewsInRange`) populate correctly across all four range values.
- **Playwright visual snapshot** of `/employer?range=30d` and `/employer?range=7d` for an org with seeded data — checks both the pill state and the section content shifts.
- **URL-state behavior test:** clicking a pill updates the URL and re-renders the trend sections without affecting the action sections.

## 9. Build order

1. Validate-and-default `?range=` in `page.tsx`.
2. Build `RangePills` client component.
3. Refactor `getKpis` to accept `range` (rename fields, update the KPI strip component).
4. Build the shared SVG `area-chart.tsx` primitive.
5. Build `getFunnel` procedure + `HiringFunnel` component, wire into page.
6. Build `getApplicationsTimeseries` procedure + `ApplicationsChart` component, wire into page.
7. Build `getApplicantsBySector` procedure + `RolesByFamily` component, wire into page.
8. Update `loading.tsx` to add two new skeleton blocks.
9. Tests (§8).
