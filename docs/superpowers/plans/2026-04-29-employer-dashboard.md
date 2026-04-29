# Employer Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an aggregating dashboard at `/employer` that gives employers an action-oriented top half ("what do I do next") and an org-health bottom half ("is everything OK"), per the spec at `docs/superpowers/specs/2026-04-29-employer-dashboard-design.md`.

**Architecture:** A Server Component page with one layout shell + six section components, each its own async RSC inside a `<Suspense>` boundary. Four new tRPC procedures on `employerRouter` aggregate the data; existing `employer.getKpis` and `billing.getCurrent` are reused. No schema changes.

**Tech Stack:** Next.js App Router (RSC), tRPC, Drizzle (Neon Postgres), Tailwind, shadcn/ui primitives, Lato typography, brand `#1CAAE2`.

**Testing posture:** Per the design spec §8 and explicit user instruction, automated tests are deferred. Each task verifies via `pnpm typecheck` + `pnpm lint`. Task 14 is a manual smoke test. A final Task 15 lists the test inventory to add when the test infrastructure is set up.

---

## File Structure

| Path | Status | Responsibility |
|---|---|---|
| `src/lib/application-stages.ts` | Create | Shared stage mapping (DB status → stage key → label/step). Used by both dashboards. |
| `src/lib/time.ts` | Create | `timeAgo(d: Date): string` — relative-time formatter. |
| `src/app/(app)/dashboard/page.tsx` | Modify | Import shared mapping/timeAgo instead of inline copies. |
| `src/server/api/routers/employer.ts` | Modify | Append four new procedures: `getInboxQueue`, `getStaleAlerts`, `getPipelineByJob`, `getRecentActivity`. |
| `src/app/(app)/employer/page.tsx` | Create | Dashboard RSC — auth/role guard + layout shell + Suspense boundaries. |
| `src/app/(app)/employer/loading.tsx` | Create | Skeleton fallback for the entire dashboard. |
| `src/app/(app)/employer/_components/kpi-strip.tsx` | Create | Pure render. 4 KPI tiles. |
| `src/app/(app)/employer/_components/plan-quota-card.tsx` | Create | Async RSC. Plan name, posts used / quota, billing link. |
| `src/app/(app)/employer/_components/inbox-queue.tsx` | Create | Async RSC. New applicants awaiting first review. |
| `src/app/(app)/employer/_components/stale-alerts.tsx` | Create | Async RSC. Stuck applicants + cold jobs. |
| `src/app/(app)/employer/_components/pipeline-by-job.tsx` | Create | Async RSC. One row per published job × stage counts. |
| `src/app/(app)/employer/_components/recent-activity.tsx` | Create | Async RSC. Last N events: status changes, jobs published, members joined. |
| `src/app/(app)/employer/onboarding/employer-onboarding-client.tsx` | Modify | Post-onboarding redirect target → `/employer`. |
| `src/components/marketing/user-menu.tsx` | Modify | Employer "Dashboard" link points to `/employer` and is shown for employers. |

---

## Task 1: Extract shared stage mapping

**Files:**
- Create: `src/lib/application-stages.ts`
- Modify: `src/app/(app)/dashboard/page.tsx`

- [ ] **Step 1: Create `src/lib/application-stages.ts`**

```ts
import type { applicationStatusEnum } from "@/server/db/schema/enums";

export type ApplicationStatus = (typeof applicationStatusEnum.enumValues)[number];

export type StageKey =
  | "applied"
  | "review"
  | "interview"
  | "offer"
  | "rejected";

export const STAGE_FROM_DB: Record<ApplicationStatus, StageKey> = {
  submitted: "applied",
  reviewed: "review",
  interview: "interview",
  offer: "offer",
  rejected: "rejected",
};

export const STAGE_LABEL: Record<StageKey, string> = {
  applied: "Applied",
  review: "Under review",
  interview: "Interview",
  offer: "Offer received",
  rejected: "Not selected",
};

export const STAGE_STEP: Record<StageKey, number> = {
  applied: 1,
  review: 2,
  interview: 3,
  offer: 5,
  rejected: 2,
};

export const STAGE_TOTAL = 5;
```

- [ ] **Step 2: Update `src/app/(app)/dashboard/page.tsx` to import from the shared module**

Remove the inline `type DbStatus`, `type StageKey`, and the four `STAGE_*` constants (lines 28–54 of the current file). Replace with an import at the top of the imports block:

```ts
import {
  STAGE_FROM_DB,
  STAGE_LABEL,
  STAGE_STEP,
  STAGE_TOTAL,
  type StageKey,
  type ApplicationStatus,
} from "@/lib/application-stages";
```

Anywhere the file currently uses the local `DbStatus` type, replace with `ApplicationStatus`.

- [ ] **Step 3: Verify typecheck + lint**

```bash
pnpm typecheck && pnpm lint
```

Expected: both pass with no new errors related to `dashboard/page.tsx` or `application-stages.ts`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/application-stages.ts src/app/\(app\)/dashboard/page.tsx
git commit -m "refactor(dashboard): extract shared application-stage mapping"
```

---

## Task 2: Extract timeAgo helper

**Files:**
- Create: `src/lib/time.ts`
- Modify: `src/app/(app)/dashboard/page.tsx`

- [ ] **Step 1: Create `src/lib/time.ts`**

```ts
export function timeAgo(d: Date | string): string {
  const ms = Date.now() - new Date(d).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}
```

- [ ] **Step 2: Update `src/app/(app)/dashboard/page.tsx`**

Remove the inline `function timeAgo(d: Date): string { ... }` (lines 56–67 of the original file).
Add an import at the top:

```ts
import { timeAgo } from "@/lib/time";
```

- [ ] **Step 3: Verify typecheck + lint**

```bash
pnpm typecheck && pnpm lint
```

Expected: both pass.

- [ ] **Step 4: Commit**

```bash
git add src/lib/time.ts src/app/\(app\)/dashboard/page.tsx
git commit -m "refactor(dashboard): extract timeAgo helper to src/lib/time.ts"
```

---

## Task 3: Add `employer.getInboxQueue` procedure

**Files:**
- Modify: `src/server/api/routers/employer.ts`

- [ ] **Step 1: Add the import for `profiles` if not present**

In `src/server/api/routers/employer.ts`, ensure `profiles` is in the schema import. Update the import block at the top:

```ts
import {
  applications,
  employerOrgs,
  jobListings,
  orgMembers,
  profiles,
  user,
} from "@/server/db/schema";
```

(Add `profiles` if it isn't there; leave the others as-is.)

- [ ] **Step 2: Add `desc` to the drizzle-orm import**

Update the first line:

```ts
import { and, desc, eq, gte, isNull, lt, sql } from "drizzle-orm";
```

(Add `desc`, `isNull`, and `lt` — they're used by Tasks 3–6.)

- [ ] **Step 3: Add the procedure to `employerRouter`**

Inside `employerRouter = router({ ... })`, insert the procedure below right after `getKpis` ends (`getKpis: protectedProcedure.query(...).query(...)),` — the new procedure follows the trailing comma):

```ts
  getInboxQueue: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(20).default(5),
      }),
    )
    .query(async ({ ctx, input }) => {
      const orgId = await findMyOrg(ctx);
      if (!orgId) return { items: [], totalCount: 0 };

      const items = await ctx.db
        .select({
          applicationId: applications.id,
          jobId: jobListings.id,
          jobTitle: jobListings.title,
          candidateId: user.id,
          candidateName: user.name,
          candidateHeadline: profiles.headline,
          appliedAt: applications.createdAt,
        })
        .from(applications)
        .innerJoin(jobListings, eq(jobListings.id, applications.jobId))
        .innerJoin(user, eq(user.id, applications.candidateId))
        .leftJoin(profiles, eq(profiles.userId, applications.candidateId))
        .where(
          and(
            eq(jobListings.orgId, orgId),
            eq(applications.status, "submitted"),
          ),
        )
        .orderBy(desc(applications.createdAt))
        .limit(input.limit);

      const [total] = await ctx.db
        .select({ count: sql<number>`count(*)::int` })
        .from(applications)
        .innerJoin(jobListings, eq(jobListings.id, applications.jobId))
        .where(
          and(
            eq(jobListings.orgId, orgId),
            eq(applications.status, "submitted"),
          ),
        );

      return { items, totalCount: total?.count ?? 0 };
    }),
```

- [ ] **Step 4: Verify typecheck + lint**

```bash
pnpm typecheck && pnpm lint
```

Expected: both pass.

- [ ] **Step 5: Commit**

```bash
git add src/server/api/routers/employer.ts
git commit -m "feat(employer): add getInboxQueue tRPC procedure"
```

---

## Task 4: Add `employer.getStaleAlerts` procedure

**Files:**
- Modify: `src/server/api/routers/employer.ts`

- [ ] **Step 1: Add the procedure**

Insert into `employerRouter`, immediately after `getInboxQueue`:

```ts
  getStaleAlerts: protectedProcedure.query(async ({ ctx }) => {
    const orgId = await findMyOrg(ctx);
    if (!orgId) return { staleApplicants: [], coldJobs: [] };

    const staleCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const coldCutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    const staleApplicantsRaw = await ctx.db
      .select({
        applicationId: applications.id,
        jobId: jobListings.id,
        jobTitle: jobListings.title,
        candidateName: user.name,
        updatedAt: applications.updatedAt,
      })
      .from(applications)
      .innerJoin(jobListings, eq(jobListings.id, applications.jobId))
      .innerJoin(user, eq(user.id, applications.candidateId))
      .where(
        and(
          eq(jobListings.orgId, orgId),
          sql`${applications.status} IN ('submitted','reviewed')`,
          lt(applications.updatedAt, staleCutoff),
        ),
      )
      .orderBy(applications.updatedAt)
      .limit(10);

    const staleApplicants = staleApplicantsRaw.map((r) => ({
      applicationId: r.applicationId,
      jobId: r.jobId,
      jobTitle: r.jobTitle,
      candidateName: r.candidateName,
      daysSinceUpdate: Math.floor(
        (Date.now() - new Date(r.updatedAt).getTime()) / (24 * 60 * 60 * 1000),
      ),
    }));

    const coldJobsRaw = await ctx.db
      .select({
        jobId: jobListings.id,
        jobTitle: jobListings.title,
        publishedAt: jobListings.publishedAt,
      })
      .from(jobListings)
      .leftJoin(applications, eq(applications.jobId, jobListings.id))
      .where(
        and(
          eq(jobListings.orgId, orgId),
          eq(jobListings.status, "published"),
          lt(jobListings.publishedAt, coldCutoff),
          isNull(applications.id),
        ),
      )
      .limit(10);

    const coldJobs = coldJobsRaw.map((r) => ({
      jobId: r.jobId,
      jobTitle: r.jobTitle,
      daysSincePosted: r.publishedAt
        ? Math.floor(
            (Date.now() - new Date(r.publishedAt).getTime()) /
              (24 * 60 * 60 * 1000),
          )
        : 0,
    }));

    return { staleApplicants, coldJobs };
  }),
```

- [ ] **Step 2: Verify typecheck + lint**

```bash
pnpm typecheck && pnpm lint
```

Expected: both pass.

- [ ] **Step 3: Commit**

```bash
git add src/server/api/routers/employer.ts
git commit -m "feat(employer): add getStaleAlerts tRPC procedure"
```

---

## Task 5: Add `employer.getPipelineByJob` procedure

**Files:**
- Modify: `src/server/api/routers/employer.ts`

- [ ] **Step 1: Add the procedure**

Insert into `employerRouter`, immediately after `getStaleAlerts`:

```ts
  getPipelineByJob: protectedProcedure.query(async ({ ctx }) => {
    const orgId = await findMyOrg(ctx);
    if (!orgId) return [];

    const rows = await ctx.db
      .select({
        jobId: jobListings.id,
        jobTitle: jobListings.title,
        status: applications.status,
        count: sql<number>`count(${applications.id})::int`,
      })
      .from(jobListings)
      .leftJoin(applications, eq(applications.jobId, jobListings.id))
      .where(
        and(
          eq(jobListings.orgId, orgId),
          eq(jobListings.status, "published"),
        ),
      )
      .groupBy(jobListings.id, jobListings.title, applications.status);

    const byJob = new Map<
      string,
      {
        jobId: string;
        jobTitle: string;
        counts: {
          applied: number;
          review: number;
          interview: number;
          offer: number;
          rejected: number;
        };
        totalApplicants: number;
      }
    >();

    for (const r of rows) {
      const existing = byJob.get(r.jobId) ?? {
        jobId: r.jobId,
        jobTitle: r.jobTitle,
        counts: { applied: 0, review: 0, interview: 0, offer: 0, rejected: 0 },
        totalApplicants: 0,
      };
      if (r.status) {
        const stage = STAGE_FROM_DB[r.status];
        existing.counts[stage] += r.count;
        existing.totalApplicants += r.count;
      }
      byJob.set(r.jobId, existing);
    }

    return [...byJob.values()].sort((a, b) =>
      a.jobTitle.localeCompare(b.jobTitle),
    );
  }),
```

- [ ] **Step 2: Add the import at the top of `employer.ts`**

Add this with the other `@/...` imports near the top of the file:

```ts
import { STAGE_FROM_DB } from "@/lib/application-stages";
```

- [ ] **Step 3: Verify typecheck + lint**

```bash
pnpm typecheck && pnpm lint
```

Expected: both pass.

- [ ] **Step 4: Commit**

```bash
git add src/server/api/routers/employer.ts
git commit -m "feat(employer): add getPipelineByJob tRPC procedure"
```

---

## Task 6: Add `employer.getRecentActivity` procedure

**Files:**
- Modify: `src/server/api/routers/employer.ts`

- [ ] **Step 1: Add the procedure**

Insert into `employerRouter`, immediately after `getPipelineByJob`:

```ts
  getRecentActivity: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(20).default(8),
      }),
    )
    .query(async ({ ctx, input }) => {
      const orgId = await findMyOrg(ctx);
      if (!orgId) return [];

      const fetchN = input.limit;

      const statusEvents = await ctx.db
        .select({
          at: applications.updatedAt,
          applicationId: applications.id,
          jobTitle: jobListings.title,
          candidateName: user.name,
          toStatus: applications.status,
        })
        .from(applications)
        .innerJoin(jobListings, eq(jobListings.id, applications.jobId))
        .innerJoin(user, eq(user.id, applications.candidateId))
        .where(eq(jobListings.orgId, orgId))
        .orderBy(desc(applications.updatedAt))
        .limit(fetchN);

      const publishEvents = await ctx.db
        .select({
          at: jobListings.publishedAt,
          jobId: jobListings.id,
          jobTitle: jobListings.title,
        })
        .from(jobListings)
        .where(
          and(
            eq(jobListings.orgId, orgId),
            eq(jobListings.status, "published"),
          ),
        )
        .orderBy(desc(jobListings.publishedAt))
        .limit(fetchN);

      const memberEvents = await ctx.db
        .select({
          at: orgMembers.acceptedAt,
          memberId: orgMembers.id,
          memberName: user.name,
          role: orgMembers.role,
        })
        .from(orgMembers)
        .leftJoin(user, eq(user.id, orgMembers.userId))
        .where(eq(orgMembers.orgId, orgId))
        .orderBy(desc(orgMembers.acceptedAt))
        .limit(fetchN);

      type Event =
        | {
            kind: "application_status_changed";
            at: Date;
            applicationId: string;
            jobTitle: string;
            candidateName: string;
            toStatus: ApplicationStatus;
          }
        | {
            kind: "job_published";
            at: Date;
            jobId: string;
            jobTitle: string;
          }
        | {
            kind: "member_joined";
            at: Date;
            memberId: string;
            memberName: string;
            role: string;
          };

      const merged: Event[] = [
        ...statusEvents.map((e) => ({
          kind: "application_status_changed" as const,
          at: e.at,
          applicationId: e.applicationId,
          jobTitle: e.jobTitle,
          candidateName: e.candidateName,
          toStatus: e.toStatus as ApplicationStatus,
        })),
        ...publishEvents
          .filter((e): e is typeof e & { at: Date } => Boolean(e.at))
          .map((e) => ({
            kind: "job_published" as const,
            at: e.at,
            jobId: e.jobId,
            jobTitle: e.jobTitle,
          })),
        ...memberEvents
          .filter(
            (e): e is typeof e & { at: Date; memberName: string } =>
              Boolean(e.at) && Boolean(e.memberName),
          )
          .map((e) => ({
            kind: "member_joined" as const,
            at: e.at,
            memberId: e.memberId,
            memberName: e.memberName,
            role: e.role,
          })),
      ];

      merged.sort((a, b) => b.at.getTime() - a.at.getTime());
      return merged.slice(0, input.limit);
    }),
```

- [ ] **Step 2: Add the type import**

At the top of `employer.ts`, add:

```ts
import type { ApplicationStatus } from "@/lib/application-stages";
```

- [ ] **Step 3: Verify typecheck + lint**

```bash
pnpm typecheck && pnpm lint
```

Expected: both pass.

- [ ] **Step 4: Commit**

```bash
git add src/server/api/routers/employer.ts
git commit -m "feat(employer): add getRecentActivity tRPC procedure"
```

---

## Task 7: Build dashboard page shell + loading skeleton

**Files:**
- Create: `src/app/(app)/employer/page.tsx`
- Create: `src/app/(app)/employer/loading.tsx`

This task wires the auth/role guards and the layout shell with **placeholder content** for each section. Subsequent tasks (8–13) replace each placeholder with a real component.

- [ ] **Step 1: Create `src/app/(app)/employer/page.tsx`**

```tsx
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { employerOrgs, orgMembers } from "@/server/db/schema";
import { getSession } from "@/server/auth";

export const metadata: Metadata = { title: "Dashboard — Energized" };

export default async function EmployerDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in?redirect=/employer");
  if (session.user.role !== "employer") redirect("/dashboard");

  // Resolve org via orgMembers (matches findMyOrg in the router)
  const userId = session.user.id;
  const email = session.user.email.toLowerCase();

  const [byUser] = await db
    .select({ orgId: orgMembers.orgId })
    .from(orgMembers)
    .where(eq(orgMembers.userId, userId))
    .limit(1);

  const orgId =
    byUser?.orgId ??
    (
      await db
        .select({ orgId: orgMembers.orgId })
        .from(orgMembers)
        .where(eq(orgMembers.email, email))
        .limit(1)
    )[0]?.orgId ??
    null;

  if (!orgId) redirect("/employer/onboarding");

  const [org] = await db
    .select({ name: employerOrgs.name })
    .from(employerOrgs)
    .where(eq(employerOrgs.id, orgId))
    .limit(1);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 md:py-10">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black md:text-3xl">
            Welcome back, {org?.name ?? "team"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Here&rsquo;s what needs your attention today.
          </p>
        </div>
        <Link
          href="/employer/jobs/new"
          className="inline-flex items-center rounded-md bg-[#1CAAE2] px-4 py-2 text-sm font-bold text-white hover:opacity-90"
        >
          + Post a job
        </Link>
      </header>

      {/* KPI strip — Task 8 replaces this */}
      <section className="mb-6">
        <div className="rounded-xl border p-4 text-sm text-muted-foreground">
          KPI strip placeholder
        </div>
      </section>

      {/* Inbox + Stale — Tasks 10 & 11 replace these */}
      <section className="mb-6 grid gap-4 md:grid-cols-2">
        <Suspense fallback={<SectionSkeleton title="Inbox" />}>
          <div className="rounded-xl border p-4 text-sm text-muted-foreground">
            Inbox queue placeholder
          </div>
        </Suspense>
        <Suspense fallback={<SectionSkeleton title="Alerts" />}>
          <div className="rounded-xl border p-4 text-sm text-muted-foreground">
            Stale alerts placeholder
          </div>
        </Suspense>
      </section>

      {/* Pipeline by job — Task 12 replaces this */}
      <section className="mb-6">
        <Suspense fallback={<SectionSkeleton title="Pipeline" />}>
          <div className="rounded-xl border p-4 text-sm text-muted-foreground">
            Pipeline by job placeholder
          </div>
        </Suspense>
      </section>

      {/* Plan + Activity — Tasks 9 & 13 replace these */}
      <section className="grid gap-4 md:grid-cols-2">
        <Suspense fallback={<SectionSkeleton title="Plan" />}>
          <div className="rounded-xl border p-4 text-sm text-muted-foreground">
            Plan & quota placeholder
          </div>
        </Suspense>
        <Suspense fallback={<SectionSkeleton title="Activity" />}>
          <div className="rounded-xl border p-4 text-sm text-muted-foreground">
            Recent activity placeholder
          </div>
        </Suspense>
      </section>
    </main>
  );
}

function SectionSkeleton({ title }: { title: string }) {
  return (
    <div className="rounded-xl border p-4">
      <div className="mb-2 h-4 w-24 animate-pulse rounded bg-muted" />
      <div className="h-20 animate-pulse rounded bg-muted/60" />
      <span className="sr-only">Loading {title}</span>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/app/(app)/employer/loading.tsx`**

```tsx
export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 md:py-10">
      <div className="mb-6 h-8 w-64 animate-pulse rounded bg-muted" />
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <div className="h-40 animate-pulse rounded-xl bg-muted" />
        <div className="h-40 animate-pulse rounded-xl bg-muted" />
      </div>
      <div className="mb-6 h-48 animate-pulse rounded-xl bg-muted" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-32 animate-pulse rounded-xl bg-muted" />
        <div className="h-32 animate-pulse rounded-xl bg-muted" />
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Verify typecheck + lint**

```bash
pnpm typecheck && pnpm lint
```

Expected: both pass.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/employer/page.tsx src/app/\(app\)/employer/loading.tsx
git commit -m "feat(employer-dashboard): page shell + loading skeleton at /employer"
```

---

## Task 8: KPI strip

**Files:**
- Create: `src/app/(app)/employer/_components/kpi-strip.tsx`
- Modify: `src/app/(app)/employer/page.tsx`

- [ ] **Step 1: Create `kpi-strip.tsx`**

```tsx
import { api } from "@/lib/trpc/server";

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

export async function KpiStrip() {
  const kpis = await api.employer.getKpis();
  if (!kpis) return null;

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <Tile label="Open roles" value={kpis.openRoles} />
      <Tile
        label="Applicants"
        value={kpis.applicants30d}
        context="Last 30 days"
      />
      <Tile
        label="Profile views"
        value={kpis.profileViews30d}
        context="Last 30 days"
      />
      <Tile label="Total applicants" value={kpis.applicantsTotal} />
    </div>
  );
}
```

- [ ] **Step 2: Wire it into `page.tsx`**

In `src/app/(app)/employer/page.tsx`, replace the KPI placeholder section. Replace this block:

```tsx
      {/* KPI strip — Task 8 replaces this */}
      <section className="mb-6">
        <div className="rounded-xl border p-4 text-sm text-muted-foreground">
          KPI strip placeholder
        </div>
      </section>
```

with:

```tsx
      <section className="mb-6">
        <KpiStrip />
      </section>
```

Add the import at the top of `page.tsx`:

```tsx
import { KpiStrip } from "./_components/kpi-strip";
```

- [ ] **Step 3: Verify typecheck + lint**

```bash
pnpm typecheck && pnpm lint
```

Expected: both pass.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/employer/_components/kpi-strip.tsx src/app/\(app\)/employer/page.tsx
git commit -m "feat(employer-dashboard): KPI strip section"
```

---

## Task 9: Plan & quota card

**Files:**
- Create: `src/app/(app)/employer/_components/plan-quota-card.tsx`
- Modify: `src/app/(app)/employer/page.tsx`

- [ ] **Step 1: Create `plan-quota-card.tsx`**

```tsx
import Link from "next/link";
import { TRPCError } from "@trpc/server";
import { api } from "@/lib/trpc/server";
import { TIERS } from "@/lib/billing-tiers";

export async function PlanQuotaCard() {
  let data;
  try {
    data = await api.billing.getCurrent();
  } catch (err) {
    if (err instanceof TRPCError && err.code === "NOT_FOUND") {
      return (
        <div className="rounded-xl border p-4">
          <div className="text-sm font-bold">Plan &amp; quota</div>
          <p className="mt-2 text-sm text-muted-foreground">
            No org found.
          </p>
        </div>
      );
    }
    throw err;
  }

  const planLabel = data.tier ? TIERS[data.tier].label : "No active plan";
  const quota = data.quota || 0;
  const used = data.publishedThisCycle || 0;
  const pct = quota > 0 ? Math.min(100, Math.round((used / quota) * 100)) : 0;

  return (
    <div className="rounded-xl border p-4">
      <div className="flex items-baseline justify-between">
        <div className="text-sm font-bold">Plan &amp; quota</div>
        <Link
          href="/employer/profile#billing"
          className="text-xs font-bold text-[#1CAAE2] hover:underline"
        >
          Manage billing →
        </Link>
      </div>

      {data.tier ? (
        <>
          <div className="mt-2 text-base font-bold">{planLabel}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {used} of {quota} job posts used this cycle
          </div>
          <div
            className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted"
            aria-label={`${pct}% of quota used`}
          >
            <div
              className="h-full bg-[#1CAAE2]"
              style={{ width: `${pct}%` }}
            />
          </div>
        </>
      ) : (
        <>
          <p className="mt-2 text-sm text-muted-foreground">
            You don&rsquo;t have an active subscription yet.
          </p>
          <Link
            href="/employer/profile#billing"
            className="mt-3 inline-flex items-center rounded-md bg-[#1CAAE2] px-3 py-1.5 text-xs font-bold text-white hover:opacity-90"
          >
            Choose a plan
          </Link>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Wire it into `page.tsx`**

Replace the Plan & quota placeholder. Replace:

```tsx
        <Suspense fallback={<SectionSkeleton title="Plan" />}>
          <div className="rounded-xl border p-4 text-sm text-muted-foreground">
            Plan & quota placeholder
          </div>
        </Suspense>
```

with:

```tsx
        <Suspense fallback={<SectionSkeleton title="Plan" />}>
          <PlanQuotaCard />
        </Suspense>
```

Add the import:

```tsx
import { PlanQuotaCard } from "./_components/plan-quota-card";
```

- [ ] **Step 3: Verify typecheck + lint**

```bash
pnpm typecheck && pnpm lint
```

Expected: both pass.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/employer/_components/plan-quota-card.tsx src/app/\(app\)/employer/page.tsx
git commit -m "feat(employer-dashboard): plan & quota card"
```

---

## Task 10: Inbox queue

**Files:**
- Create: `src/app/(app)/employer/_components/inbox-queue.tsx`
- Modify: `src/app/(app)/employer/page.tsx`

- [ ] **Step 1: Create `inbox-queue.tsx`**

```tsx
import Link from "next/link";
import { api } from "@/lib/trpc/server";
import { timeAgo } from "@/lib/time";

export async function InboxQueue() {
  const { items, totalCount } = await api.employer.getInboxQueue({
    limit: 5,
  });

  if (items.length === 0) {
    return (
      <div className="rounded-xl border p-4">
        <div className="text-sm font-bold">Needs review</div>
        <p className="mt-2 text-sm text-muted-foreground">
          No new applicants right now.
        </p>
      </div>
    );
  }

  const moreCount = totalCount - items.length;

  return (
    <div className="rounded-xl border p-4">
      <div className="flex items-baseline justify-between">
        <div className="text-sm font-bold">Needs review</div>
        <span className="text-xs text-muted-foreground">
          {totalCount} total
        </span>
      </div>

      <ul className="mt-3 divide-y">
        {items.map((row) => (
          <li key={row.applicationId} className="py-2">
            <Link
              href={`/employer/jobs/${row.jobId}/applicants`}
              className="flex items-baseline justify-between gap-3 hover:underline"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-bold">
                  {row.candidateName}
                </div>
                {row.candidateHeadline && (
                  <div className="truncate text-xs text-muted-foreground">
                    {row.candidateHeadline}
                  </div>
                )}
                <div className="truncate text-xs text-muted-foreground">
                  for {row.jobTitle}
                </div>
              </div>
              <div className="shrink-0 text-xs text-muted-foreground">
                {timeAgo(row.appliedAt)}
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {moreCount > 0 && (
        <Link
          href="/employer/jobs"
          className="mt-3 inline-block text-xs font-bold text-[#1CAAE2] hover:underline"
        >
          View {moreCount} more →
        </Link>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Wire it into `page.tsx`**

Replace the Inbox queue placeholder:

```tsx
        <Suspense fallback={<SectionSkeleton title="Inbox" />}>
          <div className="rounded-xl border p-4 text-sm text-muted-foreground">
            Inbox queue placeholder
          </div>
        </Suspense>
```

with:

```tsx
        <Suspense fallback={<SectionSkeleton title="Inbox" />}>
          <InboxQueue />
        </Suspense>
```

Add the import:

```tsx
import { InboxQueue } from "./_components/inbox-queue";
```

- [ ] **Step 3: Verify typecheck + lint**

```bash
pnpm typecheck && pnpm lint
```

Expected: both pass.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/employer/_components/inbox-queue.tsx src/app/\(app\)/employer/page.tsx
git commit -m "feat(employer-dashboard): inbox queue section"
```

---

## Task 11: Stale alerts

**Files:**
- Create: `src/app/(app)/employer/_components/stale-alerts.tsx`
- Modify: `src/app/(app)/employer/page.tsx`

- [ ] **Step 1: Create `stale-alerts.tsx`**

```tsx
import Link from "next/link";
import { api } from "@/lib/trpc/server";

export async function StaleAlerts() {
  const { staleApplicants, coldJobs } = await api.employer.getStaleAlerts();

  if (staleApplicants.length === 0 && coldJobs.length === 0) {
    return (
      <div className="rounded-xl border p-4">
        <div className="text-sm font-bold">Alerts</div>
        <p className="mt-2 text-sm text-muted-foreground">
          All jobs healthy.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border p-4">
      <div className="text-sm font-bold">Alerts</div>

      {staleApplicants.length > 0 && (
        <div className="mt-3">
          <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Stuck applicants
          </div>
          <ul className="mt-1 divide-y">
            {staleApplicants.map((a) => (
              <li key={a.applicationId} className="py-2">
                <Link
                  href={`/employer/jobs/${a.jobId}/applicants`}
                  className="flex items-baseline justify-between gap-3 text-sm hover:underline"
                >
                  <span className="truncate">
                    {a.candidateName}{" "}
                    <span className="text-muted-foreground">
                      · {a.jobTitle}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {a.daysSinceUpdate}d
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {coldJobs.length > 0 && (
        <div className="mt-4">
          <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Cold jobs (no applicants yet)
          </div>
          <ul className="mt-1 divide-y">
            {coldJobs.map((j) => (
              <li key={j.jobId} className="py-2">
                <Link
                  href={`/employer/jobs/${j.jobId}/edit`}
                  className="flex items-baseline justify-between gap-3 text-sm hover:underline"
                >
                  <span className="truncate">{j.jobTitle}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {j.daysSincePosted}d live
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Wire it into `page.tsx`**

Replace the Stale alerts placeholder:

```tsx
        <Suspense fallback={<SectionSkeleton title="Alerts" />}>
          <div className="rounded-xl border p-4 text-sm text-muted-foreground">
            Stale alerts placeholder
          </div>
        </Suspense>
```

with:

```tsx
        <Suspense fallback={<SectionSkeleton title="Alerts" />}>
          <StaleAlerts />
        </Suspense>
```

Add the import:

```tsx
import { StaleAlerts } from "./_components/stale-alerts";
```

- [ ] **Step 3: Verify typecheck + lint**

```bash
pnpm typecheck && pnpm lint
```

Expected: both pass.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/employer/_components/stale-alerts.tsx src/app/\(app\)/employer/page.tsx
git commit -m "feat(employer-dashboard): stale alerts section"
```

---

## Task 12: Pipeline by job

**Files:**
- Create: `src/app/(app)/employer/_components/pipeline-by-job.tsx`
- Modify: `src/app/(app)/employer/page.tsx`

- [ ] **Step 1: Create `pipeline-by-job.tsx`**

```tsx
import Link from "next/link";
import { api } from "@/lib/trpc/server";

const COLS: Array<{
  key: "applied" | "review" | "interview" | "offer";
  label: string;
}> = [
  { key: "applied", label: "Applied" },
  { key: "review", label: "Review" },
  { key: "interview", label: "Interview" },
  { key: "offer", label: "Offer" },
];

export async function PipelineByJob() {
  const rows = await api.employer.getPipelineByJob();

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border p-4">
        <div className="text-sm font-bold">Pipeline</div>
        <p className="mt-2 text-sm text-muted-foreground">
          No published jobs yet.
        </p>
        <Link
          href="/employer/jobs/new"
          className="mt-3 inline-flex items-center rounded-md bg-[#1CAAE2] px-3 py-1.5 text-xs font-bold text-white hover:opacity-90"
        >
          Post a job
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border p-4">
      <div className="text-sm font-bold">Pipeline</div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="py-2 pr-4 font-normal">Job</th>
              {COLS.map((c) => (
                <th key={c.key} className="px-2 py-2 text-right font-normal">
                  {c.label}
                </th>
              ))}
              <th className="py-2 pl-4 text-right font-normal">View</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.jobId} className="border-b last:border-0">
                <td className="py-2 pr-4 font-bold">{r.jobTitle}</td>
                {COLS.map((c) => (
                  <td
                    key={c.key}
                    className="px-2 py-2 text-right tabular-nums"
                  >
                    {r.counts[c.key]}
                  </td>
                ))}
                <td className="py-2 pl-4 text-right">
                  <Link
                    href={`/employer/jobs/${r.jobId}/applicants`}
                    className="text-xs font-bold text-[#1CAAE2] hover:underline"
                  >
                    Open →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire it into `page.tsx`**

Replace the Pipeline placeholder:

```tsx
        <Suspense fallback={<SectionSkeleton title="Pipeline" />}>
          <div className="rounded-xl border p-4 text-sm text-muted-foreground">
            Pipeline by job placeholder
          </div>
        </Suspense>
```

with:

```tsx
        <Suspense fallback={<SectionSkeleton title="Pipeline" />}>
          <PipelineByJob />
        </Suspense>
```

Add the import:

```tsx
import { PipelineByJob } from "./_components/pipeline-by-job";
```

- [ ] **Step 3: Verify typecheck + lint**

```bash
pnpm typecheck && pnpm lint
```

Expected: both pass.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/employer/_components/pipeline-by-job.tsx src/app/\(app\)/employer/page.tsx
git commit -m "feat(employer-dashboard): pipeline-by-job table"
```

---

## Task 13: Recent activity

**Files:**
- Create: `src/app/(app)/employer/_components/recent-activity.tsx`
- Modify: `src/app/(app)/employer/page.tsx`

- [ ] **Step 1: Create `recent-activity.tsx`**

```tsx
import { api } from "@/lib/trpc/server";
import { timeAgo } from "@/lib/time";
import { STAGE_FROM_DB, STAGE_LABEL } from "@/lib/application-stages";

export async function RecentActivity() {
  const events = await api.employer.getRecentActivity({ limit: 8 });

  if (events.length === 0) {
    return (
      <div className="rounded-xl border p-4">
        <div className="text-sm font-bold">Recent activity</div>
        <p className="mt-2 text-sm text-muted-foreground">
          Nothing yet — your team&rsquo;s activity will show up here.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border p-4">
      <div className="text-sm font-bold">Recent activity</div>
      <ul className="mt-3 divide-y">
        {events.map((e, i) => (
          <li key={i} className="flex items-baseline justify-between gap-3 py-2 text-sm">
            <span className="truncate">{renderEvent(e)}</span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {timeAgo(e.at)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function renderEvent(
  e: Awaited<ReturnType<typeof api.employer.getRecentActivity>>[number],
): string {
  switch (e.kind) {
    case "application_status_changed": {
      const stage = STAGE_FROM_DB[e.toStatus];
      return `${e.candidateName} → ${STAGE_LABEL[stage]} · ${e.jobTitle}`;
    }
    case "job_published":
      return `${e.jobTitle} published`;
    case "member_joined":
      return `${e.memberName} joined as ${e.role.replace("_", " ")}`;
  }
}
```

- [ ] **Step 2: Wire it into `page.tsx`**

Replace the Recent activity placeholder:

```tsx
        <Suspense fallback={<SectionSkeleton title="Activity" />}>
          <div className="rounded-xl border p-4 text-sm text-muted-foreground">
            Recent activity placeholder
          </div>
        </Suspense>
```

with:

```tsx
        <Suspense fallback={<SectionSkeleton title="Activity" />}>
          <RecentActivity />
        </Suspense>
```

Add the import:

```tsx
import { RecentActivity } from "./_components/recent-activity";
```

- [ ] **Step 3: Verify typecheck + lint**

```bash
pnpm typecheck && pnpm lint
```

Expected: both pass.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/employer/_components/recent-activity.tsx src/app/\(app\)/employer/page.tsx
git commit -m "feat(employer-dashboard): recent activity feed"
```

---

## Task 14: Migrate the three redirect targets

**Files:**
- Modify: `src/app/(app)/dashboard/page.tsx`
- Modify: `src/app/(app)/employer/onboarding/employer-onboarding-client.tsx`
- Modify: `src/components/marketing/user-menu.tsx`

- [ ] **Step 1: Update `dashboard/page.tsx` employer fall-through**

In `src/app/(app)/dashboard/page.tsx`, find the line:

```ts
  if (session.user.role === "employer") redirect("/employer/profile");
```

Replace with:

```ts
  if (session.user.role === "employer") redirect("/employer");
```

- [ ] **Step 2: Update post-onboarding redirect**

In `src/app/(app)/employer/onboarding/employer-onboarding-client.tsx`, find the line:

```ts
                router.push("/employer/profile");
```

Replace with:

```ts
                router.push("/employer");
```

- [ ] **Step 3: Update `user-menu.tsx`**

In `src/components/marketing/user-menu.tsx`:

(a) Find:

```ts
  const dashboardHref = isEmployer ? "/employer/profile" : "/dashboard";
```

Replace with:

```ts
  const dashboardHref = isEmployer ? "/employer" : "/dashboard";
```

(b) Find:

```tsx
        {!isEmployer && (
          <DropdownMenuItem asChild>
            <Link href={dashboardHref}>Dashboard</Link>
          </DropdownMenuItem>
        )}
```

Replace with:

```tsx
        <DropdownMenuItem asChild>
          <Link href={dashboardHref}>Dashboard</Link>
        </DropdownMenuItem>
```

- [ ] **Step 4: Verify typecheck + lint**

```bash
pnpm typecheck && pnpm lint
```

Expected: both pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(app\)/dashboard/page.tsx src/app/\(app\)/employer/onboarding/employer-onboarding-client.tsx src/components/marketing/user-menu.tsx
git commit -m "feat(employer-dashboard): point Dashboard link + redirects to /employer"
```

---

## Task 15: Manual smoke test

This task is verification, not implementation. Per `~/.claude/projects/-Users-oyatemizyurek-Documents-code-energized/memory/dev_environment.md`, the user runs `pnpm dev` externally on port 3000 — do not start it; ask the user if it isn't running.

- [ ] **Step 1: Run typecheck + lint + build (full pass)**

```bash
pnpm typecheck && pnpm lint && pnpm build
```

Expected: all three succeed. If `pnpm build` flags an unused import or a server-only-in-client violation, fix it before continuing.

- [ ] **Step 2: Confirm dev server is up (do NOT start it)**

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000
```

Expected: `200` (or `307` if redirect to landing). If `000`/connection refused → ask the user to start `pnpm dev`.

- [ ] **Step 3: Hit `/employer` as an unauthenticated request**

```bash
curl -sI http://localhost:3000/employer | head -5
```

Expected: a redirect (`HTTP/1.1 307` or `308`) toward `/sign-in`.

- [ ] **Step 4: Ask the user to verify in the browser**

Send the user this checklist:

> Please load `http://localhost:3000/employer` while signed in as an employer and confirm:
> - Header reads "Welcome back, &lt;org name&gt;" with a working "+ Post a job" CTA.
> - KPI strip shows four numbers (open roles, applicants 30d, profile views 30d, total).
> - Inbox queue lists pending applicants (or empty state copy if none).
> - Stale alerts shows stuck applicants / cold jobs (or "All jobs healthy.").
> - Pipeline-by-job table renders one row per published job with stage counts.
> - Plan & quota card shows current plan + posts-used progress bar.
> - Recent activity shows the latest events.
> - The user-menu "Dashboard" link goes to `/employer`.
> - Visiting `/dashboard` while signed in as an employer redirects to `/employer`.

- [ ] **Step 5: No commit needed (verification only)**

If the user reports a defect, treat the fix as a new task: identify the file, edit, re-run typecheck+lint, commit with message `fix(employer-dashboard): <issue>`.

---

## Task 16: Tests (deferred)

When the test infrastructure is set up, add the following. Each is its own follow-up task with its own TDD cycle.

- **Vitest unit tests** for each new tRPC procedure in `src/server/api/routers/employer.test.ts`. Seed an org, two published jobs, six applications across all five statuses, two members. Assertions per procedure:
  - `getInboxQueue`: returns only `submitted` applications, newest first, respects `limit`, `totalCount` matches.
  - `getStaleAlerts.staleApplicants`: only includes apps in `submitted`/`reviewed` with `updatedAt < now - 7d`.
  - `getStaleAlerts.coldJobs`: only includes published jobs older than 14 days with zero applications.
  - `getPipelineByJob`: only published jobs, counts pivot to all five stages, `totalApplicants` matches sum.
  - `getRecentActivity`: merges and sorts across the three sources by `at` desc, respects `limit`.
- **Playwright E2E + visual snapshot** of `/employer` for the seeded employer in `e2e/employer-dashboard.spec.ts`. Add to the existing visual regression suite (`pnpm e2e:update` to bless the first snapshot).
- **Empty-state snapshot test** that loads `/employer` for an employer with zero jobs/applicants/members and asserts the empty-state copy in each section. Catches accidental brand-voice drift.

Do not start this task until tests are explicitly green-lit by the user.

---

## Self-review checklist (run after writing this plan)

- [x] Spec coverage: all six dashboard sections (§3 of the spec) have a build task. Routing change (§2) is Task 14. Data layer (§5) is Tasks 3–6. Component contracts (§6) match Tasks 8–13. Loading/error states (§7) covered in Task 7. Testing (§8) is Task 16, deferred per spec.
- [x] No placeholders: every code-bearing step contains complete code. The "Tests deferred" task lists concrete assertions, not "add tests".
- [x] Type consistency: `ApplicationStatus` defined in `src/lib/application-stages.ts` (Task 1) and reused in employer router (Tasks 3–6) and `recent-activity.tsx` (Task 13). `STAGE_FROM_DB`/`STAGE_LABEL` reused in Task 12 and 13. `findMyOrg` reused unmodified.
- [x] One new dep audit: zero new top-level dependencies. All imports are either existing modules or new local files.
