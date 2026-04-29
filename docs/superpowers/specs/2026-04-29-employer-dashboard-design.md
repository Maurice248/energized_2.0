# Employer Dashboard

**Status:** Design accepted 2026-04-29
**Scope:** A dashboard surface for employers that combines an action-oriented top half ("what do I do next") with an org-health bottom half ("is everything OK"). Lives at `/employer` (the employer area's root, currently unrouted).
**Out of scope (later phases):** profile-views-over-time chart, team activity / who-did-what feed, interview scheduling reminders, weekly digest email, candidate search shortcut surface.

---

## 1. Goal

Give employers a single landing page that answers two questions on arrival: "what needs my attention right now?" and "is everything OK across our open roles?" Today, employers redirect to `/employer/profile` (the org settings page) — useful for billing, useless as a daily start point. With multiple open jobs, an employer currently has to click into each one to see what's moving. The dashboard collapses that into one screen.

The same page serves both an owner/admin who cares about org-level health and a recruiter/hiring manager who cares about today's pipeline. Action items go on top so the recruiter case is fast; org health sits below so the owner case is scannable.

## 2. Routing

The dashboard lives at **`/employer`** — the previously unrouted root of the employer area. Subsections (`/employer/jobs`, `/employer/profile`, `/employer/onboarding`) keep their current paths.

Three redirect targets to migrate:

- `src/app/(app)/dashboard/page.tsx` — the existing employer fall-through redirect changes from `/employer/profile` to `/employer`.
- `src/app/(app)/employer/onboarding/employer-onboarding-client.tsx` — post-onboarding redirect changes from `/employer/profile` to `/employer`.
- The authenticated header "Dashboard" link — for `session.user.role === "employer"`, points to `/employer`.

Auth/role guards on the page:

- Not authenticated → redirected by `(app)/layout.tsx`.
- Authenticated but not an employer → redirect to `/dashboard`.
- Employer with no org → redirect to `/employer/onboarding`.

## 3. Page layout

```
┌─────────────────────────────────────────────────────────────────┐
│ Header: "Welcome back, {orgName}"   ·   [+ Post a job] CTA      │
├─────────────────────────────────────────────────────────────────┤
│ KPI strip — 4 tiles in a row                                    │
│ [Open roles] [Applicants 30d] [Profile views 30d] [Total apps]  │
├──────────────────────────────────┬──────────────────────────────┤
│ Inbox queue                      │ Stale alerts                 │
│ "X new applicants need review"   │ • 2 applicants stuck >7d     │
│ rows: name · job · timeAgo       │ • 1 job live 14d+, no apps   │
│ → "View N more" link             │ each row → deep-linked CTA   │
├──────────────────────────────────┴──────────────────────────────┤
│ Pipeline by job (table)                                         │
│ Job title · Applied · Review · Interview · Offer · → [View]     │
├──────────────────────────────────┬──────────────────────────────┤
│ Plan & quota                     │ Recent activity              │
│ Plan: Growth · 7/10 posts used   │ • Sarah moved to Interview   │
│ [Manage billing]                 │ • Pipeline Tech I published  │
│                                  │ • Jamie joined as recruiter  │
└─────────────────────────────────────────────────────────────────┘
```

Single column on mobile, two-column from `md:` for the side-by-side rows. Reuses `Card`, `Badge`, `Button` from `components/ui`. Brand styling: Lato Black headings, `#1CAAE2` for primary CTAs.

## 4. File layout

```
src/app/(app)/employer/
├── page.tsx                          # the dashboard RSC (layout shell, ~50 lines)
├── loading.tsx                       # skeleton shell
└── _components/
    ├── kpi-strip.tsx                 # pure render, no async
    ├── inbox-queue.tsx               # async RSC, suspense-streamed
    ├── stale-alerts.tsx              # async RSC, suspense-streamed
    ├── pipeline-by-job.tsx           # async RSC, suspense-streamed
    ├── plan-quota-card.tsx           # async RSC, fast (existing billing query)
    └── recent-activity.tsx           # async RSC, suspense-streamed
```

The `_components/` underscore prefix is the App Router convention for private folders so they're not routable. Each section being its own file keeps `page.tsx` to a layout shell, in contrast to the ~400-line `dashboard/page.tsx` we already have for jobseekers — that file is too large and we don't want to repeat the pattern.

## 5. Data layer

No schema changes. Four new tRPC procedures on `employerRouter`. All `protectedProcedure`, all resolve `orgId` via the existing `findMyOrg(ctx)` helper.

Reused (no changes):

- `employer.getKpis` — returns `{ openRoles, applicants30d, applicantsTotal, profileViews30d }`.
- `billing.getCurrent` — for plan name, posts-used-of-limit, billing portal link.

### `employer.getInboxQueue`

```ts
input:  z.object({ limit: z.number().int().min(1).max(20).default(5) })
output: {
  items: Array<{
    applicationId: string
    jobId: string
    jobTitle: string
    candidateId: string
    candidateName: string
    candidateHeadline: string | null
    appliedAt: Date
  }>
  totalCount: number  // for the "View N more" link
}
```

Query: `applications` joined to `jobListings`, `profiles`, `user`, filtered to `jobListings.orgId = orgId AND applications.status = 'submitted'`, ordered by `applications.createdAt DESC`, limited. `totalCount` from a separate cheap `count(*)` on the same filter.

### `employer.getStaleAlerts`

```ts
output: {
  staleApplicants: Array<{
    applicationId: string
    jobId: string
    jobTitle: string
    candidateName: string
    daysSinceUpdate: number
  }>
  coldJobs: Array<{
    jobId: string
    jobTitle: string
    daysSincePosted: number
  }>
}
```

`staleApplicants`: `applications.status IN ('submitted','reviewed') AND applications.updatedAt < now() - interval '7 days'`, joined for display fields, limit 10.

`coldJobs`: jobs that are still published, were posted at least 14 days ago, and have *zero* applications ever. SQL: `jobListings.status = 'published' AND jobListings.publishedAt < now() - interval '14 days' AND` no `applications` row exists for that `jobId` (`LEFT JOIN ... WHERE applications.id IS NULL`). Limit 10. (Intentionally not "0 apps in the last 14 days" — a job that used to get traffic but cooled off is a different signal we're not surfacing in v1.)

### `employer.getPipelineByJob`

```ts
output: Array<{
  jobId: string
  jobTitle: string
  counts: {
    applied: number
    review: number
    interview: number
    offer: number
    rejected: number
  }
  totalApplicants: number
}>
```

Single grouped query: `select jobId, status, count(*) … group by jobId, status` joined to `jobListings` for titles. Restricted to `jobListings.status = 'published'`. Pivot to per-stage counts in the resolver, not in SQL — keeps the query readable. Empty pipeline counts default to `0`.

The DB stage names map to the dashboard's stage labels via the same mapping already used in the jobseeker dashboard (`STAGE_FROM_DB` in `src/app/(app)/dashboard/page.tsx`); extract that mapping into `src/lib/application-stages.ts` and import from both pages.

### `employer.getRecentActivity`

```ts
input:  z.object({ limit: z.number().int().min(1).max(20).default(8) })
output: Array<
  | { kind: "application_status_changed", at: Date, applicationId: string, jobTitle: string, candidateName: string, toStatus: ApplicationStatus }
  | { kind: "job_published",              at: Date, jobId: string, jobTitle: string, byUserName: string }
  | { kind: "member_joined",              at: Date, memberId: string, memberName: string, role: OrgMemberRole }
>
```

Implementation: three small queries (last `limit` from each source), merge in JS, sort by `at` descending, slice to `limit`. Cheaper than `UNION ALL` across joins for v1 volumes, easier to type, easier to swap for a real event-log table later.

Sources:

- `applications.updatedAt` for `application_status_changed` (we don't have an audit log, so we only know the *current* status — the event renders as "moved to {status}", not "from X to Y").
- `jobListings.publishedAt` for `job_published`.
- `orgMembers.acceptedAt` for `member_joined`.

## 6. Component contracts

- **`KpiStrip`** — `{ openRoles, applicants30d, profileViews30d, applicantsTotal }`. Pure render, no async. Each tile is a `Card` with label, big number, and small trailing context (e.g. "30d").
- **`InboxQueue`** — async RSC; calls `api.employer.getInboxQueue({ limit: 5 })`. Renders rows: candidate name + headline · job title · `timeAgo`. Each row links to `/employer/jobs/{jobId}/applicants?focus={applicationId}` (the `?focus` param is new — kanban scrolls/highlights the matching card; if the kanban doesn't yet support it, ignore the param for now and just navigate to the board). Empty state: "No new applicants right now."
- **`StaleAlerts`** — async RSC; calls `api.employer.getStaleAlerts()`. Two grouped lists. Stale-applicant rows link to the kanban with focus; cold-job rows link to the job's edit page. Empty state: "All jobs healthy."
- **`PipelineByJob`** — async RSC; calls `api.employer.getPipelineByJob()`. Compact table. Each row → "View" link to `/employer/jobs/{jobId}/applicants`. Empty state: "No published jobs yet — [Post a job]" CTA links to `/employer/jobs/new`.
- **`PlanQuotaCard`** — async RSC; reuses `api.billing.getCurrent()`. Renders posts-used-of-limit progress bar + "Manage billing" link to `/employer/profile#billing`. If `billing.getCurrent()` returns no active subscription, show "No active plan — [Choose a plan]" CTA.
- **`RecentActivity`** — async RSC; calls `api.employer.getRecentActivity({ limit: 8 })`. Switches on the event `kind` discriminant for the row renderer. Empty state: "Nothing yet — your team's activity will show up here."

## 7. Loading and error states

**Loading:** `loading.tsx` renders the page skeleton — KPI tiles as gray blocks, two-column section placeholders. Each suspense-wrapped section also has its own per-card skeleton fallback so a slow query doesn't stall the others.

**Error:** if a section's query throws, the section renders an inline error card ("Couldn't load this section") with a retry. Implemented via per-section error boundary or try/catch in the RSC. The rest of the page stays up; one section failing must not blank the dashboard.

## 8. Testing

Deferred to a follow-up step — to be covered when implementation lands.

- **Vitest:** unit tests for each new tRPC procedure. Seed an org + jobs + applications via the existing test helpers (Mara/Jordan/Priya seeds already in DB).
- **Playwright + visual:** snapshot of `/employer` for an employer with a populated org. Add to the existing visual regression suite.
- **Empty states:** snapshot test for empty-state copy so brand voice doesn't drift.

## 9. Build order

1. Extract shared stage mapping to `src/lib/application-stages.ts`; update `dashboard/page.tsx` to import from it.
2. Add the four tRPC procedures on `employerRouter` with their Zod schemas.
3. Build `src/app/(app)/employer/page.tsx` shell + `loading.tsx`.
4. Build `_components/kpi-strip.tsx` and `_components/plan-quota-card.tsx` (cheapest, both reuse existing data).
5. Build `_components/inbox-queue.tsx` and `_components/stale-alerts.tsx`.
6. Build `_components/pipeline-by-job.tsx`.
7. Build `_components/recent-activity.tsx`.
8. Migrate the three redirect targets in §2.
9. Tests (§8).
