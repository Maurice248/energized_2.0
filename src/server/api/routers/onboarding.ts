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

        // The `plan` column reflects the *active Stripe subscription*. At
        // org-creation time there is no subscription yet — even employers who
        // picked Package A/B/C at sign-up haven't paid. Always start "none";
        // the Stripe webhook (and `syncSubscriptionFromStripe`) flip it to a
        // paid tier once the subscription becomes active. The user's pre-paid
        // plan choice is held in `PENDING_BILLING_REDIRECT_KEY` so the wizard
        // Finish step can prompt them to pay.
        const [org] = await ctx.db
          .insert(employerOrgs)
          .values({
            name: companyName,
            hq: input.location || null,
            primarySector: mappedSectors[0] ?? null,
            size: companySizeLabelToEnum(input.companySize),
            plan: "none",
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
