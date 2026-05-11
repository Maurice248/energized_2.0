import { and, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "@/server/api/trpc";
import {
  applications,
  certifications,
  employerOrgs,
  jobListings,
  jobMatches,
  orgMembers,
  profiles,
  user,
  workHistory,
} from "@/server/db/schema";
import { EMBER_ENABLED, draftCoverNote, scoreJobMatch } from "@/lib/ai";
import {
  isEntitledSubscriptionStatus,
  isJobseekerPlanTier,
  isPlanTier,
} from "@/lib/billing-tiers";

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

async function requireActiveJobseekerSubscription(
  db: typeof import("@/server/db").db,
  userId: string,
): Promise<void> {
  const [u] = await db
    .select({
      jobseekerPlan: user.jobseekerPlan,
      jobseekerSubscriptionStatus: user.jobseekerSubscriptionStatus,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  if (!u) throw new TRPCError({ code: "UNAUTHORIZED" });
  const planActive =
    isJobseekerPlanTier(u.jobseekerPlan) &&
    isEntitledSubscriptionStatus(u.jobseekerSubscriptionStatus);
  if (!planActive) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "AI cover-letter generator is a Gold feature. Upgrade to use AI drafting.",
    });
  }
}

export const matchesRouter = router({
  scoreForJob: protectedProcedure
    .input(z.object({ jobId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!EMBER_ENABLED) {
        return {
          enabled: false as const,
          score: null,
          reason: null,
          lockedReason: "no_key" as const,
        };
      }
      if (ctx.session.user.role === "employer") {
        return {
          enabled: false as const,
          score: null,
          reason: null,
          lockedReason: "employer" as const,
        };
      }

      // Gold-gate the AI match score. Non-Gold jobseekers see an upgrade card.
      const [u] = await ctx.db
        .select({
          jobseekerPlan: user.jobseekerPlan,
          jobseekerSubscriptionStatus: user.jobseekerSubscriptionStatus,
        })
        .from(user)
        .where(eq(user.id, ctx.session.user.id))
        .limit(1);
      const isGold =
        u &&
        isJobseekerPlanTier(u.jobseekerPlan) &&
        isEntitledSubscriptionStatus(u.jobseekerSubscriptionStatus);
      if (!isGold) {
        return {
          enabled: false as const,
          score: null,
          reason: null,
          lockedReason: "gold_required" as const,
        };
      }

      const [profile] = await ctx.db
        .select()
        .from(profiles)
        .where(eq(profiles.userId, ctx.session.user.id))
        .limit(1);

      const [existing] = await ctx.db
        .select()
        .from(jobMatches)
        .where(
          and(
            eq(jobMatches.jobId, input.jobId),
            eq(jobMatches.candidateId, ctx.session.user.id),
          ),
        )
        .limit(1);

      // Cache hit: row exists, is fresh, AND was generated AFTER the
      // candidate's last profile edit. Otherwise re-score so the model
      // sees the new profile state.
      const cacheFresh =
        existing && Date.now() - existing.updatedAt.getTime() < CACHE_TTL_MS;
      const cacheStaleVsProfile =
        existing &&
        profile &&
        profile.updatedAt.getTime() > existing.updatedAt.getTime();
      if (existing && cacheFresh && !cacheStaleVsProfile) {
        return {
          enabled: true as const,
          score: existing.score,
          reason: existing.reason,
          lockedReason: null,
        };
      }

      const [job] = await ctx.db
        .select()
        .from(jobListings)
        .where(eq(jobListings.id, input.jobId))
        .limit(1);
      if (!job) throw new TRPCError({ code: "NOT_FOUND" });

      if (!profile) {
        return {
          enabled: true as const,
          score: null,
          reason: "Complete your profile to see a match score.",
          lockedReason: null,
        };
      }

      const certs = await ctx.db
        .select({ name: certifications.name })
        .from(certifications)
        .where(eq(certifications.profileId, profile.id));
      const work = await ctx.db
        .select({
          role: workHistory.roleTitle,
          employer: workHistory.employerName,
          sector: workHistory.sector,
          summary: workHistory.summary,
        })
        .from(workHistory)
        .where(eq(workHistory.profileId, profile.id))
        .limit(5);

      const profileText = [
        `Headline: ${profile.headline ?? "(none)"}`,
        `Location: ${profile.location ?? "(none)"}`,
        `Years experience: ${profile.yearsExperience ?? "(unknown)"}`,
        `Sectors: ${profile.sectors.join(", ") || "(none)"}`,
        `Skills: ${profile.skills.join(", ") || "(none)"}`,
        `Remote preference: ${profile.remotePreference ?? "(unspecified)"}`,
        `Open to rotational: ${profile.fifoRotational ? "yes" : "no"}`,
        `Certifications: ${certs.map((c) => c.name).join(", ") || "(none)"}`,
        `Recent work:`,
        ...work.map(
          (w) =>
            `- ${w.role ?? "Role"} at ${w.employer ?? "Employer"} (${w.sector ?? "sector"})${w.summary ? ": " + w.summary.slice(0, 140) : ""}`,
        ),
      ].join("\n");

      const jobText = [
        `Title: ${job.title ?? "(untitled)"}`,
        `Sector: ${job.sector ?? "(unspecified)"}`,
        `Sub-sectors: ${job.subSectors.join(", ") || "(none)"}`,
        `Experience level: ${job.experienceLevel ?? "(unspecified)"}`,
        `Location: ${job.location ?? "(unspecified)"}`,
        `Work setup: ${job.workSetup ?? "(unspecified)"}`,
        `Rotation: ${job.rotationSchedule ?? "(none)"}`,
        `Required certifications: ${job.requiredCertifications.join(", ") || "(none)"}`,
        `Summary: ${job.summary ?? ""}`,
        `Description: ${(job.description ?? "").slice(0, 1000)}`,
      ].join("\n");

      try {
        const result = await scoreJobMatch({
          profile: profileText,
          job: jobText,
        });
        if (existing) {
          await ctx.db
            .update(jobMatches)
            .set({ score: result.score, reason: result.reason })
            .where(eq(jobMatches.id, existing.id));
        } else {
          await ctx.db.insert(jobMatches).values({
            jobId: input.jobId,
            candidateId: ctx.session.user.id,
            score: result.score,
            reason: result.reason,
          });
        }
        return {
          enabled: true as const,
          score: result.score,
          reason: result.reason,
          lockedReason: null,
        };
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Scoring failed.";
        return {
          enabled: true as const,
          score: null,
          reason: `Couldn't compute match: ${msg}`,
          lockedReason: null,
        };
      }
    }),

  draftCoverNote: protectedProcedure
    .input(z.object({ jobId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await requireActiveJobseekerSubscription(ctx.db, ctx.session.user.id);

      const [profile] = await ctx.db
        .select()
        .from(profiles)
        .where(eq(profiles.userId, ctx.session.user.id))
        .limit(1);
      if (!profile) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Complete your profile first — drafting needs something to ground in.",
        });
      }

      const [job] = await ctx.db
        .select({
          title: jobListings.title,
          sector: jobListings.sector,
          location: jobListings.location,
          workSetup: jobListings.workSetup,
          rotationSchedule: jobListings.rotationSchedule,
          requiredCertifications: jobListings.requiredCertifications,
          summary: jobListings.summary,
          description: jobListings.description,
          orgName: employerOrgs.name,
        })
        .from(jobListings)
        .innerJoin(employerOrgs, eq(employerOrgs.id, jobListings.orgId))
        .where(eq(jobListings.id, input.jobId))
        .limit(1);
      if (!job) throw new TRPCError({ code: "NOT_FOUND" });

      const certs = await ctx.db
        .select({ name: certifications.name })
        .from(certifications)
        .where(eq(certifications.profileId, profile.id))
        .limit(8);
      const topRoles = await ctx.db
        .select({
          roleTitle: workHistory.roleTitle,
          employerName: workHistory.employerName,
          sector: workHistory.sector,
          summary: workHistory.summary,
        })
        .from(workHistory)
        .where(eq(workHistory.profileId, profile.id))
        .limit(3);

      try {
        const draft = await draftCoverNote({
          candidate: {
            headline: profile.headline,
            summary: profile.summary,
            sectors: profile.sectors,
            location: profile.location,
          },
          topRoles,
          topCertifications: certs.map((c) => c.name),
          job: {
            title: job.title ?? "(untitled)",
            company: job.orgName,
            sector: job.sector,
            location: job.location,
            workSetup: job.workSetup,
            rotationSchedule: job.rotationSchedule,
            requiredCertifications: job.requiredCertifications,
            summary: job.summary,
            description: job.description ?? "",
          },
        });
        return { draft };
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Drafting failed.";
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: msg });
      }
    }),

  /**
   * Employer-side score for an applicant against the role they applied to.
   * Same data + same `job_matches` cache as `scoreForJob` — the underlying
   * "candidate fits job" question is symmetric, so a hit on either side
   * benefits the other.
   *
   * Auth: caller must be an active member of the org owning the job, AND
   * the org must hold an active|trialing employer subscription on a paid
   * tier. Returns the same `enabled / score / reason / lockedReason`
   * shape as `scoreForJob` for UI parity.
   */
  scoreApplicantForEmployer: protectedProcedure
    .input(z.object({ applicationId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!EMBER_ENABLED) {
        return {
          enabled: false as const,
          score: null,
          reason: null,
          lockedReason: "no_key" as const,
        };
      }

      // Resolve application → job → org, and join the candidate's profile.
      const [row] = await ctx.db
        .select({
          jobId: applications.jobId,
          candidateUserId: applications.candidateId,
          orgId: jobListings.orgId,
          orgPlan: employerOrgs.plan,
          orgSubStatus: employerOrgs.subscriptionStatus,
        })
        .from(applications)
        .innerJoin(jobListings, eq(jobListings.id, applications.jobId))
        .innerJoin(employerOrgs, eq(employerOrgs.id, jobListings.orgId))
        .where(eq(applications.id, input.applicationId))
        .limit(1);
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });

      // Caller must be an active member of the org owning the job.
      const [member] = await ctx.db
        .select({ id: orgMembers.id })
        .from(orgMembers)
        .where(
          and(
            eq(orgMembers.orgId, row.orgId),
            eq(orgMembers.userId, ctx.session.user.id),
            eq(orgMembers.status, "active"),
          ),
        )
        .limit(1);
      if (!member) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // Org-side subscription gate: paid plan + entitled status.
      const orgEntitled =
        isPlanTier(row.orgPlan) &&
        isEntitledSubscriptionStatus(row.orgSubStatus);
      if (!orgEntitled) {
        return {
          enabled: false as const,
          score: null,
          reason: null,
          lockedReason: "subscription_required" as const,
        };
      }

      // Reuse the candidate-side cache row (job_matches keys on
      // jobId+candidateId) and the same TTL + profile-edit invalidation.
      const [profile] = await ctx.db
        .select()
        .from(profiles)
        .where(eq(profiles.userId, row.candidateUserId))
        .limit(1);
      if (!profile) {
        return {
          enabled: true as const,
          score: null,
          reason: "Candidate profile is incomplete — no signals to score on.",
          lockedReason: null,
        };
      }

      const [existing] = await ctx.db
        .select()
        .from(jobMatches)
        .where(
          and(
            eq(jobMatches.jobId, row.jobId),
            eq(jobMatches.candidateId, row.candidateUserId),
          ),
        )
        .limit(1);

      const cacheFresh =
        existing && Date.now() - existing.updatedAt.getTime() < CACHE_TTL_MS;
      const cacheStaleVsProfile =
        existing &&
        profile.updatedAt.getTime() > existing.updatedAt.getTime();
      if (existing && cacheFresh && !cacheStaleVsProfile) {
        return {
          enabled: true as const,
          score: existing.score,
          reason: existing.reason,
          lockedReason: null,
        };
      }

      const [job] = await ctx.db
        .select()
        .from(jobListings)
        .where(eq(jobListings.id, row.jobId))
        .limit(1);
      if (!job) throw new TRPCError({ code: "NOT_FOUND" });

      const certs = await ctx.db
        .select({ name: certifications.name })
        .from(certifications)
        .where(eq(certifications.profileId, profile.id));
      const work = await ctx.db
        .select({
          role: workHistory.roleTitle,
          employer: workHistory.employerName,
          sector: workHistory.sector,
          summary: workHistory.summary,
        })
        .from(workHistory)
        .where(eq(workHistory.profileId, profile.id))
        .limit(5);

      const profileText = [
        `Headline: ${profile.headline ?? "(none)"}`,
        `Location: ${profile.location ?? "(none)"}`,
        `Years experience: ${profile.yearsExperience ?? "(unknown)"}`,
        `Sectors: ${profile.sectors.join(", ") || "(none)"}`,
        `Skills: ${profile.skills.join(", ") || "(none)"}`,
        `Remote preference: ${profile.remotePreference ?? "(unspecified)"}`,
        `Open to rotational: ${profile.fifoRotational ? "yes" : "no"}`,
        `Certifications: ${certs.map((c) => c.name).join(", ") || "(none)"}`,
        `Recent work:`,
        ...work.map(
          (w) =>
            `- ${w.role ?? "Role"} at ${w.employer ?? "Employer"} (${w.sector ?? "sector"})${w.summary ? ": " + w.summary.slice(0, 140) : ""}`,
        ),
      ].join("\n");

      const jobText = [
        `Title: ${job.title ?? "(untitled)"}`,
        `Sector: ${job.sector ?? "(unspecified)"}`,
        `Sub-sectors: ${job.subSectors.join(", ") || "(none)"}`,
        `Experience level: ${job.experienceLevel ?? "(unspecified)"}`,
        `Location: ${job.location ?? "(unspecified)"}`,
        `Work setup: ${job.workSetup ?? "(unspecified)"}`,
        `Rotation: ${job.rotationSchedule ?? "(none)"}`,
        `Required certifications: ${job.requiredCertifications.join(", ") || "(none)"}`,
        `Summary: ${job.summary ?? ""}`,
        `Description: ${(job.description ?? "").slice(0, 1000)}`,
      ].join("\n");

      try {
        const result = await scoreJobMatch({
          profile: profileText,
          job: jobText,
        });
        if (existing) {
          await ctx.db
            .update(jobMatches)
            .set({ score: result.score, reason: result.reason })
            .where(eq(jobMatches.id, existing.id));
        } else {
          await ctx.db.insert(jobMatches).values({
            jobId: row.jobId,
            candidateId: row.candidateUserId,
            score: result.score,
            reason: result.reason,
          });
        }
        return {
          enabled: true as const,
          score: result.score,
          reason: result.reason,
          lockedReason: null,
        };
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Scoring failed.";
        return {
          enabled: true as const,
          score: null,
          reason: `Couldn't compute match: ${msg}`,
          lockedReason: null,
        };
      }
    }),
});
