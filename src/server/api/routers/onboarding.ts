import { eq, sql } from "drizzle-orm";
import { protectedProcedure, router } from "@/server/api/trpc";
import { employerOrgs, orgMembers, profiles, user } from "@/server/db/schema";
import {
  companySizeLabelToEnum,
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
      const email = ctx.session.user.email.toLowerCase();

      await ctx.db
        .update(user)
        .set({ role: input.role, onboardedAt: new Date() })
        .where(eq(user.id, userId));

      if (input.role === "employer") {
        const mappedSectors = Array.from(
          new Set(
            input.hiringSectors
              .map(sectorLabelToEnum)
              .filter((s): s is EnergySector => s !== null),
          ),
        );

        const [existing] = await ctx.db
          .select({ orgId: orgMembers.orgId })
          .from(orgMembers)
          .where(eq(orgMembers.userId, userId))
          .limit(1);

        if (existing) {
          return { role: input.role, orgId: existing.orgId };
        }

        const companyName = input.company.trim() || "Untitled company";
        const verificationToken = `energized-verify=${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;

        // Free tier = no Stripe subscription. Store "none" in the DB so the
        // billing column matches the established "none" | "package_a" | ...
        // shape (see employerOrgs schema comment).
        const dbPlan =
          input.plan === "employer_free" ? "none" : input.plan;

        const [org] = await ctx.db
          .insert(employerOrgs)
          .values({
            name: companyName,
            hq: input.location || null,
            primarySector: mappedSectors[0] ?? null,
            size: companySizeLabelToEnum(input.companySize),
            plan: dbPlan,
            verificationToken,
          })
          .returning();

        await ctx.db.insert(orgMembers).values({
          orgId: org.id,
          userId,
          email,
          role: "owner",
          status: "active",
          acceptedAt: new Date(),
        });

        return { role: input.role, orgId: org.id };
      }

      const sectorLabels = input.sector ? [input.sector] : [];
      const mappedSectors = Array.from(
        new Set(
          sectorLabels
            .map(sectorLabelToEnum)
            .filter((s): s is EnergySector => s !== null),
        ),
      );
      const yearsExperience = input.level
        ? levelLabelToYears(input.level)
        : null;

      await ctx.db
        .insert(profiles)
        .values({
          userId,
          sectors: mappedSectors,
          yearsExperience: yearsExperience ?? undefined,
        })
        .onConflictDoUpdate({
          target: profiles.userId,
          set: {
            sectors: sql`excluded.sectors`,
            yearsExperience: sql`excluded.years_experience`,
            updatedAt: new Date(),
          },
        });

      return { role: input.role, sectors: mappedSectors };
    }),
});
