import { and, desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "@/server/api/trpc";
import {
  employerOrgs,
  jobListings,
  savedJobs,
} from "@/server/db/schema";
import { safeCapture } from "@/lib/posthog";
import { EVENT_JOB_SAVED, EVENT_JOB_UNSAVED } from "@/lib/analytics-events";

export const savedJobsRouter = router({
  toggle: protectedProcedure
    .input(z.object({ jobId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role === "employer") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Employers can't save jobs.",
        });
      }
      const [existing] = await ctx.db
        .select({ id: savedJobs.id })
        .from(savedJobs)
        .where(
          and(
            eq(savedJobs.jobId, input.jobId),
            eq(savedJobs.userId, ctx.session.user.id),
          ),
        )
        .limit(1);
      if (existing) {
        await ctx.db.delete(savedJobs).where(eq(savedJobs.id, existing.id));
        await safeCapture({
          distinctId: ctx.session.user.id,
          event: EVENT_JOB_UNSAVED,
          properties: { jobId: input.jobId },
        });
        return { saved: false };
      }
      const [job] = await ctx.db
        .select({ id: jobListings.id })
        .from(jobListings)
        .where(eq(jobListings.id, input.jobId))
        .limit(1);
      if (!job) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.db
        .insert(savedJobs)
        .values({ jobId: input.jobId, userId: ctx.session.user.id });
      await safeCapture({
        distinctId: ctx.session.user.id,
        event: EVENT_JOB_SAVED,
        properties: { jobId: input.jobId },
      });
      return { saved: true };
    }),

  isSaved: protectedProcedure
    .input(z.object({ jobId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [hit] = await ctx.db
        .select({ id: savedJobs.id })
        .from(savedJobs)
        .where(
          and(
            eq(savedJobs.jobId, input.jobId),
            eq(savedJobs.userId, ctx.session.user.id),
          ),
        )
        .limit(1);
      return { saved: Boolean(hit) };
    }),

  listMine: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({
        id: savedJobs.id,
        createdAt: savedJobs.createdAt,
        jobId: jobListings.id,
        jobTitle: jobListings.title,
        jobLocation: jobListings.location,
        jobStatus: jobListings.status,
        workSetup: jobListings.workSetup,
        sector: jobListings.sector,
        salaryMin: jobListings.salaryMin,
        salaryMax: jobListings.salaryMax,
        salaryCurrency: jobListings.salaryCurrency,
        salaryPeriod: jobListings.salaryPeriod,
        orgId: employerOrgs.id,
        orgName: employerOrgs.name,
        orgLogoUrl: employerOrgs.logoUrl,
        orgLogoColor: employerOrgs.logoColor,
      })
      .from(savedJobs)
      .innerJoin(jobListings, eq(jobListings.id, savedJobs.jobId))
      .innerJoin(employerOrgs, eq(employerOrgs.id, jobListings.orgId))
      .where(eq(savedJobs.userId, ctx.session.user.id))
      .orderBy(desc(savedJobs.createdAt));
  }),
});
