import { and, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "@/server/api/trpc";
import {
  certifications,
  jobListings,
  jobMatches,
  profiles,
  workHistory,
} from "@/server/db/schema";
import { EMBER_ENABLED, scoreJobMatch } from "@/lib/ai";

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const matchesRouter = router({
  scoreForJob: protectedProcedure
    .input(z.object({ jobId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!EMBER_ENABLED) {
        return {
          enabled: false as const,
          score: null,
          reason: null,
        };
      }
      if (ctx.session.user.role === "employer") {
        return {
          enabled: false as const,
          score: null,
          reason: null,
        };
      }

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

      if (existing && Date.now() - existing.updatedAt.getTime() < CACHE_TTL_MS) {
        return {
          enabled: true as const,
          score: existing.score,
          reason: existing.reason,
        };
      }

      const [job] = await ctx.db
        .select()
        .from(jobListings)
        .where(eq(jobListings.id, input.jobId))
        .limit(1);
      if (!job) throw new TRPCError({ code: "NOT_FOUND" });

      const [profile] = await ctx.db
        .select()
        .from(profiles)
        .where(eq(profiles.userId, ctx.session.user.id))
        .limit(1);
      if (!profile) {
        return {
          enabled: true as const,
          score: null,
          reason: "Complete your profile to see a match score.",
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
        };
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Scoring failed.";
        return {
          enabled: true as const,
          score: null,
          reason: `Couldn't compute match: ${msg}`,
        };
      }
    }),
});
