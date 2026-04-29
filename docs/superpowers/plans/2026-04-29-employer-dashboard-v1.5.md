# Employer Dashboard v1.5 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add four trend-oriented enrichments to `/employer` (Hiring funnel, Applications-over-time area chart, Roles-by-family bars, shared Date-range filter), per the spec at `docs/superpowers/specs/2026-04-29-employer-dashboard-v1.5-design.md`.

**Architecture:** A shared `?range=` URL search-param drives four sections (KPI strip + 3 new sections) by passing `range` into their tRPC procedures. The existing v1 sections (Inbox/Stale/Pipeline/Plan/Activity) are unaffected. Three new RSC components + one client component (`RangePills`) + one shared SVG chart primitive. Three new tRPC procedures plus a refactored `getKpis`. No schema changes.

**Tech Stack:** Next.js App Router (RSC), tRPC, Drizzle, Tailwind, brand `--v2-accent` (`#1CAAE2`) + `--v2-accent-deep` (`#004984`).

**Testing posture:** Per spec §8 and the user's working-style preference, tests are deferred. Each task verifies via `pnpm typecheck` + `pnpm lint`. Final task lists the test inventory to add when test infra is set up.

---

## File Structure

| Path | Status | Responsibility |
|---|---|---|
| `src/lib/range.ts` | Create | `Range` type + `rangeToCutoff(range): Date \| null` helper |
| `src/server/services/profile-views.ts` | Modify | Rename `countEmployerOrgViews30d` → `countEmployerOrgViewsSince(orgId, since)` |
| `src/server/api/routers/employer.ts` | Modify | Refactor `getKpis` to accept `range`. Add `getFunnel`, `getApplicationsTimeseries`, `getApplicantsBySector`. |
| `src/app/(app)/employer/page.tsx` | Modify | Read `?range=`, pass to range-aware children, restructure header for pills, insert 3 new sections |
| `src/app/(app)/employer/loading.tsx` | Modify | Add funnel + chart skeleton blocks |
| `src/app/(app)/employer/_components/range-pills.tsx` | Create | Client component — pill buttons updating `?range=` |
| `src/app/(app)/employer/_components/kpi-strip.tsx` | Modify | Accept `range` prop, render active-range subtitle, use renamed fields |
| `src/app/(app)/employer/_components/hiring-funnel.tsx` | Create | Async RSC — calls `getFunnel`, renders 4 stage bars + rejected pill |
| `src/app/(app)/employer/_components/applications-chart.tsx` | Create | Async RSC — calls `getApplicationsTimeseries`, renders the shared chart |
| `src/app/(app)/employer/_components/roles-by-family.tsx` | Create | Async RSC — calls `getApplicantsBySector`, renders sector bars |
| `src/app/(app)/employer/_components/charts/area-chart.tsx` | Create | Pure SVG primitive — accepts series + granularity, renders gridlines + 2 lines + 2 fills |
| `src/app/(app)/employer/profile/employer-profile-client.tsx` | Modify | Update two field references after the KPI rename (`applicants30d` → `applicantsInRange`, `profileViews30d` → `profileViewsInRange`) |

---

## Task 1: Add range helper

**Files:**
- Create: `src/lib/range.ts`

- [ ] **Step 1: Create `src/lib/range.ts`**

```ts
export type Range = "7d" | "30d" | "90d" | "all";

export const RANGES: Range[] = ["7d", "30d", "90d", "all"];

export function rangeToCutoff(range: Range): Date | null {
  if (range === "all") return null;
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export function rangeLabel(range: Range): string {
  switch (range) {
    case "7d": return "Last 7 days";
    case "30d": return "Last 30 days";
    case "90d": return "Last 90 days";
    case "all": return "All time";
  }
}

export function isRange(value: unknown): value is Range {
  return value === "7d" || value === "30d" || value === "90d" || value === "all";
}
```

- [ ] **Step 2: Verify typecheck + lint**

```bash
pnpm typecheck && pnpm lint
```

Expected: both pass.

- [ ] **Step 3: Commit**

```bash
git add src/lib/range.ts
git commit -m "feat(employer-dashboard): add Range type + helpers"
```

---

## Task 2: Build RangePills client component

**Files:**
- Create: `src/app/(app)/employer/_components/range-pills.tsx`

- [ ] **Step 1: Create the client component**

```tsx
"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";
import { RANGES, type Range } from "@/lib/range";

const LABELS: Record<Range, string> = {
  "7d": "7d",
  "30d": "30d",
  "90d": "90d",
  "all": "All",
};

export function RangePills({ active }: { active: Range }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, start] = useTransition();

  const select = (next: Range) => {
    if (next === active) return;
    const params = new URLSearchParams(searchParams.toString());
    if (next === "30d") {
      params.delete("range");
    } else {
      params.set("range", next);
    }
    const qs = params.toString();
    start(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname);
    });
  };

  return (
    <div
      role="tablist"
      aria-label="Date range"
      className="inline-flex items-center gap-1 rounded-full border bg-background p-1"
      data-pending={pending ? "true" : "false"}
    >
      {RANGES.map((r) => {
        const isActive = r === active;
        return (
          <button
            key={r}
            role="tab"
            aria-selected={isActive}
            onClick={() => select(r)}
            className={
              isActive
                ? "rounded-full bg-[var(--v2-accent)] px-3 py-1 text-xs font-bold text-white"
                : "rounded-full px-3 py-1 text-xs font-bold text-muted-foreground hover:text-foreground"
            }
          >
            {LABELS[r]}
          </button>
        );
      })}
    </div>
  );
}
```

Notes for the implementer:
- "30d" is the default value, so when the user clicks 30d we DELETE the param entirely (cleaner URLs). Other ranges set the param.
- `useTransition` keeps the page interactive while the RSC re-renders.
- The active pill gets `bg-[var(--v2-accent)]` (brand blue) — matches the page's brand-token convention.

- [ ] **Step 2: Verify typecheck + lint**

```bash
pnpm typecheck && pnpm lint
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/employer/_components/range-pills.tsx
git commit -m "feat(employer-dashboard): RangePills client component"
```

---

## Task 3: Wire `?range=` into the page header

**Files:**
- Modify: `src/app/(app)/employer/page.tsx`

This task adds the URL plumbing and renders the pills, but does NOT yet pass `range` to the data layer. KPI strip and other sections still operate at their current (30d) defaults until Task 4 wires them through.

- [ ] **Step 1: Update `page.tsx` to accept `searchParams`**

In `src/app/(app)/employer/page.tsx`, change the function signature to accept search params, parse and validate the range, and import the helper.

Add to the imports block at the top of the file:

```tsx
import { isRange, type Range } from "@/lib/range";
import { RangePills } from "./_components/range-pills";
```

Change the function signature from:

```tsx
export default async function EmployerDashboardPage() {
```

to:

```tsx
export default async function EmployerDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const sp = await searchParams;
  const range: Range = isRange(sp.range) ? sp.range : "30d";
```

(In Next 15+ `searchParams` is a Promise. The `await` is required.)

- [ ] **Step 2: Restructure the header to include the pills**

In `page.tsx`, find the existing header block:

```tsx
<header className="mb-6 flex flex-wrap items-center justify-between gap-4">
  <div>
    <h1 className="text-2xl font-black md:text-3xl">
      Welcome back, {org?.name ?? "team"}
    </h1>
    <p className="text-sm text-muted-foreground">
      Here&rsquo;s what needs your attention today.
    </p>
  </div>
  <Link href="/employer/jobs/new" className="v2-btn v2-btn-accent">
    + Post a job
  </Link>
</header>
```

Replace with:

```tsx
<header className="mb-6 flex flex-wrap items-center justify-between gap-4">
  <div>
    <h1 className="text-2xl font-black md:text-3xl">
      Welcome back, {org?.name ?? "team"}
    </h1>
    <p className="text-sm text-muted-foreground">
      Here&rsquo;s what needs your attention today.
    </p>
  </div>
  <div className="flex flex-wrap items-center gap-3">
    <RangePills active={range} />
    <Link href="/employer/jobs/new" className="v2-btn v2-btn-accent">
      + Post a job
    </Link>
  </div>
</header>
```

- [ ] **Step 3: Verify typecheck + lint**

```bash
pnpm typecheck && pnpm lint
```

Expected: both pass. Visit `/employer` (locally, in browser — the user has the dev server running) — the pills appear in the header but clicking them only changes the URL; the page below doesn't yet react to the change.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/employer/page.tsx
git commit -m "feat(employer-dashboard): URL ?range= plumbing + pills in header"
```

---

## Task 4: Refactor `getKpis` to accept range

**Files:**
- Modify: `src/server/services/profile-views.ts`
- Modify: `src/server/api/routers/employer.ts`
- Modify: `src/app/(app)/employer/_components/kpi-strip.tsx`
- Modify: `src/app/(app)/employer/page.tsx`
- Modify: `src/app/(app)/employer/profile/employer-profile-client.tsx`

This task: rename one helper, refactor one procedure, rename two output fields, update three consumers.

- [ ] **Step 1: Rename `countEmployerOrgViews30d` → `countEmployerOrgViewsSince`**

In `src/server/services/profile-views.ts`, find:

```ts
export async function countEmployerOrgViews30d(orgId: string) {
```

Rename to:

```ts
export async function countEmployerOrgViewsSince(orgId: string, since: Date | null) {
```

Inside the function, replace the existing 30-day cutoff calculation with the `since` param:
- If `since` is `null`, omit the `gte(profileViews.viewedAt, ...)` predicate.
- Otherwise use `gte(profileViews.viewedAt, since)`.

If the function currently builds an array of where-conditions, append the gte conditionally:

```ts
const conditions = [
  // ... existing conditions (e.g., orgId match, exclude self/org-member)
];
if (since !== null) {
  conditions.push(gte(profileViews.viewedAt, since));
}
```

(The implementer should read the file first and adapt; the spec is "make it accept an optional cutoff." Don't change the rest of the helper's behavior.)

Do not touch `countJobseekerProfileViews30d` — out of scope for this v1.5.

- [ ] **Step 2: Refactor `getKpis` in `employer.ts`**

In `src/server/api/routers/employer.ts`, find the existing `getKpis` procedure (around lines 151-192). Replace its body with a range-aware version:

```ts
  getKpis: protectedProcedure
    .input(
      z.object({
        range: z.enum(["7d", "30d", "90d", "all"]).default("30d"),
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
      const orgId = await findMyOrg(ctx);
      if (!orgId) return null;

      const range = input?.range ?? "30d";
      const cutoff = rangeToCutoff(range);

      const [openRoles] = await ctx.db
        .select({ count: sql<number>`count(*)::int` })
        .from(jobListings)
        .where(
          and(
            eq(jobListings.orgId, orgId),
            eq(jobListings.status, "published"),
          ),
        );

      const inRangeConditions = [eq(jobListings.orgId, orgId)];
      if (cutoff) inRangeConditions.push(gte(applications.createdAt, cutoff));

      const [applicantsInRange] = await ctx.db
        .select({ count: sql<number>`count(*)::int` })
        .from(applications)
        .innerJoin(jobListings, eq(jobListings.id, applications.jobId))
        .where(and(...inRangeConditions));

      const [applicantsTotal] = await ctx.db
        .select({ count: sql<number>`count(*)::int` })
        .from(applications)
        .innerJoin(jobListings, eq(jobListings.id, applications.jobId))
        .where(eq(jobListings.orgId, orgId));

      const profileViewsInRange = await countEmployerOrgViewsSince(orgId, cutoff);

      return {
        openRoles: openRoles?.count ?? 0,
        applicantsInRange: applicantsInRange?.count ?? 0,
        applicantsTotal: applicantsTotal?.count ?? 0,
        profileViewsInRange,
      };
    }),
```

Update the imports at the top of `employer.ts` to:
- import `rangeToCutoff` and `type Range` from `@/lib/range`:
  ```ts
  import { rangeToCutoff, type Range } from "@/lib/range";
  ```
- update the import of `countEmployerOrgViews30d` to `countEmployerOrgViewsSince`:
  ```ts
  import { countEmployerOrgViewsSince } from "@/server/services/profile-views";
  ```

- [ ] **Step 3: Update `kpi-strip.tsx` to consume the renamed fields and accept a range prop**

Replace the entire content of `src/app/(app)/employer/_components/kpi-strip.tsx` with:

```tsx
import { api } from "@/lib/trpc/server";
import { rangeLabel, type Range } from "@/lib/range";

function Tile({
  label,
  value,
  context,
}: {
  label: string;
  value: number;
  context?: string;
}) {
  return (
    <div className="rounded-xl border p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-3xl font-black tabular-nums">{value}</div>
      {context && (
        <div className="text-xs text-muted-foreground">{context}</div>
      )}
    </div>
  );
}

export async function KpiStrip({ range }: { range: Range }) {
  const kpis = await api.employer.getKpis({ range });
  if (!kpis) return null;

  const subtitle = rangeLabel(range);

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <Tile label="Open roles" value={kpis.openRoles} />
      <Tile label="Applicants" value={kpis.applicantsInRange} context={subtitle} />
      <Tile label="Profile views" value={kpis.profileViewsInRange} context={subtitle} />
      <Tile label="Total applicants" value={kpis.applicantsTotal} />
    </div>
  );
}
```

- [ ] **Step 4: Pass `range` from page to KpiStrip**

In `src/app/(app)/employer/page.tsx`, find the existing KPI strip render:

```tsx
<section className="mb-6">
  <KpiStrip />
</section>
```

Replace with:

```tsx
<section className="mb-6">
  <KpiStrip range={range} />
</section>
```

- [ ] **Step 5: Update the employer profile page consumer**

In `src/app/(app)/employer/profile/employer-profile-client.tsx`, find the two field references (around lines 620 and 638):

```ts
? String(kpisQuery.data.applicants30d)
```
```ts
? String(kpisQuery.data.profileViews30d)
```

Replace with:

```ts
? String(kpisQuery.data.applicantsInRange)
```
```ts
? String(kpisQuery.data.profileViewsInRange)
```

The profile page will continue to call `getKpis()` with no input, which defaults to `range: "30d"` — same effective behavior as before, just a renamed field.

- [ ] **Step 6: Verify typecheck + lint**

```bash
pnpm typecheck && pnpm lint
```

Confirm no other references to `applicants30d` / `profileViews30d` / `countEmployerOrgViews30d` exist:

```bash
grep -rn "applicants30d\|profileViews30d\|countEmployerOrgViews30d" src/ 2>/dev/null
```

Expected: no matches. If matches appear, fix them.

- [ ] **Step 7: Commit**

```bash
git add src/server/services/profile-views.ts src/server/api/routers/employer.ts src/app/\(app\)/employer/_components/kpi-strip.tsx src/app/\(app\)/employer/page.tsx src/app/\(app\)/employer/profile/employer-profile-client.tsx
git commit -m "refactor(employer): make getKpis range-aware (renamed fields + helper)"
```

---

## Task 5: Add `employer.getFunnel` procedure

**Files:**
- Modify: `src/server/api/routers/employer.ts`

- [ ] **Step 1: Add the procedure**

Insert into `employerRouter` immediately after the refactored `getKpis` (so it's the first new range-aware procedure in the file):

```ts
  getFunnel: protectedProcedure
    .input(z.object({ range: z.enum(["7d", "30d", "90d", "all"]).default("30d") }))
    .query(async ({ ctx, input }) => {
      const orgId = await findMyOrg(ctx);
      const empty = {
        stages: [
          { key: "applied" as const,   label: "Applied",   count: 0, pctOfPrev: null as number | null },
          { key: "review" as const,    label: "Review",    count: 0, pctOfPrev: 0 },
          { key: "interview" as const, label: "Interview", count: 0, pctOfPrev: 0 },
          { key: "offer" as const,     label: "Offer",     count: 0, pctOfPrev: 0 },
        ],
        rejectedCount: 0,
        totalApplications: 0,
      };
      if (!orgId) return empty;

      const cutoff = rangeToCutoff(input.range);
      const conditions = [eq(jobListings.orgId, orgId)];
      if (cutoff) conditions.push(gte(applications.createdAt, cutoff));

      const rows = await ctx.db
        .select({
          status: applications.status,
          count: sql<number>`count(*)::int`,
        })
        .from(applications)
        .innerJoin(jobListings, eq(jobListings.id, applications.jobId))
        .where(and(...conditions))
        .groupBy(applications.status);

      const byStatus: Record<string, number> = {
        submitted: 0,
        reviewed: 0,
        interview: 0,
        offer: 0,
        rejected: 0,
      };
      for (const r of rows) {
        if (r.status) byStatus[r.status] = r.count;
      }

      const applied = byStatus.submitted + byStatus.reviewed + byStatus.interview + byStatus.offer + byStatus.rejected;
      const review = byStatus.reviewed + byStatus.interview + byStatus.offer;
      const interview = byStatus.interview + byStatus.offer;
      const offer = byStatus.offer;

      const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);

      return {
        stages: [
          { key: "applied" as const,   label: "Applied",   count: applied,   pctOfPrev: null as number | null },
          { key: "review" as const,    label: "Review",    count: review,    pctOfPrev: pct(review, applied) },
          { key: "interview" as const, label: "Interview", count: interview, pctOfPrev: pct(interview, review) },
          { key: "offer" as const,     label: "Offer",     count: offer,     pctOfPrev: pct(offer, interview) },
        ],
        rejectedCount: byStatus.rejected,
        totalApplications: applied,
      };
    }),
```

- [ ] **Step 2: Verify typecheck + lint**

```bash
pnpm typecheck && pnpm lint
```

- [ ] **Step 3: Commit**

```bash
git add src/server/api/routers/employer.ts
git commit -m "feat(employer): add getFunnel tRPC procedure"
```

---

## Task 6: Build HiringFunnel component

**Files:**
- Create: `src/app/(app)/employer/_components/hiring-funnel.tsx`
- Modify: `src/app/(app)/employer/page.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { api } from "@/lib/trpc/server";
import type { Range } from "@/lib/range";

function Stage({
  label,
  count,
  pctOfPrev,
  intensity,
  height,
}: {
  label: string;
  count: number;
  pctOfPrev: number | null;
  intensity: number;
  height: number;
}) {
  const opacity = (0.3 + intensity * 0.7).toFixed(2);
  return (
    <div className="flex flex-1 flex-col">
      <div className="relative h-32 rounded-md bg-muted">
        <div
          className="absolute bottom-0 left-0 right-0 rounded-md"
          style={{
            height: `${height}%`,
            background: `var(--v2-accent)`,
            opacity,
          }}
        />
      </div>
      <div className="mt-2 flex items-baseline justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            {label}
          </div>
          <div className="text-xl font-black tabular-nums">{count}</div>
        </div>
        {pctOfPrev !== null && (
          <div className="text-xs font-bold text-muted-foreground">
            {pctOfPrev}%
          </div>
        )}
      </div>
    </div>
  );
}

export async function HiringFunnel({ range }: { range: Range }) {
  const data = await api.employer.getFunnel({ range });

  if (data.totalApplications === 0 && data.rejectedCount === 0) {
    return (
      <div className="rounded-xl border p-4">
        <div className="flex items-baseline justify-between">
          <div className="text-sm font-bold">Hiring funnel</div>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          No applications in this range — try widening the date range.
        </p>
      </div>
    );
  }

  const max = Math.max(...data.stages.map((s) => s.count), 1);

  return (
    <div className="rounded-xl border p-4">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Hiring funnel
          </div>
          <div className="text-base font-bold">
            From <em className="not-italic font-black">applied</em> to{" "}
            <em className="not-italic font-black">offer</em>
          </div>
        </div>
        {data.rejectedCount > 0 && (
          <div className="rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">
            Not selected: {data.rejectedCount}
          </div>
        )}
      </div>
      <div className="mt-4 flex items-end gap-3">
        {data.stages.map((s, i) => (
          <Stage
            key={s.key}
            label={s.label}
            count={s.count}
            pctOfPrev={s.pctOfPrev}
            intensity={1 - i * 0.2}
            height={Math.max((s.count / max) * 100, s.count > 0 ? 8 : 0)}
          />
        ))}
      </div>
    </div>
  );
}
```

Notes for the implementer:
- The `intensity` per stage steps down from 1.0 to 0.4, so the brand-blue fill gets visually lighter as you progress. This gives the funnel its tapering color without using more than one hue.
- `height` is a percentage of the tallest bar. Tiny non-zero counts get a minimum 8% so the bar is visible.
- Italic flourishes use `<em className="not-italic font-black">` — Lato Black, no italic shape, but the `<em>` carries semantic emphasis. (We never want serif italic per brand.)

- [ ] **Step 2: Wire into `page.tsx` after the KPI strip**

In `src/app/(app)/employer/page.tsx`, immediately after the KPI strip section (closing `</section>` of the KPI block), insert:

```tsx
      <section className="mb-6">
        <HiringFunnel range={range} />
      </section>
```

Add the import at the top:

```tsx
import { HiringFunnel } from "./_components/hiring-funnel";
```

- [ ] **Step 3: Verify typecheck + lint**

```bash
pnpm typecheck && pnpm lint
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/employer/_components/hiring-funnel.tsx src/app/\(app\)/employer/page.tsx
git commit -m "feat(employer-dashboard): hiring funnel section"
```

---

## Task 7: Build shared SVG area-chart primitive

**Files:**
- Create: `src/app/(app)/employer/_components/charts/area-chart.tsx`

This is the most non-trivial visual piece in v1.5. Pure render — no data fetching, no client-side state. Takes a series and renders SVG.

- [ ] **Step 1: Create `_components/charts/area-chart.tsx`**

```tsx
type Bucket = { at: Date; applications: number; reviewedOrDeeper: number };

export function AreaChart({
  series,
  height = 220,
}: {
  series: Bucket[];
  height?: number;
}) {
  const w = 760;
  const h = height;
  const pad = { l: 40, r: 16, t: 12, b: 24 };
  const cw = w - pad.l - pad.r;
  const ch = h - pad.t - pad.b;

  const max = Math.max(
    ...series.map((d) => Math.max(d.applications, d.reviewedOrDeeper)),
    1,
  ) * 1.1;

  const xs = series.map((_, i) =>
    pad.l + (series.length === 1 ? cw / 2 : (i / (series.length - 1)) * cw),
  );
  const yA = series.map((d) => pad.t + (1 - d.applications / max) * ch);
  const yS = series.map((d) => pad.t + (1 - d.reviewedOrDeeper / max) * ch);

  const grid = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    y: pad.t + t * ch,
    label: Math.round(max * (1 - t)),
  }));

  const lineA = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x},${yA[i]}`).join(" ");
  const fillA =
    lineA + ` L${xs[xs.length - 1]},${pad.t + ch} L${xs[0]},${pad.t + ch} Z`;
  const lineS = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x},${yS[i]}`).join(" ");
  const fillS =
    lineS + ` L${xs[xs.length - 1]},${pad.t + ch} L${xs[0]},${pad.t + ch} Z`;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      style={{ width: "100%", height }}
    >
      <defs>
        <linearGradient id="ac-grad-a" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1CAAE2" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#1CAAE2" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="ac-grad-s" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#004984" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#004984" stopOpacity="0" />
        </linearGradient>
      </defs>
      {grid.map((g, i) => (
        <g key={i}>
          <line
            x1={pad.l}
            x2={w - pad.r}
            y1={g.y}
            y2={g.y}
            stroke="#E4E7EE"
            strokeWidth="1"
            strokeDasharray={i === grid.length - 1 ? "" : "2 4"}
          />
          <text
            x="0"
            y={g.y + 3}
            fontFamily="Lato, system-ui, sans-serif"
            fontSize="10"
            fill="#9CA3AF"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {g.label}
          </text>
        </g>
      ))}
      <path d={fillA} fill="url(#ac-grad-a)" />
      <path d={lineA} fill="none" stroke="#1CAAE2" strokeWidth="2" />
      <path d={fillS} fill="url(#ac-grad-s)" />
      <path
        d={lineS}
        fill="none"
        stroke="#004984"
        strokeWidth="2"
        strokeDasharray="4 3"
      />
      {series.length > 0 && (
        <>
          <circle
            cx={xs[xs.length - 1]}
            cy={yA[yA.length - 1]}
            r="4"
            fill="white"
            stroke="#1CAAE2"
            strokeWidth="2"
          />
          <circle
            cx={xs[xs.length - 1]}
            cy={yS[yS.length - 1]}
            r="4"
            fill="white"
            stroke="#004984"
            strokeWidth="2"
          />
        </>
      )}
    </svg>
  );
}
```

Notes:
- Brand colors hardcoded: `#1CAAE2` (Applications) solid, `#004984` (Reviewed-or-deeper) dashed. No `#8FCC2A` green.
- The Lato `tabular-nums` axis labels match the brand-typography rule.
- Pure render: no `"use client"`, no data fetching. The wrapping component does the data fetch.

- [ ] **Step 2: Verify typecheck + lint**

```bash
pnpm typecheck && pnpm lint
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/employer/_components/charts/area-chart.tsx
git commit -m "feat(employer-dashboard): shared AreaChart SVG primitive"
```

---

## Task 8: Add `employer.getApplicationsTimeseries` procedure

**Files:**
- Modify: `src/server/api/routers/employer.ts`

- [ ] **Step 1: Add the procedure**

Insert into `employerRouter` immediately after `getFunnel`:

```ts
  getApplicationsTimeseries: protectedProcedure
    .input(z.object({ range: z.enum(["7d", "30d", "90d", "all"]).default("30d") }))
    .query(async ({ ctx, input }) => {
      const orgId = await findMyOrg(ctx);
      if (!orgId) {
        return { buckets: [], granularity: "day" as const };
      }

      const granularity: "day" | "week" | "month" =
        input.range === "90d" ? "week" : input.range === "all" ? "month" : "day";

      const cutoff = rangeToCutoff(input.range);

      const conditions = [eq(jobListings.orgId, orgId)];
      if (cutoff) conditions.push(gte(applications.createdAt, cutoff));

      const truncExpr = sql<Date>`date_trunc(${granularity}, ${applications.createdAt})`;

      const rows = await ctx.db
        .select({
          at: truncExpr,
          applications: sql<number>`count(*)::int`,
          reviewedOrDeeper: sql<number>`count(*) filter (where ${applications.status} in ('reviewed','interview','offer'))::int`,
        })
        .from(applications)
        .innerJoin(jobListings, eq(jobListings.id, applications.jobId))
        .where(and(...conditions))
        .groupBy(truncExpr)
        .orderBy(truncExpr);

      // Front-fill missing buckets with zeros so the chart x-axis has no gaps.
      const buckets: { at: Date; applications: number; reviewedOrDeeper: number }[] = [];
      const start = cutoff
        ? floorTo(cutoff, granularity)
        : rows.length > 0
          ? floorTo(new Date(rows[0].at), granularity)
          : null;
      if (start) {
        const cursor = new Date(start);
        const end = new Date();
        const byKey = new Map<string, { applications: number; reviewedOrDeeper: number }>();
        for (const r of rows) {
          byKey.set(r.at.toISOString(), {
            applications: r.applications,
            reviewedOrDeeper: r.reviewedOrDeeper,
          });
        }
        while (cursor <= end) {
          const key = cursor.toISOString();
          const v = byKey.get(key) ?? { applications: 0, reviewedOrDeeper: 0 };
          buckets.push({ at: new Date(cursor), ...v });
          advance(cursor, granularity);
        }
      } else {
        // "all" range with no data — return empty
        // (no buckets to render)
      }

      return { buckets, granularity };
    }),
```

- [ ] **Step 2: Add the `floorTo` and `advance` helpers**

These are local helpers used by the procedure. Add them in `employer.ts` near the top-level helpers (e.g. after `findMyOrg`):

```ts
function floorTo(d: Date, g: "day" | "week" | "month"): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  if (g === "day") return r;
  if (g === "week") {
    const day = r.getDay();
    const diff = (day + 6) % 7; // shift so Monday = 0
    r.setDate(r.getDate() - diff);
    return r;
  }
  // month
  r.setDate(1);
  return r;
}

function advance(d: Date, g: "day" | "week" | "month"): void {
  if (g === "day") {
    d.setDate(d.getDate() + 1);
  } else if (g === "week") {
    d.setDate(d.getDate() + 7);
  } else {
    d.setMonth(d.getMonth() + 1);
  }
}
```

- [ ] **Step 3: Verify typecheck + lint**

```bash
pnpm typecheck && pnpm lint
```

- [ ] **Step 4: Commit**

```bash
git add src/server/api/routers/employer.ts
git commit -m "feat(employer): add getApplicationsTimeseries tRPC procedure"
```

---

## Task 9: Build ApplicationsChart component

**Files:**
- Create: `src/app/(app)/employer/_components/applications-chart.tsx`
- Modify: `src/app/(app)/employer/page.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { api } from "@/lib/trpc/server";
import { rangeLabel, type Range } from "@/lib/range";
import { AreaChart } from "./charts/area-chart";

function formatTickDate(d: Date, granularity: "day" | "week" | "month"): string {
  if (granularity === "month") {
    return d.toLocaleDateString("en-CA", { month: "short", year: "2-digit" });
  }
  return d.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}

export async function ApplicationsChart({ range }: { range: Range }) {
  const { buckets, granularity } = await api.employer.getApplicationsTimeseries({ range });

  if (buckets.length === 0) {
    return (
      <div className="rounded-xl border p-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          Applications
        </div>
        <div className="mt-1 text-base font-bold">
          Pipeline <em className="not-italic font-black">velocity</em>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">No applications yet.</p>
      </div>
    );
  }

  const totalApps = buckets.reduce((s, b) => s + b.applications, 0);
  const totalReviewed = buckets.reduce((s, b) => s + b.reviewedOrDeeper, 0);

  // X-axis ticks: pick ~6-8 evenly-spaced labels.
  const tickStride = Math.max(1, Math.ceil(buckets.length / 7));
  const ticks = buckets.filter((_, i) => i % tickStride === 0);

  return (
    <div className="rounded-xl border p-4">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Applications
          </div>
          <div className="text-base font-bold">
            Pipeline <em className="not-italic font-black">velocity</em>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">{rangeLabel(range)}</div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: "#1CAAE2" }}
          />
          Applied · {totalApps}
        </div>
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-0.5 w-3"
            style={{ background: "#004984" }}
          />
          Reviewed-or-deeper · {totalReviewed}
        </div>
      </div>

      <div className="mt-3">
        <AreaChart series={buckets} />
      </div>

      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        {ticks.map((t) => (
          <span key={t.at.toISOString()} style={{ fontVariantNumeric: "tabular-nums" }}>
            {formatTickDate(t.at, granularity)}
          </span>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire into `page.tsx` between Inbox/Stale and Pipeline**

In `src/app/(app)/employer/page.tsx`, find the existing Inbox/Stale row (the one wrapped in `<section className="mb-6 grid gap-4 md:grid-cols-2">` with both `<Suspense>` blocks). Right after that section closes, insert:

```tsx
      <section className="mb-6">
        <Suspense
          fallback={
            <div className="rounded-xl border p-4">
              <div className="mb-2 h-4 w-40 animate-pulse rounded bg-muted" />
              <div className="h-56 animate-pulse rounded bg-muted/60" />
            </div>
          }
        >
          <ApplicationsChart range={range} />
        </Suspense>
      </section>
```

Add the import at the top:

```tsx
import { ApplicationsChart } from "./_components/applications-chart";
```

- [ ] **Step 3: Verify typecheck + lint**

```bash
pnpm typecheck && pnpm lint
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/employer/_components/applications-chart.tsx src/app/\(app\)/employer/page.tsx
git commit -m "feat(employer-dashboard): applications-over-time area chart"
```

---

## Task 10: Add `employer.getApplicantsBySector` procedure

**Files:**
- Modify: `src/server/api/routers/employer.ts`

- [ ] **Step 1: Add the procedure**

Insert into `employerRouter` immediately after `getApplicationsTimeseries`:

```ts
  getApplicantsBySector: protectedProcedure
    .input(z.object({ range: z.enum(["7d", "30d", "90d", "all"]).default("30d") }))
    .query(async ({ ctx, input }) => {
      const orgId = await findMyOrg(ctx);
      if (!orgId) return [];

      const cutoff = rangeToCutoff(input.range);
      const conditions = [eq(jobListings.orgId, orgId)];
      if (cutoff) conditions.push(gte(applications.createdAt, cutoff));

      const rows = await ctx.db
        .select({
          sector: jobListings.sector,
          count: sql<number>`count(*)::int`,
        })
        .from(applications)
        .innerJoin(jobListings, eq(jobListings.id, applications.jobId))
        .where(and(...conditions))
        .groupBy(jobListings.sector);

      const total = rows.reduce((s, r) => s + r.count, 0);
      if (total === 0) return [];

      const result = rows
        .filter((r) => r.count > 0)
        .map((r) => ({
          sector: r.sector,
          label: SECTOR_LABELS[r.sector],
          count: r.count,
          pct: Math.round((r.count / total) * 100),
        }))
        .sort((a, b) => {
          // "other" goes last
          if (a.sector === "other") return 1;
          if (b.sector === "other") return -1;
          return b.count - a.count;
        });

      return result;
    }),
```

- [ ] **Step 2: Add the SECTOR_LABELS import**

At the top of `src/server/api/routers/employer.ts`, add:

```ts
import { SECTOR_LABELS } from "@/lib/jobs-options";
```

- [ ] **Step 3: Verify typecheck + lint**

```bash
pnpm typecheck && pnpm lint
```

- [ ] **Step 4: Commit**

```bash
git add src/server/api/routers/employer.ts
git commit -m "feat(employer): add getApplicantsBySector tRPC procedure"
```

---

## Task 11: Build RolesByFamily component

**Files:**
- Create: `src/app/(app)/employer/_components/roles-by-family.tsx`
- Modify: `src/app/(app)/employer/page.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { api } from "@/lib/trpc/server";
import type { Range } from "@/lib/range";

const OPACITY_STEPS = [1.0, 0.8, 0.6, 0.4, 0.25, 0.15, 0.1];

export async function RolesByFamily({ range }: { range: Range }) {
  const rows = await api.employer.getApplicantsBySector({ range });

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border p-4">
        <div className="text-sm font-bold">By family</div>
        <p className="mt-2 text-sm text-muted-foreground">
          No applications to break down.
        </p>
      </div>
    );
  }

  const max = Math.max(...rows.map((r) => r.count), 1);

  return (
    <div className="rounded-xl border p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        By family
      </div>
      <div className="text-base font-bold">
        Applicants <em className="not-italic font-black">by sector</em>
      </div>
      <ul className="mt-3 space-y-3">
        {rows.map((r, i) => (
          <li key={r.sector}>
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-bold">{r.label}</span>
              <span className="tabular-nums text-muted-foreground">
                <strong className="text-foreground">{r.count}</strong> · {r.pct}%
              </span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full"
                style={{
                  width: `${(r.count / max) * 100}%`,
                  background: "var(--v2-accent)",
                  opacity: OPACITY_STEPS[Math.min(i, OPACITY_STEPS.length - 1)],
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Wire into `page.tsx`**

The current page has Plan & quota sitting in a 2-column grid with Recent activity. We change that grid to put Roles-by-family + Plan & quota side-by-side, and Recent activity becomes its own full-width section below.

In `src/app/(app)/employer/page.tsx`, find the existing two-column section that holds Plan and Activity:

```tsx
      {/* Plan + Activity — Tasks 9 & 13 replace these */}
      <section className="grid gap-4 md:grid-cols-2">
        <Suspense fallback={<SectionSkeleton title="Plan" />}>
          <PlanQuotaCard />
        </Suspense>
        <Suspense fallback={<SectionSkeleton title="Activity" />}>
          <RecentActivity />
        </Suspense>
      </section>
```

Replace with:

```tsx
      <section className="mb-6 grid gap-4 md:grid-cols-2">
        <Suspense fallback={<SectionSkeleton title="By family" />}>
          <RolesByFamily range={range} />
        </Suspense>
        <Suspense fallback={<SectionSkeleton title="Plan" />}>
          <PlanQuotaCard />
        </Suspense>
      </section>

      <section>
        <Suspense fallback={<SectionSkeleton title="Activity" />}>
          <RecentActivity />
        </Suspense>
      </section>
```

Add the import:

```tsx
import { RolesByFamily } from "./_components/roles-by-family";
```

- [ ] **Step 3: Verify typecheck + lint**

```bash
pnpm typecheck && pnpm lint
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/employer/_components/roles-by-family.tsx src/app/\(app\)/employer/page.tsx
git commit -m "feat(employer-dashboard): roles-by-family section"
```

---

## Task 12: Update loading skeleton

**Files:**
- Modify: `src/app/(app)/employer/loading.tsx`

The page-level loading skeleton (shown during initial route navigation) needs two new blocks (funnel + chart) so the streaming fallback matches the real layout.

- [ ] **Step 1: Replace `loading.tsx` content**

Replace the entire content of `src/app/(app)/employer/loading.tsx` with:

```tsx
export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 md:py-10">
      <div className="mb-6 h-8 w-64 animate-pulse rounded bg-muted" />

      {/* KPI strip */}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>

      {/* Funnel */}
      <div className="mb-6 h-56 animate-pulse rounded-xl bg-muted" />

      {/* Inbox / Stale */}
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <div className="h-40 animate-pulse rounded-xl bg-muted" />
        <div className="h-40 animate-pulse rounded-xl bg-muted" />
      </div>

      {/* Applications chart */}
      <div className="mb-6 h-72 animate-pulse rounded-xl bg-muted" />

      {/* Pipeline */}
      <div className="mb-6 h-48 animate-pulse rounded-xl bg-muted" />

      {/* Roles + Plan */}
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <div className="h-44 animate-pulse rounded-xl bg-muted" />
        <div className="h-44 animate-pulse rounded-xl bg-muted" />
      </div>

      {/* Activity */}
      <div className="h-32 animate-pulse rounded-xl bg-muted" />
    </main>
  );
}
```

- [ ] **Step 2: Verify typecheck + lint**

```bash
pnpm typecheck && pnpm lint
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/employer/loading.tsx
git commit -m "feat(employer-dashboard): update loading skeleton for v1.5 layout"
```

---

## Task 13: Manual smoke test

Per the user's `dev_environment.md` memory, the dev server runs externally on port 3000. Do not start it; ask if it's not running.

- [ ] **Step 1: Run typecheck + lint + build**

```bash
pnpm typecheck && pnpm lint && pnpm build
```

Expected: typecheck and build pass; lint may report the pre-existing failure in `code/trigger/example.ts` (unrelated, OK to ignore).

- [ ] **Step 2: Ask the user to verify in the browser**

Send the user this checklist:

> Please load `http://localhost:3000/employer` while signed in as an employer and confirm:
> - Header shows org name, **date-range pills (7d / 30d / 90d / All)**, and the "+ Post a job" CTA.
> - Clicking 7d / 90d / All updates the URL to `?range=...` and the KPI strip + funnel + chart + roles section all change values. Clicking 30d removes the param.
> - **Hiring funnel** appears below KPI strip with 4 stage bars (Applied → Review → Interview → Offer), descending heights, conversion percents, and a "Not selected: N" pill if any rejections exist.
> - **Applications chart** appears below Inbox/Stale with two lines (Applied solid blue, Reviewed-or-deeper dashed dark blue) and date ticks on the bottom axis.
> - **Roles by family** sits side-by-side with Plan & quota, showing sector bars in graduated brand-blue opacity.
> - Inbox queue / Stale alerts / Pipeline / Plan / Activity sections all render unchanged from v1.

- [ ] **Step 3: No commit (verification only)**

If a defect is found, treat the fix as a follow-up task: identify the file, edit, run typecheck + lint, commit with `fix(employer-dashboard): <issue>`.

---

## Task 14: Tests (deferred)

When the test infrastructure exists, add the following. Each is its own follow-up.

- **Vitest:** unit tests for the four range-aware procedures (`getKpis`, `getFunnel`, `getApplicationsTimeseries`, `getApplicantsBySector`). Concrete assertions:
  - `getKpis`: `applicantsInRange` excludes apps before `cutoff`; `applicantsTotal` ignores `range`; `range="all"` returns all-time counts.
  - `getFunnel`: cumulative counts decrease monotonically; `pctOfPrev` for the first stage is `null`; `rejectedCount` is independent; an empty range returns the empty-stages shape.
  - `getApplicationsTimeseries`: missing buckets are front-filled with zeros; `granularity` matches `range`; `reviewedOrDeeper` excludes `submitted` and `rejected`.
  - `getApplicantsBySector`: `pct` sums to ~100%; zero-count sectors are omitted; `other` sorts last.
- **Playwright visual:** `/employer?range=30d` and `/employer?range=7d` snapshots — pin the active pill state and the section content.
- **URL-state interaction:** clicking a pill updates the URL and re-renders trend sections without affecting Inbox/Stale/Pipeline.

Do not start until tests are explicitly green-lit.

---

## Self-review checklist (run after writing this plan)

- [x] **Spec coverage:**
  - §2 layout — Tasks 3, 6, 9, 11 add the four new sections; Task 11 restructures the Plan/Activity row
  - §3 date-range filter — Task 1 (helper), Task 2 (component), Task 3 (URL plumbing)
  - §4.1 `getKpis` refactor — Task 4
  - §4.2 `getFunnel` — Task 5
  - §4.3 `getApplicationsTimeseries` — Task 8
  - §4.4 `getApplicantsBySector` — Task 10
  - §5 new components — all 4 covered + the chart primitive (Task 7)
  - §6 brand translation — concrete colors / tokens used in Task 6, 7, 9, 11
  - §7 empty/loading/error — empty states inline; loading covered by Task 12; per-section Suspense in Tasks 6/9/11
  - §8 testing — Task 14
  - §9 build order — followed
- [x] **No placeholders:** every code-bearing step has complete code; the "Tests deferred" task lists concrete assertions, not "add tests".
- [x] **Type consistency:** `Range` type defined in Task 1, reused in Tasks 2/4/6/9/11. `rangeToCutoff` defined Task 1, reused in Tasks 4/5/8/10. `floorTo`/`advance` defined Task 8, used only in Task 8. `ApplicationStatus` (existing) consumed by Task 5.
- [x] **No new dependencies.**
