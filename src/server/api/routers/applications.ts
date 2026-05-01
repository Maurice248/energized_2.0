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
import type { sendApplicationStatusEmailTask } from "../../../../code/trigger/send-application-status-email";
import { safeCapture } from "@/lib/posthog";
import {
  EVENT_APPLICATION_STATUS_CHANGED,
  EVENT_APPLICATION_SUBMITTED,
} from "@/lib/analytics-events";

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

const EDIT_ROLES: OrgRole[] = [
  "owner",
  "admin",
  "recruiter",
  "hiring_manager",
];

const applicationStatusZ = z.enum([
  "submitted",
  "reviewed",
  "interview",
  "offer",
  "rejected",
]);

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
    .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, userId)))
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
  submit: protectedProcedure
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
      const hasSectors =
        Array.isArray(profile.sectors) && profile.sectors.length > 0;
      const [wh] = await ctx.db
        .select({ id: workHistory.id })
        .from(workHistory)
        .where(eq(workHistory.profileId, profile.id))
        .limit(1);
      if (!hasHeadline || (!hasSectors && !wh)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Finish your profile — add a headline and at least one sector or work-history entry.",
        });
      }

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
        .select({
          id: jobListings.id,
          orgId: jobListings.orgId,
          title: jobListings.title,
        })
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

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: applicationStatusZ,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [hit] = await ctx.db
        .select({
          id: applications.id,
          orgId: jobListings.orgId,
          jobId: jobListings.id,
          fromStatus: applications.status,
        })
        .from(applications)
        .innerJoin(jobListings, eq(jobListings.id, applications.jobId))
        .where(eq(applications.id, input.id))
        .limit(1);
      if (!hit) throw new TRPCError({ code: "NOT_FOUND" });

      const role = await orgMemberFor(ctx, hit.orgId);
      if (!role)
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not a member of the hiring org.",
        });
      if (!EDIT_ROLES.includes(role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Viewers can't move applicants.",
        });
      }

      await ctx.db
        .update(applications)
        .set({ status: input.status })
        .where(eq(applications.id, input.id));

      await safeCapture({
        distinctId: ctx.session.user.id,
        event: EVENT_APPLICATION_STATUS_CHANGED,
        properties: {
          orgId: hit.orgId,
          jobId: hit.jobId,
          applicationId: input.id,
          fromStatus: hit.fromStatus,
          toStatus: input.status,
        },
      });

      // Notify the candidate when they advance through the pipeline. We skip
      // "submitted" (the application-received email already covered that) and
      // we only fire on actual transitions (no email when status is unchanged).
      if (
        input.status !== "submitted" &&
        input.status !== hit.fromStatus
      ) {
        await tasks.trigger<typeof sendApplicationStatusEmailTask>(
          "send-application-status-email",
          { applicationId: input.id, toStatus: input.status },
        );
      }

      return { id: input.id, status: input.status };
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
