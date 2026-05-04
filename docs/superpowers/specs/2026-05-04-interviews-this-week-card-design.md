# Interviews — "This week" card on both dashboards

**Status:** Design draft 2026-05-04
**Scope:** Replace the existing employer-side `<TodaysInterviews>` (today-only) card on `/employer` with a unified "Interviews" card that has Upcoming + Past tabs, and add the same card to the jobseeker `/dashboard`. New jobseeker-scoped tRPC procs. No new routes, no calendar grid, no new email templates, no schema changes.
**Out of scope:** `/calendar` page, month/week grid view, ICS export from the card, redesign of the existing `<InterviewBlock>` on application detail pages, infinite-scroll/virtualization, mobile-specific component (relies on row-wrap CSS only), tests (deferred per established pattern).

---

## 1. Goal

Today, the jobseeker `/dashboard` shows profile completeness + applications list, but **no** interview surface — to see interviews they must click into each application detail. The employer `/employer` page has a `<TodaysInterviews>` card scoped to today only, which fails as soon as the next interview is tomorrow. This work gives both roles a single rollup card showing the next 7 days of confirmed interviews and the last 30 days of past interviews, with consistent layout and copy on both sides.

---

## 2. Data model

No schema changes. Uses the existing `interviews` + `interview_slots` tables (per [2026-05-02-interview-scheduling-design.md](2026-05-02-interview-scheduling-design.md)).

Past-row inclusion rule: **only include interviews that had a confirmed slot at some point** (`confirmedSlotId IS NOT NULL`). This filters out canceled-before-confirm and expired-without-confirm rows — neither represents a real "past interview" worth surfacing on a dashboard.

Past-row chronology key: `interviews.updatedAt`. The schema has no `canceledAt` column; `updatedAt` auto-updates via Drizzle's `$onUpdate` hook, so it equals the cancel time for canceled rows and the cron-completion time (≤30 min after actual end) for completed rows. Acceptable fuzz for a dashboard view; the row's display time stays the slot's `startsAt`.

---

## 3. tRPC router changes (`src/server/api/routers/interviews.ts`)

| Action | Proc | Role gate | Range | Status filter |
|---|---|---|---|---|
| Remove | `todaysForOrg` | — | — | — |
| Add | `upcomingForOrg({ orgId })` | `org_members` row on `orgId` w/ role IN (`owner`, `admin`, `recruiter`) | `confirmedSlot.startsAt ∈ [now, now+7d]` | `confirmed` |
| Add | `recentForOrg({ orgId, limit?=30 })` | same as above | `interviews.updatedAt ∈ [now-30d, now]` AND `confirmedSlotId IS NOT NULL` | `completed` ∪ `canceled` |
| Add | `upcomingForCandidate()` | session user is `applications.candidateId` for the joined application | `confirmedSlot.startsAt ∈ [now, now+7d]` | `confirmed` |
| Add | `recentForCandidate({ limit?=30 })` | same | `interviews.updatedAt ∈ [now-30d, now]` AND `confirmedSlotId IS NOT NULL` | `completed` ∪ `canceled` |

All `protectedProcedure`. The candidate-scoped procs filter via `applications.candidateId = ctx.session.user.id` — no orgId param.

`todaysForOrg` is removed because its only consumer is the soon-deleted `<TodaysInterviews>` component (verified — no other refs in the codebase).

### Returned row shape

**Org-scoped:**
```ts
{
  interviewId: string;
  applicationId: string;
  jobId: string;
  jobTitle: string | null;
  candidateUserId: string;
  candidateName: string | null;
  candidateAvatarUrl: string | null;
  startsAt: Date;       // confirmed slot
  durationMin: number;
  medium: 'video' | 'phone' | 'in_person';
  details: string;
  status: 'confirmed' | 'completed' | 'canceled';   // 'confirmed' only on upcoming
  cancelReason: string | null;                      // only meaningful on past
}
```

**Candidate-scoped:** same shape minus `candidateUserId`/`candidateName`/`candidateAvatarUrl`, plus:
```ts
{
  orgId: string;
  orgName: string;
  orgLogoUrl: string | null;
  orgLogoColor: string;
}
```

Both return arrays sorted by `startsAt asc` (upcoming) or `updatedAt desc` (past).

---

## 4. UI

### 4a. Shared component — `src/components/shared/interviews-card.tsx`

```ts
type Props =
  | { mode: "employer"; orgId: string }
  | { mode: "candidate" };
```

Internal state:
- `activeTab: "upcoming" | "past"` — `useState`, defaults to `"upcoming"`.

Internal queries (only the active tab's query runs at a time, switching is cheap):
- `mode === "employer" && tab === "upcoming"` → `api.interviews.upcomingForOrg.useQuery({ orgId })`
- `mode === "employer" && tab === "past"` → `api.interviews.recentForOrg.useQuery({ orgId })`
- `mode === "candidate" && tab === "upcoming"` → `api.interviews.upcomingForCandidate.useQuery()`
- `mode === "candidate" && tab === "past"` → `api.interviews.recentForCandidate.useQuery()`

Renders:
1. Card wrapper (white bg, `--v2-ink-200` border, `--v2-r-lg` radius, 22px padding — matches existing dashboard cards).
2. Header row: title `"Interviews"` + tab pills with active count badge on Upcoming.
3. Body: skeleton rows during loading, then either the day-grouped list or empty-state copy.

Day grouping (client-side):
- Group rows by start-of-day in viewer's TZ.
- Day labels:
  - Upcoming: `TODAY`, `TOMORROW`, then `WED · MAY 7` style for further days.
  - Past: `YESTERDAY`, then `MON · MAY 4` style.
- Within a day, rows ordered ascending (upcoming) or descending (past) by `startsAt`.

### 4b. Row component (internal)

| Element | Upcoming | Past |
|---|---|---|
| Avatar/logo | Candidate avatar (employer mode) or org logo (candidate mode) | same |
| Primary text | Candidate name or org name | same |
| Secondary text | Job title | same |
| Time text | `"2:00 PM · 60 min"` (viewer TZ via `Intl.DateTimeFormat`) | same |
| Medium icon | 📹 video / ☎ phone / 📍 in-person | same |
| Trailing element | If video URL → `[Join →]` button (target=_blank, opens link); else nothing | Status chip: green `Completed` / muted `Canceled` (with reason inline if present, truncated to 40 chars) |
| Click target (whole row) | Employer: `/employer/jobs/{jobId}/applicants/{applicationId}`. Candidate: `/applications/{applicationId}` | same |

### 4c. Empty states

| Tab | Mode | Copy |
|---|---|---|
| Upcoming | Employer | "No interviews coming up this week." |
| Upcoming | Candidate | "No interviews coming up this week." |
| Past | Employer | "No interviews completed in the last 30 days." |
| Past | Candidate | "Once an interview wraps, it'll show up here." |

(Past-candidate copy is more inviting since their volume is naturally lower.)

### 4d. Loading state

Three skeleton rows: 32px circle + two stacked text bars (60% width / 40% width) + a small right-side rectangle. Uses `--v2-ink-100` background pulse via existing `.v2-skeleton` if present, else inline animation.

### 4e. Error state

If the query errors, show a single subdued line: "Couldn't load interviews. [Retry]" with a button that calls `refetch()`. Don't blow up the card.

### 4f. Mobile (≤640px)

Pure CSS: row container is `flex` with `flex-wrap`; the time + medium + Join cluster gets `flex-basis: 100%` at narrow widths so it drops below the name/title block. Tabs stay on one line at top.

---

## 5. File changes

| Action | Path | Detail |
|---|---|---|
| New | `src/components/shared/interviews-card.tsx` | Unified card per §4 |
| Edit | `src/server/api/routers/interviews.ts` | Remove `todaysForOrg`; add 4 new procs per §3 |
| Edit | `src/app/(app)/employer/page.tsx` | Replace `<TodaysInterviews orgId={orgId} />` with `<InterviewsCard mode="employer" orgId={orgId} />`; remove import |
| Edit | `src/app/(app)/dashboard/page.tsx` | Render `<InterviewsCard mode="candidate" />` between profile completeness and applications-list sections |
| Delete | `src/app/(app)/employer/_components/todays-interviews.tsx` | Replaced |

No middleware, no env, no migration, no Trigger.dev, no email template changes.

---

## 6. Edge cases

- **Confirmed interview that's about to flip to `completed` mid-render**: the completion cron runs every 30 min. A row that was `confirmed` at the start of the proc query but the cron processes it before the next refetch will look like an "Upcoming" row showing a past time briefly. Acceptable — the next refetch (on tab switch or page navigation) reconciles. No special handling.
- **Canceled-before-confirm rows**: filtered out by `confirmedSlotId IS NOT NULL`. They never had a real time and shouldn't clutter "past."
- **Expired-without-confirm rows**: same — filtered out by status (`expired` not in `completed ∪ canceled`).
- **Candidate has no applications at all**: `recentForCandidate` returns `[]`, empty-state copy shows. No special branch needed.
- **Candidate has applications across multiple orgs**: org logo + name distinguish rows. No grouping by org on the dashboard card (just chronological).
- **Org member loses role mid-flight**: `protectedProcedure` re-runs the role check on every query. Demoted user gets a `FORBIDDEN` error → error state shows the retry copy.
- **Time straddling DST**: `Intl.DateTimeFormat` handles correctly. Server stores UTC; client converts. Day grouping uses viewer's local start-of-day.
- **Two interviews same applicant same day** (e.g. employer rescheduled): both rows show. The canceled one (with `cancelReason='rescheduled'`) shows in Past with a `Canceled` chip + "Rescheduled" reason. The new one shows in Upcoming. UX is honest about the history.
- **Dashboard card placement when 0 upcoming + 0 past**: renders empty-state on Upcoming tab. Don't hide the card — discoverability matters more than density.

---

## 7. Acceptance criteria

- [ ] On `/employer`, the existing "Today's interviews" card is replaced by the new "Interviews" card with Upcoming/Past tabs.
- [ ] On `/dashboard`, jobseekers see the same card with their own interview data, scoped to their applications.
- [ ] Upcoming tab shows confirmed interviews with `startsAt ∈ [now, now+7d]`, grouped by day with relative labels (TODAY, TOMORROW, then absolute dates).
- [ ] Past tab shows completed + canceled interviews from the last 30 days, only those that ever had a confirmed slot, grouped by day, reverse chronological.
- [ ] Each row click takes the user to the right detail page (employer applicants page / candidate application detail).
- [ ] Video interviews show a Join button on Upcoming. Past interviews show a status chip.
- [ ] Empty states render for both tabs in both modes with the copy in §4c.
- [ ] Tab count badge shows the Upcoming count.
- [ ] All times in viewer's browser TZ.
- [ ] `pnpm typecheck` clean after the changes.
- [ ] Smoke test: log in as a seeded jobseeker (Mara/Jordan/Priya), confirm `/dashboard` shows the card; log in as their employer, confirm `/employer` shows the card with the same interviews on the other side.
