import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "@/server/api/trpc";
import { db } from "@/server/db";
import { user } from "@/server/db/schema";
import { env } from "@/env";
import { getStripe, STRIPE_ENABLED } from "@/lib/stripe";
import {
  JOBSEEKER_TIERS,
  JOBSEEKER_TIER_ORDER,
  isJobseekerPlanTier,
  type JobseekerPlanTier,
} from "@/lib/billing-tiers";
import { syncJobseekerSubscriptionFromStripe } from "@/server/services/jobseeker-billing-sync";

const tierZ = z.enum(["gold", "platinum"]);

async function loadUser(userId: string) {
  const [u] = await db
    .select()
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  return u ?? null;
}

function requireJobseeker(role: string | undefined) {
  if (role !== "jobseeker") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only job seekers can manage this subscription.",
    });
  }
}

export const jobseekerBillingRouter = router({
  getCurrent: protectedProcedure.query(async ({ ctx }) => {
    const u = await loadUser(ctx.session.user.id);
    if (!u) throw new TRPCError({ code: "NOT_FOUND" });
    requireJobseeker(u.role);

    const tier: JobseekerPlanTier | null = isJobseekerPlanTier(u.jobseekerPlan)
      ? u.jobseekerPlan
      : null;

    return {
      stripeEnabled: STRIPE_ENABLED,
      tier,
      status: u.jobseekerSubscriptionStatus,
      currentPeriodStart: u.jobseekerCurrentPeriodStart,
      currentPeriodEnd: u.jobseekerCurrentPeriodEnd,
      cancelAtPeriodEnd: u.jobseekerCancelAtPeriodEnd,
      cancellationDisposition: u.jobseekerCancellationDisposition,
    };
  }),

  listTiers: protectedProcedure.query(() => {
    return JOBSEEKER_TIER_ORDER.map((t) => ({
      id: t,
      label: JOBSEEKER_TIERS[t].label,
      priceCents: JOBSEEKER_TIERS[t].priceCents,
      features: JOBSEEKER_TIERS[t].features,
      configured: Boolean(JOBSEEKER_TIERS[t].stripePriceId),
    }));
  }),

  createCheckoutSession: protectedProcedure
    .input(z.object({ tier: tierZ }))
    .mutation(async ({ ctx, input }) => {
      const u = await loadUser(ctx.session.user.id);
      if (!u) throw new TRPCError({ code: "NOT_FOUND" });
      requireJobseeker(u.role);

      if (!STRIPE_ENABLED) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Stripe is not configured on this environment.",
        });
      }

      const tierDef = JOBSEEKER_TIERS[input.tier];
      if (!tierDef.stripePriceId) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `Stripe price id not set for ${tierDef.label}.`,
        });
      }

      const stripe = getStripe();

      let customerId = u.jobseekerStripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: ctx.session.user.email,
          name: u.name,
          metadata: { userId: u.id, audience: "jobseeker" },
        });
        customerId = customer.id;
        await ctx.db
          .update(user)
          .set({ jobseekerStripeCustomerId: customerId })
          .where(eq(user.id, u.id));
      }

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        line_items: [{ price: tierDef.stripePriceId, quantity: 1 }],
        success_url: `${env.NEXT_PUBLIC_APP_URL}/profile?billing=success#pp-billing`,
        cancel_url: `${env.NEXT_PUBLIC_APP_URL}/profile?billing=cancelled#pp-billing`,
        subscription_data: {
          metadata: { userId: u.id, audience: "jobseeker" },
        },
      });

      if (!session.url) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Stripe did not return a checkout URL.",
        });
      }
      return { url: session.url };
    }),

  createPortalSession: protectedProcedure.mutation(async ({ ctx }) => {
    const u = await loadUser(ctx.session.user.id);
    if (!u) throw new TRPCError({ code: "NOT_FOUND" });
    requireJobseeker(u.role);

    if (!STRIPE_ENABLED) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Stripe is not configured on this environment.",
      });
    }

    if (!u.jobseekerStripeCustomerId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No Stripe customer on file. Subscribe first.",
      });
    }

    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: u.jobseekerStripeCustomerId,
      return_url: `${env.NEXT_PUBLIC_APP_URL}/profile#pp-billing`,
    });
    return { url: session.url };
  }),

  switchTier: protectedProcedure
    .input(z.object({ tier: tierZ }))
    .mutation(async ({ ctx, input }) => {
      const u = await loadUser(ctx.session.user.id);
      if (!u) throw new TRPCError({ code: "NOT_FOUND" });
      requireJobseeker(u.role);

      if (!STRIPE_ENABLED) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Stripe is not configured on this environment.",
        });
      }

      const tierDef = JOBSEEKER_TIERS[input.tier];
      if (!tierDef.stripePriceId) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `Stripe price id not set for ${tierDef.label}.`,
        });
      }

      if (!u.jobseekerStripeSubscriptionId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active subscription to switch. Subscribe first.",
        });
      }

      if (u.jobseekerPlan === input.tier) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You're already on that plan.",
        });
      }

      const stripe = getStripe();
      const sub = await stripe.subscriptions.retrieve(
        u.jobseekerStripeSubscriptionId,
      );
      const itemId = sub.items.data[0]?.id;
      if (!itemId) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Subscription has no line item to update.",
        });
      }

      await stripe.subscriptions.update(u.jobseekerStripeSubscriptionId, {
        items: [{ id: itemId, price: tierDef.stripePriceId }],
        proration_behavior: "create_prorations",
        cancel_at_period_end: false,
      });

      await ctx.db
        .update(user)
        .set({
          jobseekerPlan: input.tier,
          jobseekerCancelAtPeriodEnd: false,
        })
        .where(eq(user.id, u.id));

      return { ok: true, tier: input.tier };
    }),

  cancel: protectedProcedure.mutation(async ({ ctx }) => {
    const u = await loadUser(ctx.session.user.id);
    if (!u) throw new TRPCError({ code: "NOT_FOUND" });
    requireJobseeker(u.role);

    if (!STRIPE_ENABLED) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Stripe is not configured on this environment.",
      });
    }

    if (!u.jobseekerStripeSubscriptionId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No active subscription to cancel.",
      });
    }

    const stripe = getStripe();
    await stripe.subscriptions.update(u.jobseekerStripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    await ctx.db
      .update(user)
      .set({
        jobseekerCancelAtPeriodEnd: true,
        jobseekerCancellationDisposition: "close_at_period_end",
      })
      .where(eq(user.id, u.id));

    return { ok: true };
  }),

  syncFromStripe: protectedProcedure.mutation(async ({ ctx }) => {
    const u = await loadUser(ctx.session.user.id);
    if (!u) throw new TRPCError({ code: "NOT_FOUND" });
    requireJobseeker(u.role);
    if (!STRIPE_ENABLED) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Stripe is not configured on this environment.",
      });
    }
    return syncJobseekerSubscriptionFromStripe(u.id);
  }),
});
