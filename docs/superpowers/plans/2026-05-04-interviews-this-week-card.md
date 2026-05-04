# Interviews "This Week" Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the today-only `<TodaysInterviews>` card on `/employer` with a unified Upcoming/Past tabbed `<InterviewsCard>`, mirror it on the jobseeker `/dashboard`, and add 4 jobseeker- and org-scoped tRPC procs to back both surfaces. See [docs/superpowers/specs/2026-05-04-interviews-this-week-card-design.md](../specs/2026-05-04-interviews-this-week-card-design.md).

**Architecture:** No schema changes. New shared component reads from new procs (`upcomingForOrg`, `recentForOrg`, `upcomingForCandidate`, `recentForCandidate`). Old `todaysForOrg` proc removed. Day-grouping is client-side. Times rendered in viewer TZ via `Intl.DateTimeFormat`.

**Tech Stack:** Next.js App Router · tRPC · Drizzle (Neon HTTP) · React 19. No new top-level dependencies.

**Verification model:** Per project working style ("defer tests by default"), each task ends with `pnpm typecheck` and a quick visual check via the dev server (already running externally on `:3000`). No failing-test-first pattern. Final task is a hand-driven smoke check matching the spec's acceptance criteria.

---

## File Structure

### Created (1 file)

| Path | Responsibility |
|---|---|
| `src/components/shared/interviews-card.tsx` | Unified card with Upcoming/Past tabs, used by both `/employer` and `/dashboard` |

### Modified (3 files)

| Path | Change |
|---|---|
| `src/server/api/routers/interviews.ts` | Remove `todaysForOrg`; add 4 new procs |
| `src/app/(app)/employer/page.tsx` | Swap `<TodaysInterviews>` for `<InterviewsCard mode="employer" orgId={...} />` |
| `src/app/(app)/dashboard/page.tsx` | Render `<InterviewsCard mode="candidate" />` between profile-completeness/stat strip and applications pipeline |

### Deleted (1 file)

| Path | Reason |
|---|---|
| `src/app/(app)/employer/_components/todays-interviews.tsx` | Replaced by `<InterviewsCard>` |

---

## Phase 1 — Server (tRPC procs)

### Task 1: Replace `todaysForOrg` with `upcomingForOrg`

**Files:**
- Modify: `src/server/api/routers/interviews.ts`

- [ ] **Step 1: Remove the old `todaysForOrg` proc**

In `src/server/api/routers/interviews.ts`, locate the `todaysForOrg` proc (currently the last proc, around lines 531–577). Delete the entire proc definition including the leading comma. The router object's last proc before this change is `reschedule` (ending around line 529 with `return { interviewId: newId };` then `}),`).

- [ ] **Step 2: Add `upcomingForOrg` in its place**

Append this proc as the last entry in the `interviewsRouter` object (replacing the deleted `todaysForOrg`):

```ts
  upcomingForOrg: protectedProcedure
    .input(z.object({ orgId: z.string() }))
    .query(async ({ ctx, input }) => {
      const [member] = await ctx.db
        .select({ role: orgMembers.role })
        .from(orgMembers)
        .where(and(eq(orgMembers.orgId, input.orgId), eq(orgMembers.userId, ctx.session.user.id)))
        .limit(1);
      if (!member) throw new TRPCError({ code: "FORBIDDEN" });

      const now = new Date();
      const windowEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const rows = await ctx.db
        .select({
          interviewId: interviews.id,
          applicationId: interviews.applicationId,
          jobId: jobListings.id,
          jobTitle: jobListings.title,
          candidateUserId: applications.candidateId,
          candidateName: user.name,
          candidateAvatarUrl: user.image,
          startsAt: interviewSlots.startsAt,
          durationMin: interviews.durationMin,
          medium: interviews.medium,
          details: interviews.details,
          status: interviews.status,
          cancelReason: interviews.cancelReason,
        })
        .from(interviews)
        .innerJoin(interviewSlots, eq(interviewSlots.id, interviews.confirmedSlotId))
        .innerJoin(applications, eq(applications.id, interviews.applicationId))
        .innerJoin(user, eq(user.id, applications.candidateId))
        .innerJoin(jobListings, eq(jobListings.id, applications.jobId))
        .where(
          and(
            eq(jobListings.orgId, input.orgId),
            eq(interviews.status, "confirmed"),
            gt(interviewSlots.startsAt, now),
            sql`${interviewSlots.startsAt} < ${windowEnd}`,
          ),
        )
        .orderBy(asc(interviewSlots.startsAt));

      return rows;
    }),
```

- [ ] **Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: clean (no errors). The previous `todaysForOrg` consumer (`<TodaysInterviews>`) will still type-check because we haven't touched the component yet — TypeScript treats the now-missing proc as `unknown` only when accessed; the `.useQuery` call site returns `any` until we fix the consumer. If you see a typecheck error here, it's unrelated; investigate before continuing.

- [ ] **Step 4: Commit**

```bash
git add src/server/api/routers/interviews.ts
git commit -m "$(cat <<'EOF'
refactor(interviews): replace todaysForOrg with upcomingForOrg (7d range)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Add `recentForOrg` proc

**Files:**
- Modify: `src/server/api/routers/interviews.ts`

- [ ] **Step 1: Append the proc after `upcomingForOrg`**

Add this proc to the `interviewsRouter` object, immediately after `upcomingForOrg`:

```ts
  recentForOrg: protectedProcedure
    .input(z.object({ orgId: z.string(), limit: z.number().int().min(1).max(100).default(30) }))
    .query(async ({ ctx, input }) => {
      const [member] = await ctx.db
        .select({ role: orgMembers.role })
        .from(orgMembers)
        .where(and(eq(orgMembers.orgId, input.orgId), eq(orgMembers.userId, ctx.session.user.id)))
        .limit(1);
      if (!member) throw new TRPCError({ code: "FORBIDDEN" });

      const now = new Date();
      const windowStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const rows = await ctx.db
        .select({
          interviewId: interviews.id,
          applicationId: interviews.applicationId,
          jobId: jobListings.id,
          jobTitle: jobListings.title,
          candidateUserId: applications.candidateId,
          candidateName: user.name,
          candidateAvatarUrl: user.image,
          startsAt: interviewSlots.startsAt,
          durationMin: interviews.durationMin,
          medium: interviews.medium,
          details: interviews.details,
          status: interviews.status,
          cancelReason: interviews.cancelReason,
          updatedAt: interviews.updatedAt,
        })
        .from(interviews)
        .innerJoin(interviewSlots, eq(interviewSlots.id, interviews.confirmedSlotId))
        .innerJoin(applications, eq(applications.id, interviews.applicationId))
        .innerJoin(user, eq(user.id, applications.candidateId))
        .innerJoin(jobListings, eq(jobListings.id, applications.jobId))
        .where(
          and(
            eq(jobListings.orgId, input.orgId),
            inArray(interviews.status, ["completed", "canceled"]),
            sql`${interviews.updatedAt} >= ${windowStart}`,
            sql`${interviews.updatedAt} <= ${now}`,
          ),
        )
        .orderBy(desc(interviews.updatedAt))
        .limit(input.limit);

      return rows;
    }),
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/server/api/routers/interviews.ts
git commit -m "$(cat <<'EOF'
feat(interviews): add recentForOrg query (last 30 days, completed+canceled)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Add `upcomingForCandidate` proc

**Files:**
- Modify: `src/server/api/routers/interviews.ts`

- [ ] **Step 1: Verify imports include `employerOrgs`**

In `src/server/api/routers/interviews.ts`, the existing import block from `@/server/db/schema` already includes `employerOrgs` (used by other procs). Verify line 6–15 includes it. If not (it should), add `employerOrgs` to the destructured import.

- [ ] **Step 2: Append the proc after `recentForOrg`**

Add this proc to the `interviewsRouter` object, immediately after `recentForOrg`:

```ts
  upcomingForCandidate: protectedProcedure
    .query(async ({ ctx }) => {
      const now = new Date();
      const windowEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const rows = await ctx.db
        .select({
          interviewId: interviews.id,
          applicationId: interviews.applicationId,
          jobId: jobListings.id,
          jobTitle: jobListings.title,
          orgId: employerOrgs.id,
          orgName: employerOrgs.name,
          orgLogoUrl: employerOrgs.logoUrl,
          orgLogoColor: employerOrgs.logoColor,
          startsAt: interviewSlots.startsAt,
          durationMin: interviews.durationMin,
          medium: interviews.medium,
          details: interviews.details,
          status: interviews.status,
          cancelReason: interviews.cancelReason,
        })
        .from(interviews)
        .innerJoin(interviewSlots, eq(interviewSlots.id, interviews.confirmedSlotId))
        .innerJoin(applications, eq(applications.id, interviews.applicationId))
        .innerJoin(jobListings, eq(jobListings.id, applications.jobId))
        .innerJoin(employerOrgs, eq(employerOrgs.id, jobListings.orgId))
        .where(
          and(
            eq(applications.candidateId, ctx.session.user.id),
            eq(interviews.status, "confirmed"),
            gt(interviewSlots.startsAt, now),
            sql`${interviewSlots.startsAt} < ${windowEnd}`,
          ),
        )
        .orderBy(asc(interviewSlots.startsAt));

      return rows;
    }),
```

- [ ] **Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/server/api/routers/interviews.ts
git commit -m "$(cat <<'EOF'
feat(interviews): add upcomingForCandidate query (jobseeker, next 7 days)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Add `recentForCandidate` proc

**Files:**
- Modify: `src/server/api/routers/interviews.ts`

- [ ] **Step 1: Append the proc after `upcomingForCandidate`**

Add this proc as the last entry in the `interviewsRouter` object:

```ts
  recentForCandidate: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).default(30) }))
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const windowStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const rows = await ctx.db
        .select({
          interviewId: interviews.id,
          applicationId: interviews.applicationId,
          jobId: jobListings.id,
          jobTitle: jobListings.title,
          orgId: employerOrgs.id,
          orgName: employerOrgs.name,
          orgLogoUrl: employerOrgs.logoUrl,
          orgLogoColor: employerOrgs.logoColor,
          startsAt: interviewSlots.startsAt,
          durationMin: interviews.durationMin,
          medium: interviews.medium,
          details: interviews.details,
          status: interviews.status,
          cancelReason: interviews.cancelReason,
          updatedAt: interviews.updatedAt,
        })
        .from(interviews)
        .innerJoin(interviewSlots, eq(interviewSlots.id, interviews.confirmedSlotId))
        .innerJoin(applications, eq(applications.id, interviews.applicationId))
        .innerJoin(jobListings, eq(jobListings.id, applications.jobId))
        .innerJoin(employerOrgs, eq(employerOrgs.id, jobListings.orgId))
        .where(
          and(
            eq(applications.candidateId, ctx.session.user.id),
            inArray(interviews.status, ["completed", "canceled"]),
            sql`${interviews.updatedAt} >= ${windowStart}`,
            sql`${interviews.updatedAt} <= ${now}`,
          ),
        )
        .orderBy(desc(interviews.updatedAt))
        .limit(input.limit);

      return rows;
    }),
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/server/api/routers/interviews.ts
git commit -m "$(cat <<'EOF'
feat(interviews): add recentForCandidate query (jobseeker, last 30 days)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 2 — Component

### Task 5: Create `<InterviewsCard>` shared component

**Files:**
- Create: `src/components/shared/interviews-card.tsx`

- [ ] **Step 1: Write the component**

Create `src/components/shared/interviews-card.tsx`:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/trpc/client";
import { Icon } from "@/components/shared/icon";

type Mode = "employer" | "candidate";
type Tab = "upcoming" | "past";

const MEDIUM_ICON = {
  video: "video",
  phone: "phone",
  in_person: "mapPin",
} as const;

type CommonRow = {
  interviewId: string;
  applicationId: string;
  jobId: string;
  jobTitle: string | null;
  startsAt: Date | string;
  durationMin: number;
  medium: "video" | "phone" | "in_person";
  details: string;
  status: "confirmed" | "completed" | "canceled" | "proposed" | "expired";
  cancelReason: string | null;
};

type EmployerRow = CommonRow & {
  candidateUserId: string;
  candidateName: string | null;
  candidateAvatarUrl: string | null;
};

type CandidateRow = CommonRow & {
  orgId: string;
  orgName: string;
  orgLogoUrl: string | null;
  orgLogoColor: string;
};

function toDate(d: Date | string): Date {
  return typeof d === "string" ? new Date(d) : d;
}

function startOfDay(d: Date): number {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c.getTime();
}

function fmtTime(d: Date | string): string {
  return toDate(d).toLocaleString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function dayLabel(dayMs: number, tab: Tab): string {
  const todayMs = startOfDay(new Date());
  const oneDayMs = 24 * 60 * 60 * 1000;
  if (tab === "upcoming") {
    if (dayMs === todayMs) return "TODAY";
    if (dayMs === todayMs + oneDayMs) return "TOMORROW";
  } else {
    if (dayMs === todayMs - oneDayMs) return "YESTERDAY";
  }
  return new Date(dayMs)
    .toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    })
    .toUpperCase();
}

function groupByDay<T extends { startsAt: Date | string }>(
  rows: T[],
): Map<number, T[]> {
  const out = new Map<number, T[]>();
  for (const r of rows) {
    const key = startOfDay(toDate(r.startsAt));
    const arr = out.get(key) ?? [];
    arr.push(r);
    out.set(key, arr);
  }
  return out;
}

function Avatar({
  url,
  fallbackChar,
  fallbackColor,
}: {
  url: string | null;
  fallbackChar: string;
  fallbackColor: string;
}) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={url}
        alt=""
        width={32}
        height={32}
        style={{ borderRadius: 999, objectFit: "cover" }}
      />
    );
  }
  return (
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: 999,
        background: fallbackColor,
        color: "white",
        display: "grid",
        placeItems: "center",
        fontWeight: 800,
        fontSize: 13,
        flexShrink: 0,
      }}
    >
      {fallbackChar.toUpperCase()}
    </div>
  );
}

function StatusChip({
  status,
  cancelReason,
}: {
  status: CommonRow["status"];
  cancelReason: string | null;
}) {
  if (status === "completed") {
    return <span className="v2-chip v2-chip-accent">Completed</span>;
  }
  if (status === "canceled") {
    const reason =
      cancelReason && cancelReason.length > 0
        ? cancelReason === "rescheduled"
          ? "Rescheduled"
          : cancelReason.length > 40
            ? cancelReason.slice(0, 40) + "…"
            : cancelReason
        : null;
    return (
      <span className="v2-chip v2-chip-coral">
        Canceled
        {reason && (
          <span style={{ marginLeft: 6, opacity: 0.8 }}>· {reason}</span>
        )}
      </span>
    );
  }
  return null;
}

function InterviewRow({
  row,
  mode,
  tab,
}: {
  row: EmployerRow | CandidateRow;
  mode: Mode;
  tab: Tab;
}) {
  const isEmployer = mode === "employer";
  const href = isEmployer
    ? `/employer/jobs/${row.jobId}/applicants/${row.applicationId}`
    : `/applications/${row.applicationId}`;

  const primary = isEmployer
    ? ((row as EmployerRow).candidateName ?? "Candidate")
    : (row as CandidateRow).orgName;

  const avatarUrl = isEmployer
    ? (row as EmployerRow).candidateAvatarUrl
    : (row as CandidateRow).orgLogoUrl;

  const fallbackColor = isEmployer
    ? "var(--v2-ink-950)"
    : (row as CandidateRow).orgLogoColor;

  const isVideo = row.medium === "video";
  const isJoinable =
    tab === "upcoming" && isVideo && row.details.startsWith("http");

  return (
    <Link
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        background: "var(--v2-ink-50)",
        borderRadius: 10,
        color: "inherit",
        flexWrap: "wrap",
      }}
    >
      <Avatar
        url={avatarUrl}
        fallbackChar={primary.charAt(0)}
        fallbackColor={fallbackColor}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "var(--v2-ink-950)",
          }}
        >
          {primary}
        </div>
        <div
          style={{
            fontSize: 11,
            color: "var(--v2-ink-500)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {row.jobTitle ?? "Untitled role"}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 13,
          fontWeight: 600,
          color: "var(--v2-ink-950)",
        }}
      >
        <span>
          {fmtTime(row.startsAt)} · {row.durationMin} min
        </span>
        <Icon name={MEDIUM_ICON[row.medium]} size={14} />
      </div>
      {tab === "upcoming" ? (
        isJoinable ? (
          <a
            href={row.details}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="v2-btn v2-btn-ghost v2-btn-sm"
          >
            Join
          </a>
        ) : null
      ) : (
        <StatusChip status={row.status} cancelReason={row.cancelReason} />
      )}
    </Link>
  );
}

function SkeletonRow() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        background: "var(--v2-ink-50)",
        borderRadius: 10,
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 999,
          background: "var(--v2-ink-200)",
        }}
      />
      <div style={{ flex: 1 }}>
        <div
          style={{
            height: 12,
            width: "60%",
            background: "var(--v2-ink-200)",
            borderRadius: 4,
            marginBottom: 6,
          }}
        />
        <div
          style={{
            height: 10,
            width: "40%",
            background: "var(--v2-ink-200)",
            borderRadius: 4,
          }}
        />
      </div>
      <div
        style={{
          width: 70,
          height: 12,
          background: "var(--v2-ink-200)",
          borderRadius: 4,
        }}
      />
    </div>
  );
}

type Props =
  | { mode: "employer"; orgId: string }
  | { mode: "candidate" };

export function InterviewsCard(props: Props) {
  const [tab, setTab] = useState<Tab>("upcoming");

  const upcomingOrg = api.interviews.upcomingForOrg.useQuery(
    props.mode === "employer" ? { orgId: props.orgId } : (undefined as never),
    { enabled: props.mode === "employer" && tab === "upcoming" },
  );
  const recentOrg = api.interviews.recentForOrg.useQuery(
    props.mode === "employer" ? { orgId: props.orgId } : (undefined as never),
    { enabled: props.mode === "employer" && tab === "past" },
  );
  const upcomingCand = api.interviews.upcomingForCandidate.useQuery(undefined, {
    enabled: props.mode === "candidate" && tab === "upcoming",
  });
  const recentCand = api.interviews.recentForCandidate.useQuery(
    {},
    { enabled: props.mode === "candidate" && tab === "past" },
  );

  const isEmployer = props.mode === "employer";
  const upcomingQ = isEmployer ? upcomingOrg : upcomingCand;
  const pastQ = isEmployer ? recentOrg : recentCand;
  const activeQ = tab === "upcoming" ? upcomingQ : pastQ;

  const rows = (activeQ.data ?? []) as Array<EmployerRow | CandidateRow>;
  const grouped = groupByDay(rows);
  const dayKeys = Array.from(grouped.keys()).sort((a, b) =>
    tab === "upcoming" ? a - b : b - a,
  );

  const upcomingCount = upcomingQ.data?.length ?? 0;

  const emptyCopy =
    tab === "upcoming"
      ? "No interviews coming up this week."
      : isEmployer
        ? "No interviews completed in the last 30 days."
        : "Once an interview wraps, it'll show up here.";

  return (
    <section
      style={{
        background: "white",
        border: "1px solid var(--v2-ink-200)",
        borderRadius: "var(--v2-r-lg)",
        padding: 22,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 14,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "var(--v2-ink-950)",
          }}
        >
          Interviews
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            type="button"
            onClick={() => setTab("upcoming")}
            className={
              tab === "upcoming"
                ? "v2-chip v2-chip-accent"
                : "v2-chip"
            }
            style={{ cursor: "pointer", border: "none" }}
          >
            Upcoming
            {upcomingCount > 0 && (
              <span style={{ marginLeft: 6, opacity: 0.85 }}>
                · {upcomingCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setTab("past")}
            className={tab === "past" ? "v2-chip v2-chip-accent" : "v2-chip"}
            style={{ cursor: "pointer", border: "none" }}
          >
            Past
          </button>
        </div>
      </div>

      {activeQ.isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      ) : activeQ.isError ? (
        <div
          style={{
            fontSize: 13,
            color: "var(--v2-ink-500)",
            padding: "12px 0",
          }}
        >
          Couldn&apos;t load interviews.{" "}
          <button
            type="button"
            onClick={() => activeQ.refetch()}
            style={{
              color: "var(--v2-accent-deep)",
              fontWeight: 600,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            Retry
          </button>
        </div>
      ) : rows.length === 0 ? (
        <div
          style={{
            fontSize: 13,
            color: "var(--v2-ink-500)",
            padding: "12px 0",
          }}
        >
          {emptyCopy}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {dayKeys.map((dayMs) => (
            <div key={dayMs}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  color: "var(--v2-ink-500)",
                  marginBottom: 8,
                }}
              >
                {dayLabel(dayMs, tab)}
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {grouped.get(dayMs)!.map((r) => (
                  <InterviewRow
                    key={r.interviewId}
                    row={r}
                    mode={props.mode}
                    tab={tab}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/interviews-card.tsx
git commit -m "$(cat <<'EOF'
feat(interviews): shared <InterviewsCard> with Upcoming/Past tabs

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 3 — Wire-up

### Task 6: Replace `<TodaysInterviews>` on `/employer`

**Files:**
- Modify: `src/app/(app)/employer/page.tsx`

- [ ] **Step 1: Swap the import**

In `src/app/(app)/employer/page.tsx` line 19, replace:

```ts
import { TodaysInterviews } from "./_components/todays-interviews";
```

with:

```ts
import { InterviewsCard } from "@/components/shared/interviews-card";
```

- [ ] **Step 2: Swap the JSX call site**

At line 119 (the `<TodaysInterviews orgId={orgId} />` call), replace it with:

```tsx
<InterviewsCard mode="employer" orgId={orgId} />
```

- [ ] **Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/employer/page.tsx
git commit -m "$(cat <<'EOF'
feat(interviews): swap TodaysInterviews for InterviewsCard on /employer

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Add `<InterviewsCard>` on `/dashboard`

**Files:**
- Modify: `src/app/(app)/dashboard/page.tsx`

- [ ] **Step 1: Add the import**

Near the top of `src/app/(app)/dashboard/page.tsx`, add this import alongside the other component imports (after `import { SiteHeader }` around line 17):

```ts
import { InterviewsCard } from "@/components/shared/interviews-card";
```

- [ ] **Step 2: Render the card inside the left column above the pipeline**

Locate the "MAIN GRID" comment block (around line 293). The "LEFT COLUMN" `div` has `style={{ display: "grid", gap: 24 }}` and its first child is the Applications pipeline `<section className="v2-card">`. Insert the card as the FIRST child of the left column, immediately before that section:

```tsx
            {/* LEFT COLUMN */}
            <div style={{ display: "grid", gap: 24 }}>
              {/* Interviews — Upcoming + Past */}
              <InterviewsCard mode="candidate" />

              {/* Applications pipeline */}
              <section className="v2-card">
```

- [ ] **Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/dashboard/page.tsx
git commit -m "$(cat <<'EOF'
feat(interviews): add InterviewsCard to jobseeker /dashboard

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Delete the old `<TodaysInterviews>` component

**Files:**
- Delete: `src/app/(app)/employer/_components/todays-interviews.tsx`

- [ ] **Step 1: Verify no remaining references**

Run: `grep -rn "TodaysInterviews\|todays-interviews" src/`
Expected: zero hits (the import and JSX were already removed in Task 6).

If any hit appears, fix that file first before deleting — likely a leftover import elsewhere.

- [ ] **Step 2: Delete the file**

Run: `rm src/app/\(app\)/employer/_components/todays-interviews.tsx`

- [ ] **Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add -A src/app/\(app\)/employer/_components/todays-interviews.tsx
git commit -m "$(cat <<'EOF'
refactor(interviews): remove TodaysInterviews (replaced by InterviewsCard)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 4 — Smoke check

### Task 9: Hand-driven smoke test

**Files:** none (verification only)

- [ ] **Step 1: Confirm dev server is up**

Run: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000`
Expected: `200` (or `307` redirect — both fine).

If the server isn't running, ask the user to start it (`pnpm dev` runs externally per project convention).

- [ ] **Step 2: Final typecheck + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: both clean.

- [ ] **Step 3: Sign in as a seeded jobseeker and verify `/dashboard`**

Open `http://localhost:3000/sign-in` in a browser. Sign in as one of the seeded jobseekers (Mara, Jordan, or Priya — see memory `seed_test_data.md`). Navigate to `/dashboard`.

Verify:
- [ ] An "Interviews" card appears in the left column, above the Applications pipeline.
- [ ] Two tab pills are visible: "Upcoming" (highlighted) and "Past".
- [ ] If the seeded data has no confirmed interviews, the empty-state copy "No interviews coming up this week." renders.
- [ ] Clicking the "Past" tab switches the active pill and shows either past rows or "Once an interview wraps, it'll show up here."

- [ ] **Step 4: Sign in as the matching employer and verify `/employer`**

Sign in as the employer that owns those candidates' applications. Navigate to `/employer`.

Verify:
- [ ] The same "Interviews" card replaces the old "Today's interviews" heading.
- [ ] Tabs show Upcoming + Past with the candidate name (not org name).
- [ ] Clicking a row navigates to `/employer/jobs/{jobId}/applicants/{applicationId}`.

- [ ] **Step 5: If no real data exists, schedule a test interview**

In the employer view, open an applicant in the "Interview" pipeline column. Use the existing schedule modal to propose 2 slots — one inside the next 7 days (so it appears on Upcoming after the candidate confirms), one further out. Sign back in as the candidate; on `/applications/{id}` confirm one of the slots.

Then re-verify both dashboards show the new confirmed interview on the Upcoming tab.

- [ ] **Step 6: Update memory**

Update `feature_state_2026_04_27.md` to note: "Interviews 'this week' rollup card shipped on both dashboards (2026-05-04)."

- [ ] **Step 7: Final commit (memory only — no code changes in this step)**

If the memory file was changed:

```bash
git add -A /Users/oyatemizyurek/.claude/projects/-Users-oyatemizyurek-Documents-code-energized/memory/feature_state_2026_04_27.md
```

(Memory lives outside the repo; if the user prefers not to commit it, skip this. The smoke check itself is the point of this task.)

---

## Self-review summary

**Spec coverage:**
- §3 server procs — Tasks 1–4
- §4a shared component — Task 5
- §4b row component — Task 5 (`<InterviewRow>`)
- §4c empty states — Task 5 (`emptyCopy` switch)
- §4d loading state — Task 5 (`<SkeletonRow>`)
- §4e error state — Task 5 (Retry button)
- §4f mobile — Task 5 (`flexWrap: "wrap"` on row)
- §5 file changes — Tasks 5, 6, 7, 8
- §6 edge cases — handled implicitly by component logic + proc filters
- §7 acceptance criteria — Task 9 smoke checklist

**Placeholder scan:** none.

**Type consistency:** `EmployerRow` and `CandidateRow` both extend `CommonRow`; `InterviewRow` uses the union and discriminates via `mode` prop. All proc return shapes in Tasks 1–4 align with the row types in Task 5.
