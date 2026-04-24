# Apply Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship end-to-end job applications — a signed-in jobseeker with a completed profile can apply to a published role; an employer org member can see the resulting applicants list.

**Architecture:** A new `applications` table with a one-row-per-(job, candidate) uniqueness constraint. Gate checks run server-side in the `applications.apply` tRPC mutation (session + role + profile completeness + duplicate). Email fan-out (candidate confirmation + employer notification) is fire-and-forget via a single Trigger.dev task. UI: a Radix Dialog on `/jobs/[id]` for submission, a `/applications` list for candidates, a `/employer/jobs/[id]/applicants` list for employers, and applicant counts on the employer Jobs list.

**Tech Stack:** Drizzle + Neon, tRPC v11, Trigger.dev v3, Resend + React Email, shadcn Dialog (already present).

**Spec source:** §1–§3 of the current conversation.

**Package manager:** `pnpm`

---

## File Structure

**New files**
- `src/server/db/schema/applications.ts` — Drizzle table + enum + relations
- `src/server/db/migrations/0010_*.sql` — drizzle-generated
- `src/emails/application-received.tsx` — React Email template (candidate confirmation)
- `src/emails/employer-new-applicant.tsx` — React Email template (employer notification)
- `code/trigger/send-application-email.ts` — Trigger.dev task
- `src/server/api/routers/applications.ts` — tRPC router
- `src/app/jobs/[id]/apply-modal.tsx` — client modal (Radix Dialog wrapper)
- `src/app/applications/page.tsx` — candidate list
- `src/app/(app)/employer/jobs/[id]/applicants/page.tsx` — employer applicants list

**Modified files**
- `src/server/db/schema/enums.ts` — append `applicationStatusEnum`
- `src/server/db/schema/index.ts` — re-export applications
- `src/server/api/root.ts` — register `applicationsRouter`
- `src/app/jobs/[id]/page.tsx` — server-side gate + pass props to client
- `src/app/jobs/[id]/job-detail-client.tsx` — swap the disabled Apply button for a state-driven one that opens the modal
- `src/app/(app)/employer/profile/employer-profile-client.tsx` — show applicant counts + wire "Applicants →" link on published job cards

---

## Task 1: Applications schema + enum

**Files:**
- Modify: `src/server/db/schema/enums.ts`
- Create: `src/server/db/schema/applications.ts`
- Modify: `src/server/db/schema/index.ts`

- [ ] **Step 1: Append the enum**

Add to the end of `src/server/db/schema/enums.ts`:

```ts
export const applicationStatusEnum = pgEnum("application_status", [
  "submitted",
  "reviewed",
  "interview",
  "offer",
  "rejected",
]);
```

- [ ] **Step 2: Create the schema file**

Create `src/server/db/schema/applications.ts`:

```ts
import { relations } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { jobListings } from "./job-listings";
import { applicationStatusEnum } from "./enums";

export type ScreeningAnswer = { q: string; a: string; required: boolean };

export const applications = pgTable(
  "applications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobListings.id, { onDelete: "cascade" }),
    candidateId: text("candidate_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    coverNote: text("cover_note"),
    screeningAnswers: jsonb("screening_answers")
      .$type<ScreeningAnswer[]>()
      .notNull()
      .default([]),
    status: applicationStatusEnum("status").notNull().default("submitted"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    uniqueCandidatePerJob: unique("applications_job_candidate_unique").on(
      t.jobId,
      t.candidateId,
    ),
    jobIdx: index("applications_job_idx").on(t.jobId),
    candidateIdx: index("applications_candidate_idx").on(t.candidateId),
  }),
);

export const applicationsRelations = relations(applications, ({ one }) => ({
  job: one(jobListings, {
    fields: [applications.jobId],
    references: [jobListings.id],
  }),
  candidate: one(user, {
    fields: [applications.candidateId],
    references: [user.id],
  }),
}));
```

- [ ] **Step 3: Re-export**

Append to `src/server/db/schema/index.ts`:

```ts
export * from "./applications";
```

- [ ] **Step 4: Typecheck**

Run: `pnpm typecheck`
Expected: passes.

- [ ] **Step 5: Commit**

```bash
git add src/server/db/schema/enums.ts src/server/db/schema/applications.ts src/server/db/schema/index.ts
git commit -m "$(cat <<'EOF'
feat(db): applications table + status enum

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Generate + apply migration

**Files:**
- Create: `src/server/db/migrations/0010_*.sql` (drizzle-generated)

- [ ] **Step 1: Generate**

Run: `pnpm db:generate`
Expected: new `0010_*.sql` file under `src/server/db/migrations/`, plus `meta/_journal.json` update.

- [ ] **Step 2: Inspect the SQL**

Read the new file. Must contain:
- `CREATE TYPE "public"."application_status" AS ENUM('submitted', 'reviewed', 'interview', 'offer', 'rejected')`
- `CREATE TABLE "applications" (...)` with all columns
- `CONSTRAINT "applications_job_candidate_unique" UNIQUE("job_id","candidate_id")`
- Two `CREATE INDEX` for `applications_job_idx` and `applications_candidate_idx`
- FKs on both `job_id → job_listings.id` (ON DELETE CASCADE) and `candidate_id → user.id` (ON DELETE CASCADE)

If anything is missing, STOP and report as BLOCKED.

- [ ] **Step 3: Apply**

Run: `pnpm db:migrate`
Expected: success.

- [ ] **Step 4: Commit**

```bash
git add src/server/db/migrations/
git commit -m "$(cat <<'EOF'
feat(db): migration for applications table

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Email templates

**Files:**
- Create: `src/emails/application-received.tsx`
- Create: `src/emails/employer-new-applicant.tsx`

Both follow the pattern of the existing `src/emails/team-invite.tsx` — inline styles with the brand palette constants at the top.

- [ ] **Step 1: Candidate confirmation email**

Create `src/emails/application-received.tsx`:

```tsx
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

type Props = {
  candidateName: string;
  jobTitle: string;
  companyName: string;
  viewUrl: string;
};

const NAVY = "#004886";
const LIGHT_BLUE = "#1CABE3";
const INK_900 = "#14171F";
const INK_500 = "#6B7280";
const INK_200 = "#E4E7EE";
const BG = "#F9FAFC";

export default function ApplicationReceivedEmail({
  candidateName,
  jobTitle,
  companyName,
  viewUrl,
}: Props) {
  return (
    <Html>
      <Head />
      <Preview>
        Your application to {companyName} for {jobTitle} is in.
      </Preview>
      <Body
        style={{
          backgroundColor: BG,
          margin: 0,
          padding: "40px 0",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, sans-serif",
          color: INK_900,
        }}
      >
        <Container
          style={{
            maxWidth: 560,
            margin: "0 auto",
            padding: "40px 32px",
            background: "white",
            borderRadius: 16,
            border: `1px solid ${INK_200}`,
          }}
        >
          <Section style={{ marginBottom: 24 }}>
            <Text
              style={{
                fontSize: 12,
                color: INK_500,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                margin: 0,
                fontWeight: 700,
              }}
            >
              Energized
            </Text>
          </Section>
          <Heading
            style={{
              fontSize: 28,
              fontWeight: 900,
              letterSpacing: "-0.02em",
              color: INK_900,
              margin: "0 0 16px",
              fontStyle: "italic",
            }}
          >
            Your application is in.
          </Heading>
          <Text style={{ fontSize: 16, lineHeight: 1.55, color: INK_900 }}>
            Hey {candidateName},
          </Text>
          <Text style={{ fontSize: 16, lineHeight: 1.55, color: INK_900 }}>
            We sent your profile and cover note to <strong>{companyName}</strong> for{" "}
            <strong>{jobTitle}</strong>. They&apos;ll reach out directly if it&apos;s a
            fit.
          </Text>
          <Section style={{ marginTop: 28 }}>
            <Link
              href={viewUrl}
              style={{
                display: "inline-block",
                backgroundColor: INK_900,
                color: "white",
                padding: "12px 22px",
                borderRadius: 999,
                textDecoration: "none",
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              View application
            </Link>
          </Section>
          <Hr style={{ borderColor: INK_200, margin: "32px 0" }} />
          <Text style={{ fontSize: 12, color: INK_500, margin: 0 }}>
            You can track all your applications anytime on Energized.
          </Text>
          <Text style={{ fontSize: 12, color: INK_500, margin: "6px 0 0" }}>
            <Link href="https://energized.biz" style={{ color: NAVY }}>
              energized.biz
            </Link>{" "}
            ·{" "}
            <span style={{ color: LIGHT_BLUE }}>Energy jobs that actually fit.</span>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
```

- [ ] **Step 2: Employer notification email**

Create `src/emails/employer-new-applicant.tsx`:

```tsx
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

type Props = {
  recipientName: string | null;
  candidateName: string;
  candidateHeadline: string | null;
  jobTitle: string;
  companyName: string;
  applicantsUrl: string;
};

const NAVY = "#004886";
const LIGHT_BLUE = "#1CABE3";
const INK_900 = "#14171F";
const INK_500 = "#6B7280";
const INK_200 = "#E4E7EE";
const BG = "#F9FAFC";

export default function EmployerNewApplicantEmail({
  recipientName,
  candidateName,
  candidateHeadline,
  jobTitle,
  companyName,
  applicantsUrl,
}: Props) {
  return (
    <Html>
      <Head />
      <Preview>
        New applicant for {jobTitle} — {candidateName}
      </Preview>
      <Body
        style={{
          backgroundColor: BG,
          margin: 0,
          padding: "40px 0",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, sans-serif",
          color: INK_900,
        }}
      >
        <Container
          style={{
            maxWidth: 560,
            margin: "0 auto",
            padding: "40px 32px",
            background: "white",
            borderRadius: 16,
            border: `1px solid ${INK_200}`,
          }}
        >
          <Section style={{ marginBottom: 24 }}>
            <Text
              style={{
                fontSize: 12,
                color: INK_500,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                margin: 0,
                fontWeight: 700,
              }}
            >
              Energized · {companyName}
            </Text>
          </Section>
          <Heading
            style={{
              fontSize: 28,
              fontWeight: 900,
              letterSpacing: "-0.02em",
              color: INK_900,
              margin: "0 0 16px",
              fontStyle: "italic",
            }}
          >
            New applicant for {jobTitle}.
          </Heading>
          <Text style={{ fontSize: 16, lineHeight: 1.55, color: INK_900 }}>
            {recipientName ? `Hey ${recipientName},` : "Heads up,"}
          </Text>
          <Text style={{ fontSize: 16, lineHeight: 1.55, color: INK_900 }}>
            <strong>{candidateName}</strong>
            {candidateHeadline ? ` — ${candidateHeadline}` : ""} just applied to{" "}
            <strong>{jobTitle}</strong>.
          </Text>
          <Section style={{ marginTop: 28 }}>
            <Link
              href={applicantsUrl}
              style={{
                display: "inline-block",
                backgroundColor: INK_900,
                color: "white",
                padding: "12px 22px",
                borderRadius: 999,
                textDecoration: "none",
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              Review applicants
            </Link>
          </Section>
          <Hr style={{ borderColor: INK_200, margin: "32px 0" }} />
          <Text style={{ fontSize: 12, color: INK_500, margin: 0 }}>
            You&apos;re receiving this because you posted a role on Energized.
          </Text>
          <Text style={{ fontSize: 12, color: INK_500, margin: "6px 0 0" }}>
            <Link href="https://energized.biz" style={{ color: NAVY }}>
              energized.biz
            </Link>{" "}
            ·{" "}
            <span style={{ color: LIGHT_BLUE }}>Energy hires that actually fit.</span>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add src/emails/application-received.tsx src/emails/employer-new-applicant.tsx
git commit -m "$(cat <<'EOF'
feat(emails): application-received + employer-new-applicant templates

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Trigger.dev task

**Files:**
- Create: `code/trigger/send-application-email.ts`

Fan-out task: given an applicationId, loads application + job + org + candidate + primary recipient (owner member), sends candidate confirmation and employer notification in parallel via Resend.

- [ ] **Step 1: Write the file**

Create `code/trigger/send-application-email.ts`:

```ts
import { logger, task } from "@trigger.dev/sdk/v3";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import {
  applications,
  employerOrgs,
  jobListings,
  orgMembers,
  profiles,
  user,
} from "@/server/db/schema";
import { resend } from "@/lib/resend";
import { env } from "@/env";
import ApplicationReceivedEmail from "@/emails/application-received";
import EmployerNewApplicantEmail from "@/emails/employer-new-applicant";

type Payload = { applicationId: string };

export const sendApplicationEmailTask = task({
  id: "send-application-email",
  maxDuration: 120,
  run: async (payload: Payload) => {
    const [row] = await db
      .select({
        applicationId: applications.id,
        coverNote: applications.coverNote,
        candidateName: user.name,
        candidateEmail: user.email,
        candidateHeadline: profiles.headline,
        jobId: jobListings.id,
        jobTitle: jobListings.title,
        orgId: employerOrgs.id,
        orgName: employerOrgs.name,
      })
      .from(applications)
      .innerJoin(jobListings, eq(jobListings.id, applications.jobId))
      .innerJoin(employerOrgs, eq(employerOrgs.id, jobListings.orgId))
      .innerJoin(user, eq(user.id, applications.candidateId))
      .leftJoin(profiles, eq(profiles.userId, user.id))
      .where(eq(applications.id, payload.applicationId))
      .limit(1);

    if (!row) {
      logger.warn("send-application-email: application not found", payload);
      return { sent: 0 };
    }

    // Primary employer recipient: active owner, fallback to any active admin.
    const [owner] = await db
      .select({ email: orgMembers.email, userId: orgMembers.userId })
      .from(orgMembers)
      .where(
        and(
          eq(orgMembers.orgId, row.orgId),
          eq(orgMembers.role, "owner"),
          eq(orgMembers.status, "active"),
        ),
      )
      .limit(1);

    const ownerUser = owner?.userId
      ? (
          await db
            .select({ name: user.name })
            .from(user)
            .where(eq(user.id, owner.userId))
            .limit(1)
        )[0]
      : null;

    const appUrl = env.NEXT_PUBLIC_APP_URL;
    const candidateViewUrl = `${appUrl}/applications`;
    const applicantsUrl = `${appUrl}/employer/jobs/${row.jobId}/applicants`;
    const jobTitleLabel = row.jobTitle ?? "a role";

    const [candidateResult, employerResult] = await Promise.allSettled([
      resend.emails.send({
        from: env.EMAIL_FROM,
        to: row.candidateEmail,
        subject: `Application received — ${jobTitleLabel}`,
        react: ApplicationReceivedEmail({
          candidateName: row.candidateName ?? "there",
          jobTitle: jobTitleLabel,
          companyName: row.orgName,
          viewUrl: candidateViewUrl,
        }),
      }),
      owner?.email
        ? resend.emails.send({
            from: env.EMAIL_FROM,
            to: owner.email,
            subject: `New applicant — ${jobTitleLabel}`,
            react: EmployerNewApplicantEmail({
              recipientName: ownerUser?.name ?? null,
              candidateName: row.candidateName ?? "Someone",
              candidateHeadline: row.candidateHeadline,
              jobTitle: jobTitleLabel,
              companyName: row.orgName,
              applicantsUrl,
            }),
          })
        : Promise.resolve({ error: null }),
    ]);

    const sent =
      (candidateResult.status === "fulfilled" &&
      !(candidateResult.value as { error: unknown }).error
        ? 1
        : 0) +
      (employerResult.status === "fulfilled" &&
      !(employerResult.value as { error: unknown }).error
        ? 1
        : 0);

    if (candidateResult.status === "rejected") {
      logger.error("candidate email failed", {
        reason: String(candidateResult.reason),
      });
    }
    if (employerResult.status === "rejected") {
      logger.error("employer email failed", {
        reason: String(employerResult.reason),
      });
    }

    return { sent };
  },
});
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add code/trigger/send-application-email.ts
git commit -m "$(cat <<'EOF'
feat(jobs): trigger.dev task to fan-out application emails

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Applications tRPC router

**Files:**
- Create: `src/server/api/routers/applications.ts`
- Modify: `src/server/api/root.ts`

- [ ] **Step 1: Write the router**

Create `src/server/api/routers/applications.ts`:

```ts
import { and, desc, eq, exists, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { tasks } from "@trigger.dev/sdk/v3";
import { protectedProcedure, router } from "@/server/api/trpc";
import {
  applications,
  employerOrgs,
  jobListings,
  orgMembers,
  profiles,
  user,
  workHistory,
} from "@/server/db/schema";
import type { sendApplicationEmailTask } from "../../../../code/trigger/send-application-email";

const applySchema = z.object({
  jobId: z.string().uuid(),
  coverNote: z.string().max(1000).nullable().optional(),
  screeningAnswers: z
    .array(
      z.object({
        q: z.string().min(1).max(280),
        a: z.string().max(2000),
        required: z.boolean(),
      }),
    )
    .max(8),
});

type OrgRole = "owner" | "admin" | "recruiter" | "hiring_manager" | "viewer";

async function orgMemberFor(
  ctx: {
    db: typeof import("@/server/db").db;
    session: { user: { id: string; email: string } };
  },
  orgId: string,
): Promise<OrgRole | null> {
  const userId = ctx.session.user.id;
  const email = ctx.session.user.email.toLowerCase();
  const [byUser] = await ctx.db
    .select({ role: orgMembers.role })
    .from(orgMembers)
    .where(
      and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, userId)),
    )
    .limit(1);
  if (byUser) return byUser.role as OrgRole;

  const [byEmail] = await ctx.db
    .select({ role: orgMembers.role })
    .from(orgMembers)
    .where(
      and(
        eq(orgMembers.orgId, orgId),
        eq(orgMembers.email, email),
        eq(orgMembers.status, "active"),
      ),
    )
    .limit(1);
  return (byEmail?.role as OrgRole | undefined) ?? null;
}

export const applicationsRouter = router({
  apply: protectedProcedure
    .input(applySchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role === "employer") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Employers can't apply. Switch accounts to a jobseeker.",
        });
      }

      const [job] = await ctx.db
        .select()
        .from(jobListings)
        .where(eq(jobListings.id, input.jobId))
        .limit(1);
      if (!job) throw new TRPCError({ code: "NOT_FOUND" });
      if (job.status !== "published") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This role isn't accepting applications right now.",
        });
      }

      const [profile] = await ctx.db
        .select()
        .from(profiles)
        .where(eq(profiles.userId, ctx.session.user.id))
        .limit(1);
      if (!profile) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Complete your profile before applying.",
        });
      }
      const hasHeadline = Boolean(profile.headline && profile.headline.trim());
      const hasSectors = Array.isArray(profile.sectors) && profile.sectors.length > 0;
      const hasWorkPromise = ctx.db
        .select({ id: workHistory.id })
        .from(workHistory)
        .where(eq(workHistory.profileId, profile.id))
        .limit(1);
      const [wh] = await hasWorkPromise;
      if (!hasHeadline || (!hasSectors && !wh)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Finish your profile — add a headline and at least one sector or work-history entry.",
        });
      }

      // Required screening questions must have non-empty answers, matched
      // against the CURRENT job.screeningQuestions (not the client input).
      const requiredQs = job.screeningQuestions.filter((q) => q.required);
      for (const rq of requiredQs) {
        const hit = input.screeningAnswers.find(
          (a) => a.q === rq.q && a.a.trim().length > 0,
        );
        if (!hit) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Answer required: "${rq.q}"`,
          });
        }
      }

      try {
        const [row] = await ctx.db
          .insert(applications)
          .values({
            jobId: input.jobId,
            candidateId: ctx.session.user.id,
            coverNote: input.coverNote?.trim() || null,
            screeningAnswers: input.screeningAnswers,
            status: "submitted",
          })
          .returning({ id: applications.id });

        await tasks.trigger<typeof sendApplicationEmailTask>(
          "send-application-email",
          { applicationId: row.id },
        );

        return row;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("applications_job_candidate_unique")) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "You've already applied to this role.",
          });
        }
        throw e;
      }
    }),

  myStatusForJob: protectedProcedure
    .input(z.object({ jobId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [hit] = await ctx.db
        .select({ id: applications.id })
        .from(applications)
        .where(
          and(
            eq(applications.jobId, input.jobId),
            eq(applications.candidateId, ctx.session.user.id),
          ),
        )
        .limit(1);
      return { applied: Boolean(hit) };
    }),

  listMine: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({
        id: applications.id,
        status: applications.status,
        coverNote: applications.coverNote,
        createdAt: applications.createdAt,
        jobId: applications.jobId,
        jobTitle: jobListings.title,
        jobLocation: jobListings.location,
        orgId: employerOrgs.id,
        orgName: employerOrgs.name,
        orgLogoUrl: employerOrgs.logoUrl,
        orgLogoColor: employerOrgs.logoColor,
      })
      .from(applications)
      .innerJoin(jobListings, eq(jobListings.id, applications.jobId))
      .innerJoin(employerOrgs, eq(employerOrgs.id, jobListings.orgId))
      .where(eq(applications.candidateId, ctx.session.user.id))
      .orderBy(desc(applications.createdAt));
  }),

  listForJob: protectedProcedure
    .input(z.object({ jobId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [job] = await ctx.db
        .select({ id: jobListings.id, orgId: jobListings.orgId, title: jobListings.title })
        .from(jobListings)
        .where(eq(jobListings.id, input.jobId))
        .limit(1);
      if (!job) throw new TRPCError({ code: "NOT_FOUND" });
      const role = await orgMemberFor(ctx, job.orgId);
      if (!role)
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not a member of the hiring org.",
        });

      const rows = await ctx.db
        .select({
          id: applications.id,
          coverNote: applications.coverNote,
          screeningAnswers: applications.screeningAnswers,
          status: applications.status,
          createdAt: applications.createdAt,
          candidateId: user.id,
          candidateName: user.name,
          candidateImage: user.image,
          headline: profiles.headline,
          location: profiles.location,
          yearsExperience: profiles.yearsExperience,
          sectors: profiles.sectors,
        })
        .from(applications)
        .innerJoin(user, eq(user.id, applications.candidateId))
        .leftJoin(profiles, eq(profiles.userId, user.id))
        .where(eq(applications.jobId, input.jobId))
        .orderBy(desc(applications.createdAt));

      return { job, role, applicants: rows };
    }),

  countForJob: protectedProcedure
    .input(z.object({ jobId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [job] = await ctx.db
        .select({ id: jobListings.id, orgId: jobListings.orgId })
        .from(jobListings)
        .where(eq(jobListings.id, input.jobId))
        .limit(1);
      if (!job) return { count: 0 };
      const role = await orgMemberFor(ctx, job.orgId);
      if (!role) return { count: 0 };

      const [c] = await ctx.db
        .select({ count: sql<number>`count(*)::int` })
        .from(applications)
        .where(eq(applications.jobId, input.jobId));
      return { count: c?.count ?? 0 };
    }),

  countsForOrg: protectedProcedure.query(async ({ ctx }) => {
    // Returns a map { [jobId]: count } for every job owned by the caller's orgs.
    const rows = await ctx.db
      .select({
        jobId: applications.jobId,
        count: sql<number>`count(*)::int`,
      })
      .from(applications)
      .innerJoin(jobListings, eq(jobListings.id, applications.jobId))
      .where(
        exists(
          ctx.db
            .select({ id: orgMembers.id })
            .from(orgMembers)
            .where(
              and(
                eq(orgMembers.orgId, jobListings.orgId),
                eq(orgMembers.userId, ctx.session.user.id),
              ),
            ),
        ),
      )
      .groupBy(applications.jobId);
    const map: Record<string, number> = {};
    for (const r of rows) map[r.jobId] = r.count;
    return map;
  }),
});
```

- [ ] **Step 2: Register in root**

Modify `src/server/api/root.ts` — add the import and register:

```ts
import { applicationsRouter } from "@/server/api/routers/applications";
```

And in the `router({ ... })` call, add `applications: applicationsRouter,` alphabetically near the top.

- [ ] **Step 3: Typecheck + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: passes (ignore the pre-existing `code/trigger/example.ts` lint error).

- [ ] **Step 4: Commit**

```bash
git add src/server/api/routers/applications.ts src/server/api/root.ts
git commit -m "$(cat <<'EOF'
feat(jobs): applications tRPC router with gate checks and email trigger

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Apply modal + button state on /jobs/[id]

**Files:**
- Create: `src/app/jobs/[id]/apply-modal.tsx`
- Modify: `src/app/jobs/[id]/page.tsx`
- Modify: `src/app/jobs/[id]/job-detail-client.tsx`

- [ ] **Step 1: Write the modal**

Create `src/app/jobs/[id]/apply-modal.tsx`:

```tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Icon } from "@/components/shared/icon";
import { api } from "@/lib/trpc/client";

type ScreeningQuestion = { q: string; required: boolean };

export type ApplyViewerState =
  | { kind: "anonymous" }
  | { kind: "employer" }
  | { kind: "incomplete" }
  | { kind: "applied" }
  | {
      kind: "eligible";
      candidateName: string;
      candidateHeadline: string | null;
      candidateLocation: string | null;
      candidateResumeName: string | null;
    };

export function ApplyButtonAndModal({
  jobId,
  jobTitle,
  companyName,
  screeningQuestions,
  viewer,
  signInHref,
}: {
  jobId: string;
  jobTitle: string;
  companyName: string;
  screeningQuestions: ScreeningQuestion[];
  viewer: ApplyViewerState;
  signInHref: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [coverNote, setCoverNote] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apply = api.applications.apply.useMutation({
    onSuccess: () => setSuccess(true),
    onError: (e) => setError(e.message),
  });

  const firstRequiredMissing = useMemo(() => {
    if (viewer.kind !== "eligible") return null;
    const miss = screeningQuestions.find(
      (q) => q.required && !answers[q.q]?.trim(),
    );
    return miss?.q ?? null;
  }, [answers, screeningQuestions, viewer.kind]);

  const closeAndReset = () => {
    setOpen(false);
    setTimeout(() => {
      setSuccess(false);
      setError(null);
    }, 200);
  };

  if (viewer.kind === "anonymous") {
    return (
      <Link href={signInHref} className="v2-btn v2-btn-primary">
        Sign in to apply <Icon name="arrowUpRight" size={14} />
      </Link>
    );
  }

  if (viewer.kind === "employer") {
    return (
      <button
        className="v2-btn v2-btn-primary"
        disabled
        title="Employers can't apply to roles."
      >
        Employers can&apos;t apply
      </button>
    );
  }

  if (viewer.kind === "incomplete") {
    return (
      <Link
        href="/employer/onboarding"
        className="v2-btn v2-btn-primary"
        style={{ whiteSpace: "nowrap" }}
      >
        Finish your profile to apply <Icon name="arrowUpRight" size={14} />
      </Link>
    );
  }

  if (viewer.kind === "applied") {
    return (
      <button
        className="v2-btn v2-btn-ghost"
        disabled
        title="You've already applied to this role."
      >
        <Icon name="check" size={14} /> Applied
      </button>
    );
  }

  return (
    <>
      <button
        className="v2-btn v2-btn-primary"
        onClick={() => {
          setError(null);
          setSuccess(false);
          setOpen(true);
        }}
      >
        Apply now <Icon name="arrowUpRight" size={14} />
      </button>

      <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : closeAndReset())}>
        <DialogContent
          className="sm:max-w-lg"
          style={{ maxHeight: "90vh", overflow: "auto" }}
        >
          {success ? (
            <>
              <DialogHeader>
                <DialogTitle style={{ fontStyle: "italic" }}>
                  Application sent.
                </DialogTitle>
                <DialogDescription>
                  You&apos;ll hear back from {companyName} through Energized or at your
                  registered email.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <button
                  className="v2-btn v2-btn-ghost v2-btn-sm"
                  onClick={() => {
                    closeAndReset();
                    router.push("/applications");
                  }}
                >
                  My applications
                </button>
                <button
                  className="v2-btn v2-btn-primary v2-btn-sm"
                  onClick={() => {
                    closeAndReset();
                    router.refresh();
                  }}
                >
                  Done
                </button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle style={{ fontStyle: "italic" }}>
                  Apply to {jobTitle}
                </DialogTitle>
                <DialogDescription>
                  at {companyName}
                </DialogDescription>
              </DialogHeader>

              <div
                style={{
                  padding: 14,
                  border: "1px solid var(--v2-ink-200)",
                  borderRadius: 14,
                  background: "var(--v2-ink-50)",
                  marginBottom: 16,
                }}
              >
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
                  What {companyName} will see
                </div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>
                  {viewer.candidateName}
                </div>
                {viewer.candidateHeadline && (
                  <div
                    style={{ fontSize: 13, color: "var(--v2-ink-600)", marginTop: 2 }}
                  >
                    {viewer.candidateHeadline}
                    {viewer.candidateLocation && ` · ${viewer.candidateLocation}`}
                  </div>
                )}
                {viewer.candidateResumeName && (
                  <div
                    style={{ fontSize: 12, color: "var(--v2-ink-500)", marginTop: 6 }}
                  >
                    Resume: {viewer.candidateResumeName}
                  </div>
                )}
                <Link
                  href="/profile"
                  style={{
                    fontSize: 12,
                    color: "var(--v2-accent-deep)",
                    marginTop: 8,
                    display: "inline-block",
                  }}
                >
                  View my profile →
                </Link>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label
                  style={{
                    display: "block",
                    fontFamily: "var(--v2-font-mono)",
                    fontSize: 11,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--v2-ink-500)",
                    marginBottom: 8,
                  }}
                >
                  Cover note · optional
                </label>
                <textarea
                  className="v2-input-block"
                  rows={4}
                  maxLength={1000}
                  value={coverNote}
                  onChange={(e) => setCoverNote(e.target.value)}
                  placeholder="One paragraph on why you're a fit."
                />
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--v2-ink-500)",
                    textAlign: "right",
                    marginTop: 4,
                  }}
                >
                  {coverNote.length}/1000
                </div>
              </div>

              {screeningQuestions.length > 0 && (
                <div style={{ marginBottom: 16 }}>
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
                    Questions from {companyName}
                  </div>
                  <div style={{ display: "grid", gap: 12 }}>
                    {screeningQuestions.map((q, i) => (
                      <div key={i}>
                        <label
                          style={{
                            display: "block",
                            fontSize: 13,
                            color: "var(--v2-ink-800)",
                            marginBottom: 6,
                          }}
                        >
                          {q.q}
                          {q.required && (
                            <span
                              style={{
                                marginLeft: 6,
                                fontSize: 10,
                                color: "#A63A20",
                                fontFamily: "var(--v2-font-mono)",
                                letterSpacing: "0.06em",
                                textTransform: "uppercase",
                              }}
                            >
                              Required
                            </span>
                          )}
                        </label>
                        <input
                          className="v2-input-block"
                          value={answers[q.q] ?? ""}
                          onChange={(e) =>
                            setAnswers((a) => ({ ...a, [q.q]: e.target.value }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div
                style={{
                  fontSize: 11,
                  color: "var(--v2-ink-500)",
                  marginBottom: 18,
                  fontStyle: "italic",
                }}
              >
                Your full profile, resume, and cover note will be shared only with{" "}
                {companyName}.
              </div>

              {error && (
                <div
                  role="alert"
                  style={{
                    padding: "10px 14px",
                    background: "var(--v2-coral-soft)",
                    color: "#A63A20",
                    borderRadius: 10,
                    fontSize: 13,
                    marginBottom: 12,
                  }}
                >
                  {error}
                </div>
              )}

              <DialogFooter>
                <button
                  className="v2-btn v2-btn-ghost v2-btn-sm"
                  onClick={closeAndReset}
                  disabled={apply.isPending}
                >
                  Cancel
                </button>
                <button
                  className="v2-btn v2-btn-primary v2-btn-sm"
                  disabled={apply.isPending || Boolean(firstRequiredMissing)}
                  title={
                    firstRequiredMissing
                      ? `Answer: ${firstRequiredMissing}`
                      : undefined
                  }
                  onClick={() => {
                    const payload = {
                      jobId,
                      coverNote: coverNote.trim() || null,
                      screeningAnswers: screeningQuestions.map((q) => ({
                        q: q.q,
                        a: (answers[q.q] ?? "").trim(),
                        required: q.required,
                      })),
                    };
                    apply.mutate(payload);
                  }}
                >
                  {apply.isPending ? "Sending…" : "Send application →"}
                </button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
```

- [ ] **Step 2: Update the server page to compute viewer state**

In `src/app/jobs/[id]/page.tsx`:

Add these imports near the top with the existing ones:

```ts
import { applications, orgMembers, profiles, workHistory } from "@/server/db/schema";
```

Add after the existing `viewerIsAuthed` line and before the `jsonLd` declaration:

```ts
async function computeViewerState() {
  if (!session) return { kind: "anonymous" as const };
  if (session.user.role === "employer") return { kind: "employer" as const };

  const [member] = await db
    .select({ id: orgMembers.id })
    .from(orgMembers)
    .where(eq(orgMembers.userId, session.user.id))
    .limit(1);
  if (member) return { kind: "employer" as const };

  const [applied] = await db
    .select({ id: applications.id })
    .from(applications)
    .where(
      and(
        eq(applications.jobId, job.id),
        eq(applications.candidateId, session.user.id),
      ),
    )
    .limit(1);
  if (applied) return { kind: "applied" as const };

  const [p] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, session.user.id))
    .limit(1);
  if (!p || !p.headline || !p.headline.trim()) {
    return { kind: "incomplete" as const };
  }
  const hasSectors = Array.isArray(p.sectors) && p.sectors.length > 0;
  const [wh] = await db
    .select({ id: workHistory.id })
    .from(workHistory)
    .where(eq(workHistory.profileId, p.id))
    .limit(1);
  if (!hasSectors && !wh) {
    return { kind: "incomplete" as const };
  }
  return {
    kind: "eligible" as const,
    candidateName: session.user.name ?? session.user.email,
    candidateHeadline: p.headline,
    candidateLocation: p.location,
    candidateResumeName: p.resumeFilename,
  };
}
const viewer = await computeViewerState();
```

Then pass `viewer` into `<JobDetailClient .../>` as a new prop alongside the existing ones:

```tsx
<JobDetailClient
  ...
  viewer={viewer}
  signInHref={`/sign-in?redirect=/jobs/${job.id}`}
/>
```

- [ ] **Step 3: Update the client component**

In `src/app/jobs/[id]/job-detail-client.tsx`:

Add the import at the top:

```ts
import {
  ApplyButtonAndModal,
  type ApplyViewerState,
} from "./apply-modal";
```

Add to `Props`:

```ts
viewer: ApplyViewerState;
signInHref: string;
```

And replace the current `<div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>` block containing the two disabled buttons (and the italic "Apply flow coming soon" helper that follows it) with:

```tsx
<div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
  <ApplyButtonAndModal
    jobId={job.id}
    jobTitle={job.title ?? "Untitled role"}
    companyName={org.name}
    screeningQuestions={job.screeningQuestions}
    viewer={viewer}
    signInHref={signInHref}
  />
  <button
    className="v2-btn v2-btn-ghost"
    disabled
    title="Saved roles coming soon"
  >
    <Icon name="bookmark" size={14} /> Save
  </button>
</div>
```

Accept `viewer` and `signInHref` in the destructured props of `JobDetailClient`.

- [ ] **Step 4: Typecheck + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: passes.

- [ ] **Step 5: Commit**

```bash
git add "src/app/jobs/[id]/apply-modal.tsx" \
       "src/app/jobs/[id]/page.tsx" \
       "src/app/jobs/[id]/job-detail-client.tsx"
git commit -m "$(cat <<'EOF'
feat(jobs): Apply modal + state-driven button on public job detail

Server resolves viewer state (anonymous / employer / incomplete / applied /
eligible) and the client renders the right CTA + opens the apply modal
only for eligible jobseekers.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: `/applications` candidate list

**Files:**
- Create: `src/app/applications/page.tsx`

- [ ] **Step 1: Write the page**

Create `src/app/applications/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { applications, employerOrgs, jobListings } from "@/server/db/schema";
import { getSession } from "@/server/auth";
import { Icon } from "@/components/shared/icon";

export const metadata: Metadata = {
  title: "My applications — Energized",
};

export default async function MyApplicationsPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in?redirect=/applications");

  const rows = await db
    .select({
      id: applications.id,
      status: applications.status,
      createdAt: applications.createdAt,
      jobId: applications.jobId,
      jobTitle: jobListings.title,
      jobLocation: jobListings.location,
      orgId: employerOrgs.id,
      orgName: employerOrgs.name,
      orgLogoUrl: employerOrgs.logoUrl,
      orgLogoColor: employerOrgs.logoColor,
    })
    .from(applications)
    .innerJoin(jobListings, eq(jobListings.id, applications.jobId))
    .innerJoin(employerOrgs, eq(employerOrgs.id, jobListings.orgId))
    .where(eq(applications.candidateId, session.user.id))
    .orderBy(desc(applications.createdAt));

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
          style={{ display: "flex", gap: 20, alignItems: "center", fontSize: 14 }}
        >
          <Link href="/jobs" style={{ color: "var(--v2-ink-700)" }}>
            Jobs
          </Link>
          <Link
            href="/applications"
            style={{ color: "var(--v2-ink-900)", fontWeight: 700 }}
          >
            Applications
          </Link>
        </nav>
      </header>

      <div
        className="v2-container"
        style={{ paddingTop: 48, paddingBottom: 80, maxWidth: 820 }}
      >
        <div className="v2-eyebrow">
          {rows.length} {rows.length === 1 ? "application" : "applications"}
        </div>
        <h1
          className="v2-h2"
          style={{ fontStyle: "italic", fontWeight: 900, marginTop: 14, marginBottom: 24 }}
        >
          Your applications.
        </h1>

        {rows.length === 0 ? (
          <div
            style={{
              padding: 48,
              background: "white",
              border: "1px solid var(--v2-ink-200)",
              borderRadius: "var(--v2-r-xl)",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontFamily: "var(--v2-font-serif)",
                fontSize: 24,
                fontWeight: 900,
                fontStyle: "italic",
                marginBottom: 10,
              }}
            >
              You haven&apos;t applied yet.
            </div>
            <p style={{ color: "var(--v2-ink-500)", marginBottom: 20 }}>
              Browse open roles — there are real jobs waiting.
            </p>
            <Link href="/jobs" className="v2-btn v2-btn-primary v2-btn-sm">
              Browse jobs
            </Link>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {rows.map((r) => (
              <Link
                key={r.id}
                href={`/jobs/${r.jobId}`}
                style={{
                  display: "flex",
                  gap: 14,
                  alignItems: "center",
                  padding: 18,
                  background: "white",
                  border: "1px solid var(--v2-ink-200)",
                  borderRadius: "var(--v2-r-xl)",
                  color: "inherit",
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: r.orgLogoColor,
                    color: "white",
                    display: "grid",
                    placeItems: "center",
                    fontFamily: "var(--v2-font-serif)",
                    fontSize: 18,
                    fontWeight: 900,
                    overflow: "hidden",
                    position: "relative",
                    flexShrink: 0,
                  }}
                >
                  {r.orgLogoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={r.orgLogoUrl}
                      alt={r.orgName}
                      style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    r.orgName.charAt(0).toUpperCase()
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>
                    {r.jobTitle ?? "Untitled role"}
                  </div>
                  <div
                    style={{ fontSize: 13, color: "var(--v2-ink-500)", marginTop: 2 }}
                  >
                    {r.orgName}
                    {r.jobLocation && ` · ${r.jobLocation}`}
                    {` · Applied ${new Date(r.createdAt).toLocaleDateString(
                      "en-CA",
                      { month: "short", day: "numeric" },
                    )}`}
                  </div>
                </div>
                <span className="v2-chip v2-chip-accent">Submitted</span>
                <Icon name="arrowUpRight" size={14} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/app/applications/page.tsx
git commit -m "$(cat <<'EOF'
feat(jobs): /applications candidate list

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Employer applicants page + count on profile

**Files:**
- Create: `src/app/(app)/employer/jobs/[id]/applicants/page.tsx`
- Modify: `src/app/(app)/employer/profile/employer-profile-client.tsx`

- [ ] **Step 1: Write the applicants page**

Create `src/app/(app)/employer/jobs/[id]/applicants/page.tsx`:

```tsx
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import {
  applications,
  jobListings,
  orgMembers,
  profiles,
  user,
} from "@/server/db/schema";
import { getSession } from "@/server/auth";
import { Icon } from "@/components/shared/icon";

export const metadata: Metadata = { title: "Applicants — Energized" };

export default async function JobApplicantsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const { id } = await params;

  const [job] = await db
    .select({
      id: jobListings.id,
      orgId: jobListings.orgId,
      title: jobListings.title,
      status: jobListings.status,
    })
    .from(jobListings)
    .where(eq(jobListings.id, id))
    .limit(1);
  if (!job) notFound();

  const [member] = await db
    .select({ id: orgMembers.id })
    .from(orgMembers)
    .where(
      and(
        eq(orgMembers.orgId, job.orgId),
        eq(orgMembers.userId, session.user.id),
      ),
    )
    .limit(1);
  if (!member) notFound();

  const rows = await db
    .select({
      id: applications.id,
      coverNote: applications.coverNote,
      screeningAnswers: applications.screeningAnswers,
      createdAt: applications.createdAt,
      candidateId: user.id,
      candidateName: user.name,
      candidateImage: user.image,
      headline: profiles.headline,
      location: profiles.location,
      yearsExperience: profiles.yearsExperience,
      sectors: profiles.sectors,
    })
    .from(applications)
    .innerJoin(user, eq(user.id, applications.candidateId))
    .leftJoin(profiles, eq(profiles.userId, user.id))
    .where(eq(applications.jobId, job.id))
    .orderBy(desc(applications.createdAt));

  return (
    <div
      className="v2"
      style={{ minHeight: "100vh", background: "var(--v2-ink-50)" }}
    >
      <div
        className="v2-container"
        style={{ paddingTop: 32, paddingBottom: 64, maxWidth: 960 }}
      >
        <Link
          href="/employer/profile#ep-jobs"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
            color: "var(--v2-ink-500)",
            marginBottom: 20,
            fontFamily: "var(--v2-font-mono)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          <Icon
            name="arrowUpRight"
            size={12}
            style={{ transform: "rotate(180deg)" }}
          />{" "}
          Back to company profile
        </Link>

        <div className="v2-eyebrow">
          Applicants · {rows.length}
        </div>
        <h1
          className="v2-h2"
          style={{
            fontStyle: "italic",
            fontWeight: 900,
            marginTop: 14,
            marginBottom: 8,
          }}
        >
          {job.title ?? "Untitled role"}
        </h1>
        <p style={{ color: "var(--v2-ink-500)", marginBottom: 24 }}>
          Newest first.
        </p>

        {rows.length === 0 ? (
          <div
            style={{
              padding: 48,
              background: "white",
              border: "1px solid var(--v2-ink-200)",
              borderRadius: "var(--v2-r-xl)",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontFamily: "var(--v2-font-serif)",
                fontSize: 24,
                fontWeight: 900,
                fontStyle: "italic",
                marginBottom: 10,
              }}
            >
              No applicants yet.
            </div>
            <p style={{ color: "var(--v2-ink-500)", marginBottom: 20 }}>
              Share the link to your role.
            </p>
            <div
              style={{
                padding: "10px 14px",
                background: "var(--v2-ink-50)",
                borderRadius: 10,
                fontFamily: "var(--v2-font-mono)",
                fontSize: 12,
                color: "var(--v2-ink-700)",
                display: "inline-block",
              }}
            >
              /jobs/{job.id}
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {rows.map((r) => {
              const initials = (r.candidateName ?? "?")
                .split(" ")
                .map((p) => p[0])
                .slice(0, 2)
                .join("")
                .toUpperCase();
              const appliedLabel = new Date(r.createdAt).toLocaleDateString(
                "en-CA",
                { month: "short", day: "numeric" },
              );
              return (
                <div
                  key={r.id}
                  style={{
                    padding: 22,
                    background: "white",
                    border: "1px solid var(--v2-ink-200)",
                    borderRadius: "var(--v2-r-xl)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: 16,
                      alignItems: "flex-start",
                    }}
                  >
                    <div
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 14,
                        background: "var(--v2-ink-900)",
                        color: "var(--v2-accent)",
                        display: "grid",
                        placeItems: "center",
                        fontFamily: "var(--v2-font-serif)",
                        fontSize: 18,
                        fontWeight: 900,
                        overflow: "hidden",
                        position: "relative",
                        flexShrink: 0,
                      }}
                    >
                      {r.candidateImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={r.candidateImage}
                          alt={r.candidateName ?? ""}
                          style={{
                            position: "absolute",
                            inset: 0,
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        initials
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          gap: 10,
                          alignItems: "center",
                          flexWrap: "wrap",
                          marginBottom: 4,
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: 17 }}>
                          {r.candidateName ?? "Anonymous"}
                        </div>
                        <span className="v2-chip v2-chip-accent">Submitted</span>
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          color: "var(--v2-ink-600)",
                          marginBottom: 10,
                        }}
                      >
                        {r.headline ?? "—"}
                        {r.location && ` · ${r.location}`}
                        {r.yearsExperience != null &&
                          ` · ${r.yearsExperience}y exp.`}
                      </div>
                      {r.coverNote && (
                        <div
                          style={{
                            padding: "10px 14px",
                            background: "var(--v2-ink-50)",
                            borderRadius: 10,
                            fontSize: 14,
                            color: "var(--v2-ink-800)",
                            marginBottom: 10,
                            whiteSpace: "pre-wrap",
                            lineHeight: 1.5,
                          }}
                        >
                          {r.coverNote}
                        </div>
                      )}
                      {r.screeningAnswers.length > 0 && (
                        <details style={{ marginBottom: 10 }}>
                          <summary
                            style={{
                              cursor: "pointer",
                              fontSize: 12,
                              fontFamily: "var(--v2-font-mono)",
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                              color: "var(--v2-ink-500)",
                            }}
                          >
                            Answers · {r.screeningAnswers.length}
                          </summary>
                          <ol
                            style={{
                              paddingLeft: 20,
                              marginTop: 8,
                              display: "grid",
                              gap: 6,
                              fontSize: 13,
                              color: "var(--v2-ink-700)",
                            }}
                          >
                            {r.screeningAnswers.map((a, i) => (
                              <li key={i}>
                                <strong>{a.q}</strong>
                                <div>{a.a || <em>No answer</em>}</div>
                              </li>
                            ))}
                          </ol>
                        </details>
                      )}
                      <div
                        style={{
                          display: "flex",
                          gap: 10,
                          alignItems: "center",
                          flexWrap: "wrap",
                        }}
                      >
                        <Link
                          href={`/p/${r.candidateId}`}
                          className="v2-btn v2-btn-ghost v2-btn-sm"
                        >
                          View full profile <Icon name="arrowUpRight" size={13} />
                        </Link>
                        <span
                          style={{
                            fontSize: 12,
                            color: "var(--v2-ink-500)",
                            fontFamily: "var(--v2-font-mono)",
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                          }}
                        >
                          Applied {appliedLabel}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Hook applicant counts into the employer Jobs list**

In `src/app/(app)/employer/profile/employer-profile-client.tsx`:

Add a new query near the other tRPC hooks (right after `jobsQuery`):

```tsx
const applicantCounts = api.applications.countsForOrg.useQuery();
```

In `JobsSection`'s props, add `counts: Record<string, number>;`. Update the call-site in `EmployerProfileClient` to pass `counts={applicantCounts.data ?? {}}` alongside `jobs`.

Inside the card map (where each `j` is rendered), just before the actions row, insert a short meta line:

```tsx
{(() => {
  const count = counts[j.id] ?? 0;
  if (j.status === "draft") return null;
  return (
    <div
      style={{
        marginTop: 10,
        fontFamily: "var(--v2-font-mono)",
        fontSize: 11,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: count > 0 ? "var(--v2-ink-700)" : "var(--v2-ink-500)",
      }}
    >
      {count === 0 ? "No applicants yet" : `${count} applicant${count === 1 ? "" : "s"}`}
    </div>
  );
})()}
```

In the published branch's actions, insert a new button *before* `Preview`:

```tsx
<button
  className="v2-btn v2-btn-ghost v2-btn-sm"
  onClick={() => router.push(`/employer/jobs/${j.id}/applicants`)}
>
  Applicants {counts[j.id] ? `(${counts[j.id]})` : "(0)"} <Icon name="arrowUpRight" size={13} />
</button>
```

(Draft and closed branches stay unchanged.)

- [ ] **Step 3: Typecheck + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/employer/jobs/[id]/applicants/page.tsx" \
       "src/app/(app)/employer/profile/employer-profile-client.tsx"
git commit -m "$(cat <<'EOF'
feat(jobs): employer applicants page + applicant counts on profile

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Manual verification

**Files:** none

- [ ] **Step 1: Dev server is already running at localhost:3000**

No start needed — the user's dev server is external.

- [ ] **Step 2: Apply as an anonymous user**

Open incognito at `http://localhost:3000/jobs/<published-job-id>`.
Expected: Apply button reads **Sign in to apply** and links to `/sign-in?redirect=/jobs/[id]`.

- [ ] **Step 3: Apply as an employer**

Log in with an employer account. Same URL.
Expected: Apply button reads **Employers can't apply** (disabled).

- [ ] **Step 4: Apply as a jobseeker with incomplete profile**

Log in as a jobseeker that hasn't filled their profile.
Expected: Apply button reads **Finish your profile to apply** → link to `/employer/onboarding` (jobseeker onboarding path — confirm with repo nav).

- [ ] **Step 5: Apply as an eligible jobseeker**

Complete profile → reload job page.
Expected: **Apply now** button. Click it. Modal opens with the "What Acme will see" card populated (name, headline, location, resume filename). Cover note input and any screening questions appear. Submit disabled until required screening answers are filled.

- [ ] **Step 6: Submit and observe success state**

Fill cover note, answer required questions, click **Send application →**.
Expected: mutation succeeds. Modal flips to "Application sent." state. Close modal — the button on the job page now shows **Applied ✓** (after router.refresh).

- [ ] **Step 7: Duplicate application**

Reopen the same job in the same session.
Expected: **Applied ✓** (disabled). If you somehow bypass the client gate and POST again, the server rejects with CONFLICT.

- [ ] **Step 8: Candidate side /applications**

Navigate to `http://localhost:3000/applications`.
Expected: one row with the just-applied role. Click → lands on job detail.

- [ ] **Step 9: Employer side**

Log back in as an employer member of the org whose job was applied to. Open `/employer/profile`.
Expected: the job's card shows `1 applicant` in the meta line and an `Applicants (1) →` button. Click it.

- [ ] **Step 10: Applicants page**

Expected: one applicant card with name, headline, location, submitted chip, cover note in a panel (if any), "Answers" disclosure if screening answers were filled, `View full profile →` link to `/p/[candidateId]`.

- [ ] **Step 11: Email sanity (development mode)**

Trigger.dev may or may not be running locally. If it is, check the Trigger.dev dashboard for the `send-application-email` run — expected 2 emails sent (candidate + employer) with 200 responses from Resend. If Trigger.dev dev isn't running, the apply mutation will still succeed; emails will queue for the next worker boot.

- [ ] **Step 12: Final checks**

Run: `pnpm typecheck && pnpm lint`
Expected: passes (only the pre-existing `code/trigger/example.ts` lint error remains).

No commits — verification only.

---

## Out of scope (deferred)

- Status transitions beyond `submitted` (reviewed / interview / offer / rejected)
- Per-job Kanban for employers
- Withdraw-application by candidate
- Employer bulk actions (bulk reject, message, etc.)
- PostHog events for applications
- Unit / E2E tests (no harness in repo yet)
