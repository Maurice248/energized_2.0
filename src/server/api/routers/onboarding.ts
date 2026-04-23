import { eq, sql } from "drizzle-orm";
import { protectedProcedure, router } from "@/server/api/trpc";
import { profiles, user } from "@/server/db/schema";
import {
  onboardingDraftSchema,
  sectorLabelToEnum,
  levelLabelToYears,
  type EnergySector,
} from "@/lib/onboarding";

export const onboardingRouter = router({
  markComplete: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db
      .update(user)
      .set({ onboardedAt: new Date() })
      .where(eq(user.id, ctx.session.user.id));
    return { ok: true };
  }),

  completeOnboarding: protectedProcedure
    .input(onboardingDraftSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      await ctx.db
        .update(user)
        .set({ role: input.role, onboardedAt: new Date() })
        .where(eq(user.id, userId));

      const sectorLabels =
        input.role === "jobseeker"
          ? input.sector
            ? [input.sector]
            : []
          : input.hiringSectors;

      const mappedSectors = Array.from(
        new Set(
          sectorLabels
            .map(sectorLabelToEnum)
            .filter((s): s is EnergySector => s !== null),
        ),
      );

      const yearsExperience =
        input.role === "jobseeker" && input.level
          ? levelLabelToYears(input.level)
          : null;

      const location = input.role === "employer" ? input.location || null : null;

      await ctx.db
        .insert(profiles)
        .values({
          userId,
          sectors: mappedSectors,
          yearsExperience: yearsExperience ?? undefined,
          location: location ?? undefined,
        })
        .onConflictDoUpdate({
          target: profiles.userId,
          set: {
            sectors: sql`excluded.sectors`,
            yearsExperience: sql`excluded.years_experience`,
            location: sql`excluded.location`,
            updatedAt: new Date(),
          },
        });

      return { role: input.role, sectors: mappedSectors };
    }),
});
