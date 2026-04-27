# Candidate Dashboard + PostHog Observability — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the broken `/dashboard` link with a real jobseeker home, and start emitting the PostHog events whose names already exist in `src/lib/analytics-events.ts` (server side) plus a client provider that captures page views and identifies signed-in users.

**Architecture:** Dashboard is a single server component at `src/app/(app)/dashboard/page.tsx` doing direct Drizzle queries (matches the established `/p/[id]`, `/c/[id]`, `/jobs/[id]` pattern). Employers get redirected to `/employer/profile`. Observability uses the existing `getPostHogClient()` server helper in fire-and-forget `try/catch` blocks at the end of mutations, plus a new `PostHogProvider` client component that wraps the root layout and identifies the user via a small `account.me` tRPC query.

**Tech Stack:** Next.js App Router (RSC), Drizzle, Better Auth, posthog-node (server), posthog-js (client), tRPC v11.

**Spec source:** Sections 1 and 2 of the conversation above.

---

## File structure

**New files**
- `src/app/(app)/dashboard/page.tsx` — server component, jobseeker-only with role redirect
- `src/components/posthog-provider.tsx` — client component: `posthog-js` init, page-view capture, identify
- (no new migration; no new schema; no new tRPC router)

**Modified files**
- `src/lib/analytics-events.ts` — add 3 new event constants
- `src/lib/posthog.ts` — add a `safeCapture()` helper that swallows errors and no-ops without an env key
- `src/server/api/routers/jobs.ts` — emit `job.draft.created`, `job.published`, `job.closed`, `job.reopened`
- `src/server/api/routers/applications.ts` — emit `application.submitted`, `application.status_changed`
- `src/server/api/routers/saved-jobs.ts` — emit `job.saved` / `job.unsaved`
- `src/server/api/routers/profile.ts` — emit `profile.updated` on each updater (skim and tag the existing mutations)
- `src/app/layout.tsx` — wrap children in `<PostHogProvider>` inside the existing `<TRPCProvider>`
- (Top nav of `/jobs`, `/jobs/[id]`, `/applications`, `/saved` already links to `/dashboard`; no change needed.)

---

## Task 1: Event registry constants

**Files:**
- Modify: `src/lib/analytics-events.ts`

- [ ] **Step 1: Append three constants**

```ts
// (under the existing Applications group)
export const EVENT_APPLICATION_STATUS_CHANGED = "application.status_changed";

// (under Jobs)
export const EVENT_JOB_SAVED = "job.saved";
export const EVENT_JOB_UNSAVED = "job.unsaved";
```

- [ ] **Step 2: Typecheck + commit**

```bash
pnpm typecheck && git add src/lib/analytics-events.ts && git commit -m "$(cat <<'EOF'
feat(analytics): registry entries for status change + save toggle

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: `safeCapture` helper

**Files:**
- Modify: `src/lib/posthog.ts`

Currently `getPostHogClient()` constructs the singleton even if the env key is unset. Wrap that for use inside mutations.

- [ ] **Step 1: Append the helper**

Add to `src/lib/posthog.ts`:

```ts
type CaptureArgs = {
  distinctId: string;
  event: string;
  properties?: Record<string, unknown>;
};

/**
 * Fire-and-forget event capture. No-ops when the public key is missing
 * (e.g. local dev without PostHog), and swallows errors so a flaky
 * analytics outage cannot break a tRPC mutation.
 */
export async function safeCapture({
  distinctId,
  event,
  properties,
}: CaptureArgs): Promise<void> {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
  try {
    const client = getPostHogClient();
    client.capture({ distinctId, event, properties });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("[posthog] capture failed:", e);
  }
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
pnpm typecheck && git add src/lib/posthog.ts && git commit -m "$(cat <<'EOF'
feat(analytics): safeCapture helper — fire-and-forget, no-op without key

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Server-side event emission in `jobs` router

**Files:**
- Modify: `src/server/api/routers/jobs.ts`

For each mutation listed below, fire `safeCapture` immediately before `return`. All run inside the existing `try` blocks; safeCapture itself swallows errors so we don't need extra wrapping.

- [ ] **Step 1: Add the import**

At the top of `src/server/api/routers/jobs.ts`:

```ts
import { safeCapture } from "@/lib/posthog";
import {
  EVENT_JOB_DRAFT_CREATED,
  EVENT_JOB_PUBLISHED,
  EVENT_JOB_CLOSED,
  EVENT_JOB_REOPENED,
} from "@/lib/analytics-events";
```

- [ ] **Step 2: Wire in `createDraft`**

Find the existing block that returns the draft row (after the `INSERT ... RETURNING`). Before `return row;`, add:

```ts
await safeCapture({
  distinctId: ctx.session.user.id,
  event: EVENT_JOB_DRAFT_CREATED,
  properties: { orgId, jobId: row.id },
});
```

- [ ] **Step 3: Wire in `publish`**

Inside `publish`, after the successful `UPDATE ... returning()` and before `return row;`, add:

```ts
await safeCapture({
  distinctId: ctx.session.user.id,
  event: EVENT_JOB_PUBLISHED,
  properties: {
    orgId,
    jobId: row.id,
    sector: row.sector,
    experienceLevel: row.experienceLevel,
    salaryMin: row.salaryMin,
    salaryMax: row.salaryMax,
  },
});
```

- [ ] **Step 4: Wire in `close`**

Inside `close`, after the UPDATE and before return:

```ts
const daysOpen = existing.publishedAt
  ? Math.max(
      0,
      Math.floor(
        (Date.now() - new Date(existing.publishedAt).getTime()) /
          (24 * 60 * 60 * 1000),
      ),
    )
  : null;
await safeCapture({
  distinctId: ctx.session.user.id,
  event: EVENT_JOB_CLOSED,
  properties: { orgId, jobId: row.id, daysOpen },
});
```

- [ ] **Step 5: Wire in `reopen`**

```ts
await safeCapture({
  distinctId: ctx.session.user.id,
  event: EVENT_JOB_REOPENED,
  properties: { orgId, jobId: row.id },
});
```

- [ ] **Step 6: Typecheck + lint + commit**

```bash
pnpm typecheck && pnpm lint
git add src/server/api/routers/jobs.ts
git commit -m "$(cat <<'EOF'
feat(analytics): emit job lifecycle events from jobs router

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Server-side events in `applications` and `saved-jobs` routers

**Files:**
- Modify: `src/server/api/routers/applications.ts`
- Modify: `src/server/api/routers/saved-jobs.ts`

- [ ] **Step 1: applications.ts imports**

Add to top:

```ts
import { safeCapture } from "@/lib/posthog";
import {
  EVENT_APPLICATION_SUBMITTED,
  EVENT_APPLICATION_STATUS_CHANGED,
} from "@/lib/analytics-events";
```

- [ ] **Step 2: Emit on `submit` mutation**

Inside `submit`, after the successful insert + Trigger.dev call, before `return row;`:

```ts
await safeCapture({
  distinctId: ctx.session.user.id,
  event: EVENT_APPLICATION_SUBMITTED,
  properties: {
    orgId: job.orgId,
    jobId: input.jobId,
    hasCoverNote: Boolean(input.coverNote?.trim()),
    screeningAnswerCount: input.screeningAnswers.length,
  },
});
```

- [ ] **Step 3: Emit on `updateStatus`**

Inside `updateStatus`, capture the previous status BEFORE the UPDATE so we can record the transition. Modify the existing select to also pull `applications.status`:

```ts
const [hit] = await ctx.db
  .select({
    id: applications.id,
    orgId: jobListings.orgId,
    fromStatus: applications.status,   // ← add this
  })
  ...
```

Then after the UPDATE, before `return`:

```ts
await safeCapture({
  distinctId: ctx.session.user.id,
  event: EVENT_APPLICATION_STATUS_CHANGED,
  properties: {
    orgId: hit.orgId,
    applicationId: input.id,
    fromStatus: hit.fromStatus,
    toStatus: input.status,
  },
});
```

- [ ] **Step 4: saved-jobs.ts imports + emission**

Add to top of `src/server/api/routers/saved-jobs.ts`:

```ts
import { safeCapture } from "@/lib/posthog";
import { EVENT_JOB_SAVED, EVENT_JOB_UNSAVED } from "@/lib/analytics-events";
```

Inside `toggle`, in the unsave branch after `DELETE`, before the `return { saved: false }`:

```ts
await safeCapture({
  distinctId: ctx.session.user.id,
  event: EVENT_JOB_UNSAVED,
  properties: { jobId: input.jobId },
});
```

In the save branch, after the `INSERT`, before `return { saved: true }`:

```ts
await safeCapture({
  distinctId: ctx.session.user.id,
  event: EVENT_JOB_SAVED,
  properties: { jobId: input.jobId },
});
```

- [ ] **Step 5: Typecheck + lint + commit**

```bash
pnpm typecheck && pnpm lint
git add src/server/api/routers/applications.ts src/server/api/routers/saved-jobs.ts
git commit -m "$(cat <<'EOF'
feat(analytics): emit application + saved-job events

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

> **Skipping `profile.updated` and `job.draft.updated`** — the profile router's mutations are many small ones; instrumenting each adds noise. Defer to a follow-up. `job.draft.updated` would fire ~every 600ms via autosave — too noisy for product analytics.

---

## Task 5: Client `PostHogProvider`

**Files:**
- Create: `src/components/posthog-provider.tsx`
- Modify: `src/app/layout.tsx`

The provider initializes posthog-js once on mount, captures page views on history change, and identifies the user when a session exists.

- [ ] **Step 1: Write the provider**

Create `src/components/posthog-provider.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { api } from "@/lib/trpc/client";

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST;
let initialized = false;

function ensureInit() {
  if (initialized || !KEY || typeof window === "undefined") return;
  posthog.init(KEY, {
    api_host: HOST ?? "https://us.i.posthog.com",
    capture_pageview: false, // we capture manually below
    person_profiles: "identified_only",
  });
  initialized = true;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const me = api.account.me.useQuery(undefined, { staleTime: Infinity });

  // Initialize once
  useEffect(() => {
    ensureInit();
  }, []);

  // Identify the user when session-tied data arrives
  useEffect(() => {
    if (!initialized || !me.data) return;
    posthog.identify(me.data.id, {
      email: me.data.email,
      role: me.data.role,
    });
  }, [me.data]);

  // Manual page-view capture (App Router doesn't fire history events the
  // way pages-router does; pathname+searchParams covers it).
  useEffect(() => {
    if (!initialized) return;
    const url =
      pathname +
      (searchParams.toString() ? `?${searchParams.toString()}` : "");
    posthog.capture("$pageview", { $current_url: url });
  }, [pathname, searchParams]);

  return <>{children}</>;
}
```

- [ ] **Step 2: Confirm `account.me` query exists**

Open `src/server/api/routers/account.ts` and look for a `me` query. The Plan doc assumes it returns `{ id, email, role }`. If the query is named differently or returns different fields, adapt the provider call (and document the actual field names here before continuing). If `account.me` does NOT exist, ADD it as a one-line `protectedProcedure.query` that returns `{ id: ctx.session.user.id, email: ctx.session.user.email, role: ctx.session.user.role }`.

- [ ] **Step 3: Wrap root layout**

Modify `src/app/layout.tsx`:

```tsx
import { PostHogProvider } from "@/components/posthog-provider";
```

Inside `<body>`, wrap the existing `<TRPCProvider>` children. Final shape:

```tsx
<body className="min-h-full flex flex-col">
  <TRPCProvider>
    <PostHogProvider>
      <OnboardingPersister />
      {children}
    </PostHogProvider>
  </TRPCProvider>
</body>
```

(Provider goes INSIDE TRPCProvider because it uses `api.account.me`.)

- [ ] **Step 4: Typecheck + lint + commit**

```bash
pnpm typecheck && pnpm lint
git add src/components/posthog-provider.tsx src/app/layout.tsx \
       src/server/api/routers/account.ts  # if you added me query
git commit -m "$(cat <<'EOF'
feat(analytics): client posthog provider with pageview + identify

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Dashboard server page

**Files:**
- Create: `src/app/(app)/dashboard/page.tsx`

- [ ] **Step 1: Write the page**

Create `src/app/(app)/dashboard/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { and, desc, eq, inArray, ne, notInArray, sql } from "drizzle-orm";
import { db } from "@/server/db";
import {
  applications,
  employerOrgs,
  jobListings,
  profiles,
  savedJobs,
  workHistory,
} from "@/server/db/schema";
import { getSession } from "@/server/auth";
import { Icon } from "@/components/shared/icon";
import {
  SECTOR_LABELS,
  WORK_SETUP_LABELS,
  formatSalary,
  type JobSector,
  type JobWorkSetup,
} from "@/lib/jobs-options";

export const metadata: Metadata = { title: "Dashboard — Energized" };

const STATUS_CHIP: Record<string, string> = {
  submitted: "v2-chip-outline",
  reviewed: "v2-chip-outline",
  interview: "v2-chip-outline",
  offer: "v2-chip-accent",
  rejected: "v2-chip-coral",
};
const STATUS_LABEL: Record<string, string> = {
  submitted: "Submitted",
  reviewed: "Reviewed",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
};

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in?redirect=/dashboard");
  if (session.user.role === "employer") redirect("/employer/profile");

  const userId = session.user.id;

  // Profile + work history for completeness calc + recommended-for-you
  const [p] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);
  const wh = p
    ? await db
        .select({ id: workHistory.id })
        .from(workHistory)
        .where(eq(workHistory.profileId, p.id))
        .limit(1)
    : [];

  const completeness = (() => {
    if (!p) return 0;
    let score = 0;
    if (p.headline?.trim()) score++;
    if (p.sectors.length > 0) score++;
    if (wh.length > 0) score++;
    if (p.resumeUrl) score++;
    if (p.skills.length > 0) score++;
    return Math.round((score / 5) * 100);
  })();

  // Counters + recent applications
  const recentApplications = await db
    .select({
      id: applications.id,
      status: applications.status,
      createdAt: applications.createdAt,
      jobId: applications.jobId,
      jobTitle: jobListings.title,
      orgName: employerOrgs.name,
      orgLogoColor: employerOrgs.logoColor,
      orgLogoUrl: employerOrgs.logoUrl,
    })
    .from(applications)
    .innerJoin(jobListings, eq(jobListings.id, applications.jobId))
    .innerJoin(employerOrgs, eq(employerOrgs.id, jobListings.orgId))
    .where(eq(applications.candidateId, userId))
    .orderBy(desc(applications.createdAt))
    .limit(3);

  const [appsCountRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(applications)
    .where(eq(applications.candidateId, userId));
  const appsCount = appsCountRow?.count ?? 0;

  // Saved roles (top 4) + total
  const recentSaved = await db
    .select({
      id: savedJobs.id,
      jobId: jobListings.id,
      jobTitle: jobListings.title,
      jobLocation: jobListings.location,
      sector: jobListings.sector,
      workSetup: jobListings.workSetup,
      salaryMin: jobListings.salaryMin,
      salaryMax: jobListings.salaryMax,
      salaryCurrency: jobListings.salaryCurrency,
      salaryPeriod: jobListings.salaryPeriod,
      orgName: employerOrgs.name,
      orgLogoColor: employerOrgs.logoColor,
      orgLogoUrl: employerOrgs.logoUrl,
    })
    .from(savedJobs)
    .innerJoin(jobListings, eq(jobListings.id, savedJobs.jobId))
    .innerJoin(employerOrgs, eq(employerOrgs.id, jobListings.orgId))
    .where(eq(savedJobs.userId, userId))
    .orderBy(desc(savedJobs.createdAt))
    .limit(4);

  const [savedCountRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(savedJobs)
    .where(eq(savedJobs.userId, userId));
  const savedCount = savedCountRow?.count ?? 0;

  // Recommended: published jobs in candidate's preferred sectors,
  // excluding jobs they've already applied to or saved.
  // Falls back to "newest published" if no profile sectors.
  const appliedIdsRows = await db
    .select({ id: applications.jobId })
    .from(applications)
    .where(eq(applications.candidateId, userId));
  const savedIdsRows = await db
    .select({ id: savedJobs.jobId })
    .from(savedJobs)
    .where(eq(savedJobs.userId, userId));
  const excludeIds = [
    ...appliedIdsRows.map((r) => r.id),
    ...savedIdsRows.map((r) => r.id),
  ];

  const sectorPrefs = (p?.sectors ?? []) as JobSector[];
  const recommendedConditions = [eq(jobListings.status, "published")];
  if (sectorPrefs.length > 0) {
    recommendedConditions.push(inArray(jobListings.sector, sectorPrefs));
  }
  if (excludeIds.length > 0) {
    recommendedConditions.push(notInArray(jobListings.id, excludeIds));
  }
  const recommended = await db
    .select({
      id: jobListings.id,
      title: jobListings.title,
      sector: jobListings.sector,
      location: jobListings.location,
      workSetup: jobListings.workSetup,
      salaryMin: jobListings.salaryMin,
      salaryMax: jobListings.salaryMax,
      salaryCurrency: jobListings.salaryCurrency,
      salaryPeriod: jobListings.salaryPeriod,
      orgName: employerOrgs.name,
      orgLogoColor: employerOrgs.logoColor,
      orgLogoUrl: employerOrgs.logoUrl,
    })
    .from(jobListings)
    .innerJoin(employerOrgs, eq(employerOrgs.id, jobListings.orgId))
    .where(and(...recommendedConditions)!)
    .orderBy(desc(jobListings.publishedAt))
    .limit(4);

  const firstName = session.user.name?.split(" ")[0] ?? "there";

  return (
    <div
      className="v2"
      style={{ minHeight: "100vh", background: "var(--v2-ink-50)" }}
    >
      <header
        style={{
          padding: "20px 32px",
          background: "rgba(249,250,252,0.85)",
          backdropFilter: "saturate(180%) blur(14px)",
          WebkitBackdropFilter: "saturate(180%) blur(14px)",
          borderBottom: "1px solid var(--v2-ink-200)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 30,
        }}
      >
        <Link href="/" style={{ display: "flex", alignItems: "center" }}>
          <Image
            src="/energized-logo.svg"
            alt="Energized"
            width={144}
            height={80}
            priority
            style={{ height: 36, width: "auto" }}
          />
        </Link>
        <nav
          style={{
            display: "flex",
            gap: 20,
            alignItems: "center",
            fontSize: 14,
          }}
        >
          <Link href="/jobs" style={{ color: "var(--v2-ink-700)" }}>
            Jobs
          </Link>
          <Link href="/saved" style={{ color: "var(--v2-ink-700)" }}>
            Saved
          </Link>
          <Link href="/applications" style={{ color: "var(--v2-ink-700)" }}>
            Applications
          </Link>
          <Link
            href="/dashboard"
            style={{ color: "var(--v2-ink-900)", fontWeight: 700 }}
          >
            Dashboard
          </Link>
        </nav>
      </header>

      <div
        className="v2-container"
        style={{ paddingTop: 48, paddingBottom: 80, maxWidth: 960 }}
      >
        <div className="v2-eyebrow">Welcome back</div>
        <h1
          className="v2-h2"
          style={{
            fontStyle: "italic",
            fontWeight: 900,
            marginTop: 14,
            marginBottom: 28,
          }}
        >
          Hey, {firstName}.
        </h1>

        {/* KPI strip */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 12,
            marginBottom: 32,
          }}
        >
          <KpiTile label="Applications" value={String(appsCount)} sub="total" />
          <KpiTile label="Saved roles" value={String(savedCount)} sub="now" />
          <KpiTile label="Profile views" value="—" sub="tracking soon" />
          <KpiTile
            label="Profile"
            value={`${completeness}%`}
            sub={completeness === 100 ? "complete" : "finish →"}
            href="/profile"
          />
        </div>

        {/* Recent applications */}
        <Section
          title="Recent applications"
          seeAllHref="/applications"
          empty={
            recentApplications.length === 0
              ? {
                  title: "No applications yet.",
                  body: "Browse roles and apply.",
                  cta: { label: "Browse jobs", href: "/jobs" },
                }
              : null
          }
        >
          <div style={{ display: "grid", gap: 10 }}>
            {recentApplications.map((a) => (
              <Link
                key={a.id}
                href={`/jobs/${a.jobId}`}
                style={listRowStyle}
              >
                <Avatar
                  text={a.orgName.charAt(0).toUpperCase()}
                  imageUrl={a.orgLogoUrl}
                  bg={a.orgLogoColor}
                  size={36}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>
                    {a.jobTitle ?? "Untitled role"}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--v2-ink-500)",
                    }}
                  >
                    {a.orgName} · Applied{" "}
                    {new Date(a.createdAt).toLocaleDateString("en-CA", {
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                </div>
                <span className={`v2-chip ${STATUS_CHIP[a.status] ?? ""}`}>
                  {STATUS_LABEL[a.status] ?? a.status}
                </span>
              </Link>
            ))}
          </div>
        </Section>

        {/* Saved roles */}
        <Section
          title="Saved roles"
          seeAllHref="/saved"
          empty={
            recentSaved.length === 0
              ? {
                  title: "Nothing saved yet.",
                  body: "Bookmark roles from any job page.",
                  cta: { label: "Browse jobs", href: "/jobs" },
                }
              : null
          }
        >
          <div style={{ display: "grid", gap: 10 }}>
            {recentSaved.map((j) => (
              <JobMiniCard key={j.id} row={j} />
            ))}
          </div>
        </Section>

        {/* Recommended */}
        <Section
          title={
            sectorPrefs.length > 0 ? "Recommended for you" : "Newest roles"
          }
          subtitle={
            sectorPrefs.length > 0
              ? `Picked from your sectors: ${sectorPrefs
                  .map((s) => SECTOR_LABELS[s])
                  .join(", ")}`
              : "Pick sectors on your profile for personalized recs."
          }
          empty={
            recommended.length === 0
              ? {
                  title: "Nothing to surface yet.",
                  body: "Check back as employers post more roles.",
                  cta: { label: "Browse all jobs", href: "/jobs" },
                }
              : null
          }
        >
          <div style={{ display: "grid", gap: 10 }}>
            {recommended.map((j) => (
              <JobMiniCard key={j.id} row={j} />
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}

const listRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 12,
  alignItems: "center",
  padding: 14,
  background: "white",
  border: "1px solid var(--v2-ink-200)",
  borderRadius: "var(--v2-r-lg)",
  color: "inherit",
};

function KpiTile({
  label,
  value,
  sub,
  href,
}: {
  label: string;
  value: string;
  sub: string;
  href?: string;
}) {
  const inner = (
    <div
      style={{
        padding: 16,
        background: "white",
        border: "1px solid var(--v2-ink-200)",
        borderRadius: "var(--v2-r-lg)",
      }}
    >
      <div
        style={{
          fontFamily: "var(--v2-font-mono)",
          fontSize: 11,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--v2-ink-600)",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--v2-font-serif)",
          fontSize: 28,
          fontWeight: 900,
          fontStyle: "italic",
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 11,
          color: "var(--v2-ink-500)",
          marginTop: 4,
        }}
      >
        {sub}
      </div>
    </div>
  );
  return href ? (
    <Link href={href} style={{ color: "inherit" }}>
      {inner}
    </Link>
  ) : (
    inner
  );
}

function Section({
  title,
  subtitle,
  seeAllHref,
  empty,
  children,
}: {
  title: string;
  subtitle?: string;
  seeAllHref?: string;
  empty?: { title: string; body: string; cta?: { label: string; href: string } } | null;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginBottom: 32 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 12,
          gap: 12,
        }}
      >
        <div>
          <h3
            className="v2-h3"
            style={{
              fontFamily: "var(--v2-font-serif)",
              fontWeight: 900,
              fontStyle: "italic",
              fontSize: 22,
              letterSpacing: "-0.015em",
            }}
          >
            {title}
          </h3>
          {subtitle && (
            <div
              style={{
                fontSize: 12,
                color: "var(--v2-ink-500)",
                marginTop: 4,
              }}
            >
              {subtitle}
            </div>
          )}
        </div>
        {seeAllHref && (
          <Link
            href={seeAllHref}
            style={{
              fontSize: 12,
              color: "var(--v2-accent-deep)",
              fontWeight: 700,
            }}
          >
            See all →
          </Link>
        )}
      </div>
      {empty ? (
        <div
          style={{
            padding: 28,
            background: "white",
            border: "1px dashed var(--v2-ink-200)",
            borderRadius: "var(--v2-r-lg)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontFamily: "var(--v2-font-serif)",
              fontSize: 18,
              fontWeight: 900,
              fontStyle: "italic",
              marginBottom: 6,
            }}
          >
            {empty.title}
          </div>
          <p
            style={{
              fontSize: 13,
              color: "var(--v2-ink-500)",
              marginBottom: 14,
            }}
          >
            {empty.body}
          </p>
          {empty.cta && (
            <Link
              href={empty.cta.href}
              className="v2-btn v2-btn-primary v2-btn-sm"
            >
              {empty.cta.label}
            </Link>
          )}
        </div>
      ) : (
        children
      )}
    </section>
  );
}

function Avatar({
  text,
  imageUrl,
  bg,
  size,
}: {
  text: string;
  imageUrl: string | null;
  bg: string;
  size: number;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 10,
        background: bg,
        color: "white",
        display: "grid",
        placeItems: "center",
        fontFamily: "var(--v2-font-serif)",
        fontSize: size * 0.4,
        fontWeight: 900,
        overflow: "hidden",
        position: "relative",
        flexShrink: 0,
      }}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      ) : (
        text
      )}
    </div>
  );
}

type MiniRow = {
  jobId: string;
  jobTitle: string | null;
  jobLocation?: string | null;
  location?: string | null;
  sector: string | null;
  workSetup: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  salaryPeriod: string | null;
  orgName: string;
  orgLogoColor: string;
  orgLogoUrl: string | null;
};

function JobMiniCard({ row }: { row: MiniRow }) {
  const id = row.jobId;
  const loc = row.jobLocation ?? row.location ?? null;
  return (
    <Link href={`/jobs/${id}`} style={listRowStyle}>
      <Avatar
        text={row.orgName.charAt(0).toUpperCase()}
        imageUrl={row.orgLogoUrl}
        bg={row.orgLogoColor}
        size={36}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 14 }}>
            {row.jobTitle ?? "Untitled role"}
          </div>
          {row.sector && (
            <span className="v2-chip v2-chip-accent">
              {SECTOR_LABELS[row.sector as JobSector]}
            </span>
          )}
        </div>
        <div
          style={{
            fontSize: 12,
            color: "var(--v2-ink-500)",
            marginTop: 2,
          }}
        >
          {row.orgName}
          {loc && ` · ${loc}`}
          {row.workSetup &&
            ` · ${WORK_SETUP_LABELS[row.workSetup as JobWorkSetup]}`}
          {` · ${formatSalary(
            row.salaryMin,
            row.salaryMax,
            row.salaryCurrency,
            row.salaryPeriod,
          )}`}
        </div>
      </div>
      <Icon name="arrowUpRight" size={14} />
    </Link>
  );
}
```

- [ ] **Step 2: Typecheck + lint + commit**

```bash
pnpm typecheck && pnpm lint
git add "src/app/(app)/dashboard/page.tsx"
git commit -m "$(cat <<'EOF'
feat(dashboard): /dashboard jobseeker home

KPI strip + recent applications + saved roles + recommended-for-you
panel (newest published in the user's preferred sectors, excluding
already-applied/saved). Employers redirect to /employer/profile.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Manual verification

**Files:** none

The user has a dev server on port 3000 (external).

- [ ] **Step 1: Anonymous → /dashboard**

Open `http://localhost:3000/dashboard` in incognito.
Expected: redirect to `/sign-in?redirect=/dashboard`.

- [ ] **Step 2: Employer → /dashboard**

Sign in as an employer, hit `/dashboard`.
Expected: redirect to `/employer/profile`.

- [ ] **Step 3: Jobseeker → /dashboard (cold)**

Sign in as a jobseeker with no profile content. Hit `/dashboard`.
Expected: hello banner, KPI strip with 0/0/—/0%, all 3 sections in empty state with CTAs.

- [ ] **Step 4: Jobseeker → /dashboard (with data)**

Use one of the seed jobseekers (Mara / Jordan / Priya) — they have a profile + 1 work history + 1 application. Confirm:
- KPI strip shows 1 application, 0 saved, —, ~80% complete
- Recent applications: 1 row showing the test role
- Saved: empty state
- Recommended: shows newest published roles in their sector (excluding the one they applied to)

- [ ] **Step 5: PostHog client init**

In any signed-in browser, open devtools → Network. Refresh.
Expected: requests to `https://us.i.posthog.com/decide/?v=...` and `/e/?...` (or your `NEXT_PUBLIC_POSTHOG_HOST`). If no key is set, no requests fire (graceful no-op).

- [ ] **Step 6: PostHog server emission**

As an employer, publish a job. Then in PostHog UI (or logs), look for `job.published` with the right properties on `distinctId = your user id`.
Apply to a job as a jobseeker. Expect `application.submitted`. Save a job. Expect `job.saved`. Move an applicant in the kanban. Expect `application.status_changed` with `fromStatus`/`toStatus`.

- [ ] **Step 7: Final**

`pnpm typecheck && pnpm lint` — pass (modulo the pre-existing `code/trigger/example.ts` `any` warning).

No commit — verification only.

---

## Out of scope (deferred)

- `profile.updated` event emission (defer until we know which fields are worth tracking)
- `job.draft.updated` (autosave noise; would need debouncing)
- `profile_views` capture + the real "Profile views · 30d" KPI (Rich-scope per the brainstorm)
- Separate employer dashboard at `/dashboard` (employers redirect to `/employer/profile` for V1)
- AI-scored "Recommended for you" (just newest-by-sector for now)
- Per-page custom event helpers (e.g. `track('job.viewed')` from the detail page)
