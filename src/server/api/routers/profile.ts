import { and, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "@/server/api/trpc";
import {
  certifications,
  education,
  profiles,
  user,
  workHistory,
} from "@/server/db/schema";
import { safeCapture } from "@/lib/posthog";
import {
  EVENT_PROFILE_UPDATED,
  EVENT_RESUME_AUTOFILL_APPLIED,
  EVENT_RESUME_AUTOFILL_PREVIEWED,
  EVENT_RESUME_UPLOADED,
} from "@/lib/analytics-events";
import {
  EMBER_ENABLED,
  extractResumeAutofillDraftFromPlainText,
  resumeAutofillDraftHasSuggestions,
} from "@/lib/ai";
import { assertResumeBlobUrlForUser } from "@/lib/resume-blob-guard";
import { extractPlainTextFromResumeStorage } from "@/lib/resume-plain-text";
import { polishProfileSummary } from "@/lib/ai";
import {
  isEntitledSubscriptionStatus,
  isJobseekerPlanTier,
} from "@/lib/billing-tiers";

const sectorValues = [
  "oil_gas",
  "renewables",
  "nuclear",
  "utilities",
  "hydrogen",
  "power",
  "other",
] as const;

const remotePreferenceValues = [
  "on_site",
  "hybrid",
  "remote",
  "flexible",
] as const;

const certificationTypeValues = [
  "h2s_alive",
  "first_aid",
  "csts",
  "red_seal",
  "p_eng",
  "nace",
  "fall_protection",
  "other",
] as const;

const availabilityValues = [
  "immediately",
  "notice_2w",
  "notice_4w",
  "notice_3m",
  "browsing",
] as const;

const profileUpdateSchema = z.object({
  headline: z.string().max(140).nullable(),
  summary: z.string().max(600).nullable().optional(),
  phone: z.string().max(32).nullable().optional(),
  yearsExperience: z.number().int().min(0).max(60).nullable(),
  sectors: z.array(z.enum(sectorValues)).max(6),
  willingToRelocate: z.boolean(),
  remotePreference: z.enum(remotePreferenceValues).nullable(),
  location: z.string().max(120).nullable(),
  skills: z.array(z.string().min(1).max(60)).max(30).optional(),
  openToWork: z.boolean().optional(),
  fifoRotational: z.boolean().optional(),
  minCompCad: z.number().int().min(0).max(1000).nullable().optional(),
  availability: z.enum(availabilityValues).nullable().optional(),
});

const certificationInputSchema = z.object({
  type: z.enum(certificationTypeValues),
  name: z.string().min(1).max(120),
  issuer: z.string().max(120).optional().nullable(),
  credentialId: z.string().max(120).optional().nullable(),
  issuedAt: z.date().optional().nullable(),
  expiresAt: z.date().optional().nullable(),
  documentUrl: z.string().url().optional().nullable(),
});

/** Plain object only — Zod 4 disallows `.omit()` on schemas that already use `.refine()`. */
const workHistoryRowShapeSchema = z.object({
  employerName: z.string().min(1).max(160),
  roleTitle: z.string().min(1).max(160),
  site: z.string().max(160).optional().nullable(),
  sector: z.enum(sectorValues).optional().nullable(),
  commodity: z.string().max(120).optional().nullable(),
  rotation: z.string().max(40).optional().nullable(),
  summary: z.string().max(2000).optional().nullable(),
  skills: z.array(z.string().min(1).max(60)).max(20).optional(),
  startedAt: z.date(),
  endedAt: z.date().optional().nullable(),
});

const workHistoryInputSchema = workHistoryRowShapeSchema.refine(
  ({ startedAt, endedAt }) => !endedAt || endedAt >= startedAt,
  { message: "endedAt must be on or after startedAt", path: ["endedAt"] },
);

const resumeInputSchema = z.object({
  url: z.string().url(),
  filename: z.string().min(1).max(240),
});

const educationInputSchema = z.object({
  school: z.string().min(1).max(160),
  degree: z.string().max(160).optional().nullable(),
  startedYear: z
    .string()
    .regex(/^\d{4}$/, "Year must be four digits")
    .optional()
    .nullable(),
  endedYear: z
    .string()
    .regex(/^\d{4}$/, "Year must be four digits")
    .optional()
    .nullable(),
  details: z.string().max(500).optional().nullable(),
});

const applyWorkHistoryRowSchema = workHistoryRowShapeSchema
  .omit({ startedAt: true, endedAt: true })
  .extend({
    startedAt: z.coerce.date(),
    endedAt: z.coerce.date().optional().nullable(),
  })
  .refine(
    ({ startedAt, endedAt }) => !endedAt || endedAt >= startedAt,
    { message: "endedAt must be on or after startedAt", path: ["endedAt"] },
  );

const applyCertificationRowSchema = certificationInputSchema
  .omit({ issuedAt: true, expiresAt: true })
  .extend({
    issuedAt: z.coerce.date().optional().nullable(),
    expiresAt: z.coerce.date().optional().nullable(),
  });

const applyResumeExtractionInputSchema = z.object({
  workHistory: z.array(applyWorkHistoryRowSchema).max(25).default([]),
  education: z.array(educationInputSchema).max(20).default([]),
  certifications: z.array(applyCertificationRowSchema).max(30).default([]),
  mergeCoreSkills: z.array(z.string().min(1).max(60)).max(30).optional(),
});

async function requireProfile(
  ctx: { db: typeof import("@/server/db").db; session: { user: { id: string } } },
) {
  const [profile] = await ctx.db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, ctx.session.user.id))
    .limit(1);

  if (!profile) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Profile not found. Complete onboarding first.",
    });
  }
  return profile;
}

/**
 * Bumps profiles.updatedAt for the given profile. Called from cert/work/edu
 * mutations whose changes affect the AI match-scoring prompt (or could in
 * the future) — INSERT and DELETE statements don't trigger Drizzle's
 * `$onUpdate` hook on the parent table, so we have to do this explicitly.
 *
 * The match cache reads profile.updatedAt on every hit and re-scores when
 * it's newer than jobMatches.updatedAt — see matches.ts.
 */
async function bumpProfileUpdatedAt(
  db: typeof import("@/server/db").db,
  profileId: string,
) {
  await db
    .update(profiles)
    .set({ updatedAt: new Date() })
    .where(eq(profiles.id, profileId));
}

export const profileRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    const [profile] = await ctx.db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, ctx.session.user.id))
      .limit(1);

    if (!profile) return null;

    const [certs, history, edu] = await Promise.all([
      ctx.db
        .select()
        .from(certifications)
        .where(eq(certifications.profileId, profile.id)),
      ctx.db
        .select()
        .from(workHistory)
        .where(eq(workHistory.profileId, profile.id)),
      ctx.db
        .select()
        .from(education)
        .where(eq(education.profileId, profile.id)),
    ]);

    return {
      profile,
      certifications: certs,
      workHistory: history,
      education: edu,
    };
  }),

  update: protectedProcedure
    .input(profileUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(profiles)
        .set(input)
        .where(eq(profiles.userId, ctx.session.user.id))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Profile not found. Complete onboarding first.",
        });
      }

      await safeCapture({
        distinctId: ctx.session.user.id,
        event: EVENT_PROFILE_UPDATED,
        properties: {
          sectors: updated.sectors,
          hasHeadline: Boolean(updated.headline),
        },
      });

      return updated;
    }),

  addCertification: protectedProcedure
    .input(certificationInputSchema)
    .mutation(async ({ ctx, input }) => {
      const profile = await requireProfile(ctx);
      const [row] = await ctx.db
        .insert(certifications)
        .values({ ...input, profileId: profile.id })
        .returning();
      await bumpProfileUpdatedAt(ctx.db, profile.id);
      return row;
    }),

  updateCertification: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        patch: certificationInputSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const profile = await requireProfile(ctx);
      const [row] = await ctx.db
        .update(certifications)
        .set(input.patch)
        .where(
          and(
            eq(certifications.id, input.id),
            eq(certifications.profileId, profile.id),
          ),
        )
        .returning();

      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      await bumpProfileUpdatedAt(ctx.db, profile.id);
      return row;
    }),

  removeCertification: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const profile = await requireProfile(ctx);
      const [deleted] = await ctx.db
        .delete(certifications)
        .where(
          and(
            eq(certifications.id, input.id),
            eq(certifications.profileId, profile.id),
          ),
        )
        .returning({ id: certifications.id });

      if (!deleted) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      await bumpProfileUpdatedAt(ctx.db, profile.id);
      return deleted;
    }),

  addWorkHistory: protectedProcedure
    .input(workHistoryInputSchema)
    .mutation(async ({ ctx, input }) => {
      const profile = await requireProfile(ctx);
      const [row] = await ctx.db
        .insert(workHistory)
        .values({ ...input, profileId: profile.id })
        .returning();
      await bumpProfileUpdatedAt(ctx.db, profile.id);
      return row;
    }),

  updateWorkHistory: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        patch: workHistoryInputSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const profile = await requireProfile(ctx);
      const [row] = await ctx.db
        .update(workHistory)
        .set(input.patch)
        .where(
          and(
            eq(workHistory.id, input.id),
            eq(workHistory.profileId, profile.id),
          ),
        )
        .returning();

      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      await bumpProfileUpdatedAt(ctx.db, profile.id);
      return row;
    }),

  removeWorkHistory: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const profile = await requireProfile(ctx);
      const [deleted] = await ctx.db
        .delete(workHistory)
        .where(
          and(
            eq(workHistory.id, input.id),
            eq(workHistory.profileId, profile.id),
          ),
        )
        .returning({ id: workHistory.id });

      if (!deleted) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      await bumpProfileUpdatedAt(ctx.db, profile.id);
      return deleted;
    }),

  addEducation: protectedProcedure
    .input(educationInputSchema)
    .mutation(async ({ ctx, input }) => {
      const profile = await requireProfile(ctx);
      const [row] = await ctx.db
        .insert(education)
        .values({ ...input, profileId: profile.id })
        .returning();
      await bumpProfileUpdatedAt(ctx.db, profile.id);
      return row;
    }),

  updateEducation: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        patch: educationInputSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const profile = await requireProfile(ctx);
      const [row] = await ctx.db
        .update(education)
        .set(input.patch)
        .where(
          and(
            eq(education.id, input.id),
            eq(education.profileId, profile.id),
          ),
        )
        .returning();
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      await bumpProfileUpdatedAt(ctx.db, profile.id);
      return row;
    }),

  removeEducation: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const profile = await requireProfile(ctx);
      const [deleted] = await ctx.db
        .delete(education)
        .where(
          and(
            eq(education.id, input.id),
            eq(education.profileId, profile.id),
          ),
        )
        .returning({ id: education.id });
      if (!deleted) throw new TRPCError({ code: "NOT_FOUND" });
      await bumpProfileUpdatedAt(ctx.db, profile.id);
      return deleted;
    }),

  previewResumeExtraction: protectedProcedure
    .input(resumeInputSchema)
    .mutation(async ({ ctx, input }) => {
      assertResumeBlobUrlForUser(input.url, ctx.session.user.id);

      let plain = "";
      try {
        plain = await extractPlainTextFromResumeStorage({
          url: input.url,
          filename: input.filename,
        });
      } catch (e) {
        console.error({
          event: "resume_preview_extract_failed",
          userId: ctx.session.user.id,
          message: e instanceof Error ? e.message : String(e),
        });
        await safeCapture({
          distinctId: ctx.session.user.id,
          event: EVENT_RESUME_AUTOFILL_PREVIEWED,
          properties: { hasSuggestions: false, reason: "extract_failed" },
        });
        return {
          hasSuggestions: false as const,
          reason: "extract_failed" as const,
        };
      }

      if (plain.length < 40) {
        await safeCapture({
          distinctId: ctx.session.user.id,
          event: EVENT_RESUME_AUTOFILL_PREVIEWED,
          properties: { hasSuggestions: false, reason: "too_short" },
        });
        return {
          hasSuggestions: false as const,
          reason: "too_short" as const,
        };
      }

      if (!EMBER_ENABLED) {
        await safeCapture({
          distinctId: ctx.session.user.id,
          event: EVENT_RESUME_AUTOFILL_PREVIEWED,
          properties: { hasSuggestions: false, reason: "ai_not_configured" },
        });
        return {
          hasSuggestions: false as const,
          reason: "ai_not_configured" as const,
        };
      }

      const draft = await extractResumeAutofillDraftFromPlainText(plain);
      const hasSuggestions = resumeAutofillDraftHasSuggestions(draft);

      await safeCapture({
        distinctId: ctx.session.user.id,
        event: EVENT_RESUME_AUTOFILL_PREVIEWED,
        properties: {
          hasSuggestions,
          work: draft.workHistory.length,
          education: draft.education.length,
          certs: draft.certifications.length,
          skills: draft.coreSkills.length,
        },
      });

      if (!hasSuggestions) {
        return { hasSuggestions: false as const, reason: "no_sections" as const };
      }

      return { hasSuggestions: true as const, draft };
    }),

  applyResumeExtraction: protectedProcedure
    .input(applyResumeExtractionInputSchema)
    .mutation(async ({ ctx, input }) => {
      const profile = await requireProfile(ctx);

      function dedupeSkills(a: string[], b: string[]): string[] {
        const out: string[] = [];
        const seen = new Set<string>();
        for (const s of [...a, ...b]) {
          const t = s.trim();
          if (!t) continue;
          const k = t.toLowerCase();
          if (seen.has(k)) continue;
          seen.add(k);
          out.push(t.slice(0, 60));
          if (out.length >= 30) break;
        }
        return out;
      }

      await ctx.db.transaction(async (tx) => {
        for (const row of input.workHistory) {
          await tx.insert(workHistory).values({ ...row, profileId: profile.id });
        }
        for (const row of input.education) {
          await tx.insert(education).values({ ...row, profileId: profile.id });
        }
        for (const row of input.certifications) {
          await tx.insert(certifications).values({ ...row, profileId: profile.id });
        }
        if (input.mergeCoreSkills && input.mergeCoreSkills.length > 0) {
          const next = dedupeSkills(profile.skills, input.mergeCoreSkills);
          await tx
            .update(profiles)
            .set({ skills: next })
            .where(eq(profiles.id, profile.id));
        }
      });

      await bumpProfileUpdatedAt(ctx.db, profile.id);

      await safeCapture({
        distinctId: ctx.session.user.id,
        event: EVENT_RESUME_AUTOFILL_APPLIED,
        properties: {
          workAdded: input.workHistory.length,
          educationAdded: input.education.length,
          certsAdded: input.certifications.length,
          skillsMerged: input.mergeCoreSkills?.length ?? 0,
        },
      });

      const [nextProfile] = await ctx.db
        .select({ skills: profiles.skills })
        .from(profiles)
        .where(eq(profiles.id, profile.id))
        .limit(1);

      return { skills: nextProfile?.skills ?? profile.skills };
    }),

  setResume: protectedProcedure
    .input(resumeInputSchema)
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(profiles)
        .set({
          resumeUrl: input.url,
          resumeFilename: input.filename,
          resumeUploadedAt: new Date(),
        })
        .where(eq(profiles.userId, ctx.session.user.id))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Profile not found. Complete onboarding first.",
        });
      }

      await safeCapture({
        distinctId: ctx.session.user.id,
        event: EVENT_RESUME_UPLOADED,
        properties: { filename: input.filename },
      });

      return updated;
    }),

  setAvatar: protectedProcedure
    .input(z.object({ url: z.string().url() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(user)
        .set({ image: input.url })
        .where(eq(user.id, ctx.session.user.id));
      return { url: input.url };
    }),

  polishSummary: protectedProcedure
    .input(z.object({ current: z.string().min(1).max(2000) }))
    .mutation(async ({ ctx, input }) => {
      // Gate: Gold or Platinum jobseeker subscription, status active.
      const [u] = await ctx.db
        .select({
          jobseekerPlan: user.jobseekerPlan,
          jobseekerSubscriptionStatus: user.jobseekerSubscriptionStatus,
        })
        .from(user)
        .where(eq(user.id, ctx.session.user.id))
        .limit(1);
      if (!u) throw new TRPCError({ code: "UNAUTHORIZED" });

      const planActive =
        isJobseekerPlanTier(u.jobseekerPlan) &&
        isEntitledSubscriptionStatus(u.jobseekerSubscriptionStatus);
      if (!planActive) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Profile Polish is a Gold feature. Upgrade to use AI rewriting.",
        });
      }

      const [profile] = await ctx.db
        .select()
        .from(profiles)
        .where(eq(profiles.userId, ctx.session.user.id))
        .limit(1);
      if (!profile) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

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
        const polished = await polishProfileSummary({
          current: input.current,
          headline: profile.headline,
          sectors: profile.sectors,
          topRoles,
        });
        return { polished };
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Polish failed.";
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: msg });
      }
    }),
});
