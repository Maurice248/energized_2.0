# Intro Requests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the "Request intro" CTA on `/p/[id]` functional. Build the bilateral employer-org ↔ jobseeker handshake described in [docs/superpowers/specs/2026-05-05-intro-requests-design.md](../specs/2026-05-05-intro-requests-design.md): pending → accept/decline/cancel, 30-day cooldown after decline, contact unlock (email + phone + resume URL) on accept.

**Architecture:** New `intro_requests` table mirrors the `interviews` shape (status enum, dedicated indexes, fire-on-mutation Trigger.dev tasks). New `introRequests` tRPC router with org-membership gating modeled on the access-helper at the top of [interviews.ts](../../src/server/api/routers/interviews.ts). Public profile button becomes a state machine driven by a single `pendingFromMyOrg` query. Two email templates, two Trigger.dev tasks, four UI surfaces.

**Tech Stack:** Next.js App Router · tRPC · Drizzle (Neon HTTP) · React Email · Resend · Trigger.dev v3 · React 19. No new top-level dependencies.

**Verification model:** Per project working style ("defer tests by default") — each task ends with `pnpm typecheck` and, where UI changed, a quick visual check via the dev server (already running externally on `:3000`). No failing-test-first pattern. Final task is a hand-driven smoke check matching the spec's acceptance criteria.

---

## File Structure

### Created (10 files)

| Path | Responsibility |
|---|---|
| `src/server/db/schema/intro-requests.ts` | `intro_requests` table, `intro_request_status` enum, relations |
| `src/server/api/routers/intro-requests.ts` | `introRequests` router with `requireOrgMembership` helper, 8 procs |
| `src/emails/intro-requested.tsx` | React Email template — candidate sees this |
| `src/emails/intro-accepted.tsx` | React Email template — requester (or owner fallback) sees this |
| `code/trigger/send-intro-requested.ts` | Trigger.dev task fired by `create` |
| `code/trigger/send-intro-accepted.ts` | Trigger.dev task fired by `acceptForMe` |
| `src/components/profile/intro-request-modal.tsx` | Client modal opened by the public profile button |
| `src/components/profile/intro-contact-panel.tsx` | Inline "contact unlocked" panel reused by public profile + employer page |
| `src/app/(app)/employer/intro-requests/page.tsx` | Server component: auth + org gate, hands data to client |
| `src/app/(app)/employer/intro-requests/intro-requests-client.tsx` | Client component: tabs (Pending / Accepted / Declined / All), focus query param, cancel action |

### Modified (6 files)

| Path | Change |
|---|---|
| `src/server/db/schema/notifications.ts` | Add 3 values to `notificationKindEnum`: `intro_requested`, `intro_accepted`, `intro_declined` |
| `src/server/db/schema/index.ts` | Re-export `./intro-requests` |
| `src/server/api/root.ts` | Wire `introRequests` router |
| `src/app/p/[id]/public-profile-client.tsx` | Replace disabled buttons (lines ~275, ~544) with state-driven CTAs + ContactPanel + non-orgmember hide |
| `src/app/(app)/dashboard/page.tsx` | Add `<IntrosCard />` (new component below) between profile-completeness and `<InterviewsCard mode="candidate" />` |
| `src/app/(app)/employer/page.tsx` | Add "Intro requests" link to the inline nav at `:88–110` |

### Auto-generated (1 file)

| Path | Source |
|---|---|
| `src/server/db/migrations/0020_*.sql` | `pnpm db:generate` |

---

## Phase 1 — Schema

### Task 1: New schema file, notification enum extension, migration

**Files:**
- Create: `src/server/db/schema/intro-requests.ts`
- Modify: `src/server/db/schema/notifications.ts`
- Modify: `src/server/db/schema/index.ts`
- Auto-generate: `src/server/db/migrations/0020_*.sql`

- [ ] **Step 1: Create the schema file**

Write `src/server/db/schema/intro-requests.ts`:

```ts
import { relations } from "drizzle-orm";
import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { employerOrgs } from "./employer-orgs";

export const introRequestStatusEnum = pgEnum("intro_request_status", [
  "pending",
  "accepted",
  "declined",
  "canceled",
  "expired",
]);

export const introRequests = pgTable(
  "intro_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => employerOrgs.id, { onDelete: "cascade" }),
    candidateUserId: text("candidate_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    requestedByUserId: text("requested_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    message: text("message"),
    status: introRequestStatusEnum("status").notNull().default("pending"),
    acceptedAt: timestamp("accepted_at"),
    declinedAt: timestamp("declined_at"),
    canceledAt: timestamp("canceled_at"),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    orgCandidateStatusIdx: index("intro_requests_org_candidate_status_idx").on(
      t.orgId,
      t.candidateUserId,
      t.status,
    ),
    candidateStatusCreatedIdx: index(
      "intro_requests_candidate_status_created_idx",
    ).on(t.candidateUserId, t.status, t.createdAt),
    orgStatusCreatedIdx: index("intro_requests_org_status_created_idx").on(
      t.orgId,
      t.status,
      t.createdAt,
    ),
    statusExpiresIdx: index("intro_requests_status_expires_idx").on(
      t.status,
      t.expiresAt,
    ),
  }),
);

export const introRequestsRelations = relations(introRequests, ({ one }) => ({
  org: one(employerOrgs, {
    fields: [introRequests.orgId],
    references: [employerOrgs.id],
  }),
  candidate: one(user, {
    fields: [introRequests.candidateUserId],
    references: [user.id],
  }),
  requestedBy: one(user, {
    fields: [introRequests.requestedByUserId],
    references: [user.id],
  }),
}));
```

- [ ] **Step 2: Extend the notification enum**

In `src/server/db/schema/notifications.ts`, replace the existing `notificationKindEnum` declaration:

```ts
export const notificationKindEnum = pgEnum("notification_kind", [
  "application_received",
  "application_status_changed",
  "team_invite_accepted",
  "interview_proposed",
  "interview_confirmed",
  "interview_canceled",
  "interview_reminder",
  "interview_time_requested",
]);
```

with:

```ts
export const notificationKindEnum = pgEnum("notification_kind", [
  "application_received",
  "application_status_changed",
  "team_invite_accepted",
  "interview_proposed",
  "interview_confirmed",
  "interview_canceled",
  "interview_reminder",
  "interview_time_requested",
  "intro_requested",
  "intro_accepted",
  "intro_declined",
]);
```

- [ ] **Step 3: Re-export the new schema**

In `src/server/db/schema/index.ts`, append a single line at the end:

```ts
export * from "./intro-requests";
```

- [ ] **Step 4: Generate the migration**

Run: `pnpm db:generate`

Expected: drizzle-kit prints something like `Migration 0020_<random_name> created` and writes a file under `src/server/db/migrations/`. The SQL should add the new enum, the new table with all 4 indexes, and 3 `ALTER TYPE notification_kind ADD VALUE` statements (Postgres 12+ supports this).

- [ ] **Step 5: Apply the migration**

Run: `pnpm db:migrate`

Expected: migration applies cleanly against the dev Neon branch. If it fails because of an enum-add inside a transaction (some PG variants), drizzle-kit handles this by emitting separate statements; if you see `ALTER TYPE ... ADD VALUE cannot run inside a transaction block`, edit the generated SQL to put each `ADD VALUE` on its own line outside of any explicit `BEGIN`/`COMMIT` (drizzle's default already does this).

- [ ] **Step 6: Typecheck**

Run: `pnpm typecheck`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add src/server/db/schema/intro-requests.ts \
        src/server/db/schema/notifications.ts \
        src/server/db/schema/index.ts \
        src/server/db/migrations/
git commit -m "$(cat <<'EOF'
feat(intro-requests): schema + migration

intro_requests table with 4 indexes; 3 new values on notification_kind.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 2 — tRPC router

### Task 2: Router skeleton + `requireOrgMembership` helper + root wiring

**Files:**
- Create: `src/server/api/routers/intro-requests.ts`
- Modify: `src/server/api/root.ts`

- [ ] **Step 1: Create the router file with the helper and an empty router export**

Write `src/server/api/routers/intro-requests.ts`:

```ts
import { TRPCError } from "@trpc/server";
import { and, desc, eq, gt } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { z } from "zod";
import { tasks } from "@trigger.dev/sdk/v3";
import { protectedProcedure, router } from "@/server/api/trpc";
import {
  employerOrgs,
  introRequests,
  notifications,
  orgMembers,
  profiles,
  user,
} from "@/server/db/schema";

async function requireOrgMembership(
  ctx: { db: typeof import("@/server/db").db; session: { user: { id: string } } },
): Promise<{ orgId: string; role: "owner" | "admin" | "recruiter" }> {
  const [row] = await ctx.db
    .select({ orgId: orgMembers.orgId, role: orgMembers.role })
    .from(orgMembers)
    .where(eq(orgMembers.userId, ctx.session.user.id))
    .limit(1);
  if (!row) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You must be a member of an employer org.",
    });
  }
  return { orgId: row.orgId, role: row.role as "owner" | "admin" | "recruiter" };
}

export const introRequestsRouter = router({
  // procs added in subsequent tasks
});
```

- [ ] **Step 2: Wire into the appRouter**

In `src/server/api/root.ts`, add the import alongside the existing `interviewsRouter` import:

```ts
import { introRequestsRouter } from "@/server/api/routers/intro-requests";
```

And add the wiring inside the router object (after the existing `interviews` line):

```ts
  introRequests: introRequestsRouter,
```

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: clean. (You will see `'tasks'`, `'sql'`, `'gt'`, `'desc'`, `'and'`, `'employerOrgs'`, `'profiles'`, `'introRequests'`, `'user'`, `'notifications'`, `'z'` warnings about unused imports — that's expected; they get used in subsequent tasks. To silence in the meantime, comment out the unused imports temporarily, but it's simpler to leave them since each procedure adds new uses immediately.)

If lint refuses to compile due to unused imports, prefix the unused import names with `// eslint-disable-next-line @typescript-eslint/no-unused-vars` or just push through to Task 3 immediately and re-run.

- [ ] **Step 4: Commit**

```bash
git add src/server/api/routers/intro-requests.ts src/server/api/root.ts
git commit -m "$(cat <<'EOF'
feat(intro-requests): router skeleton + org-membership helper

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: `create` + `cancel` mutations

**Files:**
- Modify: `src/server/api/routers/intro-requests.ts`

- [ ] **Step 1: Add the `create` mutation inside `introRequestsRouter`**

Inside the `router({})` object in `src/server/api/routers/intro-requests.ts`, add:

```ts
  create: protectedProcedure
    .input(
      z.object({
        candidateUserId: z.string().min(1),
        message: z
          .string()
          .trim()
          .max(1000)
          .optional()
          .transform((v) => (v && v.length > 0 ? v : null)),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { orgId } = await requireOrgMembership(ctx);

      if (input.candidateUserId === ctx.session.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You can't request an intro from yourself.",
        });
      }

      const [candidate] = await ctx.db
        .select({ role: user.role })
        .from(user)
        .where(eq(user.id, input.candidateUserId))
        .limit(1);
      if (!candidate) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Candidate not found." });
      }
      if (candidate.role === "employer") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You can't request an intro from an employer account.",
        });
      }

      // Dedup: any existing pending row for (orgId, candidateUserId)?
      const [pending] = await ctx.db
        .select({ id: introRequests.id })
        .from(introRequests)
        .where(
          and(
            eq(introRequests.orgId, orgId),
            eq(introRequests.candidateUserId, input.candidateUserId),
            eq(introRequests.status, "pending"),
          ),
        )
        .limit(1);
      if (pending) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "An intro request is already pending.",
        });
      }

      // Cooldown: declined within last 30 days?
      const cooldownThreshold = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const [recentDeclined] = await ctx.db
        .select({ declinedAt: introRequests.declinedAt })
        .from(introRequests)
        .where(
          and(
            eq(introRequests.orgId, orgId),
            eq(introRequests.candidateUserId, input.candidateUserId),
            eq(introRequests.status, "declined"),
            gt(introRequests.declinedAt, cooldownThreshold),
          ),
        )
        .orderBy(desc(introRequests.declinedAt))
        .limit(1);
      if (recentDeclined && recentDeclined.declinedAt) {
        const retryAt = new Date(
          recentDeclined.declinedAt.getTime() + 30 * 24 * 60 * 60 * 1000,
        );
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `This candidate declined a recent request — try again after ${retryAt.toISOString().slice(0, 10)}.`,
        });
      }

      const [inserted] = await ctx.db
        .insert(introRequests)
        .values({
          orgId,
          candidateUserId: input.candidateUserId,
          requestedByUserId: ctx.session.user.id,
          message: input.message,
          expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        })
        .returning({ id: introRequests.id });

      // Notif insert (try/catch — DB blip on notif insert won't poison the email send)
      const [orgRow] = await ctx.db
        .select({ name: employerOrgs.name })
        .from(employerOrgs)
        .where(eq(employerOrgs.id, orgId))
        .limit(1);
      try {
        await ctx.db.insert(notifications).values({
          userId: input.candidateUserId,
          kind: "intro_requested",
          title: `${orgRow?.name ?? "An employer"} would like an intro`,
          body: input.message ?? null,
          href: "/dashboard#intros",
        });
      } catch {}

      return { introRequestId: inserted.id };
    }),
```

- [ ] **Step 2: Add the `cancel` mutation right after `create`**

```ts
  cancel: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { orgId } = await requireOrgMembership(ctx);
      const [row] = await ctx.db
        .select({ orgId: introRequests.orgId, status: introRequests.status })
        .from(introRequests)
        .where(eq(introRequests.id, input.id))
        .limit(1);
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      if (row.orgId !== orgId) throw new TRPCError({ code: "FORBIDDEN" });
      if (row.status !== "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This request is no longer pending.",
        });
      }
      await ctx.db
        .update(introRequests)
        .set({ status: "canceled", canceledAt: new Date(), updatedAt: new Date() })
        .where(eq(introRequests.id, input.id));
      return { ok: true };
    }),
```

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/server/api/routers/intro-requests.ts
git commit -m "$(cat <<'EOF'
feat(intro-requests): create + cancel mutations

Enforces dedup (one pending per org/candidate) and 30-day cooldown after
decline. Cancel transitions pending → canceled without starting a cooldown.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: `acceptForMe` + `declineForMe` mutations

**Files:**
- Modify: `src/server/api/routers/intro-requests.ts`

- [ ] **Step 1: Add `acceptForMe` after `cancel`**

```ts
  acceptForMe: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select({
          status: introRequests.status,
          candidateUserId: introRequests.candidateUserId,
          requestedByUserId: introRequests.requestedByUserId,
          orgId: introRequests.orgId,
        })
        .from(introRequests)
        .where(eq(introRequests.id, input.id))
        .limit(1);
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      if (row.candidateUserId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      if (row.status !== "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This request is no longer pending.",
        });
      }

      await ctx.db
        .update(introRequests)
        .set({ status: "accepted", acceptedAt: new Date(), updatedAt: new Date() })
        .where(eq(introRequests.id, input.id));

      // Resolve recipient: requester first, org owner fallback
      let recipientUserId: string | null = row.requestedByUserId;
      if (!recipientUserId) {
        const [owner] = await ctx.db
          .select({ id: user.id })
          .from(orgMembers)
          .innerJoin(user, eq(user.id, orgMembers.userId))
          .where(
            and(
              eq(orgMembers.orgId, row.orgId),
              eq(orgMembers.role, "owner"),
            ),
          )
          .limit(1);
        recipientUserId = owner?.id ?? null;
      }

      const [candidateRow] = await ctx.db
        .select({ name: user.name })
        .from(user)
        .where(eq(user.id, row.candidateUserId))
        .limit(1);

      if (recipientUserId) {
        try {
          await ctx.db.insert(notifications).values({
            userId: recipientUserId,
            kind: "intro_accepted",
            title: `${candidateRow?.name ?? "A candidate"} accepted your intro request`,
            body: null,
            href: `/employer/intro-requests?focus=${input.id}`,
          });
        } catch {}
      }

      return { ok: true };
    }),
```

- [ ] **Step 2: Add `declineForMe` after `acceptForMe`**

```ts
  declineForMe: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select({
          status: introRequests.status,
          candidateUserId: introRequests.candidateUserId,
          requestedByUserId: introRequests.requestedByUserId,
          orgId: introRequests.orgId,
        })
        .from(introRequests)
        .where(eq(introRequests.id, input.id))
        .limit(1);
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      if (row.candidateUserId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      if (row.status !== "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This request is no longer pending.",
        });
      }

      await ctx.db
        .update(introRequests)
        .set({ status: "declined", declinedAt: new Date(), updatedAt: new Date() })
        .where(eq(introRequests.id, input.id));

      // Same recipient resolution as accept (requester then owner fallback)
      let recipientUserId: string | null = row.requestedByUserId;
      if (!recipientUserId) {
        const [owner] = await ctx.db
          .select({ id: user.id })
          .from(orgMembers)
          .innerJoin(user, eq(user.id, orgMembers.userId))
          .where(
            and(
              eq(orgMembers.orgId, row.orgId),
              eq(orgMembers.role, "owner"),
            ),
          )
          .limit(1);
        recipientUserId = owner?.id ?? null;
      }

      if (recipientUserId) {
        try {
          await ctx.db.insert(notifications).values({
            userId: recipientUserId,
            kind: "intro_declined",
            title: "Your intro request was declined",
            body: null,
            href: `/employer/intro-requests?focus=${input.id}`,
          });
        } catch {}
      }

      // Intentional: no email on decline (per spec §6 / Q2 design).
      return { ok: true };
    }),
```

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/server/api/routers/intro-requests.ts
git commit -m "$(cat <<'EOF'
feat(intro-requests): acceptForMe + declineForMe mutations

Both require status='pending' and candidate self-ownership. Accept inserts
intro_accepted notif for requester (or org owner fallback). Decline inserts
intro_declined notif but sends no email — by design.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: `listForOrg` + `inboxForMe` queries

**Files:**
- Modify: `src/server/api/routers/intro-requests.ts`

- [ ] **Step 1: Add `listForOrg`**

```ts
  listForOrg: protectedProcedure
    .input(
      z.object({
        status: z
          .enum(["pending", "accepted", "declined", "canceled", "all"])
          .default("pending"),
        limit: z.number().min(1).max(200).default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { orgId } = await requireOrgMembership(ctx);

      const conditions = [eq(introRequests.orgId, orgId)];
      if (input.status !== "all") {
        conditions.push(eq(introRequests.status, input.status));
      }

      const requesterUser = alias(user, "requested_by_user");

      const rows = await ctx.db
        .select({
          id: introRequests.id,
          status: introRequests.status,
          message: introRequests.message,
          createdAt: introRequests.createdAt,
          acceptedAt: introRequests.acceptedAt,
          declinedAt: introRequests.declinedAt,
          canceledAt: introRequests.canceledAt,
          candidateId: user.id,
          candidateName: user.name,
          candidateImage: user.image,
          candidateHeadline: profiles.headline,
          candidateLocation: profiles.location,
          requestedByName: requesterUser.name,
          requestedByUserId: introRequests.requestedByUserId,
        })
        .from(introRequests)
        .innerJoin(user, eq(user.id, introRequests.candidateUserId))
        .leftJoin(profiles, eq(profiles.userId, introRequests.candidateUserId))
        .leftJoin(
          requesterUser,
          eq(requesterUser.id, introRequests.requestedByUserId),
        )
        .where(and(...conditions))
        .orderBy(desc(introRequests.createdAt))
        .limit(input.limit);

      return rows.map((r) => ({
        id: r.id,
        status: r.status,
        message: r.message,
        candidate: {
          id: r.candidateId,
          name: r.candidateName,
          image: r.candidateImage,
          headline: r.candidateHeadline,
          location: r.candidateLocation,
        },
        requestedBy: r.requestedByUserId
          ? { id: r.requestedByUserId, name: r.requestedByName ?? "" }
          : null,
        createdAt: r.createdAt,
        acceptedAt: r.acceptedAt,
        declinedAt: r.declinedAt,
        canceledAt: r.canceledAt,
      }));
    }),
```

- [ ] **Step 2: Add `inboxForMe`**

```ts
  inboxForMe: protectedProcedure
    .input(
      z.object({
        status: z.enum(["pending", "accepted", "declined", "all"]).default("pending"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(introRequests.candidateUserId, ctx.session.user.id)];
      if (input.status !== "all") {
        conditions.push(eq(introRequests.status, input.status));
      }

      const rows = await ctx.db
        .select({
          id: introRequests.id,
          status: introRequests.status,
          message: introRequests.message,
          createdAt: introRequests.createdAt,
          acceptedAt: introRequests.acceptedAt,
          declinedAt: introRequests.declinedAt,
          orgId: employerOrgs.id,
          orgName: employerOrgs.name,
          orgLogoUrl: employerOrgs.logoUrl,
          requesterName: user.name,
          requesterRole: orgMembers.role,
        })
        .from(introRequests)
        .innerJoin(employerOrgs, eq(employerOrgs.id, introRequests.orgId))
        .leftJoin(user, eq(user.id, introRequests.requestedByUserId))
        .leftJoin(
          orgMembers,
          and(
            eq(orgMembers.userId, introRequests.requestedByUserId),
            eq(orgMembers.orgId, introRequests.orgId),
          ),
        )
        .where(and(...conditions))
        .orderBy(desc(introRequests.createdAt));

      return rows.map((r) => ({
        id: r.id,
        status: r.status,
        message: r.message,
        org: { id: r.orgId, name: r.orgName, logoUrl: r.orgLogoUrl },
        requestedBy: r.requesterName
          ? { name: r.requesterName, role: r.requesterRole ?? "recruiter" }
          : null,
        createdAt: r.createdAt,
        acceptedAt: r.acceptedAt,
        declinedAt: r.declinedAt,
      }));
    }),
```

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: clean.

If you see a TS error about `employerOrgs.logoUrl` being unknown, peek at `src/server/db/schema/employer-orgs.ts` — the field may be named `logo` or `imageUrl`. Use whatever the schema actually exposes; the email template (Task 7) uses the same field, so update both.

- [ ] **Step 4: Commit**

```bash
git add src/server/api/routers/intro-requests.ts
git commit -m "$(cat <<'EOF'
feat(intro-requests): listForOrg + inboxForMe queries

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: `pendingFromMyOrg` + `contactForCandidate` queries

**Files:**
- Modify: `src/server/api/routers/intro-requests.ts`

- [ ] **Step 1: Add `pendingFromMyOrg`**

```ts
  pendingFromMyOrg: protectedProcedure
    .input(z.object({ candidateUserId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      // Soft gate: if caller has no org, return idle (button hidden client-side anyway)
      const [member] = await ctx.db
        .select({ orgId: orgMembers.orgId })
        .from(orgMembers)
        .where(eq(orgMembers.userId, ctx.session.user.id))
        .limit(1);
      if (!member) return { state: "idle" as const };

      const orgId = member.orgId;
      const rows = await ctx.db
        .select({
          id: introRequests.id,
          status: introRequests.status,
          createdAt: introRequests.createdAt,
          acceptedAt: introRequests.acceptedAt,
          declinedAt: introRequests.declinedAt,
        })
        .from(introRequests)
        .where(
          and(
            eq(introRequests.orgId, orgId),
            eq(introRequests.candidateUserId, input.candidateUserId),
          ),
        )
        .orderBy(desc(introRequests.createdAt));

      const pending = rows.find((r) => r.status === "pending");
      if (pending) {
        return {
          state: "pending" as const,
          requestId: pending.id,
          createdAt: pending.createdAt,
        };
      }
      const accepted = rows.find((r) => r.status === "accepted");
      if (accepted && accepted.acceptedAt) {
        return {
          state: "accepted" as const,
          requestId: accepted.id,
          acceptedAt: accepted.acceptedAt,
        };
      }
      const declined = rows.find((r) => r.status === "declined");
      if (declined && declined.declinedAt) {
        const retryAt = new Date(
          declined.declinedAt.getTime() + 30 * 24 * 60 * 60 * 1000,
        );
        if (retryAt > new Date()) {
          const daysRemaining = Math.ceil(
            (retryAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000),
          );
          return {
            state: "declined-cooldown" as const,
            daysRemaining,
            retryAt,
          };
        }
        return { state: "declined-can-retry" as const };
      }
      return { state: "idle" as const };
    }),
```

- [ ] **Step 2: Add `contactForCandidate`**

```ts
  contactForCandidate: protectedProcedure
    .input(z.object({ candidateUserId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const { orgId } = await requireOrgMembership(ctx);

      const [accepted] = await ctx.db
        .select({
          id: introRequests.id,
          acceptedAt: introRequests.acceptedAt,
        })
        .from(introRequests)
        .where(
          and(
            eq(introRequests.orgId, orgId),
            eq(introRequests.candidateUserId, input.candidateUserId),
            eq(introRequests.status, "accepted"),
          ),
        )
        .orderBy(desc(introRequests.acceptedAt))
        .limit(1);

      if (!accepted || !accepted.acceptedAt) {
        return { unlocked: false as const };
      }

      const [contact] = await ctx.db
        .select({
          email: user.email,
          phone: profiles.phone,
          resumeUrl: profiles.resumeUrl,
          resumeFilename: profiles.resumeFilename,
        })
        .from(user)
        .leftJoin(profiles, eq(profiles.userId, user.id))
        .where(eq(user.id, input.candidateUserId))
        .limit(1);

      return {
        unlocked: true as const,
        email: contact?.email ?? "",
        phone: contact?.phone ?? null,
        resumeUrl: contact?.resumeUrl ?? null,
        resumeFilename: contact?.resumeFilename ?? null,
        acceptedAt: accepted.acceptedAt,
      };
    }),
```

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/server/api/routers/intro-requests.ts
git commit -m "$(cat <<'EOF'
feat(intro-requests): pendingFromMyOrg + contactForCandidate queries

pendingFromMyOrg drives the public profile button state machine
(idle/pending/accepted/declined-cooldown/declined-can-retry).
contactForCandidate returns email/phone/resume only when an accepted
row exists for (orgId, candidateUserId).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 3 — Email + Trigger.dev

### Task 7: Both email templates

**Files:**
- Create: `src/emails/intro-requested.tsx`
- Create: `src/emails/intro-accepted.tsx`

- [ ] **Step 1: Write `intro-requested.tsx`**

Create `src/emails/intro-requested.tsx`:

```tsx
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

type Props = {
  candidateName: string | null;
  orgName: string;
  requesterName: string;
  message: string | null;
  appUrl: string; // -> /dashboard#intros
};

export default function IntroRequestedEmail(p: Props) {
  return (
    <Html>
      <Head />
      <Preview>{p.orgName} would like an intro on Energized</Preview>
      <Body style={{ backgroundColor: "#f6f8fa", fontFamily: "Lato, Arial, sans-serif" }}>
        <Container style={{ maxWidth: 560, margin: "32px auto", background: "white", borderRadius: 16, padding: 32 }}>
          <Heading as="h1" style={{ fontSize: 22, color: "#101820" }}>
            {p.orgName} would like an intro
          </Heading>
          <Text>Hey {p.candidateName ?? "there"},</Text>
          <Text>
            <strong>{p.requesterName}</strong> at <strong>{p.orgName}</strong> would like to be introduced to you.
          </Text>
          {p.message && (
            <Section style={{ background: "#f0f7fb", borderRadius: 8, padding: 12, margin: "16px 0" }}>
              <Text style={{ margin: 0, fontStyle: "italic", color: "#004984" }}>{p.message}</Text>
            </Section>
          )}
          <Section style={{ margin: "24px 0" }}>
            <Button href={p.appUrl} style={{ background: "#1CAAE2", color: "white", padding: "12px 20px", borderRadius: 8, textDecoration: "none", fontWeight: 700 }}>
              Review request
            </Button>
          </Section>
          <Text style={{ fontSize: 12, color: "#666" }}>
            You can decline anytime — your contact info stays hidden until you accept.
          </Text>
          <Text style={{ fontSize: 11, color: "#999", marginTop: 32 }}>— Energized</Text>
        </Container>
      </Body>
    </Html>
  );
}
```

- [ ] **Step 2: Write `intro-accepted.tsx`**

Create `src/emails/intro-accepted.tsx`:

```tsx
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

type Props = {
  recipientName: string | null;
  candidateName: string;
  appUrl: string; // -> /employer/intro-requests?focus={id}
};

export default function IntroAcceptedEmail(p: Props) {
  return (
    <Html>
      <Head />
      <Preview>{p.candidateName} accepted your intro request</Preview>
      <Body style={{ backgroundColor: "#f6f8fa", fontFamily: "Lato, Arial, sans-serif" }}>
        <Container style={{ maxWidth: 560, margin: "32px auto", background: "white", borderRadius: 16, padding: 32 }}>
          <Heading as="h1" style={{ fontSize: 22, color: "#101820" }}>
            {p.candidateName} accepted your intro request
          </Heading>
          <Text>Hey {p.recipientName ?? "there"},</Text>
          <Text>
            <strong>{p.candidateName}</strong> accepted your intro request. You can now see their contact info.
          </Text>
          <Section style={{ margin: "24px 0" }}>
            <Button href={p.appUrl} style={{ background: "#1CAAE2", color: "white", padding: "12px 20px", borderRadius: 8, textDecoration: "none", fontWeight: 700 }}>
              Open candidate
            </Button>
          </Section>
          <Text style={{ fontSize: 11, color: "#999", marginTop: 32 }}>— Energized</Text>
        </Container>
      </Body>
    </Html>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/emails/intro-requested.tsx src/emails/intro-accepted.tsx
git commit -m "$(cat <<'EOF'
feat(intro-requests): email templates for requested + accepted

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Both Trigger.dev tasks

**Files:**
- Create: `code/trigger/send-intro-requested.ts`
- Create: `code/trigger/send-intro-accepted.ts`

- [ ] **Step 1: Write `send-intro-requested.ts`**

Create `code/trigger/send-intro-requested.ts`:

```ts
import { logger, task } from "@trigger.dev/sdk/v3";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import {
  employerOrgs,
  introRequests,
  user,
} from "@/server/db/schema";
import { resend } from "@/lib/resend";
import { env } from "@/env";
import IntroRequestedEmail from "@/emails/intro-requested";

type Payload = {
  introRequestId: string;
};

export const sendIntroRequestedTask = task({
  id: "send-intro-requested",
  maxDuration: 60,
  run: async (payload: Payload) => {
    const [row] = await db
      .select({
        message: introRequests.message,
        candidateName: user.name,
        candidateEmail: user.email,
        orgName: employerOrgs.name,
        requesterUserId: introRequests.requestedByUserId,
      })
      .from(introRequests)
      .innerJoin(user, eq(user.id, introRequests.candidateUserId))
      .innerJoin(employerOrgs, eq(employerOrgs.id, introRequests.orgId))
      .where(eq(introRequests.id, payload.introRequestId))
      .limit(1);

    if (!row) {
      logger.warn("send-intro-requested: row not found", payload);
      return { sent: 0 };
    }

    const requesterName = row.requesterUserId
      ? (
          await db
            .select({ name: user.name })
            .from(user)
            .where(eq(user.id, row.requesterUserId))
            .limit(1)
        )[0]?.name ?? "A team member"
      : "A team member";

    const result = await resend.emails.send({
      from: env.EMAIL_FROM,
      to: row.candidateEmail,
      subject: `${row.orgName} would like an intro on Energized`,
      react: IntroRequestedEmail({
        candidateName: row.candidateName ?? null,
        orgName: row.orgName,
        requesterName,
        message: row.message ?? null,
        appUrl: `${env.NEXT_PUBLIC_APP_URL}/dashboard#intros`,
      }),
    });

    if (result.error) {
      logger.warn("send-intro-requested: resend error", {
        introRequestId: payload.introRequestId,
        reason: String(result.error),
      });
      return { sent: 0 };
    }
    return { sent: 1 };
  },
});
```

- [ ] **Step 2: Write `send-intro-accepted.ts`**

Create `code/trigger/send-intro-accepted.ts`:

```ts
import { logger, task } from "@trigger.dev/sdk/v3";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import {
  introRequests,
  orgMembers,
  user,
} from "@/server/db/schema";
import { resend } from "@/lib/resend";
import { env } from "@/env";
import IntroAcceptedEmail from "@/emails/intro-accepted";

type Payload = {
  introRequestId: string;
};

export const sendIntroAcceptedTask = task({
  id: "send-intro-accepted",
  maxDuration: 60,
  run: async (payload: Payload) => {
    const [row] = await db
      .select({
        candidateName: user.name,
        requesterUserId: introRequests.requestedByUserId,
        orgId: introRequests.orgId,
      })
      .from(introRequests)
      .innerJoin(user, eq(user.id, introRequests.candidateUserId))
      .where(eq(introRequests.id, payload.introRequestId))
      .limit(1);

    if (!row) {
      logger.warn("send-intro-accepted: row not found", payload);
      return { sent: 0 };
    }

    let recipient: { id: string; name: string | null; email: string } | null = null;
    if (row.requesterUserId) {
      const [r] = await db
        .select({ id: user.id, name: user.name, email: user.email })
        .from(user)
        .where(eq(user.id, row.requesterUserId))
        .limit(1);
      recipient = r ?? null;
    }
    if (!recipient) {
      const [owner] = await db
        .select({ id: user.id, name: user.name, email: user.email })
        .from(orgMembers)
        .innerJoin(user, eq(user.id, orgMembers.userId))
        .where(
          and(
            eq(orgMembers.orgId, row.orgId),
            eq(orgMembers.role, "owner"),
          ),
        )
        .limit(1);
      recipient = owner ?? null;
    }

    if (!recipient) {
      logger.warn("send-intro-accepted: no recipient resolvable", payload);
      return { sent: 0 };
    }

    const result = await resend.emails.send({
      from: env.EMAIL_FROM,
      to: recipient.email,
      subject: `${row.candidateName ?? "A candidate"} accepted your intro request — contact unlocked`,
      react: IntroAcceptedEmail({
        recipientName: recipient.name ?? null,
        candidateName: row.candidateName ?? "A candidate",
        appUrl: `${env.NEXT_PUBLIC_APP_URL}/employer/intro-requests?focus=${payload.introRequestId}`,
      }),
    });

    if (result.error) {
      logger.warn("send-intro-accepted: resend error", {
        introRequestId: payload.introRequestId,
        reason: String(result.error),
      });
      return { sent: 0 };
    }
    return { sent: 1 };
  },
});
```

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add code/trigger/send-intro-requested.ts code/trigger/send-intro-accepted.ts
git commit -m "$(cat <<'EOF'
feat(intro-requests): trigger.dev tasks for requested + accepted emails

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Wire emails into mutations

**Files:**
- Modify: `src/server/api/routers/intro-requests.ts`

- [ ] **Step 1: Add task imports at the top of the router file**

After the existing imports, add:

```ts
import type { sendIntroRequestedTask } from "../../../../code/trigger/send-intro-requested";
import type { sendIntroAcceptedTask } from "../../../../code/trigger/send-intro-accepted";
```

- [ ] **Step 2: Fire `send-intro-requested` from `create`**

In the `create` mutation, just before `return { introRequestId: inserted.id };`, add:

```ts
      await tasks.trigger<typeof sendIntroRequestedTask>(
        "send-intro-requested",
        { introRequestId: inserted.id },
      );
```

- [ ] **Step 3: Fire `send-intro-accepted` from `acceptForMe`**

In the `acceptForMe` mutation, just before `return { ok: true };`, add:

```ts
      await tasks.trigger<typeof sendIntroAcceptedTask>(
        "send-intro-accepted",
        { introRequestId: input.id },
      );
```

- [ ] **Step 4: Typecheck**

Run: `pnpm typecheck`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/server/api/routers/intro-requests.ts
git commit -m "$(cat <<'EOF'
feat(intro-requests): wire trigger.dev email tasks into create + accept

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 4 — Public profile UI

### Task 10: Replace disabled CTAs with state-driven UI

**Files:**
- Modify: `src/app/p/[id]/public-profile-client.tsx`

This task only handles the **state machine logic + button rendering**. The Request modal and ContactPanel components live in their own files and arrive in Tasks 11–12. To keep this task self-contained, we'll import lazy stubs that render `null` until those files exist; Tasks 11–12 fill them in. Specifically:

- [ ] **Step 1: Define the state-driven CTA section**

In `src/app/p/[id]/public-profile-client.tsx`, the desktop sidebar CTA stack lives at roughly lines 273–320 (the `} else if (showHiddenDetails) {` branch — exact lines may have shifted; locate by the `disabled` button with `title="Intro requests are coming soon."`).

Replace the entire `<div className="pub-cta-stack">` block inside `showHiddenDetails ? (…)` with the new state machine. First, extract a new helper component at the bottom of the file (above `function ShortlistButton(...)`):

```tsx
function IntroRequestCta({
  candidateUserId,
  firstName,
  viewerIsEmployer,
}: {
  candidateUserId: string;
  firstName: string;
  viewerIsEmployer: boolean;
}) {
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const utils = api.useUtils();
  const state = api.introRequests.pendingFromMyOrg.useQuery({ candidateUserId });

  const cancel = api.introRequests.cancel.useMutation({
    onSuccess: () => {
      void utils.introRequests.pendingFromMyOrg.invalidate({ candidateUserId });
    },
  });

  const orgMember = state.data && state.data.state !== "idle"; // soft signal that caller is in some org context (any non-idle means there's a row, which only orgMembers create); we still render the button on idle, gated below.

  // We can't tell server-side whether the viewer has an org row, so render
  // the request modal trigger optimistically. The server enforces the gate.
  const s = state.data;

  if (!s || s.state === "idle" || s.state === "declined-can-retry") {
    return (
      <div className="pub-cta-stack">
        <button
          type="button"
          className="pub-cta-primary"
          onClick={() => setRequestModalOpen(true)}
        >
          Request intro <Icon name="arrowRight" size={14} />
        </button>
        {viewerIsEmployer ? (
          <ShortlistButton candidateUserId={candidateUserId} />
        ) : (
          <button
            type="button"
            className="pub-cta-secondary"
            disabled
            title="Only employers can shortlist."
          >
            <Icon name="bookmark" size={13} /> Save to shortlist
          </button>
        )}
        <div className="pub-id-foot">
          <Icon name="shield" size={12} />
          <span>
            Contact info is hidden until {firstName || "the candidate"} accepts your intro request.
          </span>
        </div>
        <IntroRequestModal
          open={requestModalOpen}
          onClose={() => setRequestModalOpen(false)}
          candidateUserId={candidateUserId}
          candidateFirstName={firstName}
        />
      </div>
    );
  }

  if (s.state === "pending") {
    return (
      <div className="pub-cta-stack">
        <button type="button" className="pub-cta-primary" disabled>
          Intro requested <Icon name="check" size={14} />
        </button>
        <button
          type="button"
          className="pub-cta-link"
          disabled={cancel.isPending}
          onClick={() => cancel.mutate({ id: s.requestId })}
        >
          Cancel request
        </button>
        <div className="pub-id-foot">
          <Icon name="shield" size={12} />
          <span>Waiting for {firstName || "the candidate"} to respond.</span>
        </div>
      </div>
    );
  }

  if (s.state === "accepted") {
    return (
      <div className="pub-cta-stack">
        <IntroContactPanel candidateUserId={candidateUserId} />
        {viewerIsEmployer ? (
          <ShortlistButton candidateUserId={candidateUserId} />
        ) : null}
      </div>
    );
  }

  // declined-cooldown
  return (
    <div className="pub-cta-stack">
      <button
        type="button"
        className="pub-cta-primary"
        disabled
        title={`Available again on ${s.retryAt.toLocaleDateString()}`}
      >
        Request unavailable
      </button>
      <div className="pub-id-foot">
        <Icon name="shield" size={12} />
        <span>
          {firstName || "This candidate"} declined a recent request from your team. Try again in {s.daysRemaining} day{s.daysRemaining === 1 ? "" : "s"}.
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add the imports**

At the top of `public-profile-client.tsx`, after the existing imports, add:

```ts
import { useState } from "react";
import { IntroRequestModal } from "@/components/profile/intro-request-modal";
import { IntroContactPanel } from "@/components/profile/intro-contact-panel";
```

(`useState` may already be imported — check first; do not double-import.)

- [ ] **Step 3: Replace the desktop CTA stack with `<IntroRequestCta />`**

In the `showHiddenDetails ? (…)` branch (around line 273), replace the entire `<div className="pub-cta-stack">…</div>` block (the one containing the disabled "Request intro" button at line ~281) with:

```tsx
            <IntroRequestCta
              candidateUserId={candidateUserId}
              firstName={firstName}
              viewerIsEmployer={viewerIsEmployer}
            />
```

- [ ] **Step 4: Replace the sticky mobile CTA**

Locate the sticky mobile CTA block at approximately lines 540–570 (the `<div className="pub-sticky-cta">` containing the disabled "Request intro" button at line ~551). The mobile mirror should have the same state machine but compressed. Replace:

```tsx
          {viewerIsAuthed ? (
            <button
              type="button"
              className="pub-cta-primary"
              style={{ flex: 1 }}
              disabled
              title="Coming soon"
            >
              Request intro <Icon name="arrowRight" size={14} />
            </button>
          ) : (
            <Link href="/sign-in" …>…</Link>
          )}
```

with:

```tsx
          {viewerIsAuthed ? (
            <IntroRequestCta
              candidateUserId={candidateUserId}
              firstName={firstName}
              viewerIsEmployer={viewerIsEmployer}
            />
          ) : (
            <Link href="/sign-in" …>…</Link>
          )}
```

(Keep the existing `<Link href="/sign-in">` branch as-is.)

- [ ] **Step 5: Create stub files for the modal and contact panel**

Create `src/components/profile/intro-request-modal.tsx`:

```tsx
"use client";

export function IntroRequestModal(_props: {
  open: boolean;
  onClose: () => void;
  candidateUserId: string;
  candidateFirstName: string;
}) {
  return null;
}
```

Create `src/components/profile/intro-contact-panel.tsx`:

```tsx
"use client";

export function IntroContactPanel(_props: { candidateUserId: string }) {
  return null;
}
```

These render `null` and get fleshed out in Tasks 11 and 12.

- [ ] **Step 6: Typecheck**

Run: `pnpm typecheck`
Expected: clean.

- [ ] **Step 7: Visual smoke**

Visit `http://localhost:3000/p/<some-jobseeker-user-id>` (use one of the seeded test users — Mara/Jordan/Priya per memory). Sign in as an employer. Observe:
- Idle state: button now reads "Request intro" and is **enabled** (no longer `disabled`). Clicking it does nothing yet (modal renders null).
- The footer text still mentions intro request gating.

- [ ] **Step 8: Commit**

```bash
git add src/app/p/[id]/public-profile-client.tsx \
        src/components/profile/intro-request-modal.tsx \
        src/components/profile/intro-contact-panel.tsx
git commit -m "$(cat <<'EOF'
feat(intro-requests): state-driven CTAs on /p/[id]

Replaces disabled "Request intro (coming soon)" buttons (desktop + mobile)
with a state machine driven by introRequests.pendingFromMyOrg. Modal and
contact panel are stubs landing in subsequent commits.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 11: Request modal

**Files:**
- Modify: `src/components/profile/intro-request-modal.tsx`

- [ ] **Step 1: Replace the stub with a real modal**

Overwrite `src/components/profile/intro-request-modal.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/trpc/client";
import { Icon } from "@/components/icon";

const MAX_MESSAGE = 1000;

export function IntroRequestModal({
  open,
  onClose,
  candidateUserId,
  candidateFirstName,
}: {
  open: boolean;
  onClose: () => void;
  candidateUserId: string;
  candidateFirstName: string;
}) {
  const [message, setMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const utils = api.useUtils();

  const create = api.introRequests.create.useMutation({
    onSuccess: () => {
      void utils.introRequests.pendingFromMyOrg.invalidate({ candidateUserId });
      setMessage("");
      onClose();
    },
    onError: (err) => {
      setErrorMsg(err.message ?? "Couldn't send the request.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? onClose() : null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request an intro with {candidateFirstName}</DialogTitle>
        </DialogHeader>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Textarea
            placeholder="Add a short note — what's the role, what caught your eye? (optional)"
            value={message}
            onChange={(e) => {
              setErrorMsg(null);
              setMessage(e.target.value.slice(0, MAX_MESSAGE));
            }}
            rows={5}
          />
          <div style={{ fontSize: 12, color: "var(--v2-ink-700)", textAlign: "right" }}>
            {message.length} / {MAX_MESSAGE}
          </div>
          {errorMsg && (
            <div style={{ color: "#b91c1c", fontSize: 13 }} role="alert">
              {errorMsg}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={create.isPending}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              create.mutate({
                candidateUserId,
                message: message.trim() || undefined,
              })
            }
            disabled={create.isPending}
          >
            {create.isPending ? "Sending…" : "Send intro request"}{" "}
            <Icon name="arrowRight" size={14} />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

If the project's shadcn `Dialog` import path differs, mirror the path used elsewhere — search for an existing `import { Dialog, DialogContent` to confirm. The same applies to `Textarea` and `Button`.

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: clean.

- [ ] **Step 3: Visual smoke**

On the public profile page, click "Request intro." Modal opens. Type a note. Click "Send intro request." Modal closes; the button on the page flips to "Intro requested" with a "Cancel request" link. Refresh — still pending. Click "Cancel request" — flips back to "Request intro."

- [ ] **Step 4: Commit**

```bash
git add src/components/profile/intro-request-modal.tsx
git commit -m "$(cat <<'EOF'
feat(intro-requests): request modal on public profile

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 12: Contact panel

**Files:**
- Modify: `src/components/profile/intro-contact-panel.tsx`

- [ ] **Step 1: Replace the stub with the real contact panel**

Overwrite `src/components/profile/intro-contact-panel.tsx`:

```tsx
"use client";

import { useEffect, useRef } from "react";
import { api } from "@/lib/trpc/client";
import { Icon } from "@/components/icon";

export function IntroContactPanel({
  candidateUserId,
}: {
  candidateUserId: string;
}) {
  const q = api.introRequests.contactForCandidate.useQuery(
    { candidateUserId },
    { staleTime: 30_000 },
  );
  const fired = useRef(false);

  useEffect(() => {
    if (!fired.current && q.data?.unlocked === true) {
      fired.current = true;
      // PostHog event wired in Task 16.
      // posthog.capture("intro.contact_unlocked.viewed", { candidateUserId, ... })
    }
  }, [q.data, candidateUserId]);

  if (q.isLoading) {
    return (
      <div className="pub-cta-stack">
        <div style={{ fontSize: 13, color: "var(--v2-ink-700)" }}>Loading contact…</div>
      </div>
    );
  }
  if (!q.data || !q.data.unlocked) {
    return null;
  }

  return (
    <div
      className="pub-cta-stack"
      style={{
        background: "white",
        border: "1px solid var(--v2-border)",
        borderRadius: 12,
        padding: 14,
        gap: 10,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 700, color: "#101820", display: "flex", alignItems: "center", gap: 6 }}>
        <Icon name="check" size={14} /> Contact unlocked
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <ContactRow icon="mail" label="Email" value={q.data.email} hrefScheme="mailto:" />
        {q.data.phone && (
          <ContactRow icon="phone" label="Phone" value={q.data.phone} hrefScheme="tel:" />
        )}
        {q.data.resumeUrl && (
          <ResumeRow url={q.data.resumeUrl} filename={q.data.resumeFilename ?? "resume.pdf"} />
        )}
      </div>
      <div style={{ fontSize: 11, color: "var(--v2-ink-700)" }}>
        Unlocked on {new Date(q.data.acceptedAt).toLocaleDateString()}.
      </div>
    </div>
  );
}

function ContactRow({
  icon,
  label,
  value,
  hrefScheme,
}: {
  icon: "mail" | "phone";
  label: string;
  value: string;
  hrefScheme: "mailto:" | "tel:";
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
      <Icon name={icon} size={14} />
      <span style={{ color: "var(--v2-ink-700)", minWidth: 50 }}>{label}</span>
      <a href={`${hrefScheme}${value}`} style={{ color: "#1CAAE2", textDecoration: "none" }}>
        {value}
      </a>
      <button
        type="button"
        onClick={() => navigator.clipboard.writeText(value)}
        style={{ marginLeft: "auto", border: "none", background: "transparent", cursor: "pointer", color: "var(--v2-ink-700)" }}
        title={`Copy ${label.toLowerCase()}`}
      >
        <Icon name="copy" size={13} />
      </button>
    </div>
  );
}

function ResumeRow({ url, filename }: { url: string; filename: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
      <Icon name="fileText" size={14} />
      <span style={{ color: "var(--v2-ink-700)", minWidth: 50 }}>Resume</span>
      <a
        href={url}
        download={filename}
        target="_blank"
        rel="noopener"
        style={{ color: "#1CAAE2", textDecoration: "none" }}
      >
        {filename}
      </a>
    </div>
  );
}
```

If `Icon` doesn't expose `mail`, `phone`, `copy`, or `fileText` names, swap to nearest equivalents — search `src/components/icon.tsx` (or wherever `Icon` is defined) for available glyphs and substitute.

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: clean.

- [ ] **Step 3: Visual smoke**

Manually flip a request to `accepted` (sign in as the candidate, accept via candidate dashboard once Task 14 lands — for now, do it in `pnpm db:studio` by editing the row's `status` to `accepted` and `acceptedAt` to `now()`). Refresh the public profile page as the requesting employer. The "Request intro" button is replaced with a contact card showing email + phone + resume row.

- [ ] **Step 4: Commit**

```bash
git add src/components/profile/intro-contact-panel.tsx
git commit -m "$(cat <<'EOF'
feat(intro-requests): contact unlocked panel on public profile

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 13: Hide CTAs for non-orgmember authed viewers

**Files:**
- Modify: `src/app/p/[id]/public-profile-client.tsx`

The current `IntroRequestCta` renders for any authed viewer in the `showHiddenDetails` branch. We need to hide it (or replace with a sign-up nudge) for authed users who are NOT in any `org_members` row — e.g. another jobseeker. The cleanest signal is to extend `pendingFromMyOrg` to return `idle` when the caller has no org row (already implemented in Task 6), and add a separate `viewerHasOrg` boolean we pass down from the server.

- [ ] **Step 1: Pass `viewerHasOrg` from the server page**

In `src/app/p/[id]/page.tsx`, after the `viewerIsEmployer` calculation, add:

```ts
  const viewerHasOrg = session
    ? Boolean(
        (
          await db
            .select({ orgId: orgMembers.orgId })
            .from(orgMembers)
            .where(eq(orgMembers.userId, session.user.id))
            .limit(1)
        )[0],
      )
    : false;
```

(You'll need `import { orgMembers } from "@/server/db/schema";` at the top — add it next to the existing schema imports.)

Pass it as a new prop on `<PublicProfileClient>`:

```tsx
      viewerHasOrg={viewerHasOrg}
```

- [ ] **Step 2: Receive the prop in the client and gate the CTA**

In `src/app/p/[id]/public-profile-client.tsx`, add `viewerHasOrg: boolean` to the props type at the top of `PublicProfileClient`. Thread it down to `IntroRequestCta` calls in both the desktop and mobile branches.

In `IntroRequestCta`, accept `viewerHasOrg` as an additional prop and at the top, before the state-machine branches, add:

```tsx
  if (!viewerHasOrg) {
    return (
      <div className="pub-cta-stack">
        <a
          href="/employer/onboarding"
          className="pub-cta-secondary"
          style={{ textDecoration: "none", textAlign: "center" }}
        >
          Hiring on Energized? Sign up as an employer
        </a>
      </div>
    );
  }
```

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: clean.

- [ ] **Step 4: Visual smoke**

Sign in as a jobseeker and visit another jobseeker's `/p/<id>` page. The "Request intro" button is gone and replaced with the sign-up nudge link. Sign in as an employer — the button is back.

- [ ] **Step 5: Commit**

```bash
git add src/app/p/[id]/page.tsx src/app/p/[id]/public-profile-client.tsx
git commit -m "$(cat <<'EOF'
feat(intro-requests): hide CTA for non-orgmember authed viewers

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 5 — Dashboard surfaces

### Task 14: Candidate `<IntrosCard>` on `/dashboard`

**Files:**
- Create: `src/components/shared/intros-card.tsx`
- Modify: `src/app/(app)/dashboard/page.tsx`

- [ ] **Step 1: Create the card component**

Write `src/components/shared/intros-card.tsx`:

```tsx
"use client";

import { useState } from "react";
import { api } from "@/lib/trpc/client";
import { Icon } from "@/components/icon";

function relTime(d: Date): string {
  const ms = Date.now() - new Date(d).getTime();
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return `${days}d ago`;
}

export function IntrosCard() {
  const utils = api.useUtils();
  const q = api.introRequests.inboxForMe.useQuery({ status: "pending" });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const accept = api.introRequests.acceptForMe.useMutation({
    onSuccess: () => void utils.introRequests.inboxForMe.invalidate({ status: "pending" }),
  });
  const decline = api.introRequests.declineForMe.useMutation({
    onSuccess: () => void utils.introRequests.inboxForMe.invalidate({ status: "pending" }),
  });

  return (
    <section
      id="intros"
      className="v2-card"
      style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}
    >
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#101820" }}>
          Intros
        </h3>
        {q.data && q.data.length > 0 && (
          <span
            style={{
              fontSize: 12,
              padding: "2px 8px",
              borderRadius: 999,
              background: "#1CAAE2",
              color: "white",
              fontWeight: 700,
            }}
          >
            {q.data.length}
          </span>
        )}
      </header>

      {q.isLoading && (
        <div style={{ fontSize: 13, color: "var(--v2-ink-700)" }}>Loading…</div>
      )}

      {q.data && q.data.length === 0 && (
        <div style={{ fontSize: 13, color: "var(--v2-ink-700)" }}>
          No intro requests yet.
        </div>
      )}

      {q.data?.map((r) => (
        <div
          key={r.id}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            padding: 12,
            border: "1px solid var(--v2-border)",
            borderRadius: 10,
          }}
        >
          <div
            style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
            onClick={() => setExpandedId((x) => (x === r.id ? null : r.id))}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: r.org.logoUrl ? `url(${r.org.logoUrl}) center/cover` : "#e5edf5",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#004984",
                fontWeight: 700,
              }}
            >
              {!r.org.logoUrl && r.org.name.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#101820" }}>{r.org.name}</div>
              <div style={{ fontSize: 12, color: "var(--v2-ink-700)" }}>
                {r.requestedBy?.name ?? "Someone"} · {relTime(r.createdAt)}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  decline.mutate({ id: r.id });
                }}
                disabled={decline.isPending}
                className="v2-btn v2-btn-ghost"
                style={{ fontSize: 13 }}
              >
                Decline
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  accept.mutate({ id: r.id });
                }}
                disabled={accept.isPending}
                className="v2-btn"
                style={{ fontSize: 13 }}
              >
                Accept
              </button>
            </div>
          </div>
          {expandedId === r.id && r.message && (
            <div
              style={{
                background: "#f6f8fa",
                borderRadius: 8,
                padding: 10,
                fontSize: 13,
                color: "var(--v2-ink-700)",
                fontStyle: "italic",
              }}
            >
              {r.message}
            </div>
          )}
        </div>
      ))}
    </section>
  );
}
```

If `v2-card` and `v2-btn` classes aren't defined as you expect, search the project's CSS (`src/app/v2-dashboard.css` and friends) for the actual class names — the existing dashboard cards use whatever pattern is there.

- [ ] **Step 2: Render `<IntrosCard />` on `/dashboard`**

In `src/app/(app)/dashboard/page.tsx`:

1. Import the new component near the existing imports:
   ```ts
   import { IntrosCard } from "@/components/shared/intros-card";
   ```
2. Render it just above the existing `<InterviewsCard mode="candidate" />` line (around line 299 — search for `<InterviewsCard mode="candidate" />`).
   ```tsx
                 <IntrosCard />
                 <InterviewsCard mode="candidate" />
   ```

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: clean.

- [ ] **Step 4: Visual smoke**

Sign in as a jobseeker who has a pending request (create one as an employer first via the public profile flow). Visit `/dashboard`. The "Intros" card shows the request with org name, requester, relative time, and Accept / Decline buttons. Click Accept — the row vanishes; refresh — still gone. Re-create another, click Decline — same behavior. Visit `/dashboard#intros` — the page scrolls to the card.

- [ ] **Step 5: Commit**

```bash
git add src/components/shared/intros-card.tsx src/app/(app)/dashboard/page.tsx
git commit -m "$(cat <<'EOF'
feat(intro-requests): IntrosCard on candidate dashboard

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 15: Employer `/employer/intro-requests` page + nav entry

**Files:**
- Create: `src/app/(app)/employer/intro-requests/page.tsx`
- Create: `src/app/(app)/employer/intro-requests/intro-requests-client.tsx`
- Modify: `src/app/(app)/employer/page.tsx`

- [ ] **Step 1: Create the server page**

Write `src/app/(app)/employer/intro-requests/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { orgMembers } from "@/server/db/schema";
import { getSession } from "@/server/auth";
import { IntroRequestsClient } from "./intro-requests-client";

export const dynamic = "force-dynamic";

export default async function IntroRequestsPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in?redirect=/employer/intro-requests");

  const [member] = await db
    .select({ orgId: orgMembers.orgId })
    .from(orgMembers)
    .where(eq(orgMembers.userId, session.user.id))
    .limit(1);
  if (!member) redirect("/employer/onboarding");

  return <IntroRequestsClient />;
}
```

- [ ] **Step 2: Create the client component**

Write `src/app/(app)/employer/intro-requests/intro-requests-client.tsx`:

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/trpc/client";
import { IntroContactPanel } from "@/components/profile/intro-contact-panel";

type Tab = "pending" | "accepted" | "declined" | "all";
const TABS: { value: Tab; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "declined", label: "Declined" },
  { value: "all", label: "All" },
];

export function IntroRequestsClient() {
  const params = useSearchParams();
  const focusId = params.get("focus");
  const [tab, setTab] = useState<Tab>("pending");
  const [expandedId, setExpandedId] = useState<string | null>(focusId);

  const utils = api.useUtils();
  const list = api.introRequests.listForOrg.useQuery({ status: tab, limit: 100 });
  const cancel = api.introRequests.cancel.useMutation({
    onSuccess: () => void utils.introRequests.listForOrg.invalidate(),
  });

  const focusedRow = useMemo(
    () => list.data?.find((r) => r.id === focusId),
    [list.data, focusId],
  );

  useEffect(() => {
    if (!focusId || !focusedRow) return;
    // Switch tab if needed so the row is visible
    const expectedTab: Tab =
      focusedRow.status === "pending" ? "pending"
      : focusedRow.status === "accepted" ? "accepted"
      : focusedRow.status === "declined" ? "declined"
      : "all";
    if (expectedTab !== tab) setTab(expectedTab);
    setExpandedId(focusId);
    // Best-effort scroll
    const el = document.getElementById(`intro-row-${focusId}`);
    if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [focusId, focusedRow, tab]);

  return (
    <main style={{ maxWidth: 960, margin: "32px auto", padding: "0 24px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 900, color: "#101820", marginBottom: 8 }}>
        Intro requests
      </h1>
      <p style={{ color: "var(--v2-ink-700)", marginBottom: 16 }}>
        Requests your team has sent from candidate profiles.
      </p>

      <nav style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={tab === t.value ? "v2-btn" : "v2-btn v2-btn-ghost"}
            style={{ fontSize: 13 }}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {list.isLoading && <div>Loading…</div>}
      {list.data && list.data.length === 0 && (
        <div style={{ color: "var(--v2-ink-700)" }}>
          No requests in this view.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {list.data?.map((r) => (
          <div
            key={r.id}
            id={`intro-row-${r.id}`}
            className="v2-card"
            style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}
          >
            <div
              style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
              onClick={() => setExpandedId((x) => (x === r.id ? null : r.id))}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 999,
                  background: r.candidate.image ? `url(${r.candidate.image}) center/cover` : "#e5edf5",
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <Link
                  href={`/p/${r.candidate.id}`}
                  style={{ fontSize: 15, fontWeight: 700, color: "#101820", textDecoration: "none" }}
                >
                  {r.candidate.name ?? "Candidate"}
                </Link>
                <div style={{ fontSize: 12, color: "var(--v2-ink-700)" }}>
                  {r.candidate.headline ?? ""}
                  {r.candidate.location ? ` · ${r.candidate.location}` : ""}
                </div>
              </div>
              <span
                style={{
                  fontSize: 11,
                  padding: "3px 8px",
                  borderRadius: 999,
                  background:
                    r.status === "accepted" ? "#dcfce7" :
                    r.status === "declined" ? "#fee2e2" :
                    r.status === "canceled" ? "#f3f4f6" :
                    "#dbeafe",
                  color:
                    r.status === "accepted" ? "#166534" :
                    r.status === "declined" ? "#991b1b" :
                    r.status === "canceled" ? "#374151" :
                    "#1e40af",
                  fontWeight: 700,
                  textTransform: "capitalize",
                }}
              >
                {r.status}
              </span>
            </div>

            {expandedId === r.id && (
              <>
                {r.message && (
                  <div style={{ background: "#f6f8fa", borderRadius: 8, padding: 12, fontSize: 13, fontStyle: "italic", color: "var(--v2-ink-700)" }}>
                    {r.message}
                  </div>
                )}
                <div style={{ fontSize: 12, color: "var(--v2-ink-700)" }}>
                  Sent by {r.requestedBy?.name ?? "a former teammate"} on{" "}
                  {new Date(r.createdAt).toLocaleDateString()}
                </div>
                {r.status === "pending" && (
                  <button
                    type="button"
                    onClick={() => cancel.mutate({ id: r.id })}
                    disabled={cancel.isPending}
                    className="v2-btn v2-btn-ghost"
                    style={{ alignSelf: "flex-start", fontSize: 13 }}
                  >
                    Cancel request
                  </button>
                )}
                {r.status === "accepted" && (
                  <IntroContactPanel candidateUserId={r.candidate.id} />
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Add nav entry on the employer dashboard**

In `src/app/(app)/employer/page.tsx`, around line 88 (the inline nav row containing `Find candidates`, `All jobs`, `Post a role`), insert a new `<Link>` between "Find candidates" and "All jobs":

```tsx
            <Link
              href="/employer/intro-requests"
              className="inline-flex items-center gap-2 text-sm font-medium text-[var(--v2-ink-700)] transition-colors hover:text-[var(--v2-ink-950)]"
            >
              <Icon name="mail" size={16} />
              Intro requests
            </Link>
```

(Use whichever icon name corresponds to "envelope" / "mail" / "inbox" in your `Icon` component. If `mail` doesn't exist, `inbox` is the next-best fit.)

- [ ] **Step 4: Typecheck**

Run: `pnpm typecheck`
Expected: clean.

- [ ] **Step 5: Visual smoke**

Visit `/employer`. The new "Intro requests" link is in the page header. Click it → lands on `/employer/intro-requests`. Tabs work. With a seeded pending request, the row expands to show the message + a "Cancel request" button. With an accepted row, expanding it inlines the contact panel. Visit `/employer/intro-requests?focus={someId}` directly — the page auto-switches tabs, expands the row, and scrolls to it.

- [ ] **Step 6: Commit**

```bash
git add src/app/(app)/employer/intro-requests/ src/app/(app)/employer/page.tsx
git commit -m "$(cat <<'EOF'
feat(intro-requests): /employer/intro-requests page + dashboard nav

Tabs (Pending/Accepted/Declined/All), per-row expand with full message
and contact panel on accept; ?focus= deep-link from email CTAs.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 6 — Telemetry + close

### Task 16: PostHog events

**Files:**
- Modify: `src/server/api/routers/intro-requests.ts`
- Modify: `src/components/profile/intro-contact-panel.tsx`

The router already has access to `posthogServer` via `@/lib/posthog`. Mutations fire server-side; the contact-panel "viewed" event fires client-side using the existing `posthog-js` client.

- [ ] **Step 1: Import the server client into the router**

In `src/server/api/routers/intro-requests.ts`, add to the imports:

```ts
import { posthogServer } from "@/lib/posthog";
```

- [ ] **Step 2: Fire `intro.requested` from `create`**

In the `create` mutation, **after** `await tasks.trigger(...)` and **before** `return`:

```ts
      try {
        posthogServer.capture({
          distinctId: ctx.session.user.id,
          event: "intro.requested",
          properties: {
            orgId,
            candidateUserId: input.candidateUserId,
            hasMessage: input.message !== null,
          },
        });
      } catch {}
```

- [ ] **Step 3: Fire `intro.canceled` from `cancel`**

Just before `return { ok: true };` in `cancel`:

```ts
      try {
        posthogServer.capture({
          distinctId: ctx.session.user.id,
          event: "intro.canceled",
          properties: { orgId, requestId: input.id },
        });
      } catch {}
```

- [ ] **Step 4: Fire `intro.accepted` from `acceptForMe`**

Just before `return { ok: true };` in `acceptForMe`, after the `tasks.trigger` call:

```ts
      const daysToDecision = Math.round(
        (Date.now() - new Date((await ctx.db.select({ createdAt: introRequests.createdAt }).from(introRequests).where(eq(introRequests.id, input.id)).limit(1))[0]?.createdAt ?? new Date()).getTime()) / (24 * 60 * 60 * 1000),
      );
      try {
        posthogServer.capture({
          distinctId: ctx.session.user.id,
          event: "intro.accepted",
          properties: {
            orgId: row.orgId,
            candidateUserId: row.candidateUserId,
            daysToDecision,
          },
        });
      } catch {}
```

- [ ] **Step 5: Fire `intro.declined` from `declineForMe`**

Same shape as accept, just before its `return { ok: true };`:

```ts
      const daysToDecision = Math.round(
        (Date.now() - new Date((await ctx.db.select({ createdAt: introRequests.createdAt }).from(introRequests).where(eq(introRequests.id, input.id)).limit(1))[0]?.createdAt ?? new Date()).getTime()) / (24 * 60 * 60 * 1000),
      );
      try {
        posthogServer.capture({
          distinctId: ctx.session.user.id,
          event: "intro.declined",
          properties: {
            orgId: row.orgId,
            candidateUserId: row.candidateUserId,
            daysToDecision,
          },
        });
      } catch {}
```

- [ ] **Step 6: Fire `intro.contact_unlocked.viewed` from the panel**

In `src/components/profile/intro-contact-panel.tsx`, replace the placeholder useEffect (the one that just sets `fired.current = true`) with a real PostHog capture:

```tsx
import posthog from "posthog-js";
// …
  useEffect(() => {
    if (!fired.current && q.data?.unlocked === true) {
      fired.current = true;
      try {
        posthog.capture("intro.contact_unlocked.viewed", {
          candidateUserId,
        });
      } catch {}
    }
  }, [q.data, candidateUserId]);
```

- [ ] **Step 7: Typecheck**

Run: `pnpm typecheck`
Expected: clean.

- [ ] **Step 8: Commit**

```bash
git add src/server/api/routers/intro-requests.ts src/components/profile/intro-contact-panel.tsx
git commit -m "$(cat <<'EOF'
feat(intro-requests): posthog events for full lifecycle

intro.requested, intro.accepted, intro.declined, intro.canceled
(server-side), intro.contact_unlocked.viewed (client).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 17: Smoke checklist + memory update

**Files:**
- Modify: `/Users/oyatemizyurek/.claude/projects/-Users-oyatemizyurek-Documents-code-energized/memory/feature_state_2026_04_27.md` (auto-memory; updated through the Write tool)

- [ ] **Step 1: End-to-end smoke checklist**

Run through every acceptance criterion from the spec (§11) by hand on `localhost:3000`. The dev server is already running externally. For each, paste a mental check and look for failures:

1. As an employer signed in: visit `/p/<jobseeker-id>`. "Request intro" is enabled.
2. Click → modal opens. Type a 200-char note. Submit. Modal closes; button flips to "Intro requested" with "Cancel request" link.
3. Tail Trigger.dev logs (or check Resend dashboard) for `send-intro-requested` execution. Email landed in candidate inbox. Subject matches "{Org} would like an intro on Energized."
4. Sign in as the candidate. Visit `/dashboard`. The "Intros" card shows the request with the requester name and message preview. Expand row to see full message.
5. Click Accept. Row vanishes. Refresh — still gone.
6. Trigger.dev fires `send-intro-accepted`. Requester receives email "{Candidate} accepted your intro request — contact unlocked" with deep link.
7. Sign in as the employer (could be the requester or another org member). Visit `/p/<jobseeker-id>` again. The "Request intro" card is replaced with a contact panel showing email, phone, resume link.
8. Try as a *different* org's user: contact panel does not appear (returns `unlocked: false`).
9. Visit `/employer/intro-requests`. Tabs work. Open the email's deep link in a new tab — page scrolls + auto-expands the right row.
10. Decline test: create a fresh request, sign in as candidate, decline it. As the requester, visit `/p/<id>` again — button now says "Request unavailable" with tooltip showing the 30-day retry date.
11. Try to `create` again from the same org: get the cooldown error.
12. Cancel test: create a fresh request, then cancel as the requester. Verify a new request can immediately be created (no cooldown).
13. Self-request guard: open the public profile of yourself (you'd need to be in an `org_members` row AND viewing your own profile, which the page already 404s; if you can engineer it via API, expect `BAD_REQUEST`).
14. Non-orgmember authed view: sign in as a jobseeker without an org row, visit another jobseeker's `/p/<id>`. The CTA is replaced with the "Sign up as an employer" link.
15. PostHog: verify the 5 event names appear in the live event stream.

If anything fails, fix in place and re-run the affected step. No commit needed if everything passes.

- [ ] **Step 2: Update memory feature_state**

Open `/Users/oyatemizyurek/.claude/projects/-Users-oyatemizyurek-Documents-code-energized/memory/feature_state_2026_04_27.md` and add an "Intro requests" entry to the shipped section, with the date `2026-05-05` (or whatever today is when shipped).

The exact line shape should match the existing shipped entries already in that file — read it first, then append in the same style.

- [ ] **Step 3: Final commit (only if any code touch-ups happened during smoke)**

If smoke turned up nothing, no commit. Otherwise:

```bash
git add <touched-files>
git commit -m "$(cat <<'EOF'
fix(intro-requests): smoke fixups

<one-liner per fix>

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review

After completing all 17 tasks, the spec's acceptance criteria (§11) maps to the smoke checklist (Task 17 Step 1). Spec sections covered:

- §2 Data model → Task 1
- §4 tRPC router → Tasks 2–6, 9 (wiring)
- §5 Trigger.dev tasks → Task 8
- §6 Email templates → Task 7
- §7a Public profile → Tasks 10–13
- §7b Candidate dashboard → Task 14
- §7c-d Employer page + deep link → Task 15
- §8 PostHog events → Task 16
- §9 Edge cases → enforced in router code (Tasks 3–6) and verified in smoke (Task 17)
- §10 Migration + ordering → matched 1:1
- §11 Acceptance criteria → Task 17 Step 1

No outstanding TBD/TODO/placeholder text. Type names and method signatures used in later tasks (e.g. `IntroRequestModal`, `IntroContactPanel`, `IntrosCard`, `IntroRequestCta`) match where they're defined.
