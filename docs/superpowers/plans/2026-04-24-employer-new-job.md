# Employer New-Job — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a rich, autosaved job-posting wizard for verified employers, with a real Jobs list on the profile page and a working "New job" sidebar CTA.

**Architecture:** New `job_listings` table and tRPC router. Dedicated route `/employer/jobs/[id]/edit?step=N` hosting a 4-step wizard mirroring the existing onboarding pattern. Debounced autosave per field; explicit `publish` mutation with server-side Zod validation. Profile page replaces the `JobsPlaceholder` with a live list and enables the disabled "New job" button.

**Tech Stack:** Next.js App Router, tRPC v11, Drizzle + Neon, Zod v4, Lato + existing `v2-*` / `ob-*` / `pp-*` CSS classes, PostHog for analytics.

**Spec:** `docs/superpowers/specs/2026-04-24-employer-new-job-design.md`

**Package manager:** `pnpm`

**Important notes on project state:**
- No unit-test infrastructure exists in the repo yet (`vitest`/`playwright` are in `devDependencies` but no config files and no `.test.ts` files). This plan **does not** add unit tests; it validates via `pnpm typecheck`, `pnpm lint`, and manual verification. Adding a proper test harness is a follow-up plan.
- Commits use the HEREDOC format with the `Co-Authored-By: Claude Opus 4.7` trailer.

---

## File Structure

**New files**
- `src/server/db/schema/job-listings.ts` — Drizzle table + relations
- `src/server/db/migrations/0009_*.sql` — auto-generated
- `src/server/api/routers/jobs.ts` — tRPC router
- `src/lib/jobs-options.ts` — shared option lists (sectors, work setups, etc.) re-used by the wizard and list UI
- `src/lib/analytics-events.ts` — PostHog event name registry
- `src/app/(app)/employer/jobs/new/page.tsx` — server component: create draft + redirect
- `src/app/(app)/employer/jobs/[id]/edit/page.tsx` — server component: auth/org gate + render wizard
- `src/app/(app)/employer/jobs/[id]/edit/job-wizard-client.tsx` — the 4-step wizard
- `src/app/(app)/employer/jobs/[id]/edit/wizard-steps.tsx` — four step components, one file for cohesion
- `src/app/(app)/employer/jobs/[id]/preview/page.tsx` — read-only preview page (server)
- `src/components/jobs/job-preview-card.tsx` — live preview tile used on Step 4 and in the list header count

**Modified files**
- `src/server/db/schema/enums.ts` — append `jobStatusEnum`, `experienceLevelEnum`
- `src/server/db/schema/index.ts` — re-export job-listings
- `src/server/api/root.ts` — register `jobsRouter`
- `src/app/(app)/employer/profile/employer-profile-client.tsx` — replace `JobsPlaceholder` with real list + wire sidebar CTA

---

## Task 1: Add job enums

**Files:**
- Modify: `src/server/db/schema/enums.ts`

- [ ] **Step 1: Add the two enums to the file**

Append at the end of `src/server/db/schema/enums.ts`:

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

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: passes (enums are not yet referenced).

- [ ] **Step 3: Commit**

```bash
git add src/server/db/schema/enums.ts
git commit -m "$(cat <<'EOF'
feat(db): add job_status and experience_level enums

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Create job_listings schema

**Files:**
- Create: `src/server/db/schema/job-listings.ts`
- Modify: `src/server/db/schema/index.ts`

- [ ] **Step 1: Write the table**

Create `src/server/db/schema/job-listings.ts`:

```ts
import { relations } from "drizzle-orm";
import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { employerOrgs } from "./employer-orgs";
import {
  experienceLevelEnum,
  jobStatusEnum,
  sectorEnum,
  workSetupEnum,
} from "./enums";

export type ScreeningQuestion = { q: string; required: boolean };

export const jobListings = pgTable("job_listings", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => employerOrgs.id, { onDelete: "cascade" }),
  createdByUserId: text("created_by_user_id")
    .notNull()
    .references(() => user.id),

  title: text("title"),
  sector: sectorEnum("sector"),
  subSectors: text("sub_sectors").array().notNull().default([]),
  experienceLevel: experienceLevelEnum("experience_level"),

  location: text("location"),
  workSetup: workSetupEnum("work_setup"),
  rotationSchedule: text("rotation_schedule"),
  hoursPerWeek: integer("hours_per_week"),

  salaryMin: integer("salary_min"),
  salaryMax: integer("salary_max"),
  salaryCurrency: text("salary_currency").notNull().default("CAD"),
  salaryPeriod: text("salary_period").notNull().default("year"),
  requiredCertifications: text("required_certifications")
    .array()
    .notNull()
    .default([]),
  screeningQuestions: jsonb("screening_questions")
    .$type<ScreeningQuestion[]>()
    .notNull()
    .default([]),

  summary: text("summary"),
  description: text("description"),

  status: jobStatusEnum("status").notNull().default("draft"),
  publishedAt: timestamp("published_at"),
  closedAt: timestamp("closed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const jobListingsRelations = relations(jobListings, ({ one }) => ({
  org: one(employerOrgs, {
    fields: [jobListings.orgId],
    references: [employerOrgs.id],
  }),
  createdBy: one(user, {
    fields: [jobListings.createdByUserId],
    references: [user.id],
  }),
}));
```

- [ ] **Step 2: Export from barrel**

Modify `src/server/db/schema/index.ts` — append:

```ts
export * from "./job-listings";
```

- [ ] **Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add src/server/db/schema/job-listings.ts src/server/db/schema/index.ts
git commit -m "$(cat <<'EOF'
feat(db): add job_listings table with draft/published/closed lifecycle

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Generate and apply migration

**Files:**
- Create: `src/server/db/migrations/0009_*.sql` (drizzle-generated)

- [ ] **Step 1: Generate the migration**

Run: `pnpm db:generate`
Expected: a new file appears under `src/server/db/migrations/` named `0009_*.sql` plus a `meta/_journal.json` update.

- [ ] **Step 2: Inspect the generated SQL**

Read: the new `0009_*.sql`
Verify it contains `CREATE TYPE "job_status" AS ENUM ('draft', 'published', 'closed')`, the same for `experience_level`, and a `CREATE TABLE "job_listings" (...)`. If anything is missing or wrong, stop and investigate before applying.

- [ ] **Step 3: Apply the migration**

Run: `pnpm db:migrate`
Expected: `Migration complete.` or equivalent.

- [ ] **Step 4: Commit**

```bash
git add src/server/db/migrations/
git commit -m "$(cat <<'EOF'
feat(db): migration for job_listings table

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Shared jobs options

**Files:**
- Create: `src/lib/jobs-options.ts`

Consolidates dropdown/chip options so wizard, list, and preview agree. Re-uses the existing labels from the employer onboarding client.

- [ ] **Step 1: Write the file**

Create `src/lib/jobs-options.ts`:

```ts
export type JobSector =
  | "oil_gas"
  | "renewables"
  | "nuclear"
  | "utilities"
  | "hydrogen"
  | "power"
  | "other";

export type JobWorkSetup =
  | "onsite"
  | "hybrid_preferred"
  | "remote_ok"
  | "flexible";

export type JobExperienceLevel =
  | "entry"
  | "intermediate"
  | "senior"
  | "lead"
  | "executive";

export type JobStatus = "draft" | "published" | "closed";

export const SECTOR_LABELS: Record<JobSector, string> = {
  oil_gas: "Oil & Gas",
  renewables: "Renewable Energy",
  nuclear: "Nuclear",
  utilities: "Power Utilities",
  hydrogen: "Hydrogen",
  power: "Power",
  other: "Other",
};

export const WORK_SETUP_LABELS: Record<JobWorkSetup, string> = {
  onsite: "Onsite",
  hybrid_preferred: "Hybrid preferred",
  remote_ok: "Remote OK",
  flexible: "Flexible",
};

export const EXPERIENCE_LEVEL_LABELS: Record<JobExperienceLevel, string> = {
  entry: "Entry",
  intermediate: "Intermediate",
  senior: "Senior",
  lead: "Lead",
  executive: "Executive",
};

export const ROTATION_OPTIONS: string[] = ["None", "14/7", "20/8", "7/7"];

export const HOURS_PER_WEEK_OPTIONS: number[] = [20, 30, 40, 44];

export const SALARY_CURRENCY_OPTIONS: { value: string; label: string }[] = [
  { value: "CAD", label: "CAD" },
  { value: "USD", label: "USD" },
];

export const SALARY_PERIOD_OPTIONS: { value: string; label: string }[] = [
  { value: "year", label: "per year" },
  { value: "hour", label: "per hour" },
  { value: "day", label: "per day" },
];

export const SUB_SECTOR_OPTIONS: string[] = [
  "Solar PV",
  "Wind Onshore",
  "Wind Offshore",
  "Battery Storage",
  "Hydroelectric",
  "Grid-scale",
  "Distributed",
  "Transmission",
  "Upstream",
  "Downstream",
  "Pipelines",
  "LNG",
  "CCUS",
];

export const CERTIFICATION_OPTIONS: string[] = [
  "H2S Alive",
  "First Aid",
  "CSTS",
  "Red Seal",
  "P.Eng",
  "NACE",
  "Fall Protection",
];

export function formatSalary(
  min: number | null,
  max: number | null,
  currency: string | null,
  period: string | null,
): string {
  if (min == null && max == null) return "Salary TBD";
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: (currency ?? "CAD").toUpperCase(),
      maximumFractionDigits: 0,
    }).format(n);
  const per = period === "hour" ? "/hr" : period === "day" ? "/day" : "/yr";
  if (min != null && max != null) return `${fmt(min)} – ${fmt(max)}${per}`;
  return `${fmt((min ?? max) as number)}${per}`;
}
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/lib/jobs-options.ts
git commit -m "$(cat <<'EOF'
feat(jobs): shared option lists and salary formatter

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Jobs router — scaffold + org guard + CRUD basics

**Files:**
- Create: `src/server/api/routers/jobs.ts`
- Modify: `src/server/api/root.ts`

- [ ] **Step 1: Create the router file with scaffold + basics**

Create `src/server/api/routers/jobs.ts`:

```ts
import { and, desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "@/server/api/trpc";
import { jobListings, orgMembers } from "@/server/db/schema";
import type { ScreeningQuestion } from "@/server/db/schema/job-listings";

const sectorValues = [
  "oil_gas",
  "renewables",
  "nuclear",
  "utilities",
  "hydrogen",
  "power",
  "other",
] as const;

const workSetupValues = [
  "onsite",
  "hybrid_preferred",
  "remote_ok",
  "flexible",
] as const;

const experienceLevelValues = [
  "entry",
  "intermediate",
  "senior",
  "lead",
  "executive",
] as const;

const screeningQuestionSchema = z.object({
  q: z.string().min(1).max(280),
  required: z.boolean(),
});

const updateDraftSchema = z
  .object({
    title: z.string().max(160).nullable(),
    sector: z.enum(sectorValues).nullable(),
    subSectors: z.array(z.string().min(1).max(60)).max(4),
    experienceLevel: z.enum(experienceLevelValues).nullable(),
    location: z.string().max(160).nullable(),
    workSetup: z.enum(workSetupValues).nullable(),
    rotationSchedule: z.string().max(32).nullable(),
    hoursPerWeek: z.number().int().min(1).max(80).nullable(),
    salaryMin: z.number().int().min(0).max(10_000_000).nullable(),
    salaryMax: z.number().int().min(0).max(10_000_000).nullable(),
    salaryCurrency: z.string().min(3).max(3),
    salaryPeriod: z.enum(["year", "hour", "day"]),
    requiredCertifications: z.array(z.string().min(1).max(60)).max(20),
    screeningQuestions: z.array(screeningQuestionSchema).max(8),
    summary: z.string().max(200).nullable(),
    description: z.string().max(4000).nullable(),
  })
  .partial();

type OrgRole = "owner" | "admin" | "recruiter" | "hiring_manager" | "viewer";

const EDIT_ROLES: OrgRole[] = ["owner", "admin", "recruiter", "hiring_manager"];
const CLOSE_ROLES: OrgRole[] = ["owner", "admin"];

async function requireOrgRole(
  ctx: {
    db: typeof import("@/server/db").db;
    session: { user: { id: string; email: string } };
  },
  allowed: OrgRole[],
): Promise<{ orgId: string; role: OrgRole }> {
  const userId = ctx.session.user.id;
  const email = ctx.session.user.email.toLowerCase();
  const [byUser] = await ctx.db
    .select({ orgId: orgMembers.orgId, role: orgMembers.role })
    .from(orgMembers)
    .where(eq(orgMembers.userId, userId))
    .limit(1);

  const member =
    byUser ??
    (
      await ctx.db
        .select({ orgId: orgMembers.orgId, role: orgMembers.role })
        .from(orgMembers)
        .where(
          and(eq(orgMembers.email, email), eq(orgMembers.status, "active")),
        )
        .limit(1)
    )[0];

  if (!member) {
    throw new TRPCError({ code: "NOT_FOUND", message: "No org found." });
  }
  if (!allowed.includes(member.role as OrgRole)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Your role can't perform that action.",
    });
  }
  return { orgId: member.orgId, role: member.role as OrgRole };
}

async function getJobForOrg(
  ctx: { db: typeof import("@/server/db").db },
  id: string,
  orgId: string,
) {
  const [row] = await ctx.db
    .select()
    .from(jobListings)
    .where(and(eq(jobListings.id, id), eq(jobListings.orgId, orgId)))
    .limit(1);
  return row ?? null;
}

export const jobsRouter = router({
  listForOrg: protectedProcedure.query(async ({ ctx }) => {
    const { orgId } = await requireOrgRole(ctx, [
      "owner",
      "admin",
      "recruiter",
      "hiring_manager",
      "viewer",
    ]);
    return ctx.db
      .select()
      .from(jobListings)
      .where(eq(jobListings.orgId, orgId))
      .orderBy(desc(jobListings.createdAt));
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { orgId } = await requireOrgRole(ctx, [
        "owner",
        "admin",
        "recruiter",
        "hiring_manager",
        "viewer",
      ]);
      const row = await getJobForOrg(ctx, input.id, orgId);
      if (!row)
        throw new TRPCError({ code: "NOT_FOUND", message: "Job not found." });
      return row;
    }),

  createDraft: protectedProcedure.mutation(async ({ ctx }) => {
    const { orgId } = await requireOrgRole(ctx, EDIT_ROLES);
    const [row] = await ctx.db
      .insert(jobListings)
      .values({ orgId, createdByUserId: ctx.session.user.id })
      .returning({ id: jobListings.id });
    return row;
  }),

  updateDraft: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        patch: updateDraftSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { orgId } = await requireOrgRole(ctx, EDIT_ROLES);
      const existing = await getJobForOrg(ctx, input.id, orgId);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      if (existing.status !== "draft") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only drafts can be edited with updateDraft.",
        });
      }

      const patch: Partial<typeof input.patch> & {
        screeningQuestions?: ScreeningQuestion[];
      } = { ...input.patch };

      const [row] = await ctx.db
        .update(jobListings)
        .set(patch)
        .where(eq(jobListings.id, input.id))
        .returning();
      return row;
    }),
});
```

- [ ] **Step 2: Register router in root**

Modify `src/server/api/root.ts`:

```ts
import { createCallerFactory, router } from "@/server/api/trpc";
import { accountRouter } from "@/server/api/routers/account";
import { employerRouter } from "@/server/api/routers/employer";
import { healthRouter } from "@/server/api/routers/health";
import { jobsRouter } from "@/server/api/routers/jobs";
import { onboardingRouter } from "@/server/api/routers/onboarding";
import { profileRouter } from "@/server/api/routers/profile";

export const appRouter = router({
  account: accountRouter,
  employer: employerRouter,
  health: healthRouter,
  jobs: jobsRouter,
  onboarding: onboardingRouter,
  profile: profileRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
```

- [ ] **Step 3: Run typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add src/server/api/routers/jobs.ts src/server/api/root.ts
git commit -m "$(cat <<'EOF'
feat(jobs): tRPC router scaffold with draft CRUD and role guards

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Jobs router — lifecycle (publish, close, reopen)

**Files:**
- Modify: `src/server/api/routers/jobs.ts`

- [ ] **Step 1: Add publish validation schema + procedures**

Inside `src/server/api/routers/jobs.ts`, add (above the `export const jobsRouter`):

```ts
import { employerOrgs } from "@/server/db/schema";

const publishValidationFields = [
  "title",
  "sector",
  "location",
  "workSetup",
  "experienceLevel",
  "description",
  "salary",
] as const;

function findMissingPublishFields(row: typeof jobListings.$inferSelect): string[] {
  const missing: string[] = [];
  if (!row.title || row.title.trim().length < 3) missing.push("title");
  if (!row.sector) missing.push("sector");
  if (!row.location || row.location.trim().length < 2) missing.push("location");
  if (!row.workSetup) missing.push("workSetup");
  if (!row.experienceLevel) missing.push("experienceLevel");
  if (!row.description || row.description.trim().length < 100)
    missing.push("description");
  if (row.salaryMin == null && row.salaryMax == null) missing.push("salary");
  if (row.salaryMin != null && row.salaryMax != null && row.salaryMin > row.salaryMax)
    missing.push("salaryRange");
  return missing;
}
```

Then, extend the `jobsRouter` object (before the closing `})`) with these procedures:

```ts
  publish: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { orgId } = await requireOrgRole(ctx, EDIT_ROLES);
      const [org] = await ctx.db
        .select()
        .from(employerOrgs)
        .where(eq(employerOrgs.id, orgId))
        .limit(1);
      if (!org) throw new TRPCError({ code: "NOT_FOUND" });
      if (!org.verified) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Verify your company's domain before publishing a role.",
        });
      }

      const existing = await getJobForOrg(ctx, input.id, orgId);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      if (existing.status === "closed") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Closed roles must be reopened, not re-published.",
        });
      }

      const missing = findMissingPublishFields(existing);
      if (missing.length > 0) {
        // Encoded in message since the global errorFormatter in
        // src/server/api/trpc.ts only propagates zodError. Client parses
        // this prefix to drive field highlighting.
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `MISSING_FIELDS:${missing.join(",")}`,
        });
      }

      const [row] = await ctx.db
        .update(jobListings)
        .set({ status: "published", publishedAt: new Date() })
        .where(eq(jobListings.id, input.id))
        .returning();
      return row;
    }),

  close: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { orgId } = await requireOrgRole(ctx, CLOSE_ROLES);
      const existing = await getJobForOrg(ctx, input.id, orgId);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      if (existing.status !== "published") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only published roles can be closed.",
        });
      }
      const [row] = await ctx.db
        .update(jobListings)
        .set({ status: "closed", closedAt: new Date() })
        .where(eq(jobListings.id, input.id))
        .returning();
      return row;
    }),

  reopen: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { orgId } = await requireOrgRole(ctx, CLOSE_ROLES);
      const existing = await getJobForOrg(ctx, input.id, orgId);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      if (existing.status !== "closed") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only closed roles can be reopened.",
        });
      }
      const [row] = await ctx.db
        .update(jobListings)
        .set({ status: "published", closedAt: null })
        .where(eq(jobListings.id, input.id))
        .returning();
      return row;
    }),
```

- [ ] **Step 2: Run typecheck + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/server/api/routers/jobs.ts
git commit -m "$(cat <<'EOF'
feat(jobs): publish/close/reopen lifecycle procedures with validation

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Jobs router — deleteDraft, duplicate, getPublic

**Files:**
- Modify: `src/server/api/routers/jobs.ts`

- [ ] **Step 1: Append three procedures**

Inside `src/server/api/routers/jobs.ts`, after `reopen` (still inside `jobsRouter`):

```ts
  deleteDraft: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { orgId } = await requireOrgRole(ctx, EDIT_ROLES);
      const existing = await getJobForOrg(ctx, input.id, orgId);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      if (existing.status !== "draft") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only drafts can be deleted. Close the role instead.",
        });
      }
      await ctx.db.delete(jobListings).where(eq(jobListings.id, input.id));
      return { ok: true };
    }),

  duplicate: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { orgId } = await requireOrgRole(ctx, EDIT_ROLES);
      const source = await getJobForOrg(ctx, input.id, orgId);
      if (!source) throw new TRPCError({ code: "NOT_FOUND" });

      const [row] = await ctx.db
        .insert(jobListings)
        .values({
          orgId,
          createdByUserId: ctx.session.user.id,
          title: source.title ? `${source.title} (copy)` : null,
          sector: source.sector,
          subSectors: source.subSectors,
          experienceLevel: source.experienceLevel,
          location: source.location,
          workSetup: source.workSetup,
          rotationSchedule: source.rotationSchedule,
          hoursPerWeek: source.hoursPerWeek,
          salaryMin: source.salaryMin,
          salaryMax: source.salaryMax,
          salaryCurrency: source.salaryCurrency,
          salaryPeriod: source.salaryPeriod,
          requiredCertifications: source.requiredCertifications,
          screeningQuestions: source.screeningQuestions,
          summary: source.summary,
          description: source.description,
          status: "draft",
        })
        .returning({ id: jobListings.id });
      return row;
    }),

  getPublic: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select()
        .from(jobListings)
        .where(
          and(eq(jobListings.id, input.id), eq(jobListings.status, "published")),
        )
        .limit(1);
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return row;
    }),
```

- [ ] **Step 2: Run typecheck + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/server/api/routers/jobs.ts
git commit -m "$(cat <<'EOF'
feat(jobs): deleteDraft, duplicate, and public getById procedures

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Analytics events registry

**Files:**
- Create: `src/lib/analytics-events.ts`

- [ ] **Step 1: Write the registry**

Create `src/lib/analytics-events.ts`:

```ts
export const ANALYTICS_EVENTS = {
  jobDraftCreated: "job.draft.created",
  jobDraftUpdated: "job.draft.updated",
  jobPublished: "job.published",
  jobClosed: "job.closed",
  jobReopened: "job.reopened",
  jobWizardStepViewed: "job.wizard.step_viewed",
} as const;

export type AnalyticsEvent =
  (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/lib/analytics-events.ts
git commit -m "$(cat <<'EOF'
feat(analytics): registry for job lifecycle events

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: /employer/jobs/new route — create draft + redirect

**Files:**
- Create: `src/app/(app)/employer/jobs/new/page.tsx`

- [ ] **Step 1: Write the server component**

Create `src/app/(app)/employer/jobs/new/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { TRPCError } from "@trpc/server";
import { getSession } from "@/server/auth";
import { api } from "@/lib/trpc/server";

export const metadata = { title: "New role — Energized" };

export default async function NewJobPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  let draftId: string;
  try {
    const row = await api.jobs.createDraft();
    draftId = row.id;
  } catch (e) {
    // Caller has no employer org → bounce through onboarding.
    if (e instanceof TRPCError && e.code === "NOT_FOUND") {
      redirect("/employer/onboarding");
    }
    throw e;
  }

  redirect(`/employer/jobs/${draftId}/edit?step=1`);
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/app/(app)/employer/jobs/new/page.tsx
git commit -m "$(cat <<'EOF'
feat(jobs): /employer/jobs/new entry — creates draft and redirects

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: /employer/jobs/[id]/edit — page shell

**Files:**
- Create: `src/app/(app)/employer/jobs/[id]/edit/page.tsx`

- [ ] **Step 1: Write the server component**

Create `src/app/(app)/employer/jobs/[id]/edit/page.tsx`:

```tsx
import { redirect, notFound } from "next/navigation";
import { getSession } from "@/server/auth";
import { api } from "@/lib/trpc/server";
import { JobWizardClient } from "./job-wizard-client";

export const metadata = { title: "Edit role — Energized" };

export default async function EditJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const { id } = await params;

  let job;
  try {
    job = await api.jobs.getById({ id });
  } catch {
    notFound();
  }

  return <JobWizardClient initial={job} />;
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: passes (the import of `JobWizardClient` will fail — that's fine for now, we add it in the next task and re-check). If typecheck fails on the import, skip to Task 11 before committing.

Actually, since the import resolves to a not-yet-created file, we must complete Task 11 together before committing. Proceed to Task 11 without committing this file yet.

---

## Task 11: Wizard client shell + autosave

**Files:**
- Create: `src/app/(app)/employer/jobs/[id]/edit/job-wizard-client.tsx`

Provides the page chrome, step rail, URL `?step=N` sync, and the autosave hook. The actual step bodies are filled in by Task 12.

- [ ] **Step 1: Write the shell**

Create `src/app/(app)/employer/jobs/[id]/edit/job-wizard-client.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/shared/icon";
import { api } from "@/lib/trpc/client";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/server/api/root";
import {
  BasicsStep,
  LocationStep,
  PayStep,
  StoryStep,
  type WizardDraft,
} from "./wizard-steps";

type JobRow = inferRouterOutputs<AppRouter>["jobs"]["getById"];

const STEPS = [
  { id: 1, eyebrow: "STEP 01 · THE ROLE", title: "What's the role?", hint: "The basics recruiters search by." },
  { id: 2, eyebrow: "STEP 02 · WHERE & HOW", title: "Where is this work?", hint: "Location, setup, rotation." },
  { id: 3, eyebrow: "STEP 03 · PAY & TICKETS", title: "What does it pay, what does it need?", hint: "Range and required certifications." },
  { id: 4, eyebrow: "STEP 04 · THE STORY", title: "Tell the candidate what this actually is.", hint: "Summary plus a real description." },
] as const;

const AUTOSAVE_DEBOUNCE_MS = 600;

const FIELD_TO_STEP: Record<string, number> = {
  title: 1,
  sector: 1,
  experienceLevel: 1,
  location: 2,
  workSetup: 2,
  salary: 3,
  salaryRange: 3,
  description: 4,
  summary: 4,
};

function firstStepWithMissing(fields: string[]): number | null {
  let min: number | null = null;
  for (const f of fields) {
    const s = FIELD_TO_STEP[f];
    if (s != null && (min == null || s < min)) min = s;
  }
  return min;
}

function toDraft(row: JobRow): WizardDraft {
  return {
    title: row.title ?? "",
    sector: row.sector,
    subSectors: row.subSectors,
    experienceLevel: row.experienceLevel,
    location: row.location ?? "",
    workSetup: row.workSetup,
    rotationSchedule: row.rotationSchedule,
    hoursPerWeek: row.hoursPerWeek,
    salaryMin: row.salaryMin,
    salaryMax: row.salaryMax,
    salaryCurrency: row.salaryCurrency ?? "CAD",
    salaryPeriod: row.salaryPeriod ?? "year",
    requiredCertifications: row.requiredCertifications,
    screeningQuestions: row.screeningQuestions,
    summary: row.summary ?? "",
    description: row.description ?? "",
  };
}

export function JobWizardClient({ initial }: { initial: JobRow }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const stepFromUrl = Math.max(
    1,
    Math.min(4, parseInt(searchParams.get("step") ?? "1", 10) || 1),
  );
  const [step, setStep] = useState<number>(stepFromUrl);
  const [draft, setDraft] = useState<WizardDraft>(toDraft(initial));
  const [status, setStatus] = useState(initial.status);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);

  const updateDraft = api.jobs.updateDraft.useMutation();
  const publish = api.jobs.publish.useMutation();

  const savedSnapshotRef = useRef<WizardDraft>(draft);
  const pendingTimerRef = useRef<number | null>(null);

  const flushSave = useCallback(async () => {
    if (pendingTimerRef.current) {
      window.clearTimeout(pendingTimerRef.current);
      pendingTimerRef.current = null;
    }
    if (JSON.stringify(savedSnapshotRef.current) === JSON.stringify(draft))
      return;
    await updateDraft.mutateAsync({
      id: initial.id,
      patch: {
        title: draft.title || null,
        sector: draft.sector,
        subSectors: draft.subSectors,
        experienceLevel: draft.experienceLevel,
        location: draft.location || null,
        workSetup: draft.workSetup,
        rotationSchedule: draft.rotationSchedule,
        hoursPerWeek: draft.hoursPerWeek,
        salaryMin: draft.salaryMin,
        salaryMax: draft.salaryMax,
        salaryCurrency: draft.salaryCurrency,
        salaryPeriod: draft.salaryPeriod as "year" | "hour" | "day",
        requiredCertifications: draft.requiredCertifications,
        screeningQuestions: draft.screeningQuestions,
        summary: draft.summary || null,
        description: draft.description || null,
      },
    });
    savedSnapshotRef.current = draft;
  }, [draft, initial.id, updateDraft]);

  useEffect(() => {
    if (status !== "draft") return;
    if (pendingTimerRef.current) window.clearTimeout(pendingTimerRef.current);
    pendingTimerRef.current = window.setTimeout(() => {
      void flushSave();
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => {
      if (pendingTimerRef.current) window.clearTimeout(pendingTimerRef.current);
    };
  }, [draft, flushSave, status]);

  const goStep = async (next: number) => {
    const target = Math.max(1, Math.min(4, next));
    await flushSave();
    setStep(target);
    router.replace(`/employer/jobs/${initial.id}/edit?step=${target}`);
  };

  const activeStep = useMemo(() => STEPS.find((s) => s.id === step)!, [step]);

  const onPublish = async () => {
    setPublishError(null);
    setMissingFields([]);
    try {
      await flushSave();
      await publish.mutateAsync({ id: initial.id });
      router.push(`/employer/profile#ep-jobs`);
    } catch (e) {
      if (e instanceof Error) {
        const match = e.message.match(/^MISSING_FIELDS:(.+)$/);
        if (match) {
          const fields = match[1].split(",").filter(Boolean);
          setMissingFields(fields);
          setPublishError(
            `Some required fields are missing: ${fields.join(", ")}. They're highlighted below.`,
          );
          // Jump to the first step containing a missing field.
          const firstStep = firstStepWithMissing(fields);
          if (firstStep && firstStep !== step) {
            setStep(firstStep);
            router.replace(`/employer/jobs/${initial.id}/edit?step=${firstStep}`);
          }
        } else {
          setPublishError(e.message);
        }
      } else {
        setPublishError("Publish failed.");
      }
    }
  };

  const saving = updateDraft.isPending;
  const canPublish = status === "draft";

  return (
    <div className="ob-shell v2">
      <header className="ob-top">
        <div style={{ display: "flex", gap: 28, alignItems: "center" }}>
          <Image
            src="/energized-logo.svg"
            alt="Energized"
            width={144}
            height={80}
            priority
            style={{ height: 40, width: "auto" }}
          />
          <div className="pp-crumbs">
            <span>App</span>
            <span className="sep">/</span>
            <span>Employer</span>
            <span className="sep">/</span>
            <span>Jobs</span>
            <span className="sep">/</span>
            <span className="current">
              {status === "draft" ? "New role" : "Edit role"}
            </span>
          </div>
        </div>
        <div className="ob-top-right">
          <div className="ob-save-state">
            <span className="dot" />
            <span>{saving ? "Saving…" : "All changes saved"}</span>
          </div>
          <button
            className="v2-btn v2-btn-link"
            onClick={async () => {
              await flushSave();
              router.push("/employer/profile#ep-jobs");
            }}
          >
            Save &amp; exit →
          </button>
        </div>
      </header>

      <div className="ob-body">
        <aside className="ob-rail">
          <div className="ob-rail-head">
            <div className="v2-eyebrow">Post a role</div>
            <div className="ob-completion">
              <div className="ob-completion-bar">
                <div
                  className="ob-completion-bar-fill"
                  style={{ width: `${((step - 1) / 3) * 100}%` }}
                />
              </div>
              <div className="ob-completion-pct">{step} of {STEPS.length}</div>
            </div>
          </div>
          <nav className="ob-steps">
            {STEPS.map((s) => (
              <button
                key={s.id}
                className={`ob-step ${step === s.id ? "active" : ""} ${step > s.id ? "done" : ""}`}
                onClick={() => void goStep(s.id)}
              >
                <span className="ob-step-n">{String(s.id).padStart(2, "0")}</span>
                <span className="ob-step-title">{s.title}</span>
              </button>
            ))}
          </nav>
        </aside>

        <main className="ob-main">
          <div className="v2-eyebrow" style={{ marginBottom: 12 }}>
            {activeStep.eyebrow}
          </div>
          <h1 className="v2-h2" style={{ fontStyle: "italic", marginBottom: 8 }}>
            {activeStep.title}
          </h1>
          <p style={{ color: "var(--v2-ink-500)", marginBottom: 28 }}>
            {activeStep.hint}
          </p>

          {step === 1 && (
            <BasicsStep draft={draft} setDraft={setDraft} missing={missingFields} />
          )}
          {step === 2 && (
            <LocationStep draft={draft} setDraft={setDraft} missing={missingFields} />
          )}
          {step === 3 && (
            <PayStep draft={draft} setDraft={setDraft} missing={missingFields} />
          )}
          {step === 4 && (
            <StoryStep draft={draft} setDraft={setDraft} missing={missingFields} />
          )}

          {publishError && (
            <div
              role="alert"
              style={{
                marginTop: 20,
                padding: "10px 14px",
                background: "var(--v2-coral-soft)",
                color: "#A63A20",
                borderRadius: 10,
                fontSize: 13,
              }}
            >
              {publishError}
            </div>
          )}

          <div
            style={{
              marginTop: 32,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
            }}
          >
            <button
              className="v2-btn v2-btn-ghost"
              onClick={() => void goStep(step - 1)}
              disabled={step === 1}
            >
              <Icon name="arrowUpRight" size={14} /> Back
            </button>

            {step < 4 ? (
              <button
                className="v2-btn v2-btn-primary"
                onClick={() => void goStep(step + 1)}
              >
                Next <Icon name="arrowUpRight" size={14} />
              </button>
            ) : (
              <div style={{ display: "flex", gap: 12 }}>
                <button
                  className="v2-btn v2-btn-ghost"
                  onClick={async () => {
                    await flushSave();
                    router.push("/employer/profile#ep-jobs");
                  }}
                >
                  Save draft &amp; exit
                </button>
                <button
                  className="v2-btn v2-btn-primary"
                  onClick={() => void onPublish()}
                  disabled={!canPublish || publish.isPending || saving}
                >
                  {publish.isPending ? "Publishing…" : "Publish role"}
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck (still expected to fail until Task 12)**

Run: `pnpm typecheck`
Expected: fails on missing `./wizard-steps` import — that's the next task.

---

## Task 12: Wizard step components

**Files:**
- Create: `src/app/(app)/employer/jobs/[id]/edit/wizard-steps.tsx`

Contains all four step bodies, sharing a `WizardDraft` type and a `setDraft` callback. One file keeps the step code close together.

- [ ] **Step 1: Write the file**

Create `src/app/(app)/employer/jobs/[id]/edit/wizard-steps.tsx`:

```tsx
"use client";

import type { Dispatch, SetStateAction } from "react";
import { Icon } from "@/components/shared/icon";
import {
  CERTIFICATION_OPTIONS,
  EXPERIENCE_LEVEL_LABELS,
  HOURS_PER_WEEK_OPTIONS,
  ROTATION_OPTIONS,
  SALARY_CURRENCY_OPTIONS,
  SALARY_PERIOD_OPTIONS,
  SECTOR_LABELS,
  SUB_SECTOR_OPTIONS,
  WORK_SETUP_LABELS,
  type JobExperienceLevel,
  type JobSector,
  type JobWorkSetup,
} from "@/lib/jobs-options";

export type WizardDraft = {
  title: string;
  sector: JobSector | null;
  subSectors: string[];
  experienceLevel: JobExperienceLevel | null;
  location: string;
  workSetup: JobWorkSetup | null;
  rotationSchedule: string | null;
  hoursPerWeek: number | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
  salaryPeriod: string;
  requiredCertifications: string[];
  screeningQuestions: { q: string; required: boolean }[];
  summary: string;
  description: string;
};

type Props = {
  draft: WizardDraft;
  setDraft: Dispatch<SetStateAction<WizardDraft>>;
  missing: string[];
};

function errCls(missing: string[], field: string) {
  return missing.includes(field) ? "v2-input-block has-error" : "v2-input-block";
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: "var(--v2-font-mono)",
        fontSize: 11,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "var(--v2-ink-500)",
        marginBottom: 10,
      }}
    >
      {children}
    </div>
  );
}

export function BasicsStep({ draft, setDraft, missing }: Props) {
  const toggleSub = (s: string) =>
    setDraft((d) => ({
      ...d,
      subSectors: d.subSectors.includes(s)
        ? d.subSectors.filter((x) => x !== s)
        : d.subSectors.length < 4
          ? [...d.subSectors, s]
          : d.subSectors,
    }));

  return (
    <div className="ob-grid">
      <div className="ob-field" style={{ gridColumn: "1/-1" }}>
        <label>Job title</label>
        <input
          className={errCls(missing, "title")}
          value={draft.title}
          onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
          placeholder="e.g. Senior Controls Engineer"
        />
      </div>

      <div className="ob-field" style={{ gridColumn: "1/-1" }}>
        <FieldLabel>Sector</FieldLabel>
        <div className="v2-filter-chips">
          {(Object.keys(SECTOR_LABELS) as JobSector[]).map((v) => (
            <button
              key={v}
              type="button"
              className={`v2-filter-chip ${draft.sector === v ? "active" : ""}`}
              onClick={() => setDraft((d) => ({ ...d, sector: v }))}
            >
              {SECTOR_LABELS[v]}
            </button>
          ))}
        </div>
      </div>

      <div className="ob-field" style={{ gridColumn: "1/-1" }}>
        <FieldLabel>Sub-sectors · pick up to 4</FieldLabel>
        <div className="v2-filter-chips">
          {SUB_SECTOR_OPTIONS.map((s) => (
            <button
              key={s}
              type="button"
              className={`v2-filter-chip ${draft.subSectors.includes(s) ? "active" : ""}`}
              onClick={() => toggleSub(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="ob-field" style={{ gridColumn: "1/-1" }}>
        <FieldLabel>Experience level</FieldLabel>
        <div className="v2-filter-chips">
          {(Object.keys(EXPERIENCE_LEVEL_LABELS) as JobExperienceLevel[]).map(
            (v) => (
              <button
                key={v}
                type="button"
                className={`v2-filter-chip ${draft.experienceLevel === v ? "active" : ""}`}
                onClick={() =>
                  setDraft((d) => ({ ...d, experienceLevel: v }))
                }
              >
                {EXPERIENCE_LEVEL_LABELS[v]}
              </button>
            ),
          )}
        </div>
      </div>
    </div>
  );
}

export function LocationStep({ draft, setDraft, missing }: Props) {
  const showRotation =
    draft.workSetup === "onsite" || draft.workSetup === "hybrid_preferred";

  return (
    <div className="ob-grid">
      <div className="ob-field" style={{ gridColumn: "1/-1" }}>
        <label>Location</label>
        <input
          className={errCls(missing, "location")}
          value={draft.location}
          onChange={(e) =>
            setDraft((d) => ({ ...d, location: e.target.value }))
          }
          placeholder="e.g. Calgary, AB or Remote — Canada"
        />
      </div>

      <div className="ob-field" style={{ gridColumn: "1/-1" }}>
        <FieldLabel>Work setup</FieldLabel>
        <div className="v2-filter-chips">
          {(Object.keys(WORK_SETUP_LABELS) as JobWorkSetup[]).map((v) => (
            <button
              key={v}
              type="button"
              className={`v2-filter-chip ${draft.workSetup === v ? "active" : ""}`}
              onClick={() => setDraft((d) => ({ ...d, workSetup: v }))}
            >
              {WORK_SETUP_LABELS[v]}
            </button>
          ))}
        </div>
      </div>

      {showRotation && (
        <div className="ob-field" style={{ gridColumn: "1/-1" }}>
          <FieldLabel>Rotation schedule</FieldLabel>
          <div className="v2-filter-chips">
            {ROTATION_OPTIONS.map((v) => {
              const active =
                (v === "None" && !draft.rotationSchedule) ||
                draft.rotationSchedule === v;
              return (
                <button
                  key={v}
                  type="button"
                  className={`v2-filter-chip ${active ? "active" : ""}`}
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      rotationSchedule: v === "None" ? null : v,
                    }))
                  }
                >
                  {v}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="ob-field" style={{ gridColumn: "1/-1" }}>
        <FieldLabel>Hours per week</FieldLabel>
        <div className="v2-filter-chips">
          {HOURS_PER_WEEK_OPTIONS.map((h) => (
            <button
              key={h}
              type="button"
              className={`v2-filter-chip ${draft.hoursPerWeek === h ? "active" : ""}`}
              onClick={() => setDraft((d) => ({ ...d, hoursPerWeek: h }))}
            >
              {h}
              {h === 44 ? "+" : ""}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PayStep({ draft, setDraft, missing }: Props) {
  const addQuestion = () =>
    setDraft((d) => ({
      ...d,
      screeningQuestions: [
        ...d.screeningQuestions,
        { q: "", required: false },
      ].slice(0, 8),
    }));

  const setQ = (idx: number, patch: Partial<{ q: string; required: boolean }>) =>
    setDraft((d) => ({
      ...d,
      screeningQuestions: d.screeningQuestions.map((row, i) =>
        i === idx ? { ...row, ...patch } : row,
      ),
    }));

  const removeQ = (idx: number) =>
    setDraft((d) => ({
      ...d,
      screeningQuestions: d.screeningQuestions.filter((_, i) => i !== idx),
    }));

  const toggleCert = (c: string) =>
    setDraft((d) => ({
      ...d,
      requiredCertifications: d.requiredCertifications.includes(c)
        ? d.requiredCertifications.filter((x) => x !== c)
        : [...d.requiredCertifications, c],
    }));

  const salaryErr = missing.includes("salary") || missing.includes("salaryRange");

  return (
    <div className="ob-grid">
      <div className="ob-field" style={{ gridColumn: "1/-1" }}>
        <FieldLabel>Salary range</FieldLabel>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr auto auto",
            gap: 10,
          }}
        >
          <input
            type="number"
            className={salaryErr ? "v2-input-block has-error" : "v2-input-block"}
            placeholder="Min"
            value={draft.salaryMin ?? ""}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                salaryMin: e.target.value === "" ? null : Number(e.target.value),
              }))
            }
          />
          <input
            type="number"
            className={salaryErr ? "v2-input-block has-error" : "v2-input-block"}
            placeholder="Max"
            value={draft.salaryMax ?? ""}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                salaryMax: e.target.value === "" ? null : Number(e.target.value),
              }))
            }
          />
          <select
            className="v2-input-block"
            value={draft.salaryCurrency}
            onChange={(e) =>
              setDraft((d) => ({ ...d, salaryCurrency: e.target.value }))
            }
          >
            {SALARY_CURRENCY_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <select
            className="v2-input-block"
            value={draft.salaryPeriod}
            onChange={(e) =>
              setDraft((d) => ({ ...d, salaryPeriod: e.target.value }))
            }
          >
            {SALARY_PERIOD_OPTIONS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <div
          style={{
            marginTop: 6,
            fontSize: 12,
            color: "var(--v2-ink-500)",
          }}
        >
          Jobseekers see a range, not your margin.
        </div>
      </div>

      <div className="ob-field" style={{ gridColumn: "1/-1" }}>
        <FieldLabel>Required certifications</FieldLabel>
        <div className="v2-filter-chips">
          {CERTIFICATION_OPTIONS.map((c) => (
            <button
              key={c}
              type="button"
              className={`v2-filter-chip ${draft.requiredCertifications.includes(c) ? "active" : ""}`}
              onClick={() => toggleCert(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="ob-field" style={{ gridColumn: "1/-1" }}>
        <FieldLabel>Screening questions · optional, up to 8</FieldLabel>
        {draft.screeningQuestions.map((row, idx) => (
          <div
            key={idx}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto auto",
              gap: 10,
              marginBottom: 8,
              alignItems: "center",
            }}
          >
            <input
              className="v2-input-block"
              placeholder="e.g. Do you hold a valid H2S Alive?"
              value={row.q}
              onChange={(e) => setQ(idx, { q: e.target.value })}
            />
            <label
              style={{
                display: "inline-flex",
                gap: 6,
                alignItems: "center",
                fontSize: 13,
                color: "var(--v2-ink-600)",
              }}
            >
              <input
                type="checkbox"
                checked={row.required}
                onChange={(e) => setQ(idx, { required: e.target.checked })}
              />
              Required
            </label>
            <button
              type="button"
              className="ob-icon-btn danger"
              onClick={() => removeQ(idx)}
              aria-label="Remove"
            >
              <Icon name="x" size={14} />
            </button>
          </div>
        ))}
        {draft.screeningQuestions.length < 8 && (
          <button
            type="button"
            className="v2-btn v2-btn-ghost v2-btn-sm"
            onClick={addQuestion}
          >
            <Icon name="plus" size={14} /> Add question
          </button>
        )}
      </div>
    </div>
  );
}

export function StoryStep({ draft, setDraft, missing }: Props) {
  return (
    <div className="ob-grid">
      <div className="ob-field" style={{ gridColumn: "1/-1" }}>
        <label>Summary</label>
        <input
          className={errCls(missing, "summary")}
          value={draft.summary}
          onChange={(e) =>
            setDraft((d) => ({ ...d, summary: e.target.value.slice(0, 200) }))
          }
          placeholder="One line — what the role is, not the company."
        />
        <div
          style={{
            marginTop: 6,
            fontSize: 12,
            color: "var(--v2-ink-500)",
            textAlign: "right",
          }}
        >
          {draft.summary.length}/200
        </div>
      </div>

      <div className="ob-field" style={{ gridColumn: "1/-1" }}>
        <label>Description</label>
        <textarea
          className={errCls(missing, "description")}
          rows={10}
          value={draft.description}
          onChange={(e) =>
            setDraft((d) => ({ ...d, description: e.target.value.slice(0, 4000) }))
          }
          placeholder="What the role actually is. What the first 90 days look like. Who it reports to."
        />
        <div
          style={{
            marginTop: 6,
            fontSize: 12,
            color:
              draft.description.length < 100
                ? "#A63A20"
                : "var(--v2-ink-500)",
            textAlign: "right",
          }}
        >
          {draft.description.length}/4000 · 100 min
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add a tiny CSS hook for the `has-error` state**

Modify `src/app/v2.css` — append at the very end of the file:

```css
.v2-input-block.has-error,
.v2-input-block.has-error:focus {
  border-color: #A63A20;
  box-shadow: 0 0 0 4px rgba(166, 58, 32, 0.15);
}
```

- [ ] **Step 3: Typecheck + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: passes.

- [ ] **Step 4: Commit both page + wizard files together**

```bash
git add src/app/(app)/employer/jobs/[id]/edit/page.tsx \
       src/app/(app)/employer/jobs/[id]/edit/job-wizard-client.tsx \
       src/app/(app)/employer/jobs/[id]/edit/wizard-steps.tsx \
       src/app/v2.css
git commit -m "$(cat <<'EOF'
feat(jobs): new-job wizard — 4 steps, autosave, publish

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 13: Preview page + shared preview card

**Files:**
- Create: `src/components/jobs/job-preview-card.tsx`
- Create: `src/app/(app)/employer/jobs/[id]/preview/page.tsx`

- [ ] **Step 1: Write the preview card**

Create `src/components/jobs/job-preview-card.tsx`:

```tsx
import { Icon } from "@/components/shared/icon";
import {
  EXPERIENCE_LEVEL_LABELS,
  SECTOR_LABELS,
  WORK_SETUP_LABELS,
  formatSalary,
  type JobExperienceLevel,
  type JobSector,
  type JobWorkSetup,
} from "@/lib/jobs-options";

type PreviewJob = {
  title: string | null;
  sector: JobSector | null;
  experienceLevel: JobExperienceLevel | null;
  location: string | null;
  workSetup: JobWorkSetup | null;
  rotationSchedule: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  salaryPeriod: string | null;
  requiredCertifications: string[];
  summary: string | null;
  description: string | null;
};

export function JobPreviewCard({ job }: { job: PreviewJob }) {
  return (
    <article
      className="v2"
      style={{
        border: "1px solid var(--v2-ink-200)",
        borderRadius: "var(--v2-r-xl)",
        padding: 28,
        background: "white",
      }}
    >
      <div className="v2-eyebrow" style={{ marginBottom: 10 }}>
        {job.sector ? SECTOR_LABELS[job.sector] : "Sector —"} ·{" "}
        {job.experienceLevel
          ? EXPERIENCE_LEVEL_LABELS[job.experienceLevel]
          : "Level —"}
      </div>
      <h2
        className="v2-h3"
        style={{ fontStyle: "italic", fontWeight: 900, marginBottom: 8 }}
      >
        {job.title || "Untitled role"}
      </h2>
      {job.summary && (
        <p style={{ color: "var(--v2-ink-600)", marginBottom: 16 }}>
          {job.summary}
        </p>
      )}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          marginBottom: 20,
        }}
      >
        {job.location && (
          <span className="v2-chip">
            <Icon name="mapPin" size={12} /> {job.location}
          </span>
        )}
        {job.workSetup && (
          <span className="v2-chip">{WORK_SETUP_LABELS[job.workSetup]}</span>
        )}
        {job.rotationSchedule && (
          <span className="v2-chip">Rotation {job.rotationSchedule}</span>
        )}
        <span className="v2-chip v2-chip-accent">
          {formatSalary(
            job.salaryMin,
            job.salaryMax,
            job.salaryCurrency,
            job.salaryPeriod,
          )}
        </span>
      </div>
      {job.requiredCertifications.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              fontFamily: "var(--v2-font-mono)",
              fontSize: 11,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--v2-ink-500)",
              marginBottom: 8,
            }}
          >
            Required tickets
          </div>
          <div className="v2-filter-chips">
            {job.requiredCertifications.map((c) => (
              <span key={c} className="v2-filter-chip active">
                {c}
              </span>
            ))}
          </div>
        </div>
      )}
      <div
        style={{
          whiteSpace: "pre-wrap",
          lineHeight: 1.65,
          color: "var(--v2-ink-700)",
        }}
      >
        {job.description || "Add a description to bring this role to life."}
      </div>
    </article>
  );
}
```

- [ ] **Step 2: Write the preview page**

Create `src/app/(app)/employer/jobs/[id]/preview/page.tsx`:

```tsx
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/server/auth";
import { api } from "@/lib/trpc/server";
import { JobPreviewCard } from "@/components/jobs/job-preview-card";
import { Icon } from "@/components/shared/icon";

export const metadata = { title: "Preview role — Energized" };

export default async function JobPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const { id } = await params;
  let job;
  try {
    job = await api.jobs.getById({ id });
  } catch {
    notFound();
  }

  return (
    <div className="v2" style={{ minHeight: "100vh", background: "var(--v2-ink-50)" }}>
      <div
        className="v2-container"
        style={{
          paddingTop: 32,
          paddingBottom: 64,
          maxWidth: 820,
        }}
      >
        <Link
          href={`/employer/jobs/${id}/edit?step=1`}
          className="v2-btn v2-btn-ghost v2-btn-sm"
          style={{ marginBottom: 24 }}
        >
          <Icon name="arrowUpRight" size={14} /> Back to editor
        </Link>
        <JobPreviewCard job={job} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Hook the live preview into Step 4**

Modify the wizard step rendering: go back to `src/app/(app)/employer/jobs/[id]/edit/job-wizard-client.tsx` and import the preview card at the top:

```tsx
import { JobPreviewCard } from "@/components/jobs/job-preview-card";
```

Then, update the Step 4 render (inside `<main className="ob-main">`). Replace the `{step === 4 && (...)}` block with:

```tsx
{step === 4 && (
  <div style={{ display: "grid", gap: 28 }}>
    <StoryStep draft={draft} setDraft={setDraft} missing={missingFields} />
    <div className="v2-eyebrow">Live preview</div>
    <JobPreviewCard
      job={{
        title: draft.title || null,
        sector: draft.sector,
        experienceLevel: draft.experienceLevel,
        location: draft.location || null,
        workSetup: draft.workSetup,
        rotationSchedule: draft.rotationSchedule,
        salaryMin: draft.salaryMin,
        salaryMax: draft.salaryMax,
        salaryCurrency: draft.salaryCurrency,
        salaryPeriod: draft.salaryPeriod,
        requiredCertifications: draft.requiredCertifications,
        summary: draft.summary || null,
        description: draft.description || null,
      }}
    />
  </div>
)}
```

- [ ] **Step 4: Typecheck + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: passes.

- [ ] **Step 5: Commit**

```bash
git add src/components/jobs/job-preview-card.tsx \
       src/app/(app)/employer/jobs/[id]/preview/page.tsx \
       src/app/(app)/employer/jobs/[id]/edit/job-wizard-client.tsx
git commit -m "$(cat <<'EOF'
feat(jobs): preview page + live preview in Story step

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 14: Jobs list section on the profile

Replaces `JobsPlaceholder` inside `employer-profile-client.tsx`. Wires the sidebar CTA too.

**Files:**
- Modify: `src/app/(app)/employer/profile/employer-profile-client.tsx`

- [ ] **Step 1: Add imports + data fetch**

Near the top of `employer-profile-client.tsx`, add:

```tsx
import { useRouter } from "next/navigation";
import {
  SECTOR_LABELS as JOB_SECTOR_LABELS,
  WORK_SETUP_LABELS as JOB_WORK_SETUP_LABELS,
} from "@/lib/jobs-options";
```

(Rename the existing `SECTOR_LABELS` import if a collision occurs — the file already has a local `SECTOR_LABELS`; import the jobs ones with aliases as above.)

Inside `EmployerProfileClient`, near the other query hooks, add:

```tsx
const router = useRouter();
const jobsQuery = api.jobs.listForOrg.useQuery();
const closeJob = api.jobs.close.useMutation({ onSuccess: () => void jobsQuery.refetch() });
const reopenJob = api.jobs.reopen.useMutation({ onSuccess: () => void jobsQuery.refetch() });
const deleteDraft = api.jobs.deleteDraft.useMutation({ onSuccess: () => void jobsQuery.refetch() });
const duplicateJob = api.jobs.duplicate.useMutation({
  onSuccess: (row) => router.push(`/employer/jobs/${row.id}/edit?step=1`),
});
```

- [ ] **Step 2: Replace the JobsPlaceholder call**

Find the line:

```tsx
{/* Jobs — placeholder until Phase 4 */}
<JobsPlaceholder id="ep-jobs" />
```

Replace with:

```tsx
<JobsSection
  id="ep-jobs"
  jobs={jobsQuery.data ?? []}
  onNew={() => router.push("/employer/jobs/new")}
  onEdit={(id) => router.push(`/employer/jobs/${id}/edit?step=1`)}
  onPreview={(id) => router.push(`/employer/jobs/${id}/preview`)}
  onClose={(id) => closeJob.mutate({ id })}
  onReopen={(id) => reopenJob.mutate({ id })}
  onDelete={(id) => deleteDraft.mutate({ id })}
  onDuplicate={(id) => duplicateJob.mutate({ id })}
  busy={
    closeJob.isPending ||
    reopenJob.isPending ||
    deleteDraft.isPending ||
    duplicateJob.isPending
  }
/>
```

- [ ] **Step 3: Delete `JobsPlaceholder`**

Find and remove the `JobsPlaceholder` function definition near the bottom of `employer-profile-client.tsx` (it was the Phase 3 placeholder). It is no longer referenced.

- [ ] **Step 4: Add the JobsSection component**

Append to the bottom of the same file:

Also update the import block at the top of the file: add `import type { inferRouterOutputs } from "@trpc/server"` and `import type { AppRouter } from "@/server/api/root"`.

```tsx
type JobRow = inferRouterOutputs<AppRouter>["jobs"]["listForOrg"][number];

function JobsSection({
  id,
  jobs,
  onNew,
  onEdit,
  onPreview,
  onClose,
  onReopen,
  onDelete,
  onDuplicate,
  busy,
}: {
  id?: string;
  jobs: JobRow[];
  onNew: () => void;
  onEdit: (id: string) => void;
  onPreview: (id: string) => void;
  onClose: (id: string) => void;
  onReopen: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  busy: boolean;
}) {
  const published = jobs.filter((j) => j.status === "published").length;
  const drafts = jobs.filter((j) => j.status === "draft").length;

  return (
    <section id={id} className="pp-section" style={{ scrollMarginTop: 100 }}>
      <div className="pp-section-head">
        <div>
          <div className="pp-section-title">Open roles</div>
          <div className="pp-section-sub">
            {published} published · {drafts} draft
          </div>
        </div>
        <button className="v2-btn v2-btn-primary v2-btn-sm" onClick={onNew}>
          <Icon name="plus" size={14} /> New job
        </button>
      </div>

      {jobs.length === 0 ? (
        <div
          style={{
            padding: 32,
            border: "1px dashed var(--v2-ink-200)",
            borderRadius: "var(--v2-r-lg)",
            textAlign: "center",
            color: "var(--v2-ink-500)",
          }}
        >
          <Icon name="briefcase" size={24} />
          <div
            style={{
              marginTop: 10,
              fontFamily: "var(--v2-font-serif)",
              fontSize: 20,
              color: "var(--v2-ink-900)",
              fontWeight: 400,
            }}
          >
            No roles yet
          </div>
          <div style={{ marginTop: 4, fontSize: 14 }}>
            Post your first role and Ember will start surfacing matches.
          </div>
          <button
            className="v2-btn v2-btn-accent v2-btn-sm"
            style={{ marginTop: 16 }}
            onClick={onNew}
          >
            New job <Icon name="plus" size={14} />
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {jobs.map((j) => {
            const posted = j.publishedAt ?? j.createdAt;
            const daysAgo = Math.max(
              0,
              Math.floor((Date.now() - new Date(posted).getTime()) / 86400000),
            );
            return (
              <div
                key={j.id}
                style={{
                  padding: 18,
                  border: "1px solid var(--v2-ink-200)",
                  borderRadius: "var(--v2-r-lg)",
                  background: "white",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 17,
                        marginBottom: 4,
                      }}
                    >
                      {j.title || "Untitled role"}
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--v2-font-mono)",
                        fontSize: 11,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        color: "var(--v2-ink-500)",
                      }}
                    >
                      {j.location || "Location TBD"}
                      {j.workSetup && ` · ${JOB_WORK_SETUP_LABELS[j.workSetup]}`}
                      {` · ${
                        j.status === "draft"
                          ? "Created"
                          : j.status === "published"
                            ? "Posted"
                            : "Closed"
                      } ${daysAgo === 0 ? "today" : `${daysAgo}d ago`}`}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {j.sector && (
                      <span className="v2-chip">
                        {JOB_SECTOR_LABELS[j.sector]}
                      </span>
                    )}
                    <span
                      className={`v2-chip ${
                        j.status === "published"
                          ? "v2-chip-accent"
                          : j.status === "closed"
                            ? "v2-chip-coral"
                            : "v2-chip-outline"
                      }`}
                    >
                      {j.status === "published"
                        ? "Published"
                        : j.status === "closed"
                          ? "Closed"
                          : "Draft"}
                    </span>
                  </div>
                </div>
                <div
                  style={{
                    marginTop: 14,
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  {j.status === "draft" ? (
                    <>
                      <button
                        className="v2-btn v2-btn-ghost v2-btn-sm"
                        onClick={() => onEdit(j.id)}
                      >
                        Resume editing
                      </button>
                      <button
                        className="v2-btn v2-btn-ghost v2-btn-sm"
                        onClick={() => onDuplicate(j.id)}
                        disabled={busy}
                      >
                        Duplicate
                      </button>
                      <button
                        className="v2-btn v2-btn-ghost v2-btn-sm"
                        onClick={() => onDelete(j.id)}
                        disabled={busy}
                      >
                        Delete draft
                      </button>
                    </>
                  ) : j.status === "published" ? (
                    <>
                      <button
                        className="v2-btn v2-btn-ghost v2-btn-sm"
                        onClick={() => onEdit(j.id)}
                      >
                        Edit
                      </button>
                      <button
                        className="v2-btn v2-btn-ghost v2-btn-sm"
                        onClick={() => onPreview(j.id)}
                      >
                        Preview
                      </button>
                      <button
                        className="v2-btn v2-btn-ghost v2-btn-sm"
                        onClick={() => onClose(j.id)}
                        disabled={busy}
                      >
                        Close
                      </button>
                      <button
                        className="v2-btn v2-btn-ghost v2-btn-sm"
                        onClick={() => onDuplicate(j.id)}
                        disabled={busy}
                      >
                        Duplicate
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="v2-btn v2-btn-ghost v2-btn-sm"
                        onClick={() => onPreview(j.id)}
                      >
                        Preview
                      </button>
                      <button
                        className="v2-btn v2-btn-primary v2-btn-sm"
                        onClick={() => onReopen(j.id)}
                        disabled={busy}
                      >
                        Reopen
                      </button>
                      <button
                        className="v2-btn v2-btn-ghost v2-btn-sm"
                        onClick={() => onDuplicate(j.id)}
                        disabled={busy}
                      >
                        Duplicate
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
```

> ⚠️ **Note on edit of a published/closed job:** our current API only allows `updateDraft` when `status='draft'`. If the user clicks **Edit** on a published role, the wizard will still load via `getById`, but `updateDraft` will 400. That's acceptable for this phase (we'll add an "edit published" flow in the next phase); the **Edit** button on published/closed cards is informational and the wizard's save will surface the error inline.

Actually — to prevent confusion, **remove the Edit button on published and closed cards** for this phase. Only keep it on drafts (already labeled "Resume editing"). Update the section above: in the `j.status === "published"` branch, drop the first `Edit` button. In the `else` (closed) branch, no edit exists already. The corrected published branch is:

```tsx
) : j.status === "published" ? (
  <>
    <button
      className="v2-btn v2-btn-ghost v2-btn-sm"
      onClick={() => onPreview(j.id)}
    >
      Preview
    </button>
    <button
      className="v2-btn v2-btn-ghost v2-btn-sm"
      onClick={() => onClose(j.id)}
      disabled={busy}
    >
      Close
    </button>
    <button
      className="v2-btn v2-btn-ghost v2-btn-sm"
      onClick={() => onDuplicate(j.id)}
      disabled={busy}
    >
      Duplicate
    </button>
  </>
) : (
```

- [ ] **Step 5: Wire the sidebar CTA**

In the same file, find the sidebar CTA block starting with `<div className="pp-side-cta">`. Replace the disabled button with:

```tsx
<button
  className="v2-btn v2-btn-accent v2-btn-sm"
  style={{ marginTop: 16 }}
  onClick={() => router.push("/employer/jobs/new")}
>
  New job <Icon name="plus" size={14} />
</button>
```

(Drop the `disabled` prop and the `title="Coming in Phase 4"` attribute.)

- [ ] **Step 6: Typecheck + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: passes.

- [ ] **Step 7: Commit**

```bash
git add src/app/(app)/employer/profile/employer-profile-client.tsx
git commit -m "$(cat <<'EOF'
feat(employer): live jobs list + working New Job CTA on profile

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 15: Manual verification

**Files:** none

No unit tests to run. Verify manually in the browser.

- [ ] **Step 1: Start the dev server**

Run: `pnpm dev`
Expected: `Ready in Xms` logged; app at `http://localhost:3000`.

- [ ] **Step 2: Sign in as an employer and open the profile**

Navigate: `http://localhost:3000/employer/profile`
Expected: profile loads; sidebar shows **New job** button (not disabled); Jobs section shows the empty state with a working button.

- [ ] **Step 3: Click New job**

Expected: URL becomes `/employer/jobs/<uuid>/edit?step=1`; the wizard loads with Step 1 active.

- [ ] **Step 4: Fill Step 1**

Type a title, pick a sector, pick sub-sectors (up to 4), pick an experience level. Wait ~1s. Expected: the "Saving…" indicator briefly flashes then shows "All changes saved".

- [ ] **Step 5: Walk through Steps 2–4**

Click Next, fill fields, repeat. Confirm on Step 4 the live preview card mirrors what you typed.

- [ ] **Step 6: Publish without filling a required field**

Clear the description. Click Publish. Expected: inline error strip + the missing-fields-driven highlight on the description field.

- [ ] **Step 7: Publish successfully**

Restore description (≥ 100 chars). Click Publish. Expected: redirect to `/employer/profile#ep-jobs` with the new role listed as Published.

- [ ] **Step 8: Close + reopen**

Click Close on the new role. Confirm the badge flips to Closed (coral) and the button set changes to include Reopen. Click Reopen. Confirm it goes back to Published.

- [ ] **Step 9: Draft abandonment**

Click **New job**, fill Step 1, close the tab. Reopen `/employer/profile`. Expected: the new draft is in the Jobs list with the **Draft** badge and a **Resume editing** button that restores Step 1 state.

- [ ] **Step 10: Final build check**

Run: `pnpm typecheck && pnpm lint`
Expected: passes.

- [ ] **Step 11: No commit**

No files changed during verification.

---

## Verification summary (to report back)

After all tasks:
- `pnpm typecheck` passes
- `pnpm lint` passes
- Manual flow: new → wizard → publish → list → close → reopen → duplicate → draft persistence all work

---

## Out of scope (deferred)

- Unit tests (vitest/playwright configs + specs)
- Editing a published role in place (currently blocked by `updateDraft` guard)
- Public `/jobs/:id` route for jobseekers
- Applicant pipeline
- AI posting assistant
- PostHog event emission beyond the registry (will be wired in a dedicated observability pass)
